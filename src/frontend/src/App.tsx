import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Bell,
  Car,
  CheckCheck,
  Clock,
  LayoutGrid,
  List,
  Menu,
  Plus,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Notification, Order, OrderInput, OrderItem } from "./backend";
import { OrderStatus } from "./backend";
import { AdminPinGate } from "./components/AdminPinGate";
import { CustomerOrder } from "./components/CustomerOrder";
import { CustomerOrderUnified } from "./components/CustomerOrderUnified";
import { DayEndReport } from "./components/DayEndReport";
import { DriveInMenuDisplay } from "./components/DriveInMenuDisplay";
import { InvoiceListScreen } from "./components/InvoiceListScreen";
import { KpiCard } from "./components/KpiCard";
import { MenuAdmin } from "./components/MenuAdmin";
import { NewOrderModal } from "./components/NewOrderModal";
import { NotificationItem } from "./components/NotificationItem";
import { OrderCard } from "./components/OrderCard";
import { OrderListScreen } from "./components/OrderListScreen";
import { QRCodesPanel } from "./components/QRCodesPanel";
import { ReportsScreen } from "./components/ReportsScreen";
import { SettingsPanel } from "./components/SettingsPanel";
import type { AppView } from "./components/SideDrawer";
import { SideDrawer } from "./components/SideDrawer";
import { SummaryOfDay } from "./components/SummaryOfDay";
import { TableGridView } from "./components/TableGridView";
import { UserManagement, logActivity } from "./components/UserManagement";
import { useActor } from "./hooks/useActor";
import { useMenu } from "./hooks/useMenu";
import { loadMutePref, saveMutePref, useSound } from "./hooks/useSound";

const isCustomerMode =
  new URLSearchParams(window.location.search).get("mode") === "customer";
const isDriveInMode =
  new URLSearchParams(window.location.search).get("mode") === "drivein";
const isMenuOnlyMode =
  new URLSearchParams(window.location.search).get("mode") === "menuonly";
const isUnifiedOrderMode =
  new URLSearchParams(window.location.search).get("mode") === "order";

export default function App() {
  if (isCustomerMode) {
    return <CustomerOrder />;
  }
  if (isDriveInMode) {
    return <CustomerOrder mode="drivein" />;
  }
  if (isMenuOnlyMode) {
    return <DriveInMenuDisplay />;
  }
  if (isUnifiedOrderMode) {
    return <CustomerOrderUnified />;
  }
  return (
    <AdminPinGate>
      <StaffDashboard />
    </AdminPinGate>
  );
}

function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    const prompt = deferredPrompt as BeforeInstallPromptEvent;
    prompt.prompt();
    await prompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div
      data-ocid="pwa.panel"
      className="bg-din-teal/10 border-b border-din-teal/30 px-4 py-2 flex items-center gap-3"
    >
      <Smartphone className="w-4 h-4 text-din-teal flex-shrink-0" />
      <p className="text-xs text-din-teal flex-1">
        📲 Install <strong>Dinki Pos</strong> on your phone for offline access
      </p>
      <Button
        data-ocid="pwa.primary_button"
        size="sm"
        onClick={handleInstall}
        className="h-6 text-[11px] px-2 bg-din-teal hover:bg-din-teal/80 text-white font-semibold flex-shrink-0"
      >
        Install
      </Button>
      <button
        type="button"
        data-ocid="pwa.close_button"
        onClick={() => setDismissed(true)}
        className="w-5 h-5 flex items-center justify-center text-din-teal/60 hover:text-din-teal transition-colors flex-shrink-0"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Extend Window type for beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function StaffDashboard() {
  const { actor } = useActor();
  const { menuItems, reloadMenu } = useMenu();

  // liveOrders: only non-fulfilled orders shown on the main Live Orders page
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  // allOrders: ALL orders including fulfilled, used for reports/invoices/KPI totals
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(loadMutePref);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newOrderDefaultTakeAway, setNewOrderDefaultTakeAway] = useState(false);
  const [newOrderDefaultDriveIn, setNewOrderDefaultDriveIn] = useState(false);
  const [showMenuAdmin, setShowMenuAdmin] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("dashboard");
  const [filter, setFilter] = useState<
    "all" | "pending" | "preparing" | "ready"
  >("all");
  const [viewMode, setViewMode] = useState<"list" | "table">("list");

  const seenNotifIds = useRef<Set<string>>(new Set());
  const notificationsRef = useRef<Notification[]>([]);
  // Track locally closed/cancelled orders so polling never re-shows them
  const closedOrderIds = useRef<Set<string>>(new Set());
  const unacknowledgedCount = notifications.filter(
    (n) => !n.acknowledged,
  ).length;

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useSound(unacknowledgedCount, isMuted);

  const fetchData = useCallback(async () => {
    if (!actor) return;
    try {
      const [fetchedOrders, fetchedNotifs] = await Promise.all([
        actor.getAllOrders(),
        actor.getNotifications(),
      ]);

      const sortedAll = fetchedOrders
        .slice()
        .sort((a, b) => Number(b.timestamp - a.timestamp));

      setAllOrders(sortedAll);
      setLiveOrders(
        sortedAll.filter(
          (o) =>
            o.status !== OrderStatus.fulfilled &&
            o.status !== OrderStatus.cancelled &&
            !closedOrderIds.current.has(o.id.toString()),
        ),
      );

      const newNotifs = fetchedNotifs.filter(
        (n) => !n.acknowledged && !seenNotifIds.current.has(n.id.toString()),
      );
      if (newNotifs.length > 0 && seenNotifIds.current.size > 0) {
        for (const n of newNotifs) {
          toast(n.message, {
            description: `Order #${Number(n.orderId).toString().padStart(4, "0")}`,
            duration: 5000,
          });
        }
      }
      for (const n of fetchedNotifs.filter((n) => !n.acknowledged)) {
        seenNotifIds.current.add(n.id.toString());
      }

      const sorted = fetchedNotifs
        .slice()
        .sort((a, b) => Number(b.timestamp - a.timestamp));
      const sliced = sorted.slice(0, 20);
      setNotifications(sliced);
      notificationsRef.current = sliced;
    } catch (_e) {
      // silently fail polls
    }
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [actor, fetchData]);

  const handleUpdateStatus = async (orderId: bigint, status: OrderStatus) => {
    if (!actor) return;
    try {
      await actor.updateOrderStatus(orderId, status);

      // Optimistic update on liveOrders: remove fulfilled orders immediately
      if (status === OrderStatus.fulfilled) {
        closedOrderIds.current.add(orderId.toString());
        setLiveOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setLiveOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
        );
      }

      const relatedNotifs = notificationsRef.current.filter(
        (n) => !n.acknowledged && n.orderId === orderId,
      );
      await Promise.all(
        relatedNotifs.map((n) => actor.acknowledgeNotification(n.id)),
      );
      await fetchData();
      // Log activity — look up order in allOrders so fulfilled orders are found too
      const order = allOrders.find((o) => o.id === orderId);
      logActivity({
        table: order?.vehicleInfo.licensePlate ?? "",
        action:
          status === OrderStatus.fulfilled ? "Order paid" : "Order changed",
        user: "admin@dinkidine.com",
        timestamp: Date.now(),
        orderId: Number(orderId).toString().padStart(4, "0"),
      });
      toast.success(
        `Order #${Number(orderId).toString().padStart(4, "0")} updated to ${status}`,
      );
    } catch (_e) {
      toast.error("Failed to update order status");
    }
  };

  const handleAcknowledge = async (id: bigint) => {
    if (!actor) return;
    try {
      await actor.acknowledgeNotification(id);
      await fetchData();
    } catch (_e) {
      toast.error("Failed to acknowledge notification");
    }
  };

  const handleAcknowledgeAll = async () => {
    if (!actor) return;
    try {
      await actor.acknowledgeAllNotifications();
      await fetchData();
      toast.success("All notifications acknowledged");
    } catch (_e) {
      toast.error("Failed to acknowledge notifications");
    }
  };

  const handlePlaceOrder = async (order: OrderInput) => {
    if (!actor) throw new Error("Actor not ready");
    await actor.placeOrder(order);
    await fetchData();
    // Log activity
    logActivity({
      table: order.vehicleInfo.licensePlate,
      action: "Order placed",
      user: "admin@dinkidine.com",
      timestamp: Date.now(),
      orderId: "new",
    });
    toast.success("Order placed successfully!");
  };

  const handleAddItems = async (
    orderId: bigint,
    newItems: OrderItem[],
    packingCharge: bigint,
    deliveryCharge: bigint,
  ) => {
    if (!actor) throw new Error("Actor not ready");
    await actor.addItemsToOrder(
      orderId,
      newItems,
      packingCharge,
      deliveryCharge,
    );
    await fetchData();
    toast.success(
      `Items added to Order #${Number(orderId).toString().padStart(4, "0")}`,
    );
  };

  const handleCancelOrder = async (orderId: bigint, reason: string) => {
    closedOrderIds.current.add(orderId.toString());
    if (!actor) return;
    await actor.cancelOrder(orderId, reason);
    await fetchData();
    toast.success(
      `Order #${Number(orderId).toString().padStart(4, "0")} cancelled`,
    );
  };

  const handleEditOrder = async (
    orderId: bigint,
    items: OrderItem[],
    packingCharge: bigint,
    deliveryCharge: bigint,
    discount: bigint,
    discountType: string,
  ) => {
    if (!actor) return;
    await actor.updateOrderItems(orderId, items, packingCharge, deliveryCharge);
    await actor.updateOrderDiscount(orderId, discount, discountType);
    await fetchData();
    toast.success("Invoice updated");
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      saveMutePref(next);
      return next;
    });
  };

  const openNewOrder = (type?: "takeAway" | "driveIn") => {
    setNewOrderDefaultTakeAway(type === "takeAway");
    setNewOrderDefaultDriveIn(type === "driveIn");
    setShowNewOrderModal(true);
  };

  // Main page: show only live (non-fulfilled) orders, filtered by status pill
  const filteredOrders = liveOrders.filter(
    (o) =>
      o.status !== OrderStatus.fulfilled &&
      o.status !== OrderStatus.cancelled &&
      (filter === "all" || o.status === filter),
  );

  // Table grid view: only open/active orders
  const activeOrders = liveOrders;

  // KPI counts: pending/active from liveOrders; totals from allOrders for accurate day totals
  const pendingCount = liveOrders.filter(
    (o) => o.status === OrderStatus.pending,
  ).length;
  const activeCount = liveOrders.filter(
    (o) => o.status === OrderStatus.preparing || o.status === OrderStatus.ready,
  ).length;
  const totalOrders = allOrders.length;
  const totalItems = allOrders.reduce(
    (s, o) => s + o.items.reduce((si, i) => si + Number(i.quantity), 0),
    0,
  );

  const FILTER_PILLS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready" },
  ] as const;

  const viewToggle = (
    <div className="flex items-center gap-0.5 ml-1 border border-din-border rounded-lg overflow-hidden">
      <button
        type="button"
        data-ocid="orders.toggle"
        onClick={() => setViewMode("list")}
        title="List view"
        className={`w-7 h-7 flex items-center justify-center transition-colors ${
          viewMode === "list"
            ? "bg-din-teal/20 text-din-teal"
            : "text-din-muted hover:text-din-text hover:bg-din-surface-alt"
        }`}
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        data-ocid="orders.toggle"
        onClick={() => setViewMode("table")}
        title="Table grid view"
        className={`w-7 h-7 flex items-center justify-center transition-colors ${
          viewMode === "table"
            ? "bg-din-teal/20 text-din-teal"
            : "text-din-muted hover:text-din-text hover:bg-din-surface-alt"
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const ordersSection = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-din-text">Live Orders</h2>
          {viewToggle}
        </div>
        {viewMode === "list" && (
          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_PILLS.map((pill) => (
              <button
                type="button"
                key={pill.key}
                data-ocid="orders.tab"
                onClick={() => setFilter(pill.key)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors border ${
                  filter === pill.key
                    ? "bg-din-teal/20 border-din-teal/50 text-din-teal"
                    : "border-din-border text-din-muted hover:text-din-text hover:border-din-muted"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewMode === "list" ? (
        <ScrollArea className="flex-1 pr-2">
          {filteredOrders.length === 0 ? (
            <div
              data-ocid="orders.empty_state"
              className="flex flex-col items-center justify-center h-48 text-din-muted"
            >
              <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No orders yet</p>
              <p className="text-xs opacity-60">New orders will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {filteredOrders.map((order, i) => (
                <OrderCard
                  key={order.id.toString()}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                  onAddItems={handleAddItems}
                  onCancelOrder={handleCancelOrder}
                  onApplyDiscount={async (orderId, discount, discountType) => {
                    if (!actor) return;
                    await actor.updateOrderDiscount(
                      orderId,
                      discount,
                      discountType,
                    );
                  }}
                  index={i + 1}
                  menuItems={menuItems}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      ) : (
        <div className="flex-1 overflow-hidden">
          <TableGridView
            orders={activeOrders}
            menuItems={menuItems}
            onAddItems={handleAddItems}
            onUpdateStatus={handleUpdateStatus}
          />
        </div>
      )}
    </>
  );

  const notificationsSection = (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-din-text">Order Notifications</h2>
        {unacknowledgedCount > 0 && (
          <Button
            data-ocid="notifications.primary_button"
            size="sm"
            variant="outline"
            onClick={handleAcknowledgeAll}
            className="h-7 text-xs px-2 border-din-border text-din-muted hover:bg-din-surface-alt flex items-center gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            Ack All
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div
            data-ocid="notifications.empty_state"
            className="flex flex-col items-center justify-center h-48 text-din-muted"
          >
            <Bell className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs opacity-60">Alerts appear here</p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {notifications.map((notif, i) => (
              <NotificationItem
                key={notif.id.toString()}
                notification={notif}
                onAcknowledge={handleAcknowledge}
                index={i + 1}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );

  if (showMenuAdmin) {
    return (
      <>
        <Toaster position="top-right" theme="dark" />
        <MenuAdmin
          menuItems={menuItems}
          onBack={() => setShowMenuAdmin(false)}
          onReload={reloadMenu}
        />
      </>
    );
  }

  // Alternate views — pass allOrders so reports/invoices see fulfilled orders too
  if (currentView === "summary") {
    return (
      <>
        <Toaster position="top-right" theme="dark" />
        <SummaryOfDay
          orders={allOrders}
          onBack={() => setCurrentView("dashboard")}
        />
      </>
    );
  }
  if (currentView === "orderList") {
    return (
      <>
        <Toaster position="top-right" theme="dark" />
        <OrderListScreen
          orders={allOrders}
          onBack={() => setCurrentView("dashboard")}
        />
      </>
    );
  }
  if (currentView === "invoiceList") {
    return (
      <>
        <Toaster position="top-right" theme="dark" />
        <InvoiceListScreen
          orders={allOrders}
          onBack={() => setCurrentView("dashboard")}
          onEditOrder={handleEditOrder}
        />
      </>
    );
  }
  if (currentView === "userManagement") {
    return (
      <>
        <Toaster position="top-right" theme="dark" />
        <UserManagement onBack={() => setCurrentView("dashboard")} />
      </>
    );
  }
  if (currentView === "dayEndReport") {
    return (
      <>
        <Toaster position="top-right" theme="dark" />
        <DayEndReport
          orders={allOrders}
          onBack={() => setCurrentView("dashboard")}
        />
      </>
    );
  }

  if (currentView === "settings") {
    return (
      <>
        <Toaster position="top-right" theme="dark" />
        <SettingsPanel
          onBack={() => setCurrentView("dashboard")}
          orders={allOrders}
          onEditOrder={handleEditOrder}
        />
      </>
    );
  }

  if (currentView === "reports") {
    return (
      <>
        <Toaster position="top-right" theme="dark" />
        <ReportsScreen
          orders={allOrders}
          onBack={() => setCurrentView("dashboard")}
          menuItems={menuItems}
        />
      </>
    );
  }

  if (currentView === "cancelledOrders") {
    return (
      <>
        <Toaster position="top-right" theme="dark" />
        <OrderListScreen
          orders={allOrders}
          onBack={() => setCurrentView("dashboard")}
          defaultFilter="cancelled"
        />
      </>
    );
  }

  if (currentView === "qrcodes") {
    return (
      <>
        <Toaster position="top-right" theme="dark" />
        <QRCodesPanel onBack={() => setCurrentView("dashboard")} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-right" theme="dark" />

      <SideDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenNewOrder={openNewOrder}
        onOpenMenuAdmin={() => setShowMenuAdmin(true)}
      />

      {/* PWA Install Banner */}
      <InstallBanner />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-din-surface border-b border-din-border shadow-card">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center gap-4">
          {/* Hamburger */}
          <button
            type="button"
            data-ocid="nav.button"
            onClick={() => setShowDrawer(true)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-din-surface-alt text-din-muted hover:text-din-text transition-colors"
            title="Open menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          <div className="flex items-center gap-2 mr-4">
            <div className="w-8 h-8 rounded-full bg-din-teal/20 border border-din-teal/40 flex items-center justify-center">
              <Car className="w-4 h-4 text-din-teal" />
            </div>
            <div>
              <span className="font-bold text-din-text text-sm leading-none block">
                Dinki Pos
              </span>
              <span className="text-[10px] text-din-muted leading-none">
                Dine-In, Takeaway &amp; Drive-In
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-din-green/10 border border-din-green/30">
              <span className="w-1.5 h-1.5 rounded-full bg-din-green animate-pulse2" />
              <span className="text-[10px] font-semibold text-din-green">
                Live
              </span>
            </span>

            <button
              type="button"
              data-ocid="settings.toggle"
              onClick={toggleMute}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                isMuted
                  ? "bg-din-red/10 border-din-red/30 text-din-red"
                  : "bg-din-teal/10 border-din-teal/30 text-din-teal"
              }`}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isMuted ? "Muted" : "Sound On"}
              </span>
            </button>

            <button
              type="button"
              data-ocid="notifications.button"
              className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-din-surface-alt transition-colors"
            >
              <Bell className="w-4 h-4 text-din-muted" />
              {unacknowledgedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-din-red text-white text-[9px] font-bold flex items-center justify-center animate-pulse2">
                  {unacknowledgedCount > 9 ? "9+" : unacknowledgedCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-din-teal/20 border border-din-teal/40 flex items-center justify-center">
                <span className="text-[10px] font-bold text-din-teal">S</span>
              </div>
              <span className="text-xs font-medium text-din-text hidden sm:block">
                Staff
              </span>
            </div>

            <Button
              data-ocid="orders.open_modal_button"
              size="sm"
              onClick={() => openNewOrder()}
              className="hidden md:flex h-8 text-xs px-3 bg-din-orange hover:bg-din-orange/80 text-white font-semibold items-center"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Order
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-4 pb-24 md:pb-4">
        {/* Mobile: tabs layout */}
        <div className="md:hidden">
          <Tabs defaultValue="orders">
            <TabsList className="w-full mb-3 bg-din-surface-alt border border-din-border">
              <TabsTrigger
                value="orders"
                data-ocid="orders.tab"
                className="flex-1 text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
              >
                Live Orders{pendingCount > 0 ? ` (${pendingCount})` : ""}
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                data-ocid="notifications.tab"
                className="flex-1 text-xs data-[state=active]:bg-din-teal/20 data-[state=active]:text-din-teal"
              >
                Notifications
                {unacknowledgedCount > 0 ? ` (${unacknowledgedCount})` : ""}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="flex flex-col">
              {ordersSection}
            </TabsContent>
            <TabsContent value="notifications" className="flex flex-col">
              {notificationsSection}
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: side-by-side panels */}
        <div className="hidden md:flex gap-4 h-[calc(100vh-13rem)]">
          <section className="flex-[7] flex flex-col min-w-0">
            {ordersSection}
          </section>
          <aside className="flex-[3] flex flex-col min-w-0">
            {notificationsSection}
          </aside>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <KpiCard
            label="Pending Orders"
            value={pendingCount}
            accent="orange"
            icon={<Clock className="w-4 h-4" />}
          />
          <KpiCard
            label="Active Tables"
            value={activeCount}
            accent="teal"
            icon={<Activity className="w-4 h-4" />}
          />
          <KpiCard
            label="Total Orders"
            value={totalOrders}
            accent="green"
            icon={<UtensilsCrossed className="w-4 h-4" />}
          />
          <KpiCard
            label="Total Items"
            value={totalItems}
            accent="red"
            icon={<ShoppingBag className="w-4 h-4" />}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-din-border py-3 px-4 text-center">
        <p className="text-[11px] text-din-muted">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-din-teal hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      {/* Mobile FAB - New Order */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          type="button"
          data-ocid="orders.open_modal_button_fab"
          onClick={() => openNewOrder()}
          className="flex items-center gap-2 bg-din-orange hover:bg-din-orange/80 active:scale-95 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-din-orange/40 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      <NewOrderModal
        open={showNewOrderModal}
        onClose={() => {
          setShowNewOrderModal(false);
          setNewOrderDefaultTakeAway(false);
          setNewOrderDefaultDriveIn(false);
        }}
        onSubmit={handlePlaceOrder}
        onAddToTab={handleAddItems}
        existingOrders={liveOrders}
        backendMenuItems={menuItems}
        defaultTakeAway={newOrderDefaultTakeAway}
        defaultDriveIn={newOrderDefaultDriveIn}
        actorReady={!!actor}
      />
    </div>
  );
}
