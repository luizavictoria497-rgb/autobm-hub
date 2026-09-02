import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Search, AlertCircle, RefreshCw, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import {
  BM_STATUS_BADGE,
  BM_STATUS_LABELS,
  WHATSAPP_TIER_LABELS,
  type BusinessManager,
  type BmStatus,
  type WhatsappTier,
} from "@/types";

interface FormState {
  bm_id: string;
  name: string;
  profile_name: string;
  status: BmStatus;
  whatsapp_tier: WhatsappTier | "";
}

const EMPTY_FORM: FormState = { bm_id: "", name: "", profile_name: "", status: "ANALISE", whatsapp_tier: "" };

export function BusinessManagersPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [bms, setBms] = useState<BusinessManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BmStatus | "">("");
  const [profileFilter, setProfileFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("business_managers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError("Não foi possível carregar os Business Managers.");
      setLoading(false);
      return;
    }
    setBms((data ?? []) as BusinessManager[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bms.filter((bm) => {
      if (statusFilter && bm.status !== statusFilter) return false;
      if (profileFilter && !(bm.profile_name ?? "").toLowerCase().includes(profileFilter.toLowerCase())) return false;
      if (term && !bm.name.toLowerCase().includes(term) && !bm.bm_id.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [bms, search, statusFilter, profileFilter]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(bm: BusinessManager) {
    setEditingId(bm.id);
    setForm({
      bm_id: bm.bm_id,
      name: bm.name,
      profile_name: bm.profile_name ?? "",
      status: bm.status,
      whatsapp_tier: bm.whatsapp_tier ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.bm_id.trim() || !form.name.trim()) {
      setFormError("Informe o ID e o nome da BM.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      bm_id: form.bm_id.trim(),
      name: form.name.trim(),
      profile_name: form.profile_name.trim() || null,
      status: form.status,
      whatsapp_tier: form.whatsapp_tier || null,
      user_id: user.id,
    };
    const result = editingId
      ? await supabase.from("business_managers").update(payload).eq("id", editingId).select().single()
      : await supabase.from("business_managers").insert(payload).select().single();
    setSaving(false);
    if (result.error) {
      setFormError("Não foi possível salvar. Verifique os dados e tente novamente.");
      return;
    }
    const saved = result.data as BusinessManager;
    setBms((prev) => (editingId ? prev.map((bm) => (bm.id === saved.id ? saved : bm)) : [saved, ...prev]));
    setModalOpen(false);
    push(editingId ? "Business Manager atualizada." : "Business Manager adicionada.", "success");
  }

  async function handleDelete(bm: BusinessManager) {
    setBms((prev) => prev.filter((item) => item.id !== bm.id));
    const { error } = await supabase.from("business_managers").delete().eq("id", bm.id);
    if (error) {
      setBms((prev) => [bm, ...prev]);
      push("Não foi possível excluir a BM.", "error");
      return;
    }
    push(`BM "${bm.name}" excluída.`, "success");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Business Managers</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Gerencie as BMs criadas pelas automações.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Adicionar BM
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou ID"
              maxLength={200}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BmStatus | "")}>
            <option value="">Todos os status</option>
            {Object.entries(BM_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Filtrar por perfil AdsPower"
            maxLength={200}
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
          />
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
          <Building2 className="h-8 w-8 text-[var(--muted)]" />
          <p className="text-sm text-[var(--foreground)]">
            {bms.length === 0 ? "Nenhuma BM cadastrada ainda." : "Nenhuma BM corresponde aos filtros."}
          </p>
          {bms.length === 0 && (
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Adicionar a primeira BM
            </Button>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">ID da BM</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Perfil</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tier WhatsApp</th>
                  <th className="px-4 py-3 font-medium">Criada em</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-white">
                {filtered.map((bm) => (
                  <tr key={bm.id} className="transition-colors hover:bg-[var(--surface)]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-[var(--foreground)]">{bm.bm_id}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-[var(--foreground)]">{bm.name}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-[var(--muted)]">{bm.profile_name || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={BM_STATUS_BADGE[bm.status]}>{BM_STATUS_LABELS[bm.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {bm.whatsapp_tier ? WHATSAPP_TIER_LABELS[bm.whatsapp_tier] : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-[var(--muted)]">
                      {new Date(bm.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(bm)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => void handleDelete(bm)}>
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
        title={editingId ? "Editar Business Manager" : "Adicionar Business Manager"}
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
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          )}
          <div>
            <Label htmlFor="bmId">ID da BM</Label>
            <Input
              id="bmId"
              required
              maxLength={50}
              placeholder="1234567890"
              value={form.bm_id}
              onChange={(e) => setForm((prev) => ({ ...prev, bm_id: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="bmName">Nome da BM</Label>
            <Input
              id="bmName"
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="bmProfile">Perfil AdsPower associado</Label>
            <Input
              id="bmProfile"
              maxLength={200}
              placeholder="Nome do perfil"
              value={form.profile_name}
              onChange={(e) => setForm((prev) => ({ ...prev, profile_name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bmStatus">Status</Label>
              <Select
                id="bmStatus"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as BmStatus }))}
              >
                {Object.entries(BM_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="bmTier">Tier da API WhatsApp</Label>
              <Select
                id="bmTier"
                value={form.whatsapp_tier}
                onChange={(e) => setForm((prev) => ({ ...prev, whatsapp_tier: e.target.value as WhatsappTier | "" }))}
              >
                <option value="">Não definido</option>
                {Object.entries(WHATSAPP_TIER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
