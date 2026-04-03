import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car,
  CheckCircle2,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OrderInput, OrderItem } from "../backend";
import { OrderStatus } from "../backend";
import { useActor } from "../hooks/useActor";
import type { MenuActor, MenuItem } from "../types/menu";
import { TablePicker } from "./TablePicker";

type Screen = "car" | "menu" | "confirm";

const SCHEDULES: Record<
  string,
  { label: string; check: (h: number, m: number) => boolean }
> = {
  "Hot n Hot": {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  Dosa: {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  Breakfast: { label: "07:00 – 12:00", check: (h) => h >= 7 && h < 12 },
  Chaat: {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  "Ice cream novelties": {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  "Ice cream cups n packs": {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  "Juice n Shakes": {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  Soup: {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  Starter: {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  "Roti (Bread)": {
    label: "11:30–15:30 & 19:00–22:30",
    check: (h, m) => {
      const t = h * 60 + m;
      return (
        (t >= 11 * 60 + 30 && t <= 15 * 60 + 30) ||
        (t >= 19 * 60 && t <= 22 * 60 + 30)
      );
    },
  },
  "Main course": {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  "Rice n Noodles": {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  Softdrinks: {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
  "Grill n spice": {
    label: "09:00 – 23:00",
    check: (h, m) => h * 60 + m >= 9 * 60 && h * 60 + m <= 23 * 60,
  },
};

interface CustomerOrderProps {
  mode?: "customer" | "drivein";
}

export function CustomerOrder({ mode = "customer" }: CustomerOrderProps) {
  const { actor, isFetching } = useActor();
  const [screen, setScreen] = useState<Screen>("car");
  const [carNumber, setCarNumber] = useState("");
  const [carError, setCarError] = useState("");
  // Drive-In mode car details
  const [carPlate, setCarPlate] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carColor, setCarColor] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [now, setNow] = useState(new Date());

  // Clock tick every minute for scheduling
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Load menu when entering menu screen
  useEffect(() => {
    if (screen !== "menu" || !actor) return;
    setMenuLoading(true);
    (actor as unknown as MenuActor)
      .getMenuItems()
      .then((items) => setMenuItems(items))
      .catch(() => {})
      .finally(() => setMenuLoading(false));
  }, [screen, actor]);

  // Filtered + grouped menu
  const groupedMenu = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    const available = menuItems.filter(
      (item) =>
        item.available &&
        (SCHEDULES[item.category]
          ? SCHEDULES[item.category].check(h, m)
          : true),
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

  const handleStart = () => {
    if (mode === "drivein") {
      if (!carPlate.trim()) {
        setCarError("Please enter your car number.");
        return;
      }
    } else {
      if (!carNumber.trim()) {
        setCarError("Please select your table.");
        return;
      }
    }
    setCarError("");
    setScreen("menu");
  };

  const handlePlaceOrder = async () => {
    if (!actor || cartItems.length === 0) return;
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
                licensePlate: carNumber,
                make: "N/A",
                model: "N/A",
                color: "N/A",
              },
        customerMobile: "",
        items: orderItems,
        timestamp: BigInt(Date.now() * 1_000_000),
        status: OrderStatus.pending,
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

  // ── Car Number / Drive-In Screen ────────────────────────────────────────────
  if (screen === "car") {
    if (mode === "drivein") {
      return (
        <div className="cust-page min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-cust-bg">
          {/* Logo area */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cust-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Car className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-cust-text tracking-tight">
              Dinki Pos
            </h1>
            <p className="text-sm text-cust-muted mt-1">Drive-In Self Order</p>
          </div>

          {/* Car Details Card */}
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              Enter Car Details
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Fill in your car details to view the menu and order
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="car-plate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Car Number / License Plate{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="car-plate"
                  type="text"
                  value={carPlate}
                  onChange={(e) => {
                    setCarPlate(e.target.value);
                    setCarError("");
                  }}
                  placeholder="e.g. MH 12 AB 1234"
                  className="w-full h-11 px-4 rounded-xl border-2 border-gray-200 focus:border-cust-primary focus:outline-none text-gray-800 text-sm transition-colors"
                  autoCapitalize="characters"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="car-make"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Car Make
                  </label>
                  <input
                    id="car-make"
                    type="text"
                    value={carMake}
                    onChange={(e) => setCarMake(e.target.value)}
                    placeholder="e.g. Maruti"
                    className="w-full h-11 px-4 rounded-xl border-2 border-gray-200 focus:border-cust-primary focus:outline-none text-gray-800 text-sm transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="car-color"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Car Color
                  </label>
                  <input
                    id="car-color"
                    type="text"
                    value={carColor}
                    onChange={(e) => setCarColor(e.target.value)}
                    placeholder="e.g. Red"
                    className="w-full h-11 px-4 rounded-xl border-2 border-gray-200 focus:border-cust-primary focus:outline-none text-gray-800 text-sm transition-colors"
                  />
                </div>
              </div>

              {carError && <p className="text-sm text-red-500">{carError}</p>}

              <button
                type="button"
                onClick={handleStart}
                className="w-full h-12 rounded-xl bg-cust-primary hover:bg-cust-primary-dark text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <Car className="w-5 h-5" />
                View Menu
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Customer Mode (table-based) screen ──
    return (
      <div className="cust-page min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-cust-bg">
        {/* Logo area */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cust-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-cust-text tracking-tight">
            Dinki Dine
          </h1>
          <p className="text-sm text-cust-muted mt-1">Dine-In &amp; Takeaway</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 overflow-y-auto max-h-[70vh]">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Select your table
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Tap your table number to start ordering.
          </p>

          <div className="mb-4">
            <TablePicker
              selectedTable={carNumber}
              onSelect={(t) => {
                setCarNumber(t);
                setCarError("");
              }}
              occupiedTables={[]}
            />
          </div>

          {carError && (
            <p
              data-ocid="customer.error_state"
              className="text-sm text-red-500 mt-2 text-center"
            >
              {carError}
            </p>
          )}

          <Button
            data-ocid="customer.primary_button"
            onClick={handleStart}
            disabled={isFetching || !carNumber}
            className="mt-4 w-full h-12 text-base font-semibold bg-cust-primary hover:bg-cust-primary-dark text-white rounded-xl disabled:opacity-50"
          >
            Start Ordering
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
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
      </div>
    );
  }

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
            We’ll prepare it shortly.
          </p>
          <p className="text-cust-muted text-sm">
            Table:{" "}
            <span className="font-semibold text-cust-text">{carNumber}</span>
          </p>

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
              setCarNumber("");
              setCarPlate("");
              setCarMake("");
              setCarColor("");
              setScreen("car");
            }}
            className="mt-6 w-full h-12 text-base font-semibold bg-cust-primary hover:bg-cust-primary-dark text-white rounded-xl"
          >
            Place Another Order
          </Button>
        </div>
      </div>
    );
  }

  // ── Menu Screen ────────────────────────────────────────────────────────────
  const categoryNames = Object.keys(groupedMenu);

  return (
    <div className="cust-page min-h-screen bg-cust-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cust-primary flex items-center justify-center flex-shrink-0">
            <Utensils className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-none">
              Dinki Dine
            </p>
            <p className="text-xs text-gray-500 truncate">
              {mode === "drivein" ? "Car:" : "Table:"}{" "}
              <span className="font-semibold text-gray-700">
                {mode === "drivein" ? carPlate : carNumber}
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* Menu content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-32">
        {menuLoading ? (
          <div data-ocid="customer.loading_state" className="space-y-4 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : categoryNames.length === 0 ? (
          <div
            data-ocid="customer.empty_state"
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <Utensils className="w-7 h-7 text-orange-300" />
            </div>
            <h3 className="font-semibold text-gray-700 text-lg">
              Kitchen is Closed
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xs">
              No items are available right now. Check back during service hours.
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
                  {SCHEDULES[category] && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-orange-50 text-orange-600 border-orange-200"
                    >
                      {SCHEDULES[category].label}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {groupedMenu[category].map((item, idx) => (
                    <div
                      key={item.id.toString()}
                      data-ocid={`menu.item.${idx + 1}`}
                      className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm"
                    >
                      <div className="min-w-0 flex-1 mr-4">
                        <p className="font-medium text-gray-800 text-sm leading-tight">
                          {item.name}
                        </p>
                        <p className="text-cust-primary font-semibold text-sm mt-0.5">
                          ₹{Number(item.price).toFixed(2)}
                        </p>
                      </div>

                      {/* Qty control */}
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
      </main>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5">
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              data-ocid="cart.primary_button"
              onClick={handlePlaceOrder}
              disabled={placing || !actor || cartItems.length === 0}
              className="w-full bg-cust-primary hover:bg-cust-primary-dark text-white rounded-2xl h-14 flex items-center px-5 shadow-2xl transition-colors disabled:opacity-70"
            >
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold min-w-[28px] text-center">
                {cartCount}
              </span>
              <span className="flex-1 text-center font-semibold text-base">
                {placing ? "Placing Order…" : "Place Order"}
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
