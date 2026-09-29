/** Last measured panel heights — shared so About close can grow before paint. */
let cachedMainHeight = 260;
let cachedMainTheme: string | null = null;
export let cachedAboutHeight = 372;

export function rememberMainHeight(h: number, theme: string) {
  if (!Number.isFinite(h) || h <= 0) return;
  cachedMainHeight = h;
  cachedMainTheme = theme;
}

export function rememberAboutHeight(h: number) {
  if (Number.isFinite(h) && h > 0) cachedAboutHeight = h;
}

/**
 * Main height as measured under `theme`, or null when the last measurement
 * came from a different one. Break's panel runs ~170px taller than System's,
 * so restoring a height from the wrong theme resizes the window twice.
 */
export function mainHeightFor(theme: string): number | null {
  return cachedMainTheme === theme ? cachedMainHeight : null;
}
