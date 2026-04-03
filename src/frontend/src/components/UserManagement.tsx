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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

const ACCOUNTS_KEY = "dinki_staff_accounts";
const POSITIONS_KEY = "dinki_user_positions";
const LOGS_KEY = "dinki_activity_logs";

const DEFAULT_ACCOUNTS = [
  { id: "1", name: "Admin", email: "admin@dinkidine.com", role: "Manager" },
];

const DEFAULT_POSITIONS = [
  "Manager",
  "Co-Admin",
  "Captain",
  "Cashier",
  "Waiter",
  "Bar",
  "Customer Order",
];

interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ActivityLog {
  table: string;
  action: string;
  user: string;
  timestamp: number;
  orderId: string;
}

function loadAccounts(): StaffAccount[] {
  try {
    const data = localStorage.getItem(ACCOUNTS_KEY);
    return data ? JSON.parse(data) : DEFAULT_ACCOUNTS;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

function saveAccounts(accounts: StaffAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function loadPositions(): string[] {
  try {
    const data = localStorage.getItem(POSITIONS_KEY);
    return data ? JSON.parse(data) : DEFAULT_POSITIONS;
  } catch {
    return DEFAULT_POSITIONS;
  }
}

function savePositions(positions: string[]) {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
}

function loadLogs(): ActivityLog[] {
  try {
    const data = localStorage.getItem(LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function logActivity(log: ActivityLog) {
  const logs = loadLogs();
  logs.unshift(log);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 500)));
}

interface UserManagementProps {
  onBack: () => void;
}

export function UserManagement({ onBack }: UserManagementProps) {
  const [accounts, setAccounts] = useState<StaffAccount[]>(loadAccounts);
  const [positions, setPositions] = useState<string[]>(loadPositions);
  const [logs, setLogs] = useState<ActivityLog[]>(loadLogs);
  const [logSearch, setLogSearch] = useState("");

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<StaffAccount | null>(
    null,
  );
  const [accName, setAccName] = useState("");
  const [accEmail, setAccEmail] = useState("");
  const [accRole, setAccRole] = useState("");

  const [newPosition, setNewPosition] = useState("");

  useEffect(() => {
    setLogs(loadLogs());
  }, []);

  const openAddAccount = () => {
    setEditingAccount(null);
    setAccName("");
    setAccEmail("");
    setAccRole("");
    setShowAccountForm(true);
  };

  const openEditAccount = (acc: StaffAccount) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccEmail(acc.email);
    setAccRole(acc.role);
    setShowAccountForm(true);
  };

  const handleSaveAccount = () => {
    if (!accName.trim()) return;
    if (editingAccount) {
      const updated = accounts.map((a) =>
        a.id === editingAccount.id
          ? {
              ...a,
              name: accName.trim(),
              email: accEmail.trim(),
              role: accRole,
            }
          : a,
      );
      setAccounts(updated);
      saveAccounts(updated);
    } else {
      const newAcc: StaffAccount = {
        id: Date.now().toString(),
        name: accName.trim(),
        email: accEmail.trim(),
        role: accRole || positions[0] || "Waiter",
      };
      const updated = [...accounts, newAcc];
      setAccounts(updated);
      saveAccounts(updated);
    }
    setShowAccountForm(false);
  };

  const handleDeleteAccount = (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    saveAccounts(updated);
  };

  const handleAddPosition = () => {
    if (!newPosition.trim()) return;
    const updated = [...positions, newPosition.trim()];
    setPositions(updated);
    savePositions(updated);
    setNewPosition("");
  };

  const handleDeletePosition = (pos: string) => {
    const updated = positions.filter((p) => p !== pos);
    setPositions(updated);
    savePositions(updated);
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.table.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.user.toLowerCase().includes(logSearch.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-din-surface border-b border-din-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          data-ocid="user_mgmt.secondary_button"
          onClick={onBack}
          className="flex items-center gap-1 text-din-muted hover:text-din-text text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="w-px h-5 bg-din-border" />
        <h1 className="text-sm font-bold text-din-text">User Management</h1>
      </div>

      <div className="flex-1 p-4">
        <Tabs defaultValue="accounts">
          <TabsList className="bg-din-surface-alt border border-din-border mb-4">
            <TabsTrigger
              value="accounts"
              data-ocid="user_mgmt.tab"
              className="text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
            >
              User Accounts
            </TabsTrigger>
            <TabsTrigger
              value="positions"
              data-ocid="user_mgmt.tab"
              className="text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
            >
              User Positions
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              data-ocid="user_mgmt.tab"
              className="text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
            >
              Activity Logs
            </TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts">
            <div className="flex justify-end mb-3">
              <Button
                data-ocid="user_mgmt.primary_button"
                size="sm"
                onClick={openAddAccount}
                className="h-8 text-xs bg-din-teal/20 hover:bg-din-teal/30 border border-din-teal/40 text-din-teal"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add User
              </Button>
            </div>

            {showAccountForm && (
              <div
                data-ocid="user_mgmt.panel"
                className="bg-din-surface-alt border border-din-border rounded-lg p-4 mb-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-din-text">
                    {editingAccount ? "Edit User" : "Add New User"}
                  </h3>
                  <button
                    type="button"
                    data-ocid="user_mgmt.close_button"
                    onClick={() => setShowAccountForm(false)}
                    className="text-din-muted hover:text-din-text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-[11px] text-din-muted">Name *</Label>
                    <Input
                      data-ocid="user_mgmt.input"
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="Staff name"
                      className="bg-din-surface border-din-border text-din-text h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-din-muted">Email</Label>
                    <Input
                      data-ocid="user_mgmt.input"
                      value={accEmail}
                      onChange={(e) => setAccEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="bg-din-surface border-din-border text-din-text h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-din-muted">Role</Label>
                    <Select value={accRole} onValueChange={setAccRole}>
                      <SelectTrigger
                        data-ocid="user_mgmt.select"
                        className="bg-din-surface border-din-border text-din-text h-8 text-sm mt-1"
                      >
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-din-surface border-din-border">
                        {positions.map((pos) => (
                          <SelectItem
                            key={pos}
                            value={pos}
                            className="text-din-text"
                          >
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    data-ocid="user_mgmt.save_button"
                    size="sm"
                    onClick={handleSaveAccount}
                    disabled={!accName.trim()}
                    className="h-8 text-xs bg-din-teal/20 hover:bg-din-teal/30 border border-din-teal/40 text-din-teal"
                  >
                    {editingAccount ? "Update User" : "Add User"}
                  </Button>
                  <Button
                    data-ocid="user_mgmt.cancel_button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAccountForm(false)}
                    className="h-8 text-xs text-din-muted"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {accounts.map((acc, i) => (
                <div
                  key={acc.id}
                  data-ocid={`user_mgmt.item.${i + 1}`}
                  className="flex items-center justify-between bg-din-surface-alt border border-din-border rounded-lg px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-din-text">
                      {acc.name}
                    </p>
                    <p className="text-xs text-din-muted">
                      {acc.email} · {acc.role}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      data-ocid={`user_mgmt.edit_button.${i + 1}`}
                      onClick={() => openEditAccount(acc)}
                      className="w-7 h-7 flex items-center justify-center rounded text-din-muted hover:text-din-teal hover:bg-din-surface transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-ocid={`user_mgmt.delete_button.${i + 1}`}
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="w-7 h-7 flex items-center justify-center rounded text-din-muted hover:text-din-red hover:bg-din-surface transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div
                  data-ocid="user_mgmt.empty_state"
                  className="text-center text-din-muted text-xs py-10"
                >
                  No staff accounts yet
                </div>
              )}
            </div>
          </TabsContent>

          {/* Positions Tab */}
          <TabsContent value="positions">
            <div className="flex gap-2 mb-4">
              <Input
                data-ocid="user_mgmt.input"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="New position name"
                className="bg-din-surface border-din-border text-din-text h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddPosition()}
              />
              <Button
                data-ocid="user_mgmt.primary_button"
                size="sm"
                onClick={handleAddPosition}
                disabled={!newPosition.trim()}
                className="h-8 text-xs bg-din-teal/20 hover:bg-din-teal/30 border border-din-teal/40 text-din-teal whitespace-nowrap"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Position
              </Button>
            </div>
            <div className="space-y-2">
              {positions.map((pos, i) => (
                <div
                  key={pos}
                  data-ocid={`user_mgmt.item.${i + 1}`}
                  className="flex items-center justify-between bg-din-surface-alt border border-din-border rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-din-text">{pos}</span>
                  <button
                    type="button"
                    data-ocid={`user_mgmt.delete_button.${i + 1}`}
                    onClick={() => handleDeletePosition(pos)}
                    className="w-6 h-6 flex items-center justify-center rounded text-din-muted hover:text-din-red transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-din-muted" />
              <Input
                data-ocid="user_mgmt.search_input"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search logs…"
                className="bg-din-surface border-din-border text-din-text h-8 text-sm pl-8"
              />
            </div>
            <div className="space-y-1.5">
              {filteredLogs.length === 0 ? (
                <div
                  data-ocid="user_mgmt.empty_state"
                  className="text-center text-din-muted text-xs py-10"
                >
                  No activity logs
                </div>
              ) : (
                filteredLogs.map((log, i) => (
                  <div
                    key={`log-${log.timestamp}-${i}`}
                    data-ocid={`user_mgmt.item.${i + 1}`}
                    className="bg-din-surface-alt border border-din-border rounded-lg px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-din-text">
                        {log.action}
                      </span>
                      <span className="text-din-muted">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-din-muted mt-0.5">
                      Table: {log.table} · Order #{log.orderId} · {log.user}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
