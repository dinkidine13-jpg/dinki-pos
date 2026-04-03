import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, X } from "lucide-react";
import { useState } from "react";
import type { Order } from "../backend";
import { OrderStatus } from "../backend";

const SPECIAL_ITEMS = ["Packing Charges", "Delivery Charge"];

function fmt(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

interface IssueBillModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onCloseTab: (orderId: bigint) => Promise<void>;
}

export function IssueBillModal({
  open,
  order,
  onClose,
  onCloseTab,
}: IssueBillModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  if (!order) return null;

  const isDriveIn = order.vehicleInfo.model === "DRIVE-IN";
  const isTakeAway =
    order.vehicleInfo.licensePlate?.startsWith("TAKEAWAY-") ?? false;

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
  const grandTotal = itemsTotal + sgst + cgst + packing + delivery;

  const upiUrl = `upi://pay?pa=Paytm-31587057%40ptys&pn=DinkiDine&am=${grandTotal.toFixed(2)}&cu=INR`;

  const handleCloseTab = async () => {
    setIsClosing(true);
    try {
      await onCloseTab(order.id);
      onClose();
    } finally {
      setIsClosing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-invoice { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          data-ocid="issue_bill.dialog"
          className="bg-din-surface border-din-border text-din-text max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="text-din-text text-center">
              Final Bill
            </DialogTitle>
          </DialogHeader>

          {/* Invoice */}
          <div className="print-invoice font-mono text-[12px] bg-din-surface-alt rounded border border-din-border p-4 space-y-2">
            {/* Header */}
            <div className="text-center space-y-0.5">
              <p className="font-bold text-din-teal text-sm tracking-wider">
                DINKI DINE
              </p>
              <p className="text-din-muted text-[10px]">
                {isDriveIn ? "Drive-In" : isTakeAway ? "Take Away" : "Dine-In"}
              </p>
              <p className="text-din-muted text-[10px]">
                Order #{Number(order.id).toString().padStart(4, "0")}
              </p>
            </div>

            <div className="border-t border-dashed border-din-border/60 pt-2">
              <p className="text-din-text">
                <span className="text-din-muted">
                  {isDriveIn
                    ? "Car No: "
                    : isTakeAway
                      ? "Customer: "
                      : "Table: "}
                </span>
                {isDriveIn
                  ? order.vehicleInfo.licensePlate
                  : isTakeAway
                    ? order.vehicleInfo.licensePlate.replace("TAKEAWAY-", "")
                    : order.vehicleInfo.licensePlate}
              </p>
              {isDriveIn &&
                (order.vehicleInfo.make !== "N/A" ||
                  order.vehicleInfo.color !== "N/A") && (
                  <p className="text-din-text">
                    <span className="text-din-muted">Car: </span>
                    {[order.vehicleInfo.make, order.vehicleInfo.color]
                      .filter((v) => v && v !== "N/A")
                      .join(", ")}
                  </p>
                )}
              <p className="text-din-text">
                <span className="text-din-muted">Mobile: </span>
                {order.customerMobile}
              </p>
            </div>

            <div className="border-t border-dashed border-din-border/60 pt-2 space-y-1">
              {regularItems.map((item) => (
                <div key={item.name} className="flex justify-between">
                  <span className="text-din-text truncate mr-2">
                    {item.name}{" "}
                    <span className="text-din-muted">
                      ×{Number(item.quantity)}
                    </span>
                  </span>
                  <span className="text-din-text flex-shrink-0">
                    {fmt(Number(item.price) * Number(item.quantity))}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-din-border/60 pt-2 space-y-0.5">
              <div className="flex justify-between text-din-muted">
                <span>Items Total</span>
                <span>{fmt(itemsTotal)}</span>
              </div>
              <div className="flex justify-between text-din-muted">
                <span>SGST (2.5%)</span>
                <span>{fmt(sgst)}</span>
              </div>
              <div className="flex justify-between text-din-muted">
                <span>CGST (2.5%)</span>
                <span>{fmt(cgst)}</span>
              </div>
              {packing > 0 && (
                <div className="flex justify-between text-din-muted">
                  <span>Packing</span>
                  <span>{fmt(packing)}</span>
                </div>
              )}
              {delivery > 0 && (
                <div className="flex justify-between text-din-muted">
                  <span>Delivery</span>
                  <span>{fmt(delivery)}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-din-teal/40 pt-2 flex justify-between font-bold">
              <span className="text-din-text">GRAND TOTAL</span>
              <span className="text-din-teal text-base">{fmt(grandTotal)}</span>
            </div>

            {/* UPI QR Code */}
            <div className="border-t border-dashed border-din-border/60 pt-3 flex flex-col items-center gap-1.5">
              <p className="text-[10px] text-din-muted tracking-wide uppercase">
                Scan to Pay
              </p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(upiUrl)}&bgcolor=1a1f2e&color=5eead4`}
                alt="UPI QR Code"
                width={120}
                height={120}
                className="rounded"
              />
              <p className="text-[9px] font-mono text-din-muted/70">
                Paytm-31587057@ptys
              </p>
            </div>

            <p className="text-center text-[10px] text-din-muted pt-2 border-t border-dashed border-din-border/60">
              Thank you for dining with us!
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 mt-2">
            <Button
              data-ocid="issue_bill.secondary_button"
              variant="outline"
              onClick={handlePrint}
              className="flex-1 border-din-border text-din-muted hover:bg-din-surface-alt h-8 text-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print
            </Button>
            <Button
              data-ocid="issue_bill.confirm_button"
              onClick={handleCloseTab}
              disabled={isClosing || order.status === OrderStatus.fulfilled}
              className="flex-1 bg-din-green hover:bg-din-green/80 text-white font-semibold h-8 text-xs"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              {isClosing ? "Closing..." : "Close Tab"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
