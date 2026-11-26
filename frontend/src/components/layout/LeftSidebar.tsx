import { useNavigate } from "react-router-dom";
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
  List,
} from "lucide-react";

interface LeftSidebarProps {
  currentGameId?: number | undefined;
}

const navItems = [
  { key: "overview", label: "Обзор", icon: Compass, to: "/" },
  { key: "map", label: "Карта", icon: Globe, to: "/map" },
  { key: "countries", label: "Государства", icon: Building2, to: "/countries" },
  { key: "economy", label: "Экономика", icon: PieChart, to: "/economy" },
  { key: "orders", label: "Приказы", icon: Send, to: "/orders" },
  { key: "diplomacy", label: "Дипломатия", icon: Users, to: "/diplomacy" },
  { key: "conflicts", label: "Конфликты", icon: ShieldAlert, to: "/conflicts" },
  { key: "news", label: "Новости", icon: Activity, to: "/news" },
  { key: "history", label: "История", icon: History, to: "/history" },
];

export default function LeftSidebar({ currentGameId }: LeftSidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="w-64 shrink-0 bg-panel border-r border-[#2a3b52] flex flex-col z-20">
      <div className="p-4 border-b border-[#2a3b52]">
        <div className="text-xs text-text-main/50 uppercase tracking-wider mb-3">Игра</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-sm font-medium text-text-main">Сессия активна</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => navigate(item.to)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
              typeof window !== "undefined" &&
              window.location.pathname === item.to
                ? "bg-accent/10 text-accent border-r-2 border-accent"
                : "text-text-main/70 hover:bg-panel-2 hover:text-text-main"
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-[#2a3b52]">
        <button
          onClick={() => navigate("/gm-panel")}
          className="w-full flex items-center gap-2 px-3 py-2 bg-[#1a2436] hover:bg-[#223048] border border-[#2a3b52] rounded text-sm text-text-main transition-colors"
          title="Панель ведущего"
        >
          <Settings className="w-4 h-4" /> Ведущий
        </button>
      </div>
    </aside>
  );
}
