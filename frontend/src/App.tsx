import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import MainLayout from "@/components/layout/MainLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import GameDashboard from "@/pages/GameDashboard";
import MapPage from "@/pages/Map";
import CountriesPage from "@/pages/Countries";
import OrdersPage from "@/pages/Orders";
import EconomyPage from "@/pages/Economy";
import DiplomacyPage from "@/pages/Diplomacy";
import ConflictsPage from "@/pages/Conflicts";
import NewsPage from "@/pages/News";
import HistoryPage from "@/pages/History";
import GMPanel from "@/pages/GMPanel";
import ProfilePage from "@/pages/Profile";

const AuthGuard = ({ children }: { children: any }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<AuthGuard><MainLayout /></AuthGuard>}>
          <Route index element={<GameDashboard />} />
          <Route path="map" element={<MapPage />} />
          <Route path="countries" element={<CountriesPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="economy" element={<EconomyPage />} />
          <Route path="diplomacy" element={<DiplomacyPage />} />
          <Route path="conflicts" element={<ConflictsPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="gm-panel" element={<GMPanel />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
