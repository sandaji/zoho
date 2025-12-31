"use client";

import { useEffect, useState } from "react";
import { 
  Role, 
  Module, 
  fetchPermissions, 
  fetchRoleDetails, 
  syncRolePermissions 
} from "@/lib/rbac-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ShieldCheck, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface RolePermissionsDialogProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function RolePermissionsDialog({
  role,
  open,
  onOpenChange,
  onUpdated,
}: RolePermissionsDialogProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && token && role) {
      loadPermissions();
    }
  }, [open, token, role]);

  const loadPermissions = async () => {
    if (!token || !role) return;
    try {
      setLoading(true);
      const [modules, roleDetails] = await Promise.all([
        fetchPermissions(token),
        fetchRoleDetails(token, role.id)
      ]);
      setAllModules(modules);
      const activeIds = roleDetails.permissions?.map(p => p.permission.id) || [];
      setSelectedPermissionIds(activeIds);
    } catch (error) {
      toast("Failed to load permissions", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (id: string) => {
    setSelectedPermissionIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSelectModuleAll = (module: Module, select: boolean) => {
    const modulePermissionIds = module.permissions.map(p => p.id);
    if (select) {
        setSelectedPermissionIds(prev => Array.from(new Set([...prev, ...modulePermissionIds])));
    } else {
        setSelectedPermissionIds(prev => prev.filter(id => !modulePermissionIds.includes(id)));
    }
  };

  const handleSave = async () => {
    if (!token || !role) return;
    try {
      setSaving(true);
      await syncRolePermissions(token, role.id, selectedPermissionIds);
      toast("Permissions updated successfully", "success");
      onUpdated();
      onOpenChange(false);
    } catch (error) {
      toast("Failed to update permissions", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredModules = allModules.map(m => ({
    ...m,
    permissions: m.permissions.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        m.name.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(m => m.permissions.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <DialogTitle className="text-xl">Role Permissions: {role?.name}</DialogTitle>
          </div>
          <DialogDescription>
            Configure granular access levels for this role across all system modules.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2 border-b border-slate-100">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    placeholder="Filter permissions..." 
                    className="pl-10 h-9 bg-slate-50 border-none transition-all focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-blue-100"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-8 pb-8">
                {filteredModules.map((module) => {
                    const allSelected = module.permissions.every(p => selectedPermissionIds.includes(p.id));
                    const someSelected = module.permissions.some(p => selectedPermissionIds.includes(p.id)) && !allSelected;
                    
                    return (
                        <div key={module.id} className="group">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50 transition-colors group-hover:border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{module.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-medium">Select All</span>
                                    <Checkbox 
                                        checked={allSelected ? true : (someSelected ? "indeterminate" : false)}
                                        onCheckedChange={(checked: boolean | "indeterminate") => handleSelectModuleAll(module, !!checked)}
                                        className="h-4 w-4"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                {module.permissions.map((permission) => (
                                    <div 
                                        key={permission.id} 
                                        className={cn(
                                            "flex items-start space-x-3 p-2 rounded-lg transition-all border border-transparent",
                                            selectedPermissionIds.includes(permission.id) 
                                                ? "bg-blue-50/50 border-blue-100 shadow-sm" 
                                                : "hover:bg-slate-50"
                                        )}
                                    >
                                        <Checkbox 
                                            id={permission.id}
                                            checked={selectedPermissionIds.includes(permission.id)}
                                            onCheckedChange={() => handleTogglePermission(permission.id)}
                                            className="mt-0.5"
                                        />
                                        <label 
                                            htmlFor={permission.id}
                                            className="text-sm cursor-pointer select-none flex-1"
                                        >
                                            <div className="font-semibold text-slate-800 leading-none mb-1">{permission.name}</div>
                                            <div className="text-[11px] text-slate-500 font-mono opacity-80">{permission.code}</div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 border-t border-slate-100 bg-slate-50/30 rounded-b-lg">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="min-w-[120px] bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200"
          >
            {saving ? (
                <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
                </>
            ) : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
