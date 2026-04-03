import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Printer, Search } from "lucide-react";
import { useState } from "react";
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

function fmt(n: number) {
  return `₹${n.toFixed(2)}`;
}

function printInvoice(order: Order) {
  const { itemsTotal, sgst, cgst, packing, delivery, grandTotal } =
    computeGrandTotal(order);
  const regularItems = order.items.filter(
    (i) => !SPECIAL_ITEMS.includes(i.name),
  );
  const upiUrl = `upi://pay?pa=Paytm-31587057%40ptys&pn=DinkiDine&am=${grandTotal.toFixed(2)}&cu=INR`;
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(`
    <html><head><title>Invoice #${Number(order.id).toString().padStart(4, "0")}</title></head>
    <body style="font-family:monospace;font-size:12px;padding:20px;max-width:300px;margin:0 auto">
    <div style="text-align:center"><b>DINKI DINE</b><br/>Dine-In &amp; Takeaway<br/>Invoice #${Number(order.id).toString().padStart(4, "0")}</div>
    <hr/>
    <div>Table: ${order.vehicleInfo.licensePlate}</div>
    <hr/>
    ${regularItems.map((i) => `<div style="display:flex;justify-content:space-between"><span>${i.name} x${Number(i.quantity)}</span><span>${fmt(Number(i.price) * Number(i.quantity))}</span></div>`).join("")}
    <hr/>
    <div style="display:flex;justify-content:space-between"><span>Items Total</span><span>${fmt(itemsTotal)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>SGST (2.5%)</span><span>${fmt(sgst)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>CGST (2.5%)</span><span>${fmt(cgst)}</span></div>
    ${packing > 0 ? `<div style="display:flex;justify-content:space-between"><span>Packing</span><span>${fmt(packing)}</span></div>` : ""}
    ${delivery > 0 ? `<div style="display:flex;justify-content:space-between"><span>Delivery</span><span>${fmt(delivery)}</span></div>` : ""}
    <hr/>
    <div style="display:flex;justify-content:space-between;font-weight:bold"><span>GRAND TOTAL</span><span>${fmt(grandTotal)}</span></div>
    <div style="text-align:center;margin-top:10px">
      <p style="font-size:10px">Scan to Pay</p>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(upiUrl)}" width="120" height="120"/>
      <p style="font-size:9px">Paytm-31587057@ptys</p>
    </div>
    <p style="text-align:center;font-size:10px">Thank you for dining with us!</p>
    </body></html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

interface InvoiceListScreenProps {
  orders: Order[];
  onBack: () => void;
}

export function InvoiceListScreen({ orders, onBack }: InvoiceListScreenProps) {
  const [search, setSearch] = useState("");

  const fulfilledOrders = orders.filter(
    (o) => o.status === OrderStatus.fulfilled,
  );
  const filtered = fulfilledOrders.filter(
    (o) =>
      !search ||
      o.vehicleInfo.licensePlate.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-din-surface border-b border-din-border px-4 h-14 flex items-center gap-3">
        <button
          type="button"
          data-ocid="invoice_list.button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-din-surface-alt text-din-muted hover:text-din-text transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-din-text text-base flex-1">
          Invoice List
        </h1>
        <span className="text-xs text-din-muted">
          {filtered.length} invoices
        </span>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-din-muted" />
          <Input
            data-ocid="invoice_list.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by table name..."
            className="pl-8 bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 h-9 text-sm"
          />
        </div>

        <div className="rounded-lg border border-din-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-din-surface-alt">
              <tr>
                <th className="px-3 py-2 text-left text-din-muted font-medium">
                  Invoice #
                </th>
                <th className="px-3 py-2 text-left text-din-muted font-medium">
                  Table
                </th>
                <th className="px-3 py-2 text-right text-din-muted font-medium hidden sm:table-cell">
                  Items Total
                </th>
                <th className="px-3 py-2 text-right text-din-muted font-medium hidden sm:table-cell">
                  Tax
                </th>
                <th className="px-3 py-2 text-right text-din-muted font-medium">
                  Grand Total
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
                    <span data-ocid="invoice_list.empty_state">
                      No invoices found
                    </span>
                  </td>
                </tr>
              ) : (
                filtered.map((o, i) => {
                  const { itemsTotal, sgst, cgst, grandTotal } =
                    computeGrandTotal(o);
                  const time = new Date(
                    Number(o.timestamp) / 1_000_000,
                  ).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <tr
                      key={o.id.toString()}
                      data-ocid={`invoice_list.item.${i + 1}`}
                      className="border-t border-din-border hover:bg-din-surface-alt transition-colors"
                    >
                      <td className="px-3 py-2 text-din-text font-mono">
                        #{Number(o.id).toString().padStart(4, "0")}
                      </td>
                      <td className="px-3 py-2 text-din-text">
                        {o.vehicleInfo.licensePlate}
                      </td>
                      <td className="px-3 py-2 text-right text-din-muted hidden sm:table-cell">
                        ₹{itemsTotal.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-right text-din-muted hidden sm:table-cell">
                        ₹{(sgst + cgst).toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-right text-din-teal font-medium">
                        ₹{grandTotal.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-din-muted hidden md:table-cell">
                        {time}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          data-ocid={`invoice_list.button.${i + 1}`}
                          size="sm"
                          variant="outline"
                          onClick={() => printInvoice(o)}
                          className="h-6 px-2 text-[10px] border-din-border text-din-muted hover:bg-din-surface-alt"
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          Print
                        </Button>
                      </td>
                    </tr>
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
