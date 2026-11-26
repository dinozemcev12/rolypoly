import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import TopBar from "./TopBar";
import LeftSidebar from "./LeftSidebar";
import RightPanel from "./RightPanel";
import { useAuthStore } from "@/store/useAuthStore";
import { useGameStore } from "@/store/useGameStore";

export default function MainLayout() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { setCurrentGame } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text-main">
      <TopBar user={user} onLogout={logout} />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar currentGameId={user ? undefined : undefined} />
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
