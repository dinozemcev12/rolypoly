import { useEffect, useState } from "react";
import api from "@/api/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Users, Building2, Wallet, Clock, Activity, ShieldCheck, List } from "lucide-react";

export default function GMPanel() {
  const { user } = useAuthStore();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isGM = user?.role === "gm" || user?.role === "admin";

  useEffect(() => {
    if (!isGM) return;
    load();
  }, [isGM]);

  const load = async () => {
    try {
      const res = await api.get("/games/");
      setGames(res.data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-accent" />
        <h1 className="text-2xl font-bold text-text-main">Панель ведущего</h1>
      </div>
      {loading && <div className="text-text-main/50">Загрузка...</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((g) => (
          <div key={g.id} className="panel p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-semibold text-text-main">{g.title}</h3>
                <div className="text-xs text-text-main/50 mt-1">{g.description || "Без описания"}</div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full border uppercase font-bold ${g.status === "active" ? "border-success text-success" : "border-[#4B91D1] text-[#4B91D1]"}`}>
                {g.status === "preparation" ? "Подготовка" : g.status === "active" ? "Активна" : g.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3 text-xs text-text-main/60">
              <div><span className="text-text-main/40 block">Ход</span> {g.current_turn_number}</div>
              <div><span className="text-text-main/40 block">Месяц</span> {g.current_month || "—"}</div>
              <div><span className="text-text-main/40 block">Игроков</span> {g.max_players}</div>
              <div><span className="text-text-main/40 block">Начат</span> {g.start_year}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost text-[10px] py-2 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Игроки
              </button>
              <button className="btn-ghost text-[10px] py-2 flex items-center justify-center gap-1">
                <Building2 className="w-3 h-3" /> Страны
              </button>
              <button className="btn-ghost text-[10px] py-2 flex items-center justify-center gap-1">
                <Wallet className="w-3 h-3" /> Экономика
              </button>
              <button className="btn-ghost text-[10px] py-2 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Ходы
              </button>
              <button className="btn-ghost text-[10px] py-2 flex items-center justify-center gap-1">
                <Activity className="w-3 h-3" /> События
              </button>
              <button className="btn-ghost text-[10px] py-2 flex items-center justify-center gap-1">
                <List className="w-3 h-3" /> История
              </button>
            </div>
          </div>
        ))}
        {games.length === 0 && (
          <div className="lg:col-span-3 panel p-8 text-center">
            <p className="text-text-main/50 text-sm">Игровых сессий нет. Создайте первую игру.</p>
          </div>
        )}
      </div>
    </div>
  );
}
