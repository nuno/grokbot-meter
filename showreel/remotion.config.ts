import {Config} from "@remotion/cli/config";
import {existsSync} from "node:fs";
import {platform} from "node:os";

Config.setOverwriteOutput(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(90);

// Headless Linux renders (CI, cloud VMs) have no GPU. Point at the system
// Chrome and ffmpeg when they exist so Remotion does not download its own.
if (platform() === "linux") {
  const chrome = ["/usr/local/bin/google-chrome", "/usr/bin/google-chrome"].find((p) => existsSync(p));
  if (chrome) Config.setBrowserExecutable(chrome);
  Config.setChromiumOpenGlRenderer("swangle");
}
