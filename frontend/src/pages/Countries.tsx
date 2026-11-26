import { useEffect, useState } from "react";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Building2, Plus, Edit2, MapPin, Users } from "lucide-react";
import type { Country } from "@/types";

export default function CountriesPage() {
  const { setCountries, countries, setSelectedCountry, selectedCountry } = useGameStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await api.get("/games/");
      const games = res.data;
      if (!games.length) {
        setLoading(false);
        return;
      }
      const game = games[0];
      const cRes = await api.get(`/countries/games/${game.id}`);
      setCountries(cRes.data);
    } catch (e: any) {
      setError("Не удалось загрузить государства");
    } finally {
      setLoading(false);
    }
  };

  const isGM = user?.role === "gm" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Государства</h1>
          <p className="text-text-main/60 text-sm">
            Управление государствами и их параметрами.
          </p>
        </div>
        {isGM && (
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Новое государство
          </button>
        )}
      </div>

      {loading && <div className="text-text-main/50 text-sm">Загрузка...</div>}

      {error && (
        <div className="p-3 rounded bg-error/10 text-error text-sm border border-error/20">{error}</div>
      )}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2a3b52]">
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Название</th>
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Цвет</th>
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Население</th>
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Казна</th>
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">ВВП</th>
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Владелец</th>
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c: Country) => (
                <tr
                  key={c.id}
                  className="border-b border-[#1f2d3f] hover:bg-[#1a2436]/50 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-text-main">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-main/70 text-sm">{c.color}</td>
                  <td className="px-4 py-3 text-text-main/70 text-sm">
                    {c.population.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-text-main/70 text-sm">
                    {c.treasury.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-text-main/70 text-sm">
                    {c.gdp.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-text-main/70 text-sm">
                    {c.owner_user_id ? `#${c.owner_user_id}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedCountry(c)}
                        className="btn-ghost text-[10px] py-1.5 px-2"
                        title="Выбрать"
                      >
                        <MapPin className="w-3 h-3" />
                      </button>
                      {isGM && (
                        <button
                          className="btn-ghost text-[10px] py-1.5 px-2 text-accent hover:text-[#3a7ab8]"
                          title="Редактировать"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {countries.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-text-main/50">
                    Государства не найдены. Ведущий может создать новое государство.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCountry && (
        <div className="panel p-4">
          <h3 className="text-sm font-semibold text-accent mb-3">Выбрано: {selectedCountry.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-text-main/50">Казна:</span> {selectedCountry.treasury.toLocaleString()}</div>
            <div><span className="text-text-main/50">Доходы:</span> {selectedCountry.income.toLocaleString()}</div>
            <div><span className="text-text-main/50">Расходы:</span> {selectedCountry.expenses.toLocaleString()}</div>
            <div><span className="text-text-main/50">Инфляция:</span> {selectedCountry.inflation}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
