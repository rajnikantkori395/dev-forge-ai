export function xpForNextLevel(level: number): number {
  return Math.max(1, level) * 500;
}

export function levelProgress(xp: number, level: number): number {
  const start = Math.max(0, (level - 1) * 500);
  const span = 500;
  return Math.min(1, Math.max(0, (xp - start) / span));
}
