/**
 * Target for Windows Open at login.
 *
 * Electron writes `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
 * (per user, no admin). The NSIS install and the portable zip both start
 * `process.execPath`. A Squirrel `Update.exe` stub is the wrong path for
 * those packages. Unpackaged dev passes the app directory so sign-in starts
 * the app instead of a bare Electron binary.
 */
export type WinLoginItemTarget = {
  supported: boolean;
  path: string;
  args: string[];
};

export function winLoginItemTarget(input: {
  platform: string;
  packaged: boolean;
  execPath: string;
  appPath: string;
}): WinLoginItemTarget {
  if (input.platform !== "win32") {
    return { supported: false, path: "", args: [] };
  }
  if (input.packaged) {
    return { supported: true, path: input.execPath, args: [] };
  }
  const appPath = input.appPath.trim();
  return {
    supported: true,
    path: input.execPath,
    args: appPath ? [appPath] : [],
  };
}
