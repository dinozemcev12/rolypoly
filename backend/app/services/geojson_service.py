import json
import struct
from typing import Any, Dict, List, Optional


def _ring_to_wkt(ring: List[List[float]]) -> str:
    return "(" + ", ".join(f"{pt[0]} {pt[1]}" for pt in ring) + ")"


def _polygon_to_wkt(coords: List[List[List[float]]]) -> str:
    return "(" + ", ".join(_ring_to_wkt(r) for r in coords) + ")"


def geojson_to_multipolygon_dict(geom: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Нормализует Polygon -> MultiPolygon и проверяет базовую структуру GeoJSON."""
    if not geom or not isinstance(geom, dict):
        return None
    gtype = geom.get("type")
    coords = geom.get("coordinates")
    if not coords:
        return None
    if gtype == "Polygon":
        return {"type": "MultiPolygon", "coordinates": [coords]}
    if gtype == "MultiPolygon":
        return {"type": "MultiPolygon", "coordinates": coords}
    return geom


def geojson_to_wkt(geom: Optional[Dict[str, Any]]) -> Optional[str]:
    """Конвертирует GeoJSON Polygon/MultiPolygon в WKT для PostGIS (SRID 4326)."""
    norm = geojson_to_multipolygon_dict(geom)
    if not norm:
        return None
    gtype = norm.get("type")
    coords = norm.get("coordinates")
    if gtype == "MultiPolygon" and coords:
        polys = ", ".join(_polygon_to_wkt(poly) for poly in coords)
        return f"SRID=4326;MULTIPOLYGON({polys})"
    return None


def _read_wkb_multipolygon_or_polygon(raw: bytes) -> Optional[Dict[str, Any]]:
    """Минимальный парсер EWKB/WKB (Polygon/MultiPolygon) без shapely."""
    if not raw or len(raw) < 5:
        return None
    offset = 0

    def parse_geom() -> Optional[Dict[str, Any]]:
        nonlocal offset
        if offset >= len(raw):
            return None
        byte_order = raw[offset]
        endian = "<" if byte_order == 1 else ">"
        offset += 1
        geom_type = struct.unpack_from(endian + "I", raw, offset)[0]
        offset += 4
        has_srid = bool(geom_type & 0x20000000)
        base_type = geom_type & 0xFF
        if has_srid:
            offset += 4

        if base_type == 3:  # Polygon
            num_rings = struct.unpack_from(endian + "I", raw, offset)[0]
            offset += 4
            rings = []
            for _ in range(num_rings):
                num_pts = struct.unpack_from(endian + "I", raw, offset)[0]
                offset += 4
                pts = []
                for _ in range(num_pts):
                    x, y = struct.unpack_from(endian + "dd", raw, offset)
                    offset += 16
                    pts.append([x, y])
                rings.append(pts)
            return {"type": "Polygon", "coordinates": rings}

        if base_type == 6:  # MultiPolygon
            num_polys = struct.unpack_from(endian + "I", raw, offset)[0]
            offset += 4
            polys = []
            for _ in range(num_polys):
                sub = parse_geom()
                if sub and sub["type"] == "Polygon":
                    polys.append(sub["coordinates"])
            return {"type": "MultiPolygon", "coordinates": polys}

        return None

    return parse_geom()


def geometry_to_geojson(geom_value: Any) -> Optional[Dict[str, Any]]:
    """Универсальный сериализатор поля Territory.geometry -> GeoJSON dict."""
    if geom_value is None:
        return None
    if isinstance(geom_value, dict):
        return geom_value
    if isinstance(geom_value, str):
        try:
            return json.loads(geom_value)
        except Exception:
            return None
    # GeoAlchemy2 WKBElement
    data = getattr(geom_value, "data", None)
    if isinstance(data, (bytes, bytearray, memoryview)):
        return _read_wkb_multipolygon_or_polygon(bytes(data))
    return None
