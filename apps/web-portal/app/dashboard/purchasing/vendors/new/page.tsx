import { redirect } from "next/navigation";

export default function NewVendorRedirect() {
  redirect("/dashboard/purchasing/vendors/create");
}
