"use client";

import { useState, useEffect, useCallback } from "react";
import { ProductDB, SaleDB, StockMovementDB, type Product, type Sale, type SaleItem } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Printer,
} from "lucide-react";
import { ReceiptView } from "./receipt-view";

interface CartItem extends SaleItem {
  maxStock: number;
}

// Format price in MMK
const formatMMK = (amount: number) => {
  return new Intl.NumberFormat("my-MM", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " MMK";
};

export function SalesTerminal() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const allProducts = await ProductDB.getAll();
    setProducts(allProducts.filter((p) => p.stock > 0));
    setIsLoading(false);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          total: product.price,
          maxStock: product.stock,
        },
      ];
    });
  }, []);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0) return null;
            if (newQuantity > item.maxStock) return item;
            return {
              ...item,
              quantity: newQuantity,
              total: newQuantity * item.price,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => sum + item.total, 0);
  const change =
    paymentMethod === "cash" && cashReceived
      ? parseFloat(cashReceived) - total
      : 0;

  const handleCheckout = async () => {
    if (!user) return;

    const sale: Sale = {
      id: crypto.randomUUID(),
      items: cart.map(({ productId, productName, quantity, price, total }) => ({
        productId,
        productName,
        quantity,
        price,
        total,
      })),
      subtotal: total,
      tax: 0,
      total,
      paymentMethod,
      cashReceived: paymentMethod === "cash" ? parseFloat(cashReceived) : undefined,
      change: paymentMethod === "cash" ? change : undefined,
      userId: user.id,
      userName: user.name,
      createdAt: new Date(),
    };

    // Save sale
    await SaleDB.add(sale);

    // Update stock for each item and create stock movements
    for (const item of cart) {
      await ProductDB.updateStock(item.productId, -item.quantity);
      await StockMovementDB.add({
        id: crypto.randomUUID(),
        productId: item.productId,
        productName: item.productName,
        type: "out",
        quantity: item.quantity,
        reason: `Sale #${sale.id.slice(0, 8)}`,
        userId: user.id,
        userName: user.name,
        createdAt: new Date(),
      });
    }

    setCompletedSale(sale);
    setCart([]);
    setIsCheckoutOpen(false);
    setCashReceived("");
    loadProducts();
  };

  const canCheckout =
    paymentMethod === "card" ||
    (paymentMethod === "cash" && parseFloat(cashReceived) >= total);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Product Grid */}
      <div className="lg:col-span-2 flex flex-col">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {product.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Stock: {product.stock}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  <p className="text-lg font-bold">{formatMMK(product.price)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No products available</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Add products to your inventory"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Current Sale</CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mb-2" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs">Click products to add them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-start justify-between gap-2 pb-3 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.productName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatMMK(item.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, 1)}
                        disabled={item.quantity >= item.maxStock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {cart.length > 0 && (
            <CardFooter className="flex-col border-t pt-4">
              <div className="w-full space-y-2 mb-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatMMK(total)}</span>
                </div>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => setIsCheckoutOpen(true)}
              >
                Checkout
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as "cash" | "card")}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="cash"
                    id="cash"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="cash"
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Banknote className="mb-2 h-6 w-6" />
                    Cash
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="card"
                    id="card"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="card"
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <CreditCard className="mb-2 h-6 w-6" />
                    Card
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <Label htmlFor="cashReceived">Cash Received</Label>
                <Input
                  id="cashReceived"
                  type="number"
                  step="0.01"
                  min={total}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={`Minimum: ${formatMMK(total)}`}
                />
                {parseFloat(cashReceived) >= total && (
                  <p className="text-sm font-medium text-emerald-600">
                    Change: {formatMMK(change)}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Due</span>
                <span>{formatMMK(total)}</span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={!canCheckout}
            >
              Complete Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={!!completedSale}
        onOpenChange={() => setCompletedSale(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Sale Complete
            </DialogTitle>
          </DialogHeader>
          {completedSale && (
            <ReceiptView
              sale={completedSale}
              onClose={() => setCompletedSale(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
