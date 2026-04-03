import { Button } from "@/components/ui/button";
import { ChevronLeft, Printer } from "lucide-react";
import type { Order } from "../backend";
import { OrderStatus } from "../backend";

const SPECIAL_ITEMS = ["Packing Charges", "Delivery Charge"];

function computeGrandTotal(order: Order) {
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
  return {
    itemsTotal,
    sgst,
    cgst,
    packing,
    delivery,
    grandTotal: itemsTotal + sgst + cgst + packing + delivery,
  };
}

interface DayEndReportProps {
  orders: Order[];
  onBack: () => void;
}

export function DayEndReport({ orders, onBack }: DayEndReportProps) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totals = orders.reduce(
    (acc, o) => {
      const { grandTotal, sgst, cgst, itemsTotal } = computeGrandTotal(o);
      acc.revenue += grandTotal;
      acc.tax += sgst + cgst;
      acc.itemsTotal += itemsTotal;
      acc.qty += o.items
        .filter((i) => !SPECIAL_ITEMS.includes(i.name))
        .reduce((s, i) => s + Number(i.quantity), 0);
      return acc;
    },
    { revenue: 0, tax: 0, qty: 0, itemsTotal: 0 },
  );

  const activeCount = orders.filter(
    (o) => o.status !== OrderStatus.fulfilled,
  ).length;

  // Category breakdown
  const catMap = new Map<string, { qty: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      if (SPECIAL_ITEMS.includes(item.name)) continue;
      // We don't have category info on order items, so use item name grouping by prefix heuristic
      // Just group all items individually - in production this would use category
      const key = item.name;
      const prev = catMap.get(key) ?? { qty: 0, revenue: 0 };
      catMap.set(key, {
        qty: prev.qty + Number(item.quantity),
        revenue: prev.revenue + Number(item.price) * Number(item.quantity),
      });
    }
  }
  const catBreakdown = Array.from(catMap.entries()).sort(
    (a, b) => b[1].revenue - a[1].revenue,
  );

  const stats = [
    {
      label: "Today's Revenue",
      value: `₹${totals.revenue.toFixed(2)}`,
      color: "text-din-green",
      bg: "bg-din-green/10 border-din-green/30",
    },
    {
      label: "Total Orders",
      value: orders.length,
      color: "text-din-teal",
      bg: "bg-din-teal/10 border-din-teal/30",
    },
    {
      label: "Total Quantity",
      value: totals.qty,
      color: "text-din-orange",
      bg: "bg-din-orange/10 border-din-orange/30",
    },
    {
      label: "Total Tax",
      value: `₹${totals.tax.toFixed(2)}`,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10 border-yellow-400/30",
    },
    {
      label: "Active Tables",
      value: activeCount,
      color: "text-purple-400",
      bg: "bg-purple-400/10 border-purple-400/30",
    },
  ];

  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-din-surface border-b border-din-border px-4 h-14 flex items-center gap-3 no-print">
          <button
            type="button"
            data-ocid="day_end.button"
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-din-surface-alt text-din-muted hover:text-din-text transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-din-text text-base flex-1">
            Day-end Report
          </h1>
          <Button
            data-ocid="day_end.primary_button"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs px-3 bg-din-teal/20 text-din-teal hover:bg-din-teal/30 border border-din-teal/30"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print Report
          </Button>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
          <div className="text-center">
            <p className="text-xl font-bold text-din-text">DINKI POS</p>
            <p className="text-sm text-din-muted">Day-end Report – {dateStr}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-lg border p-4 ${s.bg}`}>
                <p className="text-xs text-din-muted mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Category/Item breakdown */}
          <div>
            <h2 className="text-sm font-semibold text-din-text mb-3">
              Item-wise Breakdown
            </h2>
            <div className="rounded-lg border border-din-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-din-surface-alt">
                  <tr>
                    <th className="px-3 py-2 text-left text-din-muted font-medium">
                      Item Name
                    </th>
                    <th className="px-3 py-2 text-right text-din-muted font-medium">
                      Qty Sold
                    </th>
                    <th className="px-3 py-2 text-right text-din-muted font-medium">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {catBreakdown.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-din-muted"
                      >
                        No data
                      </td>
                    </tr>
                  ) : (
                    catBreakdown.map(([name, data], i) => (
                      <tr
                        key={name}
                        data-ocid={`day_end.item.${i + 1}`}
                        className="border-t border-din-border hover:bg-din-surface-alt"
                      >
                        <td className="px-3 py-2 text-din-text">{name}</td>
                        <td className="px-3 py-2 text-right text-din-muted">
                          {data.qty}
                        </td>
                        <td className="px-3 py-2 text-right text-din-teal font-medium">
                          ₹{data.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-din-surface-alt border-t-2 border-din-border">
                  <tr>
                    <td className="px-3 py-2 text-din-text font-semibold">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-din-muted font-semibold">
                      {totals.qty}
                    </td>
                    <td className="px-3 py-2 text-right text-din-teal font-bold">
                      ₹{totals.itemsTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Financial summary */}
          <div className="rounded-lg border border-din-border p-4 space-y-2">
            <h2 className="text-sm font-semibold text-din-text mb-3">
              Financial Summary
            </h2>
            <div className="flex justify-between text-sm text-din-muted">
              <span>Items Total</span>
              <span>₹{totals.itemsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-din-muted">
              <span>Total Tax (SGST + CGST)</span>
              <span>₹{totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-din-teal border-t border-din-border pt-2">
              <span>Grand Total Revenue</span>
              <span>₹{totals.revenue.toFixed(2)}</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
