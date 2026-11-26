import { useEffect, useState } from "react";
import api from "@/api/api";
import { History } from "lucide-react";
import type { HistoryLog } from "@/types";

export default function HistoryPage() {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await api.get("/games/");
      const games = res.data;
      if (!games.length) { setLoading(false); return; }
      const hRes = await api.get(`/history/games/${games[0].id}`);
      setLogs(hRes.data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((l) =>
    filter ? l.action_type.toLowerCase().includes(filter.toLowerCase()) || l.description.toLowerCase().includes(filter.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-accent" />
        <h1 className="text-2xl font-bold text-text-main">Журнал истории</h1>
      </div>
      <div className="flex gap-2">
        <input
          className="input w-64"
          placeholder="Поиск по описанию или типу события"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2a3b52]">
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Дата</th>
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Тип</th>
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Описание</th>
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Автор</th>
                <th className="px-4 py-3 text-xs text-text-main/50 font-medium">Ход</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2d3f]">
              {loading ? (
                <tr><td colSpan="5" className="px-4 py-6 text-center text-text-main/50">Загрузка...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-6 text-center text-text-main/50">Записей нет</td></tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-[#1a2436]/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-text-main/70 font-mono">{new Date(l.created_at).toLocaleString("ru-RU")}</td>
                    <td className="px-4 py-3 text-xs text-text-main">{l.action_type}</td>
                    <td className="px-4 py-3 text-xs text-text-main/90">{l.description}</td>
                    <td className="px-4 py-3 text-xs text-text-main/70">#{l.user_id ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-main/70">{l.turn_number ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
