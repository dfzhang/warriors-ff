import {
  ArrowRight,
  CircleDollarSign,
  MessageSquareQuote,
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
    title: "Original draft price",
    body: "Use the player's prior-season draft round, capped at Round 7. A truly undrafted waiver or free-agent pickup costs a seventh-round pick.",
  },
  {
    eyebrow: "Second keeper season",
    title: "Current ADP price",
    body: "Use that season's FantasyPros Superflex ADP, even when it produces a later round than the player's previous keeper cost.",
  },
  {
    eyebrow: "After two keeper seasons",
    title: "Back to the draft pool",
    body: "The player is no longer keeper-eligible and must be available in the following draft.",
  },
];

const messageSnapshots = [
  {
    date: "August 17, 2023",
    speaker: "Your reigning (lucky) champion",
    topic: "Keeper pricing",
    quote:
      "Year 1 of keeping a player is based on round that you drafted in previous year. Year 2 is adjusted to ADP of current year.",
    conclusion:
      "Year 1 uses the original draft round; Year 2 uses current-season ADP.",
  },
  {
    date: "August 23, 2026",
    speaker: "Prince Pancake",
    topic: "Official ADP source",
    quote:
      "If you kept a player two years in a row, then the draft position would be ADP per Fantasy Pros Superflex.",
    conclusion:
      "FantasyPros Superflex is the confirmed ADP format for second-year keepers.",
  },
  {
    date: "August 17, 2023",
    speaker: "Prince Pancake",
    topic: "Drops and trades",
    quote:
      "If a player is drafted, he retains his value regardless of trade or drop.",
    conclusion:
      "A drafted player keeps the original draft-round value after a drop or trade. Only a truly undrafted pickup gets the Round 7 waiver value.",
  },
  {
    date: "August 19, 2026",
    speaker: "Prince Pancake",
    topic: "Keeper positions",
    quote: "You can keep any type of player.",
    conclusion:
      "The two keepers may be any position mix, including two quarterbacks.",
  },
  {
    date: "November 27, 2024",
    speaker: "Prince Pancake",
    topic: "Trade deadline",
    quote: "Yes agreed.",
    context:
      "In reply to: “Let's definitely agree no trading during playoffs though?”",
    conclusion:
      "Trades stop once the playoffs begin. The exact regular-season cutoff still needs to be set.",
  },
];

function MessageSnapshot({
  date,
  speaker,
  topic,
  quote,
  context,
  conclusion,
}: (typeof messageSnapshots)[number]) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {topic}
        </span>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      {context && (
        <p className="mt-4 text-xs italic leading-5 text-muted-foreground">
          {context}
        </p>
      )}
      <blockquote className="mt-3 border-l-2 border-primary/40 pl-4 text-sm leading-6">
        “{quote}”
      </blockquote>
      <p className="mt-2 text-xs font-medium text-muted-foreground">
        — {speaker} · Facebook league thread
      </p>
      <p className="mt-4 border-t pt-4 text-sm leading-6">
        <strong>Documented rule:</strong> {conclusion}
      </p>
    </article>
  );
}

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
          The written rules, updated with commissioner clarifications preserved
          in the league&apos;s Facebook message history.
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
              <p className="text-sm text-muted-foreground">
                Last confirmed annual buy-in
              </p>
              <h2 className="text-3xl font-bold">$100</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            A 2026 increase was put to a poll, but the exported thread contains
            no final commissioner ruling. If payment is a concern, message
            Scott, Ben, or Chris privately; arrangements can be made.
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
          Each team may keep zero, one, or two players in any position
          combination. A player may be retained for no more than two consecutive
          keeper seasons.
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
              <strong className="block text-base">Round 7 is the cap</strong>
              Any original draft value later than Round 7 is priced at Round 7.
              A truly undrafted waiver or free-agent pickup also costs Round 7.
            </li>
            <li>
              <strong className="block text-base">
                Drafted, dropped, or traded
              </strong>
              Once drafted, a player retains that draft-round value for their
              first keeper season even if they are dropped, claimed by another
              team, or traded.
            </li>
            <li>
              <strong className="block text-base">Same-round conflict</strong>
              If two keepers map to the same round, one uses that round and the
              other moves one round earlier. For example, two Round 7 values
              cost sixth- and seventh-round picks.
            </li>
            <li>
              <strong className="block text-base">Second-year keeper</strong>
              Use current FantasyPros Superflex ADP, even if that produces a
              cheaper round than the prior keeper price.
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
                A trade or drop does not restart keeper tenure or restore an
                earlier value.
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
                Each side exchanges the same number of picks; the rounds may
                differ. A manager trading future picks must participate the
                following season.
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
                If a player&apos;s keeper cost maps to a round the team already
                traded away in that deal, the keeper moves one round earlier.
              </p>
            </div>
            <div className="flex gap-3">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p>
                <strong className="block text-base">
                  No playoff-period trades
                </strong>
                The commissioners agreed that trading stops when the playoffs
                begin. The regular-season cutoff remains open.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-14" aria-labelledby="evidence-heading">
        <div className="flex items-center gap-3">
          <MessageSquareQuote className="size-6" aria-hidden="true" />
          <h2 id="evidence-heading" className="text-3xl font-bold">
            Message-backed clarifications
          </h2>
        </div>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          These snapshots preserve the relevant commissioner language from the
          Facebook export. They document how the written rules have been
          interpreted without publishing unrelated private conversation.
        </p>
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {messageSnapshots.map((snapshot) => (
            <MessageSnapshot
              key={`${snapshot.date}-${snapshot.topic}`}
              {...snapshot}
            />
          ))}
        </div>
      </section>

      <aside className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <h2 className="font-semibold">Open commissioner decisions</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
          <li>Record the final 2026 buy-in after the poll closes.</li>
          <li>
            Set the exact regular-season trade deadline, including draft-pick
            trades.
          </li>
          <li>
            Decide whether a team-manager change affects the player&apos;s
            keeper clock; Josh Allen is recorded in 2023, 2024, and 2025.
          </li>
          <li>
            Codify whether postseason add/drop activity is allowed for keeper
            purposes; a December 2025 transaction was reset, but no standing
            rule was recorded.
          </li>
          <li>
            Record the FantasyPros snapshot date, ADP-to-round mapping, and
            Round 1 collision procedure.
          </li>
        </ul>
      </aside>
    </main>
  );
}
