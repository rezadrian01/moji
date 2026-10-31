import app from '../../app.json';
import eas from '../../eas.json';

describe('konfigurasi rilis', () => {
  it('package Android tetap com.moji.journal', () => {
    expect(app.expo.android.package).toBe('com.moji.journal');
  });

  it('runtimeVersion terdefinisi dengan policy appVersion', () => {
    expect(app.expo.runtimeVersion).toEqual({ policy: 'appVersion' });
  });

  it('expo-updates terdaftar sebagai plugin', () => {
    expect(app.expo.plugins).toContain('expo-updates');
  });

  it('expo-build-properties mengizinkan cleartext Android untuk http://localhost (mode demo lokal)', () => {
    const entry = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-build-properties') as
      | [string, { android?: { usesCleartextTraffic?: boolean } }]
      | undefined;
    expect(entry?.[1].android?.usesCleartextTraffic).toBe(true);
  });

  it('profil preview menghasilkan APK dan punya channel preview', () => {
    expect(eas.build.preview.android.buildType).toBe('apk');
    expect(eas.build.preview.channel).toBe('preview');
  });

  it('setiap profil memakai environment EAS yang sesuai', () => {
    expect(eas.build.preview.environment).toBe('preview');
    expect(eas.build.development.environment).toBe('development');
  });

  it('versionCode profil preview naik otomatis dari sumber versi remote (uji instal N lalu N+1)', () => {
    expect(eas.cli.appVersionSource).toBe('remote');
    expect(eas.build.preview.autoIncrement).toBe(true);
  });
});
