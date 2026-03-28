import * as React from 'react';
import { Component, useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  Search, 
  AlertTriangle, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Menu,
  X,
  Image as ImageIcon,
  Loader2,
  LogOut,
  LogIn,
  Palette,
  Edit,
  Trash2,
  ArrowLeftRight,
  Database,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings,
  Check,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { Toaster, toast } from 'sonner';
import { Product, Movement, DashboardData, Setting } from './types';

// --- Constants ---
const LOGO_URL = "https://github.com/chpsilvasemus-blip/desafio/blob/main/SUBLOGO-SEM-FUNDO%20(1).png?raw=true"; // Logo atualizada conforme solicitação do usuário
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop';

// Firebase Imports
import { db, auth, storage } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  getDocs,
  getDocFromServer,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Erro no banco de dados: ${errInfo.error}`);
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const Dashboard = ({ products = [], movements = [], categories = [] }: { products?: Product[], movements?: Movement[], categories?: Setting[] }) => {
  console.log("Dashboard rendering, products:", products?.length, "movements:", movements?.length);
  const [category, setCategory] = useState('all');

  const filteredProducts = (products || []).filter(p => category === 'all' || p.category === category);
  const filteredMovements = (movements || []).filter(m => {
    if (category !== 'all') {
      const product = products.find(p => p.id === m.productId);
      if (product?.category !== category) return false;
    }
    // Zerar informações de Janeiro e Fevereiro de 2026 conforme solicitado
    const date = new Date(m.date);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    if (year === 2026 && (month === 0 || month === 1)) {
      return false;
    }
    return true;
  });

  const totalStock = filteredProducts.reduce((acc, item) => acc + item.quantity, 0);
  const lowStockItems = filteredProducts.filter(item => item.quantity <= item.minStock);
  
  // Calculate monthly stats from movements
  const getMonthlyStats = () => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    const stats = months.map(name => ({ name, entradas: 0, saídas: 0 }));

    filteredMovements.forEach(m => {
      const date = new Date(m.date);
      const year = date.getUTCFullYear();
      const monthIndex = date.getUTCMonth();
      // Only consider 2026 for now as per current runtime context
      if (year === 2026 && monthIndex >= 0 && monthIndex < 6) {
        if (m.type === 'Entrada') stats[monthIndex].entradas += m.quantity;
        else stats[monthIndex].saídas += m.quantity;
      }
    });

    // The user specifically asked to zero out Jan and Feb for now
    stats[0].entradas = 0;
    stats[0].saídas = 0;
    stats[1].entradas = 0;
    stats[1].saídas = 0;

    return stats;
  };

  const monthlyStats = getMonthlyStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-48 border-none bg-white shadow-sm rounded-xl">
            <SelectValue placeholder="Todas as Categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {(categories || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Total em Estoque</CardDescription>
            <CardTitle className="text-3xl font-serif text-primary">{totalStock}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Peças disponíveis no momento</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Alertas de Reposição</CardDescription>
            <CardTitle className="text-3xl font-serif text-destructive">{lowStockItems.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Produtos abaixo do estoque mínimo</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Movimentações Recentes</CardDescription>
            <CardTitle className="text-3xl font-serif text-secondary">{filteredMovements.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Registros no sistema</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Entradas vs Saídas</CardTitle>
            <CardDescription>Comparativo mensal de fluxo</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  cursor={{ fill: '#f9f9f9' }}
                />
                <Bar 
                  dataKey="entradas" 
                  fill="#D4AF37" 
                  radius={[4, 4, 0, 0]} 
                  name="Entradas"
                  label={{ position: 'top', fill: '#8E8E8E', fontSize: 10, fontWeight: 500 }}
                />
                <Bar 
                  dataKey="saídas" 
                  fill="#E2B4BD" 
                  radius={[4, 4, 0, 0]} 
                  name="Saídas"
                  label={{ position: 'top', fill: '#8E8E8E', fontSize: 10, fontWeight: 500 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Alerta de Reposição</CardTitle>
            <CardDescription>Produtos que precisam de atenção</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-4">
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground italic">Tudo em ordem com seu estoque!</div>
                ) : (
                  <div className="space-y-3">
                    {lowStockItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                            <AlertTriangle className="text-destructive w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-xs text-muted-foreground">Estoque: {item.quantity} / Mínimo: {item.minStock}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const MovementsView = ({ products, onImageClick, categories }: { products: Product[], onImageClick: (urls: string[], name: string, index: number) => void, categories: Setting[] }) => {
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'Entrada' | 'Saída'>('Entrada');
  const [movementQty, setMovementQty] = useState(1);
  const [movementDate, setMovementDate] = useState(new Date().toLocaleDateString('en-CA'));

  const columns: ColumnDef<Product>[] = React.useMemo(() => [
    {
      accessorKey: "images",
      header: "Foto",
      cell: ({ row }) => {
        const images = row.getValue("images") as string[];
        const firstImage = images && images.length > 0 && images[0] ? images[0] : FALLBACK_IMAGE;
        const displayImages = images && images.length > 0 ? images : [FALLBACK_IMAGE];
        return (
          <img 
            src={firstImage} 
            alt={row.getValue("name")} 
            className="w-12 h-12 rounded-lg object-cover border border-muted cursor-zoom-in hover:opacity-80 transition-opacity"
            referrerPolicy="no-referrer"
            onClick={() => onImageClick(displayImages, row.getValue("name"), 0)}
          />
        );
      },
    },
    {
      accessorKey: "sku",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          SKU
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
          {row.getValue("sku")}
        </code>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Produto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div>
            <div className="font-medium">{product.name}</div>
            <div className="text-[10px] text-muted-foreground uppercase">{product.brand} • {product.size}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Categoria",
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            Estoque
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className={`text-right font-bold ${product.quantity <= product.minStock ? 'text-destructive' : 'text-primary'}`}>
            {product.quantity}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações de Fluxo</div>,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-primary text-primary hover:bg-primary hover:text-white flex gap-2"
              onClick={() => {
                setSelectedProduct(product);
                setMovementType('Entrada');
                setIsMovementOpen(true);
              }}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Entrada
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-secondary text-secondary hover:bg-secondary hover:text-white flex gap-2"
              onClick={() => {
                setSelectedProduct(product);
                setMovementType('Saída');
                setIsMovementOpen(true);
              }}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Venda
            </Button>
          </div>
        );
      },
    },
  ], [onImageClick]);

  const handleMovement = async () => {
    if (!selectedProduct) return;
    
    try {
      const batch = writeBatch(db);
      
      const movementRef = collection(db, 'movements');
      const newMovement = {
        productId: selectedProduct.id,
        type: movementType,
        quantity: movementQty,
        date: new Date(movementDate).toISOString()
      };
      
      const productRef = doc(db, 'inventory', selectedProduct.id);
      const newQty = movementType === "Entrada" 
        ? selectedProduct.quantity + movementQty 
        : Math.max(0, selectedProduct.quantity - movementQty);

      batch.set(doc(movementRef), newMovement);
      batch.update(productRef, { quantity: newQty });

      await batch.commit();
      toast.success(`Movimentação de ${movementType} registrada!`);
      setIsMovementOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'movements/inventory');
    }
  };

  return (
    <div className="space-y-6">
      <DataTable 
        columns={columns} 
        data={products} 
        filterColumn="name" 
        filterPlaceholder="Buscar por nome do produto..." 
      />

      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Registrar {movementType === 'Saída' ? 'Venda' : 'Entrada'}</DialogTitle>
            <DialogDescription>
              Atualize o estoque de <strong>{selectedProduct?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantidade</Label>
              <Input 
                id="qty" 
                type="number" 
                min="1" 
                value={movementQty} 
                onChange={(e) => setMovementQty(parseInt(e.target.value))}
                className="rounded-xl border-muted focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data da {movementType === 'Saída' ? 'Venda' : 'Compra'}</Label>
              <Input 
                id="date" 
                type="date" 
                value={movementDate} 
                onChange={(e) => setMovementDate(e.target.value)}
                className="rounded-xl border-muted focus-visible:ring-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovementOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleMovement} className="rounded-xl bg-primary text-white hover:bg-primary/90">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Inventory = ({ 
  products, 
  onImageClick,
  categories,
  sizes,
  colors
}: { 
  products: Product[], 
  onImageClick: (urls: string[], name: string, index: number) => void,
  categories: Setting[],
  sizes: Setting[],
  colors: Setting[]
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Edit Form State
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setEditData({ ...editData, images: [...(editData.images || []), url] });
      toast.success('Foto enviada com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar a foto. Verifique as permissões do Storage.');
    } finally {
      setIsUploading(false);
    }
  };

  const columns: ColumnDef<Product>[] = React.useMemo(() => [
    {
      accessorKey: "images",
      header: "Foto",
      cell: ({ row }) => {
        const images = row.getValue("images") as string[];
        const firstImage = images && images.length > 0 && images[0] ? images[0] : FALLBACK_IMAGE;
        const displayImages = images && images.length > 0 ? images : [FALLBACK_IMAGE];
        return (
          <img 
            src={firstImage} 
            alt={row.getValue("name")} 
            className="w-12 h-12 rounded-lg object-cover border border-muted cursor-zoom-in hover:opacity-80 transition-opacity"
            referrerPolicy="no-referrer"
            onClick={() => onImageClick(displayImages, row.getValue("name"), 0)}
          />
        );
      },
    },
    {
      accessorKey: "sku",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          SKU
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
          {row.getValue("sku")}
        </code>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Produto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "brand",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Marca
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.getValue("brand")}</div>,
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Categoria
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal border-primary/20 text-primary bg-primary/5">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "color",
      header: "Cores Disponíveis",
      cell: ({ row }) => {
        const color = row.getValue("color");
        return (
          <div className="flex flex-wrap gap-1 items-center">
            {Array.isArray(color) ? (
              color.map((c, i) => (
                <div key={i} className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                  <div className="w-2 h-2 rounded-full border border-muted" style={{ backgroundColor: getColorHex(c) }} />
                  <span className="text-[10px]">{c}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border border-muted" style={{ backgroundColor: getColorHex(String(color)) }} />
                <span className="text-xs">{String(color)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "size",
      header: "Tamanhos Disponíveis",
      cell: ({ row }) => {
        const size = row.getValue("size");
        return (
          <div className="flex flex-wrap gap-1">
            {Array.isArray(size) ? (
              size.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] px-1 h-4 font-normal">
                  {s}
                </Badge>
              ))
            ) : (
              <span>{String(size)}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            Qtd.
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className={`text-right font-medium ${product.quantity <= product.minStock ? 'text-destructive' : ''}`}>
            {product.quantity}
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            Preço
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          R$ {(row.getValue("price") as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex justify-end gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-blue-500 hover:bg-blue-50"
              title="Editar"
              onClick={() => {
                setSelectedProduct(product);
                setEditData(product);
                setIsEditOpen(true);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              title="Excluir"
              onClick={() => {
                setSelectedProduct(product);
                setIsDeleteOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ], [onImageClick]);

  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      await deleteDoc(doc(db, 'inventory', selectedProduct.id));
      toast.success('Produto excluído com sucesso');
      setIsDeleteOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${selectedProduct.id}`);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const { id: _, ...updateData } = editData;
      await updateDoc(doc(db, 'inventory', selectedProduct.id), {
        ...updateData,
        price: typeof editData.price === 'string' ? parseBRL(editData.price) : editData.price,
        cost: typeof editData.cost === 'string' ? parseBRL(editData.cost) : editData.cost,
        quantity: parseInt(String(editData.quantity)),
        minStock: parseInt(String(editData.minStock)),
      });
      toast.success('Produto atualizado com sucesso');
      setIsEditOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inventory/${selectedProduct.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <DataTable 
        columns={columns} 
        data={products} 
        filterColumn="name" 
        filterPlaceholder="Buscar por nome do produto..." 
      />

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl overflow-hidden p-0">
          <div className="p-6 overflow-y-auto max-h-[90vh]">
            <DialogHeader className="mb-6">
              <DialogTitle className="font-serif text-2xl">Editar Produto</DialogTitle>
              <DialogDescription>Altere as informações de {selectedProduct?.name}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Imagens do Produto</Label>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {(editData.images || []).map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-muted relative group">
                        <img 
                          src={img || FALLBACK_IMAGE} 
                          alt={`Preview ${idx}`} 
                          className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity" 
                          referrerPolicy="no-referrer" 
                          onClick={() => onImageClick(editData.images && editData.images.length > 0 ? editData.images : [FALLBACK_IMAGE], editData.name || 'Preview', idx)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            className="rounded-full h-6 w-6" 
                            onClick={() => {
                              const next = (editData.images || []).filter((_, i) => i !== idx);
                              setEditData({...editData, images: next});
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {isUploading ? (
                      <div className="aspect-square rounded-xl bg-muted flex flex-col items-center justify-center border-2 border-dashed border-primary/30">
                        <Loader2 className="animate-spin text-primary w-4 h-4" />
                        <span className="text-[8px] text-muted-foreground uppercase font-bold mt-1">Enviando...</span>
                      </div>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => document.getElementById('edit-file-upload')?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-muted flex flex-col items-center justify-center hover:bg-muted/30 transition-colors group"
                      >
                        <PlusCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-[8px] text-muted-foreground uppercase font-bold mt-1">Adicionar</span>
                      </button>
                    )}
                  </div>
                  
                  <input 
                    type="file" 
                    id="edit-file-upload" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="rounded-xl text-xs h-8" onClick={() => setIsUrlDialogOpen(true)}>
                      <ImageIcon className="w-3 h-3 mr-2" /> Inserir via URL
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input 
                    value={editData.sku} 
                    onChange={(e) => setEditData({...editData, sku: e.target.value.toUpperCase()})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input 
                    value={editData.name} 
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input 
                    value={editData.brand} 
                    onChange={(e) => setEditData({...editData, brand: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={editData.category} onValueChange={(v) => setEditData({...editData, category: v})}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4" />
                    Tamanhos Disponíveis
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map(s => {
                      const current = Array.isArray(editData.size) ? editData.size : [editData.size].filter(Boolean);
                      const isSelected = current.includes(s.name);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected 
                              ? current.filter(x => x !== s.name)
                              : [...current, s.name];
                            setEditData({...editData, size: next});
                          }}
                          className={`px-3 py-1.5 rounded-xl border-2 transition-all text-xs font-medium flex items-center gap-2 ${
                            isSelected 
                              ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                              : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Cores Disponíveis
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {colors.map(c => {
                      const current = Array.isArray(editData.color) ? editData.color : [editData.color].filter(Boolean);
                      const isSelected = current.includes(c.name);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected 
                              ? current.filter(x => x !== c.name)
                              : [...current, c.name];
                            setEditData({...editData, color: next});
                          }}
                          className="flex flex-col items-center gap-1 group"
                        >
                          <div 
                            className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                              isSelected 
                                ? 'border-primary scale-110 ring-2 ring-primary/20 shadow-sm' 
                                : 'border-muted group-hover:border-muted-foreground/50'
                            }`}
                            style={{ background: getColorHex(c.name) }}
                          >
                            {isSelected && (
                              <Check className={`w-4 h-4 ${c.name === 'Branco' || c.name === 'Bege' ? 'text-black' : 'text-white'}`} />
                            )}
                          </div>
                          <span className={`text-[9px] uppercase tracking-tighter ${isSelected ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            {c.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Preço</Label>
                  <Input 
                    type="text"
                    inputMode="numeric"
                    value={formatBRL(editData.price || '')} 
                    onChange={(e) => setEditData({...editData, price: e.target.value.replace(/\D/g, '')})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo</Label>
                  <Input 
                    type="text"
                    inputMode="numeric"
                    value={formatBRL(editData.cost || '')} 
                    onChange={(e) => setEditData({...editData, cost: e.target.value.replace(/\D/g, '')})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Atual</Label>
                  <Input 
                    type="number"
                    value={editData.quantity} 
                    onChange={(e) => setEditData({...editData, quantity: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Mínimo</Label>
                  <Input 
                    type="number"
                    value={editData.minStock} 
                    onChange={(e) => setEditData({...editData, minStock: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Compra</Label>
                  <Input 
                    type="date"
                    value={editData.purchaseDate} 
                    onChange={(e) => setEditData({...editData, purchaseDate: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button type="submit" className="rounded-xl bg-primary text-white">Salvar Alterações</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-destructive">Excluir Produto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{selectedProduct?.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleDelete} className="rounded-xl bg-destructive text-white hover:bg-destructive/90">Excluir Permanentemente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* URL Dialog for Editing */}
      <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Adicionar Foto via URL</DialogTitle>
            <DialogDescription>Insira o link da imagem (Unsplash, Pinterest, etc.)</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={tempUrl} 
              onChange={(e) => setTempUrl(e.target.value)} 
              placeholder="https://exemplo.com/foto.jpg"
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUrlDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => { 
              if (tempUrl && tempUrl.trim()) {
                setEditData({...editData, images: [...(editData.images || []), tempUrl.trim()]}); 
              }
              setTempUrl('');
              setIsUrlDialogOpen(false); 
            }}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ProductReport = ({ products, movements }: { products: Product[], movements: Movement[] }) => {
  const getProductMovements = (productId: string) => {
    return movements.filter(m => m.productId === productId).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const columns: ColumnDef<Product>[] = React.useMemo(() => [
    {
      accessorKey: "sku",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          SKU
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-mono text-xs font-bold text-primary">{row.getValue("sku")}</div>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Produto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div>
            <div className="font-medium">{product.name}</div>
            <div className="text-[10px] text-muted-foreground uppercase">{product.brand}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Categoria
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="secondary" className="rounded-lg font-normal text-[10px]">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "color",
      header: "Cores Disponíveis",
      cell: ({ row }) => {
        const color = row.getValue("color");
        return (
          <div className="flex flex-wrap gap-1">
            {Array.isArray(color) ? (
              color.map((c, i) => (
                <div key={i} className="w-2 h-2 rounded-full border border-muted" style={{ backgroundColor: getColorHex(c) }} title={c} />
              ))
            ) : (
              <div className="w-2 h-2 rounded-full border border-muted" style={{ backgroundColor: getColorHex(String(color)) }} title={String(color)} />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "size",
      header: "Tamanhos Disponíveis",
      cell: ({ row }) => {
        const size = row.getValue("size");
        return (
          <div className="flex flex-wrap gap-1">
            {Array.isArray(size) ? (
              size.map((s, i) => (
                <span key={i} className="text-[10px] bg-muted px-1 rounded">{s}</span>
              ))
            ) : (
              <span className="text-[10px] bg-muted px-1 rounded">{String(size)}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "purchaseDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Data Compra
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("purchaseDate") as string;
        return (
          <div className="text-xs text-muted-foreground">
            {date ? new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Data Cadastro
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">
          {new Date(row.getValue("createdAt")).toLocaleDateString('pt-BR')}
        </div>
      ),
    },
    {
      id: "movements",
      header: "Histórico de Fluxo",
      cell: ({ row }) => {
        const product = row.original;
        const productMovs = getProductMovements(product.id);
        return (
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto scrollbar-hide">
            {productMovs.length === 0 ? (
              <span className="text-[10px] text-muted-foreground italic">Sem movimentações</span>
            ) : (
              productMovs.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${m.type === 'Entrada' ? 'bg-primary' : 'bg-secondary'}`} />
                  <span className="font-medium">{m.type}:</span>
                  <span>{m.quantity} un.</span>
                  <span className="text-muted-foreground">({new Date(m.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})</span>
                </div>
              ))
            )}
          </div>
        );
      },
    },
    {
      id: "totalProfit",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            Lucro Total
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      accessorFn: (row) => {
        const productMovs = movements.filter(m => m.productId === row.id);
        const totalSales = productMovs
          .filter(m => m.type === 'Saída')
          .reduce((acc, curr) => acc + curr.quantity, 0);
        const profitPerUnit = row.price - row.cost;
        return profitPerUnit * totalSales;
      },
      cell: ({ row }) => {
        const totalProfit = row.getValue("totalProfit") as number;
        return (
          <div className="text-right font-medium">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProfit)}
          </div>
        );
      },
    },
  ], [movements]);

  return (
    <div className="space-y-6">
      <DataTable 
        columns={columns} 
        data={products} 
        filterColumn="name" 
        filterPlaceholder="Filtrar por nome do produto..." 
      />
    </div>
  );
};

const ProductPerformance = ({ products, movements, onImageClick }: { products: Product[], movements: Movement[], onImageClick: (urls: string[], name: string, index: number) => void }) => {
  const getSalesCount = (productId: string) => {
    return movements
      .filter(m => m.productId === productId && m.type === 'Saída')
      .reduce((acc, curr) => acc + curr.quantity, 0);
  };

  const performanceData = products.map(p => {
    const sales = getSalesCount(p.id);
    const daysInStock = Math.max(1, Math.ceil((new Date().getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const salesPerDay = sales / daysInStock;
    
    return {
      ...p,
      totalSales: sales,
      daysInStock,
      salesPerDay
    };
  });

  const sortedData = [...performanceData].sort((a, b) => b.salesPerDay - a.salesPerDay);
  const total = sortedData.length;
  
  // Curva ABC: A (Top 20%), C (Bottom 20%), B (Rest)
  const aCount = Math.ceil(total * 0.2);
  const cCount = Math.ceil(total * 0.2);
  
  const groupA = sortedData.slice(0, aCount);
  const groupC = total > aCount ? sortedData.slice(Math.max(aCount, total - cCount)) : [];
  const groupB = sortedData.filter(p => !groupA.some(a => a.id === p.id) && !groupC.some(c => c.id === p.id));

  const PerformanceCard = ({ p, category, colorClass, badgeClass, isGrayscale = false }: { p: any, category: string, colorClass: string, badgeClass: string, isGrayscale?: boolean, key?: string }) => (
    <Card className="bg-white border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex h-32">
        <div className={`w-1/3 overflow-hidden cursor-pointer ${isGrayscale ? 'grayscale opacity-70' : ''}`} onClick={() => onImageClick(p.images && p.images.length > 0 ? p.images : [FALLBACK_IMAGE], p.name, 0)}>
          <img src={p.images?.[0] || FALLBACK_IMAGE} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
        </div>
        <div className="w-2/3 p-4 flex flex-col justify-between relative">
          <div className="absolute top-2 right-2">
            <Badge className={`${badgeClass} border-none text-[8px] font-bold rounded-full px-1.5 h-4`}>
              CURVA {category}
            </Badge>
          </div>
          <div>
            <h3 className="font-medium text-sm line-clamp-1 pr-12">{p.name}</h3>
            <p className="text-[10px] text-muted-foreground uppercase">{p.sku}</p>
          </div>
          <div className="flex justify-between items-end">
            <div className="text-xs">
              <span className={`font-bold ${colorClass}`}>{p.totalSales}</span>
              <span className="text-muted-foreground ml-1">vendas</span>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-primary">{p.salesPerDay.toFixed(2)}/dia</p>
              <p className="text-[8px] text-muted-foreground">{p.daysInStock} dias em estoque</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-10">
      {/* Classe A */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <TrendingUp className="w-6 h-6" />
          <h2 className="text-xl font-serif font-bold uppercase tracking-tight">Classe A - Mais Vendidos (Top 20%)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupA.map(p => (
            <PerformanceCard 
              key={p.id} 
              p={p} 
              category="A" 
              colorClass="text-primary" 
              badgeClass="bg-primary/10 text-primary" 
            />
          ))}
          {groupA.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum produto nesta categoria.</p>}
        </div>
      </section>

      {/* Classe B */}
      {groupB.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-blue-500">
            <Activity className="w-6 h-6" />
            <h2 className="text-xl font-serif font-bold uppercase tracking-tight">Classe B - Intermediários</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupB.map(p => (
              <PerformanceCard 
                key={p.id} 
                p={p} 
                category="B" 
                colorClass="text-blue-500" 
                badgeClass="bg-blue-500/10 text-blue-500" 
              />
            ))}
          </div>
        </section>
      )}

      {/* Classe C */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-secondary">
          <TrendingDown className="w-6 h-6" />
          <h2 className="text-xl font-serif font-bold uppercase tracking-tight">Classe C - Menos Vendidos (Últimos 20%)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupC.map(p => (
            <PerformanceCard 
              key={p.id} 
              p={p} 
              category="C" 
              colorClass="text-secondary" 
              badgeClass="bg-secondary/10 text-secondary"
              isGrayscale
            />
          ))}
          {groupC.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum produto nesta categoria.</p>}
        </div>
      </section>
    </div>
  );
};

const SettingsView = ({ 
  categories, 
  sizes, 
  colors,
  onRestoreDefaults,
  isSeeding
}: { 
  categories: Setting[], 
  sizes: Setting[], 
  colors: Setting[],
  onRestoreDefaults: () => void,
  isSeeding: boolean
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'sizes' | 'colors'>('categories');
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: string, name: string } | null>(null);

  const handleAdd = async (collectionName: string) => {
    if (!newItemName.trim()) return;
    try {
      await addDoc(collection(db, collectionName), { name: newItemName.trim() });
      setNewItemName('');
      toast.success('Adicionado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
    }
  };

  const handleUpdate = async (collectionName: string) => {
    if (!editingItem || !editingItem.name.trim()) return;
    try {
      await updateDoc(doc(db, collectionName, editingItem.id), { name: editingItem.name.trim() });
      setEditingItem(null);
      toast.success('Atualizado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${editingItem.id}`);
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      toast.success('Excluído com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const renderList = (items: Setting[], collectionName: string, title: string) => {
    const columns: ColumnDef<Setting>[] = React.useMemo(() => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            Nome
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="font-medium">
              {editingItem?.id === item.id ? (
                <Input 
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="h-8 rounded-lg"
                />
              ) : item.name}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Ações</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="text-right space-x-2">
              {editingItem?.id === item.id ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => handleUpdate(collectionName)} className="text-primary">Salvar</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)}>Cancelar</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(collectionName, item.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ], [editingItem, collectionName]);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-xl">{title}</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRestoreDefaults} 
            disabled={isSeeding}
            className="rounded-xl text-xs"
          >
            {isSeeding ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RotateCcw className="w-3 h-3 mr-2" />}
            Restaurar Padrões
          </Button>
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder={`Nova ${title.toLowerCase()}...`}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="rounded-xl"
          />
          <Button onClick={() => handleAdd(collectionName)} className="rounded-xl">
            <PlusCircle className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
        <div className="bg-white rounded-2xl border border-muted overflow-hidden">
          <DataTable 
            columns={columns} 
            data={items} 
            filterColumn="name" 
            filterPlaceholder={`Filtrar ${title.toLowerCase()}...`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex gap-2 p-1 bg-muted rounded-2xl">
        <Button 
          variant={activeSubTab === 'categories' ? 'default' : 'ghost'} 
          className="flex-1 rounded-xl"
          onClick={() => { setActiveSubTab('categories'); setEditingItem(null); setNewItemName(''); }}
        >
          Categorias
        </Button>
        <Button 
          variant={activeSubTab === 'sizes' ? 'default' : 'ghost'} 
          className="flex-1 rounded-xl"
          onClick={() => { setActiveSubTab('sizes'); setEditingItem(null); setNewItemName(''); }}
        >
          Tamanhos Disponíveis
        </Button>
        <Button 
          variant={activeSubTab === 'colors' ? 'default' : 'ghost'} 
          className="flex-1 rounded-xl"
          onClick={() => { setActiveSubTab('colors'); setEditingItem(null); setNewItemName(''); }}
        >
          Cores Disponíveis
        </Button>
      </div>

      {activeSubTab === 'categories' && renderList(categories, 'categories', 'Categoria')}
      {activeSubTab === 'sizes' && renderList(sizes, 'sizes', 'Tamanhos Disponíveis')}
      {activeSubTab === 'colors' && renderList(colors, 'colors', 'Cores Disponíveis')}
    </div>
  );
};

const AddProduct = ({ 
  onComplete, 
  onImageClick,
  categories,
  sizes,
  colors
}: { 
  onComplete: () => void, 
  onImageClick: (urls: string[], name: string, index: number) => void,
  categories: Setting[],
  sizes: Setting[],
  colors: Setting[]
}) => {
  const [formData, setFormData] = useState<{
    sku: string;
    name: string;
    brand: string;
    category: string;
    size: string[];
    color: string[];
    price: string;
    cost: string;
    quantity: string;
    minStock: string;
    purchaseDate: string;
    images: string[];
  }>({
    sku: '',
    name: '',
    brand: '',
    category: categories[0]?.name || '',
    size: [],
    color: [],
    price: '',
    cost: '',
    quantity: '',
    minStock: '',
    purchaseDate: new Date().toLocaleDateString('en-CA'),
    images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop']
  });

  // Update defaults when settings load
  useEffect(() => {
    if (!formData.category && categories.length > 0) setFormData(p => ({ ...p, category: categories[0].name }));
  }, [categories]);

  // Auto-generate SKU when name, brand or category changes
  useEffect(() => {
    if (formData.name && formData.brand && !formData.sku) {
      const prefix = formData.brand.substring(0, 3).toUpperCase();
      const cat = formData.category.substring(0, 2).toUpperCase();
      const random = Math.floor(1000 + Math.random() * 9000);
      setFormData(prev => ({ ...prev, sku: `${prefix}-${cat}-${random}` }));
    }
  }, [formData.name, formData.brand, formData.category]);

  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData({ ...formData, images: [...formData.images, url] });
      toast.success('Foto enviada com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar a foto. Verifique as permissões do Storage.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const batch = writeBatch(db);
      const productRef = doc(collection(db, 'inventory'));
      const qty = parseInt(formData.quantity) || 0;
      
      const productData = {
        ...formData,
        price: parseBRL(formData.price),
        cost: parseBRL(formData.cost),
        quantity: qty,
        minStock: parseInt(formData.minStock) || 0,
        createdAt: new Date().toISOString()
      };
      
      batch.set(productRef, productData);
      
      if (qty > 0) {
        const movementRef = doc(collection(db, 'movements'));
        batch.set(movementRef, {
          productId: productRef.id,
          type: 'Entrada',
          quantity: qty,
          date: new Date(formData.purchaseDate).toISOString()
        });
      }
      
      await batch.commit();
      
      toast.success('Produto cadastrado com sucesso!');
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  const colorsList = colors.map(c => c.name);

  return (
    <Card className="bg-white border-none shadow-sm max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Novo Produto</CardTitle>
        <CardDescription>Adicione uma nova peça à sua boutique</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-2xl bg-muted flex items-center justify-center overflow-hidden border-2 border-muted relative group">
                    <img 
                      src={img || FALLBACK_IMAGE} 
                      alt={`Preview ${idx}`} 
                      className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity" 
                      referrerPolicy="no-referrer" 
                      onClick={() => onImageClick(formData.images.length > 0 ? formData.images : [FALLBACK_IMAGE], formData.name || 'Preview', idx)}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="rounded-full h-8 w-8" 
                        onClick={() => {
                          const next = formData.images.filter((_, i) => i !== idx);
                          setFormData({...formData, images: next});
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {isUploading ? (
                  <div className="aspect-square rounded-2xl bg-muted flex flex-col items-center justify-center border-2 border-dashed border-primary/30">
                    <Loader2 className="animate-spin text-primary w-6 h-6" />
                    <span className="text-[8px] text-muted-foreground uppercase font-bold mt-1">Enviando...</span>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center hover:bg-muted/30 transition-colors group"
                  >
                    <PlusCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[8px] text-muted-foreground uppercase font-bold mt-1">Adicionar</span>
                  </button>
                )}
              </div>
              
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              <div className="grid grid-cols-1 gap-2">
                <Button type="button" variant="outline" className="w-full rounded-xl text-xs h-9" onClick={() => setIsUrlDialogOpen(true)}>
                  <ImageIcon className="w-3 h-3 mr-2" /> Inserir via URL
                </Button>
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input 
                    required
                    placeholder="Ex: ZAR-VE-1234" 
                    className="rounded-xl"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Produto</Label>
                  <Input 
                    required
                    placeholder="Ex: Vestido Longo Seda" 
                    className="rounded-xl"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input 
                    required
                    placeholder="Ex: Farm, Zara" 
                    className="rounded-xl"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4" />
                    Tamanhos Disponíveis
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          const current = formData.size;
                          const next = current.includes(s.name) 
                            ? current.filter(x => x !== s.name)
                            : [...current, s.name];
                          setFormData({...formData, size: next});
                        }}
                        className={`px-4 py-2 rounded-xl border-2 transition-all text-sm font-medium flex items-center gap-2 ${
                          formData.size.includes(s.name) 
                            ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                            : 'border-muted hover:border-muted-foreground/30'
                        }`}
                      >
                        {formData.size.includes(s.name) && <Check className="w-4 h-4" />}
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Cores Disponíveis
                  </Label>
                  <div className="flex flex-wrap gap-4">
                    {colors.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const current = formData.color;
                          const next = current.includes(c.name) 
                            ? current.filter(x => x !== c.name)
                            : [...current, c.name];
                          setFormData({...formData, color: next});
                        }}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div 
                          className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                            formData.color.includes(c.name) 
                              ? 'border-primary scale-110 ring-2 ring-primary/20 shadow-sm' 
                              : 'border-muted group-hover:border-muted-foreground/50'
                          }`}
                          style={{ background: getColorHex(c.name) }}
                        >
                          {formData.color.includes(c.name) && (
                            <Check className={`w-5 h-5 ${c.name === 'Branco' || c.name === 'Bege' ? 'text-black' : 'text-white'}`} />
                          )}
                        </div>
                        <span className={`text-[10px] uppercase tracking-tighter ${formData.color.includes(c.name) ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {c.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Preço de Custo</Label>
              <Input 
                required
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00" 
                className="rounded-xl"
                value={formatBRL(formData.cost)}
                onChange={(e) => setFormData({...formData, cost: e.target.value.replace(/\D/g, '')})}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço de Venda</Label>
              <Input 
                required
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00" 
                className="rounded-xl"
                value={formatBRL(formData.price)}
                onChange={(e) => setFormData({...formData, price: e.target.value.replace(/\D/g, '')})}
              />
            </div>
            <div className="space-y-2">
              <Label>Qtd. Inicial</Label>
              <Input 
                required
                type="number" 
                placeholder="0" 
                className="rounded-xl"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Estoque Mínimo</Label>
              <Input 
                required
                type="number" 
                placeholder="0" 
                className="rounded-xl"
                value={formData.minStock}
                onChange={(e) => setFormData({...formData, minStock: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Compra</Label>
              <Input 
                type="date"
                className="rounded-xl"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
              />
            </div>
          </div>

          <Button type="submit" className="w-full rounded-xl bg-primary text-white hover:bg-primary/90 h-12 text-lg font-serif">
            Cadastrar Produto
          </Button>
        </form>
      </CardContent>

      <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Alterar URL da Foto</DialogTitle>
            <DialogDescription>Insira o link da imagem (Unsplash, Pinterest, etc.)</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={tempUrl} 
              onChange={(e) => setTempUrl(e.target.value)} 
              placeholder="https://exemplo.com/foto.jpg"
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUrlDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => { 
              if (tempUrl && tempUrl.trim()) {
                setFormData({...formData, images: [...formData.images, tempUrl.trim()]}); 
              }
              setIsUrlDialogOpen(false); 
            }}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// --- Helpers ---
const formatBRL = (value: string | number) => {
  if (value === undefined || value === null || value === '') return '';
  const amount = typeof value === 'number' 
    ? Math.round(value * 100).toString() 
    : value.replace(/\D/g, '');
  
  if (!amount) return '';
  const numberValue = parseInt(amount) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numberValue);
};

const parseBRL = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits ? parseInt(digits) / 100 : 0;
};

function getColorHex(color: string) {
  const map: Record<string, string> = {
    'Rose': '#E2B4BD',
    'Champagne': '#F7E7CE',
    'Off-white': '#F5F5F5',
    'Preto': '#1A1A1A',
    'Nude': '#E3BC9A',
    'Vinho': '#722F37',
    'Verde Oliva': '#556B2F',
    'Azul Sereno': '#98B4D4',
    'Branco': '#FFFFFF',
    'Bege': '#F5F5DC',
    'Azul': '#0000FF',
    'Vermelho': '#FF0000',
    'Rosa': '#FFC0CB',
    'Laranja': '#FFA500',
    'Amarelo': '#FFFF00',
    'Roxo': '#800080',
    'Cinza': '#808080',
    'Marrom': '#8B4513',
    'Verde': '#008000',
    'Dourado': '#FFD700',
    'Prata': '#C0C0C0'
  };
  return map[color] || '#CCCCCC';
}

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{urls: string[], name: string, currentIndex: number} | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [categories, setCategories] = useState<Setting[]>([]);
  const [sizes, setSizes] = useState<Setting[]>([]);
  const [colors, setColors] = useState<Setting[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  const seedDefaults = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      
      const defaultCategories = ['Vestidos', 'Blusas', 'Calças', 'Acessórios', 'Saias', 'Conjuntos'];
      const defaultSizes = ['P', 'M', 'G', 'GG', 'Único'];
      const defaultColors = ['Rose', 'Champagne', 'Off-white', 'Preto', 'Nude', 'Vinho', 'Verde Oliva', 'Azul Sereno'];

      // Only seed if empty
      const catSnap = await getDocs(collection(db, 'categories'));
      if (catSnap.empty) {
        defaultCategories.forEach(name => {
          const newDoc = doc(collection(db, 'categories'));
          batch.set(newDoc, { name });
        });
      }

      const sizeSnap = await getDocs(collection(db, 'sizes'));
      if (sizeSnap.empty) {
        defaultSizes.forEach(name => {
          const newDoc = doc(collection(db, 'sizes'));
          batch.set(newDoc, { name });
        });
      }

      const colorSnap = await getDocs(collection(db, 'colors'));
      if (colorSnap.empty) {
        defaultColors.forEach(name => {
          const newDoc = doc(collection(db, 'colors'));
          batch.set(newDoc, { name });
        });
      }

      await batch.commit();
      toast.success('Informações predefinidas restauradas!');
    } catch (error) {
      console.error('Erro ao semear dados:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const checkAndSeed = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        const sizeSnap = await getDocs(collection(db, 'sizes'));
        const colorSnap = await getDocs(collection(db, 'colors'));
        
        if (catSnap.empty && sizeSnap.empty && colorSnap.empty) {
          await seedDefaults();
        }
      } catch (error) {
        // Silently fail seeding if it's a permission issue, but log it
        console.error('Erro ao verificar dados iniciais:', error);
      }
    };
    checkAndSeed();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubCat = onSnapshot(query(collection(db, 'categories'), orderBy('name')), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Setting)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));
    const unsubSize = onSnapshot(query(collection(db, 'sizes'), orderBy('name')), (snap) => {
      setSizes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Setting)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sizes'));
    const unsubColor = onSnapshot(query(collection(db, 'colors'), orderBy('name')), (snap) => {
      setColors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Setting)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'colors'));
    return () => { unsubCat(); unsubSize(); unsubColor(); };
  }, [user]);

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      const batch = writeBatch(db);
      
      const invSnapshot = await getDocs(collection(db, 'inventory'));
      invSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      const movSnapshot = await getDocs(collection(db, 'movements'));
      movSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      toast.success('Banco de dados zerado com sucesso!');
      setIsResetDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'all');
    } finally {
      setIsResetting(false);
    }
  };

  // Auth Listener
  useEffect(() => {
    console.log("Auth state changed:", user);
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'inventory', 'connection-test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
          toast.error("Erro de conexão: O cliente está offline. Verifique a configuração do Firebase.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("onAuthStateChanged:", u);
      setUser(u);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Data Listeners
  useEffect(() => {
    const qInv = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      console.log("Inventory snapshot received, docs count:", snapshot.docs.length);
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(p);
    }, (err) => {
      console.error("Inventory snapshot error:", err);
      handleFirestoreError(err, OperationType.LIST, 'inventory');
    });

    const qMov = query(collection(db, 'movements'), orderBy('date', 'desc'), limit(50));
    const unsubMov = onSnapshot(qMov, (snapshot) => {
      const m = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movement));
      setMovements(m);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'movements'));

    return () => {
      unsubInv();
      unsubMov();
    };
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Bem-vinda, elegante!');
    } catch (error) {
      toast.error('Erro ao entrar com Google');
    }
  };

  const handleLogout = () => {
    signOut(auth);
    toast.info('Até logo!');
  };

  if (!isAuthReady) {
    return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'movements', label: 'Entrada e Venda', icon: ArrowLeftRight },
    { id: 'inventory', label: 'Estoque', icon: Package },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'add', label: 'Novo Item', icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <Toaster position="top-center" richColors />
      
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-muted p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img 
            src={LOGO_URL} 
            alt="Desafio Fashion Logo" 
            className="w-20 h-20 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-serif font-bold hidden">DF</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-muted h-screen sticky top-0">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center mb-8">
            <img 
              src={LOGO_URL} 
              alt="Desafio Fashion Logo" 
              className="w-56 h-56 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center text-white font-serif font-bold text-2xl shadow-lg shadow-primary/20 hidden">DF</div>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-8 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30">
            {user ? (
              <>
                <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-primary/20" alt="User" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{user.displayName}</div>
                  <button onClick={handleLogout} className="text-[10px] text-destructive hover:underline flex items-center gap-1">
                    <LogOut className="w-3 h-3" /> Sair
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">Visitante</div>
                <button onClick={handleLogin} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                  <LogIn className="w-3 h-3" /> Entrar
                </button>
              </div>
            )}
          </div>
          <div className="p-4 rounded-2xl bg-accent/50 border border-accent">
            <div className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Suporte</div>
            <div className="text-sm text-muted-foreground">Precisa de ajuda?</div>
            <Button variant="link" className="p-0 h-auto text-primary text-xs mt-2">Falar com o TI</Button>
          </div>

          {user?.email === 'chpsilva.semus@gmail.com' && (
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <DialogTrigger 
                render={
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive flex gap-2"
                  />
                }
              >
                <Database className="w-4 h-4" />
                Zerar Banco
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl text-destructive">Zerar Banco de Dados</DialogTitle>
                  <DialogDescription>
                    Esta ação excluirá <strong>TODOS</strong> os produtos e movimentações permanentemente. 
                    Isso é útil apenas para testes iniciais.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                  <Button 
                    onClick={handleResetDatabase} 
                    disabled={isResetting}
                    className="rounded-xl bg-destructive text-white hover:bg-destructive/90"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Zerando...
                      </>
                    ) : 'Confirmar Exclusão Total'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Modal de Zoom da Imagem */}
          <Dialog open={!!selectedImage} onOpenChange={(open) => { if (!open) { setSelectedImage(null); setZoomLevel(1); } }}>
            <DialogContent 
              className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-black/95 border-none rounded-3xl focus:outline-none"
              onKeyDown={(e) => {
                if (!selectedImage || selectedImage.urls.length <= 1) return;
                if (e.key === 'ArrowLeft') {
                  const nextIndex = (selectedImage.currentIndex - 1 + selectedImage.urls.length) % selectedImage.urls.length;
                  setSelectedImage({ ...selectedImage, currentIndex: nextIndex });
                  setZoomLevel(1);
                } else if (e.key === 'ArrowRight') {
                  const nextIndex = (selectedImage.currentIndex + 1) % selectedImage.urls.length;
                  setSelectedImage({ ...selectedImage, currentIndex: nextIndex });
                  setZoomLevel(1);
                }
              }}
            >
              <div className="relative w-full h-full flex flex-col">
                <div className="absolute top-4 right-12 z-50 flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="rounded-full bg-white/10 hover:bg-white/20 text-white border-none"
                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 4))}
                  >
                    <ZoomIn className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="rounded-full bg-white/10 hover:bg-white/20 text-white border-none"
                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 0.5))}
                  >
                    <ZoomOut className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="rounded-full bg-white/10 hover:bg-white/20 text-white border-none"
                    onClick={() => setZoomLevel(1)}
                    title="Resetar"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="rounded-full bg-white/10 hover:bg-white/20 text-white border-none"
                    onClick={() => setZoomLevel(prev => prev === 1 ? 2.5 : 1)}
                    title={zoomLevel === 1 ? "Expandir" : "Recolher"}
                  >
                    {zoomLevel === 1 ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                  </Button>
                </div>

                {/* Navegação entre fotos */}
                {selectedImage && selectedImage.urls.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-white/10 hover:bg-white/20 text-white border-none h-12 w-12"
                      onClick={() => {
                        const nextIndex = (selectedImage.currentIndex - 1 + selectedImage.urls.length) % selectedImage.urls.length;
                        setSelectedImage({ ...selectedImage, currentIndex: nextIndex });
                        setZoomLevel(1);
                      }}
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-white/10 hover:bg-white/20 text-white border-none h-12 w-12"
                      onClick={() => {
                        const nextIndex = (selectedImage.currentIndex + 1) % selectedImage.urls.length;
                        setSelectedImage({ ...selectedImage, currentIndex: nextIndex });
                        setZoomLevel(1);
                      }}
                    >
                      <ChevronRight className="w-8 h-8" />
                    </Button>
                    
                    {/* Indicador de página */}
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 bg-black/50 px-3 py-1 rounded-full text-white text-xs font-medium backdrop-blur-sm">
                      {selectedImage.currentIndex + 1} / {selectedImage.urls.length}
                    </div>
                  </>
                )}
                
                <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <motion.img
                      key={selectedImage?.urls[selectedImage?.currentIndex || 0]}
                      src={selectedImage?.urls[selectedImage?.currentIndex || 0]}
                      alt={selectedImage?.name}
                      className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-grab active:cursor-grabbing"
                      animate={{ scale: zoomLevel }}
                      referrerPolicy="no-referrer"
                      drag={zoomLevel > 1}
                      dragConstraints={zoomLevel === 1 ? { left: 0, right: 0, top: 0, bottom: 0 } : { left: -1000, right: 1000, top: -1000, bottom: 1000 }}
                      dragElastic={0.1}
                    />
                  </div>
                </div>
                
                <div className="p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                  <h3 className="text-xl font-serif font-bold">{selectedImage?.name}</h3>
                  <p className="text-sm text-white/60">Use os controles acima para ajustar o zoom ou arraste a imagem.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 top-[65px] bg-white z-40 p-6 space-y-4"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  activeTab === item.id 
                    ? 'bg-primary text-white' 
                    : 'bg-muted/30 text-muted-foreground'
                }`}
              >
                <item.icon className="w-6 h-6" />
                <span className="font-medium text-lg">{item.label}</span>
              </button>
            ))}
            <div className="h-px bg-muted w-full my-4" />
            <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2" /> Sair da Conta
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
              <p className="text-muted-foreground">
                {activeTab === 'dashboard' && 'Bem-vinda de volta! Veja como está sua boutique hoje.'}
                {activeTab === 'movements' && 'Registre entradas e saídas de peças rapidamente.'}
                {activeTab === 'inventory' && 'Gerencie suas peças e acompanhe os níveis de estoque.'}
                {activeTab === 'reports' && 'Histórico detalhado de cadastro e movimentações por produto.'}
                {activeTab === 'performance' && 'Análise de rotatividade: produtos que mais e menos vendem.'}
                {activeTab === 'settings' && 'Gerencie categorias, tamanhos e cores disponíveis.'}
                {activeTab === 'add' && 'Cadastre novas tendências para sua coleção.'}
              </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              (() => {
                console.log("Rendering Dashboard");
                return <Dashboard products={products} movements={movements} categories={categories} />;
              })()
            )}
            {activeTab === 'movements' && <MovementsView products={products} onImageClick={(urls, name, currentIndex) => setSelectedImage({ urls, name, currentIndex })} categories={categories} />}
            {activeTab === 'inventory' && <Inventory products={products} onImageClick={(urls, name, currentIndex) => setSelectedImage({ urls, name, currentIndex })} categories={categories} sizes={sizes} colors={colors} />}
            {activeTab === 'reports' && <ProductReport products={products} movements={movements} />}
            {activeTab === 'performance' && <ProductPerformance products={products} movements={movements} onImageClick={(urls, name, currentIndex) => setSelectedImage({ urls, name, currentIndex })} />}
            {activeTab === 'settings' && <SettingsView categories={categories} sizes={sizes} colors={colors} onRestoreDefaults={seedDefaults} isSeeding={isSeeding} />}
            {activeTab === 'add' && <AddProduct onComplete={() => setActiveTab('inventory')} onImageClick={(urls, name, currentIndex) => setSelectedImage({ urls, name, currentIndex })} categories={categories} sizes={sizes} colors={colors} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-muted px-6 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === item.id ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="h-20 md:hidden" />
    </div>
  );
}
