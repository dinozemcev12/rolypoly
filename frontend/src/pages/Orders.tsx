import { useEffect, useState } from "react";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { Order } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  sent: "#4B91D1",
  under_review: "#D6A34C",
  accepted: "#3EAC83",
  rejected: "#D65C65",
  executed: "#3EAC83",
  cancelled: "#64748b",
};

export default function OrdersPage() {
  const { currentGame, countries, orders, setCurrentGame, setCountries, setOrders } = useGameStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState<{ title: string; category: string; description: string; country_id: number }>({
    title: "", category: "экономика", description: "", country_id: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [currentGame?.id]);

  const load = async () => {
    try {
      const res = await api.get("/games/");
      const games = res.data;
      if (!games.length) { setLoading(false); return; }
      const game = currentGame ? games.find((g: any) => g.id === currentGame.id) || games[0] : games[0];
      if (!currentGame) setCurrentGame(game);
      const [oRes, cRes] = await Promise.all([
        api.get(`/orders/games/${game.id}`),
        countries.length > 0 ? Promise.resolve({ data: countries }) : api.get(`/countries/games/${game.id}`),
      ]);
      setOrders(oRes.data);
      if (countries.length === 0) setCountries(cRes.data);
      const cs = cRes.data as any[];
      if (cs.length && user) {
        const own = cs.find((c: any) => c.owner_user_id === user.id);
        const targetCountryId = own ? own.id : isGM ? cs[0].id : 0;
        if (targetCountryId) {
          setNewOrder((s) => ({ ...s, country_id: s.country_id || targetCountryId }));
        }
      }
    } catch {
      setError("Не удалось загрузить приказы");
    } finally {
      setLoading(false);
    }
  };

  const isGM = user?.role === "gm" || user?.role === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/orders/", newOrder);
      setNewOrder({ title: "", category: "экономика", description: "", country_id: newOrder.country_id });
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка создания приказа");
    }
  };

  const handleDecision = async (order: Order, status: string) => {
    try {
      await api.post(`/orders/${order.id}/decision`, { status, gm_comment: "" });
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка решения");
    }
  };

  const handleSend = async (order: Order) => {
    try {
      await api.post(`/orders/${order.id}/send`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка отправки");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Приказы</h1>
          <p className="text-text-main/60 text-sm">
            Создание и управление игровыми приказами.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-error/10 text-error text-sm border border-error/20">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Форма создания приказа */}
        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-accent mb-4">Новый приказ</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            {isGM && countries.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-text-main/70">Государство</label>
                <select
                  className="input"
                  value={newOrder.country_id}
                  onChange={(e) => setNewOrder({ ...newOrder, country_id: Number(e.target.value) })}
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs text-text-main/70">Название</label>
              <input
                className="input"
                value={newOrder.title}
                onChange={(e) => setNewOrder({ ...newOrder, title: e.target.value })}
                placeholder="Например: Повысить налоги"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-text-main/70">Категория</label>
              <select
                className="input"
                value={newOrder.category}
                onChange={(e) => setNewOrder({ ...newOrder, category: e.target.value })}
              >
                <option value="экономика">Экономика</option>
                <option value="дипломатия">Дипломатия</option>
                <option value="внутренняя политика">Внутренняя политика</option>
                <option value="инфраструктура">Инфраструктура</option>
                <option value="международные отношения">Международные отношения</option>
                <option value="другое">Другое</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-text-main/70">Описание</label>
              <textarea
                className="input"
                rows={3}
                value={newOrder.description}
                onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Создать черновик"}
            </button>
          </form>
        </div>

        {/* Список приказов */}
        <div className="panel flex flex-col">
          <div className="p-4 border-b border-[#2a3b52]">
            <h3 className="text-sm font-semibold text-text-main">Список приказов</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-text-main/50"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" /> Загрузка...</div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center text-text-main/50">Приказов нет</div>
            ) : (
              <div className="divide-y divide-[#2a3b52]">
                {orders.map((o: Order) => (
                  <div key={o.id} className="p-4 hover:bg-[#1a2436]/40 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-text-main">{o.title}</span>
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold border`}
                        style={{
                          borderColor: STATUS_COLORS[o.status] || "#94a3b8",
                          color: STATUS_COLORS[o.status] || "#94a3b8",
                        }}
                      >
                        {o.status}
                      </span>
                    </div>
                    <div className="text-xs text-text-main/60 mb-2">{o.description}</div>
                    <div className="flex items-center gap-3 text-xs text-text-main/50">
                      <span>Категория: {o.category}</span>
                      <span>•</span>
                      <span>Отправитель: #{o.sender_user_id}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {!isGM && o.status === "draft" && (
                        <button onClick={() => handleSend(o)} className="btn-ghost text-xs">
                          <Send className="w-3 h-3 mr-1" /> Отправить
                        </button>
                      )}
                      {isGM && o.status === "sent" && (
                        <>
                          <button onClick={() => handleDecision(o, "accepted")} className="btn-ghost text-xs text-success">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Принять
                          </button>
                          <button onClick={() => handleDecision(o, "rejected")} className="btn-ghost text-xs text-error">
                            <XCircle className="w-3 h-3 mr-1" /> Отклонить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
