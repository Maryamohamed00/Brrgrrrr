export default function StatCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card border border-line rounded-2xl p-5">
      <p className="text-muted text-xs font-medium uppercase tracking-wide">{label}</p>
      <p
        className={`font-display text-3xl mt-2 ${
          accent ? "text-fire-dark" : "text-ink"
        }`}
      >
        {value}
      </p>
      {sublabel && <p className="text-muted text-xs mt-1">{sublabel}</p>}
    </div>
  );
}
