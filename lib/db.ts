// IndexedDB wrapper for offline POS system
const DB_NAME = "ev_pos_db";
const DB_VERSION = 1;

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  username: string;
  password: string; // In production, this should be hashed
  role: "owner" | "staff";
  name: string;
  createdAt: Date;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "card";
  cashReceived?: number;
  change?: number;
  userId: string;
  userName: string;
  createdAt: Date;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: "in" | "out";
  quantity: number;
  reason: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Products store
      if (!database.objectStoreNames.contains("products")) {
        const productStore = database.createObjectStore("products", {
          keyPath: "id",
        });
        productStore.createIndex("sku", "sku", { unique: true });
        productStore.createIndex("category", "category", { unique: false });
        productStore.createIndex("name", "name", { unique: false });
      }

      // Users store
      if (!database.objectStoreNames.contains("users")) {
        const userStore = database.createObjectStore("users", {
          keyPath: "id",
        });
        userStore.createIndex("username", "username", { unique: true });
      }

      // Sales store
      if (!database.objectStoreNames.contains("sales")) {
        const saleStore = database.createObjectStore("sales", {
          keyPath: "id",
        });
        saleStore.createIndex("createdAt", "createdAt", { unique: false });
        saleStore.createIndex("userId", "userId", { unique: false });
      }

      // Stock movements store
      if (!database.objectStoreNames.contains("stockMovements")) {
        const stockStore = database.createObjectStore("stockMovements", {
          keyPath: "id",
        });
        stockStore.createIndex("productId", "productId", { unique: false });
        stockStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

// Generic CRUD operations
async function getStore(
  storeName: string,
  mode: IDBTransactionMode = "readonly"
): Promise<IDBObjectStore> {
  const database = await initDB();
  const transaction = database.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getById<T>(
  storeName: string,
  id: string
): Promise<T | undefined> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function add<T>(storeName: string, item: T): Promise<T> {
  const store = await getStore(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.add(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

export async function update<T>(storeName: string, item: T): Promise<T> {
  const store = await getStore(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

export async function remove(storeName: string, id: string): Promise<void> {
  const store = await getStore(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Product specific operations
export const ProductDB = {
  getAll: () => getAll<Product>("products"),
  getById: (id: string) => getById<Product>("products", id),
  add: (product: Product) => add("products", product),
  update: (product: Product) => update("products", product),
  remove: (id: string) => remove("products", id),

  async search(query: string): Promise<Product[]> {
    const products = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.sku.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery)
    );
  },

  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.getById(id);
    if (!product) throw new Error("Product not found");
    product.stock += quantity;
    product.updatedAt = new Date();
    return this.update(product);
  },
};

// User specific operations
export const UserDB = {
  getAll: () => getAll<User>("users"),
  getById: (id: string) => getById<User>("users", id),
  add: (user: User) => add("users", user),
  update: (user: User) => update("users", user),
  remove: (id: string) => remove("users", id),

  async getByUsername(username: string): Promise<User | undefined> {
    const users = await this.getAll();
    return users.find((u) => u.username === username);
  },

  async authenticate(
    username: string,
    password: string
  ): Promise<User | null> {
    const user = await this.getByUsername(username);
    if (user && user.password === password) {
      return user;
    }
    return null;
  },

  async seedDefaultUsers(): Promise<void> {
    const users = await this.getAll();
    if (users.length === 0) {
      // Create default owner account
      await this.add({
        id: crypto.randomUUID(),
        username: "owner",
        password: "owner123",
        role: "owner",
        name: "Shop Owner",
        createdAt: new Date(),
      });
      // Create default staff account
      await this.add({
        id: crypto.randomUUID(),
        username: "staff",
        password: "staff123",
        role: "staff",
        name: "Staff Member",
        createdAt: new Date(),
      });
    }
  },
};

// Sales specific operations
export const SaleDB = {
  getAll: () => getAll<Sale>("sales"),
  getById: (id: string) => getById<Sale>("sales", id),
  add: (sale: Sale) => add("sales", sale),

  async getByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    const sales = await this.getAll();
    return sales.filter((s) => {
      const saleDate = new Date(s.createdAt);
      return saleDate >= startDate && saleDate <= endDate;
    });
  },

  async getTodaySales(): Promise<Sale[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.getByDateRange(today, tomorrow);
  },

  async getDailySummary(date: Date): Promise<{
    totalSales: number;
    totalTransactions: number;
    totalItems: number;
    averageTransaction: number;
    salesByPaymentMethod: { cash: number; card: number };
  }> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const sales = await this.getByDateRange(startDate, endDate);

    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalItems = sales.reduce(
      (sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const cashSales = sales
      .filter((s) => s.paymentMethod === "cash")
      .reduce((sum, s) => sum + s.total, 0);
    const cardSales = sales
      .filter((s) => s.paymentMethod === "card")
      .reduce((sum, s) => sum + s.total, 0);

    return {
      totalSales,
      totalTransactions: sales.length,
      totalItems,
      averageTransaction: sales.length > 0 ? totalSales / sales.length : 0,
      salesByPaymentMethod: { cash: cashSales, card: cardSales },
    };
  },
};

// Stock movement operations
export const StockMovementDB = {
  getAll: () => getAll<StockMovement>("stockMovements"),
  add: (movement: StockMovement) => add("stockMovements", movement),

  async getByProduct(productId: string): Promise<StockMovement[]> {
    const movements = await this.getAll();
    return movements.filter((m) => m.productId === productId);
  },

  async getByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<StockMovement[]> {
    const movements = await this.getAll();
    return movements.filter((m) => {
      const movementDate = new Date(m.createdAt);
      return movementDate >= startDate && movementDate <= endDate;
    });
  },
};

// Initialize database with sample products
export async function seedSampleProducts(): Promise<void> {
  const products = await ProductDB.getAll();
  if (products.length === 0) {
    const sampleProducts: Product[] = [
      {
        id: crypto.randomUUID(),
        name: "Premium Tinted Film (Dark)",
        sku: "FILM-001",
        category: "Window Film",
        price: 250000,
        stock: 50,
        minStock: 10,
        description: "High-quality dark tinted window film for maximum UV protection",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        name: "Ceramic Window Film",
        sku: "FILM-002",
        category: "Window Film",
        price: 450000,
        stock: 30,
        minStock: 8,
        description: "Premium ceramic film with heat rejection technology",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        name: "Car Floor Mats (Universal)",
        sku: "ACC-001",
        category: "Accessories",
        price: 85000,
        stock: 40,
        minStock: 10,
        description: "Durable rubber floor mats with custom fit for most vehicles",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        name: "LED Interior Lights Kit",
        sku: "ACC-002",
        category: "Accessories",
        price: 120000,
        stock: 25,
        minStock: 5,
        description: "Complete LED interior lighting kit with remote control",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        name: "Dash Camera HD",
        sku: "ELEC-001",
        category: "Electronics",
        price: 195000,
        stock: 15,
        minStock: 5,
        description: "Full HD dash camera with night vision and G-sensor",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        name: "Paint Protection Film (PPF)",
        sku: "FILM-003",
        category: "Window Film",
        price: 650000,
        stock: 20,
        minStock: 5,
        description: "Self-healing paint protection film for car exterior",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        name: "Steering Wheel Cover (Leather)",
        sku: "ACC-003",
        category: "Accessories",
        price: 45000,
        stock: 35,
        minStock: 10,
        description: "Premium leather steering wheel cover with anti-slip design",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        name: "Car Phone Holder (Magnetic)",
        sku: "ACC-004",
        category: "Accessories",
        price: 35000,
        stock: 60,
        minStock: 15,
        description: "Strong magnetic phone holder for dashboard or air vent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const product of sampleProducts) {
      await ProductDB.add(product);
    }
  }
}
