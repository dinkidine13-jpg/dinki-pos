interface KpiCardProps {
  label: string;
  value: number | string;
  accent?: "teal" | "orange" | "green" | "red";
  icon?: React.ReactNode;
}

const accentClass: Record<string, string> = {
  teal: "bg-din-teal",
  orange: "bg-din-orange",
  green: "bg-din-green",
  red: "bg-din-red",
};

export function KpiCard({ label, value, accent = "teal", icon }: KpiCardProps) {
  return (
    <div className="bg-din-surface rounded-lg p-4 flex flex-col gap-2 border border-din-border shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-din-muted uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-din-muted">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-din-text">{value}</div>
      <div className={`h-1 rounded-full w-12 ${accentClass[accent]}`} />
    </div>
  );
}
