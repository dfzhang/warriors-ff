import { AlertTriangle, History, RotateCcw, TrendingUp } from "lucide-react";
import type { Metadata } from "next";

import {
  formatRound,
  getKeeperOutlook,
  getKeeperStreak,
  type KeeperOutlook,
  type KeeperPick,
  normalizeKeeperHistory,
} from "@/lib/keeper-tracker";
import { sanityFetch } from "@/lib/sanity/live";
import { queryAllTeams, queryKeeperHistory } from "@/lib/sanity/query";

export const metadata: Metadata = {
  title: "Keeper Tracker",
  description:
    "Keeper history, draft-round value, and next-season eligibility for every Warriors team.",
};

// Sanity is the live source when keeper records are published. This compact
// snapshot comes from the repository's ESPN history export and keeps the
// tracker useful when the public Sanity dataset has not been populated yet.
const keeperFallback = {"history":[{"_id":"espn-2025-1-2-3918298","year":2025,"round":1,"roundPick":2,"team":{"_id":"espn-team-9","teamId":9,"teamName":"The   Underdog","teamAbbrev":"NTG"},"player":{"_id":"espn-player-3918298","playerId":3918298,"playerName":"Josh Allen","position":null}},{"_id":"espn-2025-1-3-4362628","year":2025,"round":1,"roundPick":3,"team":{"_id":"espn-team-5","teamId":5,"teamName":"The Williams Sisters","teamAbbrev":"RIDD"},"player":{"_id":"espn-player-4362628","playerId":4362628,"playerName":"Ja'Marr Chase","position":null}},{"_id":"espn-2025-1-4-4430807","year":2025,"round":1,"roundPick":4,"team":{"_id":"espn-team-6","teamId":6,"teamName":"Bed, Bath n Bijan","teamAbbrev":"BBB"},"player":{"_id":"espn-player-4430807","playerId":4430807,"playerName":"Bijan Robinson","position":null}},{"_id":"espn-2025-1-7-4040715","year":2025,"round":1,"roundPick":7,"team":{"_id":"espn-team-4","teamId":4,"teamName":"It Hurts so good","teamAbbrev":"HRTS"},"player":{"_id":"espn-player-4040715","playerId":4040715,"playerName":"Jalen Hurts","position":null}},{"_id":"espn-2025-1-8-3916387","year":2025,"round":1,"roundPick":8,"team":{"_id":"espn-team-10","teamId":10,"teamName":"Roll Pards","teamAbbrev":"WARS"},"player":{"_id":"espn-player-3916387","playerId":3916387,"playerName":"Lamar Jackson","position":null}},{"_id":"espn-2025-2-1-3915511","year":2025,"round":2,"roundPick":1,"team":{"_id":"espn-team-2","teamId":2,"teamName":"Winged D'andre of Ra","teamAbbrev":"WDR"},"player":{"_id":"espn-player-3915511","playerId":3915511,"playerName":"Joe Burrow","position":null}},{"_id":"espn-2025-2-2-3929630","year":2025,"round":2,"roundPick":2,"team":{"_id":"espn-team-1","teamId":1,"teamName":"All Barkley, No Bite","teamAbbrev":"ASKI"},"player":{"_id":"espn-player-3929630","playerId":3929630,"playerName":"Saquon Barkley","position":null}},{"_id":"espn-2025-2-3-4429795","year":2025,"round":2,"roundPick":3,"team":{"_id":"espn-team-10","teamId":10,"teamName":"Roll Pards","teamAbbrev":"WARS"},"player":{"_id":"espn-player-4429795","playerId":4429795,"playerName":"Jahmyr Gibbs","position":null}},{"_id":"espn-2025-3-1-4426348","year":2025,"round":3,"roundPick":1,"team":{"_id":"espn-team-8","teamId":8,"teamName":"Like a good Nabers","teamAbbrev":"FARM"},"player":{"_id":"espn-player-4426348","playerId":4426348,"playerName":"Jayden Daniels","position":null}},{"_id":"espn-2025-3-2-4379399","year":2025,"round":3,"roundPick":2,"team":{"_id":"espn-team-9","teamId":9,"teamName":"The   Underdog","teamAbbrev":"NTG"},"player":{"_id":"espn-player-4379399","playerId":4379399,"playerName":"James Cook III","position":null}},{"_id":"espn-2025-3-7-3043078","year":2025,"round":3,"roundPick":7,"team":{"_id":"espn-team-4","teamId":4,"teamName":"It Hurts so good","teamAbbrev":"HRTS"},"player":{"_id":"espn-player-3043078","playerId":3043078,"playerName":"Derrick Henry","position":null}},{"_id":"espn-2025-4-5-4430027","year":2025,"round":4,"roundPick":5,"team":{"_id":"espn-team-7","teamId":7,"teamName":"Hootie and The Bo-Fish","teamAbbrev":"ZACK"},"player":{"_id":"espn-player-4430027","playerId":4430027,"playerName":"Sam LaPorta","position":null}},{"_id":"espn-2025-4-10-4595348","year":2025,"round":4,"roundPick":10,"team":{"_id":"espn-team-8","teamId":8,"teamName":"Like a good Nabers","teamAbbrev":"FARM"},"player":{"_id":"espn-player-4595348","playerId":4595348,"playerName":"Malik Nabers","position":null}},{"_id":"espn-2025-5-9-4361307","year":2025,"round":5,"roundPick":9,"team":{"_id":"espn-team-1","teamId":1,"teamName":"All Barkley, No Bite","teamAbbrev":"ASKI"},"player":{"_id":"espn-player-4361307","playerId":4361307,"playerName":"Trey McBride","position":null}},{"_id":"espn-2025-7-3-4596448","year":2025,"round":7,"roundPick":3,"team":{"_id":"espn-team-5","teamId":5,"teamName":"The Williams Sisters","teamAbbrev":"RIDD"},"player":{"_id":"espn-player-4596448","playerId":4596448,"playerName":"Bucky Irving","position":null}},{"_id":"espn-2025-7-4-4432773","year":2025,"round":7,"roundPick":4,"team":{"_id":"espn-team-6","teamId":6,"teamName":"Bed, Bath n Bijan","teamAbbrev":"BBB"},"player":{"_id":"espn-player-4432773","playerId":4432773,"playerName":"Brian Thomas Jr.","position":null}},{"_id":"espn-2025-7-6-4426338","year":2025,"round":7,"roundPick":6,"team":{"_id":"espn-team-7","teamId":7,"teamName":"Hootie and The Bo-Fish","teamAbbrev":"ZACK"},"player":{"_id":"espn-player-4426338","playerId":4426338,"playerName":"Bo Nix","position":null}},{"_id":"espn-2025-7-10-4432665","year":2025,"round":7,"roundPick":10,"team":{"_id":"espn-team-2","teamId":2,"teamName":"Winged D'andre of Ra","teamAbbrev":"WDR"},"player":{"_id":"espn-player-4432665","playerId":4432665,"playerName":"Brock Bowers","position":null}},{"_id":"espn-2024-1-8-3918298","year":2024,"round":1,"roundPick":8,"team":{"_id":"espn-team-9","teamId":9,"teamName":"The   Underdog","teamAbbrev":"NTG"},"player":{"_id":"espn-player-3918298","playerId":3918298,"playerName":"Josh Allen","position":null}},{"_id":"espn-2024-1-9-4430807","year":2024,"round":1,"roundPick":9,"team":{"_id":"espn-team-6","teamId":6,"teamName":"Bed, Bath n Bijan","teamAbbrev":"BBB"},"player":{"_id":"espn-player-4430807","playerId":4430807,"playerName":"Bijan Robinson","position":null}},{"_id":"espn-2024-1-10-3117251","year":2024,"round":1,"roundPick":10,"team":{"_id":"espn-team-1","teamId":1,"teamName":"All Barkley, No Bite","teamAbbrev":"ASKI"},"player":{"_id":"espn-player-3117251","playerId":3117251,"playerName":"Christian McCaffrey","position":null}},{"_id":"espn-2024-2-6-3139477","year":2024,"round":2,"roundPick":6,"team":{"_id":"espn-team-7","teamId":7,"teamName":"Me and Mahomies","teamAbbrev":"ZACK"},"player":{"_id":"espn-player-3139477","playerId":3139477,"playerName":"Patrick Mahomes","position":null}},{"_id":"espn-2024-2-10-3116406","year":2024,"round":2,"roundPick":10,"team":{"_id":"espn-team-4","teamId":4,"teamName":"It Hurts so good","teamAbbrev":"HRTS"},"player":{"_id":"espn-player-3116406","playerId":3116406,"playerName":"Tyreek Hill","position":null}},{"_id":"espn-2024-3-7-4047646","year":2024,"round":3,"roundPick":7,"team":{"_id":"espn-team-10","teamId":10,"teamName":"Roll Pards","teamAbbrev":"WARS"},"player":{"_id":"espn-player-4047646","playerId":4047646,"playerName":"A.J. Brown","position":null}},{"_id":"espn-2024-3-9-4569618","year":2024,"round":3,"roundPick":9,"team":{"_id":"espn-team-6","teamId":6,"teamName":"Bed, Bath n Bijan","teamAbbrev":"BBB"},"player":{"_id":"espn-player-4569618","playerId":4569618,"playerName":"Garrett Wilson","position":null}},{"_id":"espn-2024-6-5-4430737","year":2024,"round":6,"roundPick":5,"team":{"_id":"espn-team-5","teamId":5,"teamName":"The Williams Sisters","teamAbbrev":"RIDD"},"player":{"_id":"espn-player-4430737","playerId":4430737,"playerName":"Kyren Williams","position":null}},{"_id":"espn-2024-6-8-4258173","year":2024,"round":6,"roundPick":8,"team":{"_id":"espn-team-2","teamId":2,"teamName":"The Anti-Heroes","teamAbbrev":"TAH"},"player":{"_id":"espn-player-4258173","playerId":4258173,"playerName":"Nico Collins","position":null}},{"_id":"espn-2024-6-9-4432577","year":2024,"round":6,"roundPick":9,"team":{"_id":"espn-team-8","teamId":8,"teamName":"Can you CeeDees Nutz","teamAbbrev":"NUTZ"},"player":{"_id":"espn-player-4432577","playerId":4432577,"playerName":"C.J. Stroud","position":null}},{"_id":"espn-2024-7-2-4427366","year":2024,"round":7,"roundPick":2,"team":{"_id":"espn-team-8","teamId":8,"teamName":"Can you CeeDees Nutz","teamAbbrev":"NUTZ"},"player":{"_id":"espn-player-4427366","playerId":4427366,"playerName":"Breece Hall","position":null}},{"_id":"espn-2024-7-3-4697815","year":2024,"round":7,"roundPick":3,"team":{"_id":"espn-team-2","teamId":2,"teamName":"The Anti-Heroes","teamAbbrev":"TAH"},"player":{"_id":"espn-player-4697815","playerId":4697815,"playerName":"Rachaad White","position":null}},{"_id":"espn-2024-7-5-4361529","year":2024,"round":7,"roundPick":5,"team":{"_id":"espn-team-7","teamId":7,"teamName":"Me and Mahomies","teamAbbrev":"ZACK"},"player":{"_id":"espn-player-4361529","playerId":4361529,"playerName":"Isiah Pacheco","position":null}},{"_id":"espn-2024-7-6-4036378","year":2024,"round":7,"roundPick":6,"team":{"_id":"espn-team-5","teamId":5,"teamName":"The Williams Sisters","teamAbbrev":"RIDD"},"player":{"_id":"espn-player-4036378","playerId":4036378,"playerName":"Jordan Love","position":null}},{"_id":"espn-2024-7-7-4429084","year":2024,"round":7,"roundPick":7,"team":{"_id":"espn-team-10","teamId":10,"teamName":"Roll Pards","teamAbbrev":"WARS"},"player":{"_id":"espn-player-4429084","playerId":4429084,"playerName":"Anthony Richardson","position":null}},{"_id":"espn-2024-7-10-3917315","year":2024,"round":7,"roundPick":10,"team":{"_id":"espn-team-1","teamId":1,"teamName":"All Barkley, No Bite","teamAbbrev":"ASKI"},"player":{"_id":"espn-player-3917315","playerId":3917315,"playerName":"Kyler Murray","position":null}},{"_id":"espn-2023-1-7-3918298","year":2023,"round":1,"roundPick":7,"team":{"_id":"espn-team-9","teamId":9,"teamName":"The   Underdog","teamAbbrev":"NTG"},"player":{"_id":"espn-player-3918298","playerId":3918298,"playerName":"Josh Allen","position":null}},{"_id":"espn-2023-1-9-4262921","year":2023,"round":1,"roundPick":9,"team":{"_id":"espn-team-10","teamId":10,"teamName":"Roll Pards","teamAbbrev":"WARS"},"player":{"_id":"espn-player-4262921","playerId":4262921,"playerName":"Justin Jefferson","position":null}},{"_id":"espn-2023-2-5-3139477","year":2023,"round":2,"roundPick":5,"team":{"_id":"espn-team-7","teamId":7,"teamName":"Me and Mahomies","teamAbbrev":"ZACK"},"player":{"_id":"espn-player-3139477","playerId":3139477,"playerName":"Patrick Mahomes","position":null}},{"_id":"espn-2023-3-1-15847","year":2023,"round":3,"roundPick":1,"team":{"_id":"espn-team-1","teamId":1,"teamName":"Hasta La Travista Baby","teamAbbrev":"ASKI"},"player":{"_id":"espn-player-15847","playerId":15847,"playerName":"Travis Kelce","position":null}},{"_id":"espn-2023-3-2-3116406","year":2023,"round":3,"roundPick":2,"team":{"_id":"espn-team-4","teamId":4,"teamName":"It Hurts so good","teamAbbrev":"HRTS"},"player":{"_id":"espn-player-3116406","playerId":3116406,"playerName":"Tyreek Hill","position":null}},{"_id":"espn-2023-4-1-3128720","year":2023,"round":4,"roundPick":1,"team":{"_id":"espn-team-3","teamId":3,"teamName":"TuAnon","teamAbbrev":"DALE"},"player":{"_id":"espn-player-3128720","playerId":3128720,"playerName":"Nick Chubb","position":null}},{"_id":"espn-2023-4-4-4239993","year":2023,"round":4,"roundPick":4,"team":{"_id":"espn-team-9","teamId":9,"teamName":"The   Underdog","teamAbbrev":"NTG"},"player":{"_id":"espn-player-4239993","playerId":4239993,"playerName":"Tee Higgins","position":null}},{"_id":"espn-2023-5-1-4239996","year":2023,"round":5,"roundPick":1,"team":{"_id":"espn-team-1","teamId":1,"teamName":"Hasta La Travista Baby","teamAbbrev":"ASKI"},"player":{"_id":"espn-player-4239996","playerId":4239996,"playerName":"Travis Etienne Jr.","position":null}},{"_id":"espn-2023-5-4-3915511","year":2023,"round":5,"roundPick":4,"team":{"_id":"espn-team-5","teamId":5,"teamName":"The Williams Sisters","teamAbbrev":"RIDD"},"player":{"_id":"espn-player-3915511","playerId":3915511,"playerName":"Joe Burrow","position":null}},{"_id":"espn-2023-5-8-3929630","year":2023,"round":5,"roundPick":8,"team":{"_id":"espn-team-8","teamId":8,"teamName":"Diggsing in my Fields","teamAbbrev":"DF"},"player":{"_id":"espn-player-3929630","playerId":3929630,"playerName":"Saquon Barkley","position":null}},{"_id":"espn-2023-5-10-4047646","year":2023,"round":5,"roundPick":10,"team":{"_id":"espn-team-3","teamId":3,"teamName":"TuAnon","teamAbbrev":"DALE"},"player":{"_id":"espn-player-4047646","playerId":4047646,"playerName":"A.J. Brown","position":null}},{"_id":"espn-2023-6-5-4241463","year":2023,"round":6,"roundPick":5,"team":{"_id":"espn-team-7","teamId":7,"teamName":"Me and Mahomies","teamAbbrev":"ZACK"},"player":{"_id":"espn-player-4241463","playerId":4241463,"playerName":"Jerry Jeudy","position":null}},{"_id":"espn-2023-6-6-3122840","year":2023,"round":6,"roundPick":6,"team":{"_id":"espn-team-6","teamId":6,"teamName":"Bed, Bath n Bijan","teamAbbrev":"BBB"},"player":{"_id":"espn-player-3122840","playerId":3122840,"playerName":"Deshaun Watson","position":null}},{"_id":"espn-2023-6-8-4426354","year":2023,"round":6,"roundPick":8,"team":{"_id":"espn-team-2","teamId":2,"teamName":"Tickle my Pickles","teamAbbrev":"TMP"},"player":{"_id":"espn-player-4426354","playerId":4426354,"playerName":"George Pickens","position":null}},{"_id":"espn-2023-7-3-4240703","year":2023,"round":7,"roundPick":3,"team":{"_id":"espn-team-2","teamId":2,"teamName":"Tickle my Pickles","teamAbbrev":"TMP"},"player":{"_id":"espn-player-4240703","playerId":4240703,"playerName":"Kenny Pickett","position":null}},{"_id":"espn-2023-7-4-3916148","year":2023,"round":7,"roundPick":4,"team":{"_id":"espn-team-5","teamId":5,"teamName":"The Williams Sisters","teamAbbrev":"RIDD"},"player":{"_id":"espn-player-3916148","playerId":3916148,"playerName":"Tony Pollard","position":null}},{"_id":"espn-2023-7-5-4569618","year":2023,"round":7,"roundPick":5,"team":{"_id":"espn-team-6","teamId":6,"teamName":"Bed, Bath n Bijan","teamAbbrev":"BBB"},"player":{"_id":"espn-player-4569618","playerId":4569618,"playerName":"Garrett Wilson","position":null}},{"_id":"espn-2023-7-8-3925357","year":2023,"round":7,"roundPick":8,"team":{"_id":"espn-team-8","teamId":8,"teamName":"Diggsing in my Fields","teamAbbrev":"DF"},"player":{"_id":"espn-player-3925357","playerId":3925357,"playerName":"Calvin Ridley","position":null}},{"_id":"espn-2023-7-9-4360310","year":2023,"round":7,"roundPick":9,"team":{"_id":"espn-team-10","teamId":10,"teamName":"Roll Pards","teamAbbrev":"WARS"},"player":{"_id":"espn-player-4360310","playerId":4360310,"playerName":"Trevor Lawrence","position":null}}],"teams":[{"_id":"espn-team-1","teamId":1,"teamName":"All Barkley, No Bite","teamAbbrev":"ASKI"},{"_id":"espn-team-2","teamId":2,"teamName":"Winged D'andre of Ra","teamAbbrev":"WDR"},{"_id":"espn-team-3","teamId":3,"teamName":"Mr Worldwide","teamAbbrev":"DALE"},{"_id":"espn-team-4","teamId":4,"teamName":"It Hurts so good","teamAbbrev":"HRTS"},{"_id":"espn-team-5","teamId":5,"teamName":"The Williams Sisters","teamAbbrev":"RIDD"},{"_id":"espn-team-6","teamId":6,"teamName":"Bed, Bath n Bijan","teamAbbrev":"BBB"},{"_id":"espn-team-7","teamId":7,"teamName":"Hootie and The Bo-Fish","teamAbbrev":"ZACK"},{"_id":"espn-team-8","teamId":8,"teamName":"Like a good Nabers","teamAbbrev":"FARM"},{"_id":"espn-team-9","teamId":9,"teamName":"The   Underdog","teamAbbrev":"NTG"},{"_id":"espn-team-10","teamId":10,"teamName":"Roll Pards","teamAbbrev":"WARS"}]} as {
  history: KeeperPick[];
  teams: KeeperPick["team"][];
};

const outlookStyles: Record<KeeperOutlook, string> = {
  adp: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
  pool: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
  "data-conflict":
    "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
};

function OutlookBadge({
  outlook,
  nextYear,
}: {
  outlook: KeeperOutlook;
  nextYear: number;
}) {
  const content = {
    adp: {
      icon: TrendingUp,
      label: `${nextYear}: price by ADP`,
    },
    pool: {
      icon: RotateCcw,
      label: `${nextYear}: returns to pool`,
    },
    "data-conflict": {
      icon: AlertTriangle,
      label: "Data conflicts with rule",
    },
  }[outlook];
  const Icon = content.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${outlookStyles[outlook]}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {content.label}
    </span>
  );
}

export default async function KeepersPage() {
  const [historyResult, teamsResult] = await Promise.all([
    sanityFetch({ query: queryKeeperHistory }),
    sanityFetch({ query: queryAllTeams }),
  ]);

  const sanityHistory = historyResult.data as KeeperPick[] | null;
  const sanityTeams = teamsResult.data as KeeperPick["team"][] | null;
  const rawHistory =
    Array.isArray(sanityHistory) && sanityHistory.length > 0
      ? sanityHistory
      : (keeperFallback.history as KeeperPick[]);
  const rawTeams =
    Array.isArray(sanityTeams) && sanityTeams.length > 0
      ? sanityTeams
      : (keeperFallback.teams as KeeperPick["team"][]);

  const validHistory = (Array.isArray(rawHistory) ? rawHistory : []).filter(
    (pick): pick is KeeperPick =>
      Boolean(
        pick &&
        typeof pick.year === "number" &&
        typeof pick.round === "number" &&
        pick.team &&
        typeof pick.team.teamId === "number" &&
        pick.player &&
        typeof pick.player.playerId === "number",
      ),
  );
  const { history, issues, correctionsApplied } =
    normalizeKeeperHistory(validHistory);
  const latestYear = Math.max(...history.map((pick) => pick.year));

  if (!Number.isFinite(latestYear) || history.length === 0) {
    return (
      <main className="container mx-auto px-4 py-12 md:px-6">
        <h1 className="text-4xl font-bold">Keeper tracker</h1>
        <p className="mt-4 text-muted-foreground">
          No keeper history is available yet.
        </p>
      </main>
    );
  }

  const nextYear = latestYear + 1;
  const latestKeepers = history.filter((pick) => pick.year === latestYear);
  const teams = (Array.isArray(rawTeams) ? rawTeams : [])
    .filter((team) => team && typeof team.teamId === "number")
    .filter(
      (team, index, allTeams) =>
        allTeams.findIndex((candidate) => candidate.teamId === team.teamId) ===
        index,
    )
    .sort((a, b) => a.teamId - b.teamId);

  const firstYearCount = latestKeepers.filter(
    (pick) => getKeeperStreak(pick, history) === 1,
  ).length;
  const poolCount = latestKeepers.filter(
    (pick) => getKeeperStreak(pick, history) === 2,
  ).length;
  const conflictCount = latestKeepers.filter(
    (pick) => getKeeperStreak(pick, history) > 2,
  ).length;

  return (
    <main className="container mx-auto px-4 py-10 md:px-6 md:py-14">
      <header className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Through the {latestYear} draft
        </p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Keeper tracker
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Every recorded keeper, their draft-round cost, and what their
          consecutive tenure means for the {nextYear} draft.
        </p>
      </header>

      <section
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Keeper summary"
      >
        {[
          [
            "Current keepers",
            latestKeepers.length,
            "Recorded in the latest draft",
          ],
          ["ADP eligible", firstYearCount, `May be kept again in ${nextYear}`],
          ["Returning to pool", poolCount, "Two keeper seasons completed"],
          ["Needs review", conflictCount, "Source data exceeds the limit"],
        ].map(([label, value, detail]) => (
          <div
            key={String(label)}
            className="rounded-2xl border bg-card p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-14" aria-labelledby="outlook-heading">
        <div className="flex items-center gap-3">
          <TrendingUp className="size-6" aria-hidden="true" />
          <h2 id="outlook-heading" className="text-3xl font-bold">
            {nextYear} outlook by team
          </h2>
        </div>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          “Price by ADP” means the player has completed one keeper season. The
          exact round remains pending until the league approves its ADP source
          and snapshot; it does not mean the team has committed to the player.
        </p>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Jump to team">
          {teams.map((team) => (
            <a
              key={`jump-${team.teamId}`}
              href={`#team-${team.teamId}`}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted"
            >
              {team.teamAbbrev || team.teamName.trim()}
            </a>
          ))}
        </nav>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {teams.map((team) => {
            const teamCurrentKeepers = latestKeepers
              .filter((pick) => pick.team.teamId === team.teamId)
              .sort((a, b) => a.round - b.round);

            return (
              <article
                key={team.teamId}
                id={`team-${team.teamId}`}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm"
              >
                <header className="border-b bg-muted/40 px-5 py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-lg font-semibold">
                      {team.teamName.trim()}
                    </h3>
                    {team.teamAbbrev && (
                      <span className="text-xs font-semibold text-muted-foreground">
                        {team.teamAbbrev}
                      </span>
                    )}
                  </div>
                </header>
                <div className="divide-y">
                  {teamCurrentKeepers.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-muted-foreground">
                      No {latestYear} keepers recorded.
                    </p>
                  ) : (
                    teamCurrentKeepers.map((pick) => {
                      const streak = getKeeperStreak(pick, history);
                      const outlook = getKeeperOutlook(streak);

                      return (
                        <div key={pick._id} className="px-5 py-4">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                              <p className="font-semibold">
                                {pick.player.playerName}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {formatRound(pick.round)} in {latestYear} ·
                                keeper year {streak}
                              </p>
                            </div>
                            <OutlookBadge
                              outlook={outlook}
                              nextYear={nextYear}
                            />
                          </div>
                          {outlook === "data-conflict" && (
                            <p className="mt-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
                              Recorded for {streak} consecutive keeper seasons.
                              The rules allow two; confirm the source record
                              with the commissioner.
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="history-heading">
        <div className="flex items-center gap-3">
          <History className="size-6" aria-hidden="true" />
          <h2 id="history-heading" className="text-3xl font-bold">
            Full history by team
          </h2>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {teams.map((team) => {
            const teamHistory = history
              .filter((pick) => pick.team.teamId === team.teamId)
              .sort((a, b) => b.year - a.year || a.round - b.round);

            return (
              <article
                key={`history-${team.teamId}`}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm"
              >
                <header className="border-b px-5 py-4">
                  <h3 className="font-semibold">{team.teamName.trim()}</h3>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left text-sm">
                    <caption className="sr-only">
                      Keeper history for {team.teamName.trim()}
                    </caption>
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Season
                        </th>
                        <th scope="col" className="px-3 py-3 font-semibold">
                          Player
                        </th>
                        <th scope="col" className="px-3 py-3 font-semibold">
                          Cost
                        </th>
                        <th
                          scope="col"
                          className="px-5 py-3 text-right font-semibold"
                        >
                          Tenure
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {teamHistory.map((pick) => {
                        const streak = getKeeperStreak(pick, history);
                        return (
                          <tr key={`history-${pick._id}`}>
                            <td className="px-5 py-3 font-medium">
                              {pick.year}
                            </td>
                            <td className="px-3 py-3">
                              {pick.player.playerName}
                            </td>
                            <td className="px-3 py-3">R{pick.round}</td>
                            <td className="px-5 py-3 text-right text-muted-foreground">
                              Year {streak}
                              {streak > 2 ? " · review" : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {(correctionsApplied > 0 || issues.length > 0) && (
        <aside className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <h2 className="font-semibold">Data quality notes</h2>
          {correctionsApplied > 0 && (
            <p className="mt-2">
              The known incorrect Josh Allen 2025 keeper flag is excluded from
              this tracker while the source record is being corrected.
            </p>
          )}
          {issues.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {issues.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          )}
        </aside>
      )}

      <aside className="mt-10 rounded-2xl border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
        Data comes from draft picks marked as keepers in league history. Tenure
        is inferred from consecutive seasons for the same player across all
        teams, so a trade does not reset the keeper clock. A season without a
        keeper record resets the consecutive-season count. ADP determines the
        price only if an eligible player is kept again; the league still needs
        to choose the official ADP source and snapshot date.
      </aside>
    </main>
  );
}
