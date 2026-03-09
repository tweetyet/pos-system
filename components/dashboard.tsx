"use client";

import { useState, useEffect } from "react";
import { ProductDB, SaleDB, type Product } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Banknote,
} from "lucide-react";
import Image from "next/image";

// Format price in MMK
const formatMMK = (amount: number) => {
  return new Intl.NumberFormat("my-MM", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " MMK";
};

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  totalProducts: number;
  lowStockCount: number;
  todayItems: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayTransactions: 0,
    totalProducts: 0,
    lowStockCount: 0,
    todayItems: 0,
  });
  const [recentSales, setRecentSales] = useState<
    { time: string; amount: number; items: number }[]
  >([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const [products, todaySummary, todaySalesData] = await Promise.all([
      ProductDB.getAll(),
      SaleDB.getDailySummary(new Date()),
      SaleDB.getTodaySales(),
    ]);

    const lowStock = products.filter((p) => p.stock <= p.minStock);

    setStats({
      todaySales: todaySummary.totalSales,
      todayTransactions: todaySummary.totalTransactions,
      totalProducts: products.length,
      lowStockCount: lowStock.length,
      todayItems: todaySummary.totalItems,
    });

    setLowStockProducts(lowStock);

    // Get recent sales for activity feed
    setRecentSales(
      todaySalesData
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5)
        .map((sale) => ({
          time: new Date(sale.createdAt).toLocaleTimeString(),
          amount: sale.total,
          items: sale.items.reduce((sum, item) => sum + item.quantity, 0),
        }))
    );

    setIsLoading(false);
  };

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-primary">
          <Image
            src="/logo.jpg"
            alt="AEV Auto Logo"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {greeting}, {user?.name}!
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening at <span className="text-primary font-medium">AEV Auto</span> today
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Revenue
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMMK(stats.todaySales)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.todayTransactions} transactions today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayItems}</div>
            <p className="text-xs text-muted-foreground">Products sold today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              In your inventory
            </p>
          </CardContent>
        </Card>
        <Card className={stats.lowStockCount > 0 ? "border-amber-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${stats.lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${stats.lowStockCount > 0 ? "text-amber-600" : ""}`}
            >
              {stats.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">Products need restock</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Sales
            </CardTitle>
            <CardDescription>Latest transactions today</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No sales yet today
                </p>
                <p className="text-xs text-muted-foreground">
                  Start selling to see activity here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{formatMMK(sale.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.items} item{sale.items !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge variant="secondary">{sale.time}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Stock Alerts
            </CardTitle>
            <CardDescription>Products that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  All products are well stocked
                </p>
                <p className="text-xs text-muted-foreground">
                  No immediate restocking needed
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.sku}
                      </p>
                    </div>
                    <Badge
                      variant={product.stock === 0 ? "destructive" : "secondary"}
                      className={
                        product.stock > 0 ? "bg-amber-100 text-amber-800" : ""
                      }
                    >
                      {product.stock === 0
                        ? "Out of Stock"
                        : `${product.stock} left`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
