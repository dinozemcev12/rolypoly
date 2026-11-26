import { useLocation, useNavigate } from "react-router-dom";
import {
  Compass,
  Globe,
  Building2,
  PieChart,
  Send,
  ShieldAlert,
  Activity,
  History,
  Users,
  Settings,
} from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { useI18n, type TranslationKey } from "@/i18n";

const navItems: { key: string; labelKey: TranslationKey; icon: any; to: string }[] = [
  { key: "overview", labelKey: "nav_overview", icon: Compass, to: "/" },
  { key: "map", labelKey: "nav_map", icon: Globe, to: "/map" },
  { key: "countries", labelKey: "nav_countries", icon: Building2, to: "/countries" },
  { key: "economy", labelKey: "nav_economy", icon: PieChart, to: "/economy" },
  { key: "orders", labelKey: "nav_orders", icon: Send, to: "/orders" },
  { key: "diplomacy", labelKey: "nav_diplomacy", icon: Users, to: "/diplomacy" },
  { key: "conflicts", labelKey: "nav_conflicts", icon: ShieldAlert, to: "/conflicts" },
  { key: "news", labelKey: "nav_news", icon: Activity, to: "/news" },
  { key: "history", labelKey: "nav_history", icon: History, to: "/history" },
];

export default function LeftSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { games, currentGame, setCurrentGame } = useGameStore();
  const { t } = useI18n();

  return (
    <aside className="w-60 shrink-0 bg-panel border-r border-[#2a3b52] flex flex-col z-20">
      <div className="p-4 border-b border-[#2a3b52]">
        <div className="text-xs text-text-main/50 uppercase tracking-wider mb-2">Игра</div>
        {games.length > 1 ? (
          <select
            className="input text-xs py-1.5"
            value={currentGame?.id ?? ""}
            onChange={(e) => {
              const found = games.find((g) => g.id === Number(e.target.value));
              if (found) setCurrentGame(found);
            }}
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${currentGame ? "bg-success" : "bg-warning"}`} />
            <span className="text-sm font-medium text-text-main truncate">
              {currentGame ? currentGame.title : "Нет активной игры"}
            </span>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.to)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                active
                  ? "bg-accent/10 text-accent border-r-2 border-accent"
                  : "text-text-main/70 hover:bg-panel-2 hover:text-text-main"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {t(item.labelKey)}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[#2a3b52]">
        <button
          onClick={() => navigate("/gm-panel")}
          className="w-full flex items-center gap-2 px-3 py-2 bg-[#1a2436] hover:bg-[#223048] border border-[#2a3b52] rounded text-sm text-text-main transition-colors"
          title="Панель ведущего"
        >
          <Settings className="w-4 h-4" /> {t("nav_gm")}
        </button>
      </div>
    </aside>
  );
}
