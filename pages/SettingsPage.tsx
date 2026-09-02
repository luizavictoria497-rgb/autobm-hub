import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Save, Plug, KeyRound, Globe2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { ApiConfig } from "@/types";

interface FormState {
  number_api_url: string;
  number_api_method: "GET" | "POST";
  number_api_headers: string;
  number_api_body: string;
  site_api_url: string;
  site_api_method: "GET" | "POST";
  site_api_headers: string;
  site_api_body: string;
  pdf_api_path: string;
  ai_api_key: string;
  adspower_api_url: string;
}

const EMPTY_FORM: FormState = {
  number_api_url: "",
  number_api_method: "POST",
  number_api_headers: "{}",
  number_api_body: "{}",
  site_api_url: "",
  site_api_method: "POST",
  site_api_headers: "{}",
  site_api_body: "{}",
  pdf_api_path: "",
  ai_api_key: "",
  adspower_api_url: "http://local.adspower.net:50325/api/v1/",
};

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function parseJsonOrNull(text: string): Record<string, string> | null {
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function SettingsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<"number" | "site" | "adspower" | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("api_configs").select("*").eq("user_id", user.id).maybeSingle();
    if (data) {
      const config = data as ApiConfig;
      setForm({
        number_api_url: config.number_api_url ?? "",
        number_api_method: config.number_api_method ?? "POST",
        number_api_headers: safeJsonStringify(config.number_api_headers),
        number_api_body: safeJsonStringify(config.number_api_body),
        site_api_url: config.site_api_url ?? "",
        site_api_method: config.site_api_method ?? "POST",
        site_api_headers: safeJsonStringify(config.site_api_headers),
        site_api_body: safeJsonStringify(config.site_api_body),
        pdf_api_path: config.pdf_api_path ?? "",
        ai_api_key: "",
        adspower_api_url: config.adspower_api_url || "http://local.adspower.net:50325/api/v1/",
      });
      setHasStoredKey(!!config.ai_api_key_encrypted);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const numberHeaders = parseJsonOrNull(form.number_api_headers);
    const numberBody = parseJsonOrNull(form.number_api_body);
    const siteHeaders = parseJsonOrNull(form.site_api_headers);
    const siteBody = parseJsonOrNull(form.site_api_body);
    if (!numberHeaders || !numberBody || !siteHeaders || !siteBody) {
      push("Verifique os campos JSON: algum deles está mal formatado.", "error");
      return;
    }
    setSaving(true);
    let aiKeyEncrypted: string | null | undefined = undefined;
    if (form.ai_api_key.trim()) {
      const { data, error } = await supabase.rpc("encrypt_secret", { plain: form.ai_api_key.trim() });
      if (error) {
        setSaving(false);
        push("Não foi possível criptografar a chave de IA.", "error");
        return;
      }
      aiKeyEncrypted = data as string;
    }
    const payload: Record<string, unknown> = {
      user_id: user.id,
      number_api_url: form.number_api_url || null,
      number_api_method: form.number_api_method,
      number_api_headers: numberHeaders,
      number_api_body: numberBody,
      site_api_url: form.site_api_url || null,
      site_api_method: form.site_api_method,
      site_api_headers: siteHeaders,
      site_api_body: siteBody,
      pdf_api_path: form.pdf_api_path || null,
      adspower_api_url: form.adspower_api_url || "http://local.adspower.net:50325/api/v1/",
    };
    if (aiKeyEncrypted !== undefined) payload.ai_api_key_encrypted = aiKeyEncrypted;
    const { error } = await supabase.from("api_configs").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      push("Não foi possível salvar as configurações.", "error");
      return;
    }
    if (aiKeyEncrypted) setHasStoredKey(true);
    update("ai_api_key", "");
    push("Configurações salvas com sucesso.", "success");
  }

  async function testConnection(kind: "number" | "site" | "adspower") {
    setTesting(kind);
    try {
      const url = kind === "number" ? form.number_api_url : kind === "site" ? form.site_api_url : form.adspower_api_url;
      const method = kind === "number" ? form.number_api_method : kind === "site" ? form.site_api_method : "GET";
      if (!url) {
        push("Informe a URL antes de testar.", "error");
        return;
      }
      const headersText = kind === "number" ? form.number_api_headers : kind === "site" ? form.site_api_headers : "{}";
      const headers = parseJsonOrNull(headersText) ?? {};
      const response = await fetch(url, { method, headers });
      if (response.ok) push("Conexão bem-sucedida.", "success");
      else push(`A API respondeu com status ${response.status}.`, "error");
    } catch {
      push("Não foi possível conectar. Verifique a URL e a rede.", "error");
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-[var(--surface)]" />
        <div className="h-64 animate-pulse rounded-2xl bg-[var(--surface)]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Configurações</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">APIs externas usadas pelo App Nativo nas automações.</p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar configurações
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API de compra de número</CardTitle>
          <CardDescription>Usada para adquirir números virtuais para verificação de WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
            <div>
              <Label htmlFor="numberUrl">URL</Label>
              <Input
                id="numberUrl"
                type="url"
                maxLength={500}
                placeholder="https://api.exemplo.com/numeros"
                value={form.number_api_url}
                onChange={(e) => update("number_api_url", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="numberMethod">Método</Label>
              <Select
                id="numberMethod"
                value={form.number_api_method}
                onChange={(e) => update("number_api_method", e.target.value as "GET" | "POST")}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="numberHeaders">Headers (JSON)</Label>
              <Textarea
                id="numberHeaders"
                maxLength={2000}
                spellCheck={false}
                value={form.number_api_headers}
                onChange={(e) => update("number_api_headers", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="numberBody">Body params (país, serviço) (JSON)</Label>
              <Textarea
                id="numberBody"
                maxLength={2000}
                spellCheck={false}
                value={form.number_api_body}
                onChange={(e) => update("number_api_body", e.target.value)}
              />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => testConnection("number")} disabled={testing === "number"}>
            {testing === "number" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Testar conexão
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API de criação de site</CardTitle>
          <CardDescription>Gera páginas de verificação usadas no fluxo de BMs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
            <div>
              <Label htmlFor="siteUrl">URL</Label>
              <Input
                id="siteUrl"
                type="url"
                maxLength={500}
                placeholder="https://api.exemplo.com/sites"
                value={form.site_api_url}
                onChange={(e) => update("site_api_url", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="siteMethod">Método</Label>
              <Select
                id="siteMethod"
                value={form.site_api_method}
                onChange={(e) => update("site_api_method", e.target.value as "GET" | "POST")}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="siteHeaders">Headers (JSON)</Label>
              <Textarea
                id="siteHeaders"
                maxLength={2000}
                spellCheck={false}
                value={form.site_api_headers}
                onChange={(e) => update("site_api_headers", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="siteBody">Body params (slug, título) (JSON)</Label>
              <Textarea
                id="siteBody"
                maxLength={2000}
                spellCheck={false}
                value={form.site_api_body}
                onChange={(e) => update("site_api_body", e.target.value)}
              />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => testConnection("site")} disabled={testing === "site"}>
            {testing === "site" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Testar conexão
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PDF e Inteligência Artificial</CardTitle>
          <CardDescription>Edição de PDF local e chave de IA para automação avançada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pdfPath">Caminho da API/executável de edição de PDF</Label>
            <Input
              id="pdfPath"
              maxLength={500}
              placeholder="C:\\ferramentas\\pdf-editor.exe ou https://api.exemplo.com/pdf"
              value={form.pdf_api_path}
              onChange={(e) => update("pdf_api_path", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="aiKey">Chave de API de IA (OpenAI/Claude)</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                id="aiKey"
                type="password"
                maxLength={200}
                autoComplete="off"
                className="pl-9"
                placeholder={hasStoredKey ? "•••••••••••• (definida)" : "sk-..."}
                value={form.ai_api_key}
                onChange={(e) => update("ai_api_key", e.target.value)}
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              {hasStoredKey
                ? "Uma chave já está configurada. Deixe em branco para mantê-la ou digite uma nova para substituir."
                : "Armazenada de forma criptografada no banco de dados."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AdsPower</CardTitle>
          <CardDescription>URL da API local do AdsPower usada pelo App Nativo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              className="pl-9"
              maxLength={300}
              value={form.adspower_api_url}
              onChange={(e) => update("adspower_api_url", e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => testConnection("adspower")} disabled={testing === "adspower"}>
            {testing === "adspower" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Testar conexão
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
