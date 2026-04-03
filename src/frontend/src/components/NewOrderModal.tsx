import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Car,
  Clock,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Order, OrderInput, OrderItem } from "../backend";
import { OrderStatus } from "../backend";
import type { MenuItem as BackendMenuItem } from "../types/menu";
import { TablePicker } from "./TablePicker";

// ── Time helpers ─────────────────────────────────────────────────
function toMinutes(h: number, m: number) {
  return h * 60 + m;
}
function nowMinutes() {
  const d = new Date();
  return toMinutes(d.getHours(), d.getMinutes());
}
function inRange(start: [number, number], end: [number, number]) {
  const now = nowMinutes();
  return now >= toMinutes(...start) && now < toMinutes(...end);
}

// ── Menu schedule ─────────────────────────────────────────────────
type TimeSlot = { start: [number, number]; end: [number, number] };

interface LocalMenuItem {
  name: string;
  price: number;
  category:
    | "Hot n Hot"
    | "Dosa"
    | "Breakfast"
    | "Chaat"
    | "Ice cream novelties"
    | "Ice cream cups n packs"
    | "Juice n Shakes"
    | "Soup"
    | "Starter"
    | "Roti (Bread)"
    | "Main course"
    | "Rice n Noodles"
    | "Softdrinks"
    | "Grill n spice";
  slots: TimeSlot[];
}

const CATEGORY_SLOTS: Record<string, TimeSlot[]> = {
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

const ALL_MENU_ITEMS: LocalMenuItem[] = [
  {
    name: "Pongal",
    price: 80,
    category: "Hot n Hot",
    slots: CATEGORY_SLOTS["Hot n Hot"],
  },
  {
    name: "Masala Dosa",
    price: 120,
    category: "Dosa",
    slots: CATEGORY_SLOTS.Dosa,
  },
  {
    name: "Idli Sambar",
    price: 90,
    category: "Breakfast",
    slots: CATEGORY_SLOTS.Breakfast,
  },
  {
    name: "Pani Puri",
    price: 60,
    category: "Chaat",
    slots: CATEGORY_SLOTS.Chaat,
  },
  {
    name: "Choco Bar",
    price: 50,
    category: "Ice cream novelties",
    slots: CATEGORY_SLOTS["Ice cream novelties"],
  },
  {
    name: "Vanilla Cup",
    price: 60,
    category: "Ice cream cups n packs",
    slots: CATEGORY_SLOTS["Ice cream cups n packs"],
  },
  {
    name: "Fresh Lime Juice",
    price: 70,
    category: "Juice n Shakes",
    slots: CATEGORY_SLOTS["Juice n Shakes"],
  },
  {
    name: "Tomato Soup",
    price: 80,
    category: "Soup",
    slots: CATEGORY_SLOTS.Soup,
  },
  {
    name: "Veg Spring Roll",
    price: 120,
    category: "Starter",
    slots: CATEGORY_SLOTS.Starter,
  },
  {
    name: "Butter Roti",
    price: 35,
    category: "Roti (Bread)",
    slots: CATEGORY_SLOTS["Roti (Bread)"],
  },
  {
    name: "Paneer Butter Masala",
    price: 220,
    category: "Main course",
    slots: CATEGORY_SLOTS["Main course"],
  },
  {
    name: "Veg Fried Rice",
    price: 160,
    category: "Rice n Noodles",
    slots: CATEGORY_SLOTS["Rice n Noodles"],
  },
  {
    name: "Coca Cola",
    price: 40,
    category: "Softdrinks",
    slots: CATEGORY_SLOTS.Softdrinks,
  },
  {
    name: "Paneer Tikka",
    price: 260,
    category: "Grill n spice",
    slots: CATEGORY_SLOTS["Grill n spice"],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Hot n Hot": "text-red-400 border-red-500/30 bg-red-500/10",
  Dosa: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  Breakfast: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  Chaat: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  "Ice cream novelties": "text-pink-400 border-pink-500/30 bg-pink-500/10",
  "Ice cream cups n packs": "text-rose-400 border-rose-500/30 bg-rose-500/10",
  "Juice n Shakes": "text-lime-400 border-lime-500/30 bg-lime-500/10",
  Soup: "text-teal-400 border-teal-500/30 bg-teal-500/10",
  Starter: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  "Roti (Bread)": "text-amber-300 border-amber-400/30 bg-amber-400/10",
  "Main course": "text-green-400 border-green-500/30 bg-green-500/10",
  "Rice n Noodles": "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
  Softdrinks: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  "Grill n spice": "text-purple-400 border-purple-500/30 bg-purple-500/10",
};

const CATEGORY_SCHEDULE: Record<string, string> = {
  "Hot n Hot": "09:00 – 23:00",
  Dosa: "09:00 – 23:00",
  Breakfast: "07:00 – 12:00",
  Chaat: "09:00 – 23:00",
  "Ice cream novelties": "09:00 – 23:00",
  "Ice cream cups n packs": "09:00 – 23:00",
  "Juice n Shakes": "09:00 – 23:00",
  Soup: "09:00 – 23:00",
  Starter: "09:00 – 23:00",
  "Roti (Bread)": "11:30–15:30 & 19:00–22:30",
  "Main course": "09:00 – 23:00",
  "Rice n Noodles": "09:00 – 23:00",
  Softdrinks: "09:00 – 23:00",
  "Grill n spice": "09:00 – 23:00",
};

function isAvailableNow(item: LocalMenuItem): boolean {
  return item.slots.some((s) => inRange(s.start, s.end));
}

function backendToLocal(items: BackendMenuItem[]): LocalMenuItem[] {
  return items
    .filter((i) => i.available)
    .map((i) => ({
      name: i.name,
      price: Number(i.price),
      category: i.category as LocalMenuItem["category"],
      slots: CATEGORY_SLOTS[i.category] ?? CATEGORY_SLOTS["Main course"],
    }));
}

// ── Component ─────────────────────────────────────────────────
interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (order: OrderInput) => Promise<void>;
  onAddToTab: (
    orderId: bigint,
    newItems: OrderItem[],
    packingCharge: bigint,
    deliveryCharge: bigint,
  ) => Promise<void>;
  existingOrders: Order[];
  backendMenuItems?: BackendMenuItem[];
  defaultTakeAway?: boolean;
  defaultDriveIn?: boolean;
  actorReady?: boolean;
}

export function NewOrderModal({
  open,
  onClose,
  onSubmit,
  onAddToTab,
  existingOrders,
  backendMenuItems,
  defaultTakeAway = false,
  defaultDriveIn = false,
  actorReady = true,
}: NewOrderModalProps) {
  const [orderType, setOrderType] = useState<"dineIn" | "takeAway" | "driveIn">(
    defaultDriveIn ? "driveIn" : defaultTakeAway ? "takeAway" : "dineIn",
  );
  const [licensePlate, setLicensePlate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [driveInPlate, setDriveInPlate] = useState("");
  const [driveInMake, setDriveInMake] = useState("");
  const [driveInColor, setDriveInColor] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [packingCharge, setPackingCharge] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Sync with defaultTakeAway prop when modal opens
  useEffect(() => {
    if (open) {
      setOrderType(
        defaultDriveIn ? "driveIn" : defaultTakeAway ? "takeAway" : "dineIn",
      );
    }
  }, [open, defaultTakeAway, defaultDriveIn]);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const allItems: LocalMenuItem[] =
    backendMenuItems && backendMenuItems.length > 0
      ? backendToLocal(backendMenuItems)
      : ALL_MENU_ITEMS;

  // Compute effective license plate
  const effectiveLicensePlate =
    orderType === "takeAway"
      ? `TAKEAWAY-${customerPhone.trim() || customerName.trim() || "WALK-IN"}`
      : orderType === "driveIn"
        ? driveInPlate.trim()
        : licensePlate;

  const existingTab = effectiveLicensePlate.trim()
    ? existingOrders.find((o) => {
        if (o.status === OrderStatus.fulfilled) return false;
        const plateMatch =
          o.vehicleInfo.licensePlate.trim().toLowerCase() ===
          effectiveLicensePlate.trim().toLowerCase();
        if (orderType === "driveIn") {
          return plateMatch && o.vehicleInfo.model === "DRIVE-IN";
        }
        return plateMatch;
      })
    : undefined;

  const availableItems = allItems.filter(isAvailableNow);
  const categories = Array.from(new Set(availableItems.map((i) => i.category)));

  const toggleItem = (name: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const resetForm = () => {
    setLicensePlate("");
    setCustomerName("");
    setCustomerPhone("");
    setDriveInPlate("");
    setDriveInMake("");
    setDriveInColor("");
    setSelectedItems(new Set());
    setPackingCharge("");
    setDeliveryCharge("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError("");

    if (
      orderType === "takeAway" &&
      !customerName.trim() &&
      !customerPhone.trim()
    ) {
      setError("Please enter customer name or phone.");
      return;
    }

    if (existingTab) {
      if (selectedItems.size === 0) {
        setError("Please select at least one item.");
        return;
      }
      const newItems: OrderItem[] = availableItems
        .filter((m) => selectedItems.has(m.name))
        .map((m) => ({ name: m.name, quantity: 1n, price: BigInt(m.price) }));
      const packingAmt = Number.parseFloat(packingCharge);
      const deliveryAmt = Number.parseFloat(deliveryCharge);
      const packingBigInt =
        !Number.isNaN(packingAmt) && packingAmt > 0
          ? BigInt(Math.round(packingAmt))
          : 0n;
      const deliveryBigInt =
        !Number.isNaN(deliveryAmt) && deliveryAmt > 0
          ? BigInt(Math.round(deliveryAmt))
          : 0n;
      setIsSubmitting(true);
      try {
        await onAddToTab(
          existingTab.id,
          newItems,
          packingBigInt,
          deliveryBigInt,
        );
        resetForm();
        onClose();
      } catch (e) {
        console.error("Add to tab failed:", e);
        setError(
          `Failed to add items to tab: ${e instanceof Error ? e.message : "Please try again."}`,
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // New order
    if (orderType === "dineIn" && !licensePlate.trim()) {
      setError("Please select a table.");
      return;
    }
    if (orderType === "driveIn" && !driveInPlate.trim()) {
      setError("Please enter your car number.");
      return;
    }
    if (selectedItems.size === 0) {
      setError("Please select at least one item.");
      return;
    }

    const items = availableItems
      .filter((m) => selectedItems.has(m.name))
      .map((m) => ({ name: m.name, quantity: 1n, price: BigInt(m.price) }));

    const packingAmt = Number.parseFloat(packingCharge);
    if (!Number.isNaN(packingAmt) && packingAmt > 0) {
      items.push({
        name: "Packing Charges",
        quantity: 1n,
        price: BigInt(Math.round(packingAmt)),
      });
    }
    const deliveryAmt = Number.parseFloat(deliveryCharge);
    if (!Number.isNaN(deliveryAmt) && deliveryAmt > 0) {
      items.push({
        name: "Delivery Charge",
        quantity: 1n,
        price: BigInt(Math.round(deliveryAmt)),
      });
    }

    const order: OrderInput = {
      id: 0n,
      status: OrderStatus.pending,
      vehicleInfo:
        orderType === "driveIn"
          ? {
              make: driveInMake.trim() || "N/A",
              model: "DRIVE-IN",
              color: driveInColor.trim() || "N/A",
              licensePlate: driveInPlate.trim(),
            }
          : {
              make: "",
              model: "",
              color: "",
              licensePlate: effectiveLicensePlate.trim(),
            },
      customerMobile: customerPhone.trim(),
      timestamp: BigInt(Date.now()) * 1_000_000n,
      items,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(order);
      resetForm();
      onClose();
    } catch (e) {
      console.error("Order placement failed:", e);
      setError(
        `Failed to place order: ${e instanceof Error ? e.message : "Please try again."}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeStr = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        data-ocid="new_order.dialog"
        className="bg-din-surface border-din-border text-din-text max-w-lg w-[calc(100vw-2rem)] sm:w-auto max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-din-text flex items-center justify-between">
            New Customer Order
            <span className="flex items-center gap-1 text-xs font-normal text-din-muted">
              <Clock className="w-3.5 h-3.5" />
              {timeStr}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Order type toggle */}
          <div className="w-full flex rounded-lg overflow-hidden border border-din-border">
            <button
              type="button"
              data-ocid="new_order.toggle"
              onClick={() => setOrderType("dineIn")}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-xs font-semibold transition-colors ${
                orderType === "dineIn"
                  ? "bg-din-teal/20 text-din-teal"
                  : "bg-din-surface-alt text-din-muted hover:text-din-text"
              }`}
            >
              <UtensilsCrossed className="w-4 h-4 flex-shrink-0" />
              <span className="leading-tight truncate w-full text-center">
                Dine In
              </span>
            </button>
            <button
              type="button"
              data-ocid="new_order.toggle"
              onClick={() => setOrderType("takeAway")}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-xs font-semibold transition-colors border-l border-din-border ${
                orderType === "takeAway"
                  ? "bg-din-orange/20 text-din-orange"
                  : "bg-din-surface-alt text-din-muted hover:text-din-text"
              }`}
            >
              <ShoppingBag className="w-4 h-4 flex-shrink-0" />
              <span className="leading-tight truncate w-full text-center">
                Take Away
              </span>
            </button>
            <button
              type="button"
              data-ocid="new_order.toggle"
              onClick={() => setOrderType("driveIn")}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-xs font-semibold transition-colors border-l border-din-border ${
                orderType === "driveIn"
                  ? "bg-yellow-400/20 text-yellow-400"
                  : "bg-din-surface-alt text-din-muted hover:text-din-text"
              }`}
            >
              <Car className="w-4 h-4 flex-shrink-0" />
              <span className="leading-tight truncate w-full text-center">
                Drive In
              </span>
            </button>
          </div>

          {/* Existing tab banner */}
          {existingTab && (
            <div
              data-ocid="new_order.panel"
              className="flex items-start gap-2 bg-din-orange/10 border border-din-orange/40 rounded px-3 py-2 text-xs text-din-orange"
            >
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                ⚡ Table <strong>{existingTab.vehicleInfo.licensePlate}</strong>{" "}
                already has an open tab. New items will be added to the existing
                order.
              </span>
            </div>
          )}

          {/* Table Picker (Dine In) or Customer Info (Take Away) */}
          {orderType === "dineIn" ? (
            <div>
              <h3 className="text-xs font-semibold text-din-teal uppercase tracking-wider mb-3">
                Select Table
              </h3>
              <TablePicker
                selectedTable={licensePlate}
                onSelect={setLicensePlate}
                occupiedTables={existingOrders
                  .filter((o) => o.status !== OrderStatus.fulfilled)
                  .map((o) => o.vehicleInfo.licensePlate)}
              />
            </div>
          ) : orderType === "takeAway" ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-din-orange uppercase tracking-wider">
                Customer Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-din-muted">
                    Customer Name
                  </Label>
                  <Input
                    data-ocid="new_order.input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-din-muted">
                    Phone (optional)
                  </Label>
                  <Input
                    data-ocid="new_order.input"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 h-8 text-sm"
                  />
                </div>
              </div>
              {(customerName || customerPhone) && (
                <p className="text-[10px] text-din-muted">
                  Order ID:{" "}
                  <span className="font-mono text-din-orange">
                    TAKEAWAY-{customerPhone.trim() || customerName.trim()}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
                Car Details
              </h3>
              <div>
                <Label className="text-xs text-din-muted">
                  Car Number / License Plate{" "}
                  <span className="text-din-red">*</span>
                </Label>
                <Input
                  data-ocid="new_order.input"
                  value={driveInPlate}
                  onChange={(e) => setDriveInPlate(e.target.value)}
                  placeholder="e.g. MH 12 AB 1234"
                  className="bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-din-muted">
                    Car Make (optional)
                  </Label>
                  <Input
                    data-ocid="new_order.input"
                    value={driveInMake}
                    onChange={(e) => setDriveInMake(e.target.value)}
                    placeholder="e.g. Maruti, Hyundai"
                    className="bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-din-muted">
                    Car Color (optional)
                  </Label>
                  <Input
                    data-ocid="new_order.input"
                    value={driveInColor}
                    onChange={(e) => setDriveInColor(e.target.value)}
                    placeholder="e.g. Red, White"
                    className="bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 h-8 text-sm"
                  />
                </div>
              </div>
              {driveInPlate && (
                <p className="text-[10px] text-din-muted">
                  Car:{" "}
                  <span className="font-mono text-yellow-400">
                    {driveInPlate.trim()}
                    {driveInMake ? ` • ${driveInMake}` : ""}
                    {driveInColor ? ` • ${driveInColor}` : ""}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Menu Items */}
          <div>
            <h3 className="text-xs font-semibold text-din-teal uppercase tracking-wider mb-3">
              Menu Items
            </h3>
            {availableItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-din-muted">
                <Clock className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">
                  Kitchen is closed right now
                </p>
                <p className="text-xs opacity-60 mt-1">
                  No items available at {timeStr}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((cat) => {
                  const catItems = availableItems.filter(
                    (i) => i.category === cat,
                  );
                  return (
                    <div key={cat}>
                      <div
                        className={`flex items-center justify-between px-2 py-1 rounded mb-2 border text-xs font-semibold ${CATEGORY_COLORS[cat] ?? ""}`}
                      >
                        <span>{cat}</span>
                        <span className="font-normal opacity-75">
                          {CATEGORY_SCHEDULE[cat]}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {catItems.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center gap-2 p-2 rounded bg-din-surface-alt border border-din-border cursor-pointer hover:border-din-teal/50 transition-colors"
                            onClick={() => toggleItem(item.name)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ")
                                toggleItem(item.name);
                            }}
                          >
                            <Checkbox
                              checked={selectedItems.has(item.name)}
                              onCheckedChange={() => toggleItem(item.name)}
                              className="border-din-border data-[state=checked]:bg-din-teal data-[state=checked]:border-din-teal"
                            />
                            <div>
                              <p className="text-xs font-medium text-din-text">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-din-muted">
                                ₹{item.price}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Extra Charges */}
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-din-teal uppercase tracking-wider">
              Extra Charges (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-din-muted">
                  Packing Charges (₹)
                </Label>
                <Input
                  data-ocid="new_order.input"
                  type="number"
                  min="0"
                  value={packingCharge}
                  onChange={(e) => setPackingCharge(e.target.value)}
                  placeholder="0"
                  className="bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-din-muted">
                  Delivery Charge (₹)
                </Label>
                <Input
                  data-ocid="new_order.input"
                  type="number"
                  min="0"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                  placeholder="0"
                  className="bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <p
              data-ocid="new_order.error_state"
              className="text-xs text-din-red"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            data-ocid="new_order.cancel_button"
            variant="outline"
            onClick={handleClose}
            className="border-din-border text-din-muted hover:bg-din-surface-alt"
          >
            Cancel
          </Button>
          <Button
            data-ocid="new_order.submit_button"
            onClick={handleSubmit}
            disabled={
              isSubmitting || availableItems.length === 0 || !actorReady
            }
            className={`text-white font-semibold ${
              orderType === "takeAway"
                ? "bg-din-orange hover:bg-din-orange/80"
                : orderType === "driveIn"
                  ? "bg-yellow-500 hover:bg-yellow-400"
                  : "bg-din-teal hover:bg-din-teal/80"
            }`}
          >
            {!actorReady
              ? "Connecting..."
              : isSubmitting
                ? existingTab
                  ? "Adding..."
                  : "Placing..."
                : existingTab
                  ? "Add to Tab"
                  : "Place Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
