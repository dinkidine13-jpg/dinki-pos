import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car,
  CheckCircle2,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Truck,
  User,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OrderInput, OrderItem } from "../backend";
import { OrderStatus } from "../backend";
import { useActor } from "../hooks/useActor";
import type { MenuActor, MenuItem } from "../types/menu";

// ── Schedule definitions (read from localStorage if set by MenuAdmin) ──────────
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

type OrderTab = "drivein" | "takeaway" | "delivery";
type Screen = "ordering" | "confirm";

const TAB_CONFIG = {
  drivein: {
    label: "Drive-In",
    icon: Car,
    color: "amber",
    activeClass: "bg-amber-500 text-white",
    inactiveClass: "text-amber-700 bg-amber-50 hover:bg-amber-100",
    borderClass: "border-amber-300",
    accentClass: "text-amber-600",
    btnClass: "bg-amber-500 hover:bg-amber-600 text-white",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    inputFocusClass: "focus:border-amber-400",
  },
  takeaway: {
    label: "Takeaway",
    icon: ShoppingBag,
    color: "orange",
    activeClass: "bg-orange-500 text-white",
    inactiveClass: "text-orange-700 bg-orange-50 hover:bg-orange-100",
    borderClass: "border-orange-300",
    accentClass: "text-orange-600",
    btnClass: "bg-orange-500 hover:bg-orange-600 text-white",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    inputFocusClass: "focus:border-orange-400",
  },
  delivery: {
    label: "Delivery",
    icon: Truck,
    color: "indigo",
    activeClass: "bg-indigo-600 text-white",
    inactiveClass: "text-indigo-700 bg-indigo-50 hover:bg-indigo-100",
    borderClass: "border-indigo-300",
    accentClass: "text-indigo-600",
    btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white",
    badgeClass: "bg-indigo-100 text-indigo-700 border-indigo-200",
    inputFocusClass: "focus:border-indigo-400",
  },
} as const;

export function CustomerOrderUnified() {
  const { actor, isFetching } = useActor();
  const [tab, setTab] = useState<OrderTab>("drivein");
  const [screen, setScreen] = useState<Screen>("ordering");

  // Drive-In fields
  const [carPlate, setCarPlate] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carColor, setCarColor] = useState("");

  // Takeaway fields
  const [taName, setTaName] = useState("");
  const [taPhone, setTaPhone] = useState("");

  // Delivery fields
  const [delName, setDelName] = useState("");
  const [delPhone, setDelPhone] = useState("");
  const [delAddress, setDelAddress] = useState("");
  const [delNote, setDelNote] = useState("");

  const [formError, setFormError] = useState("");

  // Menu state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [now, setNow] = useState(new Date());

  const pageRef = useRef<HTMLDivElement>(null);

  // Clock tick every minute for schedule
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Reset form & cart when tab changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: setters are stable
  useEffect(() => {
    setFormError("");
    setCart({});
    setOrderError("");
  }, [tab]);

  // Load menu on mount (and reload if actor becomes available)
  useEffect(() => {
    if (!actor) return;
    setMenuLoading(true);
    (actor as unknown as MenuActor)
      .getMenuItems()
      .then((items) => setMenuItems(items))
      .catch(() => {})
      .finally(() => setMenuLoading(false));
  }, [actor]);

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
    setFormError("");
    if (tab === "drivein" && !carPlate.trim()) {
      setFormError("Please enter your car number to place an order.");
      return false;
    }
    if (tab === "takeaway" && !taName.trim() && !taPhone.trim()) {
      setFormError("Please enter your name or phone number.");
      return false;
    }
    if (tab === "delivery") {
      if (!delName.trim()) {
        setFormError("Please enter your name.");
        return false;
      }
      if (!delPhone.trim()) {
        setFormError("Please enter your phone number.");
        return false;
      }
      if (!delAddress.trim()) {
        setFormError("Please enter your delivery address.");
        return false;
      }
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!actor || cartItems.length === 0) return;

    // Validate form before placing order, scroll to top on error
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

      let vehicleInfo: OrderInput["vehicleInfo"];
      let customerMobile = "";

      if (tab === "drivein") {
        vehicleInfo = {
          licensePlate: carPlate.trim(),
          make: carMake.trim() || "N/A",
          model: "DRIVE-IN",
          color: carColor.trim() || "N/A",
        };
      } else if (tab === "takeaway") {
        customerMobile = taPhone.trim();
        vehicleInfo = {
          licensePlate: `TAKEAWAY-${taPhone.trim() || taName.trim()}`,
          make: taName.trim(),
          model: "TAKEAWAY",
          color: "",
        };
      } else {
        // delivery
        customerMobile = delPhone.trim();
        vehicleInfo = {
          licensePlate: `DELIVERY-${delPhone.trim()}`,
          make: delName.trim(),
          model: "DELIVERY",
          color: delAddress.trim(),
        };
        if (delNote.trim()) {
          orderItems.push({
            name: `Note: ${delNote.trim()}`,
            quantity: 1n,
            price: 0n,
          });
        }
      }

      const order: OrderInput = {
        id: 0n,
        vehicleInfo,
        customerMobile,
        items: orderItems,
        timestamp: BigInt(Date.now() * 1_000_000),
        status: OrderStatus.pending,
        discount: 0n,
        discountType: "flat",
      };

      await actor.placeOrder(order);
      setScreen("confirm");
    } catch (e) {
      console.error("Order failed:", e);
      setOrderError(
        `Failed to place order: ${e instanceof Error ? e.message : "Please try again."}`,
      );
    } finally {
      setPlacing(false);
    }
  };

  const cfg = TAB_CONFIG[tab];
  const categoryNames = Object.keys(groupedMenu);

  // ── Confirmation Screen ───────────────────────────────────────────────────
  if (screen === "confirm") {
    return (
      <div className="cust-page min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Order Placed!
          </h2>
          <p className="text-gray-500 text-sm mb-1">
            We'll prepare it shortly.
          </p>

          {tab === "delivery" && (
            <div className="mt-2 px-4 py-2 bg-indigo-50 rounded-xl text-sm text-indigo-700">
              <MapPin className="w-4 h-4 inline mr-1" />
              Delivery to: <span className="font-semibold">{delAddress}</span>
            </div>
          )}

          <div className="mt-6 bg-white rounded-2xl shadow p-4 text-left">
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
            <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between font-bold text-gray-800">
              <span>Total</span>
              <span>₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            data-ocid="unified_order.primary_button"
            onClick={() => {
              setCart({});
              setScreen("ordering");
              setCarPlate("");
              setCarMake("");
              setCarColor("");
              setTaName("");
              setTaPhone("");
              setDelName("");
              setDelPhone("");
              setDelAddress("");
              setDelNote("");
              setFormError("");
            }}
            className={`mt-6 w-full h-12 text-base font-semibold rounded-xl flex items-center justify-center gap-2 ${cfg.btnClass}`}
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  // ── Single-page ordering layout ───────────────────────────────────────────
  return (
    <div
      ref={pageRef}
      className="cust-page min-h-screen bg-gray-50 flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Utensils className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-none">
              Dinki Pos
            </p>
            <p className="text-xs text-gray-500">Order Online</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}
          className="max-w-lg mx-auto border-t border-gray-100"
        >
          {(["drivein", "takeaway", "delivery"] as OrderTab[]).map((t) => {
            const tabCfg = TAB_CONFIG[t];
            const Icon = tabCfg.icon;
            const isActive = tab === t;
            return (
              <button
                key={t}
                type="button"
                data-ocid="unified_order.tab"
                onClick={() => setTab(t)}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  isActive
                    ? `${tabCfg.accentClass} border-current`
                    : "text-gray-500 border-transparent hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tabCfg.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main scrollable content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-36">
        {/* ── Compact Form Card ── */}
        <div
          data-ocid="unified_order.panel"
          className={`bg-white rounded-2xl shadow-sm border p-4 mb-5 ${cfg.borderClass}`}
        >
          {/* Tab identity banner */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                tab === "drivein"
                  ? "bg-amber-100"
                  : tab === "takeaway"
                    ? "bg-orange-100"
                    : "bg-indigo-100"
              }`}
            >
              {tab === "drivein" && <Car className="w-5 h-5 text-amber-600" />}
              {tab === "takeaway" && (
                <ShoppingBag className="w-5 h-5 text-orange-600" />
              )}
              {tab === "delivery" && (
                <Truck className="w-5 h-5 text-indigo-600" />
              )}
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm leading-none">
                {tab === "drivein" && "Drive-In Order"}
                {tab === "takeaway" && "Takeaway Order"}
                {tab === "delivery" && "Online Delivery"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {tab === "drivein" && "Order from your car"}
                {tab === "takeaway" && "Pick up at the counter"}
                {tab === "delivery" && "Delivered to your door"}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            {tab === "drivein" && (
              <>
                <div>
                  <label
                    htmlFor="uni-plate"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Car Number / License Plate{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="uni-plate"
                    data-ocid="unified_order.input"
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
                        : `border-gray-200 ${cfg.inputFocusClass}`
                    }`}
                    autoCapitalize="characters"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="uni-make"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Car Make
                    </label>
                    <input
                      id="uni-make"
                      type="text"
                      value={carMake}
                      onChange={(e) => setCarMake(e.target.value)}
                      placeholder="e.g. Maruti"
                      className={`w-full h-10 px-3 rounded-xl border-2 border-gray-200 focus:outline-none text-gray-800 text-sm transition-colors ${cfg.inputFocusClass}`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="uni-color"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Car Color
                    </label>
                    <input
                      id="uni-color"
                      type="text"
                      value={carColor}
                      onChange={(e) => setCarColor(e.target.value)}
                      placeholder="e.g. Red"
                      className={`w-full h-10 px-3 rounded-xl border-2 border-gray-200 focus:outline-none text-gray-800 text-sm transition-colors ${cfg.inputFocusClass}`}
                    />
                  </div>
                </div>
              </>
            )}

            {tab === "takeaway" && (
              <>
                <div>
                  <label
                    htmlFor="uni-ta-name"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    <User className="w-3 h-3 inline mr-1" />
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="uni-ta-name"
                    data-ocid="unified_order.input"
                    type="text"
                    value={taName}
                    onChange={(e) => {
                      setTaName(e.target.value);
                      setFormError("");
                    }}
                    placeholder="Customer name"
                    className={`w-full h-10 px-3 rounded-xl border-2 focus:outline-none text-gray-800 text-sm transition-colors ${
                      formError && !taName.trim() && !taPhone.trim()
                        ? "border-red-400 bg-red-50 focus:border-red-500"
                        : `border-gray-200 ${cfg.inputFocusClass}`
                    }`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="uni-ta-phone"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    <Phone className="w-3 h-3 inline mr-1" />
                    Phone (optional)
                  </label>
                  <input
                    id="uni-ta-phone"
                    data-ocid="unified_order.input"
                    type="tel"
                    value={taPhone}
                    onChange={(e) => setTaPhone(e.target.value)}
                    placeholder="9876543210"
                    className={`w-full h-10 px-3 rounded-xl border-2 border-gray-200 focus:outline-none text-gray-800 text-sm transition-colors ${cfg.inputFocusClass}`}
                  />
                </div>
              </>
            )}

            {tab === "delivery" && (
              <>
                <div>
                  <label
                    htmlFor="uni-del-name"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    <User className="w-3 h-3 inline mr-1" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="uni-del-name"
                    data-ocid="unified_order.input"
                    type="text"
                    value={delName}
                    onChange={(e) => {
                      setDelName(e.target.value);
                      setFormError("");
                    }}
                    placeholder="Your full name"
                    className={`w-full h-10 px-3 rounded-xl border-2 focus:outline-none text-gray-800 text-sm transition-colors ${
                      formError && !delName.trim()
                        ? "border-red-400 bg-red-50 focus:border-red-500"
                        : `border-gray-200 ${cfg.inputFocusClass}`
                    }`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="uni-del-phone"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    <Phone className="w-3 h-3 inline mr-1" />
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="uni-del-phone"
                    data-ocid="unified_order.input"
                    type="tel"
                    value={delPhone}
                    onChange={(e) => {
                      setDelPhone(e.target.value);
                      setFormError("");
                    }}
                    placeholder="9876543210"
                    className={`w-full h-10 px-3 rounded-xl border-2 focus:outline-none text-gray-800 text-sm transition-colors ${
                      formError && !delPhone.trim()
                        ? "border-red-400 bg-red-50 focus:border-red-500"
                        : `border-gray-200 ${cfg.inputFocusClass}`
                    }`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="uni-del-addr"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="uni-del-addr"
                    data-ocid="unified_order.textarea"
                    value={delAddress}
                    onChange={(e) => {
                      setDelAddress(e.target.value);
                      setFormError("");
                    }}
                    placeholder="House/flat number, street, landmark..."
                    rows={2}
                    className={`w-full px-3 py-2 rounded-xl border-2 focus:outline-none text-gray-800 text-sm transition-colors resize-none ${
                      formError && !delAddress.trim()
                        ? "border-red-400 bg-red-50 focus:border-red-500"
                        : `border-gray-200 ${cfg.inputFocusClass}`
                    }`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="uni-del-note"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Special Instructions (optional)
                  </label>
                  <input
                    id="uni-del-note"
                    data-ocid="unified_order.input"
                    type="text"
                    value={delNote}
                    onChange={(e) => setDelNote(e.target.value)}
                    placeholder="Any specific instructions..."
                    className={`w-full h-10 px-3 rounded-xl border-2 border-gray-200 focus:outline-none text-gray-800 text-sm transition-colors ${cfg.inputFocusClass}`}
                  />
                </div>
              </>
            )}
          </div>

          {formError && (
            <p
              data-ocid="unified_order.error_state"
              className="text-xs text-red-500 mt-3 flex items-center gap-1"
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
            <Utensils className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Our Menu
            </h2>
          </div>

          {menuLoading || isFetching ? (
            <div data-ocid="unified_order.loading_state" className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : categoryNames.length === 0 ? (
            <div
              data-ocid="unified_order.empty_state"
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                <Utensils className="w-7 h-7 text-orange-300" />
              </div>
              <h3 className="font-semibold text-gray-700 text-lg">
                Kitchen is Closed
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                No items available right now. Check back during service hours.
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
                        data-ocid={`unified_order.item.${idx + 1}`}
                        className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm"
                      >
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="font-medium text-gray-800 text-sm">
                            {item.name}
                          </p>
                          <p
                            className={`font-semibold text-sm mt-0.5 ${cfg.accentClass}`}
                          >
                            ₹{Number(item.price).toFixed(2)}
                          </p>
                        </div>
                        {(cart[item.id.toString()] ?? 0) === 0 ? (
                          <button
                            type="button"
                            data-ocid={`unified_order.toggle.${idx + 1}`}
                            onClick={() => setQty(item.id.toString(), 1)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 text-sm font-semibold hover:opacity-80 transition-opacity ${
                              tab === "drivein"
                                ? "border-amber-400 text-amber-600"
                                : tab === "takeaway"
                                  ? "border-orange-400 text-orange-600"
                                  : "border-indigo-400 text-indigo-600"
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            ADD
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              data-ocid={`unified_order.secondary_button.${idx + 1}`}
                              onClick={() => setQty(item.id.toString(), -1)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                tab === "drivein"
                                  ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                                  : tab === "takeaway"
                                    ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                                    : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                              }`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-5 text-center font-bold text-gray-800 text-sm">
                              {cart[item.id.toString()]}
                            </span>
                            <button
                              type="button"
                              data-ocid={`unified_order.primary_button.${idx + 1}`}
                              onClick={() => setQty(item.id.toString(), 1)}
                              className={`w-7 h-7 rounded-lg text-white flex items-center justify-center transition-opacity hover:opacity-80 ${
                                tab === "drivein"
                                  ? "bg-amber-500"
                                  : tab === "takeaway"
                                    ? "bg-orange-500"
                                    : "bg-indigo-600"
                              }`}
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

        <p className="mt-8 text-xs text-gray-400 text-center">
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
              data-ocid="unified_order.submit_button"
              onClick={handlePlaceOrder}
              disabled={placing || !actor || cartItems.length === 0}
              className={`w-full rounded-2xl h-14 flex items-center px-5 shadow-2xl transition-colors disabled:opacity-70 ${cfg.btnClass}`}
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
                data-ocid="unified_order.error_state"
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
