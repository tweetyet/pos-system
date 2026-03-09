"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Boxes,
  LogOut,
  Menu,
  User,
} from "lucide-react";
import { Dashboard } from "./dashboard";
import { SalesTerminal } from "./sales-terminal";
import { ProductManagement } from "./product-management";
import { StockManagement } from "./stock-management";
import { SalesReports } from "./sales-reports";

type View = "dashboard" | "sales" | "products" | "stock" | "reports";

interface NavItem {
  id: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "products", label: "Products", icon: Package, ownerOnly: false },
  { id: "stock", label: "Stock", icon: Boxes, ownerOnly: false },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export function POSLayout() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const filteredNavItems = navItems;

  const handleNavClick = (view: View) => {
    setCurrentView(view);
    setIsMobileNavOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "sales":
        return <SalesTerminal />;
      case "products":
        return <ProductManagement />;
      case "stock":
        return <StockManagement />;
      case "reports":
        return <SalesReports />;
      default:
        return <Dashboard />;
    }
  };

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-primary">
          <Image
            src="/logo.jpg"
            alt="AEV Auto Logo"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h1 className="font-bold text-primary">AEV Auto</h1>
          <p className="text-xs text-muted-foreground">Film & Accessories</p>
        </div>
      </div>
      <Separator className="bg-border/50" />
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <Separator className="bg-border/50" />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <User className="h-4 w-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
              {user?.role}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start border-border hover:bg-secondary hover:text-foreground"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-sidebar">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-border">
              <div className="flex h-full flex-col">
                <NavContent />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-full border border-primary">
              <Image
                src="/logo.jpg"
                alt="AEV Auto Logo"
                fill
                className="object-cover"
              />
            </div>
            <span className="font-bold text-primary">AEV Auto</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="border-primary/50 text-primary">{user?.role}</Badge>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-background">{renderView()}</main>
      </div>
    </div>
  );
}
