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
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Clock,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { backendInterface } from "../backend";
import { useActor } from "../hooks/useActor";
import type { MenuItem } from "../types/menu";

const CATEGORIES = [
  "Hot n Hot",
  "Dosa",
  "Breakfast",
  "Chaat",
  "Ice cream novelties",
  "Ice cream cups n packs",
  "Juice n Shakes",
  "Soup",
  "Starter",
  "Roti (Bread)",
  "Main course",
  "Rice n Noodles",
  "Softdrinks",
  "Grill n spice",
] as const;
const PIN_KEY = "dinki_admin_pin_ok";
const TIMING_KEY = "dinki_category_timing";
const PERMISSIONS_KEY = "dinki_role_permissions";

// ── Default timing slots ─────────────────────────────────────────
type TimeSlot = { start: [number, number]; end: [number, number] };
type CategorySlots = Record<string, TimeSlot[]>;

const DEFAULT_CATEGORY_SLOTS: CategorySlots = {
  "Hot n Hot": [{ start: [9, 0], end: [23, 0] }],
  Dosa: [{ start: [9, 0], end: [23, 0] }],
  Breakfast: [{ start: [7, 0], end: [12, 0] }],
  Chaat: [{ start: [9, 0], end: [23, 0] }],
  "Ice cream novelties": [{ start: [9, 0], end: [23, 0] }],
  "Ice cream cups n packs": [{ start: [9, 0], end: [23, 0] }],
  "Juice n Shakes": [{ start: [9, 0], end: [23, 0] }],
  Soup: [{ start: [9, 0], end: [23, 0] }],
  Starter: [{ start: [9, 0], end: [23, 0] }],
  "Roti (Bread)": [
    { start: [11, 30], end: [15, 30] },
    { start: [19, 0], end: [22, 30] },
  ],
  "Main course": [{ start: [9, 0], end: [23, 0] }],
  "Rice n Noodles": [{ start: [9, 0], end: [23, 0] }],
  Softdrinks: [{ start: [9, 0], end: [23, 0] }],
  "Grill n spice": [{ start: [9, 0], end: [23, 0] }],
};

function loadCategorySlots(): CategorySlots {
  try {
    const data = localStorage.getItem(TIMING_KEY);
    if (data) return { ...DEFAULT_CATEGORY_SLOTS, ...JSON.parse(data) };
  } catch {}
  return DEFAULT_CATEGORY_SLOTS;
}

function saveCategorySlots(slots: CategorySlots) {
  localStorage.setItem(TIMING_KEY, JSON.stringify(slots));
}

function fmtTime(h: number, m: number) {
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseTime(s: string): [number, number] | null {
  const parts = s.split(":");
  if (parts.length !== 2) return null;
  const h = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59)
    return null;
  return [h, m];
}

function getActiveRole(): string {
  try {
    // If a specific staff member was selected at login, use their role
    const session = localStorage.getItem("dinki_active_staff");
    if (session) {
      const staff = JSON.parse(session);
      return staff?.role ?? "Manager";
    }
  } catch {}
  // Default: treat as Manager (full access) when using single admin PIN
  return "Manager";
}

function hasPermission(permKey: string): boolean {
  try {
    const permsStr = localStorage.getItem(PERMISSIONS_KEY);
    if (!permsStr) return true; // default allow if no permissions configured
    const perms = JSON.parse(permsStr);
    const role = getActiveRole();
    return perms[role]?.[permKey] ?? true;
  } catch {
    return true;
  }
}
const DEFAULT_PIN = "1234";

interface MenuAdminProps {
  menuItems: MenuItem[];
  onBack: () => void;
  onReload: () => Promise<void>;
}

// ── PIN Gate ─────────────────────────────────────────────────
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleDigit = (idx: number, val: string) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = d;
    setDigits(next);
    if (d && idx < 3) refs[idx + 1].current?.focus();
    if (idx === 3 && d) {
      const pin = [...next].join("");
      if (pin === DEFAULT_PIN) {
        localStorage.setItem(PIN_KEY, "1");
        onUnlock();
      } else {
        setError("Wrong PIN. Try again.");
        setDigits(["", "", "", ""]);
        refs[0].current?.focus();
      }
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-din-surface border border-din-border rounded-xl p-8 w-80 shadow-card text-center">
        <div className="w-12 h-12 rounded-full bg-din-teal/20 border border-din-teal/40 flex items-center justify-center mx-auto mb-4">
          <span className="text-xl">🔐</span>
        </div>
        <h2 className="text-din-text font-bold text-lg mb-1">Admin Access</h2>
        <p className="text-din-muted text-xs mb-6">
          Enter 4-digit PIN to edit menu
        </p>
        <div className="flex gap-3 justify-center mb-4">
          {([0, 1, 2, 3] as const).map((pos) => (
            <input
              key={`pin-${pos}`}
              ref={refs[pos]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digits[pos]}
              onChange={(e) => handleDigit(pos, e.target.value)}
              onKeyDown={(e) => handleKeyDown(pos, e)}
              className="w-12 h-12 text-center text-xl font-bold rounded-lg bg-din-surface-alt border border-din-border text-din-text focus:border-din-teal focus:outline-none transition-colors"
            />
          ))}
        </div>
        {error && (
          <p
            data-ocid="menu_admin.error_state"
            className="text-din-red text-xs"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Add Item Form ─────────────────────────────────────────────
function AddItemForm({
  category,
  onAdd,
}: {
  category: string;
  onAdd: (name: string, price: bigint, printer: bigint) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [printer, setPrinter] = useState("1");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !price.trim()) return;
    const p = Number.parseFloat(price);
    if (Number.isNaN(p) || p <= 0) return;
    setLoading(true);
    try {
      await onAdd(name.trim(), BigInt(Math.round(p)), BigInt(printer));
      setName("");
      setPrice("");
      setPrinter("1");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 items-end flex-wrap bg-din-surface-alt border border-din-border rounded-lg p-3 mt-3">
      <div className="flex-1 min-w-[140px]">
        <Label className="text-[10px] text-din-muted">Item Name</Label>
        <Input
          data-ocid="menu_admin.input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`New ${category} item`}
          className="bg-din-surface border-din-border text-din-text h-8 text-sm"
        />
      </div>
      <div className="w-24">
        <Label className="text-[10px] text-din-muted">Price (₹)</Label>
        <Input
          data-ocid="menu_admin.input"
          type="number"
          min="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
          className="bg-din-surface border-din-border text-din-text h-8 text-sm"
        />
      </div>
      <div className="w-28">
        <Label className="text-[10px] text-din-muted">Printer #</Label>
        <Select value={printer} onValueChange={setPrinter}>
          <SelectTrigger
            data-ocid="menu_admin.select"
            className="bg-din-surface border-din-border text-din-text h-8 text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-din-surface border-din-border">
            {[1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={String(n)} className="text-din-text">
                Kitchen {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        data-ocid="menu_admin.primary_button"
        size="sm"
        onClick={handleAdd}
        disabled={loading || !name.trim() || !price.trim()}
        className="h-8 text-xs bg-din-teal/20 hover:bg-din-teal/30 border border-din-teal/40 text-din-teal font-semibold"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Plus className="w-3 h-3 mr-1" />
        )}
        Save
      </Button>
    </div>
  );
}

// ── Editable Row ──────────────────────────────────────────────
function EditableRow({
  item,
  onSave,
  onCancel,
}: {
  item: MenuItem;
  onSave: (name: string, price: bigint, printer: bigint) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(Number(item.price)));
  const [printer, setPrinter] = useState(String(Number(item.printerNumber)));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const p = Number.parseFloat(price);
    if (!name.trim() || Number.isNaN(p) || p <= 0) return;
    setLoading(true);
    try {
      await onSave(name.trim(), BigInt(Math.round(p)), BigInt(printer));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TableRow className="bg-din-teal/5 border-din-teal/20">
      <TableCell>
        <Input
          data-ocid="menu_admin.input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-din-surface border-din-border text-din-text h-7 text-xs"
        />
      </TableCell>
      <TableCell>
        <Input
          data-ocid="menu_admin.input"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="bg-din-surface border-din-border text-din-text h-7 text-xs w-24"
        />
      </TableCell>
      <TableCell>
        <Select value={printer} onValueChange={setPrinter}>
          <SelectTrigger
            data-ocid="menu_admin.select"
            className="bg-din-surface border-din-border text-din-text h-7 text-xs w-28"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-din-surface border-din-border">
            {[1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={String(n)} className="text-din-text">
                Kitchen {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell />
      <TableCell>
        <div className="flex gap-1">
          <Button
            data-ocid="menu_admin.save_button"
            size="sm"
            onClick={handleSave}
            disabled={loading}
            className="h-6 text-[10px] px-2 bg-din-teal/20 hover:bg-din-teal/30 border border-din-teal/40 text-din-teal"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
          </Button>
          <Button
            data-ocid="menu_admin.cancel_button"
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="h-6 text-[10px] px-2 text-din-muted hover:text-din-text"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Main MenuAdmin ─────────────────────────────────────────────
export function MenuAdmin({ menuItems, onBack, onReload }: MenuAdminProps) {
  const { actor } = useActor();
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(PIN_KEY) === "1",
  );
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const backendActor = actor as unknown as backendInterface;
  const [categorySlots, setCategorySlots] =
    useState<CategorySlots>(loadCategorySlots);
  const [timingTab, setTimingTab] = useState<string>(CATEGORIES[0]);
  const canMarkSold = hasPermission("Mark Sold");
  const canChangeTiming = hasPermission("Change Timing");

  // Reload permission check on mount (in case staff session changed)
  useEffect(() => {
    setCategorySlots(loadCategorySlots());
  }, []);

  const handleToggleAvailable = async (item: MenuItem) => {
    if (!actor) return;
    try {
      await backendActor.updateMenuItem(
        item.id,
        item.name,
        item.category,
        item.price,
        item.printerNumber,
        !item.available,
      );
      await onReload();
      toast.success(
        `${item.name} marked ${!item.available ? "available" : "out of stock"}`,
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to update item");
    }
  };

  const handleSaveEdit = async (
    item: MenuItem,
    name: string,
    price: bigint,
    printer: bigint,
  ) => {
    if (!actor) {
      toast.error("Not connected to backend. Please refresh the page.");
      return;
    }
    try {
      await backendActor.updateMenuItem(
        item.id,
        name,
        item.category,
        price,
        printer,
        item.available,
      );
      setEditingId(null);
      await onReload();
      toast.success("Item updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save item");
    }
  };

  const handleAddItem = async (
    category: string,
    name: string,
    price: bigint,
    printer: bigint,
  ) => {
    if (!actor) {
      toast.error("Not connected to backend. Please refresh the page.");
      return;
    }
    try {
      await backendActor.addMenuItem(name, category, price, printer);
      await onReload();
      toast.success(`${name} added to ${category}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to add item. Please try again.");
    }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!actor) return;
    try {
      await backendActor.deleteMenuItem(item.id);
      await onReload();
      toast.success(`${item.name} deleted`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete item");
    }
  };

  const handleResetToDefaults = async () => {
    if (!actor) return;
    setResetting(true);
    try {
      await backendActor.resetMenuToDefaults();
      await onReload();
      toast.success("Menu reset to defaults");
    } catch (e) {
      console.error(e);
      toast.error("Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const handleExportCSV = () => {
    const header = "Name,Category,Price,PrinterNumber,Available";
    const rows = menuItems.map(
      (i) =>
        `"${i.name}","${i.category}",${Number(i.price)},${Number(i.printerNumber)},${i.available ? "Yes" : "No"}`,
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dinki-dine-menu.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Menu exported as CSV");
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !actor) return;
    setCsvImporting(true);
    try {
      const text = await file.text();
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const dataLines = lines.slice(1);
      let count = 0;
      for (const line of dataLines) {
        const cols =
          line
            .match(/(?:"([^"]*)"|([^,]*))/g)
            ?.map((c) => c.replace(/^"|"$/g, "").trim()) ?? [];
        if (cols.length < 4) continue;
        const [name, category, priceStr, printerStr] = cols;
        const price = Number.parseFloat(priceStr ?? "");
        const printer = Number.parseInt(printerStr ?? "1", 10);
        if (
          !name ||
          !category ||
          Number.isNaN(price) ||
          price <= 0 ||
          Number.isNaN(printer)
        )
          continue;
        await backendActor.addMenuItem(
          name,
          category,
          BigInt(Math.round(price)),
          BigInt(printer),
        );
        count++;
      }
      await onReload();
      toast.success(
        `Imported ${count} item${count !== 1 ? "s" : ""} successfully`,
      );
    } catch (e) {
      console.error(e);
      toast.error("CSV import failed. Check the format.");
    } finally {
      setCsvImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Admin Header */}
      <div className="bg-din-surface border-b border-din-border px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            data-ocid="menu_admin.secondary_button"
            size="sm"
            variant="ghost"
            onClick={onBack}
            className="h-8 text-xs text-din-muted hover:text-din-text gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Orders
          </Button>
          <div className="w-px h-5 bg-din-border" />
          <h1 className="text-sm font-bold text-din-text">Menu Management</h1>
          <Badge className="text-[10px] bg-din-teal/10 border-din-teal/30 text-din-teal border">
            {menuItems.length} items
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCSV}
          />
          <Button
            data-ocid="menu_admin.upload_button"
            size="sm"
            variant="outline"
            onClick={() => csvInputRef.current?.click()}
            disabled={csvImporting}
            className="h-8 text-xs border-din-border text-din-muted hover:bg-din-surface-alt"
          >
            {csvImporting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1" />
            )}
            Import CSV
          </Button>

          <Button
            data-ocid="menu_admin.secondary_button"
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="h-8 text-xs border-din-border text-din-muted hover:bg-din-surface-alt"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export CSV
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                data-ocid="menu_admin.delete_button"
                size="sm"
                variant="outline"
                disabled={resetting}
                className="h-8 text-xs border-din-red/30 text-din-red hover:bg-din-red/10"
              >
                {resetting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                )}
                Reset to Defaults
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              data-ocid="menu_admin.dialog"
              className="bg-din-surface border-din-border text-din-text"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="text-din-text">
                  Reset Menu to Defaults?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-din-muted">
                  This will delete all custom items and restore the original
                  menu. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  data-ocid="menu_admin.cancel_button"
                  className="border-din-border text-din-muted hover:bg-din-surface-alt"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  data-ocid="menu_admin.confirm_button"
                  onClick={handleResetToDefaults}
                  className="bg-din-red hover:bg-din-red/80 text-white"
                >
                  Reset Menu
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* CSV Format hint */}
      <div className="px-4 py-2 bg-din-surface-alt border-b border-din-border text-[11px] text-din-muted">
        CSV format:{" "}
        <code className="text-din-teal">
          Name,Category,Price,PrinterNumber,Available
        </code>
        &nbsp;— Category must be one of: Hot n Hot, Dosa, Breakfast, Chaat, Ice
        cream novelties, Ice cream cups n packs, Juice n Shakes, Soup, Starter,
        Roti (Bread), Main course, Rice n Noodles, Softdrinks, Grill n spice
      </div>

      {/* Category Tabs */}
      <div className="flex-1 px-4 py-4">
        <Tabs defaultValue="Hot n Hot">
          <TabsList className="bg-din-surface-alt border border-din-border mb-4">
            {CATEGORIES.map((cat) => {
              const count = menuItems.filter((i) => i.category === cat).length;
              return (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  data-ocid="menu_admin.tab"
                  className="text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
                >
                  {cat}
                  <span className="ml-1 text-[10px] opacity-60">({count})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {CATEGORIES.map((cat) => {
            const catItems = menuItems.filter((i) => i.category === cat);
            return (
              <TabsContent key={cat} value={cat}>
                <div className="rounded-lg border border-din-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-din-border hover:bg-transparent">
                        <TableHead className="text-din-muted text-xs">
                          Item Name
                        </TableHead>
                        <TableHead className="text-din-muted text-xs w-28">
                          Price (₹)
                        </TableHead>
                        <TableHead className="text-din-muted text-xs w-32">
                          Printer #
                        </TableHead>
                        <TableHead className="text-din-muted text-xs w-24">
                          Available
                        </TableHead>
                        <TableHead className="text-din-muted text-xs w-28">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catItems.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-din-muted text-xs py-8"
                            data-ocid="menu_admin.empty_state"
                          >
                            No items in {cat}. Add one below.
                          </TableCell>
                        </TableRow>
                      )}
                      {catItems.map((item, i) =>
                        editingId === item.id ? (
                          <EditableRow
                            key={item.id.toString()}
                            item={item}
                            onSave={(name, price, printer) =>
                              handleSaveEdit(item, name, price, printer)
                            }
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <TableRow
                            key={item.id.toString()}
                            data-ocid={`menu_admin.item.${i + 1}`}
                            className="border-din-border hover:bg-din-surface-alt/30"
                          >
                            <TableCell
                              className={`text-sm font-medium ${
                                !item.available
                                  ? "line-through text-din-muted opacity-50"
                                  : "text-din-text"
                              }`}
                            >
                              {item.name}
                              {!item.available && (
                                <Badge className="ml-2 text-[9px] bg-din-red/10 border-din-red/30 text-din-red border">
                                  Out of Stock
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-din-text text-sm">
                              ₹{Number(item.price)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-[10px] border ${
                                  Number(item.printerNumber) === 1
                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                                    : Number(item.printerNumber) === 2
                                      ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                                      : Number(item.printerNumber) === 3
                                        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                                        : "bg-pink-500/10 border-pink-500/30 text-pink-300"
                                }`}
                              >
                                Kitchen {Number(item.printerNumber)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                data-ocid={`menu_admin.switch.${i + 1}`}
                                checked={item.available}
                                onCheckedChange={() => {
                                  if (!canMarkSold) {
                                    toast.error(
                                      "You don't have permission to mark items sold/available.",
                                    );
                                    return;
                                  }
                                  handleToggleAvailable(item);
                                }}
                                disabled={!canMarkSold}
                                className="data-[state=checked]:bg-din-teal disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  data-ocid={`menu_admin.edit_button.${i + 1}`}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingId(item.id)}
                                  className="h-6 w-6 p-0 text-din-muted hover:text-din-teal"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      data-ocid={`menu_admin.delete_button.${i + 1}`}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-din-muted hover:text-din-red"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent
                                    data-ocid="menu_admin.dialog"
                                    className="bg-din-surface border-din-border text-din-text"
                                  >
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-din-text">
                                        Delete &ldquo;{item.name}&rdquo;?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-din-muted">
                                        This item will be permanently removed
                                        from the menu.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel
                                        data-ocid="menu_admin.cancel_button"
                                        className="border-din-border text-din-muted hover:bg-din-surface-alt"
                                      >
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        data-ocid="menu_admin.confirm_button"
                                        onClick={() => handleDelete(item)}
                                        className="bg-din-red hover:bg-din-red/80 text-white"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Add Item Form */}
                <AddItemForm
                  category={cat}
                  onAdd={(name, price, printer) =>
                    handleAddItem(cat, name, price, printer)
                  }
                />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* ── Category Timing ── */}
      <div className="px-4 pb-6">
        <div className="flex items-center gap-2 mb-3 mt-2">
          <Clock className="w-4 h-4 text-din-teal" />
          <h2 className="text-sm font-bold text-din-text">Category Timings</h2>
          {!canChangeTiming && (
            <span className="ml-2 text-[10px] text-din-red border border-din-red/30 bg-din-red/10 rounded px-2 py-0.5">
              View only – no permission to edit
            </span>
          )}
        </div>
        <p className="text-xs text-din-muted mb-3">
          Set the time window when each category is available for ordering.
        </p>
        <div className="rounded-lg border border-din-border overflow-hidden">
          <div className="flex flex-wrap gap-1 p-2 border-b border-din-border bg-din-surface-alt">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setTimingTab(cat)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  timingTab === cat
                    ? "bg-din-teal/20 text-din-teal border border-din-teal/40"
                    : "text-din-muted hover:text-din-text"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="p-4 space-y-3">
            {(
              categorySlots[timingTab] ?? [{ start: [9, 0], end: [23, 0] }]
            ).map((slot, si) => (
              <div
                key={`${timingTab}-${slot.start[0]}-${slot.start[1]}-${slot.end[0]}-${slot.end[1]}`}
                className="flex items-center gap-3 flex-wrap"
              >
                <span className="text-xs text-din-muted w-16">
                  Slot {si + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-din-muted">From</span>
                  <input
                    type="time"
                    value={fmtTime(slot.start[0], slot.start[1])}
                    disabled={!canChangeTiming}
                    onChange={(e) => {
                      const parsed = parseTime(e.target.value);
                      if (!parsed || !canChangeTiming) return;
                      const updated = { ...categorySlots };
                      const slots = [...(updated[timingTab] ?? [])];
                      slots[si] = { ...slots[si], start: parsed };
                      updated[timingTab] = slots;
                      setCategorySlots(updated);
                      saveCategorySlots(updated);
                    }}
                    className="bg-din-surface border border-din-border text-din-text text-xs rounded px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-din-muted">To</span>
                  <input
                    type="time"
                    value={fmtTime(slot.end[0], slot.end[1])}
                    disabled={!canChangeTiming}
                    onChange={(e) => {
                      const parsed = parseTime(e.target.value);
                      if (!parsed || !canChangeTiming) return;
                      const updated = { ...categorySlots };
                      const slots = [...(updated[timingTab] ?? [])];
                      slots[si] = { ...slots[si], end: parsed };
                      updated[timingTab] = slots;
                      setCategorySlots(updated);
                      saveCategorySlots(updated);
                    }}
                    className="bg-din-surface border border-din-border text-din-text text-xs rounded px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                {canChangeTiming && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const updated = { ...categorySlots };
                      const slots = [...(updated[timingTab] ?? [])];
                      slots.splice(si, 1);
                      updated[timingTab] =
                        slots.length > 0
                          ? slots
                          : [{ start: [9, 0], end: [23, 0] }];
                      setCategorySlots(updated);
                      saveCategorySlots(updated);
                      toast.success("Time slot removed");
                    }}
                    className="h-6 w-6 p-0 text-din-muted hover:text-din-red"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
            {canChangeTiming && (
              <div className="flex items-center gap-3 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const updated = { ...categorySlots };
                    const slots = [...(updated[timingTab] ?? [])];
                    slots.push({ start: [9, 0], end: [23, 0] });
                    updated[timingTab] = slots;
                    setCategorySlots(updated);
                    saveCategorySlots(updated);
                    toast.success("Time slot added");
                  }}
                  className="h-7 text-[11px] text-din-teal border border-din-teal/30 hover:bg-din-teal/10"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Slot
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const updated = { ...categorySlots };
                    updated[timingTab] = DEFAULT_CATEGORY_SLOTS[timingTab] ?? [
                      { start: [9, 0], end: [23, 0] },
                    ];
                    setCategorySlots(updated);
                    saveCategorySlots(updated);
                    toast.success(`${timingTab} timing reset to default`);
                  }}
                  className="h-7 text-[11px] text-din-muted border border-din-border hover:bg-din-surface-alt"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Reset
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
