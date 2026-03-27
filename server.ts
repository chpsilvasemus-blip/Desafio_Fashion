import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock Database
  let inventory = [
    { id: "1", name: "Vestido Midi Floral", category: "Vestidos", size: "M", quantity: 12, minStock: 5, price: 189.90, cost: 85.00, image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&h=400&fit=crop" },
    { id: "2", name: "Blusa Seda Champagne", category: "Blusas", size: "P", quantity: 3, minStock: 8, price: 145.00, cost: 60.00, image: "https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=400&h=400&fit=crop" },
    { id: "3", name: "Calça Alfaiataria Rose", category: "Calças", size: "G", quantity: 15, minStock: 10, price: 210.00, cost: 95.00, image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop" },
    { id: "4", name: "Brinco Pérola Elegance", category: "Acessórios", size: "Único", quantity: 25, minStock: 15, price: 59.90, cost: 20.00, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop" },
  ];

  let movements = [
    { id: "1", productId: "1", type: "Entrada", quantity: 5, date: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: "2", productId: "2", type: "Saída", quantity: 2, date: new Date(Date.now() - 86400000 * 1).toISOString() },
  ];

  // API Routes
  app.get("/api/inventory", (req, res) => {
    res.json(inventory);
  });

  app.post("/api/inventory", (req, res) => {
    const newItem = { ...req.body, id: Math.random().toString(36).substr(2, 9) };
    inventory.push(newItem);
    res.status(201).json(newItem);
  });

  app.patch("/api/inventory/:id", (req, res) => {
    const { id } = req.params;
    inventory = inventory.map(item => item.id === id ? { ...item, ...req.body } : item);
    res.json(inventory.find(item => item.id === id));
  });

  app.post("/api/movements", (req, res) => {
    const { productId, type, quantity } = req.body;
    const movement = {
      id: Math.random().toString(36).substr(2, 9),
      productId,
      type,
      quantity,
      date: new Date().toISOString()
    };
    
    movements.push(movement);
    
    // Update inventory
    inventory = inventory.map(item => {
      if (item.id === productId) {
        const newQty = type === "Entrada" ? item.quantity + quantity : item.quantity - quantity;
        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    });

    res.status(201).json(movement);
  });

  app.get("/api/dashboard", (req, res) => {
    const totalStock = inventory.reduce((acc, item) => acc + item.quantity, 0);
    const lowStockCount = inventory.filter(item => item.quantity <= item.minStock).length;
    
    // Simple monthly stats (mock)
    const monthlyStats = [
      { name: "Jan", entradas: 45, saídas: 30 },
      { name: "Fev", entradas: 52, saídas: 42 },
      { name: "Mar", entradas: totalStock, saídas: movements.filter(m => m.type === "Saída").reduce((acc, m) => acc + m.quantity, 0) },
    ];

    res.json({
      totalStock,
      lowStockCount,
      monthlyStats,
      recentMovements: movements.slice(-5).reverse()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
