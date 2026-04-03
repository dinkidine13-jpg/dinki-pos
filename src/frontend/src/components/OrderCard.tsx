import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Package,
  Phone,
  PlusCircle,
  Printer,
  Receipt,
} from "lucide-react";
import { useState } from "react";
import type { Order, OrderItem } from "../backend";
import { OrderStatus } from "../backend";
import type { MenuItem } from "../types/menu";
import { AddItemsModal } from "./AddItemsModal";
import { IssueBillModal } from "./IssueBillModal";

// Drive-In / TakeAway detection helpers
function isDriveInOrder(order: Order): boolean {
  return order.vehicleInfo.model === "DRIVE-IN";
}
function isTakeAwayOrder(order: Order): boolean {
  return order.vehicleInfo.licensePlate?.startsWith("TAKEAWAY-") ?? false;
}

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (orderId: bigint, status: OrderStatus) => void;
  onAddItems: (
    orderId: bigint,
    newItems: OrderItem[],
    packingCharge: bigint,
    deliveryCharge: bigint,
  ) => Promise<void>;
  index: number;
  menuItems?: MenuItem[];
}

function formatTime(timestampNs: bigint): string {
  const ms = Number(timestampNs) / 1_000_000;
  const date = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmt(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> =
  {
    [OrderStatus.pending]: {
      label: "Pending",
      className: "bg-din-orange/20 text-din-orange border-din-orange/30",
    },
    [OrderStatus.preparing]: {
      label: "Preparing",
      className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    [OrderStatus.ready]: {
      label: "Ready",
      className: "bg-din-green/20 text-din-green border-din-green/30",
    },
    [OrderStatus.fulfilled]: {
      label: "Fulfilled",
      className: "bg-din-muted/20 text-din-muted border-din-muted/30",
    },
  };

const SPECIAL_ITEMS = ["Packing Charges", "Delivery Charge"];

export function OrderCard({
  order,
  onUpdateStatus,
  onAddItems,
  index,
  menuItems,
}: OrderCardProps) {
  const [showAddItems, setShowAddItems] = useState(false);
  const [showIssueBill, setShowIssueBill] = useState(false);

  const statusCfg = STATUS_CONFIG[order.status];

  const regularItems = order.items.filter(
    (i) => !SPECIAL_ITEMS.includes(i.name),
  );
  const packingItem = order.items.find((i) => i.name === "Packing Charges");
  const deliveryItem = order.items.find((i) => i.name === "Delivery Charge");

  const totalItems = regularItems.reduce((s, i) => s + Number(i.quantity), 0);

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
  const grandTotal = itemsTotal + sgst + cgst + packing + delivery;

  const isOpen = order.status !== OrderStatus.fulfilled;

  // Build a lookup: item name -> printerNumber
  const printerLookup = new Map<string, number>();
  if (menuItems) {
    for (const m of menuItems) {
      printerLookup.set(m.name, Number(m.printerNumber));
    }
  }

  const handlePrintKOT = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const kotNo = Number(order.id).toString().padStart(4, "0");

    // Group items by printer
    const byPrinter = new Map<number, typeof regularItems>();
    for (const item of regularItems) {
      const printer = printerLookup.get(item.name) ?? 1;
      if (!byPrinter.has(printer)) byPrinter.set(printer, []);
      byPrinter.get(printer)!.push(item);
    }
    // If no printer info, treat all as printer 1
    if (byPrinter.size === 0) {
      byPrinter.set(1, regularItems);
    }

    // Open one print window per printer
    for (const [printer, items] of Array.from(byPrinter.entries()).sort(
      (a, b) => a[0] - b[0],
    )) {
      const itemLines = items
        .map(
          (item, idx) =>
            `  ${idx + 1}. ${item.name.padEnd(22)} x${Number(item.quantity)}`,
        )
        .join("\n");

      const win = window.open("", "_blank", "width=400,height=600");
      if (!win) continue;
      const orderTypeLabel = isDriveInOrder(order)
        ? "DRIVE-IN"
        : isTakeAwayOrder(order)
          ? "TAKE AWAY"
          : "DINE-IN";
      const locationLabel = isDriveInOrder(order) ? "Car No" : "Table";
      const locationValue = isDriveInOrder(order)
        ? order.vehicleInfo.licensePlate
        : isTakeAwayOrder(order)
          ? order.vehicleInfo.licensePlate.replace("TAKEAWAY-", "")
          : order.vehicleInfo.licensePlate;
      const carDetails =
        isDriveInOrder(order) &&
        (order.vehicleInfo.make !== "N/A" || order.vehicleInfo.color !== "N/A")
          ? `  Car: ${[order.vehicleInfo.make, order.vehicleInfo.color].filter((v) => v && v !== "N/A").join(", ")}`
          : "";
      win.document.write(`<html><head><title>KOT #${kotNo} – Kitchen ${printer}</title><style>
      body { font-family: monospace; font-size: 13px; padding: 16px; margin: 0; }
      .center { text-align: center; }
      .divider { border: none; border-top: 1px dashed #000; margin: 8px 0; }
      pre { margin: 0; white-space: pre-wrap; }
    </style></head><body>
    <pre class="center">=====================================
         DINKI DINE
      ${orderTypeLabel}
=====================================
  KITCHEN STATION ${printer}
=====================================
  KOT No: ${kotNo}
  Date: ${dateStr}   Time: ${timeStr}
-------------------------------------
  ${locationLabel}: ${locationValue}${
    carDetails
      ? `
${carDetails}`
      : ""
  }
-------------------------------------
  ITEMS:
${itemLines}
-------------------------------------
        ** KITCHEN COPY **
=====================================</pre>
    </body></html>`);
      win.document.close();
      win.focus();
      win.print();
      win.close();
    }
  };

  return (
    <>
      <div
        data-ocid={`orders.item.${index}`}
        className="bg-din-surface border border-din-border rounded-lg p-4 shadow-card"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${isDriveInOrder(order) ? "text-yellow-400" : isTakeAwayOrder(order) ? "text-din-orange" : "text-din-teal"}`}
              >
                {isDriveInOrder(order)
                  ? "Car"
                  : isTakeAwayOrder(order)
                    ? "Take Away"
                    : "Table"}
              </span>
              <span className="text-sm font-bold font-mono text-din-text bg-din-surface-alt px-2 py-0.5 rounded border border-din-border">
                {isDriveInOrder(order)
                  ? order.vehicleInfo.licensePlate
                  : isTakeAwayOrder(order)
                    ? order.vehicleInfo.licensePlate.replace("TAKEAWAY-", "")
                    : order.vehicleInfo.licensePlate}
              </span>
            </div>
            {isDriveInOrder(order) &&
              (order.vehicleInfo.make !== "N/A" ||
                order.vehicleInfo.color !== "N/A") && (
                <span className="text-[10px] text-din-muted pl-0.5">
                  {[order.vehicleInfo.make, order.vehicleInfo.color]
                    .filter((v) => v && v !== "N/A")
                    .join(" • ")}
                </span>
              )}
          </div>
          <Badge
            className={`text-[10px] border ${statusCfg.className} bg-transparent`}
          >
            {statusCfg.label}
          </Badge>
        </div>

        {/* Order meta */}
        <div className="flex items-center gap-4 mb-3 text-xs text-din-muted">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            Order #{Number(order.id).toString().padStart(4, "0")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(order.timestamp)}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {order.customerMobile}
          </span>
        </div>

        {/* Items */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {regularItems.map((item) => {
              const printer = printerLookup.get(item.name);
              return (
                <span
                  key={item.name}
                  className="text-[11px] px-2 py-0.5 rounded bg-din-surface-alt border border-din-border text-din-text"
                  title={printer ? `Kitchen ${printer}` : undefined}
                >
                  {item.name} ×{Number(item.quantity)}
                  {printer && (
                    <span className="ml-1 text-[9px] text-din-muted opacity-60">
                      K{printer}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          <p className="text-[11px] text-din-muted mt-1">
            {totalItems} item{totalItems !== 1 ? "s" : ""} total
          </p>
        </div>

        {/* Invoice Summary — always visible */}
        <div className="border-t border-din-border/60 pt-2 mb-3">
          <div className="space-y-0.5">
            <div className="flex justify-between text-[11px] text-din-muted">
              <span>Items Total</span>
              <span>{fmt(itemsTotal)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-din-muted">
              <span>SGST (2.5%)</span>
              <span>{fmt(sgst)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-din-muted">
              <span>CGST (2.5%)</span>
              <span>{fmt(cgst)}</span>
            </div>
            {packing > 0 && (
              <div className="flex justify-between text-[11px] text-din-muted">
                <span>Packing</span>
                <span>{fmt(packing)}</span>
              </div>
            )}
            {delivery > 0 && (
              <div className="flex justify-between text-[11px] text-din-muted">
                <span>Delivery</span>
                <span>{fmt(delivery)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-din-border/60 mt-1.5 pt-1.5 flex justify-between text-[12px] font-semibold text-din-text">
            <span>Grand Total</span>
            <span className="text-din-teal">{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {order.status === OrderStatus.pending && (
            <Button
              data-ocid={`orders.primary_button.${index}`}
              size="sm"
              onClick={() => onUpdateStatus(order.id, OrderStatus.preparing)}
              className="h-7 text-xs px-3 bg-din-orange hover:bg-din-orange/80 text-white font-semibold"
            >
              <ChefHat className="w-3 h-3 mr-1" />
              Accept
            </Button>
          )}
          {order.status === OrderStatus.preparing && (
            <Button
              data-ocid={`orders.primary_button.${index}`}
              size="sm"
              onClick={() => onUpdateStatus(order.id, OrderStatus.ready)}
              className="h-7 text-xs px-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Mark Ready
            </Button>
          )}
          {order.status === OrderStatus.ready && (
            <Button
              data-ocid={`orders.primary_button.${index}`}
              size="sm"
              onClick={() => onUpdateStatus(order.id, OrderStatus.fulfilled)}
              className="h-7 text-xs px-3 bg-din-green hover:bg-din-green/80 text-white font-semibold"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Fulfill
            </Button>
          )}
          {order.status === OrderStatus.fulfilled && (
            <span className="text-xs text-din-muted flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-din-green" />
              Completed
            </span>
          )}

          {/* Tab buttons — only for open orders */}
          {isOpen && (
            <>
              <Button
                data-ocid={`orders.secondary_button.${index}`}
                size="sm"
                onClick={() => setShowAddItems(true)}
                className="h-7 text-xs px-3 bg-din-surface-alt hover:bg-din-border border border-din-border text-din-text font-medium"
              >
                <PlusCircle className="w-3 h-3 mr-1 text-din-teal" />
                Add Items
              </Button>
              <Button
                data-ocid={`orders.secondary_button.${index}`}
                size="sm"
                onClick={handlePrintKOT}
                className="h-7 text-xs px-3 bg-din-surface-alt hover:bg-din-border border border-din-border text-din-muted font-medium"
              >
                <Printer className="w-3 h-3 mr-1" />
                Print KOT
              </Button>
              <Button
                data-ocid={`orders.open_modal_button.${index}`}
                size="sm"
                onClick={() => setShowIssueBill(true)}
                className="h-7 text-xs px-3 bg-din-teal/20 hover:bg-din-teal/30 border border-din-teal/40 text-din-teal font-semibold"
              >
                <Receipt className="w-3 h-3 mr-1" />
                Issue Bill
              </Button>
            </>
          )}
        </div>
      </div>

      <AddItemsModal
        open={showAddItems}
        order={order}
        onClose={() => setShowAddItems(false)}
        onSubmit={onAddItems}
      />

      <IssueBillModal
        open={showIssueBill}
        order={order}
        onClose={() => setShowIssueBill(false)}
        onCloseTab={async (orderId) => {
          await onUpdateStatus(orderId, OrderStatus.fulfilled);
        }}
      />
    </>
  );
}
