import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useGameStore } from "@/store/useGameStore";
import api from "@/api/api";
import type { Game } from "@/types";
import { User, Mail, Shield, Save, Key, AlertCircle, CheckCircle, Upload, Gamepad2 } from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { setCurrentGame } = useGameStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    api.get("/users/me/games").then((res) => setMyGames(res.data || [])).catch(() => {});
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setMsg(""); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await api.post("/uploads/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const res = await api.patch("/users/me", { avatar_url: up.data.url });
      setUser(res.data);
      setMsg("Аватар обновлён");
    } catch (ex: any) {
      setErr(ex.response?.data?.detail || "Ошибка загрузки аватара");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const [form, setForm] = useState({
    username: user?.username || "",
    full_name: user?.full_name || "",
    email: user?.email || "",
  });

  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [msg, setMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [err, setErr] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");
    setSaving(true);
    try {
      const res = await api.patch("/users/me", {
        username: form.username,
        full_name: form.full_name || undefined,
      });
      setUser(res.data);
      setMsg("Профиль обновлён");
    } catch (ex: any) {
      setErr(ex.response?.data?.detail || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(""); setPwErr("");
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwErr("Пароли не совпадают");
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwErr("Минимум 6 символов");
      return;
    }
    setSavingPw(true);
    try {
      await api.post("/users/me/change-password", {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwMsg("Пароль успешно изменён");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (ex: any) {
      setPwErr(ex.response?.data?.detail || "Ошибка смены пароля");
    } finally {
      setSavingPw(false);
    }
  };

  const roleLabel = user?.role === "gm" ? "Ведущий" : user?.role === "admin" ? "Администратор" : "Игрок";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-accent" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-main">{user?.username}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Shield className="w-3 h-3 text-accent" />
            <span className="text-xs text-accent">{roleLabel}</span>
            <span className="text-xs text-text-main/40">·</span>
            <Mail className="w-3 h-3 text-text-main/50" />
            <span className="text-xs text-text-main/60">{user?.email}</span>
          </div>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg"
          onChange={handleAvatarUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="btn-ghost text-xs flex items-center gap-1.5 border border-[#2a3b52]"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploadingAvatar ? "Загрузка..." : "Сменить аватар"}
        </button>
      </div>

      {/* Основная информация */}
      <div className="panel p-6 space-y-4">
        <h2 className="text-sm font-semibold text-accent">Основная информация</h2>

        {msg && (
          <div className="flex items-center gap-2 p-3 rounded bg-success/10 border border-success/30 text-success text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {msg}
          </div>
        )}
        {err && (
          <div className="flex items-center gap-2 p-3 rounded bg-error/10 border border-error/30 text-error text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {err}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-text-main/70">Имя пользователя</label>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                minLength={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-text-main/70">Полное имя</label>
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Необязательно"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-text-main/70">Email</label>
            <input
              className="input opacity-60"
              value={form.email}
              disabled
              title="Email нельзя изменить"
            />
            <p className="text-[11px] text-text-main/40">Email изменить нельзя</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      </div>

      {/* Смена пароля */}
      <div className="panel p-6 space-y-4">
        <h2 className="text-sm font-semibold text-accent">Смена пароля</h2>

        {pwMsg && (
          <div className="flex items-center gap-2 p-3 rounded bg-success/10 border border-success/30 text-success text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {pwMsg}
          </div>
        )}
        {pwErr && (
          <div className="flex items-center gap-2 p-3 rounded bg-error/10 border border-error/30 text-error text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {pwErr}
          </div>
        )}

        <form onSubmit={handlePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-text-main/70">Текущий пароль</label>
            <input
              className="input"
              type="password"
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-text-main/70">Новый пароль</label>
              <input
                className="input"
                type="password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-text-main/70">Подтвердите пароль</label>
              <input
                className="input"
                type="password"
                value={pwForm.confirm_password}
                onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPw}
            className="btn-ghost flex items-center gap-2 border border-[#2a3b52]"
          >
            <Key className="w-4 h-4" />
            {savingPw ? "Смена..." : "Сменить пароль"}
          </button>
        </form>
      </div>

      {/* Информация об аккаунте */}
      <div className="panel p-6">
        <h2 className="text-sm font-semibold text-accent mb-3">Информация об аккаунте</h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-text-main/40">ID пользователя</span>
            <div className="text-text-main font-mono mt-0.5">#{user?.id}</div>
          </div>
          <div>
            <span className="text-text-main/40">Роль</span>
            <div className="text-accent font-medium mt-0.5">{roleLabel}</div>
          </div>
          <div>
            <span className="text-text-main/40">Статус</span>
            <div className={`mt-0.5 ${user?.is_active ? "text-success" : "text-error"}`}>
              {user?.is_active ? "Активен" : "Неактивен"}
            </div>
          </div>
          {user?.created_at && (
            <div>
              <span className="text-text-main/40">Дата регистрации</span>
              <div className="text-text-main/70 mt-0.5">
                {new Date(user.created_at).toLocaleDateString("ru-RU")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Игровые сессии пользователя */}
      <div className="panel p-6 space-y-3">
        <h2 className="text-sm font-semibold text-accent flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> Мои игровые сессии ({myGames.length})
        </h2>
        {myGames.length === 0 ? (
          <div className="text-xs text-text-main/50">Вы пока не участвуете ни в одной игре.</div>
        ) : (
          <div className="space-y-2">
            {myGames.map((g) => (
              <div key={g.id} className="panel-2 p-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-text-main">{g.title}</div>
                  <div className="text-text-main/50">
                    Ход {g.current_turn_number} · {g.current_month || `${g.start_year}-01`} · {g.status}
                  </div>
                </div>
                <button
                  onClick={() => setCurrentGame(g)}
                  className="btn-ghost text-xs py-1 text-accent"
                >
                  Выбрать
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
