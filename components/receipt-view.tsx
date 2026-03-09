"use client";

import { useRef } from "react";
import { type Sale } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, Check } from "lucide-react";

interface ReceiptViewProps {
  sale: Sale;
  onClose?: () => void;
}

// Format price in MMK
const formatMMK = (amount: number) => {
  return new Intl.NumberFormat("my-MM", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " MMK";
};

const SHOP_NAME = "AEV Auto Film & Accessories";
const SHOP_ADDRESS = "Yangon, Myanmar";
const SHOP_PHONE = "+95 9 123 456 789";

export function ReceiptView({ sale, onClose }: ReceiptViewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${sale.id.slice(0, 8)}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              max-width: 300px;
              margin: 0 auto;
              padding: 20px;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .header h1 { font-size: 16px; margin: 0; }
            .header p { margin: 2px 0; color: #666; }
            .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .item-name { flex: 1; }
            .item-qty { width: 30px; text-align: center; }
            .item-price { width: 60px; text-align: right; }
            .total-line { display: flex; justify-content: space-between; margin: 5px 0; }
            .grand-total { font-weight: bold; font-size: 14px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${SHOP_NAME}</h1>
            <p>${SHOP_ADDRESS}</p>
            <p>${SHOP_PHONE}</p>
          </div>
          <div class="divider"></div>
          <p>Receipt #: ${sale.id.slice(0, 8).toUpperCase()}</p>
          <p>Date: ${new Date(sale.createdAt).toLocaleDateString()}</p>
          <p>Time: ${new Date(sale.createdAt).toLocaleTimeString()}</p>
          <p>Cashier: ${sale.userName}</p>
          <div class="divider"></div>
          ${sale.items
            .map(
              (item) => `
            <div class="item">
              <span class="item-name">${item.productName}</span>
              <span class="item-qty">x${item.quantity}</span>
              <span class="item-price">${Math.round(item.total).toLocaleString()} MMK</span>
            </div>
          `
            )
            .join("")}
          <div class="divider"></div>
          <div class="total-line grand-total">
            <span>TOTAL:</span>
            <span>${Math.round(sale.total).toLocaleString()} MMK</span>
          </div>
          <div class="divider"></div>
          <div class="total-line">
            <span>Payment:</span>
            <span>${sale.paymentMethod.toUpperCase()}</span>
          </div>
          ${
            sale.paymentMethod === "cash"
              ? `
            <div class="total-line">
              <span>Cash Received:</span>
              <span>${Math.round(sale.cashReceived || 0).toLocaleString()} MMK</span>
            </div>
            <div class="total-line">
              <span>Change:</span>
              <span>${Math.round(sale.change || 0).toLocaleString()} MMK</span>
            </div>
          `
              : ""
          }
          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>Have a great day!</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <div
        ref={receiptRef}
        className="bg-card rounded-lg border border-border p-4 font-mono text-sm"
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="font-bold text-lg">{SHOP_NAME}</h2>
          <p className="text-xs text-muted-foreground">{SHOP_ADDRESS}</p>
          <p className="text-xs text-muted-foreground">{SHOP_PHONE}</p>
        </div>

        <Separator className="my-3" />

        {/* Sale Info */}
        <div className="space-y-1 text-xs">
          <p>
            <span className="text-muted-foreground">Receipt #:</span>{" "}
            {sale.id.slice(0, 8).toUpperCase()}
          </p>
          <p>
            <span className="text-muted-foreground">Date:</span>{" "}
            {new Date(sale.createdAt).toLocaleDateString()}
          </p>
          <p>
            <span className="text-muted-foreground">Time:</span>{" "}
            {new Date(sale.createdAt).toLocaleTimeString()}
          </p>
          <p>
            <span className="text-muted-foreground">Cashier:</span>{" "}
            {sale.userName}
          </p>
        </div>

        <Separator className="my-3" />

        {/* Items */}
        <div className="space-y-2">
          {sale.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <div className="flex-1">
                <p className="truncate">{item.productName}</p>
                <p className="text-muted-foreground">
                  {item.quantity} x {formatMMK(item.price)}
                </p>
              </div>
              <span className="font-medium">{formatMMK(item.total)}</span>
            </div>
          ))}
        </div>

        <Separator className="my-3" />

        {/* Totals */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL:</span>
            <span>{formatMMK(sale.total)}</span>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Payment */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Payment Method:</span>
            <span className="uppercase">{sale.paymentMethod}</span>
          </div>
          {sale.paymentMethod === "cash" && (
            <>
              <div className="flex justify-between">
                <span>Cash Received:</span>
                <span>{formatMMK(sale.cashReceived || 0)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Change:</span>
                <span>{formatMMK(sale.change || 0)}</span>
              </div>
            </>
          )}
        </div>

        <Separator className="my-3" />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Thank you for shopping with us!</p>
          <p>Have a great day!</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
        <Button className="flex-1" onClick={onClose}>
          <Check className="mr-2 h-4 w-4" />
          Done
        </Button>
      </div>
    </div>
  );
}
