#!/usr/bin/env python3
"""
Fetch Warriors Fantasy Football league data from ESPN and write
league_<league_id>_football_history.json for import-league-data.ts.

Uses https://github.com/cwendt94/espn-api

Required environment variables (private leagues):
  ESPN_S2   - espn_s2 cookie value
  ESPN_SWID - SWID cookie value (include braces, e.g. {XXXXXXXX-...})

Optional:
  LEAGUE_ID - defaults to 1453378
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from espn_api.football import League

DEFAULT_LEAGUE_ID = 1453378


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def output_path(explicit: str | None, league_id: int) -> Path:
    if explicit:
        return Path(explicit).resolve()
    filename = f"league_{league_id}_football_history.json"
    return repo_root() / filename


def load_env_file() -> None:
    """Load KEY=VALUE pairs from repo-root .env if present."""
    env_file = repo_root() / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def get_credentials() -> tuple[str, str]:
    espn_s2 = os.environ.get("ESPN_S2")
    swid = os.environ.get("ESPN_SWID")
    if not espn_s2 or not swid:
        print(
            "Error: ESPN_S2 and ESPN_SWID environment variables are required.\n"
            "Log in to ESPN Fantasy, open devtools → Application → Cookies,\n"
            "and copy espn_s2 and SWID for fantasy.espn.com.\n"
            "Set them in your shell or in a .env file at the repo root.",
            file=sys.stderr,
        )
        sys.exit(1)
    return espn_s2, swid


def outcome_from_winner(winner: str | None, is_away: bool) -> str:
    if winner == "UNDECIDED":
        return "U"
    if winner == "TIE":
        return "T"
    if (is_away and winner == "AWAY") or (not is_away and winner == "HOME"):
        return "W"
    return "L"


def extract_team_schedule(
    team_id: int, schedule: list[dict[str, Any]]
) -> tuple[list[float | None], list[str], list[int]]:
    scores: list[float | None] = []
    outcomes: list[str] = []
    opponent_ids: list[int] = []

    for matchup in schedule:
        home = matchup.get("home", {})
        away = matchup.get("away", {})
        home_id = home.get("teamId", -1)
        away_id = away.get("teamId", -1)

        if team_id not in (home_id, away_id):
            continue

        is_home = home_id == team_id
        current = home if is_home else away
        opponent_id = away_id if is_home else home_id
        if opponent_id == -1:
            opponent_id = team_id

        scores.append(current.get("totalPoints"))
        outcomes.append(outcome_from_winner(matchup.get("winner"), not is_home))
        opponent_ids.append(opponent_id)

    return scores, outcomes, opponent_ids


def extract_matchups(schedule: list[dict[str, Any]]) -> list[dict[str, Any]]:
    matchups: list[dict[str, Any]] = []

    for matchup in schedule:
        home = matchup.get("home", {})
        away = matchup.get("away", {})
        home_id = home.get("teamId")
        away_id = away.get("teamId")

        if not home_id or not away_id:
            continue

        is_playoff = matchup.get("playoffTierType", "NONE") != "NONE"
        matchup_period_id = matchup.get("matchupPeriodId")

        matchups.append(
            {
                "matchup_period_id": matchup_period_id,
                "home_team_id": home_id,
                "away_team_id": away_id,
                "home_score": home.get("totalPoints"),
                "away_score": away.get("totalPoints"),
                "winner": matchup.get("winner"),
                "is_playoff": is_playoff,
            }
        )

    return matchups


def serialize_team(team: Any, schedule: list[dict[str, Any]]) -> dict[str, Any]:
    scores, outcomes, opponent_ids = extract_team_schedule(team.team_id, schedule)

    roster = [
        {
            "player_id": player.playerId,
            "player_name": player.name,
            "position": player.position or "UNKNOWN",
            "eligible_positions": [],
        }
        for player in team.roster
    ]

    owners = [
        {
            "id": owner.get("id", ""),
            "display_name": owner.get("displayName")
            or owner.get("firstName")
            or "Unknown",
        }
        for owner in team.owners
    ]

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
        "scores": scores,
        "outcomes": outcomes,
        "schedule_opponent_ids": opponent_ids,
        "roster": roster,
        "owners": owners,
    }


def serialize_standings(teams: list[Any]) -> list[dict[str, Any]]:
    ordered = sorted(
        teams,
        key=lambda team: team.standing if team.standing else 999,
    )
    return [
        {
            "position": team.standing or index,
            "team_id": team.team_id,
            "team_name": team.team_name,
            "wins": team.wins,
            "losses": team.losses,
            "points_for": team.points_for,
            "final_standing": team.final_standing,
        }
        for index, team in enumerate(ordered, start=1)
    ]


def serialize_draft(league: League) -> list[dict[str, Any]]:
    picks = sorted(
        league.draft,
        key=lambda pick: (pick.round_num, pick.round_pick),
    )
    return [
        {
            "round": pick.round_num,
            "round_pick": pick.round_pick,
            "team_id": pick.team.team_id,
            "team_name": pick.team.team_name,
            "player_id": pick.playerId,
            "player_name": pick.playerName,
            "bid_amount": pick.bid_amount or 0,
            "keeper": bool(pick.keeper_status),
        }
        for pick in picks
        if pick.team is not None
    ]


def fetch_year(
    league_id: int,
    year: int,
    espn_s2: str,
    swid: str,
) -> dict[str, Any]:
    print(f"  Fetching {year}...")
    try:
        league = League(
            league_id=league_id,
            year=year,
            espn_s2=espn_s2,
            swid=swid,
        )

        raw = league.espn_request.get_league()
        schedule = raw.get("schedule", [])

        return {
            "year": year,
            "league_id": league_id,
            "sport": "football",
            "current_week": league.current_week,
            "final_scoring_period": league.finalScoringPeriod,
            "settings": {
                "name": league.settings.name,
                "scoring_type": league.settings.scoring_type or "H2H_POINTS",
                "num_teams": league.settings.team_count,
            },
            "teams": [serialize_team(team, schedule) for team in league.teams],
            "standings": serialize_standings(league.teams),
            "matchups": extract_matchups(schedule),
            "draft": serialize_draft(league),
        }
    except Exception as e:
        error_msg = f"Failed to fetch league {league_id} for year {year}: {e}"
        print(f"  Error: {error_msg}", file=sys.stderr)
        return {
            "year": year,
            "league_id": league_id,
            "error": error_msg,
        }


def resolve_years(
    league_id: int,
    espn_s2: str,
    swid: str,
    years: list[int] | None,
    all_years: bool,
) -> list[int]:
    if years:
        return sorted(years, reverse=True)

    current_year = datetime.now().year
    probe = League(
        league_id=league_id,
        year=current_year,
        espn_s2=espn_s2,
        swid=swid,
    )

    if all_years:
        discovered = [probe.year, *probe.previousSeasons]
        return sorted(set(discovered), reverse=True)

    return [probe.year]


def merge_years(
    existing: dict[str, Any] | None,
    fetched_years: list[dict[str, Any]],
) -> dict[str, Any]:
    if fetched_years:
        league_id = fetched_years[0]["league_id"]
    elif existing:
        league_id = existing.get("league_id")
    else:
        print("Error: No fetched years and no existing data to merge.", file=sys.stderr)
        sys.exit(1)

    by_year = {}

    if existing:
        for year_data in existing.get("years", []):
            by_year[year_data["year"]] = year_data

    for year_data in fetched_years:
        by_year[year_data["year"]] = year_data

    return {
        "league_id": league_id,
        "sport": "football",
        "fetched_at": datetime.now().isoformat(),
        "years": sorted(by_year.values(), key=lambda item: item["year"], reverse=True),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch ESPN fantasy football league data into JSON."
    )

    # Parse LEAGUE_ID from environment with error handling
    league_id_env = os.environ.get("LEAGUE_ID", str(DEFAULT_LEAGUE_ID))
    try:
        league_id_default = int(league_id_env)
    except ValueError:
        parser.error(f"LEAGUE_ID environment variable must be an integer, got: {league_id_env}")

    parser.add_argument(
        "--league-id",
        type=int,
        default=league_id_default,
        help=f"ESPN league id (default: {DEFAULT_LEAGUE_ID})",
    )
    parser.add_argument(
        "--year",
        type=int,
        action="append",
        dest="years",
        help="Season year to fetch (repeatable). Defaults to current season.",
    )
    parser.add_argument(
        "--all-years",
        action="store_true",
        help="Fetch current season plus all previous seasons ESPN reports.",
    )
    parser.add_argument(
        "--output",
        help="Output JSON path (default: repo root/league_<league_id>_football_history.json)",
    )
    parser.add_argument(
        "--no-merge",
        action="store_true",
        help="Replace the output file instead of merging with existing years.",
    )
    return parser.parse_args()


def main() -> None:
    load_env_file()
    args = parse_args()
    espn_s2, swid = get_credentials()
    out = output_path(args.output, args.league_id)

    years = resolve_years(
        league_id=args.league_id,
        espn_s2=espn_s2,
        swid=swid,
        years=args.years,
        all_years=args.all_years,
    )

    print(f"Fetching league {args.league_id} for years: {', '.join(map(str, years))}")

    fetched_years = [
        fetch_year(args.league_id, year, espn_s2, swid) for year in years
    ]

    existing = None
    if out.exists() and not args.no_merge:
        try:
            existing = json.loads(out.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"Error: Failed to parse existing JSON at {out}: {e}", file=sys.stderr)
            sys.exit(1)
        except OSError as e:
            print(f"Error: Failed to read existing file at {out}: {e}", file=sys.stderr)
            sys.exit(1)

    payload = merge_years(existing, fetched_years)

    try:
        out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    except OSError as e:
        print(f"Error: Failed to write output file at {out}: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"\nWrote {out}")
    print(f"  Years: {len(payload['years'])}")
    print(f"  Fetched at: {payload['fetched_at']}")
    print("\nNext step:")
    print("  cd apps/studio && npx sanity exec scripts/import-league-data.ts --with-user-token")


if __name__ == "__main__":
    main()
