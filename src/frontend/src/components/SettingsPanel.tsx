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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { backendInterface } from "../backend";
import { useActor } from "../hooks/useActor";

const PERMISSIONS_KEY = "dinki_role_permissions";

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
    "View Reports": true,
    "Manage Users": true,
    "Clear Data": true,
  },
  "Co-Admin": {
    "Place Order": true,
    "Issue Bill": true,
    "Menu Admin": true,
    "View Reports": true,
    "Manage Users": true,
    "Clear Data": false,
  },
  Captain: {
    "Place Order": true,
    "Issue Bill": true,
    "Menu Admin": false,
    "View Reports": true,
    "Manage Users": false,
    "Clear Data": false,
  },
  Cashier: {
    "Place Order": true,
    "Issue Bill": true,
    "Menu Admin": false,
    "View Reports": true,
    "Manage Users": false,
    "Clear Data": false,
  },
  Waiter: {
    "Place Order": true,
    "Issue Bill": false,
    "Menu Admin": false,
    "View Reports": false,
    "Manage Users": false,
    "Clear Data": false,
  },
  Bar: {
    "Place Order": true,
    "Issue Bill": false,
    "Menu Admin": false,
    "View Reports": false,
    "Manage Users": false,
    "Clear Data": false,
  },
  "Customer Order": {
    "Place Order": true,
    "Issue Bill": false,
    "Menu Admin": false,
    "View Reports": false,
    "Manage Users": false,
    "Clear Data": false,
  },
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

interface SettingsPanelProps {
  onBack: () => void;
}

export function SettingsPanel({ onBack }: SettingsPanelProps) {
  const { actor } = useActor();
  const [permissions, setPermissions] =
    useState<PermissionMap>(loadPermissions);
  const [clearing, setClearing] = useState(false);

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

  const handleClearAllData = async () => {
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }
    setClearing(true);
    try {
      const backendActor = actor as unknown as backendInterface;
      await backendActor.clearAllData();
      // Also clear localStorage keys
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
                    data-ocid={`settings.row.${ri + 1}`}
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
    </div>
  );
}
