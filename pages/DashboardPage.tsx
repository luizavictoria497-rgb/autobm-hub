import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, Workflow, History, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AVAILABLE_FLOWS,
  BM_STATUS_BADGE,
  BM_STATUS_LABELS,
  ACCOUNT_STATUS_BADGE,
  ACCOUNT_STATUS_LABELS,
  EXECUTION_STATUS_BADGE,
  EXECUTION_STATUS_LABELS,
  type BmStatus,
  type AccountStatus,
  type Execution,
} from "@/types";

interface DashboardStats {
  bmsTotal: number;
  accountsTotal: number;
  bmsByStatus: Record<string, number>;
  accountsByStatus: Record<string, number>;
  recentExecutions: Execution[];
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-2xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
          <p className="truncate text-sm text-[var(--muted)]">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function StatusBars({ title, counts, labels, badges }: {
  title: string;
  counts: Record<string, number>;
  labels: Record<string, string>;
  badges: Record<string, "info" | "success" | "warning" | "danger">;
}) {
  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Sem registros ainda.</p>
        ) : (
          <div className="space-y-3">
            {entries.map(([key, count]) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <Badge variant={badges[key] ?? "neutral"}>{labels[key] ?? key}</Badge>
                  <span className="font-mono tabular-nums text-[var(--muted)]">{count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadingStats(true);
    setLoadError(null);
    const [bmsRes, accountsRes, execRes] = await Promise.all([
      supabase.from("business_managers").select("status"),
      supabase.from("facebook_accounts").select("status"),
      supabase.from("executions").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    if (bmsRes.error || accountsRes.error || execRes.error) {
      setLoadError("Não foi possível carregar os dados do dashboard.");
      setLoadingStats(false);
      return;
    }
    const bmsByStatus: Record<string, number> = {};
    for (const row of (bmsRes.data ?? []) as Array<{ status: string }>) {
      bmsByStatus[row.status] = (bmsByStatus[row.status] ?? 0) + 1;
    }
    const accountsByStatus: Record<string, number> = {};
    for (const row of (accountsRes.data ?? []) as Array<{ status: string }>) {
      accountsByStatus[row.status] = (accountsByStatus[row.status] ?? 0) + 1;
    }
    setStats({
      bmsTotal: (bmsRes.data ?? []).length,
      accountsTotal: (accountsRes.data ?? []).length,
      bmsByStatus,
      accountsByStatus,
      recentExecutions: (execRes.data ?? []) as Execution[],
    });
    setLoadingStats(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  if (loadingStats) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--surface)]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--surface)]" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-[var(--foreground)]">{loadError}</p>
        <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Visão geral das suas automações de Facebook e WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Business Managers" value={stats.bmsTotal} />
        <StatCard icon={Users} label="Contas Facebook" value={stats.accountsTotal} />
        <StatCard icon={Workflow} label="Fluxos disponíveis" value={AVAILABLE_FLOWS.length} />
        <StatCard icon={History} label="Execuções recentes" value={stats.recentExecutions.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusBars
          title="BMs por status"
          counts={stats.bmsByStatus}
          labels={BM_STATUS_LABELS}
          badges={BM_STATUS_BADGE as Record<string, "info" | "success" | "warning" | "danger">}
        />
        <StatusBars
          title="Contas por status"
          counts={stats.accountsByStatus}
          labels={ACCOUNT_STATUS_LABELS}
          badges={ACCOUNT_STATUS_BADGE as Record<string, "info" | "success" | "warning" | "danger">}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas atividades</CardTitle>
          <CardDescription>Execuções sincronizadas do App Nativo.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentExecutions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <History className="h-8 w-8 text-[var(--muted)]" />
              <p className="text-sm text-[var(--muted)]">Nenhuma execução registrada ainda.</p>
              <Link to="/download" className="text-sm font-medium text-[var(--accent)] hover:underline">
                Baixar o App Nativo
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {stats.recentExecutions.map((execution) => (
                <li key={execution.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">{execution.flow_name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(execution.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={EXECUTION_STATUS_BADGE[execution.status]}>
                    {EXECUTION_STATUS_LABELS[execution.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
