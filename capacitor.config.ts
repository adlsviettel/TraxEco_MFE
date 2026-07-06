import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.traxeco.app',
  appName: 'TraxEco',
  webDir: 'dist-apk',

  server: {
    cleartext: true,
    allowNavigation: [
      "192.168.14.10",
      "trax-eco.site"
    ]
  },

  android: {
    allowMixedContent: true,
  },

  plugins: {
    Keyboard: {
      resize: 'native',
    }
  }
};

export default config;
