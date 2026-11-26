import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as turf from "@turf/turf";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Plus,
  Minus,
  Layers,
  Upload,
  PenTool,
  Undo2,
  Redo2,
  Trash2,
  Check,
  Search,
  List,
  Move,
  GitMerge,
  Scissors,
  History,
  Image as ImageIcon,
  X,
} from "lucide-react";
import type { Country, Territory, Event as GameEvent } from "@/types";
import { getWorldCountriesGeoJSON } from "@/utils/worldMap";

const DEFAULT_CENTER: [number, number] = [24, 50];
const DEFAULT_ZOOM = 3.2;

function buildGraticuleGeoJSON() {
  const features: any[] = [];
  for (let lon = -180; lon <= 180; lon += 15) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[lon, -85], [lon, 85]] },
    });
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[-180, lat], [180, lat]] },
    });
  }
  return { type: "FeatureCollection" as const, features };
}

type BasemapId = "dark" | "physical" | "minimal" | "none";

interface BasemapStyle {
  label: string;
  ocean: string;
  land: string;
  grid: string;
}

const BASEMAPS: Record<BasemapId, BasemapStyle> = {
  dark: {
    label: "Тёмная",
    ocean: "#0b1118",
    land: "#1f2b3a",
    grid: "#2a3b52",
  },
  physical: {
    label: "Рельеф",
    ocean: "#163854",
    land: "#3a5a40",
    grid: "#2a4a60",
  },
  minimal: {
    label: "Серая",
    ocean: "#111318",
    land: "#2a2e38",
    grid: "#252a35",
  },
  none: {
    label: "Сетка",
    ocean: "#0b1118",
    land: "transparent",
    grid: "#2a3b52",
  },
};

type MapLayerMode =
  | "political"
  | "physical"
  | "economic"
  | "diplomatic"
  | "events"
  | "control";

interface HoverInfo {
  x: number;
  y: number;
  territory: Territory;
  country?: Country;
}

interface DiplomaticRelation {
  id: number;
  country1_id: number;
  country2_id: number;
  status: string;
}

export default function MapPage() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const drawModeRef = useRef(false);
  const mergeModeRef = useRef(false);
  const splitModeRef = useRef(false);
  const editMarkersRef = useRef<maplibregl.Marker[]>([]);

  const {
    currentGame,
    territories,
    countries,
    selectedTerritory,
    setCurrentGame,
    setCountries,
    setSelectedTerritory,
    setTerritories,
  } = useGameStore();
  const { user } = useAuthStore();
  const isGM = user?.role === "gm" || user?.role === "admin";

  const [loaded, setLoaded] = useState(false);
  const [basemap, setBasemap] = useState<BasemapId>("dark");
  const [layerMode, setLayerMode] = useState<MapLayerMode>("political");
  const [statusMsg, setStatusMsg] = useState("");
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);

  // Данные для дипломатического слоя и слоя событий
  const [relations, setRelations] = useState<DiplomaticRelation[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);

  // Поиск и список территорий
  const [showList, setShowList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Рисование нового полигона (+ Undo / Redo)
  const [drawMode, setDrawMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [redoPoints, setRedoPoints] = useState<[number, number][]>([]);
  const [newTerritoryName, setNewTerritoryName] = useState("");

  // Редактирование границ выбранной территории
  const [editRingMode, setEditRingMode] = useState(false);
  const [editRingPoints, setEditRingPoints] = useState<[number, number][]>([]);
  const [editHistory, setEditHistory] = useState<[number, number][][]>([]);
  const [editFuture, setEditFuture] = useState<[number, number][][]>([]);

  // Объединение территорий
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeFirst, setMergeFirst] = useState<Territory | null>(null);

  // Разделение территории
  const [splitMode, setSplitMode] = useState(false);
  const [splitPoints, setSplitPoints] = useState<[number, number][]>([]);

  // Подложка исторической карты
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);

  useEffect(() => {
    drawModeRef.current = drawMode;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = drawMode || mergeMode || splitMode ? "crosshair" : "";
    }
  }, [drawMode, mergeMode, splitMode]);

  useEffect(() => {
    mergeModeRef.current = mergeMode;
  }, [mergeMode]);

  useEffect(() => {
    splitModeRef.current = splitMode;
  }, [splitMode]);

  // Автосохранение черновика рисования
  useEffect(() => {
    if (!currentGame?.id) return;
    const key = `rolypoly_draw_draft_${currentGame.id}`;
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.points) && parsed.points.length > 0 && drawPoints.length === 0) {
          setDrawPoints(parsed.points);
          if (parsed.name) setNewTerritoryName(parsed.name);
        }
      }
    } catch {
      // ignore
    }
  }, [currentGame?.id]);

  useEffect(() => {
    if (!currentGame?.id) return;
    const key = `rolypoly_draw_draft_${currentGame.id}`;
    if (drawPoints.length > 0) {
      sessionStorage.setItem(key, JSON.stringify({ points: drawPoints, name: newTerritoryName }));
    } else {
      sessionStorage.removeItem(key);
    }
  }, [drawPoints, newTerritoryName, currentGame?.id]);

  const getTerritoryColor = useCallback(
    (t: Territory, countriesData: Country[], mode: MapLayerMode): string => {
      const owner = countriesData.find((c) => c.id === t.country_id);

      if (mode === "political") {
        return owner?.color || "#64748b";
      }
      if (mode === "physical") {
        const resCount = t.resources ? Object.keys(t.resources).length : 0;
        if (resCount >= 3) return "#2f6f4e";
        if (resCount >= 1) return "#4c7a49";
        return (t.population || 0) >= 3000000 ? "#6b7d4c" : "#3a5a40";
      }
      if (mode === "economic") {
        const pop = t.population || 0;
        return pop >= 4000000 ? "#3EAC83" : pop >= 2000000 ? "#4B91D1" : "#D6A34C";
      }
      if (mode === "control") {
        return t.country_id ? "#3EAC83" : "#D65C65";
      }
      if (mode === "events") {
        const hasEvent = events.some((ev) =>
          (ev.related_territory_ids || []).includes(t.id)
        );
        return hasEvent ? "#D6A34C" : "#243247";
      }
      if (mode === "diplomatic") {
        const refCountryId =
          selectedTerritory?.country_id ||
          countriesData.find((c) => c.owner_user_id === user?.id)?.id;
        if (!t.country_id) return "#334155";
        if (!refCountryId || t.country_id === refCountryId) return "#4B91D1";
        const rel = relations.find(
          (r) =>
            (r.country1_id === refCountryId && r.country2_id === t.country_id) ||
            (r.country2_id === refCountryId && r.country1_id === t.country_id)
        );
        if (!rel) return "#64748b";
        if (rel.status === "alliance") return "#3EAC83";
        if (rel.status === "war") return "#D65C65";
        if (rel.status === "tension") return "#D6A34C";
        return "#4B91D1";
      }
      return owner?.color || "#64748b";
    },
    [events, relations, selectedTerritory?.country_id, user?.id]
  );

  const buildGeoJSON = useCallback(
    (territoriesData: Territory[], countriesData: Country[], mode: MapLayerMode) => ({
      type: "FeatureCollection" as const,
      features: territoriesData.map((t) => {
        const owner = countriesData.find((c) => c.id === t.country_id);
        const color = getTerritoryColor(t, countriesData, mode);
        return {
          type: "Feature" as const,
          id: t.id,
          properties: {
            id: t.id,
            name: t.name,
            color,
            owner_name: owner?.name || "",
            population: t.population,
            selected: selectedTerritory?.id === t.id ? 1 : 0,
          },
          geometry: t.geometry || { type: "Point", coordinates: [0, 0] },
        };
      }),
    }),
    [getTerritoryColor, selectedTerritory?.id]
  );

  const buildLabelsGeoJSON = (territoriesData: Territory[]) => ({
    type: "FeatureCollection" as const,
    features: territoriesData
      .filter((t) => t.geometry?.type === "Polygon" || t.geometry?.type === "MultiPolygon")
      .map((t) => {
        let coords: number[][] = [];
        const g = t.geometry as any;
        if (g?.type === "Polygon") coords = g.coordinates[0];
        else if (g?.type === "MultiPolygon") coords = g.coordinates[0][0];

        let cx = 0,
          cy = 0;
        if (coords.length > 0) {
          cx = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
          cy = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
        }
        return {
          type: "Feature" as const,
          properties: { name: t.name },
          geometry: { type: "Point" as const, coordinates: [cx, cy] },
        };
      }),
  });

  const refreshMapSource = useCallback(
    (territoriesData: Territory[], countriesData: Country[], mode: MapLayerMode) => {
      const source = mapRef.current?.getSource("territories") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (source) source.setData(buildGeoJSON(territoriesData, countriesData, mode));

      const labelSrc = mapRef.current?.getSource("territory-labels") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (labelSrc) labelSrc.setData(buildLabelsGeoJSON(territoriesData));
    },
    [buildGeoJSON]
  );

  const handleMergePick = useCallback(
    async (second: Territory) => {
      const first = mergeFirst;
      if (!first) {
        setMergeFirst(second);
        setStatusMsg(`Выбрана «${second.name}». Кликните вторую территорию для объединения.`);
        return;
      }
      if (first.id === second.id) {
        setStatusMsg("Выберите другую территорию.");
        return;
      }
      if (!first.geometry || !second.geometry) {
        setStatusMsg("У одной из территорий отсутствует геометрия.");
        return;
      }
      if (!confirm(`Объединить «${first.name}» и «${second.name}» в одну территорию?`)) {
        setMergeMode(false);
        setMergeFirst(null);
        return;
      }
      try {
        const f1 = turf.feature(first.geometry as any);
        const f2 = turf.feature(second.geometry as any);
        const merged = turf.union(turf.featureCollection([f1, f2]) as any);
        if (!merged) {
          setStatusMsg("Не удалось объединить геометрии");
          return;
        }
        const res = await api.patch(`/territories/${first.id}`, {
          geometry: merged.geometry,
          population: (first.population || 0) + (second.population || 0),
        });
        await api.delete(`/territories/${second.id}`);
        const updatedList = territories
          .filter((t) => t.id !== second.id)
          .map((t) => (t.id === first.id ? res.data : t));
        setTerritories(updatedList);
        setSelectedTerritory(res.data);
        setStatusMsg(`Территории «${first.name}» и «${second.name}» объединены`);
      } catch (err: any) {
        setStatusMsg(err.response?.data?.detail || "Ошибка объединения территорий");
      } finally {
        setMergeMode(false);
        setMergeFirst(null);
      }
    },
    [mergeFirst, setSelectedTerritory, setTerritories, territories]
  );

  // Ref для актуального колбэка объединения при клике по карте
  const handleMergePickRef = useRef(handleMergePick);
  useEffect(() => {
    handleMergePickRef.current = handleMergePick;
  }, [handleMergePick]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#0b1118" },
          },
        ],
      },
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      interactive: true,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-right");

    map.on("load", () => {
      // ── Офлайн world-atlas GeoJSON ──
      const worldGeo = getWorldCountriesGeoJSON();
      map.addSource("world-land", { type: "geojson", data: worldGeo });
      map.addLayer({
        id: "world-land-fill",
        type: "fill",
        source: "world-land",
        paint: { "fill-color": "#1f2b3a", "fill-opacity": 1 },
      });
      map.addLayer({
        id: "world-land-stroke",
        type: "line",
        source: "world-land",
        paint: { "line-color": "#2e4257", "line-width": 0.6, "line-opacity": 0.8 },
      });

      map.addSource("graticule", { type: "geojson", data: buildGraticuleGeoJSON() });
      map.addLayer({
        id: "graticule-layer",
        type: "line",
        source: "graticule",
        paint: { "line-color": "#2a3b52", "line-width": 0.8, "line-opacity": 0.28 },
      });

      map.addSource("territories", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "territories-layer",
        type: "fill",
        source: "territories",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.45,
          "fill-outline-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "territories-border",
        type: "line",
        source: "territories",
        paint: {
          "line-color": ["case", ["==", ["get", "selected"], 1], "#4B91D1", "#ffffff"],
          "line-width": ["case", ["==", ["get", "selected"], 1], 3, 1.5],
          "line-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "territories-hover",
        type: "fill",
        source: "territories",
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.15, 0],
        },
      });

      map.addSource("territory-labels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      // Метки через circle + symbol без внешних шрифтов
      map.addLayer({
        id: "territory-labels-layer",
        type: "symbol",
        source: "territory-labels",
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 9, 7, 14],
          "text-anchor": "center",
          "text-max-width": 8,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 2.5, 0, 3.5, 1],
        },
      });

      map.addSource("draw-preview", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "draw-fill",
        type: "fill",
        source: "draw-preview",
        filter: ["==", "$type", "Polygon"],
        paint: { "fill-color": "#4B91D1", "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: "draw-line",
        type: "line",
        source: "draw-preview",
        paint: { "line-color": "#4B91D1", "line-width": 2 },
      });
      map.addLayer({
        id: "draw-points",
        type: "circle",
        source: "draw-preview",
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#4B91D1",
        },
      });

      setLoaded(true);
      loadTerritories();
    });

    map.on("mousemove", (e) => {
      setCursorCoords([Number(e.lngLat.lat.toFixed(2)), Number(e.lngLat.lng.toFixed(2))]);
    });

    let hoveredId: number | string | null = null;
    map.on("mousemove", "territories-layer", (e) => {
      if (drawModeRef.current) return;
      map.getCanvas().style.cursor = "pointer";
      const feature = e.features?.[0];
      if (!feature) return;

      if (hoveredId !== null) {
        map.setFeatureState({ source: "territories", id: hoveredId }, { hover: false });
      }
      hoveredId = feature.id ?? null;
      if (hoveredId !== null) {
        map.setFeatureState({ source: "territories", id: hoveredId }, { hover: true });
      }

      const { x, y } = e.point;
      const tId = Number(feature.properties?.id);
      const territoryList = useGameStore.getState().territories;
      const countryList = useGameStore.getState().countries;
      const t = territoryList.find((x) => x.id === tId);
      if (t) {
        const c = countryList.find((cc) => cc.id === t.country_id);
        setHoverInfo({ x, y, territory: t, country: c });
      }
    });

    map.on("mouseleave", "territories-layer", () => {
      if (!drawModeRef.current && !mergeModeRef.current && !splitModeRef.current) {
        map.getCanvas().style.cursor = "";
      }
      if (hoveredId !== null) {
        map.setFeatureState({ source: "territories", id: hoveredId }, { hover: false });
        hoveredId = null;
      }
      setHoverInfo(null);
    });

    map.on("click", (e) => {
      if (drawModeRef.current) {
        setDrawPoints((prev) => [
          ...prev,
          [Number(e.lngLat.lng.toFixed(4)), Number(e.lngLat.lat.toFixed(4))],
        ]);
        setRedoPoints([]);
        return;
      }
      if (splitModeRef.current) {
        setSplitPoints((prev) => [
          ...prev,
          [Number(e.lngLat.lng.toFixed(4)), Number(e.lngLat.lat.toFixed(4))],
        ]);
        return;
      }
      const features = map.queryRenderedFeatures(e.point, { layers: ["territories-layer"] });
      const feature = features[0];
      if (feature?.properties?.id !== undefined) {
        const list = useGameStore.getState().territories;
        const t = list.find((x) => x.id === Number(feature.properties?.id));
        if (t) {
          if (mergeModeRef.current) {
            handleMergePickRef.current(t);
          } else {
            setSelectedTerritory(t);
          }
        }
      }
    });

    return () => {
      editMarkersRef.current.forEach((m) => m.remove());
      map.remove();
    };
  }, []);

  useEffect(() => {
    refreshMapSource(territories, countries, layerMode);
  }, [territories, countries, layerMode, refreshMapSource]);

  // Синхронизация маркеров при редактировании границ
  useEffect(() => {
    editMarkersRef.current.forEach((m) => m.remove());
    editMarkersRef.current = [];
    const map = mapRef.current;
    if (!map || !editRingMode || editRingPoints.length === 0) return;

    editRingPoints.forEach((pt, idx) => {
      const el = document.createElement("div");
      el.className = "w-3 h-3 rounded-full bg-accent border-2 border-white shadow cursor-grab";
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat(pt)
        .addTo(map);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        setEditHistory((h) => [...h, editRingPoints]);
        setEditFuture([]);
        setEditRingPoints((prev) =>
          prev.map((p, i) =>
            i === idx ? [Number(lngLat.lng.toFixed(4)), Number(lngLat.lat.toFixed(4))] : p
          )
        );
      });
      editMarkersRef.current.push(marker);
    });
  }, [editRingMode, editRingPoints]);

  // Превью рисования, редактирования границ ИЛИ линии разреза
  useEffect(() => {
    const src = mapRef.current?.getSource("draw-preview") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const pts = splitMode ? splitPoints : editRingMode ? editRingPoints : drawPoints;
    const features: any[] = pts.map((pt) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: pt },
    }));
    if (pts.length >= 2) {
      features.push({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: !splitMode && pts.length >= 3 ? [...pts, pts[0]] : pts,
        },
      });
    }
    if (!splitMode && pts.length >= 3) {
      features.push({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[...pts, pts[0]]],
        },
      });
    }
    src.setData({ type: "FeatureCollection", features });
  }, [drawPoints, editRingMode, editRingPoints, splitMode, splitPoints]);

  // Смена цветовой схемы базовой карты (офлайн)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const style = BASEMAPS[basemap];
    // Фон (океан)
    if (map.getLayer("background")) {
      map.setPaintProperty("background", "background-color", style.ocean);
    }
    // Суша
    if (map.getLayer("world-land-fill")) {
      map.setPaintProperty("world-land-fill", "fill-color", style.land === "transparent" ? "#1f2b3a" : style.land);
      map.setPaintProperty("world-land-fill", "fill-opacity", style.land === "transparent" ? 0 : 1);
    }
    // Сетка координат
    if (map.getLayer("graticule-layer")) {
      map.setPaintProperty("graticule-layer", "line-color", style.grid);
    }
  }, [basemap, loaded]);

  // Подложка изображения
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (map.getLayer("map-overlay-layer")) map.removeLayer("map-overlay-layer");
    if (map.getSource("map-overlay")) map.removeSource("map-overlay");

    if (overlayUrl) {
      const bounds = map.getBounds();
      const coords: [[number, number], [number, number], [number, number], [number, number]] = [
        [bounds.getWest(), bounds.getNorth()],
        [bounds.getEast(), bounds.getNorth()],
        [bounds.getEast(), bounds.getSouth()],
        [bounds.getWest(), bounds.getSouth()],
      ];
      map.addSource("map-overlay", {
        type: "image",
        url: overlayUrl,
        coordinates: coords,
      });
      map.addLayer(
        {
          id: "map-overlay-layer",
          type: "raster",
          source: "map-overlay",
          paint: { "raster-opacity": overlayOpacity },
        },
        "territories-layer"
      );
    }
  }, [overlayUrl, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer("map-overlay-layer")) {
      map.setPaintProperty("map-overlay-layer", "raster-opacity", overlayOpacity);
    }
  }, [overlayOpacity]);

  const loadTerritories = async () => {
    try {
      const gamesRes = await api.get("/games/");
      const games = gamesRes.data;
      if (!games.length) return;
      const game = currentGame
        ? games.find((g: any) => g.id === currentGame.id) || games[0]
        : games[0];
      setCurrentGame(game);
      const [tRes, cRes, rRes, eRes] = await Promise.all([
        api.get(`/territories/games/${game.id}`),
        api.get(`/countries/games/${game.id}`),
        api.get(`/diplomacy/games/${game.id}/relations`).catch(() => ({ data: [] })),
        api.get(`/events/games/${game.id}`).catch(() => ({ data: [] })),
      ]);
      setTerritories(tRes.data);
      setCountries(cRes.data);
      setRelations(rRes.data || []);
      setEvents(eRes.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (loaded && currentGame?.id) {
      loadTerritories();
    }
  }, [currentGame?.id]);

  const fitToWorld = () => {
    mapRef.current?.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  };

  const handleImportByYear = async () => {
    if (!currentGame) return;
    const rawYear = window.prompt(
      "Введите год сценария для импорта стран и границ (например: 1914, 1938, 1815, 2026):",
      String(currentGame.start_year || 2026)
    );
    if (!rawYear) return;
    const year = Number(rawYear);
    if (Number.isNaN(year)) {
      setStatusMsg("Некорректный год");
      return;
    }
    const replace = window.confirm(
      `Импортировать государства и границы за ${year} год?\nНажмите ОК, чтобы заменить текущие территории, или Отмена — отменить импорт.`
    );
    if (!replace) return;
    setStatusMsg(`Импорт карты мира за ${year} г...`);
    try {
      const payload: any = {
        year,
        create_countries: true,
        replace_existing: true,
      };
      if (year >= 2000) {
        payload.geojson = getWorldCountriesGeoJSON();
      }
      const res = await api.post(`/territories/games/${currentGame.id}/import-by-year`, payload);
      setStatusMsg(
        `Импортировано за ${res.data.matched_year} г.: стран +${res.data.created_countries_count}, территорий +${res.data.imported_territories_count}`
      );
      await loadTerritories();
    } catch (err: any) {
      setStatusMsg(err.response?.data?.detail || "Ошибка импорта карты по году");
    }
  };

  const flyToTerritory = (t: Territory) => {
    setSelectedTerritory(t);
    if (!t.geometry || !mapRef.current) return;
    try {
      const c = turf.centroid(turf.feature(t.geometry as any));
      const [lng, lat] = c.geometry.coordinates;
      mapRef.current.flyTo({ center: [lng, lat], zoom: 5 });
    } catch {}
  };

  const handleGeoJSONUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentGame) return;
    setStatusMsg("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await api.post(`/territories/games/${currentGame.id}/import-geojson`, {
        geojson: parsed,
      });
      setStatusMsg(`Импортировано территорий: ${res.data.imported_count}`);
      await loadTerritories();
    } catch (err: any) {
      setStatusMsg(err.response?.data?.detail || "Ошибка импорта GeoJSON");
    } finally {
      e.target.value = "";
    }
  };

  const handleOverlayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/uploads/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOverlayUrl(res.data.url);
      setStatusMsg(`Подложка «${file.name}» загружена`);
    } catch (err: any) {
      setStatusMsg(err.response?.data?.detail || "Ошибка загрузки подложки");
    } finally {
      e.target.value = "";
    }
  };

  const handleSaveDrawnTerritory = async () => {
    if (!currentGame || drawPoints.length < 3 || !newTerritoryName.trim()) return;
    setStatusMsg("");
    try {
      const ring = [...drawPoints, drawPoints[0]];
      const res = await api.post("/territories/", {
        game_id: currentGame.id,
        name: newTerritoryName.trim(),
        population: 1000000,
        geometry: {
          type: "MultiPolygon",
          coordinates: [[ring]],
        },
      });
      setTerritories([...territories, res.data]);
      setSelectedTerritory(res.data);
      setDrawPoints([]);
      setRedoPoints([]);
      setNewTerritoryName("");
      setDrawMode(false);
      setStatusMsg(`Территория «${res.data.name}» создана`);
    } catch (err: any) {
      setStatusMsg(err.response?.data?.detail || "Ошибка сохранения территории");
    }
  };

  const startEditSelectedBoundaries = () => {
    if (!selectedTerritory?.geometry) return;
    const g = selectedTerritory.geometry as any;
    let ring: [number, number][] = [];
    if (g.type === "Polygon" && g.coordinates?.[0]) ring = g.coordinates[0];
    else if (g.type === "MultiPolygon" && g.coordinates?.[0]?.[0]) ring = g.coordinates[0][0];
    if (ring.length < 3) return;
    const openRing = ring.slice(0, -1).map((p) => [p[0], p[1]] as [number, number]);
    setEditRingPoints(openRing);
    setEditHistory([]);
    setEditFuture([]);
    setEditRingMode(true);
    setDrawMode(false);
    setMergeMode(false);
  };

  const handleSaveEditedBoundaries = async () => {
    if (!selectedTerritory || editRingPoints.length < 3) return;
    try {
      const closed = [...editRingPoints, editRingPoints[0]];
      const res = await api.patch(`/territories/${selectedTerritory.id}`, {
        geometry: {
          type: "MultiPolygon",
          coordinates: [[closed]],
        },
      });
      setTerritories(territories.map((t) => (t.id === res.data.id ? res.data : t)));
      setSelectedTerritory(res.data);
      setEditRingMode(false);
      setEditRingPoints([]);
      setStatusMsg(`Границы «${res.data.name}» обновлены`);
    } catch (err: any) {
      setStatusMsg(err.response?.data?.detail || "Ошибка сохранения границ");
    }
  };

  const handleSplitTerritory = async () => {
    if (!currentGame || !selectedTerritory?.geometry || splitPoints.length < 2) return;
    setStatusMsg("");
    try {
      const polyFeature = turf.feature(selectedTerritory.geometry as any);
      const cutLine = turf.lineString(splitPoints);
      const buffered = turf.buffer(cutLine, 0.5, { units: "kilometers" });
      if (!buffered) {
        setStatusMsg("Не удалось построить линию разреза");
        return;
      }
      const diff = turf.difference(turf.featureCollection([polyFeature as any, buffered as any]));
      if (!diff || diff.geometry.type !== "MultiPolygon" || diff.geometry.coordinates.length < 2) {
        setStatusMsg("Линия должна полностью пересекать территорию на 2+ части");
        return;
      }
      const parts = diff.geometry.coordinates;
      const halfPop = Math.round((selectedTerritory.population || 0) / parts.length);

      const firstRes = await api.patch(`/territories/${selectedTerritory.id}`, {
        geometry: { type: "MultiPolygon", coordinates: [parts[0]] },
        population: halfPop,
      });

      const created: Territory[] = [];
      for (let i = 1; i < parts.length; i++) {
        const newRes = await api.post("/territories/", {
          game_id: currentGame.id,
          country_id: selectedTerritory.country_id || undefined,
          name: `${selectedTerritory.name} (${i + 1})`,
          population: halfPop,
          geometry: { type: "MultiPolygon", coordinates: [parts[i]] },
        });
        created.push(newRes.data);
      }

      setTerritories([
        ...territories.map((t) => (t.id === firstRes.data.id ? firstRes.data : t)),
        ...created,
      ]);
      setSelectedTerritory(firstRes.data);
      setSplitMode(false);
      setSplitPoints([]);
      setStatusMsg(`Территория «${selectedTerritory.name}» разделена на ${parts.length} части`);
    } catch (err: any) {
      setStatusMsg(err.response?.data?.detail || "Ошибка разделения территории");
    }
  };

  const filteredTerritories = territories.filter((t) =>
    searchQuery ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="flex-1 relative bg-[#0b1118] flex min-h-[500px]">
      <div className="absolute inset-0" ref={containerRef} />
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/90">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-2" />
          <span className="text-text-main/60 text-sm">Загрузка карты...</span>
        </div>
      )}

      {/* Hover Popup */}
      {hoverInfo && (
        <div
          className="absolute z-40 pointer-events-none"
          style={{ left: hoverInfo.x + 12, top: hoverInfo.y - 10 }}
        >
          <div className="bg-panel/95 border border-[#2a3b52] rounded-lg shadow-xl px-3 py-2 text-xs min-w-[140px]">
            <div className="font-semibold text-text-main">{hoverInfo.territory.name}</div>
            {hoverInfo.country ? (
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: hoverInfo.country.color }}
                />
                <span className="text-text-main/70">{hoverInfo.country.name}</span>
              </div>
            ) : (
              <div className="text-text-main/40 mt-1">Нет владельца</div>
            )}
            <div className="text-text-main/50 mt-1">
              Нас.: {(hoverInfo.territory.population || 0).toLocaleString("ru-RU")}
            </div>
          </div>
        </div>
      )}

      {/* Left controls */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-1.5">
        <button onClick={fitToWorld} className="btn-ghost" title="Центрировать карту">
          <Layers className="w-5 h-5" />
        </button>
        <button onClick={() => mapRef.current?.zoomIn()} className="btn-ghost" title="Увеличить">
          <Plus className="w-5 h-5" />
        </button>
        <button onClick={() => mapRef.current?.zoomOut()} className="btn-ghost" title="Уменьшить">
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowList((v) => !v)}
          className={`btn-ghost text-[10px] py-1.5 flex items-center gap-1 ${showList ? "border-accent text-accent" : ""}`}
          title="Список и поиск территорий"
        >
          <List className="w-4 h-4" /> Список
        </button>

        {isGM && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json"
              onChange={handleGeoJSONUpload}
              className="hidden"
            />
            <input
              ref={overlayInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.webp"
              onChange={handleOverlayUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost text-[10px] py-1.5 flex items-center gap-1"
              title="Импорт GeoJSON"
            >
              <Upload className="w-4 h-4" /> GeoJSON
            </button>
            <button
              onClick={handleImportByYear}
              className="btn-ghost text-[10px] py-1.5 flex items-center gap-1"
              title="Импортировать страны и границы мира по году сценария"
            >
              <History className="w-4 h-4" /> Мир {currentGame?.start_year || 2026}
            </button>
            <button
              onClick={() => overlayInputRef.current?.click()}
              className="btn-ghost text-[10px] py-1.5 flex items-center gap-1"
              title="Наложить историческую/кастомную карту (PNG/JPG/SVG)"
            >
              <ImageIcon className="w-4 h-4" /> Подложка
            </button>
            <button
              onClick={() => {
                setDrawMode(!drawMode);
                setEditRingMode(false);
                setMergeMode(false);
                if (drawMode) {
                  setDrawPoints([]);
                  setRedoPoints([]);
                }
              }}
              className={`btn-ghost text-[10px] py-1.5 flex items-center gap-1 ${drawMode ? "border-accent text-accent" : ""}`}
              title="Редактор: нарисовать полигон"
            >
              <PenTool className="w-4 h-4" /> Рисовать
            </button>
            {selectedTerritory && (
              <button
                onClick={
                  editRingMode
                    ? () => {
                        setEditRingMode(false);
                        setEditRingPoints([]);
                      }
                    : startEditSelectedBoundaries
                }
                className={`btn-ghost text-[10px] py-1.5 flex items-center gap-1 ${editRingMode ? "border-accent text-accent" : ""}`}
                title="Перемещать точки выбранной территории"
              >
                <Move className="w-4 h-4" /> Границы
              </button>
            )}
            {selectedTerritory && (
              <button
                onClick={() => {
                  setSplitMode(!splitMode);
                  setSplitPoints([]);
                  setDrawMode(false);
                  setEditRingMode(false);
                  setMergeMode(false);
                }}
                className={`btn-ghost text-[10px] py-1.5 flex items-center gap-1 ${splitMode ? "border-accent text-accent" : ""}`}
                title="Разделить выбранную территорию линией"
              >
                <Scissors className="w-4 h-4" /> Разделить
              </button>
            )}
            <button
              onClick={() => {
                setMergeMode(!mergeMode);
                setMergeFirst(selectedTerritory || null);
                setDrawMode(false);
                setEditRingMode(false);
                setStatusMsg(
                  !mergeMode
                    ? selectedTerritory
                      ? `Выбрана «${selectedTerritory.name}». Кликните вторую территорию для объединения.`
                      : "Кликните первую территорию для объединения."
                    : ""
                );
              }}
              className={`btn-ghost text-[10px] py-1.5 flex items-center gap-1 ${mergeMode ? "border-accent text-accent" : ""}`}
              title="Объединить две территории"
            >
              <GitMerge className="w-4 h-4" /> Объединить
            </button>
          </>
        )}
      </div>

      {/* Панель поиска и списка территорий */}
      {showList && (
        <div className="absolute top-4 left-28 z-30 panel w-64 max-h-[420px] flex flex-col shadow-xl">
          <div className="p-2.5 border-b border-[#2a3b52] flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-text-main/50 shrink-0" />
            <input
              className="bg-transparent text-xs text-text-main outline-none flex-1"
              placeholder="Поиск территории..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={() => setShowList(false)} className="text-text-main/50 hover:text-text-main">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-y-auto divide-y divide-[#1f2d3f] flex-1">
            {filteredTerritories.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-main/50">Ничего не найдено</div>
            ) : (
              filteredTerritories.map((t) => {
                const owner = countries.find((c) => c.id === t.country_id);
                return (
                  <button
                    key={t.id}
                    onClick={() => flyToTerritory(t)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-panel-2 flex items-center justify-between gap-2 ${
                      selectedTerritory?.id === t.id ? "bg-accent/10 text-accent" : "text-text-main"
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: owner?.color || "#64748b" }}
                      title={owner?.name || "Нейтральная"}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Панель рисования новой территории */}
      {drawMode && isGM && (
        <div className="absolute top-16 left-28 z-30 panel p-3 space-y-2 w-72 shadow-xl">
          <div className="text-xs font-semibold text-accent">
            Новая территория (точек: {drawPoints.length})
          </div>
          <input
            className="input text-xs"
            placeholder="Название территории"
            value={newTerritoryName}
            onChange={(e) => setNewTerritoryName(e.target.value)}
          />
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (!drawPoints.length) return;
                const last = drawPoints[drawPoints.length - 1];
                setDrawPoints((p) => p.slice(0, -1));
                setRedoPoints((r) => [...r, last]);
              }}
              disabled={drawPoints.length === 0}
              className="btn-ghost text-xs py-1 px-2 flex items-center gap-1 disabled:opacity-40"
              title="Отменить (Undo)"
            >
              <Undo2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                if (!redoPoints.length) return;
                const next = redoPoints[redoPoints.length - 1];
                setRedoPoints((r) => r.slice(0, -1));
                setDrawPoints((p) => [...p, next]);
              }}
              disabled={redoPoints.length === 0}
              className="btn-ghost text-xs py-1 px-2 flex items-center gap-1 disabled:opacity-40"
              title="Вернуть (Redo)"
            >
              <Redo2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setDrawPoints([]);
                setRedoPoints([]);
              }}
              disabled={drawPoints.length === 0}
              className="btn-ghost text-xs py-1 px-2 flex items-center gap-1 disabled:opacity-40"
              title="Сброс"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={handleSaveDrawnTerritory}
              disabled={drawPoints.length < 3 || !newTerritoryName.trim()}
              className="btn-primary text-xs py-1 px-2 flex items-center gap-1 disabled:opacity-40 ml-auto"
            >
              <Check className="w-3 h-3" /> Сохранить
            </button>
          </div>
          <div className="text-[10px] text-text-main/50">
            Кликайте по карте, чтобы поставить минимум 3 точки полигона.
          </div>
        </div>
      )}

      {/* Панель разделения территории */}
      {splitMode && isGM && selectedTerritory && (
        <div className="absolute top-16 left-28 z-30 panel p-3 space-y-2 w-72 shadow-xl">
          <div className="text-xs font-semibold text-accent">
            Разделить: {selectedTerritory.name}
          </div>
          <div className="text-[10px] text-text-main/60">
            Поставьте 2+ точки на карте, чтобы провести линию разреза через территорию.
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSplitPoints([])}
              disabled={splitPoints.length === 0}
              className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
            >
              Сброс
            </button>
            <button
              onClick={() => {
                setSplitMode(false);
                setSplitPoints([]);
              }}
              className="btn-ghost text-xs py-1 px-2"
            >
              Отмена
            </button>
            <button
              onClick={handleSplitTerritory}
              disabled={splitPoints.length < 2}
              className="btn-primary text-xs py-1 px-2 ml-auto flex items-center gap-1 disabled:opacity-40"
            >
              <Scissors className="w-3 h-3" /> Разделить
            </button>
          </div>
        </div>
      )}

      {/* Панель редактирования границ */}
      {editRingMode && isGM && selectedTerritory && (
        <div className="absolute top-16 left-28 z-30 panel p-3 space-y-2 w-72 shadow-xl">
          <div className="text-xs font-semibold text-accent">
            Границы: {selectedTerritory.name}
          </div>
          <div className="text-[10px] text-text-main/60">
            Перетаскивайте белые вершины полигона на карте.
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                if (!editHistory.length) return;
                const prev = editHistory[editHistory.length - 1];
                setEditFuture((f) => [editRingPoints, ...f]);
                setEditHistory((h) => h.slice(0, -1));
                setEditRingPoints(prev);
              }}
              disabled={editHistory.length === 0}
              className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
              title="Undo"
            >
              <Undo2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                if (!editFuture.length) return;
                const next = editFuture[0];
                setEditHistory((h) => [...h, editRingPoints]);
                setEditFuture((f) => f.slice(1));
                setEditRingPoints(next);
              }}
              disabled={editFuture.length === 0}
              className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
              title="Redo"
            >
              <Redo2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setEditRingMode(false);
                setEditRingPoints([]);
              }}
              className="btn-ghost text-xs py-1 px-2"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveEditedBoundaries}
              className="btn-primary text-xs py-1 px-2 ml-auto flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Управление подложкой */}
      {overlayUrl && isGM && (
        <div className="absolute bottom-12 left-4 z-30 panel px-3 py-2 flex items-center gap-2 text-xs">
          <span className="text-text-main/70">Подложка:</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            className="w-20"
          />
          <button
            onClick={() => setOverlayUrl(null)}
            className="text-error hover:underline"
            title="Убрать подложку"
          >
            Убрать
          </button>
        </div>
      )}

      {/* Переключатель 6 слоёв и базовой карты */}
      <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-1.5">
        <div className="flex flex-wrap gap-1 bg-panel/90 border border-[#2a3b52] rounded-lg p-1 max-w-[500px]">
          {(
            [
              { key: "political", label: "Политическая" },
              { key: "physical", label: "Физическая" },
              { key: "economic", label: "Экономическая" },
              { key: "diplomatic", label: "Дипломатическая" },
              { key: "events", label: "События" },
              { key: "control", label: "Контроль" },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              onClick={() => {
                setLayerMode(m.key);
                if (m.key === "physical" && basemap === "dark") setBasemap("physical");
              }}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                layerMode === m.key
                  ? "bg-accent text-white"
                  : "text-text-main/70 hover:text-text-main"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-panel/90 border border-[#2a3b52] rounded-lg p-1">
          <span className="text-[10px] text-text-main/50 px-1.5">Карта:</span>
          {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
            <button
              key={id}
              onClick={() => setBasemap(id)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                basemap === id
                  ? "bg-accent/20 text-accent border border-accent/40"
                  : "text-text-main/60 hover:text-text-main"
              }`}
            >
              {BASEMAPS[id].label}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className="absolute bottom-10 right-4 z-30 text-xs text-text-main bg-panel/90 border border-[#2a3b52] px-3 py-1.5 rounded">
          {statusMsg}
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-30 text-[10px] text-text-main/70 bg-panel/85 border border-[#2a3b52] px-2.5 py-1 rounded flex items-center gap-3">
        <span>
          {drawMode
            ? "Режим рисования: кликните по карте для добавления точки"
            : mergeMode
              ? "Режим объединения: выберите две территории"
              : editRingMode
                ? "Режим правки границ: перетаскивайте вершины"
                : "Кликните на территорию для просмотра параметров"}
        </span>
        {cursorCoords && (
          <span className="font-mono text-text-main/50 border-l border-[#2a3b52] pl-2">
            {cursorCoords[0].toFixed(2)}°, {cursorCoords[1].toFixed(2)}°
          </span>
        )}
      </div>
    </div>
  );
}
