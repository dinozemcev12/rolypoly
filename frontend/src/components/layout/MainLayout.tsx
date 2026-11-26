import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import TopBar from "./TopBar";
import LeftSidebar from "./LeftSidebar";
import RightPanel from "./RightPanel";
import { useAuthStore } from "@/store/useAuthStore";
import { useGameStore } from "@/store/useGameStore";
import { useGameWebSocket } from "@/hooks/useGameWebSocket";
import api from "@/api/api";

function WebSocketConnector() {
  const { currentGame } = useGameStore();
  useGameWebSocket(currentGame?.id);
  return null;
}

export default function MainLayout() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { currentGame, setGames, setCurrentGame, setNotifications } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get("/games/").then((res) => {
      const list = res.data || [];
      setGames(list);
      if (list.length > 0 && !currentGame) {
        setCurrentGame(list[0]);
      }
    }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !currentGame?.id) return;
    api.get(`/notifications/games/${currentGame.id}`)
      .then((res) => setNotifications(res.data || []))
      .catch(() => {});
  }, [isAuthenticated, currentGame?.id]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text-main">
      <WebSocketConnector />
      <TopBar user={user} onLogout={logout} />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-bg p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
        <RightPanel />
      </div>
    </div>
  );
}
