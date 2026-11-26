import { useNavigate } from "react-router-dom";
import { User as UserType } from "@/types";
import { LogOut, Globe, Bell, User } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { useState, useRef, useEffect } from "react";
import api from "@/api/api";
import { useI18n } from "@/i18n";

interface TopBarProps {
  user: UserType | null;
  onLogout: () => void;
}

export default function TopBar({ user, onLogout }: TopBarProps) {
  const navigate = useNavigate();
  const { currentGame, notifications, markNotificationRead } = useGameStore();
  const { locale, setLocale, t } = useI18n();
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.is_read).length;

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      markNotificationRead(id);
    } catch {}
  };

  return (
    <header className="bg-panel border-b border-[#2a3b52] h-14 flex items-center justify-between px-4 shrink-0 z-20">
      <div className="flex items-center gap-3">
        <Globe className="w-5 h-5 text-accent" />
        <span className="font-bold text-lg tracking-tight">RolyPoly</span>
        {currentGame && (
          <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-[#2a3b52] text-xs">
            <span className="text-text-main font-medium">{currentGame.title}</span>
            <span className="px-2 py-0.5 rounded bg-panel-2 text-accent font-mono">
              {t("turn")} {currentGame.current_turn_number} · {currentGame.current_month || `${currentGame.start_year}-01`}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate("/map")}
          className="btn-ghost hidden sm:flex items-center gap-2"
          title={t("nav_map")}
        >
          <Globe className="w-4 h-4" /> {t("nav_map")}
        </button>
        <button
          onClick={() => navigate("/countries")}
          className="btn-ghost hidden sm:flex items-center gap-2"
          title={t("nav_countries")}
        >
          {t("nav_countries")}
        </button>
        <button
          onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
          className="btn-ghost text-[11px] font-mono px-2 py-1"
          title="Язык / Language"
        >
          {locale.toUpperCase()}
        </button>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif((v) => !v)}
            className="btn-ghost p-2 relative"
            title="Уведомления"
          >
            <Bell className="w-4 h-4 text-text-main/70" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-error rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-panel border border-[#2a3b52] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-[#2a3b52] flex items-center justify-between">
                <span className="text-sm font-semibold text-text-main">Уведомления</span>
                {unread > 0 && (
                  <span className="text-xs text-text-main/50">{unread} непрочитанных</span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-text-main/50">
                    Нет уведомлений
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 border-b border-[#1f2d3f] hover:bg-panel-2 transition-colors cursor-pointer ${
                        !n.is_read ? "border-l-2 border-l-accent" : ""
                      }`}
                      onClick={() => handleMarkRead(n.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-medium text-text-main">{n.title}</div>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-0.5" />
                        )}
                      </div>
                      <div className="text-xs text-text-main/60 mt-0.5">{n.text}</div>
                      <div className="text-[10px] text-text-main/40 mt-1">
                        {new Date(n.created_at).toLocaleString("ru-RU")}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="p-2 border-t border-[#2a3b52]">
                  <button
                    className="w-full text-xs text-accent hover:text-accent/80 py-1"
                    onClick={() => { setShowNotif(false); navigate("/history"); }}
                  >
                    Смотреть все в журнале →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-[#2a3b52] mx-2" />

        <div className="flex items-center gap-2 px-2">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Профиль"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                <User className="w-3 h-3 text-accent" />
              </div>
            )}
            <span className="text-xs text-text-main/70 hidden sm:block">{user?.username}</span>
          </button>
          <span className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent rounded">
            {user?.role === "gm" ? t("role_gm") : user?.role === "admin" ? t("role_admin") : t("role_player")}
          </span>
          <button
            onClick={onLogout}
            className="btn-ghost ml-1"
            title={t("logout")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
