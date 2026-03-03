"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";

export default function CreateVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    website: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error("Name and Code are required");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/v1/purchasing/vendors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Vendor created successfully");
        router.push("/dashboard/purchasing/vendors");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create vendor");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/vendors">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add New Vendor</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Vendor Code *</Label>
            <Input name="code" value={formData.code} onChange={handleChange} placeholder="e.g. VEN-001" required />
          </div>
          <div className="space-y-2">
            <Label>Vendor Name *</Label>
            <Input name="name" value={formData.name} onChange={handleChange} placeholder="Vendor Name" required />
          </div>
          
          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="contact@vendor.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 890" />
          </div>
          
          <div className="space-y-2">
            <Label>Tax ID</Label>
            <Input name="taxId" value={formData.taxId} onChange={handleChange} placeholder="Tax / VAT ID" />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input name="website" value={formData.website} onChange={handleChange} placeholder="https://vendor.com" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          <Textarea name="address" value={formData.address} onChange={handleChange} placeholder="Full address" rows={3} />
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Link href="/dashboard/purchasing/vendors">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Vendor
          </Button>
        </div>
      </form>
    </div>
  );
}
