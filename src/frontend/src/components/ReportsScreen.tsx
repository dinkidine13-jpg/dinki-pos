import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import type { Order } from "../backend";
import { OrderStatus } from "../backend";
import type { MenuItem } from "../types/menu";

const SPECIAL_ITEMS = ["Packing Charges", "Delivery Charge"];

function fmt(n: number) {
  return `\u20B9${n.toFixed(2)}`;
}

function computeOrderTotal(order: Order) {
  const regularItems = order.items.filter(
    (i) => !SPECIAL_ITEMS.includes(i.name),
  );
  const packingItem = order.items.find((i) => i.name === "Packing Charges");
  const deliveryItem = order.items.find((i) => i.name === "Delivery Charge");
  const itemsTotal = regularItems.reduce(
    (s, i) => s + Number(i.price) * Number(i.quantity),
    0,
  );
  const sgst = itemsTotal * 0.025;
  const cgst = itemsTotal * 0.025;
  const packing = packingItem
    ? Number(packingItem.price) * Number(packingItem.quantity)
    : 0;
  const delivery = deliveryItem
    ? Number(deliveryItem.price) * Number(deliveryItem.quantity)
    : 0;
  const subtotal = itemsTotal + sgst + cgst + packing + delivery;
  const discountAmt = Number(order.discount ?? 0n);
  const discountType = order.discountType ?? "flat";
  let discountValue = 0;
  if (discountAmt > 0) {
    discountValue =
      discountType === "percent"
        ? subtotal * (discountAmt / 100 / 100)
        : discountAmt / 100;
  }
  return {
    itemsTotal,
    sgst,
    cgst,
    packing,
    delivery,
    discountValue,
    grandTotal: Math.max(0, subtotal - discountValue),
    tax: sgst + cgst,
    taxableAmount: itemsTotal,
    regularItems,
  };
}

function isDriveIn(order: Order) {
  return order.vehicleInfo.model === "DRIVE-IN";
}
function isTakeAway(order: Order) {
  return order.vehicleInfo.licensePlate?.startsWith("TAKEAWAY-") ?? false;
}

function getFloor(order: Order): string {
  if (isDriveIn(order)) return "Drive-In";
  if (isTakeAway(order)) return "Take Away";
  const plate = order.vehicleInfo.licensePlate ?? "";
  if (plate.startsWith("FFD")) return "First Floor Delux";
  if (plate.startsWith("FF")) return "First Floor";
  if (plate.startsWith("DG")) return "Dinki Ground";
  if (plate.startsWith("DM")) return "Dinki Mezzanine";
  if (plate.startsWith("SG")) return "Sasural Ground";
  if (plate.startsWith("SM")) return "Sasural Mezzanine";
  return "Other";
}

type Period = "daily" | "weekly" | "monthly" | "yearly";

function getStartOf(period: Period, offset: number): Date {
  const now = new Date();
  const d = new Date(now);
  if (period === "daily") {
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    const day = d.getDay();
    d.setDate(d.getDate() - day + offset * 7);
    d.setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    d.setMonth(d.getMonth() + offset, 1);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setFullYear(d.getFullYear() + offset, 0, 1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

function getEndOf(period: Period, start: Date): Date {
  const d = new Date(start);
  if (period === "daily") {
    d.setDate(d.getDate() + 1);
  } else if (period === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (period === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

function getPeriodLabel(period: Period, start: Date): string {
  if (period === "daily") {
    return start.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      weekday: "short",
    });
  }
  if (period === "weekly") {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} \u2013 ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  if (period === "monthly") {
    return start.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }
  return `Year ${start.getFullYear()}`;
}

function filterOrdersByPeriod(
  orders: Order[],
  period: Period,
  start: Date,
): Order[] {
  const end = getEndOf(period, start);
  return orders.filter((o) => {
    const ts = new Date(Number(o.timestamp) / 1_000_000);
    return ts >= start && ts < end;
  });
}

// Break period into sub-buckets for the table view
function getSubBuckets(
  period: Period,
  start: Date,
): { label: string; start: Date; end: Date }[] {
  const buckets: { label: string; start: Date; end: Date }[] = [];
  if (period === "daily") {
    // Hourly
    for (let h = 0; h < 24; h++) {
      const s = new Date(start);
      s.setHours(h);
      const e = new Date(s);
      e.setHours(h + 1);
      buckets.push({
        label: `${String(h).padStart(2, "0")}:00`,
        start: s,
        end: e,
      });
    }
  } else if (period === "weekly") {
    // Daily for 7 days
    for (let d = 0; d < 7; d++) {
      const s = new Date(start);
      s.setDate(s.getDate() + d);
      const e = new Date(s);
      e.setDate(e.getDate() + 1);
      buckets.push({
        label: s.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        start: s,
        end: e,
      });
    }
  } else if (period === "monthly") {
    // Weekly breakdown
    let cur = new Date(start);
    const end = getEndOf(period, start);
    let weekNum = 1;
    while (cur < end) {
      const s = new Date(cur);
      const e = new Date(cur);
      e.setDate(e.getDate() + 7);
      if (e > end) e.setTime(end.getTime());
      buckets.push({
        label: `Week ${weekNum} (${s.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`,
        start: s,
        end: e,
      });
      cur.setDate(cur.getDate() + 7);
      weekNum++;
    }
  } else {
    // Monthly breakdown
    for (let m = 0; m < 12; m++) {
      const s = new Date(start.getFullYear(), m, 1);
      const e = new Date(start.getFullYear(), m + 1, 1);
      buckets.push({
        label: s.toLocaleDateString("en-IN", { month: "short" }),
        start: s,
        end: e,
      });
    }
  }
  return buckets;
}

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
}
function SummaryCard({ label, value, sub }: SummaryCardProps) {
  return (
    <div className="bg-din-surface-alt border border-din-border rounded-lg p-3">
      <p className="text-xs text-din-muted">{label}</p>
      <p className="text-lg font-bold text-din-teal">{value}</p>
      {sub && <p className="text-[11px] text-din-muted">{sub}</p>}
    </div>
  );
}

interface ReportsScreenProps {
  orders: Order[];
  onBack: () => void;
  menuItems?: MenuItem[];
}

export function ReportsScreen({
  orders,
  onBack,
  menuItems = [],
}: ReportsScreenProps) {
  const [period, setPeriod] = useState<Period>("daily");
  const [offset, setOffset] = useState(0);

  const fulfilledOrders = useMemo(
    () => orders.filter((o) => o.status === OrderStatus.fulfilled),
    [orders],
  );

  const periodStart = useMemo(
    () => getStartOf(period, offset),
    [period, offset],
  );
  const periodOrders = useMemo(
    () => filterOrdersByPeriod(fulfilledOrders, period, periodStart),
    [fulfilledOrders, period, periodStart],
  );
  const subBuckets = useMemo(
    () => getSubBuckets(period, periodStart),
    [period, periodStart],
  );

  const periodLabel = getPeriodLabel(period, periodStart);

  // Aggregate
  const totalRevenue = periodOrders.reduce(
    (s, o) => s + computeOrderTotal(o).grandTotal,
    0,
  );
  const totalOrders = periodOrders.length;
  const totalItemsSold = periodOrders.reduce(
    (s, o) =>
      s +
      o.items
        .filter((i) => !SPECIAL_ITEMS.includes(i.name))
        .reduce((si, i) => si + Number(i.quantity), 0),
    0,
  );
  const totalTax = periodOrders.reduce(
    (s, o) => s + computeOrderTotal(o).tax,
    0,
  );
  const totalTaxableAmount = periodOrders.reduce(
    (s, o) => s + computeOrderTotal(o).taxableAmount,
    0,
  );

  // Sub-bucket totals for sales table
  const bucketData = subBuckets.map((b) => {
    const bOrders = periodOrders.filter((o) => {
      const ts = new Date(Number(o.timestamp) / 1_000_000);
      return ts >= b.start && ts < b.end;
    });
    const rev = bOrders.reduce(
      (s, o) => s + computeOrderTotal(o).grandTotal,
      0,
    );
    const tax = bOrders.reduce((s, o) => s + computeOrderTotal(o).tax, 0);
    const qty = bOrders.reduce(
      (s, o) =>
        s +
        o.items
          .filter((i) => !SPECIAL_ITEMS.includes(i.name))
          .reduce((si, i) => si + Number(i.quantity), 0),
      0,
    );
    return {
      label: b.label,
      orders: bOrders.length,
      revenue: rev,
      items: qty,
      tax,
    };
  });

  // Category breakdown
  const categoryData = useMemo(() => {
    const menuItemMap = new Map<string, string>();
    for (const m of menuItems) {
      menuItemMap.set(m.name, m.category);
    }
    const catMap = new Map<string, { qty: number; revenue: number }>();
    for (const order of fulfilledOrders) {
      for (const item of order.items.filter(
        (i) => !SPECIAL_ITEMS.includes(i.name),
      )) {
        const cat = menuItemMap.get(item.name) ?? "Uncategorised";
        const existing = catMap.get(cat) ?? { qty: 0, revenue: 0 };
        catMap.set(cat, {
          qty: existing.qty + Number(item.quantity),
          revenue:
            existing.revenue + Number(item.price) * Number(item.quantity),
        });
      }
    }
    const total = Array.from(catMap.values()).reduce(
      (s, v) => s + v.revenue,
      0,
    );
    return Array.from(catMap.entries())
      .map(([cat, data]) => ({
        category: cat,
        qty: data.qty,
        revenue: data.revenue,
        pct: total > 0 ? (data.revenue / total) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [fulfilledOrders, menuItems]);

  // Floor breakdown
  const floorData = useMemo(() => {
    const floorMap = new Map<string, { orders: number; revenue: number }>();
    for (const order of fulfilledOrders) {
      const floor = getFloor(order);
      const existing = floorMap.get(floor) ?? { orders: 0, revenue: 0 };
      floorMap.set(floor, {
        orders: existing.orders + 1,
        revenue: existing.revenue + computeOrderTotal(order).grandTotal,
      });
    }
    return Array.from(floorMap.entries())
      .map(([floor, data]) => ({ floor, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [fulfilledOrders]);

  // Staff breakdown (from localStorage activity logs)
  const staffData = useMemo(() => {
    try {
      const logs = JSON.parse(
        localStorage.getItem("dinki_activity_log") ?? "[]",
      ) as Array<{
        user: string;
        action: string;
        orderId?: string;
        table?: string;
        timestamp?: number;
      }>;
      const staffMap = new Map<string, { orders: number; revenue: number }>();
      for (const log of logs) {
        if (log.action !== "Order placed") continue;
        const user = log.user ?? "Unknown";
        const existing = staffMap.get(user) ?? { orders: 0, revenue: 0 };
        staffMap.set(user, {
          orders: existing.orders + 1,
          revenue: existing.revenue,
        });
      }
      return Array.from(staffMap.entries())
        .map(([user, data]) => ({ user, ...data }))
        .sort((a, b) => b.orders - a.orders);
    } catch {
      return [];
    }
  }, []);

  // User (role) breakdown from staff data
  const userRoleData = useMemo(() => {
    try {
      const users = JSON.parse(
        localStorage.getItem("dinki_users") ?? "[]",
      ) as Array<{
        name: string;
        role: string;
      }>;
      const logs = JSON.parse(
        localStorage.getItem("dinki_activity_log") ?? "[]",
      ) as Array<{
        user: string;
        action: string;
      }>;
      const roleMap = new Map<string, { orders: number; users: number }>();
      for (const user of users) {
        const role = user.role ?? "Unknown";
        const userLogs = logs.filter(
          (l) => l.user === user.name && l.action === "Order placed",
        );
        const existing = roleMap.get(role) ?? { orders: 0, users: 0 };
        roleMap.set(role, {
          orders: existing.orders + userLogs.length,
          users: existing.users + 1,
        });
      }
      return Array.from(roleMap.entries())
        .map(([role, data]) => ({ role, ...data }))
        .sort((a, b) => b.orders - a.orders);
    } catch {
      return [];
    }
  }, []);

  const handlePrint = (reportName: string) => {
    window.print();
    console.info(`Printing ${reportName} report`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-din-surface border-b border-din-border px-4 h-14 flex items-center gap-3">
        <button
          type="button"
          data-ocid="reports.button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-din-surface-alt text-din-muted hover:text-din-text transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <BarChart3 className="w-4 h-4 text-din-teal" />
        <h1 className="font-bold text-din-text text-base flex-1">Reports</h1>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        <Tabs defaultValue="sales">
          <TabsList
            className="bg-din-surface-alt border border-din-border mb-4 h-9 flex flex-wrap"
            data-ocid="reports.tab"
          >
            <TabsTrigger
              value="sales"
              className="text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
            >
              Sales
            </TabsTrigger>
            <TabsTrigger
              value="tax"
              className="text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
            >
              Tax
            </TabsTrigger>
            <TabsTrigger
              value="category"
              className="text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
            >
              Category
            </TabsTrigger>
            <TabsTrigger
              value="floor"
              className="text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
            >
              Floor/Table
            </TabsTrigger>
            <TabsTrigger
              value="staff"
              className="text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
            >
              Staff
            </TabsTrigger>
            <TabsTrigger
              value="userrole"
              className="text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
            >
              User Roles
            </TabsTrigger>
          </TabsList>

          {/* ============ SALES ============ */}
          <TabsContent value="sales" className="space-y-4">
            {/* Period sub-tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1">
                {(["daily", "weekly", "monthly", "yearly"] as Period[]).map(
                  (p) => (
                    <button
                      key={p}
                      type="button"
                      data-ocid="reports.tab"
                      onClick={() => {
                        setPeriod(p);
                        setOffset(0);
                      }}
                      className={`px-3 py-1 text-xs rounded-full font-medium border transition-colors ${
                        period === p
                          ? "bg-din-teal/20 border-din-teal/50 text-din-teal"
                          : "border-din-border text-din-muted hover:text-din-text"
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ),
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-ocid="reports.pagination_prev"
                  onClick={() => setOffset((p) => p - 1)}
                  className="w-7 h-7 rounded border border-din-border flex items-center justify-center text-din-muted hover:text-din-text hover:bg-din-surface-alt transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-din-text font-medium min-w-[150px] text-center">
                  {periodLabel}
                </span>
                <button
                  type="button"
                  data-ocid="reports.pagination_next"
                  onClick={() => setOffset((p) => Math.min(0, p + 1))}
                  disabled={offset >= 0}
                  className="w-7 h-7 rounded border border-din-border flex items-center justify-center text-din-muted hover:text-din-text hover:bg-din-surface-alt transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <Button
                data-ocid="reports.primary_button"
                size="sm"
                variant="outline"
                onClick={() => handlePrint("Sales")}
                className="border-din-border text-din-muted hover:bg-din-surface-alt h-7 text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>
            </div>

            {/* KPI summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard label="Revenue" value={fmt(totalRevenue)} />
              <SummaryCard label="Orders" value={totalOrders.toString()} />
              <SummaryCard
                label="Items Sold"
                value={totalItemsSold.toString()}
              />
              <SummaryCard label="Tax Collected" value={fmt(totalTax)} />
            </div>

            {/* Breakdown table */}
            <div className="rounded-lg border border-din-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-din-surface-alt border-din-border">
                    <TableHead className="text-din-muted text-xs">
                      {period === "daily"
                        ? "Hour"
                        : period === "weekly"
                          ? "Day"
                          : period === "monthly"
                            ? "Week"
                            : "Month"}
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Orders
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Items
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Revenue
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Tax
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bucketData
                    .filter((b) => b.orders > 0)
                    .map((b, i) => (
                      <TableRow
                        key={b.label}
                        data-ocid={`reports.item.${i + 1}`}
                        className="border-din-border hover:bg-din-surface-alt"
                      >
                        <TableCell className="text-xs text-din-text">
                          {b.label}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-muted">
                          {b.orders}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-muted">
                          {b.items}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-teal font-medium">
                          {fmt(b.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-muted">
                          {fmt(b.tax)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {bucketData.filter((b) => b.orders > 0).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-xs text-din-muted py-6"
                        data-ocid="reports.empty_state"
                      >
                        No sales data for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ============ TAX ============ */}
          <TabsContent value="tax" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1">
                {(["daily", "weekly", "monthly", "yearly"] as Period[]).map(
                  (p) => (
                    <button
                      key={p}
                      type="button"
                      data-ocid="reports.tab"
                      onClick={() => {
                        setPeriod(p);
                        setOffset(0);
                      }}
                      className={`px-3 py-1 text-xs rounded-full font-medium border transition-colors ${
                        period === p
                          ? "bg-din-teal/20 border-din-teal/50 text-din-teal"
                          : "border-din-border text-din-muted hover:text-din-text"
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ),
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-ocid="reports.pagination_prev"
                  onClick={() => setOffset((p) => p - 1)}
                  className="w-7 h-7 rounded border border-din-border flex items-center justify-center text-din-muted hover:text-din-text hover:bg-din-surface-alt"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-din-text font-medium min-w-[150px] text-center">
                  {periodLabel}
                </span>
                <button
                  type="button"
                  data-ocid="reports.pagination_next"
                  onClick={() => setOffset((p) => Math.min(0, p + 1))}
                  disabled={offset >= 0}
                  className="w-7 h-7 rounded border border-din-border flex items-center justify-center text-din-muted hover:text-din-text hover:bg-din-surface-alt disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <Button
                data-ocid="reports.primary_button"
                size="sm"
                variant="outline"
                onClick={() => handlePrint("Tax")}
                className="border-din-border text-din-muted hover:bg-din-surface-alt h-7 text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard
                label="Taxable Amount"
                value={fmt(totalTaxableAmount)}
              />
              <SummaryCard label="SGST (2.5%)" value={fmt(totalTax / 2)} />
              <SummaryCard label="CGST (2.5%)" value={fmt(totalTax / 2)} />
              <SummaryCard label="Total Tax" value={fmt(totalTax)} />
            </div>

            <div className="rounded-lg border border-din-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-din-surface-alt border-din-border">
                    <TableHead className="text-din-muted text-xs">
                      Period
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Taxable Amount
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      SGST
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      CGST
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Total Tax
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bucketData
                    .filter((b) => b.orders > 0)
                    .map((b, i) => (
                      <TableRow
                        key={b.label}
                        data-ocid={`reports.item.${i + 1}`}
                        className="border-din-border hover:bg-din-surface-alt"
                      >
                        <TableCell className="text-xs text-din-text">
                          {b.label}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-muted">
                          {fmt((b.revenue / 1.05) * 1)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-muted">
                          {fmt(b.tax / 2)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-muted">
                          {fmt(b.tax / 2)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-teal font-medium">
                          {fmt(b.tax)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {bucketData.filter((b) => b.orders > 0).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-xs text-din-muted py-6"
                        data-ocid="reports.empty_state"
                      >
                        No tax data for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ============ CATEGORY ============ */}
          <TabsContent value="category" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-din-text">
                Category-wise Sales (All Time)
              </h2>
              <Button
                data-ocid="reports.primary_button"
                size="sm"
                variant="outline"
                onClick={() => handlePrint("Category")}
                className="border-din-border text-din-muted hover:bg-din-surface-alt h-7 text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>
            </div>
            <ScrollArea className="h-[60vh]">
              <div className="rounded-lg border border-din-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-din-surface-alt border-din-border">
                      <TableHead className="text-din-muted text-xs">
                        Category
                      </TableHead>
                      <TableHead className="text-right text-din-muted text-xs">
                        Qty Sold
                      </TableHead>
                      <TableHead className="text-right text-din-muted text-xs">
                        Revenue
                      </TableHead>
                      <TableHead className="text-right text-din-muted text-xs">
                        % of Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryData.map((c, i) => (
                      <TableRow
                        key={c.category}
                        data-ocid={`reports.item.${i + 1}`}
                        className="border-din-border hover:bg-din-surface-alt"
                      >
                        <TableCell className="text-xs text-din-text font-medium">
                          {c.category}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-muted">
                          {c.qty}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-teal font-medium">
                          {fmt(c.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-din-muted">
                          {c.pct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {categoryData.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-xs text-din-muted py-6"
                          data-ocid="reports.empty_state"
                        >
                          No category data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ============ FLOOR ============ */}
          <TabsContent value="floor" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-din-text">
                Floor/Table Sales (All Time)
              </h2>
              <Button
                data-ocid="reports.primary_button"
                size="sm"
                variant="outline"
                onClick={() => handlePrint("Floor")}
                className="border-din-border text-din-muted hover:bg-din-surface-alt h-7 text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>
            </div>
            <div className="rounded-lg border border-din-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-din-surface-alt border-din-border">
                    <TableHead className="text-din-muted text-xs">
                      Floor / Area
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Orders
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Revenue
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {floorData.map((f, i) => (
                    <TableRow
                      key={f.floor}
                      data-ocid={`reports.item.${i + 1}`}
                      className="border-din-border hover:bg-din-surface-alt"
                    >
                      <TableCell className="text-xs text-din-text font-medium">
                        {f.floor}
                      </TableCell>
                      <TableCell className="text-right text-xs text-din-muted">
                        {f.orders}
                      </TableCell>
                      <TableCell className="text-right text-xs text-din-teal font-medium">
                        {fmt(f.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {floorData.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-xs text-din-muted py-6"
                        data-ocid="reports.empty_state"
                      >
                        No floor data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ============ STAFF ============ */}
          <TabsContent value="staff" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-din-text">
                Staff-wise Sales
              </h2>
              <Button
                data-ocid="reports.primary_button"
                size="sm"
                variant="outline"
                onClick={() => handlePrint("Staff")}
                className="border-din-border text-din-muted hover:bg-din-surface-alt h-7 text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>
            </div>
            <p className="text-xs text-din-muted">
              Based on activity logs. Staff must be logged in when placing
              orders.
            </p>
            <div className="rounded-lg border border-din-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-din-surface-alt border-din-border">
                    <TableHead className="text-din-muted text-xs">
                      Staff Name
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Orders Placed
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffData.map((s, i) => (
                    <TableRow
                      key={s.user}
                      data-ocid={`reports.item.${i + 1}`}
                      className="border-din-border hover:bg-din-surface-alt"
                    >
                      <TableCell className="text-xs text-din-text font-medium">
                        {s.user}
                      </TableCell>
                      <TableCell className="text-right text-xs text-din-teal font-medium">
                        {s.orders}
                      </TableCell>
                    </TableRow>
                  ))}
                  {staffData.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-center text-xs text-din-muted py-6"
                        data-ocid="reports.empty_state"
                      >
                        No staff activity data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ============ USER ROLES ============ */}
          <TabsContent value="userrole" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-din-text">
                Sales by User Role
              </h2>
              <Button
                data-ocid="reports.primary_button"
                size="sm"
                variant="outline"
                onClick={() => handlePrint("UserRole")}
                className="border-din-border text-din-muted hover:bg-din-surface-alt h-7 text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>
            </div>
            <div className="rounded-lg border border-din-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-din-surface-alt border-din-border">
                    <TableHead className="text-din-muted text-xs">
                      Role
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Users
                    </TableHead>
                    <TableHead className="text-right text-din-muted text-xs">
                      Orders Placed
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoleData.map((r, i) => (
                    <TableRow
                      key={r.role}
                      data-ocid={`reports.item.${i + 1}`}
                      className="border-din-border hover:bg-din-surface-alt"
                    >
                      <TableCell className="text-xs text-din-text font-medium">
                        {r.role}
                      </TableCell>
                      <TableCell className="text-right text-xs text-din-muted">
                        {r.users}
                      </TableCell>
                      <TableCell className="text-right text-xs text-din-teal font-medium">
                        {r.orders}
                      </TableCell>
                    </TableRow>
                  ))}
                  {userRoleData.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-xs text-din-muted py-6"
                        data-ocid="reports.empty_state"
                      >
                        No role data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
