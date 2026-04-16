import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.projectspark.artisancrm",
  appName: "ArtisanCRM",
  webDir: "dist/client",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
};

export default config;
