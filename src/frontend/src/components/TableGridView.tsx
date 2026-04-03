import { Button } from "@/components/ui/button";
import { Printer, Receipt } from "lucide-react";
import { useState } from "react";
import type { Order, OrderItem } from "../backend";
import { OrderStatus } from "../backend";
import type { MenuItem } from "../types/menu";
import { AddItemsModal } from "./AddItemsModal";
import { IssueBillModal } from "./IssueBillModal";

interface TableGridViewProps {
  orders: Order[];
  menuItems: MenuItem[];
  onAddItems: (
    orderId: bigint,
    newItems: OrderItem[],
    packingCharge: bigint,
    deliveryCharge: bigint,
  ) => Promise<void>;
  onUpdateStatus: (orderId: bigint, status: OrderStatus) => void;
}

interface FloorSection {
  name: string;
  prefix: string;
  count: number;
}

const FLOORS: FloorSection[] = [
  { name: "DG", prefix: "DG", count: 6 },
  { name: "DM", prefix: "DM", count: 6 },
  { name: "SG", prefix: "SG", count: 6 },
  { name: "SM", prefix: "SM", count: 6 },
  { name: "FF", prefix: "FF", count: 15 },
  { name: "FFD", prefix: "FFD", count: 12 },
];

const FLOOR_NAMES = [
  "Dinki Ground",
  "Dinki Mezzanine",
  "Sasural Ground",
  "Sasural Mezzanine",
  "First Floor",
  "First Floor Delux",
];

const SPECIAL_ITEMS = ["Packing Charges", "Delivery Charge"];

function calcGrandTotal(order: Order) {
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
  const totalItemCount = regularItems.reduce(
    (s, i) => s + Number(i.quantity),
    0,
  );
  return {
    grandTotal: itemsTotal + sgst + cgst + packing + delivery,
    totalItemCount,
    regularItems,
  };
}

function formatOrderTime(timestampNs: bigint): string {
  const ms = Number(timestampNs) / 1_000_000;
  const date = new Date(ms);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface TableCardOccupiedProps {
  tableId: string;
  order: Order;
  menuItems: MenuItem[];
  onAddItems: TableGridViewProps["onAddItems"];
  onUpdateStatus: TableGridViewProps["onUpdateStatus"];
  index: number;
}

function TableCardOccupied({
  tableId,
  order,
  menuItems,
  onAddItems,
  onUpdateStatus,
  index,
}: TableCardOccupiedProps) {
  const [showAddItems, setShowAddItems] = useState(false);
  const [showIssueBill, setShowIssueBill] = useState(false);

  const { grandTotal, totalItemCount, regularItems } = calcGrandTotal(order);

  const printerLookup = new Map<string, number>();
  for (const m of menuItems) {
    printerLookup.set(m.name, Number(m.printerNumber));
  }

  const handlePrintKOT = (e: React.MouseEvent) => {
    e.stopPropagation();
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

    const byPrinter = new Map<number, typeof regularItems>();
    for (const item of regularItems) {
      const printer = printerLookup.get(item.name) ?? 1;
      if (!byPrinter.has(printer)) byPrinter.set(printer, []);
      byPrinter.get(printer)!.push(item);
    }
    if (byPrinter.size === 0) byPrinter.set(1, regularItems);

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
      win.document.write(`<html><head><title>KOT #${kotNo} – Kitchen ${printer}</title><style>
      body { font-family: monospace; font-size: 13px; padding: 16px; margin: 0; }
      .center { text-align: center; }
      pre { margin: 0; white-space: pre-wrap; }
    </style></head><body>
    <pre class="center">=====================================
         DINKI DINE
      Dine-In &amp; Takeaway
=====================================
  KITCHEN STATION ${printer}
=====================================
  KOT No: ${kotNo}
  Date: ${dateStr}   Time: ${timeStr}
-------------------------------------
  Table: ${order.vehicleInfo.licensePlate}
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
      <button
        type="button"
        data-ocid={`table_grid.item.${index}`}
        className="relative rounded-xl cursor-pointer select-none overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] text-left w-full"
        style={{ background: "#8B1A4A" }}
        onClick={() => setShowAddItems(true)}
      >
        <div className="p-3 flex flex-col gap-1">
          {/* Table ID */}
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-sm tracking-wide">
              {tableId}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/20 text-white">
              {order.status}
            </span>
          </div>

          {/* Grand Total */}
          <div className="text-white font-bold text-lg leading-tight">
            ₹{grandTotal.toFixed(0)}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-[11px] text-white/80">
            <span>🕐 {formatOrderTime(order.timestamp)}</span>
            <span>⏳ {totalItemCount} items</span>
          </div>

          {/* Staff */}
          {order.customerMobile && (
            <div className="text-[11px] text-white/70 truncate">
              {order.customerMobile}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1.5 mt-1">
            <Button
              data-ocid={`table_grid.secondary_button.${index}`}
              size="sm"
              onClick={handlePrintKOT}
              className="flex-1 h-7 text-[11px] px-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 font-medium"
            >
              <Printer className="w-3 h-3 mr-1" />
              KOT
            </Button>
            <Button
              data-ocid={`table_grid.open_modal_button.${index}`}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowIssueBill(true);
              }}
              className="flex-1 h-7 text-[11px] px-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 font-semibold"
            >
              <Receipt className="w-3 h-3 mr-1" />
              Bill
            </Button>
          </div>
        </div>
      </button>

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

function TableCardEmpty({ tableId }: { tableId: string }) {
  return (
    <div className="rounded-xl border border-din-border bg-din-surface-alt flex flex-col items-center justify-center p-3 min-h-[100px]">
      <span className="text-xs font-semibold text-din-text mb-1">
        {tableId}
      </span>
      <span className="text-[10px] font-medium text-din-muted uppercase tracking-widest">
        Empty
      </span>
    </div>
  );
}

export function TableGridView({
  orders,
  menuItems,
  onAddItems,
  onUpdateStatus,
}: TableGridViewProps) {
  const [activeFloor, setActiveFloor] = useState(0);

  const tableOrderMap = new Map<string, Order>();
  for (const order of orders) {
    if (order.status !== OrderStatus.fulfilled) {
      tableOrderMap.set(order.vehicleInfo.licensePlate, order);
    }
  }

  const floor = FLOORS[activeFloor];
  const tables = Array.from(
    { length: floor.count },
    (_, i) => `${floor.prefix}-${i + 1}`,
  );

  return (
    <div className="flex flex-col h-full">
      {/* Floor tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
        {FLOORS.map((f, i) => (
          <button
            key={f.prefix}
            type="button"
            data-ocid="table_grid.tab"
            onClick={() => setActiveFloor(i)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
              i === activeFloor
                ? "bg-din-teal/20 border-din-teal/50 text-din-teal"
                : "bg-din-surface-alt border-din-border text-din-muted hover:text-din-text hover:border-din-muted"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Floor name */}
      <div className="mb-2">
        <span className="text-xs font-semibold text-din-teal uppercase tracking-wider">
          {FLOOR_NAMES[activeFloor]}
        </span>
        <span className="ml-2 text-[10px] text-din-muted">
          {floor.prefix}-1 – {floor.prefix}-{floor.count}
        </span>
      </div>

      {/* Table grid */}
      <div className="overflow-y-auto flex-1">
        <div className="grid grid-cols-3 gap-2 pb-4">
          {tables.map((tableId, i) => {
            const order = tableOrderMap.get(tableId);
            return order ? (
              <TableCardOccupied
                key={tableId}
                tableId={tableId}
                order={order}
                menuItems={menuItems}
                onAddItems={onAddItems}
                onUpdateStatus={onUpdateStatus}
                index={i + 1}
              />
            ) : (
              <TableCardEmpty key={tableId} tableId={tableId} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
