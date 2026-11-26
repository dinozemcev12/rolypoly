import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";
import { useAuthStore } from "@/store/useAuthStore";
import { AlertCircle, Mail, Lock, User as UserIcon } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const doLogin = async (loginValue: string, passValue: string) => {
    setError("");
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", loginValue);
      form.append("password", passValue);

      const res = await api.post("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const { access_token } = res.data;
      const meRes = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      setAuth(access_token, meRes.data);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(email, password);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-md p-8 bg-panel border border-[#2a3b52] rounded-xl shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-text-main">RolyPoly</h1>
        </div>
        <h2 className="text-sm font-semibold text-accent mb-6">Вход в аккаунт</h2>
        {error && (
          <div className="mb-4 p-3 rounded bg-error/10 text-error text-sm border border-error/20">
            <AlertCircle className="w-4 h-4 inline mr-2 align-top" /> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-text-main/70">Email или логин</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-main/40" />
              <input
                type="text"
                className="input pl-9"
                placeholder="gm@rolypoly.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-text-main/70">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-main/40" />
              <input
                type="password"
                className="input pl-9"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
        <div className="mt-5 pt-4 border-t border-[#2a3b52]">
          <div className="text-xs text-text-main/50 mb-2 text-center">Быстрый вход (демо, пароль: secret123):</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => doLogin("gm@rolypoly.com", "secret123")}
              disabled={loading}
              className="btn-ghost text-xs py-1.5"
            >
              Ведущий
            </button>
            <button
              type="button"
              onClick={() => doLogin("p1@rolypoly.com", "secret123")}
              disabled={loading}
              className="btn-ghost text-xs py-1.5"
            >
              Игрок 1
            </button>
            <button
              type="button"
              onClick={() => doLogin("p2@rolypoly.com", "secret123")}
              disabled={loading}
              className="btn-ghost text-xs py-1.5"
            >
              Игрок 2
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs text-text-main/50 text-center">
          Нет аккаунта?{" "}
          <a href="/register" className="text-accent hover:underline">
            Зарегистрироваться
          </a>
        </p>
      </div>
    </div>
  );
}
