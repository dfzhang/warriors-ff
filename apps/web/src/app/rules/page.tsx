import {
  ArrowRight,
  CircleDollarSign,
  RefreshCcw,
  Repeat2,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "League Rules",
  description:
    "Roster, payment, keeper, and draft-pick trade rules for the Warriors fantasy football league.",
};

const rosterSlots = [
  ["QB", "1"],
  ["RB", "2"],
  ["WR", "2"],
  ["TE", "1"],
  ["OP", "1"],
  ["Flex", "1"],
  ["D/ST", "1"],
  ["K", "1"],
  ["Bench", "5"],
  ["IR", "1"],
];

const keeperStages = [
  {
    eyebrow: "First keeper season",
    title: "Original acquisition price",
    body: "Use the round where the player was drafted in the previous season. A waiver-wire player costs a seventh-round pick.",
  },
  {
    eyebrow: "Second keeper season",
    title: "Current ADP price",
    body: "Use the player's current ADP to determine the round, regardless of the player's original draft position.",
  },
  {
    eyebrow: "After two keeper seasons",
    title: "Back to the draft pool",
    body: "The player is no longer keeper-eligible and must be available in the next draft.",
  },
];

export default function RulesPage() {
  return (
    <main className="container mx-auto px-4 py-10 md:px-6 md:py-14">
      <header className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Warriors fantasy football
        </p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          League rules
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          The practical version of the roster, payment, keeper, and draft-pick
          trade rules.
        </p>
      </header>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-2 text-primary">
              <Users className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Roster</p>
              <h2 className="text-xl font-semibold">
                15 active and bench slots, plus IR
              </h2>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {rosterSlots.map(([slot, count]) => (
              <div
                key={slot}
                className="rounded-xl bg-muted/60 px-4 py-3 text-center"
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {slot}
                </dt>
                <dd className="mt-1 text-2xl font-bold">{count}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-2 text-primary">
              <CircleDollarSign className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Annual buy-in</p>
              <h2 className="text-3xl font-bold">$100</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            If the buy-in is a concern, message Scott, Ben, or Chris privately.
            The priority is keeping everyone in the league, and arrangements can
            be made.
          </p>
        </div>
      </section>

      <section className="mt-14" aria-labelledby="keepers-heading">
        <div className="flex items-center gap-3">
          <Repeat2 className="size-6" aria-hidden="true" />
          <h2 id="keepers-heading" className="text-3xl font-bold">
            Keeper lifecycle
          </h2>
        </div>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          Each team may keep zero, one, or two players. A player may be retained
          for no more than two consecutive keeper seasons.
        </p>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {keeperStages.map((stage, index) => (
            <article
              key={stage.title}
              className="relative rounded-2xl border bg-card p-6 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                {index < keeperStages.length - 1 && (
                  <ArrowRight
                    className="hidden size-5 text-muted-foreground lg:block"
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {stage.eyebrow}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{stage.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {stage.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-bold">Keeper pricing details</h2>
          <ol className="mt-5 space-y-5 text-sm leading-6">
            <li>
              <strong className="block text-base">First-year keeper</strong>
              The cost is the round in which the player was actually drafted the
              prior season.
            </li>
            <li>
              <strong className="block text-base">Waiver acquisition</strong>A
              player acquired from waivers is treated as a seventh-round pick
              for first-year keeper pricing.
            </li>
            <li>
              <strong className="block text-base">Same-round conflict</strong>
              If two keepers are priced by ADP in the same round, one uses that
              round and the other moves one round earlier. For example, ADPs of
              65 and 69 cost sixth- and seventh-round picks in a 10-team league.
            </li>
            <li>
              <strong className="block text-base">Second-year keeper</strong>
              The cost resets to the round indicated by current ADP. In a
              10-team league, an ADP of 59 maps to Round 6.
            </li>
          </ol>
        </article>

        <article className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-bold">Trades and keeper clocks</h2>
          <div className="mt-5 space-y-5 text-sm leading-6">
            <div className="flex gap-3">
              <RefreshCcw
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p>
                <strong className="block text-base">
                  The clock follows the player
                </strong>
                Trading a previously kept player does not restart their keeper
                tenure or restore an earlier value.
              </p>
            </div>
            <div className="flex gap-3">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p>
                <strong className="block text-base">
                  Draft-pick trades must balance
                </strong>
                Each side must exchange the same number of picks. The rounds do
                not need to match.
              </p>
            </div>
            <div className="flex gap-3">
              <Repeat2
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p>
                <strong className="block text-base">
                  Traded-player exception
                </strong>
                If a player was acquired in a trade involving draft picks and
                their keeper ADP maps to the specific round sent away in that
                deal, the keeper moves one round earlier. For example, a player
                with a Round 3 ADP costs a second-round pick if that deal sent
                away the team&apos;s third-round pick.
              </p>
            </div>
          </div>
        </article>
      </section>

      <aside className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <h2 className="font-semibold">Commissioner clarifications needed</h2>
        <p className="mt-2 text-sm leading-6">
          Before these rules are final, confirm the official ADP source, scoring
          format, snapshot date, and round-mapping method. Also confirm edge
          cases for Round 1 conflicts, values beyond the final draft round,
          waiver-versus-free-agent pickups, and whether a season back in the
          draft pool resets the keeper clock. The tracker currently treats a gap
          as a reset while keeping the clock attached to a traded player.
        </p>
      </aside>
    </main>
  );
}
