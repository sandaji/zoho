"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { Product, fetchProducts } from "@/lib/admin-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

export default function ProductsSection() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (token) {
      fetchProducts(token)
        .then(setProducts)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleEdit = () => {
    if (selectedProduct) {
      setEditData({ ...selectedProduct });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!editData || !token) return;

    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:5000/v1/products/${editData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editData.name,
          description: editData.description,
          category: editData.category,
          unit_price: editData.unit_price,
          cost_price: editData.cost_price,
          reorder_level: editData.reorder_level,
          isActive: editData.isActive,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Handle both wrapped and unwrapped responses
        const updatedProduct = result.data || result;
        setProducts(products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
        setSelectedProduct(updatedProduct);
        setIsEditing(false);
        setEditData(null);
      } else {
        console.error("Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const getStockStatus = (quantity: number, reorderLevel: number) => {
    if (quantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (quantity <= reorderLevel) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const columns: Column<Product>[] = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Name" },
    {
      key: "category",
      label: "Category",
      render: (category) => category || "-",
    },
    {
      key: "unit_price",
      label: "Price",
      render: (price) => `KES ${price.toLocaleString()}`,
    },
    {
      key: "quantity",
      label: "Stock",
      render: (quantity, row) => {
        const status = getStockStatus(quantity, row.reorder_level);
        return (
          <div className="flex items-center gap-2">
            <span>{quantity}</span>
            <Badge variant={status.variant} className="text-xs">
              {status.label}
            </Badge>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <AdminTable
        title="Products"
        data={products}
        columns={columns}
        loading={loading}
        searchKeys={["name", "sku", "category"]}
        actions={(product) => (
          <Button variant="outline" size="sm" onClick={() => setSelectedProduct(product)}>
            View Details
          </Button>
        )}
      />

      <Dialog
        open={!!selectedProduct}
        onOpenChange={() => {
          setSelectedProduct(null);
          setIsEditing(false);
          setEditData(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between w-full pr-6">
              <DialogTitle>{isEditing ? "Edit Product" : "Product Details"}</DialogTitle>
              {!isEditing && (
                <Button size="sm" onClick={handleEdit} className="ml-auto">
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* SKU */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SKU</p>
                  {isEditing ? (
                    <Input
                      value={editData?.sku || ""}
                      onChange={(e) => setEditData({ ...editData, sku: e.target.value })}
                      disabled
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{selectedProduct.sku}</p>
                  )}
                </div>

                {/* Barcode */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Barcode</p>
                  {isEditing ? (
                    <Input
                      value={editData?.barcode || ""}
                      onChange={(e) => setEditData({ ...editData, barcode: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{selectedProduct.barcode || "-"}</p>
                  )}
                </div>

                {/* Name */}
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  {isEditing ? (
                    <Input
                      value={editData?.name || ""}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold">{selectedProduct.name}</p>
                  )}
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  {isEditing ? (
                    <Textarea
                      value={editData?.description || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          description: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{selectedProduct.description || "-"}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  {isEditing ? (
                    <Input
                      value={editData?.category || ""}
                      onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{selectedProduct.category || "-"}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {isEditing ? (
                    <select
                      value={editData?.isActive ? "active" : "inactive"}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          isActive: e.target.value === "active",
                        })
                      }
                      className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  ) : (
                    <Badge variant={selectedProduct.isActive ? "default" : "secondary"}>
                      {selectedProduct.isActive ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </div>

                {/* Unit Price */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unit Price</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editData?.unit_price || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          unit_price: parseFloat(e.target.value),
                        })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-semibold">
                      KES {(selectedProduct?.unit_price ?? 0).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Cost Price */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cost Price</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editData?.cost_price || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          cost_price: parseFloat(e.target.value),
                        })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">
                      KES {(selectedProduct?.cost_price ?? 0).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Margin */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Margin</p>
                  <p className="text-sm">
                    {selectedProduct && selectedProduct.cost_price
                      ? (
                          ((selectedProduct.unit_price - selectedProduct.cost_price) /
                            selectedProduct.cost_price) *
                          100
                        ).toFixed(1)
                      : "0"}
                    %
                  </p>
                </div>

                {/* Reorder Level */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reorder Level</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editData?.reorder_level || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          reorder_level: parseInt(e.target.value),
                        })
                      }
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{selectedProduct.reorder_level}</p>
                  )}
                </div>

                {/* Current Stock */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                  <p className="text-sm font-semibold">{selectedProduct.quantity}</p>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
