"use client";
import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import {
  Product,
  Branch,
  fetchProducts,
  updateProduct,
  createProduct,
  fetchBranches,
  fetchVendors,
} from "@/lib/admin-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { toast } from "sonner";

export default function ProductsSection() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  const loadProducts = () => {
    if (!token) return;
    setLoading(true);
    fetchProducts(token)
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
    if (token) {
      // Needed for the Create Product form's branch/vendor pickers.
      fetchBranches(token).then(setBranches).catch(console.error);
      fetchVendors(token).then(setVendors).catch(console.error);
    }
  }, [token]);

  const handleEdit = () => {
    if (selectedProduct) {
      setEditData({ ...selectedProduct });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!editData || !token || !editData.id) return;

    setIsSaving(true);
    try {
      const updatedProduct = await updateProduct(token, editData.id, {
        name: editData.name,
        description: editData.description,
        category: editData.category,
        unit_price: editData.unit_price,
        cost_price: editData.cost_price,
        reorder_level: editData.reorder_level,
        status: editData.isActive ? "active" : "inactive",
      });
      setProducts(products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
      setSelectedProduct(updatedProduct);
      setIsEditing(false);
      setEditData(null);
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
      render: (category: string | null) => category || "-",
    },
    {
      key: "unit_price",
      label: "Price",
      render: (price: number) => formatCurrency(price),
    },
    {
      key: "quantity",
      label: "Stock",
      render: (quantity: number, row: Product) => {
        const status = getStockStatus(quantity, row.reorder_level);
        return (
          <div className="flex items-center justify-between w-full">
            <span className="font-medium">{quantity}</span>
            <Badge variant={status.variant} className="text-xs whitespace-nowrap">
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
        headerActions={<Button onClick={() => setCreateOpen(true)}>Create Product</Button>}
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
                      {formatCurrency(selectedProduct?.unit_price)}
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
                      {formatCurrency(selectedProduct?.cost_price)}
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

      <CreateProductDialog
        isOpen={isCreateOpen}
        branches={branches}
        vendors={vendors}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          loadProducts();
        }}
      />
    </>
  );
}

function CreateProductDialog({
  isOpen,
  branches,
  vendors,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  branches: Branch[];
  vendors: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "",
    barcode: "",
    cost_price: "",
    unit_price: "",
    tax_rate: "0.16",
    quantity: "0",
    reorder_level: "10",
    branchId: "",
    vendorId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!token) return;
    if (
      !form.sku ||
      !form.name ||
      !form.cost_price ||
      !form.unit_price ||
      !form.branchId ||
      !form.vendorId
    ) {
      toast.error("SKU, name, cost price, unit price, branch and vendor are all required.");
      return;
    }
    setSubmitting(true);
    try {
      await createProduct(token, {
        sku: form.sku,
        upc: null,
        barcode: form.barcode || null,
        name: form.name,
        description: null,
        category: form.category || null,
        subcategory: null,
        product_type: "physical",
        cost_price: parseFloat(form.cost_price),
        unit_price: parseFloat(form.unit_price),
        tax_rate: parseFloat(form.tax_rate) || 0,
        quantity: parseInt(form.quantity, 10) || 0,
        reorder_level: parseInt(form.reorder_level, 10) || 10,
        reorder_quantity: (parseInt(form.reorder_level, 10) || 10) * 2,
        unit_of_measurement: "pcs",
        weight: null,
        weight_unit: null,
        length: null,
        width: null,
        height: null,
        dimension_unit: null,
        image_url: null,
        vendorId: form.vendorId,
        branchId: form.branchId,
        supplier_part_number: null,
        lead_time_days: null,
        status: "active",
      });
      toast.success("Product created");
      setForm({
        sku: "",
        name: "",
        category: "",
        barcode: "",
        cost_price: "",
        unit_price: "",
        tax_rate: "0.16",
        quantity: "0",
        reorder_level: "10",
        branchId: "",
        vendorId: "",
      });
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Branch</Label>
            <select
              value={form.branchId}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="">Select a branch...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 italic">
              The branch must already have a warehouse, or product creation will fail.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Vendor</Label>
            <select
              value={form.vendorId}
              onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="">Select a vendor...</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Barcode</Label>
            <Input
              value={form.barcode}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tax Rate (0–1)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.tax_rate}
              onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Cost Price</Label>
            <Input
              type="number"
              value={form.cost_price}
              onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Unit Price</Label>
            <Input
              type="number"
              value={form.unit_price}
              onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Initial Stock</Label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Reorder Level</Label>
            <Input
              type="number"
              value={form.reorder_level}
              onChange={(e) => setForm((f) => ({ ...f, reorder_level: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
