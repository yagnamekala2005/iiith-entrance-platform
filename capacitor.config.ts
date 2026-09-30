import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.iiith.entrance',
  appName: 'IIITH Entrance Mock Test',
  webDir: 'public',
  server: {
    url: 'https://mocktest-kappa-nine.vercel.app',
    cleartext: false
  }
};

export default config;