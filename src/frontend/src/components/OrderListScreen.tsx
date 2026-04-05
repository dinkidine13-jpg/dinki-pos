import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronLeft, ChevronUp, Search } from "lucide-react";
import { useState } from "react";
import type { Order } from "../backend";
import { OrderStatus } from "../backend";

const SPECIAL_ITEMS = ["Packing Charges", "Delivery Charge"];

function statusColor(status: string) {
  switch (status) {
    case OrderStatus.fulfilled:
      return "bg-din-green/20 text-din-green border-din-green/30";
    case OrderStatus.ready:
      return "bg-din-teal/20 text-din-teal border-din-teal/30";
    case OrderStatus.preparing:
      return "bg-din-orange/20 text-din-orange border-din-orange/30";
    case OrderStatus.cancelled:
      return "bg-din-red/20 text-din-red border-din-red/30";
    default:
      return "bg-din-muted/20 text-din-muted border-din-muted/30";
  }
}

type FilterValue =
  | "all"
  | "pending"
  | "preparing"
  | "ready"
  | "fulfilled"
  | "cancelled";

interface OrderListScreenProps {
  orders: Order[];
  onBack: () => void;
  defaultFilter?: FilterValue;
}

export function OrderListScreen({
  orders,
  onBack,
  defaultFilter = "all",
}: OrderListScreenProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>(defaultFilter);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const FILTER_PILLS: { key: FilterValue; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready" },
    { key: "fulfilled", label: "Fulfilled" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.vehicleInfo.licensePlate.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-din-surface border-b border-din-border px-4 h-14 flex items-center gap-3">
        <button
          type="button"
          data-ocid="order_list.button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-din-surface-alt text-din-muted hover:text-din-text transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-din-text text-base flex-1">
          {defaultFilter === "cancelled" ? "Cancelled Orders" : "Order List"}
        </h1>
        <span className="text-xs text-din-muted">{filtered.length} orders</span>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-din-muted" />
          <Input
            data-ocid="order_list.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by table name..."
            className="pl-8 bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 h-9 text-sm"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_PILLS.map((pill) => (
            <button
              type="button"
              key={pill.key}
              data-ocid="order_list.tab"
              onClick={() => setFilter(pill.key)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors border ${
                filter === pill.key
                  ? pill.key === "cancelled"
                    ? "bg-din-red/20 border-din-red/50 text-din-red"
                    : "bg-din-teal/20 border-din-teal/50 text-din-teal"
                  : "border-din-border text-din-muted hover:text-din-text hover:border-din-muted"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Table */}
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
                <th className="px-3 py-2 text-right text-din-muted font-medium hidden sm:table-cell">
                  Items
                </th>
                <th className="px-3 py-2 text-right text-din-muted font-medium">
                  Total
                </th>
                <th className="px-3 py-2 text-center text-din-muted font-medium">
                  Status
                </th>
                <th className="px-3 py-2 text-right text-din-muted font-medium hidden md:table-cell">
                  Time
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-din-muted"
                  >
                    <span data-ocid="order_list.empty_state">
                      No orders found
                    </span>
                  </td>
                </tr>
              ) : (
                filtered.map((o, i) => {
                  const regularItems = o.items.filter(
                    (x) => !SPECIAL_ITEMS.includes(x.name),
                  );
                  const total = regularItems.reduce(
                    (s, x) => s + Number(x.price) * Number(x.quantity),
                    0,
                  );
                  const tax = total * 0.05;
                  const extra = o.items
                    .filter((x) => SPECIAL_ITEMS.includes(x.name))
                    .reduce(
                      (s, x) => s + Number(x.price) * Number(x.quantity),
                      0,
                    );
                  const grandTotal = total + tax + extra;
                  const time = new Date(
                    Number(o.timestamp) / 1_000_000,
                  ).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const isExpanded = expandedId === o.id.toString();
                  const isCancelled = o.status === OrderStatus.cancelled;
                  return (
                    <>
                      <tr
                        key={o.id.toString()}
                        data-ocid={`order_list.item.${i + 1}`}
                        className={`border-t border-din-border hover:bg-din-surface-alt transition-colors cursor-pointer ${
                          isCancelled ? "opacity-70" : ""
                        }`}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : o.id.toString())
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            setExpandedId(isExpanded ? null : o.id.toString());
                        }}
                      >
                        <td className="px-3 py-2 text-din-text font-mono">
                          #{Number(o.id).toString().padStart(4, "0")}
                        </td>
                        <td className="px-3 py-2 text-din-text">
                          {o.vehicleInfo.licensePlate}
                        </td>
                        <td className="px-3 py-2 text-right text-din-muted hidden sm:table-cell">
                          {regularItems.reduce(
                            (s, x) => s + Number(x.quantity),
                            0,
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-din-teal font-medium">
                          \u20B9{grandTotal.toFixed(0)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            className={`text-[10px] border ${statusColor(o.status)}`}
                          >
                            {o.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right text-din-muted hidden md:table-cell">
                          {time}
                        </td>
                        <td className="px-3 py-2 text-right text-din-muted">
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 inline" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 inline" />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr
                          key={`${o.id}-expanded`}
                          className="bg-din-surface-alt border-t border-din-border"
                        >
                          <td colSpan={7} className="px-4 py-3">
                            <div className="space-y-1">
                              {isCancelled && o.cancellationReason && (
                                <div className="mb-2 px-2 py-1.5 rounded bg-din-red/10 border border-din-red/20">
                                  <p className="text-[11px] text-din-red">
                                    <span className="font-semibold">
                                      Reason:{" "}
                                    </span>
                                    {o.cancellationReason}
                                  </p>
                                </div>
                              )}
                              {regularItems.map((item) => (
                                <div
                                  key={item.name}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-din-text">
                                    {item.name}{" "}
                                    <span className="text-din-muted">
                                      \u00d7{Number(item.quantity)}
                                    </span>
                                  </span>
                                  <span className="text-din-muted">
                                    \u20B9
                                    {(
                                      Number(item.price) * Number(item.quantity)
                                    ).toFixed(0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
