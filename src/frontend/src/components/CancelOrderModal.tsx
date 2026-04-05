import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { Order } from "../backend";

interface CancelOrderModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onConfirm: (orderId: bigint, reason: string) => Promise<void>;
}

export function CancelOrderModal({
  open,
  order,
  onClose,
  onConfirm,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const orderNum = Number(order.id).toString().padStart(4, "0");
  const canConfirm = reason.trim().length >= 3;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsSubmitting(true);
    try {
      await onConfirm(order.id, reason.trim());
      setReason("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        data-ocid="cancel_order.dialog"
        className="bg-din-surface border-din-border text-din-text max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="text-din-text flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-din-red" />
            Cancel Order #{orderNum}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-din-red/10 border border-din-red/20 rounded-md px-3 py-2">
            <p className="text-xs text-din-red">
              This action will cancel the order and cannot be undone.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-din-muted">
              Reason for cancellation *
            </Label>
            <Textarea
              data-ocid="cancel_order.textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason (e.g. Customer request, Out of stock...)"
              className="bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 resize-none text-sm min-h-[80px]"
              disabled={isSubmitting}
            />
            {reason.length > 0 && reason.trim().length < 3 && (
              <p
                className="text-[11px] text-din-red"
                data-ocid="cancel_order.error_state"
              >
                Reason must be at least 3 characters
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row">
          <Button
            data-ocid="cancel_order.cancel_button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 border-din-border text-din-muted hover:bg-din-surface-alt h-8 text-xs"
          >
            Go Back
          </Button>
          <Button
            data-ocid="cancel_order.confirm_button"
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting}
            className="flex-1 bg-din-red hover:bg-din-red/80 text-white font-semibold h-8 text-xs disabled:opacity-50"
          >
            {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
