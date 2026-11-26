import { useState, useEffect } from "react";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import { MapPin, AlertCircle, Check, Trash2, Edit2, History } from "lucide-react";
import type { HistoryLog } from "@/types";

export default function RightPanel() {
  const {
    currentGame,
    selectedTerritory,
    countries,
    territories,
    setTerritories,
    setSelectedTerritory,
  } = useGameStore();
  const { user } = useAuthStore();
  const isGM = user?.role === "gm" || user?.role === "admin";

  const [saving, setSaving] = useState(false);
  const [ownerId, setOwnerId] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPop, setEditPop] = useState(0);
  const [editInfo, setEditInfo] = useState("");
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);

  useEffect(() => {
    setMsg("");
    setEditMode(false);
    if (selectedTerritory) {
      setOwnerId(selectedTerritory.country_id ? String(selectedTerritory.country_id) : "");
      setEditName(selectedTerritory.name);
      setEditPop(selectedTerritory.population || 0);
      setEditInfo(selectedTerritory.additional_info || "");

      if (currentGame?.id) {
        api
          .get(`/history/games/${currentGame.id}`)
          .then((res) => {
            const list = (res.data || []).filter(
              (h: HistoryLog) =>
                h.related_object_type === "territory" &&
                h.related_object_id === selectedTerritory.id
            );
            setHistoryLogs(list.slice(0, 10));
          })
          .catch(() => setHistoryLogs([]));
      }
    } else {
      setHistoryLogs([]);
    }
  }, [selectedTerritory?.id, currentGame?.id]);

  const ownerCountry = selectedTerritory?.country_id
    ? countries.find((c) => c.id === selectedTerritory.country_id)
    : null;

  const handleAssignOwner = async () => {
    if (!selectedTerritory) return;
    setSaving(true);
    setMsg("");
    try {
      const targetCountryId = ownerId === "" ? null : Number(ownerId);
      const res = await api.post(`/territories/${selectedTerritory.id}/owner`, {
        country_id: targetCountryId,
      });
      const updated = res.data;
      setSelectedTerritory(updated);
      setTerritories(territories.map((t) => (t.id === updated.id ? updated : t)));
      setMsg("Владелец обновлён");
    } catch {
      setMsg("Ошибка смены владельца");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerritory) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await api.patch(`/territories/${selectedTerritory.id}`, {
        name: editName.trim() || selectedTerritory.name,
        population: Number(editPop) || 0,
        additional_info: editInfo || null,
      });
      const updated = res.data;
      setSelectedTerritory(updated);
      setTerritories(territories.map((t) => (t.id === updated.id ? updated : t)));
      setEditMode(false);
      setMsg("Параметры сохранены");
    } catch {
      setMsg("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerritory = async () => {
    if (!selectedTerritory) return;
    if (!confirm(`Удалить территорию «${selectedTerritory.name}»?`)) return;
    setSaving(true);
    try {
      await api.delete(`/territories/${selectedTerritory.id}`);
      setTerritories(territories.filter((t) => t.id !== selectedTerritory.id));
      setSelectedTerritory(null);
    } catch {
      setMsg("Ошибка удаления территории");
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="w-80 shrink-0 bg-panel border-l border-[#2a3b52] hidden lg:flex flex-col z-20">
      <div className="p-4 border-b border-[#2a3b52]">
        <h2 className="text-sm font-semibold text-text-main flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent" /> Детали территории
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedTerritory ? (
          <div className="space-y-3">
            <div className="panel-2 p-3 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <h3 className="text-base font-semibold text-text-main">{selectedTerritory.name}</h3>
                <div className="flex items-center gap-1">
                  {isGM && (
                    <button
                      onClick={() => setEditMode((v) => !v)}
                      className="text-text-main/50 hover:text-accent p-1"
                      title="Редактировать"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTerritory(null)}
                    className="text-text-main/50 hover:text-text-main text-xs p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {editMode && isGM ? (
                <form onSubmit={handleSaveDetails} className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-main/50">Название</label>
                    <input
                      className="input text-xs py-1.5"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-main/50">Население</label>
                    <input
                      type="number"
                      className="input text-xs py-1.5"
                      value={editPop}
                      onChange={(e) => setEditPop(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-main/50">Доп. информация</label>
                    <textarea
                      className="input text-xs py-1.5"
                      rows={3}
                      value={editInfo}
                      onChange={(e) => setEditInfo(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary text-xs py-1 flex-1"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="btn-ghost text-xs py-1"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="text-xs text-text-main/70 flex items-center gap-2">
                    <span>Владелец:</span>
                    {ownerCountry ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-text-main">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: ownerCountry.color }}
                        />
                        {ownerCountry.name}
                      </span>
                    ) : selectedTerritory.country_id ? (
                      <span>#{selectedTerritory.country_id}</span>
                    ) : (
                      <span className="text-text-main/40">Нейтральная территория</span>
                    )}
                  </div>
                  <div className="text-xs text-text-main/60">
                    Население: {(selectedTerritory.population || 0).toLocaleString("ru-RU")}
                  </div>

                  {selectedTerritory.resources && Object.keys(selectedTerritory.resources).length > 0 && (
                    <div className="pt-2 border-t border-[#2a3b52] text-xs">
                      <div className="text-text-main/50 mb-1">Ресурсы:</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(selectedTerritory.resources).map(([k, v]) => (
                          <span key={k} className="px-2 py-0.5 rounded bg-panel border border-[#2a3b52]">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTerritory.additional_info && (
                    <div className="pt-2 border-t border-[#2a3b52] text-xs text-text-main/80">
                      {selectedTerritory.additional_info}
                    </div>
                  )}
                </>
              )}
            </div>

            {isGM && (
              <div className="panel-2 p-3 space-y-2">
                <div className="text-xs font-semibold text-accent">Управление (ведущий)</div>
                <select
                  className="input text-xs"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                >
                  <option value="">Нейтральная территория</option>
                  {countries.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignOwner}
                  disabled={saving}
                  className="btn-primary w-full text-xs py-1.5 flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" /> {saving ? "Сохранение..." : "Назначить владельца"}
                </button>
                <button
                  onClick={handleDeleteTerritory}
                  disabled={saving}
                  className="btn-ghost w-full text-xs py-1.5 flex items-center justify-center gap-1 text-error hover:bg-error/10"
                >
                  <Trash2 className="w-3 h-3" /> Удалить территорию
                </button>
                {msg && <div className="text-[11px] text-success">{msg}</div>}
              </div>
            )}

            {historyLogs.length > 0 && (
              <div className="panel-2 p-3 space-y-2">
                <div className="text-xs font-semibold text-text-main/70 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-accent" /> История территории
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {historyLogs.map((h) => (
                    <div key={h.id} className="text-[11px] text-text-main/70 border-l-2 border-[#2a3b52] pl-2">
                      <div>{h.description}</div>
                      <div className="text-[10px] text-text-main/40">
                        {new Date(h.created_at).toLocaleDateString("ru-RU")}
                        {h.turn_number ? ` · Ход ${h.turn_number}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-text-main/50 py-10">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Территория не выбрана</p>
            <p className="text-xs text-text-main/40 mt-1">Нажмите на территорию на карте</p>
          </div>
        )}
      </div>
    </aside>
  );
}
