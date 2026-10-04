// Capacitor configuration for mobile app wrapper
export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    url?: string;
    cleartext?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

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