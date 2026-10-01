import { macPlatform } from "./mac";
import type { PlatformSeam } from "./types";
import { winPlatform } from "./win";

/**
 * Darwin uses the Mac menu-bar seam. Every other OS uses the Windows stub,
 * including the unused Linux target, so those builds keep the old non-darwin
 * tray title, anchoring, and login-item behavior.
 */
export const platform: PlatformSeam = process.platform === "darwin" ? macPlatform : winPlatform;
