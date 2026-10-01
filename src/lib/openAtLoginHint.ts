/** Copy for the existing Settings "Open at login" switch. */
export function openAtLoginHint(supported: boolean, ready: boolean, userAgent: string): string {
  if (/Windows NT/.test(userAgent)) {
    if (!ready || supported) return "Launch GrokBot Meter when you sign in to Windows.";
    return "Not available on Windows yet.";
  }
  if (supported || !ready) return "Launch GrokBot Meter when you sign in to this Mac.";
  return "macOS only.";
}
