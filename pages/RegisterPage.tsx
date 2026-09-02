import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, Boxes } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function RegisterPage() {
  const { user, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signUpError, signedIn } = await signUp(email, password, fullName);
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    if (signedIn) {
      // Sem confirmação de e-mail: a conta já entra logada, direto no painel.
      navigate("/", { replace: true });
      return;
    }
    setDone(true);
    window.setTimeout(() => navigate("/login", { replace: true }), 1200);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
            <Boxes className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">BM Automator</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Criar conta</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Comece grátis com até 5 Business Managers.</p>
        {done ? (
          <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Conta criada com sucesso. Redirecionando para o login…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                required
                maxLength={120}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                maxLength={200}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                maxLength={100}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar conta
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-[var(--accent)] hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
