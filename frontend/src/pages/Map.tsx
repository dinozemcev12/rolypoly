import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre.css";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Cross2, Plus, Minus, Layers } from "lucide-react";

// Мир по умолчанию (упрощённый контур continents) в GeoJSON, если нет загруженных территорий
const DEFAULT_CENTER: [number, number] = [30, 20];
const DEFAULT_ZOOM = 1.5;

export default function MapPage() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setSelectedTerritory, territories, setTerritories, selectedTerritory } = useGameStore();
  const { user } = useAuthStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      interactive: true,
    });
    mapRef.current = map;

    // Простой тёмный фон
    map.on("load", () => {
      map.addSource("territories", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "territories-layer",
        type: "fill",
        source: "territories",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.6,
          "fill-outline-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "territories-border",
        type: "line",
        source: "territories",
        paint: {
          "line-color": "#ffffff",
          "line-width": 1,
          "line-opacity": 0.5,
        },
      });
      setLoaded(true);
      loadTerritories();
    });

    map.on("click", "territories-layer", (e) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id !== undefined) {
        const t = territories.find((x) => x.id === feature.properties.id);
        if (t) setSelectedTerritory(t);
      }
    });

    return () => map.remove();
  }, []);

  const loadTerritories = async () => {
    try {
      const gamesRes = await api.get("/games/");
      const games = gamesRes.data;
      if (!games.length) return;
      const game = games[0];
      const tRes = await api.get(`/territories/games/${game.id}`);
      const data = tRes.data;
      setTerritories(data);
      const geojson = {
        type: "FeatureCollection" as const,
        features: data.map((t: any) => ({
          type: "Feature" as const,
          properties: { id: t.id, name: t.name, color: t.country?.color || "#4B91D1" },
          geometry: t.geometry || { type: "Point", coordinates: [0, 0] },
        })),
      };
      const source = mapRef.current?.getSource("territories") as maplibregl.GeoJSONSource;
      source?.setData(geojson);
    } catch (e) {
      // ignore
    }
  };

  const fitToWorld = () => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  };

  const addDemoTerritory = async () => {
    // Добавим демо-полигон (Москва) если карта пуста
    if (!mapRef.current) return;
    const source = mapRef.current.getSource("territories") as maplibregl.GeoJSONSource;
    const current = source._data as any;
    const feature = {
      type: "Feature",
      properties: { id: Date.now(), name: "Демо территория", color: "#4B91D1" },
      geometry: {
        type: "Polygon",
        coordinates: [[[37.4, 55.6], [37.7, 55.6], [37.7, 55.8], [37.4, 55.8], [37.4, 55.6]]],
      },
    };
    current.features.push(feature);
    source.setData(current);
  };

  return (
    <div className="flex-1 relative bg-[#0b1118] flex">
      <div className="absolute inset-0" ref={containerRef} />
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/90">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-2" />
          <span className="text-text-main/60 text-sm">Загрузка карты...</span>
        </div>
      )}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
        <button onClick={fitToWorld} className="btn-ghost" title="Все миру">
          <Layers className="w-5 h-5" />
        </button>
        <button onClick={() => { mapRef.current?.zoomIn(); }} className="btn-ghost" title="Увеличить">
          <Plus className="w-5 h-5" />
        </button>
        <button onClick={() => { mapRef.current?.zoomOut(); }} className="btn-ghost" title="Уменьшить">
          <Minus className="w-5 h-5" />
        </button>
        <button onClick={addDemoTerritory} className="btn-ghost text-[10px] py-1.5" title="Демо полигон">
          <Cross2 className="w-4 h-4" /> Демо
        </button>
      </div>
      <div className="absolute bottom-4 left-4 z-30 text-[10px] text-text-main/50 bg-bg/80 px-2 py-1 rounded">
        55° N, 30° E
      </div>
    </div>
  );
}
