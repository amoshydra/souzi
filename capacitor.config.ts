import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.amoshydra.souzi",
  appName: "Souzi",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
