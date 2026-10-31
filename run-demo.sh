#!/usr/bin/env bash
# Menjalankan semua yang dibutuhkan demo MOJI dengan satu perintah:
#   server lokal (functions/) -> emulator / HP USB -> adb reverse -> build & install APK -> buka aplikasi.
#
# Pemakaian:
#   ./run-demo.sh               # pakai APK yang sudah ada (build otomatis kalau belum ada)
#   ./run-demo.sh --rebuild     # build ulang APK release dulu (setelah ada perubahan kode)
#   ./run-demo.sh --avd NAMA    # pilih AVD emulator tertentu
#   ./run-demo.sh --no-emulator # jangan nyalakan emulator (pakai HP yang tersambung USB)
#   ./run-demo.sh --stop        # matikan server lokal yang dijalankan skrip ini
#
# Tekan Ctrl+C untuk berhenti; server lokal ikut dimatikan. Emulator dibiarkan menyala.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$ROOT/app"
FN="$ROOT/functions"
RUN="$ROOT/.run"
APK="$APP/android/app/build/outputs/apk/release/app-release.apk"
PKG="com.moji.journal"
PORT=8080

SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
ADB="$SDK/platform-tools/adb"
EMULATOR="$SDK/emulator/emulator"

REBUILD=0; USE_EMULATOR=1; AVD="${MOJI_AVD:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --rebuild) REBUILD=1 ;;
    --no-emulator) USE_EMULATOR=0 ;;
    --avd) AVD="${2:?--avd butuh nama AVD}"; shift ;;
    --stop)
      if [ -f "$RUN/server.pid" ] && kill -0 "$(cat "$RUN/server.pid")" 2>/dev/null; then
        kill "$(cat "$RUN/server.pid")" && echo "Server lokal dimatikan."
      else
        echo "Tidak ada server yang dijalankan skrip ini."
      fi
      rm -f "$RUN/server.pid"; exit 0 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Opsi tidak dikenal: $1 (lihat --help)"; exit 1 ;;
  esac
  shift
done

say()  { printf '\033[1;34m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✘ %s\033[0m\n' "$*"; exit 1; }

mkdir -p "$RUN"

# ---------------------------------------------------------------- 1. Prasyarat
say "Cek prasyarat"
command -v node >/dev/null || die "Node.js belum terpasang (butuh Node 24+)."
[ -x "$ADB" ] || die "adb tidak ditemukan di $ADB. Set ANDROID_HOME ke folder Android SDK."
[ -f "$FN/.env" ] || die "functions/.env belum ada. Salin dari functions/.env.example lalu isi (lihat docs/RUNNING.md)."
if [ ! -f "$APP/.env.local" ]; then
  printf 'EXPO_PUBLIC_API_URL=http://localhost:%s\nEXPO_PUBLIC_DEV_TOOLS=1\n' "$PORT" > "$APP/.env.local"
  warn "app/.env.local dibuat otomatis (API ke localhost:$PORT, alat tim aktif)."
fi
[ -d "$APP/node_modules" ] || { say "Install dependency app"; (cd "$APP" && npm ci); }
[ -d "$FN/node_modules" ]  || { say "Install dependency functions"; (cd "$FN" && npm ci); }
if command -v gcloud >/dev/null && gcloud auth application-default print-access-token >/dev/null 2>&1; then
  ok "Kredensial Google (ADC) aktif"
else
  warn "Kredensial Google (ADC) belum aktif: fitur AI tidak akan jalan. Jalankan: gcloud auth application-default login"
fi
[ -f "$FN/data/invites.json" ] || warn "Belum ada kode undangan. Buat dengan: cd functions && npm run invites -- create 10 --prefix R"

# ---------------------------------------------------------------- 2. Server lokal
server_up() { curl -s -m 2 -o /dev/null "http://localhost:$PORT/" ; }
if server_up; then
  ok "Server lokal sudah jalan di port $PORT"
else
  say "Menyalakan server lokal (log: .run/server.log)"
  (cd "$FN" && nohup npm run dev:server > "$RUN/server.log" 2>&1 & echo $! > "$RUN/server.pid")
  for _ in $(seq 1 60); do server_up && break; sleep 1; done
  server_up || die "Server tidak menyala. Cek .run/server.log"
  ok "Server lokal jalan di http://localhost:$PORT"
fi

TAIL_PID=""
cleanup() {
  [ -n "$TAIL_PID" ] && kill "$TAIL_PID" 2>/dev/null || true
  if [ -f "$RUN/server.pid" ]; then
    kill "$(cat "$RUN/server.pid")" 2>/dev/null || true
    pkill -f "functions-framework.*--target=api" 2>/dev/null || true
    rm -f "$RUN/server.pid"
    echo; ok "Server lokal dimatikan."
  fi
  exit 0
}

# ---------------------------------------------------------------- 3. Device
"$ADB" start-server >/dev/null 2>&1
device_ready() { "$ADB" get-state 2>/dev/null | grep -q device; }
if ! device_ready; then
  if [ "$USE_EMULATOR" = 1 ]; then
    [ -x "$EMULATOR" ] || die "Emulator tidak ditemukan di $EMULATOR"
    [ -n "$AVD" ] || AVD="$("$EMULATOR" -list-avds | head -n1)"
    [ -n "$AVD" ] || die "Belum ada AVD. Buat emulator dulu lewat Android Studio > Device Manager."
    say "Menyalakan emulator $AVD (log: .run/emulator.log)"
    nohup "$EMULATOR" -avd "$AVD" -no-snapshot-save > "$RUN/emulator.log" 2>&1 &
  else
    say "Menunggu HP tersambung lewat USB (aktifkan USB debugging)"
  fi
fi
"$ADB" wait-for-device
for _ in $(seq 1 120); do
  [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && break; sleep 2
done
ok "Device siap: $("$ADB" get-serialno)"
"$ADB" reverse "tcp:$PORT" "tcp:$PORT" >/dev/null
ok "adb reverse tcp:$PORT aktif (HP/emulator -> laptop)"

# ---------------------------------------------------------------- 4. APK
if [ "$REBUILD" = 1 ] || [ ! -f "$APK" ]; then
  say "Build APK release (pertama kali bisa 10-15 menit, log: .run/build.log)"
  if [ ! -d "$APP/android" ]; then
    (cd "$APP" && CI=1 npx expo prebuild --platform android > "$RUN/build.log" 2>&1) || die "Prebuild gagal. Cek .run/build.log"
  fi
  (cd "$APP/android" && ./gradlew assembleRelease >> "$RUN/build.log" 2>&1) || die "Build gagal. Cek .run/build.log"
  ok "APK siap: ${APK#$ROOT/}"
  say "Memasang APK"
  "$ADB" install -r "$APK" >/dev/null
elif ! "$ADB" shell pm list packages 2>/dev/null | grep -q "$PKG"; then
  say "Memasang APK"
  "$ADB" install -r "$APK" >/dev/null
fi
ok "MOJI terpasang"

# ---------------------------------------------------------------- 5. Buka aplikasi
"$ADB" shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
ok "MOJI dibuka di device"

if [ -f "$RUN/server.pid" ]; then
  trap cleanup INT TERM
  echo
  echo "Semua siap. Log server: .run/server.log"
  echo "Tekan Ctrl+C untuk mematikan server lokal (emulator tetap menyala)."
  tail -n 0 -f "$RUN/server.log" &
  TAIL_PID=$!
  wait "$TAIL_PID"
else
  echo
  echo "Semua siap. Server lokal sudah menyala sebelumnya, jadi skrip ini selesai di sini."
fi
