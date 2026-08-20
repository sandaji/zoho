import type { User, Branch } from "@/lib/types/admin";
import type { NavigationModule, NavigationPage, NavigationStats } from "@/lib/navigation";

export interface SwitcherBranch {
  id: string;
  name: string;
  code: string;
}

export interface SearchResult {
  id: string;
  label: string;
  href: string;
  type: "product" | "customer";
}

export interface SidebarProps {
  user: User;
  logout: () => void;
  switchBranch: (branchId: string) => Promise<void>;
}

export type { NavigationModule, NavigationPage, NavigationStats };