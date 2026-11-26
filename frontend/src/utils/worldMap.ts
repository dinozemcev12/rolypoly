import { feature } from "topojson-client";
import countries50m from "world-atlas/countries-50m.json";

let cachedWorldCountries: GeoJSON.FeatureCollection | null = null;

export function getWorldCountriesGeoJSON(): GeoJSON.FeatureCollection {
  if (cachedWorldCountries) return cachedWorldCountries;
  const topo = countries50m as any;
  cachedWorldCountries = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
  return cachedWorldCountries;
}
