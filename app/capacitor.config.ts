import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: process.env.CR_APP_ID ?? "dev.claude.remote",
  appName: process.env.CR_APP_NAME ?? "Claude Remote",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: { enabled: false },
  },
};

export default config;
