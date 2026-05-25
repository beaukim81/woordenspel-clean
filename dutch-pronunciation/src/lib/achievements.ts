/** Level title by threshold — highest matching threshold wins */
const LEVEL_THRESHOLDS: Array<[number, string]> = [
  [20, "Legende 👑"],
  [15, "Leesmeester"],
  [10, "Woordenbaas"],
  [7,  "Taalheld"],
  [5,  "Superlezer"],
  [4,  "Klankheld"],
  [3,  "Oefenheld"],
  [2,  "Ontdekker"],
  [1,  "Starter"],
];

export function getLevelTitle(level: number): string {
  for (const [threshold, title] of LEVEL_THRESHOLDS) {
    if (level >= threshold) return title;
  }
  return "Beginner";
}

/** Level at which the next named milestone occurs */
export function nextMilestoneLevel(level: number): number | null {
  const upcoming = LEVEL_THRESHOLDS.slice().reverse().find(([t]) => t > level);
  return upcoming ? upcoming[0] : null;
}
