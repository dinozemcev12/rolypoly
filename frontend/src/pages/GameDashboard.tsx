import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { Compass, Building2, PieChart, Send, Clock, Users, Globe } from "lucide-react";

export default function GameDashboard() {
  const { currentGame, countries, orders, setCurrentGame, setCountries, setOrders } = useGameStore();
  const [membersCount, setMembersCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const gamesRes = await api.get("/games/");
        const games = gamesRes.data;
        if (games.length > 0) {
          const g = currentGame ? games.find((x: any) => x.id === currentGame.id) || games[0] : games[0];
          if (!currentGame) setCurrentGame(g);
          const [cRes, oRes, mRes] = await Promise.all([
            api.get(`/countries/games/${g.id}`),
            api.get(`/orders/games/${g.id}`),
            api.get(`/games/${g.id}/members`),
          ]);
          setCountries(cRes.data);
          setOrders(oRes.data);
          setMembersCount(mRes.data.length);
        }
      } catch {
        // ignore
      }
    };
    load();
  }, [currentGame?.id]);

  const stats = [
    { label: "Игроков", value: String(membersCount), icon: Users },
    { label: "Государств", value: String(countries.length), icon: Building2 },
    { label: "Ход", value: String(currentGame?.current_turn_number ?? 0), icon: Clock },
    { label: "Приказов", value: String(orders.length), icon: Send },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">
          {currentGame ? currentGame.title : "Обзор игры"}
        </h1>
        <p className="text-text-main/60 text-sm">
          {currentGame?.description || "Управление государством, экономикой и дипломатией."}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="panel-2 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-text-main/50 mb-1">{s.label}</div>
              <div className="text-2xl font-bold text-accent">{s.value}</div>
            </div>
            <s.icon className="w-6 h-6 text-accent/40" />
          </div>
        ))}
      </div>
      <div className="panel p-6">
        <h3 className="text-sm font-semibold text-accent mb-4">Быстрый старт</h3>
        <p className="text-text-main/70 text-sm mb-4">
          Используйте левую панель или кнопки ниже для перехода к интерактивной карте, государствам, экономике и приказам.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <button onClick={() => navigate("/map")} className="btn-ghost flex items-center justify-center gap-2">
            <Globe className="w-4 h-4" /> Карта
          </button>
          <button onClick={() => navigate("/countries")} className="btn-ghost flex items-center justify-center gap-2">
            <Building2 className="w-4 h-4" /> Государства
          </button>
          <button onClick={() => navigate("/economy")} className="btn-ghost flex items-center justify-center gap-2">
            <PieChart className="w-4 h-4" /> Экономика
          </button>
          <button onClick={() => navigate("/orders")} className="btn-ghost flex items-center justify-center gap-2">
            <Compass className="w-4 h-4" /> Приказы
          </button>
        </div>
      </div>
    </div>
  );
}
