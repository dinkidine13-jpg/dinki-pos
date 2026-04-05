import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, Clock, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useActor } from "../hooks/useActor";
import type { MenuActor, MenuItem } from "../types/menu";

// ── Schedule definitions (read from localStorage if set by MenuAdmin) ──────────
const DEFAULT_DRIVEIN_SLOTS: Record<
  string,
  { start: [number, number]; end: [number, number] }[]
> = {
  "Hot n Hot": [{ start: [9, 0], end: [23, 0] }],
  Dosa: [{ start: [9, 0], end: [23, 0] }],
  Breakfast: [{ start: [7, 0], end: [12, 0] }],
  Chaat: [{ start: [9, 0], end: [23, 0] }],
  "Ice cream novelties": [{ start: [9, 0], end: [23, 0] }],
  "Ice cream cups n packs": [{ start: [9, 0], end: [23, 0] }],
  "Juice n Shakes": [{ start: [9, 0], end: [23, 0] }],
  Soup: [{ start: [9, 0], end: [23, 0] }],
  Starter: [{ start: [9, 0], end: [23, 0] }],
  "Roti (Bread)": [
    { start: [11, 30], end: [15, 30] },
    { start: [19, 0], end: [22, 30] },
  ],
  "Main course": [{ start: [9, 0], end: [23, 0] }],
  "Rice n Noodles": [{ start: [9, 0], end: [23, 0] }],
  Softdrinks: [{ start: [9, 0], end: [23, 0] }],
  "Grill n spice": [{ start: [9, 0], end: [23, 0] }],
};

function getDriveInCategorySlots(): Record<
  string,
  { start: [number, number]; end: [number, number] }[]
> {
  try {
    const data = localStorage.getItem("dinki_category_timing");
    if (data) return { ...DEFAULT_DRIVEIN_SLOTS, ...JSON.parse(data) };
  } catch {}
  return DEFAULT_DRIVEIN_SLOTS;
}

function isDriveInCategoryAvailable(
  category: string,
  h: number,
  m: number,
): boolean {
  const slots = getDriveInCategorySlots();
  const catSlots = slots[category];
  if (!catSlots || catSlots.length === 0) return true;
  const t = h * 60 + m;
  return catSlots.some(
    (s) => t >= s.start[0] * 60 + s.start[1] && t < s.end[0] * 60 + s.end[1],
  );
}

function getDriveInCategoryLabel(category: string): string {
  const slots = getDriveInCategorySlots();
  const catSlots = slots[category];
  if (!catSlots || catSlots.length === 0) return "All day";
  return catSlots
    .map((s) => {
      const sh = String(s.start[0]).padStart(2, "0");
      const sm = String(s.start[1]).padStart(2, "0");
      const eh = String(s.end[0]).padStart(2, "0");
      const em = String(s.end[1]).padStart(2, "0");
      return `${sh}:${sm}–${eh}:${em}`;
    })
    .join(" & ");
}

const CATEGORY_ACCENT: Record<string, string> = {
  "Hot n Hot": "bg-red-50 text-red-700 border-red-200",
  Dosa: "bg-orange-50 text-orange-700 border-orange-200",
  Breakfast: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Chaat: "bg-amber-50 text-amber-700 border-amber-200",
  "Ice cream novelties": "bg-pink-50 text-pink-700 border-pink-200",
  "Ice cream cups n packs": "bg-rose-50 text-rose-700 border-rose-200",
  "Juice n Shakes": "bg-lime-50 text-lime-700 border-lime-200",
  Soup: "bg-teal-50 text-teal-700 border-teal-200",
  Starter: "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Roti (Bread)": "bg-amber-50 text-amber-800 border-amber-200",
  "Main course": "bg-green-50 text-green-700 border-green-200",
  "Rice n Noodles": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Softdrinks: "bg-blue-50 text-blue-700 border-blue-200",
  "Grill n spice": "bg-purple-50 text-purple-700 border-purple-200",
};

export function DriveInMenuDisplay() {
  const { actor } = useActor();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Clock tick every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Load menu from backend
  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    (actor as unknown as MenuActor)
      .getMenuItems()
      .then((items) => setMenuItems(items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actor]);

  const groupedMenu = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    const available = menuItems.filter(
      (item) =>
        item.available && isDriveInCategoryAvailable(item.category, h, m),
    );
    const groups: Record<string, MenuItem[]> = {};
    for (const item of available) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [menuItems, now]);

  const categoryNames = Object.keys(groupedMenu);
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="cust-page min-h-screen bg-white flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Car className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-none">
              Dinki Pos
            </p>
            <p className="text-xs text-gray-500">Drive-In Menu</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{timeStr}</span>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white px-4 py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
          <Car className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Drive-In Menu</h1>
        <p className="text-sm text-white/85">Today's available items</p>
      </div>

      {/* Menu Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {loading ? (
          <div data-ocid="menu_display.loading_state" className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : categoryNames.length === 0 ? (
          <div
            data-ocid="menu_display.empty_state"
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <Utensils className="w-7 h-7 text-amber-300" />
            </div>
            <h3 className="font-semibold text-gray-700 text-lg">
              Kitchen is Closed
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xs">
              No items are available right now. Please check back during service
              hours.
            </p>
            <div className="mt-4 text-xs text-gray-400">
              Regular hours: 9:00 AM – 11:00 PM
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {categoryNames.map((category) => (
              <section key={category} data-ocid="menu_display.section">
                {/* Category Header */}
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border mb-3 text-sm font-semibold ${
                    CATEGORY_ACCENT[category] ??
                    "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >
                  <span>{category}</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-white/60 border-current/20 text-inherit"
                  >
                    {getDriveInCategoryLabel(category)}
                  </Badge>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {groupedMenu[category].map((item, idx) => (
                    <div
                      key={item.id.toString()}
                      data-ocid={`menu_display.item.${idx + 1}`}
                      className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm"
                    >
                      <p className="font-medium text-gray-800 text-sm leading-tight">
                        {item.name}
                      </p>
                      <p className="text-amber-600 font-bold text-sm mt-1">
                        ₹{Number(item.price)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center">
            <Car className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Dinki Pos</span>
        </div>
        <p className="text-xs text-gray-400">
          Powered by{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
