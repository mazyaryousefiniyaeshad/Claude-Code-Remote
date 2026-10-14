import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: process.env.CC_REMOTE_APP_ID ?? "io.github.mazyaryousefiniyaeshad.ccremote",
  appName: process.env.CC_REMOTE_APP_NAME ?? "CC Remote",
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
