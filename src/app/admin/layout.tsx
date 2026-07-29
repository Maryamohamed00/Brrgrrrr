import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/admin/Sidebar";
import { RoleProvider } from "@/components/admin/RoleContext";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "VIEWER") redirect("/pos");

  return (
    <RoleProvider role={session.role}>
      {/* Updated flex direction so the sidebar doesn't crush the screen on mobile */}
      <div className="flex flex-col md:flex-row min-h-screen bg-panel w-full overflow-hidden">
        <Sidebar adminName={session.name} role={session.role} />

        {/* Adjusted padding for mobile (p-4) vs desktop (md:p-8) */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          {session.role === "VIEWER" && (
            <div className="mb-6 px-4 py-2.5 rounded-xl bg-warning/10 border border-warning/30 text-sm inline-block">
              View-only access — editing, refunds, and configuration are
              disabled for your role.
            </div>
          )}
          {children}
        </main>
      </div>
    </RoleProvider>
  );
}
