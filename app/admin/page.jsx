import { redirect } from "next/navigation";
import { currentUser } from "../../lib/security";
import AdminDashboard from "../../components/AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (!user.emailVerified) redirect("/login?next=%2Fadmin");
  if (user.role !== "admin") redirect("/account");
  return <AdminDashboard/>;
}
