"use client";
//frontend/app/auth/login/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth, type User } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { getRoleDashboardRoute } from "@/lib/role-routing";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema as any),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.login(values.email, values.password);

      if (!response.success || !response.data) {
        setError(response.error?.message || "Login failed");
        return;
      }

      const { token, user } = response.data as { token: string; user: User };

      // Store auth data
      login(token, user);

      // Redirect based on role
      // Prefer roles array if available, fall back to single role
      const userRoles = user.roles && user.roles.length > 0 ? user.roles : (user.role ? [user.role] : []);
      const redirectPath = getRoleDashboardRoute(userRoles);
      router.push(redirectPath);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
            <p className="text-slate-600">Sign in to your Zoho ERP account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        type="email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your password"
                        type="password"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-center text-sm text-slate-600">
              Don't have an account?{" "}
              <button
                onClick={() => router.push("/auth/register")}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up
              </button>
            </p>
          </div>

          {/* <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 font-medium mb-2">Demo Credentials by Role:</p>
            <div className="space-y-1 text-xs text-blue-600">
              <p>
                <strong>Admin:</strong> admin@example.com / password123
              </p>
              <p>
                <strong>Branch Manager:</strong> manager@example.com / password123
              </p>
              <p>
                <strong>Cashier:</strong> cashier@example.com / password123
              </p>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
