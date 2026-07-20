"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Edit2, Folder, FolderOpen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { frontendEnv } from "@/lib/env";

interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryAdded?: () => void;
}

export function CategoryManagementDialog({
  open,
  onOpenChange,
  onCategoryAdded,
}: CategoryManagementDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { token } = useAuth();

  // Form states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);

  const fetchCategories = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/products/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data?.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, token]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !token) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/products/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (response.ok) {
        toast.success("Category created successfully");
        setNewCategoryName("");
        fetchCategories();
        onCategoryAdded?.();
      } else {
        throw new Error("Failed to create category");
      }
    } catch (error) {
      toast.error("Failed to create category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim() || !selectedCategoryForSub || !token) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/products/categories/${selectedCategoryForSub}/subcategories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newSubcategoryName.trim() }),
      });
      if (response.ok) {
        toast.success("Subcategory created successfully");
        setNewSubcategoryName("");
        setSelectedCategoryForSub("");
        fetchCategories();
        onCategoryAdded?.();
      } else {
        throw new Error("Failed to create subcategory");
      }
    } catch (error) {
      toast.error("Failed to create subcategory");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this category? This will also delete all its subcategories.")) return;
    try {
      const response = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/products/categories/${categoryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Category deleted successfully");
        fetchCategories();
        onCategoryAdded?.();
      } else {
        throw new Error("Failed to delete category");
      }
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const handleDeleteSubcategory = async (categoryId: string, subcategoryId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this subcategory?")) return;
    try {
      const response = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/products/categories/${categoryId}/subcategories/${subcategoryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Subcategory deleted successfully");
        fetchCategories();
        onCategoryAdded?.();
      } else {
        throw new Error("Failed to delete subcategory");
      }
    } catch (error) {
      toast.error("Failed to delete subcategory");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Category Management</DialogTitle>
          <DialogDescription>
            Create and manage product categories and subcategories
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="view" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="view">View Categories</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No categories found</p>
                <p className="text-sm">Create your first category to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-sky-500" />
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {category.subcategories?.length || 0} subcategories
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {category.subcategories && category.subcategories.length > 0 && (
                      <div className="mt-3 ml-6 space-y-2">
                        {category.subcategories.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 py-1"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-slate-300" />
                              <span>{sub.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSubcategory(category.id, sub.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-6 mt-4">
            {/* Create Category */}
            <div className="space-y-3">
              <Label>Create New Category</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Category name (e.g., Electronics)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateCategory()}
                />
                <Button
                  onClick={handleCreateCategory}
                  disabled={isSaving || !newCategoryName.trim()}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Create Subcategory */}
            <div className="space-y-3">
              <Label>Create Subcategory</Label>
              <Select value={selectedCategoryForSub} onValueChange={setSelectedCategoryForSub}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  placeholder="Subcategory name (e.g., Laptops)"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateSubcategory()}
                  disabled={!selectedCategoryForSub}
                />
                <Button
                  onClick={handleCreateSubcategory}
                  disabled={isSaving || !newSubcategoryName.trim() || !selectedCategoryForSub}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
