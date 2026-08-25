export interface KeeperPick {
  _id: string;
  year: number;
  round: number;
  roundPick: number;
  team: {
    _id: string;
    teamId: number;
    teamName: string;
    teamAbbrev?: string | null;
  };
  player: {
    _id: string;
    playerId: number;
    playerName: string;
    position?: string | null;
  };
}

export type KeeperOutlook = "adp" | "pool" | "data-conflict";

export interface KeeperHistoryIssue {
  code: "duplicate-player-year" | "team-limit";
  message: string;
}

export interface NormalizedKeeperHistory {
  history: KeeperPick[];
  issues: KeeperHistoryIssue[];
  correctionsApplied: number;
}

// The 2025 import incorrectly marked Josh Allen as a keeper. Keep this
// correction close to the tracker logic until the source record is repaired.
const knownIncorrectKeeperRecords = new Set(["2025:3918298"]);

function samePlayer(a: KeeperPick, b: KeeperPick) {
  return a.player.playerId === b.player.playerId;
}

/**
 * Counts consecutive keeper seasons ending with the supplied pick. The team is
 * intentionally ignored because a trade does not reset a player's keeper clock.
 */
export function getKeeperStreak(
  pick: KeeperPick,
  history: KeeperPick[],
): number {
  const keeperYears = new Set(
    history
      .filter((candidate) => samePlayer(candidate, pick))
      .map((candidate) => candidate.year),
  );

  let streak = 0;
  let year = pick.year;

  while (keeperYears.has(year)) {
    streak += 1;
    year -= 1;
  }

  return streak;
}

export function getKeeperOutlook(streak: number): KeeperOutlook {
  if (streak > 2) return "data-conflict";
  if (streak === 2) return "pool";
  return "adp";
}

export function normalizeKeeperHistory(
  history: KeeperPick[],
): NormalizedKeeperHistory {
  const issues: KeeperHistoryIssue[] = [];
  const uniquePlayerYears = new Map<string, KeeperPick>();
  let correctionsApplied = 0;

  for (const pick of history) {
    const playerYearKey = `${pick.year}:${pick.player.playerId}`;

    if (knownIncorrectKeeperRecords.has(playerYearKey)) {
      correctionsApplied += 1;
      continue;
    }

    const existing = uniquePlayerYears.get(playerYearKey);
    if (existing) {
      issues.push({
        code: "duplicate-player-year",
        message: `${pick.player.playerName} appears more than once in ${pick.year}; only the first record is shown.`,
      });
      continue;
    }

    uniquePlayerYears.set(playerYearKey, pick);
  }

  const normalizedHistory = [...uniquePlayerYears.values()];
  const keeperCounts = new Map<string, { count: number; teamName: string }>();

  for (const pick of normalizedHistory) {
    const teamYearKey = `${pick.year}:${pick.team.teamId}`;
    const current = keeperCounts.get(teamYearKey);
    keeperCounts.set(teamYearKey, {
      count: (current?.count ?? 0) + 1,
      teamName: pick.team.teamName.trim(),
    });
  }

  for (const [teamYearKey, value] of keeperCounts) {
    if (value.count <= 2) continue;

    const [year] = teamYearKey.split(":");
    issues.push({
      code: "team-limit",
      message: `${value.teamName} has ${value.count} keepers recorded in ${year}; the league maximum is two.`,
    });
  }

  return {
    history: normalizedHistory,
    issues,
    correctionsApplied,
  };
}

export function formatRound(round: number) {
  return `Round ${round}`;
}
