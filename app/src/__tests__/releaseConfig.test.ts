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

  it('profil preview menghasilkan APK dan punya channel preview', () => {
    expect(eas.build.preview.android.buildType).toBe('apk');
    expect(eas.build.preview.channel).toBe('preview');
  });
});
