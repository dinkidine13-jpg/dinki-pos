import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  FileText,
  Pencil,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Order, OrderItem } from "../backend";
import { OrderStatus } from "../backend";
import type { backendInterface } from "../backend";
import { useActor } from "../hooks/useActor";
import { InvoiceEditModal } from "./InvoiceEditModal";

const PERMISSIONS_KEY = "dinki_role_permissions";
const PRINTER_CONFIG_KEY = "dinki_printer_config";

const ROLES = [
  "Manager",
  "Co-Admin",
  "Captain",
  "Cashier",
  "Waiter",
  "Bar",
  "Customer Order",
] as const;

type Role = (typeof ROLES)[number];

const PERMISSION_COLS = [
  "Place Order",
  "Issue Bill",
  "Menu Admin",
  "Change Timing",
  "Mark Sold",
  "View Reports",
  "Manage Users",
  "Clear Data",
] as const;

type Permission = (typeof PERMISSION_COLS)[number];

type PermissionMap = Record<Role, Record<Permission, boolean>>;

const DEFAULT_PERMISSIONS: PermissionMap = {
  Manager: {
    "Place Order": true,
    "Issue Bill": true,
    "Menu Admin": true,
    "Change Timing": true,
    "Mark Sold": true,
    "View Reports": true,
    "Manage Users": true,
    "Clear Data": true,
  },
  "Co-Admin": {
    "Place Order": true,
    "Issue Bill": true,
    "Menu Admin": true,
    "Change Timing": true,
    "Mark Sold": true,
    "View Reports": true,
    "Manage Users": true,
    "Clear Data": false,
  },
  Captain: {
    "Place Order": true,
    "Issue Bill": true,
    "Menu Admin": false,
    "Change Timing": false,
    "Mark Sold": true,
    "View Reports": true,
    "Manage Users": false,
    "Clear Data": false,
  },
  Cashier: {
    "Place Order": true,
    "Issue Bill": true,
    "Menu Admin": false,
    "Change Timing": false,
    "Mark Sold": true,
    "View Reports": true,
    "Manage Users": false,
    "Clear Data": false,
  },
  Waiter: {
    "Place Order": true,
    "Issue Bill": false,
    "Menu Admin": false,
    "Change Timing": false,
    "Mark Sold": false,
    "View Reports": false,
    "Manage Users": false,
    "Clear Data": false,
  },
  Bar: {
    "Place Order": true,
    "Issue Bill": false,
    "Menu Admin": false,
    "Change Timing": false,
    "Mark Sold": false,
    "View Reports": false,
    "Manage Users": false,
    "Clear Data": false,
  },
  "Customer Order": {
    "Place Order": true,
    "Issue Bill": false,
    "Menu Admin": false,
    "Change Timing": false,
    "Mark Sold": false,
    "View Reports": false,
    "Manage Users": false,
    "Clear Data": false,
  },
};

type ConnectionType = "Bluetooth" | "WiFi" | "USB" | "Cloud";

interface PrinterSlot {
  name: string;
  connectionType: ConnectionType;
  macAddress: string;
  ipAddress: string;
  port: string;
  portName: string;
  endpointUrl: string;
}

const DEFAULT_PRINTER: PrinterSlot = {
  name: "",
  connectionType: "WiFi",
  macAddress: "",
  ipAddress: "",
  port: "9100",
  portName: "",
  endpointUrl: "",
};

function loadPermissions(): PermissionMap {
  try {
    const data = localStorage.getItem(PERMISSIONS_KEY);
    return data ? JSON.parse(data) : DEFAULT_PERMISSIONS;
  } catch {
    return DEFAULT_PERMISSIONS;
  }
}

function savePermissions(perms: PermissionMap) {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
}

function loadPrinterConfig(): PrinterSlot[] {
  try {
    const data = localStorage.getItem(PRINTER_CONFIG_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [1, 2, 3, 4].map((n) => ({
    ...DEFAULT_PRINTER,
    name: `Kitchen Printer ${n}`,
  }));
}

function savePrinterConfig(config: PrinterSlot[]) {
  localStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(config));
}

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
  const subtotal = itemsTotal + sgst + cgst + packing + delivery;
  const discountAmt = Number(order.discount ?? 0n);
  const discountType = order.discountType ?? "flat";
  let discountValue = 0;
  if (discountAmt > 0) {
    if (discountType === "percent") {
      discountValue = subtotal * (discountAmt / 100 / 100);
    } else {
      discountValue = discountAmt / 100;
    }
  }
  const grandTotal = Math.max(0, subtotal - discountValue);
  return {
    itemsTotal,
    sgst,
    cgst,
    packing,
    delivery,
    discountValue,
    grandTotal,
  };
}

function printInvoice(order: Order) {
  const {
    itemsTotal,
    sgst,
    cgst,
    packing,
    delivery,
    discountValue,
    grandTotal,
  } = computeGrandTotal(order);
  const regularItems = order.items.filter(
    (i) => !SPECIAL_ITEMS.includes(i.name),
  );
  const upiUrl = `upi://pay?pa=Paytm-31587057%40ptys&pn=DinkiDine&am=${grandTotal.toFixed(2)}&cu=INR`;
  const isDriveIn = order.vehicleInfo.model === "DRIVE-IN";
  const isTakeAway =
    order.vehicleInfo.licensePlate?.startsWith("TAKEAWAY-") ?? false;
  const locationLabel = isDriveIn
    ? "Car No"
    : isTakeAway
      ? "Customer"
      : "Table";
  const locationValue = isDriveIn
    ? order.vehicleInfo.licensePlate
    : isTakeAway
      ? order.vehicleInfo.licensePlate.replace("TAKEAWAY-", "")
      : order.vehicleInfo.licensePlate;
  const discountAmt = Number(order.discount ?? 0n);
  const discountType = order.discountType ?? "flat";
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(`
    <html><head><title>Invoice #${Number(order.id).toString().padStart(4, "0")}</title></head>
    <body style="font-family:monospace;font-size:12px;padding:20px;max-width:300px;margin:0 auto">
    <div style="text-align:center"><b>DINKI DINE</b><br/>Dine-In &amp; Takeaway<br/>Invoice #${Number(order.id).toString().padStart(4, "0")}</div>
    <hr/>
    <div>${locationLabel}: ${locationValue}</div>
    <hr/>
    ${regularItems.map((i) => `<div style="display:flex;justify-content:space-between"><span>${i.name} x${Number(i.quantity)}</span><span>\u20B9${(Number(i.price) * Number(i.quantity)).toFixed(2)}</span></div>`).join("")}
    <hr/>
    <div style="display:flex;justify-content:space-between"><span>Items Total</span><span>\u20B9${itemsTotal.toFixed(2)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>SGST (2.5%)</span><span>\u20B9${sgst.toFixed(2)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>CGST (2.5%)</span><span>\u20B9${cgst.toFixed(2)}</span></div>
    ${packing > 0 ? `<div style="display:flex;justify-content:space-between"><span>Packing</span><span>\u20B9${packing.toFixed(2)}</span></div>` : ""}
    ${delivery > 0 ? `<div style="display:flex;justify-content:space-between"><span>Delivery</span><span>\u20B9${delivery.toFixed(2)}</span></div>` : ""}
    ${discountValue > 0 ? `<div style="display:flex;justify-content:space-between;color:green"><span>Discount${discountType === "percent" ? ` (${(discountAmt / 100).toFixed(0)}%)` : ""}</span><span>-\u20B9${discountValue.toFixed(2)}</span></div>` : ""}
    <hr/>
    <div style="display:flex;justify-content:space-between;font-weight:bold"><span>GRAND TOTAL</span><span>\u20B9${grandTotal.toFixed(2)}</span></div>
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

interface SettingsPanelProps {
  onBack: () => void;
  orders?: Order[];
  onEditOrder?: (
    orderId: bigint,
    items: OrderItem[],
    packingCharge: bigint,
    deliveryCharge: bigint,
    discount: bigint,
    discountType: string,
  ) => Promise<void>;
}

export function SettingsPanel({
  onBack,
  orders = [],
  onEditOrder,
}: SettingsPanelProps) {
  const { actor } = useActor();
  const [permissions, setPermissions] =
    useState<PermissionMap>(loadPermissions);
  const [clearing, setClearing] = useState(false);
  const [printers, setPrinters] = useState<PrinterSlot[]>(loadPrinterConfig);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [editOrder, setEditOrder] = useState<Order | null>(null);

  const fulfilledOrders = orders.filter(
    (o) => o.status === OrderStatus.fulfilled,
  );
  const filteredInvoices = fulfilledOrders.filter(
    (o) =>
      !invoiceSearch ||
      o.vehicleInfo.licensePlate
        .toLowerCase()
        .includes(invoiceSearch.toLowerCase()),
  );

  const handleToggle = (role: Role, perm: Permission) => {
    setPermissions((prev) => {
      const updated = {
        ...prev,
        [role]: {
          ...prev[role],
          [perm]: !prev[role][perm],
        },
      };
      savePermissions(updated);
      return updated;
    });
  };

  const updatePrinter = (
    idx: number,
    field: keyof PrinterSlot,
    value: string,
  ) => {
    setPrinters((prev) => {
      const updated = prev.map((p, i) =>
        i === idx ? { ...p, [field]: value } : p,
      );
      savePrinterConfig(updated);
      return updated;
    });
  };

  const handleTestPrint = (idx: number) => {
    const printer = printers[idx];
    const w = window.open("", "_blank", "width=400,height=300");
    if (!w) return;
    w.document.write(`
      <html><head><title>Test Print - Printer ${idx + 1}</title></head>
      <body style="font-family:monospace;font-size:12px;padding:20px;max-width:300px;margin:0 auto;text-align:center">
      <b>DINKI POS - TEST PRINT</b><br/>
      <br/>
      Printer: Kitchen ${idx + 1}<br/>
      Name: ${printer.name || "(unnamed)"}<br/>
      Type: ${printer.connectionType}<br/>
      ${
        printer.connectionType === "Bluetooth"
          ? `MAC: ${printer.macAddress || "(not set)"}`
          : printer.connectionType === "WiFi"
            ? `IP: ${printer.ipAddress || "(not set)"}:${printer.port || "9100"}`
            : printer.connectionType === "USB"
              ? `Port: ${printer.portName || "(not set)"}`
              : `URL: ${printer.endpointUrl || "(not set)"}`
      }<br/>
      <br/>
      <hr/>
      This is a test page.<br/>
      If you see this, the printer config is set.<br/>
      <hr/>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const handleClearAllData = async () => {
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }
    setClearing(true);
    try {
      const backendActor = actor as unknown as backendInterface;
      await backendActor.clearAllData();
      for (const key of [
        "dinki_orders",
        "dinki_notifications",
        "dinki_staff_accounts",
        "dinki_activity_logs",
      ]) {
        localStorage.removeItem(key);
      }
      toast.success("All data cleared");
    } catch (e) {
      console.error(e);
      toast.error("Failed to clear data");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-din-surface border-b border-din-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          data-ocid="settings.secondary_button"
          onClick={onBack}
          className="flex items-center gap-1 text-din-muted hover:text-din-text text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="w-px h-5 bg-din-border" />
        <h1 className="text-sm font-bold text-din-text">Settings</h1>
      </div>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-8">
        {/* ── Invoice List & Edit ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-din-teal" />
            <h2 className="text-sm font-bold text-din-text">
              Invoice List &amp; Edit
            </h2>
            <span className="ml-auto text-xs text-din-muted">
              {fulfilledOrders.length} invoices
            </span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-din-muted" />
            <Input
              data-ocid="settings.invoice_search"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              placeholder="Search by table / car / customer..."
              className="pl-8 bg-din-surface-alt border-din-border text-din-text placeholder:text-din-muted/50 h-9 text-sm"
            />
          </div>
          <div className="rounded-lg border border-din-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-din-surface-alt">
                <tr>
                  <th className="px-3 py-2 text-left text-din-muted font-medium">
                    Invoice #
                  </th>
                  <th className="px-3 py-2 text-left text-din-muted font-medium">
                    Table / Car
                  </th>
                  <th className="px-3 py-2 text-right text-din-muted font-medium hidden sm:table-cell">
                    Items
                  </th>
                  <th className="px-3 py-2 text-right text-din-muted font-medium hidden sm:table-cell">
                    Tax
                  </th>
                  <th className="px-3 py-2 text-right text-din-muted font-medium">
                    Total
                  </th>
                  <th className="px-3 py-2 text-right text-din-muted font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-din-muted"
                    >
                      <span data-ocid="settings.invoice_empty">
                        {fulfilledOrders.length === 0
                          ? "No closed invoices yet"
                          : "No results"}
                      </span>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((o, i) => {
                    const {
                      itemsTotal,
                      sgst,
                      cgst,
                      discountValue,
                      grandTotal,
                    } = computeGrandTotal(o);
                    const time = new Date(
                      Number(o.timestamp) / 1_000_000,
                    ).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const isDriveIn = o.vehicleInfo.model === "DRIVE-IN";
                    const isTakeAway =
                      o.vehicleInfo.licensePlate?.startsWith("TAKEAWAY-") ??
                      false;
                    const displayLocation = isDriveIn
                      ? o.vehicleInfo.licensePlate
                      : isTakeAway
                        ? o.vehicleInfo.licensePlate.replace("TAKEAWAY-", "")
                        : o.vehicleInfo.licensePlate;
                    return (
                      <tr
                        key={o.id.toString()}
                        data-ocid={`settings.invoice_row.${i + 1}`}
                        className="border-t border-din-border hover:bg-din-surface-alt transition-colors"
                      >
                        <td className="px-3 py-2 text-din-text font-mono">
                          #{Number(o.id).toString().padStart(4, "0")}
                        </td>
                        <td className="px-3 py-2 text-din-text">
                          <div>{displayLocation}</div>
                          <div className="text-[10px] text-din-muted">
                            {time}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-din-muted hidden sm:table-cell">
                          \u20B9{itemsTotal.toFixed(0)}
                        </td>
                        <td className="px-3 py-2 text-right text-din-muted hidden sm:table-cell">
                          \u20B9{(sgst + cgst).toFixed(0)}
                        </td>
                        <td className="px-3 py-2 text-right text-din-teal font-medium">
                          {discountValue > 0 ? (
                            <span className="flex flex-col items-end">
                              <span>\u20B9{grandTotal.toFixed(2)}</span>
                              <span className="text-[9px] text-din-green">
                                disc.
                              </span>
                            </span>
                          ) : (
                            `\u20B9${grandTotal.toFixed(2)}`
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onEditOrder && (
                              <Button
                                data-ocid={`settings.invoice_edit.${i + 1}`}
                                size="sm"
                                variant="outline"
                                onClick={() => setEditOrder(o)}
                                className="h-6 px-2 text-[10px] border-din-border text-din-teal hover:bg-din-teal/10"
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            )}
                            <Button
                              data-ocid={`settings.invoice_print.${i + 1}`}
                              size="sm"
                              variant="outline"
                              onClick={() => printInvoice(o)}
                              className="h-6 px-2 text-[10px] border-din-border text-din-muted hover:bg-din-surface-alt"
                            >
                              <Printer className="w-3 h-3 mr-1" />
                              Print
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Clear All Data ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-4 h-4 text-din-red" />
            <h2 className="text-sm font-bold text-din-text">Data Management</h2>
          </div>
          <div className="bg-din-surface-alt border border-din-red/20 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-din-text">
                Clear All Data
              </p>
              <p className="text-xs text-din-muted mt-0.5">
                Wipe all orders and notifications. This cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  data-ocid="settings.delete_button"
                  size="sm"
                  disabled={clearing}
                  className="h-8 text-xs bg-din-red/10 hover:bg-din-red/20 border border-din-red/40 text-din-red font-semibold shrink-0"
                >
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                data-ocid="settings.dialog"
                className="bg-din-surface border-din-border text-din-text"
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-din-text">
                    Clear All Data?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-din-muted">
                    This will permanently delete all orders and notifications.
                    Menu items and users will NOT be affected. This cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    data-ocid="settings.cancel_button"
                    className="border-din-border text-din-muted hover:bg-din-surface-alt"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-ocid="settings.confirm_button"
                    onClick={handleClearAllData}
                    className="bg-din-red hover:bg-din-red/80 text-white"
                  >
                    Yes, Clear Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        {/* ── Printer Configuration ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Printer className="w-4 h-4 text-din-teal" />
            <h2 className="text-sm font-bold text-din-text">
              Printer Configuration
            </h2>
          </div>
          <p className="text-xs text-din-muted mb-4">
            Configure up to 4 kitchen printers. Settings are saved locally.
          </p>
          <div className="space-y-4">
            {printers.map((printer, idx) => (
              <div
                key={printer.name || `K${idx + 1}`}
                data-ocid={`settings.row.${idx + 1}`}
                className="bg-din-surface-alt border border-din-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-din-teal">
                    Kitchen Printer {idx + 1}
                  </span>
                  <Button
                    data-ocid={`settings.primary_button.${idx + 1}`}
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestPrint(idx)}
                    className="h-6 px-2 text-[10px] border-din-border text-din-muted hover:bg-din-surface"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Test Print
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-din-muted">
                      Printer Name
                    </Label>
                    <Input
                      data-ocid={`settings.input.${idx + 1}`}
                      value={printer.name}
                      onChange={(e) =>
                        updatePrinter(idx, "name", e.target.value)
                      }
                      placeholder={`Kitchen Printer ${idx + 1}`}
                      className="h-7 text-xs bg-din-surface border-din-border text-din-text"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-din-muted">
                      Connection Type
                    </Label>
                    <Select
                      value={printer.connectionType}
                      onValueChange={(v) =>
                        updatePrinter(idx, "connectionType", v)
                      }
                    >
                      <SelectTrigger
                        data-ocid={`settings.select.${idx + 1}`}
                        className="h-7 text-xs bg-din-surface border-din-border text-din-text"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-din-surface border-din-border text-din-text">
                        <SelectItem value="Bluetooth" className="text-xs">
                          Bluetooth
                        </SelectItem>
                        <SelectItem value="WiFi" className="text-xs">
                          WiFi
                        </SelectItem>
                        <SelectItem value="USB" className="text-xs">
                          USB
                        </SelectItem>
                        <SelectItem value="Cloud" className="text-xs">
                          Cloud
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {printer.connectionType === "Bluetooth" && (
                  <div className="space-y-1">
                    <Label className="text-xs text-din-muted">
                      MAC Address
                    </Label>
                    <Input
                      data-ocid={`settings.input.${idx + 1}`}
                      value={printer.macAddress}
                      onChange={(e) =>
                        updatePrinter(idx, "macAddress", e.target.value)
                      }
                      placeholder="00:11:22:33:44:55"
                      className="h-7 text-xs bg-din-surface border-din-border text-din-text font-mono"
                    />
                  </div>
                )}
                {printer.connectionType === "WiFi" && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-din-muted">
                        IP Address
                      </Label>
                      <Input
                        data-ocid={`settings.input.${idx + 1}`}
                        value={printer.ipAddress}
                        onChange={(e) =>
                          updatePrinter(idx, "ipAddress", e.target.value)
                        }
                        placeholder="192.168.1.100"
                        className="h-7 text-xs bg-din-surface border-din-border text-din-text font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-din-muted">Port</Label>
                      <Input
                        data-ocid={`settings.input.${idx + 1}`}
                        value={printer.port}
                        onChange={(e) =>
                          updatePrinter(idx, "port", e.target.value)
                        }
                        placeholder="9100"
                        className="h-7 text-xs bg-din-surface border-din-border text-din-text font-mono"
                      />
                    </div>
                  </div>
                )}
                {printer.connectionType === "USB" && (
                  <div className="space-y-1">
                    <Label className="text-xs text-din-muted">Port Name</Label>
                    <Input
                      data-ocid={`settings.input.${idx + 1}`}
                      value={printer.portName}
                      onChange={(e) =>
                        updatePrinter(idx, "portName", e.target.value)
                      }
                      placeholder="/dev/usb/lp0 or COM3"
                      className="h-7 text-xs bg-din-surface border-din-border text-din-text font-mono"
                    />
                  </div>
                )}
                {printer.connectionType === "Cloud" && (
                  <div className="space-y-1">
                    <Label className="text-xs text-din-muted">
                      Endpoint URL
                    </Label>
                    <Input
                      data-ocid={`settings.input.${idx + 1}`}
                      value={printer.endpointUrl}
                      onChange={(e) =>
                        updatePrinter(idx, "endpointUrl", e.target.value)
                      }
                      placeholder="https://printer.example.com/print"
                      className="h-7 text-xs bg-din-surface border-din-border text-din-text font-mono"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── User Permissions ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-din-teal" />
            <h2 className="text-sm font-bold text-din-text">
              User Permissions
            </h2>
          </div>
          <p className="text-xs text-din-muted mb-4">
            Toggle which actions each role can perform. Changes are saved
            immediately.
          </p>
          <div className="rounded-lg border border-din-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-din-border hover:bg-transparent">
                  <TableHead className="text-din-muted text-xs font-semibold w-32">
                    Role
                  </TableHead>
                  {PERMISSION_COLS.map((col) => (
                    <TableHead
                      key={col}
                      className="text-din-muted text-xs font-semibold text-center"
                    >
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLES.map((role, ri) => (
                  <TableRow
                    key={role}
                    data-ocid={`settings.row.${ri + 5}`}
                    className="border-din-border hover:bg-din-surface-alt/30"
                  >
                    <TableCell className="text-xs font-semibold text-din-text">
                      {role}
                    </TableCell>
                    {PERMISSION_COLS.map((perm) => (
                      <TableCell key={perm} className="text-center">
                        <Switch
                          data-ocid="settings.switch"
                          checked={permissions[role]?.[perm] ?? false}
                          onCheckedChange={() => handleToggle(role, perm)}
                          className="data-[state=checked]:bg-din-teal mx-auto"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      {/* Invoice Edit Modal */}
      {onEditOrder && (
        <InvoiceEditModal
          open={editOrder !== null}
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={onEditOrder}
        />
      )}
    </div>
  );
}
