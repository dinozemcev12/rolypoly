import { useEffect, useState } from "react";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Plus, Edit2, MapPin, X, Upload } from "lucide-react";
import type { Country, GameMember } from "@/types";

export default function CountriesPage() {
  const { currentGame, setCurrentGame, setCountries, countries, setSelectedCountry, selectedCountry } = useGameStore();
  const { user } = useAuthStore();
  const [members, setMembers] = useState<GameMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Country | null>(null);

  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#4B91D1");
  const [formTreasury, setFormTreasury] = useState(1000);
  const [formIncome, setFormIncome] = useState(200);
  const [formExpenses, setFormExpenses] = useState(100);
  const [formPop, setFormPop] = useState(5000000);
  const [formOwnerId, setFormOwnerId] = useState<string>("");
  const [formFlagUrl, setFormFlagUrl] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/games/");
      const games = res.data;
      if (!games.length) {
        setLoading(false);
        return;
      }
      const game = currentGame ? games.find((g: any) => g.id === currentGame.id) || games[0] : games[0];
      if (!currentGame) setCurrentGame(game);
      const [cRes, mRes] = await Promise.all([
        api.get(`/countries/games/${game.id}`),
        api.get(`/games/${game.id}/members`).catch(() => ({ data: [] })),
      ]);
      setCountries(cRes.data);
      setMembers(mRes.data || []);
    } catch {
      setError("Не удалось загрузить государства");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentGame?.id]);

  const isGM = user?.role === "gm" || user?.role === "admin";

  const handleFlagUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/uploads/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFormFlagUrl(res.data.url);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка загрузки флага");
    } finally {
      e.target.value = "";
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGame) return;
    setError("");
    try {
      await api.post(`/countries/games/${currentGame.id}`, {
        name: formName,
        color: formColor,
        treasury: formTreasury,
        income: formIncome,
        expenses: formExpenses,
        population: formPop,
        owner_user_id: formOwnerId ? Number(formOwnerId) : null,
        flag_url: formFlagUrl || null,
      });
      setShowCreate(false);
      setFormName("");
      setFormFlagUrl("");
      setFormOwnerId("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось создать государство");
    }
  };

  const openEdit = (c: Country) => {
    setEditing(c);
    setShowCreate(false);
    setFormName(c.name);
    setFormColor(c.color);
    setFormTreasury(c.treasury);
    setFormIncome(c.income);
    setFormExpenses(c.expenses);
    setFormPop(c.population);
    setFormOwnerId(c.owner_user_id ? String(c.owner_user_id) : "");
    setFormFlagUrl(c.flag_url || "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError("");
    try {
      await api.patch(`/countries/${editing.id}`, {
        name: formName,
        color: formColor,
        treasury: formTreasury,
        income: formIncome,
        expenses: formExpenses,
        population: formPop,
        owner_user_id: formOwnerId ? Number(formOwnerId) : null,
        flag_url: formFlagUrl || null,
      });
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось обновить государство");
    }
  };

  const getOwnerLabel = (ownerId?: number) => {
    if (!ownerId) return "—";
    const m = members.find((x) => x.user_id === ownerId);
    return m ? m.username : `#${ownerId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Государства</h1>
          <p className="text-text-main/60 text-sm">
            Управление государствами, игроками-владельцами и их параметрами.
          </p>
        </div>
        {isGM && (
          <button
            onClick={() => {
              setEditing(null);
              setFormName("");
              setFormOwnerId("");
              setFormFlagUrl("");
              setShowCreate(!showCreate);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Новое государство
          </button>
        )}
      </div>

      {loading && <div className="text-text-main/50 text-sm">Загрузка...</div>}

      {error && (
        <div className="p-3 rounded bg-error/10 text-error text-sm border border-error/20">{error}</div>
      )}

      {(showCreate || editing) && isGM && (
        <div className="panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-accent">
              {editing ? `Редактирование: ${editing.name}` : "Новое государство"}
            </h2>
            <button
              onClick={() => {
                setShowCreate(false);
                setEditing(null);
              }}
              className="text-text-main/50 hover:text-text-main"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={editing ? handleUpdate : handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="input"
              placeholder="Название государства"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                className="h-9 w-12 bg-transparent border border-[#2a3b52] rounded cursor-pointer"
              />
              <input
                className="input"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                placeholder="#4B91D1"
              />
            </div>
            <select
              className="input"
              value={formOwnerId}
              onChange={(e) => setFormOwnerId(e.target.value)}
            >
              <option value="">Без игрока (NPC / Ведущий)</option>
              {members.map((m) => (
                <option key={m.user_id} value={String(m.user_id)}>
                  {m.username} ({m.role_in_game})
                </option>
              ))}
            </select>
            <input
              type="number"
              className="input"
              value={formPop}
              onChange={(e) => setFormPop(Number(e.target.value))}
              placeholder="Население"
            />
            <input
              type="number"
              className="input"
              value={formTreasury}
              onChange={(e) => setFormTreasury(Number(e.target.value))}
              placeholder="Казна"
            />
            <input
              type="number"
              className="input"
              value={formIncome}
              onChange={(e) => setFormIncome(Number(e.target.value))}
              placeholder="Доход"
            />
            <input
              type="number"
              className="input"
              value={formExpenses}
              onChange={(e) => setFormExpenses(Number(e.target.value))}
              placeholder="Расходы"
            />
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                className="input flex-1"
                placeholder="URL флага или загрузите файл"
                value={formFlagUrl}
                onChange={(e) => setFormFlagUrl(e.target.value)}
              />
              <label className="btn-ghost cursor-pointer flex items-center gap-1.5 text-xs whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" /> Флаг
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.webp"
                  onChange={handleFlagUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="btn-primary">
                {editing ? "Сохранить изменения" : "Создать государство"}
              </button>
            </div>
          </form>
        </div>
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
                      {c.flag_url ? (
                        <img src={c.flag_url} alt="" className="w-5 h-3.5 object-cover rounded-sm border border-[#2a3b52]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      )}
                      <span className="text-text-main">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-main/70 text-sm">{c.color}</td>
                  <td className="px-4 py-3 text-text-main/70 text-sm">{c.population.toLocaleString("ru-RU")}</td>
                  <td className="px-4 py-3 text-text-main/70 text-sm">{c.treasury.toLocaleString("ru-RU")}</td>
                  <td className="px-4 py-3 text-text-main/70 text-sm">{c.gdp.toLocaleString("ru-RU")}</td>
                  <td className="px-4 py-3 text-text-main/70 text-sm">
                    {getOwnerLabel(c.owner_user_id)}
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
                          onClick={() => openEdit(c)}
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
                  <td colSpan={7} className="px-4 py-6 text-center text-text-main/50">
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
          <div className="flex items-center gap-3 mb-3">
            {selectedCountry.flag_url && (
              <img src={selectedCountry.flag_url} alt="" className="w-8 h-5 object-cover rounded border border-[#2a3b52]" />
            )}
            <h3 className="text-sm font-semibold text-accent">Выбрано: {selectedCountry.name}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-text-main/50">Казна:</span> {selectedCountry.treasury.toLocaleString("ru-RU")}</div>
            <div><span className="text-text-main/50">Доходы:</span> {selectedCountry.income.toLocaleString("ru-RU")}</div>
            <div><span className="text-text-main/50">Расходы:</span> {selectedCountry.expenses.toLocaleString("ru-RU")}</div>
            <div><span className="text-text-main/50">Инфляция:</span> {selectedCountry.inflation}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
