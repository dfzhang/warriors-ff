const MAX_TEAM_ROUTE_LENGTH = 63;

export function sanitizeTeamRouteSegment(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, MAX_TEAM_ROUTE_LENGTH);
}

export function getTeamRouteSegment(
  abbreviation: string | null | undefined,
  teamId: number,
): string {
  return sanitizeTeamRouteSegment(abbreviation ?? "") || String(teamId);
}
