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

export interface KeeperHistoryIssue {
  code: "duplicate-player-year" | "keeper-limit" | "team-limit";
  message: string;
}

export interface NormalizedKeeperHistory {
  history: KeeperPick[];
  issues: KeeperHistoryIssue[];
}

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

export function normalizeKeeperHistory(
  history: KeeperPick[],
): NormalizedKeeperHistory {
  const issues: KeeperHistoryIssue[] = [];
  const uniquePlayerYears = new Map<string, KeeperPick>();

  for (const pick of history) {
    const playerYearKey = `${pick.year}:${pick.player.playerId}`;

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

  for (const pick of normalizedHistory) {
    const streak = getKeeperStreak(pick, normalizedHistory);
    if (streak <= 2) continue;

    issues.push({
      code: "keeper-limit",
      message: `${pick.player.playerName} is recorded as a keeper for ${streak} consecutive seasons through ${pick.year}; the written limit is two and commissioner review is required.`,
    });
  }

  return {
    history: normalizedHistory,
    issues,
  };
}

export function formatRound(round: number) {
  return `Round ${round}`;
}
