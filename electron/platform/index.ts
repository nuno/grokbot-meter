import { macPlatform } from "./mac";
import type { PlatformSeam } from "./types";
import { winPlatform } from "./win";

/**
 * Darwin uses the Mac menu-bar seam. Every other OS uses the Windows
 * notification-area seam, including the unused Linux target. Windows-only
 * window chrome (acrylic) is applied only when `process.platform` is `win32`.
 */
export const platform: PlatformSeam = process.platform === "darwin" ? macPlatform : winPlatform;
