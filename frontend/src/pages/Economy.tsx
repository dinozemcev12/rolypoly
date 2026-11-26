import { useEffect, useState } from "react";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Wallet, Plus, TrendingUp, TrendingDown } from "lucide-react";
import type { Country } from "@/types";
import type { Transaction } from "@/types";

export default function EconomyPage() {
  const { countries, transactions, setTransactions } = useGameStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTx, setNewTx] = useState<{ country_id: number; amount: number; type: "income" | "expense" | "adjustment"; reason: string; date: string }>({
    country_id: 0, amount: 0, type: "income", reason: "", date: new Date().toISOString().slice(0, 16),
  });
  const isGM = user?.role === "gm" || user?.role === "admin";

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const gRes = await api.get("/games/");
      const games = gRes.data;
      if (!games.length) { setLoading(false); return; }
      const game = games[0];
      const cRes = await api.get(`/countries/games/${game.id}`);
      const cs = cRes.data;
      // setCountries(cs) handled elsewhere
      const tRes = await api.get(`/transactions/games/${game.id}`);
      setTransactions(tRes.data);
      if (cs.length && user && isGM) {
        setNewTx((s) => ({ ...s, country_id: cs[0].id }));
      }
    } catch (e: any) {
      setError("Не удалось загрузить экономику");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/transactions/", newTx);
      setNewTx({ ...newTx, amount: 0, reason: "" });
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка операции");
    }
  };

  const ownCountry = (countries as Country[]).find((c) => c.owner_user_id === user?.id);
  const treasury = ownCountry?.treasury ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Экономика</h1>
          <p className="text-text-main/60 text-sm">Казна, доходы, расходы и финансовые операции.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-error/10 text-error text-sm border border-error/20">{error}</div>
      )}

      {/* Ключевые показатели */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="panel-2 p-4">
          <div className="text-xs text-text-main/50 mb-1">Казна</div>
          <div className="text-2xl font-bold text-accent">{treasury.toLocaleString()}</div>
        </div>
        <div className="panel-2 p-4">
          <div className="text-xs text-text-main/50 mb-1">Доходы</div>
          <div className="text-2xl font-bold text-success">{ownCountry?.income?.toLocaleString() ?? 0}</div>
        </div>
        <div className="panel-2 p-4">
          <div className="text-xs text-text-main/50 mb-1">Расходы</div>
          <div className="text-2xl font-bold text-error">{ownCountry?.expenses?.toLocaleString() ?? 0}</div>
        </div>
        <div className="panel-2 p-4">
          <div className="text-xs text-text-main/50 mb-1">Баланс следующего хода</div>
          <div className="text-2xl font-bold text-text-main">
            {(treasury + (ownCountry?.income ?? 0) - (ownCountry?.expenses ?? 0)).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Форма операции */}
        {isGM && (
          <div className="panel p-5">
            <h3 className="text-sm font-semibold text-accent mb-4">Финансовая операция</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-text-main/70">Государство</label>
                <select
                  className="input"
                  value={newTx.country_id}
                  onChange={(e) => setNewTx({ ...newTx, country_id: Number(e.target.value) })}
                >
                  {(countries as Country[]).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-text-main/70">Тип</label>
                <select
                  className="input"
                  value={newTx.type}
                  onChange={(e) => setNewTx({ ...newTx, type: e.target.value as any })}
                >
                  <option value="income">Доход (+)</option>
                  <option value="expense">Расход (−)</option>
                  <option value="adjustment">Корректировка</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-text-main/70">Сумма</label>
                <input
                  className="input"
                  type="number"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-text-main/70">Причина</label>
                <input
                  className="input"
                  value={newTx.reason}
                  onChange={(e) => setNewTx({ ...newTx, reason: e.target.value })}
                  placeholder="Например: Налоговые поступления"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Plus className="w-4 h-4 mr-2 animate-spin" /> : "Применить"}
              </button>
            </form>
          </div>
        )}

        {/* История операций */}
        <div className="panel flex flex-col lg:col-span-2">
          <div className="p-4 border-b border-[#2a3b52]">
            <h3 className="text-sm font-semibold text-text-main flex items-center gap-2">
              <Wallet className="w-4 h-4 text-accent" /> История операций
            </h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-text-main/50">Загрузка...</div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center text-text-main/50">Операций нет</div>
            ) : (
              <div className="divide-y divide-[#2a3b52]">
                {(transactions as Transaction[]).map((t) => (
                  <div key={t.id} className="p-4 flex justify-between items-start hover:bg-[#1a2436]/40 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-text-main">{t.reason}</div>
                      <div className="text-xs text-text-main/50">
                        {t.type === "income" ? <TrendingUp className="w-3 h-3 inline text-success mr-1" /> : <TrendingDown className="w-3 h-3 inline text-error mr-1" />}
                        {t.amount > 0 ? "+" : ""}{t.amount} • {new Date(t.date).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                    <span className={`font-mono text-sm ${t.amount > 0 ? "text-success" : "text-error"}`}>
                      {t.amount > 0 ? "+" : ""}{t.amount}
                    </span>
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
