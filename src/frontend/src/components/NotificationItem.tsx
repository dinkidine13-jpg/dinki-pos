import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import type { Notification } from "../backend";

interface NotificationItemProps {
  notification: Notification;
  onAcknowledge: (id: bigint) => void;
  index: number;
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

export function NotificationItem({
  notification,
  onAcknowledge,
  index,
}: NotificationItemProps) {
  const isNew = !notification.acknowledged;

  return (
    <div
      data-ocid={`notifications.item.${index}`}
      className={`relative flex gap-0 rounded-lg overflow-hidden border transition-all ${
        isNew
          ? "border-din-teal/50 bg-din-surface shadow-card"
          : "border-din-border bg-din-surface/50 opacity-70"
      }`}
    >
      {/* Left accent bar */}
      <div
        className={`w-1 flex-shrink-0 ${isNew ? "bg-din-teal" : "bg-din-border"}`}
      />

      <div className="flex-1 p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Bell
              className={`w-3.5 h-3.5 ${isNew ? "text-din-teal" : "text-din-muted"}`}
            />
            <span className="text-xs font-semibold text-din-text">
              Order #{Number(notification.orderId).toString().padStart(4, "0")}
            </span>
            {isNew && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-din-orange text-white uppercase tracking-wide">
                New
              </span>
            )}
          </div>
          <span className="text-[10px] text-din-muted flex-shrink-0">
            {formatTime(notification.timestamp)}
          </span>
        </div>

        <p className="text-xs text-din-muted mb-2 leading-relaxed">
          {notification.message}
        </p>

        {isNew && (
          <Button
            data-ocid={`notifications.confirm_button.${index}`}
            size="sm"
            onClick={() => onAcknowledge(notification.id)}
            className="h-7 text-xs px-3 bg-din-teal hover:bg-din-teal/80 text-din-bg font-semibold"
          >
            <Check className="w-3 h-3 mr-1" />
            Acknowledge
          </Button>
        )}
      </div>
    </div>
  );
}
