"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { User, getEligibleEmployees, grantSystemAccess } from "@/lib/admin-api";
import { useToast } from "@/lib/toast-context";
import { useAuth } from "@/lib/auth-context";

const grantAccessSchema = z.object({
    employeeId: z.string().min(1, "Please select an employee"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.string().min(1, "Please select a role"),
});

type GrantAccessFormValues = z.infer<typeof grantAccessSchema>;

interface GrantAccessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAccessGranted: (user: User) => void;
}

export function GrantAccessDialog({
    open,
    onOpenChange,
    onAccessGranted,
}: GrantAccessDialogProps) {
    const { token } = useAuth();
    const { toast } = useToast();
    const [employees, setEmployees] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchingEmployees, setFetchingEmployees] = useState(false);

    const form = useForm<GrantAccessFormValues>({
        resolver: zodResolver(grantAccessSchema),
        defaultValues: {
            employeeId: "",
            password: "",
            role: "cashier",
        },
    });

    useEffect(() => {
        if (open && token) {
            setFetchingEmployees(true);
            getEligibleEmployees(token)
                .then(setEmployees)
                .catch(() => toast("Failed to load eligible employees", "error"))
                .finally(() => setFetchingEmployees(false));
        }
    }, [open, token, toast]);

    const onSubmit = async (values: GrantAccessFormValues) => {
        if (!token) return;

        setIsLoading(true);
        try {
            const updatedUser = await grantSystemAccess(token, values.employeeId, {
                role: values.role,
                password: values.password,
            });

            toast("System access granted successfully", "success");
            onAccessGranted(updatedUser);
            onOpenChange(false);
            form.reset();
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to grant access", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Grant System Access</DialogTitle>
                    <DialogDescription>
                        Give an existing employee access to log into the system.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="employeeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Employee</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={fetchingEmployees}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={fetchingEmployees ? "Loading..." : "Select an employee"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {employees.map((emp) => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.name} ({emp.email})
                                                </SelectItem>
                                            ))}
                                            {employees.length === 0 && !fetchingEmployees && (
                                                <SelectItem value="none" disabled>
                                                    No eligible employees found
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Temporary Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>System Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="cashier">Cashier</SelectItem>
                                            <SelectItem value="warehouse_staff">Warehouse Staff</SelectItem>
                                            <SelectItem value="driver">Driver</SelectItem>
                                            <SelectItem value="branch_manager">Branch Manager</SelectItem>
                                            <SelectItem value="manager">Manager</SelectItem>
                                            <SelectItem value="accountant">Accountant</SelectItem>
                                            <SelectItem value="hr">HR</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="super_admin">Super Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading || employees.length === 0}>
                                {isLoading ? "Granting..." : "Grant Access"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
