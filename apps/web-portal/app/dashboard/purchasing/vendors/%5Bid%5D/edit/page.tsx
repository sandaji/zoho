"use client";

import { useState, useEffect } from "react";
import { frontendEnv } from "@/lib/env";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

export default function EditVendorPage() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
        website: "",
        paymentTerms: "NET_30",
        leadTimeDays: 7,
    });

    useEffect(() => {
        if (id) {
            fetchVendor();
        }
    }, [id]);

    const fetchVendor = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/purchasing/vendors/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const result = await response.json();
                const vendor = result.data;
                setFormData({
                    name: vendor.name || "",
                    code: vendor.code || "",
                    email: vendor.email || "",
                    phone: vendor.phone || "",
                    address: vendor.address || "",
                    taxId: vendor.taxId || "",
                    website: vendor.website || "",
                    paymentTerms: vendor.paymentTerms || "NET_30",
                    leadTimeDays: vendor.leadTimeDays || 7,
                });
            } else {
                toast.error("Failed to load vendor");
                router.push("/dashboard/purchasing/vendors");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while loading vendor");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.code) {
            toast.error("Name and Code are required");
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${frontendEnv.NEXT_PUBLIC_API_URL}/v1/purchasing/vendors/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    leadTimeDays: parseInt(formData.leadTimeDays.toString()) || 7
                }),
            });

            if (response.ok) {
                toast.success("Vendor updated successfully");
                router.push("/dashboard/purchasing/vendors");
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to update vendor");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/purchasing/vendors">
                    <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">Edit Vendor</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Vendor Code *</Label>
                        <Input name="code" value={formData.code} onChange={handleChange} placeholder="e.g. VEN-001" required disabled />
                        <p className="text-[10px] text-slate-500">Vendor code cannot be changed</p>
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

                    <div className="space-y-2">
                        <Label>Payment Terms</Label>
                        <Select
                            value={formData.paymentTerms}
                            onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select terms" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NET_30">NET 30</SelectItem>
                                <SelectItem value="NET_60">NET 60</SelectItem>
                                <SelectItem value="CASH_ON_DELIVERY">Cash on Delivery</SelectItem>
                                <SelectItem value="PREPAID">Prepaid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Lead Time (Days)</Label>
                        <Input
                            name="leadTimeDays"
                            type="number"
                            value={formData.leadTimeDays}
                            onChange={handleChange}
                            placeholder="7"
                        />
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
                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    );
}
