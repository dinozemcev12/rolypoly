import { useEffect, useState } from "react";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { Event as GameEvent } from "@/types";
import { Activity, Plus } from "lucide-react";

export default function NewsPage() {
  const { currentGame } = useGameStore();
  const { user } = useAuthStore();
  const isGM = user?.role === "gm" || user?.role === "admin";

  const [events, setEvents] = useState<GameEvent[]>([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState("политика");
  const [visibility, setVisibility] = useState("public");
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!currentGame) return;
    try {
      const res = await api.get(`/events/games/${currentGame.id}`);
      setEvents(res.data);
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
      await api.post("/events/", {
        game_id: currentGame.id,
        title,
        text,
        category,
        visibility,
      });
      setTitle("");
      setText("");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось опубликовать новость");
    }
  };

  if (!currentGame) {
    return <div className="text-text-main/50 text-sm">Выберите или откройте игровую сессию.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-accent" />
        <h1 className="text-2xl font-bold text-text-main">Новости и события</h1>
      </div>

      {error && (
        <div className="p-3 rounded bg-error/10 border border-error/30 text-error text-sm">{error}</div>
      )}

      {isGM && (
        <div className="panel p-5 space-y-3">
          <h2 className="text-sm font-semibold text-accent">Опубликовать событие (ведущий)</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              className="input"
              placeholder="Заголовок новости"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="input min-h-[80px]"
              placeholder="Текст новости..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="политика">Политика</option>
                <option value="экономика">Экономика</option>
                <option value="дипломатия">Дипломатия</option>
                <option value="военное">Военное</option>
              </select>
              <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="public">Публичное</option>
                <option value="player">Для игроков</option>
                <option value="secret">Секретное</option>
              </select>
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Опубликовать
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {events.map((ev) => (
          <div key={ev.id} className="panel p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-main">{ev.title}</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-panel-2 border border-[#2a3b52]">{ev.category}</span>
                <span className="text-text-main/40">
                  {new Date(ev.event_date).toLocaleDateString("ru-RU")}
                </span>
              </div>
            </div>
            <p className="text-sm text-text-main/80 whitespace-pre-line">{ev.text}</p>
          </div>
        ))}
        {events.length === 0 && (
          <div className="panel p-6 text-center text-sm text-text-main/50">
            Новостей пока нет.
          </div>
        )}
      </div>
    </div>
  );
}
