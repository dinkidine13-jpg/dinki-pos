import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, Calendar, ChevronLeft } from "lucide-react";
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

interface SummaryOfDayProps {
  orders: Order[];
  onBack: () => void;
}

export function SummaryOfDay({ orders, onBack }: SummaryOfDayProps) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totals = orders.reduce(
    (acc, o) => {
      const { grandTotal, sgst, cgst } = computeGrandTotal(o);
      acc.revenue += grandTotal;
      acc.tax += sgst + cgst;
      acc.qty += o.items
        .filter((i) => !SPECIAL_ITEMS.includes(i.name))
        .reduce((s, i) => s + Number(i.quantity), 0);
      return acc;
    },
    { revenue: 0, tax: 0, qty: 0 },
  );

  const activeCount = orders.filter(
    (o) => o.status !== OrderStatus.fulfilled,
  ).length;

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-din-surface border-b border-din-border px-4 h-14 flex items-center gap-3">
        <button
          type="button"
          data-ocid="summary.button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-din-surface-alt text-din-muted hover:text-din-text transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-din-text text-base flex-1">
          Summary of the Day
        </h1>
        <div className="flex items-center gap-2 text-xs text-din-muted">
          <button type="button" className="hover:text-din-text">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {today.toLocaleDateString("en-IN")}
          </span>
          <button type="button" className="hover:text-din-text">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Date label */}
        <p className="text-din-muted text-sm">{dateStr}</p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-lg border p-4 ${s.bg}`}>
              <p className="text-xs text-din-muted mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Orders summary table */}
        <div>
          <h2 className="text-sm font-semibold text-din-text mb-3">
            Orders Summary
          </h2>
          <div className="rounded-lg border border-din-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-din-surface-alt">
                <tr>
                  <th className="px-3 py-2 text-left text-din-muted font-medium">
                    Order #
                  </th>
                  <th className="px-3 py-2 text-left text-din-muted font-medium">
                    Table
                  </th>
                  <th className="px-3 py-2 text-right text-din-muted font-medium">
                    Items
                  </th>
                  <th className="px-3 py-2 text-right text-din-muted font-medium">
                    Total
                  </th>
                  <th className="px-3 py-2 text-center text-din-muted font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-din-muted"
                    >
                      No orders today
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const { grandTotal } = computeGrandTotal(o);
                    const itemCount = o.items
                      .filter((i) => !SPECIAL_ITEMS.includes(i.name))
                      .reduce((s, i) => s + Number(i.quantity), 0);
                    return (
                      <tr
                        key={o.id.toString()}
                        className="border-t border-din-border hover:bg-din-surface-alt transition-colors"
                      >
                        <td className="px-3 py-2 text-din-text font-mono">
                          #{Number(o.id).toString().padStart(4, "0")}
                        </td>
                        <td className="px-3 py-2 text-din-text">
                          {o.vehicleInfo.licensePlate}
                        </td>
                        <td className="px-3 py-2 text-right text-din-muted">
                          {itemCount}
                        </td>
                        <td className="px-3 py-2 text-right text-din-teal font-medium">
                          ₹{grandTotal.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              o.status === OrderStatus.fulfilled
                                ? "bg-din-green/20 text-din-green"
                                : o.status === OrderStatus.ready
                                  ? "bg-din-teal/20 text-din-teal"
                                  : o.status === OrderStatus.preparing
                                    ? "bg-din-orange/20 text-din-orange"
                                    : "bg-din-red/20 text-din-red"
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {orders.length > 0 && (
                <tfoot className="bg-din-surface-alt border-t-2 border-din-border">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-2 text-din-text font-semibold text-right"
                    >
                      Grand Total
                    </td>
                    <td className="px-3 py-2 text-right text-din-teal font-bold">
                      ₹{totals.revenue.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
