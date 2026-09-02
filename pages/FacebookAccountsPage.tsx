import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Search, AlertCircle, RefreshCw, Users, Loader2, Eye, EyeOff, Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import {
  ACCOUNT_STATUS_BADGE,
  ACCOUNT_STATUS_LABELS,
  type FacebookAccount,
  type AccountStatus,
} from "@/types";

interface FormState {
  name: string;
  contact: string;
  password: string;
  profile_name: string;
  status: AccountStatus;
}

const EMPTY_FORM: FormState = { name: "", contact: "", password: "", profile_name: "", status: "ATIVO" };

function parseCsv(text: string): { name: string; contact: string; password: string; profile_name: string; status: AccountStatus }[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const [header, ...rows] = lines;
  const columns = header.split(",").map((col) => col.trim().toLowerCase());
  return rows
    .map((row) => {
      const cells = row.split(",").map((cell) => cell.trim());
      const record: Record<string, string> = {};
      columns.forEach((col, idx) => {
        record[col] = cells[idx] ?? "";
      });
      const status = (record.status || "ATIVO").toUpperCase();
      return {
        name: record.name ?? "",
        contact: record.contact ?? record.email ?? "",
        password: record.password ?? "",
        profile_name: record.profile_name ?? record.profile ?? "",
        status: (["ATIVO", "BLOQUEADO", "VERIFICACAO"].includes(status) ? status : "ATIVO") as AccountStatus,
      };
    })
    .filter((row) => row.name && row.contact);
}

export function FacebookAccountsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "">("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("facebook_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError("Não foi possível carregar as contas Facebook.");
      setLoading(false);
      return;
    }
    setAccounts((data ?? []) as FacebookAccount[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (statusFilter && acc.status !== statusFilter) return false;
      if (term && !acc.name.toLowerCase().includes(term) && !acc.contact.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [accounts, search, statusFilter]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(acc: FacebookAccount) {
    setEditingId(acc.id);
    setForm({ name: acc.name, contact: acc.contact, password: "", profile_name: acc.profile_name ?? "", status: acc.status });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim() || !form.contact.trim()) {
      setFormError("Informe o nome e o e-mail ou telefone da conta.");
      return;
    }
    if (!editingId && !form.password.trim()) {
      setFormError("Informe uma senha para a nova conta.");
      return;
    }
    setSaving(true);
    setFormError(null);
    let passwordEncrypted: string | null | undefined = undefined;
    if (form.password.trim()) {
      const { data, error } = await supabase.rpc("encrypt_secret", { plain: form.password.trim() });
      if (error) {
        setSaving(false);
        setFormError("Não foi possível criptografar a senha.");
        return;
      }
      passwordEncrypted = data as string;
    }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      profile_name: form.profile_name.trim() || null,
      status: form.status,
      user_id: user.id,
    };
    if (passwordEncrypted !== undefined) payload.password_encrypted = passwordEncrypted;
    const result = editingId
      ? await supabase.from("facebook_accounts").update(payload).eq("id", editingId).select().single()
      : await supabase.from("facebook_accounts").insert(payload).select().single();
    setSaving(false);
    if (result.error) {
      setFormError("Não foi possível salvar. Verifique os dados e tente novamente.");
      return;
    }
    const saved = result.data as FacebookAccount;
    setAccounts((prev) => (editingId ? prev.map((acc) => (acc.id === saved.id ? saved : acc)) : [saved, ...prev]));
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[saved.id];
      return next;
    });
    setModalOpen(false);
    push(editingId ? "Conta atualizada." : "Conta adicionada.", "success");
  }

  async function handleDelete(acc: FacebookAccount) {
    setAccounts((prev) => prev.filter((item) => item.id !== acc.id));
    const { error } = await supabase.from("facebook_accounts").delete().eq("id", acc.id);
    if (error) {
      setAccounts((prev) => [acc, ...prev]);
      push("Não foi possível excluir a conta.", "error");
      return;
    }
    push(`Conta "${acc.name}" excluída.`, "success");
  }

  async function toggleReveal(acc: FacebookAccount) {
    if (revealed[acc.id] !== undefined) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[acc.id];
        return next;
      });
      return;
    }
    if (!acc.password_encrypted) {
      push("Nenhuma senha armazenada para esta conta.", "info");
      return;
    }
    setRevealing(acc.id);
    const { data, error } = await supabase.rpc("decrypt_secret", { enc: acc.password_encrypted });
    setRevealing(null);
    if (error || !data) {
      push("Não foi possível revelar a senha.", "error");
      return;
    }
    setRevealed((prev) => ({ ...prev, [acc.id]: data as string }));
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 1_000_000) {
      push("Arquivo CSV muito grande (máx. 1MB).", "error");
      return;
    }
    const text = await file.text();
    const rows = parseCsv(text).slice(0, 500);
    if (rows.length === 0) {
      push("Nenhuma linha válida encontrada no CSV. Use as colunas name,contact,password,profile_name,status.", "error");
      return;
    }
    setImporting(true);
    let successCount = 0;
    const created: FacebookAccount[] = [];
    for (const row of rows) {
      let passwordEncrypted: string | null = null;
      if (row.password) {
        const { data } = await supabase.rpc("encrypt_secret", { plain: row.password });
        passwordEncrypted = (data as string) ?? null;
      }
      const { data, error } = await supabase
        .from("facebook_accounts")
        .insert({
          user_id: user.id,
          name: row.name,
          contact: row.contact,
          password_encrypted: passwordEncrypted,
          profile_name: row.profile_name || null,
          status: row.status,
        })
        .select()
        .single();
      if (!error && data) {
        created.push(data as FacebookAccount);
        successCount += 1;
      }
    }
    setAccounts((prev) => [...created, ...prev]);
    setImporting(false);
    push(`Importação concluída: ${successCount} de ${rows.length} contas adicionadas.`, successCount > 0 ? "success" : "error");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Contas Facebook</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Contas usadas nas automações de criação de BM.</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
          <Button variant="outline" onClick={handleImportClick} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Adicionar conta
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, e-mail ou telefone"
              maxLength={200}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AccountStatus | "")}>
            <option value="">Todos os status</option>
            {Object.entries(ACCOUNT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--surface)]" />
          ))}
        </div>
      ) : loadError ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-[var(--foreground)]">{loadError}</p>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] text-center">
          <Users className="h-8 w-8 text-[var(--muted)]" />
          <p className="text-sm text-[var(--foreground)]">
            {accounts.length === 0 ? "Nenhuma conta cadastrada ainda." : "Nenhuma conta corresponde aos filtros."}
          </p>
          {accounts.length === 0 && (
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Adicionar a primeira conta
            </Button>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Senha</th>
                  <th className="px-4 py-3 font-medium">Perfil</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Criada em</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-white">
                {filtered.map((acc) => (
                  <tr key={acc.id} className="transition-colors hover:bg-[var(--surface)]">
                    <td className="max-w-[180px] truncate px-4 py-3 text-[var(--foreground)]">{acc.name}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-[var(--muted)]">{acc.contact}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[var(--foreground)]">
                          {revealed[acc.id] ?? "••••••••"}
                        </span>
                        <button
                          type="button"
                          aria-label={revealed[acc.id] !== undefined ? "Ocultar senha" : "Mostrar senha"}
                          onClick={() => void toggleReveal(acc)}
                          className="flex-none rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                        >
                          {revealing === acc.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : revealed[acc.id] !== undefined ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-[var(--muted)]">{acc.profile_name || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ACCOUNT_STATUS_BADGE[acc.status]}>{ACCOUNT_STATUS_LABELS[acc.status]}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-[var(--muted)]">
                      {new Date(acc.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(acc)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => void handleDelete(acc)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar conta Facebook" : "Adicionar conta Facebook"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <div>
            <Label htmlFor="accName">Nome da conta</Label>
            <Input
              id="accName"
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="accContact">E-mail ou telefone</Label>
            <Input
              id="accContact"
              required
              maxLength={200}
              value={form.contact}
              onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="accPassword">Senha {editingId && <span className="text-[var(--muted)]">(deixe em branco para manter)</span>}</Label>
            <Input
              id="accPassword"
              type="password"
              autoComplete="new-password"
              maxLength={200}
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="accProfile">Perfil AdsPower associado</Label>
            <Input
              id="accProfile"
              maxLength={200}
              placeholder="Nome do perfil"
              value={form.profile_name}
              onChange={(e) => setForm((prev) => ({ ...prev, profile_name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="accStatus">Status</Label>
            <Select
              id="accStatus"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as AccountStatus }))}
            >
              {Object.entries(ACCOUNT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
