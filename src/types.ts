export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  size: string | string[];
  color: string | string[];
  quantity: number;
  minStock: number;
  price: number;
  cost: number;
  images: string[];
  createdAt: string;
  purchaseDate?: string;
  description?: string;
}

export interface Movement {
  id: string;
  productId: string;
  type: 'Entrada' | 'Saída';
  quantity: number;
  date: string;
}

export interface DashboardData {
  totalStock: number;
  lowStockCount: number;
  monthlyStats: {
    name: string;
    entradas: number;
    saídas: number;
  }[];
  recentMovements: Movement[];
}

export interface Setting {
  id: string;
  name: string;
}
