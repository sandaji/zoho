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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [grantingAccess, setGrantingAccess] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUsers(token)
        .then(setUsers)
        .catch(console.error)
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

      <AdminTable
        title="System Users"
        data={users}
        columns={columns}
        loading={loading}
        searchKeys={["name", "email", "phone", "role", "branch.name"]}
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
