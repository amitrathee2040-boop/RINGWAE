import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for Ring War Android packaging.
 * Build the web app first (`npm run build`), then `npx cap sync android`.
 * No live-reload `server.url` is set so the APK runs the bundled `dist/`
 * assets — guarantees offline play on devices without internet.
 */
const config: CapacitorConfig = {
  appId: "com.ringwar.app",
  appName: "Ring War",
  webDir: "dist",
  backgroundColor: "#070d1a",
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#070d1a",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
  },
};

export default config;