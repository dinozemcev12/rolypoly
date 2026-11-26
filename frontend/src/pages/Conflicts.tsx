import { useEffect, useState } from "react";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ShieldAlert, Plus } from "lucide-react";

interface Conflict {
  id: number;
  game_id: number;
  title: string;
  description: string;
  causes?: string;
  goals?: string;
  status: string;
  participant_country_ids?: number[];
  results?: string;
  created_at: string;
}

export default function ConflictsPage() {
  const { currentGame, countries } = useGameStore();
  const { user } = useAuthStore();
  const isGM = user?.role === "gm" || user?.role === "admin";

  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [causes, setCauses] = useState("");
  const [goals, setGoals] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!currentGame) return;
    try {
      const res = await api.get(`/conflicts/games/${currentGame.id}`);
      setConflicts(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
  }, [currentGame?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGame) return;
    setError("");
    try {
      await api.post("/conflicts/", {
        game_id: currentGame.id,
        title,
        description,
        causes: causes || undefined,
        goals: goals || undefined,
        participant_country_ids: countries.slice(0, 2).map((c) => c.id),
      });
      setTitle("");
      setDescription("");
      setCauses("");
      setGoals("");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось создать конфликт");
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.patch(`/conflicts/${id}`, { status });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось обновить статус");
    }
  };

  if (!currentGame) {
    return <div className="text-text-main/50 text-sm">Выберите или откройте игровую сессию.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-accent" />
        <h1 className="text-2xl font-bold text-text-main">Конфликты и кризисы</h1>
      </div>

      {error && (
        <div className="p-3 rounded bg-error/10 border border-error/30 text-error text-sm">{error}</div>
      )}

      {isGM && (
        <div className="panel p-5 space-y-3">
          <h2 className="text-sm font-semibold text-accent">Зарегистрировать конфликт (ведущий)</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              className="input"
              placeholder="Название конфликта"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="input min-h-[70px]"
              placeholder="Описание ситуации"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="input"
                placeholder="Причины"
                value={causes}
                onChange={(e) => setCauses(e.target.value)}
              />
              <input
                className="input"
                placeholder="Цели сторон"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Создать конфликт
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {conflicts.map((c) => (
          <div key={c.id} className="panel p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-main">{c.title}</h3>
              <span className="text-xs px-2 py-0.5 rounded border border-[#2a3b52] text-warning uppercase">
                {c.status}
              </span>
            </div>
            <p className="text-sm text-text-main/80">{c.description}</p>
            {c.causes && <div className="text-xs text-text-main/60">Причины: {c.causes}</div>}
            {c.goals && <div className="text-xs text-text-main/60">Цели: {c.goals}</div>}
            {c.results && <div className="text-xs text-success">Итоги: {c.results}</div>}
            {isGM && (
              <div className="flex gap-2 pt-2">
                {["open", "active", "resolved", "closed"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(c.id, st)}
                    className={`btn-ghost text-xs py-1 ${c.status === st ? "border-accent text-accent" : ""}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {conflicts.length === 0 && (
          <div className="panel p-6 text-center text-sm text-text-main/50">
            Активных конфликтов нет.
          </div>
        )}
      </div>
    </div>
  );
}
