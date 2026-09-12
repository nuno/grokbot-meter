/** Last measured panel heights — shared so About close can grow before paint. */
export let cachedMainHeight = 260;
export let cachedAboutHeight = 372;

export function rememberMainHeight(h: number) {
  if (Number.isFinite(h) && h > 0) cachedMainHeight = h;
}

export function rememberAboutHeight(h: number) {
  if (Number.isFinite(h) && h > 0) cachedAboutHeight = h;
}
