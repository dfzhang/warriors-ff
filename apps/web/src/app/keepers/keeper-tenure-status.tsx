const tenureStyles = {
  1: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
  2: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
};

export function KeeperTenureStatus({
  season,
  streak,
  compact = false,
}: {
  season: number;
  streak: number;
  compact?: boolean;
}) {
  const style = tenureStyles[streak >= 2 ? 2 : 1];
  const detail =
    streak === 1
      ? `Eligible in ${season + 1} at ADP`
      : `Returns to draft pool in ${season + 1}`;

  return (
    <div
      className={
        compact
          ? "flex justify-end"
          : "flex flex-col items-start gap-1.5 sm:items-end"
      }
    >
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
      >
        Year {streak}
      </span>
      {!compact && (
        <span className="text-xs text-muted-foreground">{detail}</span>
      )}
    </div>
  );
}
