import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, Users, Settings, Download, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PLAN_LABELS } from "@/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/bms", label: "Business Managers", icon: Building2, end: false },
  { to: "/accounts", label: "Contas Facebook", icon: Users, end: false },
  { to: "/settings", label: "Configurações", icon: Settings, end: false },
  { to: "/download", label: "App Nativo", icon: Download, end: false },
];

export function AppShell() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-none flex-col border-r border-[var(--border)] bg-white transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 flex-none items-center justify-between border-b border-[var(--border)] px-5">
          <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">BM Automator</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface)] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                )
              }
            >
              <item.icon className="h-4 w-4 flex-none" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex-none border-t border-[var(--border)] p-3">
          <div className="mb-2 min-w-0 rounded-lg bg-[var(--surface)] px-3 py-2">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{user?.email}</p>
            <p className="text-xs text-[var(--muted)]">Plano {PLAN_LABELS[profile?.plan ?? "free"]}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="flex h-16 items-center gap-3 border-b border-[var(--border)] bg-white px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface)] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="truncate text-sm text-[var(--muted)]">Gestão de automação Facebook &amp; WhatsApp Business</p>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
