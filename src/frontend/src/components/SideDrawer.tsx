import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  BarChart3,
  Car,
  ChefHat,
  ClipboardList,
  FileText,
  LayoutDashboard,
  QrCode,
  Receipt,
  Settings,
  ShoppingBag,
  Users,
  X,
  XCircle,
} from "lucide-react";

export type AppView =
  | "dashboard"
  | "summary"
  | "orderList"
  | "invoiceList"
  | "userManagement"
  | "dayEndReport"
  | "settings"
  | "reports"
  | "cancelledOrders"
  | "qrcodes";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  view?: AppView;
  dividerBefore?: boolean;
}

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenNewOrder: (type?: "takeAway" | "driveIn") => void;
  onOpenMenuAdmin: () => void;
}

export function SideDrawer({
  open,
  onClose,
  currentView,
  onNavigate,
  onOpenNewOrder,
  onOpenMenuAdmin,
}: SideDrawerProps) {
  const navigate = (view: AppView) => {
    onNavigate(view);
    onClose();
  };

  const kitchenSoon = (n: number) => {
    // Kitchen screens are future features
    onClose();
    alert(`Kitchen ${n}: Feature coming soon`);
  };

  const navItems: NavItem[] = [
    {
      label: "Dine In",
      icon: <LayoutDashboard className="w-4 h-4" />,
      action: () => navigate("dashboard"),
      view: "dashboard",
    },
    {
      label: "Take Away Order",
      icon: <ShoppingBag className="w-4 h-4" />,
      action: () => {
        onOpenNewOrder("takeAway");
        onClose();
      },
    },
    {
      label: "Drive In Order",
      icon: <Car className="w-4 h-4" />,
      action: () => {
        onOpenNewOrder("driveIn");
        onClose();
      },
    },
    {
      label: "QR Codes & Links",
      icon: <QrCode className="w-4 h-4" />,
      action: () => navigate("qrcodes"),
      view: "qrcodes",
    },
    {
      label: "Kitchen 1",
      icon: <ChefHat className="w-4 h-4" />,
      action: () => kitchenSoon(1),
    },
    {
      label: "Kitchen 2",
      icon: <ChefHat className="w-4 h-4" />,
      action: () => kitchenSoon(2),
    },
    {
      label: "Kitchen 3",
      icon: <ChefHat className="w-4 h-4" />,
      action: () => kitchenSoon(3),
    },
    {
      label: "Kitchen 4",
      icon: <ChefHat className="w-4 h-4" />,
      action: () => kitchenSoon(4),
    },
    {
      label: "Menu",
      icon: <ClipboardList className="w-4 h-4" />,
      action: () => {
        onOpenMenuAdmin();
        onClose();
      },
    },
    {
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
      action: () => navigate("settings"),
      view: "settings",
    },
    {
      label: "Day-end Report",
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => navigate("dayEndReport"),
      view: "dayEndReport",
      dividerBefore: true,
    },
    {
      label: "Summary of the Day",
      icon: <Activity className="w-4 h-4" />,
      action: () => navigate("summary"),
      view: "summary",
    },
    {
      label: "Order List",
      icon: <FileText className="w-4 h-4" />,
      action: () => navigate("orderList"),
      view: "orderList",
    },
    {
      label: "Cancelled Orders",
      icon: <XCircle className="w-4 h-4" />,
      action: () => navigate("cancelledOrders"),
      view: "cancelledOrders",
    },
    {
      label: "Invoice List",
      icon: <Receipt className="w-4 h-4" />,
      action: () => navigate("invoiceList"),
      view: "invoiceList",
    },
    {
      label: "Reports",
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => navigate("reports"),
      view: "reports",
    },
    {
      label: "User Management",
      icon: <Users className="w-4 h-4" />,
      action: () => navigate("userManagement"),
      view: "userManagement",
      dividerBefore: true,
    },
  ];

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          data-ocid="drawer.modal"
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          role="presentation"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-din-surface border-r border-din-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-din-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-din-teal/20 border border-din-teal/40 flex items-center justify-center">
              <span className="text-xs font-bold text-din-teal">D</span>
            </div>
            <span className="font-bold text-din-text text-sm">Dinki Pos</span>
          </div>
          <button
            type="button"
            data-ocid="drawer.close_button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-din-surface-alt text-din-muted hover:text-din-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <ScrollArea className="flex-1">
          <nav className="py-2">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.dividerBefore && (
                  <div className="my-2 mx-3 border-t border-din-border" />
                )}
                <button
                  type="button"
                  data-ocid="nav.link"
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                    item.view && currentView === item.view
                      ? "bg-din-teal/15 text-din-teal border-l-2 border-din-teal"
                      : "text-din-muted hover:text-din-text hover:bg-din-surface-alt"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 ${
                      item.view && currentView === item.view
                        ? "text-din-teal"
                        : "text-din-muted"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-din-border">
          <p className="text-[10px] text-din-muted/60 text-center">
            © {new Date().getFullYear()} Dinki Pos
          </p>
        </div>
      </div>
    </>
  );
}
