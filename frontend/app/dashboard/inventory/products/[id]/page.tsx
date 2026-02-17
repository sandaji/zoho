"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Package, BarChart3, History } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { TraceabilityTab } from "./traceability-tab";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  reorder_level: number;
  unit_of_measurement: string;
  status: string;
  image_url?: string;
}

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && token) {
      fetchProduct();
    }
  }, [id, token]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch product details");
      }

      const data = await response.json();
      setProduct(data.data);
    } catch (error) {
      toast.error("Failed to load product details");
      router.push("/dashboard/inventory");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading product details...</div>;
  }

  if (!product) {
    return <div className="p-8 text-center">Product not found</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {product.name}
              <Badge variant={product.quantity <= product.reorder_level ? "destructive" : "secondary"}>
                {product.quantity <= 0 ? "Out of Stock" : product.quantity <= product.reorder_level ? "Low Stock" : "In Stock"}
              </Badge>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-mono text-sm">SKU: {product.sku}</p>
          </div>
        </div>
        <Button>
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Package className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="traceability">
            <History className="h-4 w-4 mr-2" />
            Traceability Report
          </TabsTrigger>
          <TabsTrigger value="analytics" disabled>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Stock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{product.quantity} {product.unit_of_measurement}</div>
                        <p className="text-xs text-slate-500">Reorder Level: {product.reorder_level}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Selling Price</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(product.unit_price)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Cost Price</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(product.cost_price)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{product.category || "Uncategorized"}</div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Product Description</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600 dark:text-slate-400">{product.description || "No description provided."}</p>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="traceability">
            <TraceabilityTab productId={product.id as string} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
