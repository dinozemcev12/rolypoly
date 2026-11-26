import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useGameStore } from "@/store/useGameStore";
import { getWorldCountriesGeoJSON } from "@/utils/worldMap";
import type { Game, Order, GameMember } from "@/types";
import {
  Building2,
  Wallet,
  Clock,
  Activity,
  ShieldCheck,
  List,
  Plus,
  Check,
  X,
  Play,
  SkipForward,
  Users,
  UserPlus,
  Trash2,
} from "lucide-react";

export default function GMPanel() {
  const { user } = useAuthStore();
  const { currentGame, setCurrentGame } = useGameStore();
  const navigate = useNavigate();

  const [games, setGames] = useState<Game[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<GameMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newYear, setNewYear] = useState(2026);
  const [autoImportMap, setAutoImportMap] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("player");
  const [inviting, setInviting] = useState(false);

  const isGM = user?.role === "gm" || user?.role === "admin";

  const load = async () => {
    try {
      const res = await api.get("/games/");
      setGames(res.data);
      const active = currentGame
        ? res.data.find((g: Game) => g.id === currentGame.id) || res.data[0]
        : res.data[0];
      if (active) {
        setCurrentGame(active);
        const [ordRes, memRes] = await Promise.all([
          api.get(`/orders/games/${active.id}`),
          api.get(`/games/${active.id}/members`),
        ]);
        setOrders(ordRes.data);
        setMembers(memRes.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isGM) return;
    load();
  }, [isGM]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      const res = await api.post("/games/", {
        title: newTitle,
        description: newDesc || undefined,
        start_year: newYear,
        max_players: 6,
      });
      setNewTitle(""); setNewDesc("");
      setCurrentGame(res.data);
      let extraMsg = "";
      if (autoImportMap) {
        try {
          const payload: any = { year: newYear, create_countries: true, replace_existing: true };
          if (newYear >= 2000) payload.geojson = getWorldCountriesGeoJSON();
          const imp = await api.post(`/territories/games/${res.data.id}/import-by-year`, payload);
          extraMsg = ` · Импортировано за ${imp.data.matched_year} г.: стран +${imp.data.created_countries_count}, территорий +${imp.data.imported_territories_count}`;
        } catch {
          extraMsg = " (не удалось автоимпортировать карту — можно загрузить на странице карты)";
        }
      }
      setMessage(`Создана сессия «${res.data.title}»${extraMsg}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось создать игру");
    }
  };

  const handleTurnAction = async (gameId: number, action: string) => {
    setError(""); setMessage("");
    try {
      const res = await api.post(`/turns/games/${gameId}/action`, { action });
      setMessage(`Ход #${res.data.turn_number}: статус «${res.data.status}» (${res.data.month_start})`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка управления ходом");
    }
  };

  const handleOrderDecision = async (orderId: number, status: "accepted" | "rejected") => {
    setError("");
    try {
      await api.post(`/orders/${orderId}/decision`, {
        status,
        gm_comment: status === "accepted" ? "Одобрено ведущим" : "Отклонено ведущим",
      });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка решения по приказу");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGame || !inviteUsername.trim()) return;
    setError(""); setMessage("");
    setInviting(true);
    try {
      await api.post(`/games/${currentGame.id}/members`, null, {
        params: { username: inviteUsername.trim(), role_in_game: inviteRole },
      });
      setInviteUsername("");
      setMessage(`Игрок «${inviteUsername}» добавлен в игру`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка приглашения");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (gameId: number, userId: number) => {
    if (!confirm("Удалить игрока из игры?")) return;
    setError("");
    try {
      await api.delete(`/games/${gameId}/members/${userId}`);
      setMessage("Игрок удалён из игры");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка удаления");
    }
  };

  if (!isGM) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-main/50">
        <ShieldCheck className="w-12 h-12 mb-2 opacity-30" />
        <h2 className="text-sm font-semibold">Доступ только для ведущего</h2>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "sent" || o.status === "under_review");

  const roleLabel = (r: string) => {
    switch (r) {
      case "owner": return "Ведущий";
      case "player": return "Игрок";
      case "observer": return "Наблюдатель";
      default: return r;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-accent" />
        <h1 className="text-2xl font-bold text-text-main">Панель ведущего</h1>
      </div>

      {message && (
        <div className="p-3 rounded bg-success/10 border border-success/30 text-success text-sm">{message}</div>
      )}
      {error && (
        <div className="p-3 rounded bg-error/10 border border-error/30 text-error text-sm">{error}</div>
      )}

      {/* Создать новую игру */}
      <div className="panel p-5 space-y-3">
        <h2 className="text-sm font-semibold text-accent">Создать новую игровую сессию</h2>
        <form onSubmit={handleCreateGame} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="input"
            placeholder="Название кампании"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Описание"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <input
            type="number"
            className="input"
            value={newYear}
            onChange={(e) => setNewYear(Number(e.target.value))}
          />
          <button type="submit" className="btn-primary flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Создать игру
          </button>
        </form>
        <label className="flex items-center gap-2 text-xs text-text-main/70 cursor-pointer">
          <input
            type="checkbox"
            checked={autoImportMap}
            onChange={(e) => setAutoImportMap(e.target.checked)}
          />
          Сразу импортировать страны и границы мира по указанному году сценария (напр. 1914, 1938, 1815, 2026)
        </label>
      </div>

      {loading && <div className="text-text-main/50">Загрузка...</div>}

      {/* Игровые сессии */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((g) => (
          <div
            key={g.id}
            className={`panel p-5 ${currentGame?.id === g.id ? "border-accent" : ""}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-semibold text-text-main">{g.title}</h3>
                <div className="text-xs text-text-main/50 mt-1">{g.description || "Без описания"}</div>
              </div>
              <span
                className={`text-[10px] px-2 py-1 rounded-full border uppercase font-bold ${
                  g.status === "active"
                    ? "border-success text-success"
                    : "border-[#4B91D1] text-[#4B91D1]"
                }`}
              >
                {g.status === "preparation" ? "Подготовка" : g.status === "active" ? "Активна" : g.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3 text-xs text-text-main/60">
              <div>
                <span className="text-text-main/40 block">Ход</span> {g.current_turn_number}
              </div>
              <div>
                <span className="text-text-main/40 block">Месяц</span> {g.current_month || "—"}
              </div>
              <div>
                <span className="text-text-main/40 block">Игроков</span> {g.max_players}
              </div>
              <div>
                <span className="text-text-main/40 block">Старт</span> {g.start_year}
              </div>
            </div>

            {/* Управление ходами */}
            <div className="mb-3 pt-3 border-t border-[#2a3b52] space-y-2">
              <div className="text-[11px] text-text-main/50">Управление ходами</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleTurnAction(g.id, "start")}
                  className="btn-ghost text-[10px] py-1.5 flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3" /> Начать ход
                </button>
                <button
                  onClick={() => handleTurnAction(g.id, "finish_review")}
                  className="btn-ghost text-[10px] py-1.5 flex items-center justify-center gap-1"
                >
                  <Clock className="w-3 h-3" /> На проверку
                </button>
                <button
                  onClick={() => handleTurnAction(g.id, "resolve")}
                  className="btn-ghost text-[10px] py-1.5 flex items-center justify-center gap-1 text-success"
                >
                  <Check className="w-3 h-3" /> Рассчитать
                </button>
                <button
                  onClick={() => handleTurnAction(g.id, "next")}
                  className="btn-ghost text-[10px] py-1.5 flex items-center justify-center gap-1 text-accent"
                >
                  <SkipForward className="w-3 h-3" /> След. ход
                </button>
              </div>
            </div>

            {/* Переходы */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setCurrentGame(g); navigate("/countries"); }}
                className="btn-ghost text-[10px] py-2 flex items-center justify-center gap-1"
              >
                <Building2 className="w-3 h-3" /> Страны
              </button>
              <button
                onClick={() => { setCurrentGame(g); navigate("/economy"); }}
                className="btn-ghost text-[10px] py-2 flex items-center justify-center gap-1"
              >
                <Wallet className="w-3 h-3" /> Экономика
              </button>
              <button
                onClick={() => { setCurrentGame(g); navigate("/news"); }}
                className="btn-ghost text-[10px] py-2 flex items-center justify-center gap-1"
              >
                <Activity className="w-3 h-3" /> События
              </button>
              <button
                onClick={() => { setCurrentGame(g); navigate("/history"); }}
                className="btn-ghost text-[10px] py-2 flex items-center justify-center gap-1"
              >
                <List className="w-3 h-3" /> История
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Управление игроками */}
      {currentGame && (
        <div className="panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-accent">
              Игроки — {currentGame.title}
            </h2>
          </div>

          {/* Список участников */}
          <div className="divide-y divide-[#1f2d3f]">
            {members.length === 0 ? (
              <div className="text-xs text-text-main/50 py-2">Нет участников</div>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
                      <Users className="w-3 h-3 text-accent" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-main">{m.username}</div>
                      <div className="text-xs text-text-main/50">{m.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      m.role_in_game === "owner"
                        ? "border-accent text-accent"
                        : "border-[#2a3b52] text-text-main/60"
                    }`}>
                      {roleLabel(m.role_in_game)}
                    </span>
                    {m.role_in_game !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(currentGame.id, m.user_id)}
                        className="btn-ghost p-1 text-error/70 hover:text-error"
                        title="Удалить из игры"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Форма приглашения */}
          <form onSubmit={handleInvite} className="flex gap-2 pt-2 border-t border-[#2a3b52]">
            <input
              className="input flex-1"
              placeholder="Имя пользователя (username)"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              required
            />
            <select
              className="input w-32"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="player">Игрок</option>
              <option value="observer">Наблюдатель</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="btn-primary flex items-center gap-1 whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              {inviting ? "..." : "Пригласить"}
            </button>
          </form>
        </div>
      )}

      {/* Очередь приказов */}
      <div className="panel p-5 space-y-3">
        <h2 className="text-sm font-semibold text-accent">
          Очередь приказов на рассмотрение ({pendingOrders.length})
        </h2>
        {pendingOrders.map((o) => (
          <div key={o.id} className="panel-2 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-text-main">{o.title}</div>
              <div className="text-xs text-text-main/60 mt-0.5">
                Категория: {o.category} • Страна #{o.country_id}
              </div>
              <div className="text-xs text-text-main/80 mt-1">{o.description}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleOrderDecision(o.id, "accepted")}
                className="btn-ghost text-xs text-success flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Принять
              </button>
              <button
                onClick={() => handleOrderDecision(o.id, "rejected")}
                className="btn-ghost text-xs text-error flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Отклонить
              </button>
            </div>
          </div>
        ))}
        {pendingOrders.length === 0 && (
          <div className="text-xs text-text-main/50">Нет приказов, ожидающих решения.</div>
        )}
      </div>
    </div>
  );
}
