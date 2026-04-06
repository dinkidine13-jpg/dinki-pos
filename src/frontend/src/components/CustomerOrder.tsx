import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingCart,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OrderInput, OrderItem } from "../backend";
import { OrderStatus } from "../backend";
import { useActor } from "../hooks/useActor";
import type { MenuActor, MenuItem } from "../types/menu";
import { TablePicker } from "./TablePicker";

type Screen = "ordering" | "confirm";

const DEFAULT_SLOTS: Record<
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

function getCategorySlots(): Record<
  string,
  { start: [number, number]; end: [number, number] }[]
> {
  try {
    const data = localStorage.getItem("dinki_category_timing");
    if (data) return { ...DEFAULT_SLOTS, ...JSON.parse(data) };
  } catch {}
  return DEFAULT_SLOTS;
}

function isCategoryAvailable(category: string, h: number, m: number): boolean {
  const slots = getCategorySlots();
  const catSlots = slots[category];
  if (!catSlots || catSlots.length === 0) return true;
  const t = h * 60 + m;
  return catSlots.some(
    (s) => t >= s.start[0] * 60 + s.start[1] && t < s.end[0] * 60 + s.end[1],
  );
}

function getCategoryLabel(category: string): string {
  const slots = getCategorySlots();
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

interface CustomerOrderProps {
  mode?: "customer" | "drivein";
}

export function CustomerOrder({ mode = "customer" }: CustomerOrderProps) {
  const { actor, isFetching } = useActor();
  const [screen, setScreen] = useState<Screen>("ordering");

  // Dine-in table
  const [tableNumber, setTableNumber] = useState("");

  // Drive-In car details
  const [carPlate, setCarPlate] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carColor, setCarColor] = useState("");

  const [formError, setFormError] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [now, setNow] = useState(new Date());

  const formRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Clock tick every minute for scheduling
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Load menu on mount (as soon as actor is ready)
  useEffect(() => {
    if (!actor) return;
    setMenuLoading(true);
    (actor as unknown as MenuActor)
      .getMenuItems()
      .then((items) => setMenuItems(items))
      .catch(() => {})
      .finally(() => setMenuLoading(false));
  }, [actor]);

  // Filtered + grouped menu
  const groupedMenu = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    const available = menuItems.filter(
      (item) => item.available && isCategoryAvailable(item.category, h, m),
    );
    const groups: Record<string, MenuItem[]> = {};
    for (const item of available) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [menuItems, now]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([idStr, qty]) => {
          const item = menuItems.find((i) => i.id.toString() === idStr);
          return item ? { item, qty } : null;
        })
        .filter(Boolean) as { item: MenuItem; qty: number }[],
    [cart, menuItems],
  );

  const cartTotal = cartItems.reduce(
    (s, { item, qty }) => s + Number(item.price) * qty,
    0,
  );
  const cartCount = cartItems.reduce((s, { qty }) => s + qty, 0);

  const setQty = (id: string, delta: number) => {
    setCart((prev) => {
      const cur = prev[id] ?? 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const validateForm = (): boolean => {
    if (mode === "drivein") {
      if (!carPlate.trim()) {
        setFormError("Please enter your car number to place an order.");
        return false;
      }
    } else {
      if (!tableNumber.trim()) {
        setFormError("Please select your table number to place an order.");
        return false;
      }
    }
    setFormError("");
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!actor || cartItems.length === 0) return;

    // Validate form first, scroll to top if error
    if (!validateForm()) {
      pageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setPlacing(true);
    setOrderError("");
    try {
      const orderItems: OrderItem[] = cartItems.map(({ item, qty }) => ({
        name: item.name,
        quantity: BigInt(qty),
        price: item.price,
      }));
      const order: OrderInput = {
        id: 0n,
        vehicleInfo:
          mode === "drivein"
            ? {
                licensePlate: carPlate.trim(),
                make: carMake.trim() || "N/A",
                model: "DRIVE-IN",
                color: carColor.trim() || "N/A",
              }
            : {
                licensePlate: tableNumber,
                make: "N/A",
                model: "N/A",
                color: "N/A",
              },
        customerMobile: "",
        items: orderItems,
        timestamp: BigInt(Date.now() * 1_000_000),
        status: OrderStatus.pending,
        discount: 0n,
        discountType: "flat",
      };
      await actor.placeOrder(order);
      setScreen("confirm");
    } catch (e) {
      console.error("Customer order failed:", e);
      setOrderError(
        `Failed to place order: ${e instanceof Error ? e.message : "Please try again."}`,
      );
    } finally {
      setPlacing(false);
    }
  };

  // ── Confirmation Screen ────────────────────────────────────────────────────
  if (screen === "confirm") {
    return (
      <div className="cust-page min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-cust-bg">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-cust-text mb-2">
            Order Placed!
          </h2>
          <p className="text-cust-muted text-sm mb-1">
            We'll prepare it shortly.
          </p>
          {mode === "drivein" ? (
            <p className="text-cust-muted text-sm">
              Car:{" "}
              <span className="font-semibold text-cust-text">{carPlate}</span>
            </p>
          ) : (
            <p className="text-cust-muted text-sm">
              Table:{" "}
              <span className="font-semibold text-cust-text">
                {tableNumber}
              </span>
            </p>
          )}

          <div className="mt-8 bg-white rounded-2xl shadow p-4 text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Your order
            </p>
            {cartItems.map(({ item, qty }) => (
              <div
                key={item.id.toString()}
                className="flex justify-between text-sm text-gray-700 py-1"
              >
                <span>
                  {item.name} × {qty}
                </span>
                <span className="font-medium">
                  ₹{(Number(item.price) * qty).toFixed(2)}
                </span>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="flex justify-between font-bold text-gray-800">
              <span>Total</span>
              <span>₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <Button
            data-ocid="customer.secondary_button"
            onClick={() => {
              setCart({});
              setTableNumber("");
              setCarPlate("");
              setCarMake("");
              setCarColor("");
              setFormError("");
              setScreen("ordering");
            }}
            className="mt-6 w-full h-12 text-base font-semibold bg-cust-primary hover:bg-cust-primary-dark text-white rounded-xl"
          >
            Place Another Order
          </Button>
        </div>
      </div>
    );
  }

  // ── Single-page ordering layout ────────────────────────────────────────────
  const categoryNames = Object.keys(groupedMenu);

  return (
    <div
      ref={pageRef}
      className="cust-page min-h-screen bg-cust-bg flex flex-col"
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cust-primary flex items-center justify-center flex-shrink-0">
            {mode === "drivein" ? (
              <Car className="w-4 h-4 text-white" />
            ) : (
              <Utensils className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-none">
              Dinki Pos
            </p>
            <p className="text-xs text-gray-500 truncate">
              {mode === "drivein"
                ? "Drive-In Self Order"
                : "Dine-In & Takeaway"}
            </p>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-36">
        {/* ── Compact Form Card (always visible at top) ── */}
        <div
          ref={formRef}
          data-ocid="customer.panel"
          className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-5"
        >
          {mode === "drivein" ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Car className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 leading-none">
                    Drive-In Order
                  </p>
                  <p className="text-xs text-gray-500">
                    Enter your car details below
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="car-plate"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Car Number / License Plate{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="car-plate"
                    data-ocid="customer.input"
                    type="text"
                    value={carPlate}
                    onChange={(e) => {
                      setCarPlate(e.target.value);
                      setFormError("");
                    }}
                    placeholder="e.g. MH 12 AB 1234"
                    className={`w-full h-10 px-3 rounded-xl border-2 focus:outline-none text-gray-800 text-sm transition-colors ${
                      formError && !carPlate.trim()
                        ? "border-red-400 bg-red-50 focus:border-red-500"
                        : "border-gray-200 focus:border-cust-primary"
                    }`}
                    autoCapitalize="characters"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="car-make"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Car Make
                    </label>
                    <input
                      id="car-make"
                      type="text"
                      value={carMake}
                      onChange={(e) => setCarMake(e.target.value)}
                      placeholder="e.g. Maruti"
                      className="w-full h-10 px-3 rounded-xl border-2 border-gray-200 focus:border-cust-primary focus:outline-none text-gray-800 text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="car-color"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Car Color
                    </label>
                    <input
                      id="car-color"
                      type="text"
                      value={carColor}
                      onChange={(e) => setCarColor(e.target.value)}
                      placeholder="e.g. Red"
                      className="w-full h-10 px-3 rounded-xl border-2 border-gray-200 focus:border-cust-primary focus:outline-none text-gray-800 text-sm transition-colors"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Utensils className="w-4 h-4 text-cust-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 leading-none">
                    Select Your Table
                  </p>
                  <p className="text-xs text-gray-500">
                    Tap your table number to start ordering
                  </p>
                </div>
              </div>
              <div className="overflow-y-auto max-h-64">
                <TablePicker
                  selectedTable={tableNumber}
                  onSelect={(t) => {
                    setTableNumber(t);
                    setFormError("");
                  }}
                  occupiedTables={[]}
                />
              </div>
            </>
          )}

          {formError && (
            <p
              data-ocid="customer.error_state"
              className="text-xs text-red-500 mt-2 flex items-center gap-1"
            >
              <span className="inline-block w-4 h-4 rounded-full bg-red-100 text-red-500 text-center leading-4 font-bold text-[10px] flex-shrink-0">
                !
              </span>
              {formError}
            </p>
          )}
        </div>

        {/* ── Menu Section ── */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-3">
            <Utensils className="w-4 h-4 text-cust-primary" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Our Menu
            </h2>
          </div>

          {menuLoading || isFetching ? (
            <div data-ocid="customer.loading_state" className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : categoryNames.length === 0 ? (
            <div
              data-ocid="customer.empty_state"
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                <Utensils className="w-7 h-7 text-orange-300" />
              </div>
              <h3 className="font-semibold text-gray-700 text-lg">
                Kitchen is Closed
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                No items are available right now. Check back during service
                hours.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {categoryNames.map((category) => (
                <section key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-base font-bold text-gray-800">
                      {category}
                    </h2>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-orange-50 text-orange-600 border-orange-200"
                    >
                      {getCategoryLabel(category)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {groupedMenu[category].map((item, idx) => (
                      <div
                        key={item.id.toString()}
                        data-ocid={`menu.item.${idx + 1}`}
                        className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm"
                      >
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="font-medium text-gray-800 text-sm">
                            {item.name}
                          </p>
                          <p className="text-cust-primary font-semibold text-sm mt-0.5">
                            ₹{Number(item.price).toFixed(2)}
                          </p>
                        </div>
                        {(cart[item.id.toString()] ?? 0) === 0 ? (
                          <button
                            type="button"
                            data-ocid={`menu.toggle.${idx + 1}`}
                            onClick={() => setQty(item.id.toString(), 1)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-cust-primary text-cust-primary text-sm font-semibold hover:bg-orange-50 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            ADD
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              data-ocid={`menu.secondary_button.${idx + 1}`}
                              onClick={() => setQty(item.id.toString(), -1)}
                              className="w-7 h-7 rounded-lg bg-orange-100 text-cust-primary flex items-center justify-center hover:bg-orange-200 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-5 text-center font-bold text-gray-800 text-sm">
                              {cart[item.id.toString()]}
                            </span>
                            <button
                              type="button"
                              data-ocid={`menu.primary_button.${idx + 1}`}
                              onClick={() => setQty(item.id.toString(), 1)}
                              className="w-7 h-7 rounded-lg bg-cust-primary text-white flex items-center justify-center hover:bg-cust-primary-dark transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <p className="mt-8 text-xs text-cust-muted text-center">
          © {new Date().getFullYear()} ·{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            caffeine.ai
          </a>
        </p>
      </main>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5">
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              data-ocid="cart.primary_button"
              onClick={handlePlaceOrder}
              disabled={placing || !actor}
              className="w-full bg-cust-primary hover:bg-cust-primary-dark text-white rounded-2xl h-14 flex items-center px-5 shadow-2xl transition-colors disabled:opacity-70"
            >
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold min-w-[28px] text-center">
                {cartCount}
              </span>
              <span className="flex-1 text-center font-semibold text-base">
                {placing
                  ? "Placing Order…"
                  : isFetching
                    ? "Connecting…"
                    : "Place Order"}
              </span>
              <span className="font-bold text-base">
                ₹{cartTotal.toFixed(2)}
              </span>
              <ShoppingCart className="w-5 h-5 ml-2" />
            </button>
            {orderError && (
              <p
                data-ocid="cart.error_state"
                className="text-xs text-red-500 text-center mt-2"
              >
                {orderError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
