import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";
import { User as UserIcon, Mail, Lock, AlertCircle } from "lucide-react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"player" | "gm">("player");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", { username, email, password, role });
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-sm font-semibold text-accent mb-6">Создать аккаунт</h2>
        {error && (
          <div className="mb-4 p-3 rounded bg-error/10 text-error text-sm border border-error/20">
            <AlertCircle className="w-4 h-4 inline mr-2 align-top" /> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-text-main/70">Имя пользователя</label>
            <input
              type="text"
              className="input"
              placeholder="rolypoly_player"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-text-main/70">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-main/40" />
              <input
                type="email"
                className="input pl-9"
                placeholder="you@example.com"
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
          <div className="space-y-2">
            <label className="text-xs text-text-main/70">Роль</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as "player" | "gm")}
            >
              <option value="player">Игрок</option>
              <option value="gm">Ведущий (GM)</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Создание..." : "Создать аккаунт"}
          </button>
        </form>
        <p className="mt-6 text-xs text-text-main/50 text-center">
          Уже есть аккаунт?{" "}
          <a href="/login" className="text-accent hover:underline">
            Войти
          </a>
        </p>
      </div>
    </div>
  );
}
