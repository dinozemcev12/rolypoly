import { useNavigate } from "react-router-dom";
import { User as UserType } from "@/types";
import { LogOut, Globe, HelpCircle, Bell } from "lucide-react";

interface TopBarProps {
  user: UserType | null;
  onLogout: () => void;
}

export default function TopBar({ user, onLogout }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="bg-panel border-b border-[#2a3b52] h-14 flex items-center justify-between px-4 shrink-0 z-20">
      <div className="flex items-center gap-3">
        <Globe className="w-5 h-5 text-accent" />
        <span className="font-bold text-lg tracking-tight">RolyPoly</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate("/map")}
          className="btn-ghost flex items-center gap-2"
          title="Карта"
        >
          <Globe className="w-4 h-4" /> Карта
        </button>
        <button
          onClick={() => navigate("/countries")}
          className="btn-ghost flex items-center gap-2"
          title="Государства"
        >
          Estados
        </button>
        <Bell className="w-5 h-5 text-text-main/70 ml-2" title="Уведомления" />
        <div className="w-px h-4 bg-[#2a3b52] mx-2" />
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-text-main/70">{user?.username}</span>
          <span className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent rounded">
            {user?.role === "gm" ? "Ведущий" : user?.role === "admin" ? "Админ" : "Игрок"}
          </span>
          <button
            onClick={onLogout}
            className="btn-ghost ml-2"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
