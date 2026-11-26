import { useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { MapPin, Clock, Wallet, AlertCircle } from "lucide-react";

export default function RightPanel() {
  const { selectedTerritory, selectedCountry, setSelectedTerritory } = useGameStore();

  return (
    <aside className="w-80 shrink-0 bg-panel border-l border-[#2a3b52] flex flex-col z-20">
      <div className="p-4 border-b border-[#2a3b52]">
        <h2 className="text-sm font-semibold text-text-main flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent" /> Детали
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedTerritory ? (
          <div className="space-y-3">
            <div className="panel-2 p-3">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-base font-semibold text-text-main">{selectedTerritory.name}</h3>
                <button
                  onClick={() => setSelectedTerritory(null)}
                  className="text-text-main/50 hover:text-text-main"
                >
                  ✕
                </button>
              </div>
              {selectedTerritory.country_id !== undefined && (
                <div className="text-xs text-text-main/60 mb-1">
                  Владелец: #{selectedTerritory.country_id}
                </div>
              )}
              <div className="text-xs text-text-main/50">
                Население: {selectedTerritory.population.toLocaleString()}
              </div>
              {selectedTerritory.additional_info && (
                <div className="mt-2 text-xs text-text-main/70 italic">
                  {selectedTerritory.additional_info}
                </div>
              )}
            </div>
            <div className="text-xs text-text-main/50 section-title mb-1">Быстрые действия</div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost text-[10px] py-2">Передать</button>
              <button className="btn-ghost text-[10px] py-2">Изменить</button>
            </div>
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
