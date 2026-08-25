import assert from "node:assert/strict";
import test from "node:test";

import {
  getKeeperOutlook,
  getKeeperStreak,
  type KeeperPick,
  normalizeKeeperHistory,
} from "./keeper-tracker.ts";

function keeper(
  year: number,
  playerId: number,
  teamId: number,
  overrides: Partial<KeeperPick> = {},
): KeeperPick {
  return {
    _id: `${year}-${playerId}-${teamId}`,
    year,
    round: 7,
    roundPick: 1,
    team: {
      _id: `team-${teamId}`,
      teamId,
      teamName: `Team ${teamId}`,
    },
    player: {
      _id: `player-${playerId}`,
      playerId,
      playerName: `Player ${playerId}`,
    },
    ...overrides,
  };
}

test("keeper tenure follows a player across teams", () => {
  const history = [keeper(2024, 10, 1), keeper(2025, 10, 2)];

  assert.equal(getKeeperStreak(history[1]!, history), 2);
  assert.equal(getKeeperOutlook(2), "pool");
});

test("a gap resets consecutive keeper tenure", () => {
  const history = [keeper(2023, 10, 1), keeper(2025, 10, 1)];

  assert.equal(getKeeperStreak(history[1]!, history), 1);
  assert.equal(getKeeperOutlook(1), "adp");
});

test("known incorrect Josh Allen 2025 record is excluded", () => {
  const normalized = normalizeKeeperHistory([
    keeper(2024, 3918298, 9),
    keeper(2025, 3918298, 9),
  ]);

  assert.equal(normalized.correctionsApplied, 1);
  assert.deepEqual(
    normalized.history.map((pick) => pick.year),
    [2024],
  );
});

test("duplicate player-years are shown once and flagged", () => {
  const normalized = normalizeKeeperHistory([
    keeper(2025, 10, 1),
    keeper(2025, 10, 2, { _id: "duplicate" }),
  ]);

  assert.equal(normalized.history.length, 1);
  assert.equal(normalized.issues[0]?.code, "duplicate-player-year");
});

test("more than two keepers for a team is flagged", () => {
  const normalized = normalizeKeeperHistory([
    keeper(2025, 10, 1),
    keeper(2025, 11, 1),
    keeper(2025, 12, 1),
  ]);

  assert.equal(normalized.issues[0]?.code, "team-limit");
});
