import { useCallback, useEffect, useState } from "react";
import { Download, CheckCircle2, Terminal, BellRing, Loader2, MonitorSmartphone, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

const CHANGELOG = [
  {
    version: "0.1.0",
    notes: "Primeira versão planejada: servidor local FastAPI, fluxos de criação de BM e sincronização com o app web.",
  },
];

const REQUIREMENTS = [
  "Windows 10/11 ou macOS 12+ com Python 3.11 instalado",
  "AdsPower Local API ativo em http://local.adspower.net:50325",
  "Conexão com a internet para sincronizar com este painel",
];

type LoadState = "loading" | "ready" | "error";

export function DownloadPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [state, setState] = useState<LoadState>("loading");
  const [registered, setRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    const { data, error } = await supabase
      .from("native_app_waitlist")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      setState("error");
      return;
    }
    setRegistered(Boolean(data));
    setState("ready");
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRequestAccess() {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("native_app_waitlist")
      .insert({ user_id: user.id })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      // já registrado (violação de unicidade) também conta como sucesso
      if (error.code === "23505") {
        setRegistered(true);
        push("Você já está na lista de aviso.", "info");
        return;
      }
      push("Não foi possível registrar seu interesse agora. Tente novamente.", "error");
      return;
    }
    setRegistered(true);
    push("Pronto! Você será avisado por e-mail quando o App Nativo estiver disponível.", "success");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">App Nativo</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Execute os fluxos de automação localmente, integrado ao AdsPower e sincronizado com esta conta.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Status de lançamento</CardTitle>
            <CardDescription>O executável local ainda está em preparação.</CardDescription>
          </div>
          <Badge variant="warning">Em breve</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--surface)] px-3 py-1 font-mono text-sm text-[var(--foreground)]">
              v{CHANGELOG[0].version}
            </span>
            {state === "loading" ? (
              <div className="h-10 w-48 animate-pulse rounded-lg bg-[var(--surface)]" />
            ) : state === "error" ? (
              <Button variant="outline" onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            ) : registered ? (
              <Badge variant="success">
                <BellRing className="mr-1 h-3 w-3" />
                Você será avisado
              </Badge>
            ) : (
              <Button onClick={() => void handleRequestAccess()} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Avisar quando disponível
              </Button>
            )}
          </div>
          {state === "error" && (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-none" />
              Não foi possível carregar seu status de lista de espera.
            </p>
          )}
          <p className="text-sm text-[var(--muted)]">
            O download binário do App Nativo é distribuído fora deste painel web. Registre seu interesse acima para
            receber o link de download por e-mail assim que o pacote estiver liberado para a sua conta.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-[var(--muted)]" />
            Requisitos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-[var(--foreground)]">
            {REQUIREMENTS.map((req) => (
              <li key={req} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changelog</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {CHANGELOG.map((entry) => (
              <li key={entry.version} className="flex gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                <div>
                  <p className="font-medium text-[var(--foreground)]">v{entry.version}</p>
                  <p className="text-[var(--muted)]">{entry.notes}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instalação e execução</CardTitle>
          <CardDescription>Depois de extrair o pacote na sua máquina.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-[var(--foreground)]">
            <li className="flex gap-3">
              <Terminal className="mt-0.5 h-4 w-4 flex-none text-[var(--muted)]" />
              <span>
                Extraia o ZIP e instale as dependências com{" "}
                <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs">pip install -r requirements.txt</code>.
              </span>
            </li>
            <li className="flex gap-3">
              <Terminal className="mt-0.5 h-4 w-4 flex-none text-[var(--muted)]" />
              <span>
                Inicie o servidor local com{" "}
                <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs">uvicorn main:app --port 8000</code>.
              </span>
            </li>
            <li className="flex gap-3">
              <Terminal className="mt-0.5 h-4 w-4 flex-none text-[var(--muted)]" />
              <span>Faça login com a mesma conta deste painel para sincronizar BMs, contas e execuções.</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
