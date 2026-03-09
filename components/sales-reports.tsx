"use client";

import { useState, useEffect } from "react";
import { SaleDB, type Sale } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  CreditCard,
  Banknote,
  FileDown,
  Eye,
  TrendingUp,
} from "lucide-react";
import { ReceiptView } from "./receipt-view";

// Format price in MMK
const formatMMK = (amount: number) => {
  return new Intl.NumberFormat("my-MM", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " MMK";
};

interface DailySummary {
  totalSales: number;
  totalTransactions: number;
  totalItems: number;
  averageTransaction: number;
  salesByPaymentMethod: { cash: number; card: number };
}

export function SalesReports() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDailyData();
  }, [selectedDate]);

  const loadDailyData = async () => {
    setIsLoading(true);
    const date = new Date(selectedDate);

    const [dailySummary, dailySales] = await Promise.all([
      SaleDB.getDailySummary(date),
      SaleDB.getByDateRange(
        new Date(date.setHours(0, 0, 0, 0)),
        new Date(date.setHours(23, 59, 59, 999))
      ),
    ]);

    setSummary(dailySummary);
    setSales(
      dailySales.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
    setIsLoading(false);
  };

  const exportToPDF = () => {
    if (!summary || sales.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const date = new Date(selectedDate);
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Sales Report - ${formattedDate}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #333;
            }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .summary-card {
              background: #f8f9fa;
              border-radius: 8px;
              padding: 20px;
            }
            .summary-card h3 { margin: 0 0 10px; font-size: 14px; color: #666; }
            .summary-card .value { font-size: 24px; font-weight: bold; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th { background: #f8f9fa; font-weight: 600; }
            .text-right { text-align: right; }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>EV Accessories Shop</h1>
            <p>Daily Sales Report</p>
            <p><strong>${formattedDate}</strong></p>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <h3>Total Revenue</h3>
              <div class="value">${Math.round(summary.totalSales).toLocaleString()} MMK</div>
            </div>
            <div class="summary-card">
              <h3>Total Transactions</h3>
              <div class="value">${summary.totalTransactions}</div>
            </div>
            <div class="summary-card">
              <h3>Items Sold</h3>
              <div class="value">${summary.totalItems}</div>
            </div>
            <div class="summary-card">
              <h3>Average Transaction</h3>
              <div class="value">${Math.round(summary.averageTransaction).toLocaleString()} MMK</div>
            </div>
          </div>

          <h2>Payment Breakdown</h2>
          <table>
            <tr>
              <td>Cash Payments</td>
              <td class="text-right">${Math.round(summary.salesByPaymentMethod.cash).toLocaleString()} MMK</td>
            </tr>
            <tr>
              <td>Card Payments</td>
              <td class="text-right">${Math.round(summary.salesByPaymentMethod.card).toLocaleString()} MMK</td>
            </tr>
          </table>

          <h2>Transaction Details</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Receipt #</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Cashier</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sales
                .map(
                  (sale) => `
                <tr>
                  <td>${new Date(sale.createdAt).toLocaleTimeString()}</td>
                  <td>${sale.id.slice(0, 8).toUpperCase()}</td>
                  <td>${sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td>${sale.paymentMethod.toUpperCase()}</td>
                  <td>${sale.userName}</td>
                  <td class="text-right">${Math.round(sale.total).toLocaleString()} MMK</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>EV Accessories Shop - Point of Sale System</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales Reports</h2>
          <p className="text-muted-foreground">
            View daily sales summaries and export reports
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="date" className="sr-only">
              Select Date
            </Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Button
            variant="outline"
            onClick={exportToPDF}
            disabled={sales.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMMK(summary?.totalSales || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {summary?.totalTransactions || 0} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Transaction
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMMK(summary?.averageTransaction || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Payment Methods
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {formatMMK(summary?.salesByPaymentMethod.cash || 0)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {formatMMK(summary?.salesByPaymentMethod.card || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Transactions</CardTitle>
          <CardDescription>
            All sales transactions for{" "}
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No sales recorded</h3>
              <p className="text-muted-foreground">
                No transactions found for this date
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[80px]">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="font-mono">
                      {sale.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      {sale.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}{" "}
                      items
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {sale.paymentMethod === "cash" ? (
                          <Banknote className="mr-1 h-3 w-3" />
                        ) : (
                          <CreditCard className="mr-1 h-3 w-3" />
                        )}
                        {sale.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>{sale.userName}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMMK(sale.total)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedSale(sale)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog
        open={!!selectedSale}
        onOpenChange={() => setSelectedSale(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <ReceiptView
              sale={selectedSale}
              onClose={() => setSelectedSale(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
