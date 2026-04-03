interface TablePickerProps {
  selectedTable: string;
  onSelect: (tableId: string) => void;
  occupiedTables?: string[];
}

interface FloorSection {
  name: string;
  prefix: string;
  count: number;
}

const FLOORS: FloorSection[] = [
  { name: "Dinki Ground", prefix: "DG", count: 6 },
  { name: "Dinki Mezzanine", prefix: "DM", count: 6 },
  { name: "Sasural Ground", prefix: "SG", count: 6 },
  { name: "Sasural Mezzanine", prefix: "SM", count: 6 },
  { name: "First Floor", prefix: "FF", count: 15 },
  { name: "First Floor Delux", prefix: "FFD", count: 12 },
];

export function TablePicker({
  selectedTable,
  onSelect,
  occupiedTables = [],
}: TablePickerProps) {
  const occupiedSet = new Set(occupiedTables);

  return (
    <div className="space-y-4">
      {FLOORS.map((floor) => {
        const tables = Array.from(
          { length: floor.count },
          (_, i) => `${floor.prefix}-${i + 1}`,
        );
        return (
          <div key={floor.prefix}>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-xs font-semibold text-din-teal uppercase tracking-wider">
                {floor.name}
              </h4>
              <span className="text-[10px] text-din-muted">
                ({floor.prefix}-1 – {floor.prefix}-{floor.count})
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {tables.map((tableId) => {
                const isSelected = selectedTable === tableId;
                const isOccupied = occupiedSet.has(tableId);
                return (
                  <button
                    key={tableId}
                    type="button"
                    data-ocid="new_order.toggle"
                    onClick={() => onSelect(tableId)}
                    className={[
                      "h-9 rounded text-[11px] font-semibold transition-all border",
                      isSelected
                        ? "bg-din-teal text-din-bg border-din-teal shadow-[0_0_0_2px_var(--color-din-teal)]"
                        : isOccupied
                          ? "bg-din-orange/15 text-din-orange border-din-orange/40 hover:bg-din-orange/25"
                          : "bg-din-surface-alt text-din-text border-din-border hover:border-din-teal/50 hover:text-din-teal",
                    ].join(" ")}
                  >
                    {tableId}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1 border-t border-din-border">
        <span className="flex items-center gap-1.5 text-[10px] text-din-muted">
          <span className="w-3 h-3 rounded bg-din-surface-alt border border-din-border inline-block" />
          Free
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-din-muted">
          <span className="w-3 h-3 rounded bg-din-orange/15 border border-din-orange/40 inline-block" />
          Occupied
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-din-muted">
          <span className="w-3 h-3 rounded bg-din-teal inline-block" />
          Selected
        </span>
      </div>
    </div>
  );
}
