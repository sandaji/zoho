"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { WarehouseSelect } from "@/components/ui/warehouse-select";
import { VendorSelect } from "@/components/ui/vendor-select";
import { BranchSelect } from "@/components/ui/branch-select";

import { createProduct, ProductPayload } from "@/lib/admin-api";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded?: () => void;
}

type ProductFormData = Omit<
  ProductPayload,
  | "image_url"
  | "cost_price"
  | "unit_price"
  | "tax_rate"
  | "quantity"
  | "reorder_level"
  | "reorder_quantity"
  | "weight"
  | "length"
  | "width"
  | "height"
  | "lead_time_days"
  | "upc"
  | "barcode"
  | "description"
  | "category"
  | "subcategory"
  | "weight_unit"
  | "dimension_unit"
  | "supplier_name"
  | "supplier_part_number"
  | "warehouseId"
> & {
  cost_price: string;
  unit_price: string;
  tax_rate: string;
  quantity: string;
  reorder_level: string;
  reorder_quantity: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  lead_time_days: string;
  upc: string;
  barcode: string;
  description: string;
  category: string;
  subcategory: string;
  weight_unit: string;
  dimension_unit: string;
  vendorId: string;
  branchId: string;
  supplier_part_number: string;
  warehouseId: string;
};

const initialFormData: ProductFormData = {
  sku: "",
  upc: "",
  barcode: "",
  name: "",
  description: "",
  category: "",
  subcategory: "",
  product_type: "physical",
  cost_price: "",
  unit_price: "",
  tax_rate: "16",
  quantity: "0",
  reorder_level: "10",
  reorder_quantity: "20",
  unit_of_measurement: "pcs",
  weight: "",
  weight_unit: "kg",
  length: "",
  width: "",
  height: "",
  dimension_unit: "cm",
  vendorId: "",
  branchId: "",
  supplier_part_number: "",
  lead_time_days: "",
  warehouseId: "",
  status: "active",
};

export function AddProductDialog({ open, onOpenChange, onProductAdded }: AddProductDialogProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { token } = useAuth();

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const validateForm = (): boolean => {
    if (!formData.sku.trim()) {
      toast.error("SKU is required");
      return false;
    }
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return false;
    }
    if (!formData.cost_price || parseFloat(formData.cost_price) <= 0) {
      toast.error("Valid cost price is required");
      return false;
    }
    if (!formData.unit_price || parseFloat(formData.unit_price) <= 0) {
      toast.error("Valid selling price is required");
      return false;
    }
    if (!formData.vendorId) {
      toast.error("Vendor is mandatory for SAP-grade product creation");
      return false;
    }
    if (!formData.branchId) {
      toast.error("Branch assignment is mandatory");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) {
      return;
    }

    setIsLoading(true);

    try {
      // Prepare the payload
      const payload: ProductPayload = {
        ...formData,
        upc: formData.upc || null,
        barcode: formData.barcode || null,
        description: formData.description || null,
        category: formData.category || null,
        subcategory: formData.subcategory || null,
        cost_price: parseFloat(formData.cost_price),
        unit_price: parseFloat(formData.unit_price),
        tax_rate: parseFloat(formData.tax_rate) / 100,
        quantity: parseInt(formData.quantity) || 0,
        reorder_level: parseInt(formData.reorder_level) || 10,
        reorder_quantity: parseInt(formData.reorder_quantity) || 20,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        weight_unit: formData.weight_unit || null,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        dimension_unit: formData.dimension_unit || null,
        image_url: imagePreview || null,
        vendorId: formData.vendorId,
        branchId: formData.branchId,
        supplier_part_number: formData.supplier_part_number || null,
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : null,
        warehouseId: formData.warehouseId || undefined,
      };

      await createProduct(token, payload);

      toast.success("Product created successfully!");
      setFormData(initialFormData);
      setImagePreview(null);
      onOpenChange(false);
      onProductAdded?.();
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the product details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="classification">Classification</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="physical">Physical</TabsTrigger>
              <TabsTrigger value="supplier">Supplier</TabsTrigger>
            </TabsList>

            {/* Basic Information */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">
                    SKU <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sku"
                    placeholder="e.g., PROD-001"
                    value={formData.sku}
                    onChange={(e) => handleInputChange("sku", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Laptop Dell XPS 13"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upc">UPC (Barcode)</Label>
                  <Input
                    id="upc"
                    placeholder="e.g., 012345678905"
                    value={formData.upc}
                    onChange={(e) => handleInputChange("upc", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">Additional Barcode</Label>
                  <Input
                    id="barcode"
                    placeholder="Alternative barcode"
                    value={formData.barcode}
                    onChange={(e) => handleInputChange("barcode", e.target.value)}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed product description..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Product Image</Label>
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-2">Upload</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Classification */}
            <TabsContent value="classification" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Electronics"
                    value={formData.category}
                    onChange={(e) => handleInputChange("category", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    placeholder="e.g., Laptops"
                    value={formData.subcategory}
                    onChange={(e) => handleInputChange("subcategory", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_type">Product Type</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value: "physical" | "digital" | "service") =>
                      handleInputChange("product_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive" | "discontinued") =>
                      handleInputChange("status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_price">
                    Cost Price <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cost_price}
                    onChange={(e) => handleInputChange("cost_price", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_price">
                    Selling Price <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.unit_price}
                    onChange={(e) => handleInputChange("unit_price", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    placeholder="16"
                    value={formData.tax_rate}
                    onChange={(e) => handleInputChange("tax_rate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchId">
                    Branch Assignment <span className="text-red-500">*</span>
                  </Label>
                  <BranchSelect
                    value={formData.branchId}
                    onValueChange={(value) => handleInputChange("branchId", value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Inventory Management */}
            <TabsContent value="inventory" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="warehouse">Initial Warehouse Location</Label>
                  <WarehouseSelect
                    value={formData.warehouseId}
                    onValueChange={(value) => handleInputChange("warehouseId", value)}
                  />
                  <p className="text-xs text-gray-500">
                    Leave empty to allocate to the main warehouse automatically
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Current Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange("quantity", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_of_measurement">Unit of Measurement</Label>
                  <Input
                    id="unit_of_measurement"
                    placeholder="e.g., pcs, kg, lbs"
                    value={formData.unit_of_measurement}
                    onChange={(e) => handleInputChange("unit_of_measurement", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    placeholder="10"
                    value={formData.reorder_level}
                    onChange={(e) => handleInputChange("reorder_level", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
                  <Input
                    id="reorder_quantity"
                    type="number"
                    placeholder="20"
                    value={formData.reorder_quantity}
                    onChange={(e) => handleInputChange("reorder_quantity", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Physical Properties */}
            <TabsContent value="physical" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight_unit">Weight Unit</Label>
                  <Select
                    value={formData.weight_unit}
                    onValueChange={(value) => handleInputChange("weight_unit", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="oz">Ounces (oz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="length">Length</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.length}
                    onChange={(e) => handleInputChange("length", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.width}
                    onChange={(e) => handleInputChange("width", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.height}
                    onChange={(e) => handleInputChange("height", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dimension_unit">Dimension Unit</Label>
                  <Select
                    value={formData.dimension_unit}
                    onValueChange={(value) => handleInputChange("dimension_unit", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">Centimeters (cm)</SelectItem>
                      <SelectItem value="inches">Inches (in)</SelectItem>
                      <SelectItem value="m">Meters (m)</SelectItem>
                      <SelectItem value="ft">Feet (ft)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Supplier Information */}
            <TabsContent value="supplier" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorId">
                    Mandatory Vendor <span className="text-red-500">*</span>
                  </Label>
                  <VendorSelect
                    value={formData.vendorId}
                    onValueChange={(value) => handleInputChange("vendorId", value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier_part_number">Supplier Part Number</Label>
                  <Input
                    id="supplier_part_number"
                    placeholder="Supplier's product code"
                    value={formData.supplier_part_number}
                    onChange={(e) => handleInputChange("supplier_part_number", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead_time_days">Lead Time (Days)</Label>
                  <Input
                    id="lead_time_days"
                    type="number"
                    placeholder="e.g., 7"
                    value={formData.lead_time_days}
                    onChange={(e) => handleInputChange("lead_time_days", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
