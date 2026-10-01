/** Suffixes moved from dist/ into releases/<version>/. */
export const RELEASE_ARTIFACT_SUFFIXES = [".dmg", ".zip", ".exe", ".blockmap"];

/**
 * Versioned installer/archive names produced by electron-builder.
 * Staging dirs (mac-arm64, win-unpacked) and metadata (latest.yml) stay in dist/.
 */
export function isReleaseArtifact(name, version) {
  const prefix = `GrokBot-Meter-${version}-`;
  return (
    name.startsWith(prefix) &&
    RELEASE_ARTIFACT_SUFFIXES.some((suffix) => name.endsWith(suffix))
  );
}
