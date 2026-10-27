import type { CapacitorConfig } from "@capacitor/cli";

// TEMPORARY app ID. The final display name and package ID are pending the
// naming decision. Change both appId and the generated Android namespace
// before the first public release.
const config: CapacitorConfig = {
  appId: "com.amoshydra.dictionary",
  appName: "Ciqiao",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
