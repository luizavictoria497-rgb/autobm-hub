import { Download, CheckCircle2, Terminal, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const CHANGELOG = [
  { version: "0.1.0", notes: "Primeira versão: servidor local FastAPI, fluxos de criação de BM e sincronização com o app web." },
];

export function DownloadPage() {
  const { push } = useToast();

  function handleRequestAccess() {
    push("O App Nativo ainda não foi publicado. Assim que estiver disponível, você será avisado por e-mail.", "info");
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
        <CardHeader>
          <CardTitle>Versão atual</CardTitle>
          <CardDescription>Distribuição do executável local ainda em preparação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--surface)] px-3 py-1 font-mono text-sm text-[var(--foreground)]">
              v{CHANGELOG[0].version}
            </span>
            <Button onClick={handleRequestAccess}>
              <Download className="h-4 w-4" />
              Baixar App Nativo
            </Button>
          </div>
          <p className="text-sm text-[var(--muted)]">
            O download binário do App Nativo é distribuído fora deste painel web. Use o botão acima para ser notificado
            quando o pacote estiver disponível para a sua conta.
          </p>
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
              <span>Extraia o ZIP e instale as dependências com <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs">pip install -r requirements.txt</code>.</span>
            </li>
            <li className="flex gap-3">
              <Terminal className="mt-0.5 h-4 w-4 flex-none text-[var(--muted)]" />
              <span>Inicie o servidor local com <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs">uvicorn main:app --port 8000</code>.</span>
            </li>
            <li className="flex gap-3">
              <Terminal className="mt-0.5 h-4 w-4 flex-none text-[var(--muted)]" />
              <span>Faça login com a mesma conta deste painel para sincronizar BMs, contas e execuções.</span>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 flex-none text-[var(--muted)]" />
              <span>Em caso de dúvida na instalação, contate o suporte informado no seu plano.</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
