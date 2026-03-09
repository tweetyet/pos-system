"use client";

import { useState, useEffect } from "react";
import {
  ProductDB,
  StockMovementDB,
  type Product,
  type StockMovement,
} from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Package,
  Search,
  AlertTriangle,
} from "lucide-react";

export function StockManagement() {
  const { user, isOwner } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allProducts, allMovements] = await Promise.all([
      ProductDB.getAll(),
      StockMovementDB.getAll(),
    ]);
    setProducts(allProducts);
    setMovements(allMovements.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    setIsLoading(false);
  };

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStockIn = async () => {
    if (!user || !selectedProduct || !quantity) return;

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const qty = parseInt(quantity);

    // Update product stock
    await ProductDB.updateStock(selectedProduct, qty);

    // Create stock movement record
    await StockMovementDB.add({
      id: crypto.randomUUID(),
      productId: selectedProduct,
      productName: product.name,
      type: "in",
      quantity: qty,
      reason: reason || "Stock received",
      userId: user.id,
      userName: user.name,
      createdAt: new Date(),
    });

    setIsStockInOpen(false);
    resetForm();
    loadData();
  };

  const handleStockOut = async () => {
    if (!user || !selectedProduct || !quantity) return;

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const qty = parseInt(quantity);
    if (qty > product.stock) {
      alert("Cannot remove more than available stock");
      return;
    }

    // Update product stock
    await ProductDB.updateStock(selectedProduct, -qty);

    // Create stock movement record
    await StockMovementDB.add({
      id: crypto.randomUUID(),
      productId: selectedProduct,
      productName: product.name,
      type: "out",
      quantity: qty,
      reason: reason || "Stock adjustment",
      userId: user.id,
      userName: user.name,
      createdAt: new Date(),
    });

    setIsStockOutOpen(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setSelectedProduct("");
    setQuantity("");
    setReason("");
  };

  const selectedProductStock =
    products.find((p) => p.id === selectedProduct)?.stock || 0;

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
          <h2 className="text-2xl font-bold tracking-tight">Stock Management</h2>
          <p className="text-muted-foreground">
            Manage inventory levels and track stock movements
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Dialog open={isStockInOpen} onOpenChange={setIsStockInOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={resetForm}>
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Stock In
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Stock In</DialogTitle>
                  <DialogDescription>
                    Add stock to your inventory
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} (Current: {p.stock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity to Add</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (Optional)</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., New shipment received"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsStockInOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleStockIn}
                      disabled={!selectedProduct || !quantity}
                    >
                      Add Stock
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isStockOutOpen} onOpenChange={setIsStockOutOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={resetForm}>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Stock Out
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Stock Out</DialogTitle>
                  <DialogDescription>
                    Remove stock from inventory (damaged, expired, etc.)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter((p) => p.stock > 0)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (Available: {p.stock})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity to Remove</Label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedProductStock}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity"
                    />
                    {selectedProduct && (
                      <p className="text-xs text-muted-foreground">
                        Maximum: {selectedProductStock}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., Damaged goods, inventory adjustment"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsStockOutOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleStockOut}
                      disabled={
                        !selectedProduct ||
                        !quantity ||
                        parseInt(quantity) > selectedProductStock
                      }
                      variant="destructive"
                    >
                      Remove Stock
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
            <CardDescription className="text-amber-700">
              {lowStockProducts.length} product(s) need restocking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((p) => (
                <Badge
                  key={p.id}
                  variant="secondary"
                  className="bg-amber-100 text-amber-800"
                >
                  {p.name}: {p.stock} left
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
          <TabsTrigger value="history">Movement History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No products found</h3>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Min Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.sku}
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right">
                          {product.stock}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.minStock}
                        </TableCell>
                        <TableCell>
                          {product.stock === 0 ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : product.stock <= product.minStock ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
              <CardDescription>
                Track all stock changes and adjustments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">
                    No movements recorded
                  </h3>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.slice(0, 50).map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(movement.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {movement.productName}
                        </TableCell>
                        <TableCell>
                          {movement.type === "in" ? (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                              Stock In
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              Stock Out
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {movement.type === "in" ? "+" : "-"}
                          {movement.quantity}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {movement.reason}
                        </TableCell>
                        <TableCell>{movement.userName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
