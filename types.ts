export type BmStatus = "ANALISE" | "CRIADA" | "VERIFICADA" | "BLOQUEADA";
export type WhatsappTier = "250" | "2k" | "10k" | "100k";
export type AccountStatus = "ATIVO" | "BLOQUEADO" | "VERIFICACAO";
export type ExecutionStatus = "SUCESSO" | "ERRO" | "EM_ANDAMENTO";
export type Plan = "free" | "pro" | "enterprise";
export type AdspowerProfileStatus = "ATIVO" | "INATIVO";

export interface Profile {
  id: string;
  full_name: string | null;
  plan: Plan;
  created_at: string;
}

export interface AdspowerProfile {
  id: string;
  user_id: string;
  adspower_user_id: string | null;
  name: string;
  status: AdspowerProfileStatus;
  created_at: string;
}

export interface BusinessManager {
  id: string;
  user_id: string;
  bm_id: string;
  name: string;
  adspower_profile_id: string | null;
  profile_name: string | null;
  status: BmStatus;
  whatsapp_tier: WhatsappTier | null;
  created_at: string;
  updated_at: string;
}

export interface FacebookAccount {
  id: string;
  user_id: string;
  name: string;
  contact: string;
  password_encrypted: string | null;
  adspower_profile_id: string | null;
  profile_name: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface ApiConfig {
  user_id: string;
  number_api_url: string | null;
  number_api_method: "GET" | "POST";
  number_api_headers: Record<string, string>;
  number_api_body: Record<string, string>;
  site_api_url: string | null;
  site_api_method: "GET" | "POST";
  site_api_headers: Record<string, string>;
  site_api_body: Record<string, string>;
  pdf_api_path: string | null;
  ai_api_key_encrypted: string | null;
  adspower_api_url: string;
}

export interface Execution {
  id: string;
  user_id: string;
  flow_name: string;
  profile_ids: string[];
  status: ExecutionStatus;
  bms_created: unknown[];
  accounts_created: unknown[];
  logs_url: string | null;
  duration: number | null;
  created_at: string;
}

export const BM_STATUS_LABELS: Record<BmStatus, string> = {
  ANALISE: "Em análise",
  CRIADA: "Criada",
  VERIFICADA: "Verificada",
  BLOQUEADA: "Bloqueada",
};

export const BM_STATUS_BADGE: Record<BmStatus, "info" | "success" | "warning" | "danger"> = {
  ANALISE: "warning",
  CRIADA: "info",
  VERIFICADA: "success",
  BLOQUEADA: "danger",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  ATIVO: "Ativo",
  BLOQUEADO: "Bloqueado",
  VERIFICACAO: "Em verificação",
};

export const ACCOUNT_STATUS_BADGE: Record<AccountStatus, "info" | "success" | "warning" | "danger"> = {
  ATIVO: "success",
  BLOQUEADO: "danger",
  VERIFICACAO: "warning",
};

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  SUCESSO: "Sucesso",
  ERRO: "Erro",
  EM_ANDAMENTO: "Em andamento",
};

export const EXECUTION_STATUS_BADGE: Record<ExecutionStatus, "info" | "success" | "warning" | "danger"> = {
  SUCESSO: "success",
  ERRO: "danger",
  EM_ANDAMENTO: "info",
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const PLAN_LIMITS: Record<Plan, number | null> = {
  free: 5,
  pro: 50,
  enterprise: null,
};

export const AVAILABLE_FLOWS = [
  "Criar Business Manager",
  "Verificar Business Manager",
  "Criar conta Facebook",
  "Comprar número virtual",
  "Criar site de verificação",
  "Aquecimento Facebook",
] as const;

export const WHATSAPP_TIER_LABELS: Record<WhatsappTier, string> = {
  "250": "250 msgs/dia",
  "2k": "2 mil msgs/dia",
  "10k": "10 mil msgs/dia",
  "100k": "100 mil msgs/dia",
};
