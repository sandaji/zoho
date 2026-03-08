"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CRMPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard/crm/customers");
  }, [router]);

  return null;
}
