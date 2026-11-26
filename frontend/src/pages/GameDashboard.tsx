import { useEffect } from "react";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { Compass, Building2, PieChart, Send, Activity, Clock } from "lucide-react";
import { Users } from "lucide-react";

export default function GameDashboard() {
  const { setCurrentGame, setCountries } = useGameStore();

  useEffect(() => {
    const load = async () => {
      try {
        const gamesRes = await api.get("/games/");
        const games = gamesRes.data;
        if (games.length > 0) {
          const g = games[0];
          setCurrentGame(g);
          const cRes = await api.get(`/countries/games/${g.id}`);
          setCountries(cRes.data);
        }
      } catch (e) {
        // ignore
      }
    };
    load();
  }, []);

  const stats = [
    { label: "Игроков", value: "4", icon: Users },
    { label: "Государств", value: "4", icon: Building2 },
    { label: "Ход", value: "1", icon: Clock },
    { label: "Приказов", value: "0", icon: Send },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Обзор игры</h1>
        <p className="text-text-main/60 text-sm">
          Управление государством, экономикой и дипломатией.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="panel-2 p-4">
            <div className="text-xs text-text-main/50 mb-1">{s.label}</div>
            <div className="text-2xl font-bold text-accent">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="panel p-6">
        <h3 className="text-sm font-semibold text-accent mb-4">Быстрый старт</h3>
        <p className="text-text-main/70 text-sm mb-4">
          Используйте левую панель для навигации: карта, государства, экономика,
          приказы и история. Ведущий управляет игрой через панель ведущего.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button className="btn-ghost flex items-center gap-2">
            <Compass className="w-4 h-4" /> Обзор
          </button>
          <button className="btn-ghost flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Государства
          </button>
          <button className="btn-ghost flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Экономика
          </button>
        </div>
      </div>
    </div>
  );
}
