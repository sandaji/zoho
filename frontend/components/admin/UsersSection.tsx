"use client";

import { useEffect, useState } from "react";
import { AdminTable, Column } from "./AdminTable";
import { User, fetchUsers } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { Button } from "../ui/button";
import { EditUserDialog } from "./EditUserDialog";
import { GrantAccessDialog } from "./GrantAccessDialog";

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case "admin":
      return "destructive";
    case "manager":
      return "default";
    default:
      return "secondary";
  }
};

export default function UsersSection() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [grantingAccess, setGrantingAccess] = useState(false);

  useEffect(() => {
    if (token) {
      setError(null);
      fetchUsers(token)
        .then(setUsers)
        .catch((err) => {
          console.error(err);
          // Previously this only logged to the console — the table then
          // rendered its normal "No data available" empty state, which reads
          // as "there are simply no users" rather than "this request failed"
          // (e.g. the caller's role lacks the admin.user.view permission).
          // Surface the real reason instead.
          setError(err instanceof Error ? err.message : "Failed to load users");
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleUserUpdated = (updatedUser: User) => {
    setUsers((currentUsers) =>
      currentUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
  };

  const handleAccessGranted = (newUser: User) => {
    setUsers((currentUsers) => [newUser, ...currentUsers]);
  };

  const columns: Column<User>[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    {
      key: "role",
      label: "Role",
      render: (role) => {
        const roleStr = role as string;
        return (
          <Badge variant={roleBadgeVariant(roleStr)}>
            {roleStr.replace("_", " ").toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: "phone",
      label: "Phone",
      render: (phone) => phone || "-",
    },
    {
      key: "branch",
      label: "Branch",
      render: (branch) => (branch as any)?.name || "-",
    },
    {
      key: "isActive",
      label: "Status",
      render: (isActive) => (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setGrantingAccess(true)}>
          Grant System Access
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn't load users: {error}
        </div>
      )}

      <AdminTable
        title="System Users"
        data={users}
        columns={columns}
        loading={loading}
        searchKeys={["name", "email", "phone", "role", "branch.name"]}
        emptyText={error ? "Users could not be loaded" : "No data available"}
        actions={(user) => (
          <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
            Edit
          </Button>
        )}
      />

      <EditUserDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={() => setEditingUser(null)}
        onUserUpdated={handleUserUpdated}
      />

      <GrantAccessDialog
        open={grantingAccess}
        onOpenChange={setGrantingAccess}
        onAccessGranted={handleAccessGranted}
      />
    </>
  );
}
