import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.easypos.mobile",
  appName: "Easy POS",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
