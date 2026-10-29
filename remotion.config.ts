import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setCrf(14);
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
// Use the pre-installed headless Chromium when present (no download needed).
const preinstalled = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
if (require("fs").existsSync(preinstalled)) {
  Config.setBrowserExecutable(preinstalled);
}
