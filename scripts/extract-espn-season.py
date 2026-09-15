#!/usr/bin/env python3
"""Extract one ESPN fantasy football season into the JSON shape used by the Sanity importer.

Usage:
  .venv-espn/bin/python scripts/extract-espn-season.py \\
    --league-id 1453378 --year 2026 --weeks 1

Credentials (private leagues):
  ESPN_S2 and ESPN_SWID env vars, or --espn-s2 / --swid flags.
  In Chrome: espn.com → DevTools → Application → Cookies → copy espn_s2 and SWID.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Set

from espn_api.football import League


VALID_POSITIONS = {"QB", "RB", "WR", "TE", "K", "D/ST"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract ESPN fantasy season JSON")
    parser.add_argument("--league-id", type=int, default=int(os.environ.get("ESPN_LEAGUE_ID", "1453378")))
    parser.add_argument("--year", type=int, default=int(os.environ.get("ESPN_YEAR", "2026")))
    parser.add_argument(
        "--weeks",
        type=str,
        default=os.environ.get("ESPN_WEEKS", "1"),
        help="Comma-separated weeks to extract matchups for, or 'all' for every completed week",
    )
    parser.add_argument("--espn-s2", default=os.environ.get("ESPN_S2"))
    parser.add_argument("--swid", default=os.environ.get("ESPN_SWID"))
    parser.add_argument("--output", default=None, help="Output JSON path (default: league_{id}_football_{year}.json)")
    return parser.parse_args()


def opponent_id(opponent: Any) -> Optional[int]:
    if opponent is None:
        return None
    if hasattr(opponent, "team_id"):
        return opponent.team_id
    if isinstance(opponent, int):
        return opponent
    return None


def serialize_player(player: Any) -> Dict[str, Any]:
    position = getattr(player, "position", "") or ""
    if position not in VALID_POSITIONS:
        # ESPN sometimes returns FLEX-style slots first; keep a usable primary position.
        eligible = getattr(player, "eligibleSlots", []) or []
        position = next((slot for slot in eligible if slot in VALID_POSITIONS), position)

    eligible_positions = [
        slot
        for slot in (getattr(player, "eligibleSlots", []) or [])
        if slot in VALID_POSITIONS or slot in {"QB", "RB", "WR", "TE", "K", "D/ST", "FLEX", "BE", "IR"}
    ]

    return {
        "player_id": player.playerId,
        "player_name": player.name,
        "position": position if position in VALID_POSITIONS else position,
        "eligible_positions": eligible_positions,
    }


def serialize_owners(owners: Iterable[Dict[str, Any]]) -> List[Dict[str, str]]:
    serialized = []
    for owner in owners or []:
        owner_id = owner.get("id")
        if not owner_id:
            continue
        serialized.append(
            {
                "id": owner_id,
                "display_name": owner.get("displayName") or owner.get("firstName") or owner_id,
            }
        )
    return serialized


def serialize_team(team: Any) -> Dict[str, Any]:
    outcomes = list(team.outcomes or [])
    scores = list(team.scores or [])
    completed_scores = []
    completed_outcomes = []
    for score, outcome in zip(scores, outcomes):
        if outcome in ("W", "L", "T"):
            completed_scores.append(score)
            completed_outcomes.append(outcome)
        elif outcome == "U":
            break
        else:
            completed_scores.append(score)
            completed_outcomes.append(outcome)

    return {
        "team_id": team.team_id,
        "team_name": team.team_name,
        "team_abbrev": team.team_abbrev,
        "division_id": team.division_id,
        "division_name": team.division_name,
        "wins": team.wins,
        "losses": team.losses,
        "ties": team.ties,
        "points_for": team.points_for,
        "points_against": team.points_against,
        "standing": team.standing,
        "final_standing": team.final_standing,
        "waiver_rank": team.waiver_rank,
        "acquisitions": team.acquisitions,
        "drops": team.drops,
        "trades": team.trades,
        "scores": completed_scores,
        "outcomes": completed_outcomes,
        "schedule_opponent_ids": [opponent_id(opponent) for opponent in (team.schedule or [])],
        "roster": [serialize_player(player) for player in (team.roster or [])],
        "owners": serialize_owners(team.owners),
    }


def infer_winner(home_score: float, away_score: float) -> Optional[str]:
    if home_score == 0 and away_score == 0:
        return None
    if home_score == away_score:
        return "tie"
    return "home" if home_score > away_score else "away"


def serialize_matchup(matchup: Any, week: int) -> Optional[Dict[str, Any]]:
    home_id = getattr(matchup, "_home_team_id", None)
    away_id = getattr(matchup, "_away_team_id", None)
    if not home_id or not away_id:
        return None

    home_score = round(float(matchup.home_score or 0), 2)
    away_score = round(float(matchup.away_score or 0), 2)
    return {
        "matchup_period_id": week,
        "home_team_id": home_id,
        "away_team_id": away_id,
        "home_score": home_score,
        "away_score": away_score,
        "winner": infer_winner(home_score, away_score),
        "is_playoff": bool(getattr(matchup, "is_playoff", False)),
    }


def serialize_draft_pick(pick: Any) -> Optional[Dict[str, Any]]:
    if not pick.playerId:
        return None
    team = pick.team
    return {
        "round": pick.round_num,
        "round_pick": pick.round_pick,
        "team_id": team.team_id if team is not None else None,
        "team_name": team.team_name if team is not None else None,
        "player_id": pick.playerId,
        "player_name": pick.playerName,
        "bid_amount": pick.bid_amount or 0,
        "keeper": bool(pick.keeper_status),
    }


def weeks_to_extract(requested: str, current_week: int) -> List[int]:
    if requested.lower() == "all":
        return list(range(1, max(current_week, 1) + 1))
    weeks = []
    for part in requested.split(","):
        part = part.strip()
        if not part:
            continue
        week = int(part)
        if week < 1:
            raise ValueError(f"Invalid week: {week}")
        weeks.append(week)
    return weeks


def fill_draft_player_positions(league: League, year_data: Dict[str, Any]) -> None:
    roster_positions: Dict[int, str] = {}
    for team in year_data["teams"]:
        for player in team["roster"]:
            if player["player_id"] and player.get("position") in VALID_POSITIONS:
                roster_positions[player["player_id"]] = player["position"]

    missing_ids: List[int] = []
    seen: Set[int] = set()
    for pick in year_data["draft"]:
        player_id = pick["player_id"]
        if player_id in roster_positions or player_id in seen:
            continue
        seen.add(player_id)
        missing_ids.append(player_id)

    if not missing_ids:
        return

    print(f"  Looking up positions for {len(missing_ids)} draft-only players...")
    for i in range(0, len(missing_ids), 40):
        batch = missing_ids[i : i + 40]
        try:
            info = league.player_info(playerId=batch)
        except Exception as exc:  # noqa: BLE001 - ESPN lookup is best-effort
            print(f"  ⚠️  player_info failed for batch starting {batch[0]}: {exc}")
            continue
        players = info if isinstance(info, list) else [info]
        for player in players:
            if player is None:
                continue
            if getattr(player, "position", None) in VALID_POSITIONS:
                roster_positions[player.playerId] = player.position

    # Stash positions onto draft picks so the importer can create player docs.
    for pick in year_data["draft"]:
        position = roster_positions.get(pick["player_id"])
        if position:
            pick["position"] = position


def extract_year(league: League, weeks: List[int]) -> Dict[str, Any]:
    matchups: List[Dict[str, Any]] = []
    for week in weeks:
        print(f"  Fetching week {week} scoreboard...")
        for matchup in league.scoreboard(week=week):
            serialized = serialize_matchup(matchup, week)
            if serialized:
                matchups.append(serialized)

    year_data = {
        "year": league.year,
        "league_id": league.league_id,
        "sport": "football",
        "current_week": league.current_week,
        "final_scoring_period": league.finalScoringPeriod,
        "settings": {
            "name": league.settings.name,
            "scoring_type": league.settings.scoring_type,
            "num_teams": league.settings.team_count,
        },
        "teams": [serialize_team(team) for team in league.teams],
        "matchups": matchups,
        "draft": [pick for pick in (serialize_draft_pick(p) for p in league.draft) if pick],
    }
    fill_draft_player_positions(league, year_data)
    return year_data


def main() -> int:
    args = parse_args()
    if not args.espn_s2 or not args.swid:
        print(
            "This league is private. Provide ESPN_S2 and ESPN_SWID "
            "(or --espn-s2 / --swid).\n"
            "Chrome: espn.com → DevTools → Application → Cookies → espn_s2 and SWID.",
            file=sys.stderr,
        )
        return 1

    print(f"Fetching ESPN league {args.league_id} for {args.year}...")
    league = League(league_id=args.league_id, year=args.year, espn_s2=args.espn_s2, swid=args.swid)
    weeks = weeks_to_extract(args.weeks, league.current_week)
    print(f"  League: {league.settings.name}")
    print(f"  Current week: {league.current_week}")
    print(f"  Teams: {len(league.teams)}")
    print(f"  Draft picks: {len(league.draft)}")
    print(f"  Matchup weeks: {weeks}")

    payload = {
        "league_id": args.league_id,
        "sport": "football",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "years": [extract_year(league, weeks)],
    }

    output = args.output or f"league_{args.league_id}_football_{args.year}.json"
    with open(output, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")

    year = payload["years"][0]
    print(f"\nWrote {output}")
    print(f"  {len(year['teams'])} teams")
    print(f"  {len(year['draft'])} draft picks")
    print(f"  {len(year['matchups'])} matchups")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
