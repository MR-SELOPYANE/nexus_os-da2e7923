import { useEffect, useState } from "react";
import {
  Search,
  MapPin,
  Loader2,
  Wind,
  Droplets,
  Eye,
  Thermometer,
  Sunrise,
  Sunset,
  CloudSun,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GeoResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

interface WmoCode {
  label: string;
  icon: string;
}

const WMO: Record<number, WmoCode> = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅️" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌦️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm + hail", icon: "⛈️" },
  99: { label: "Severe thunderstorm", icon: "⛈️" },
};

const SA_CITIES: GeoResult[] = [
  { id: 1, name: "Johannesburg", country: "South Africa", admin1: "Gauteng", latitude: -26.2041, longitude: 28.0473 },
  { id: 2, name: "Cape Town", country: "South Africa", admin1: "Western Cape", latitude: -33.9249, longitude: 18.4241 },
  { id: 3, name: "Durban", country: "South Africa", admin1: "KwaZulu-Natal", latitude: -29.8587, longitude: 31.0218 },
  { id: 4, name: "Pretoria", country: "South Africa", admin1: "Gauteng", latitude: -25.7479, longitude: 28.2293 },
  { id: 5, name: "Port Elizabeth", country: "South Africa", admin1: "Eastern Cape", latitude: -33.9608, longitude: 25.6022 },
  { id: 6, name: "Bloemfontein", country: "South Africa", admin1: "Free State", latitude: -29.1197, longitude: 26.2136 },
  { id: 7, name: "Polokwane", country: "South Africa", admin1: "Limpopo", latitude: -23.9045, longitude: 29.4689 },
  { id: 8, name: "Nelspruit", country: "South Africa", admin1: "Mpumalanga", latitude: -25.4658, longitude: 30.9785 },
  { id: 9, name: "Kimberley", country: "South Africa", admin1: "Northern Cape", latitude: -28.7282, longitude: 24.7499 },
  { id: 10, name: "Mafikeng", country: "South Africa", admin1: "North West", latitude: -25.866, longitude: 25.6545 },
];

interface Current {
  temperature: number;
  windspeed: number;
  weathercode: number;
  apparent: number;
  humidity: number;
  is_day: number;
  precipitation: number;
}

interface Daily {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  sunrise: string[];
  sunset: string[];
  precipitation_sum: number[];
  windspeed_10m_max: number[];
}

interface Forecast {
  current: Current;
  daily: Daily;
}

export function Weather() {
  const [loc, setLoc] = useState<GeoResult>(SA_CITIES[0]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch weather for current location
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,apparent_temperature,is_day,precipitation,weather_code,relative_humidity_2m,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (cancel) return;
        setError("Could not fetch weather. Check your connection.");
        setLoading(false);
      });
    return () => { cancel = true; };
  }, [loc]);

  const doSearch = () => {
    if (!query.trim()) return;
    setSearching(true);
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`)
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results ?? []);
        setSearching(false);
      })
      .catch(() => setSearching(false));
  };

  const wmo = (code: number) => WMO[code] ?? { label: "—", icon: "🌡️" };
  const cur = data?.current;

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Search bar */}
      <div className="border-b border-border/60 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Search any city worldwide…"
            className="w-full rounded-lg border border-input bg-black/30 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {results.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover os-scroll">
            {results.map((r) => (
              <button
                key={`${r.id}-${r.name}`}
                onClick={() => {
                  setLoc(r);
                  setResults([]);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/5"
              >
                <MapPin className="size-3.5 text-primary" />
                <span>{r.name}</span>
                {r.admin1 && <span className="text-muted-foreground">, {r.admin1}</span>}
                <span className="text-muted-foreground">, {r.country}</span>
              </button>
            ))}
          </div>
        )}
        {searching && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Searching…</p>}
      </div>

      {/* Quick city chips */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border/60 px-3 py-2 os-scroll">
        {SA_CITIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setLoc(c)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs transition-colors",
              loc.id === c.id ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto os-scroll p-4">
        {loading && (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
        {error && <p className="text-sm text-rose-400">{error}</p>}
        {cur && data && (
          <>
            {/* Current */}
            <div className="rounded-2xl border border-border bg-gradient-to-br from-sky-500/15 to-indigo-600/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{loc.admin1 ? `${loc.admin1}, ${loc.country}` : loc.country}</div>
                  <div className="text-2xl font-semibold">{loc.name}</div>
                </div>
                <div className="text-5xl">{wmo(cur.weathercode).icon}</div>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-bold">{Math.round(cur.temperature)}°</span>
                <span className="mb-1 text-sm text-muted-foreground">C</span>
              </div>
              <p className="text-sm text-muted-foreground">{wmo(cur.weathercode).label}</p>
              <p className="text-xs text-muted-foreground">Feels like {Math.round(cur.apparent)}°C</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat icon={Droplets} label="Humidity" value={`${cur.humidity}%`} />
                <Stat icon={Wind} label="Wind" value={`${Math.round(cur.windspeed)} km/h`} />
                <Stat icon={CloudSun} label="Precip." value={`${cur.precipitation} mm`} />
                <Stat icon={Thermometer} label="Feels" value={`${Math.round(cur.apparent)}°C`} />
              </div>
            </div>

            {/* Sun */}
            {data.daily.sunrise?.[0] && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <SunStat icon={Sunrise} label="Sunrise" value={data.daily.sunrise[0].slice(11, 16)} />
                <SunStat icon={Sunset} label="Sunset" value={data.daily.sunset[0].slice(11, 16)} />
              </div>
            )}

            {/* 7-day forecast */}
            <div className="mt-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">7-day forecast</h3>
              <div className="space-y-1.5">
                {data.daily.time.slice(0, 7).map((t, i) => {
                  const d = new Date(t);
                  const day = i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" });
                  return (
                    <div key={t} className="flex items-center gap-3 rounded-lg border border-border bg-black/10 px-3 py-2">
                      <span className="w-12 text-sm font-medium">{day}</span>
                      <span className="text-xl">{wmo(data.daily.weathercode[i]).icon}</span>
                      <span className="flex-1 text-xs text-muted-foreground">{wmo(data.daily.weathercode[i]).label}</span>
                      <span className="text-sm text-muted-foreground">{Math.round(data.daily.temperature_2m_min[i])}°</span>
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-orange-400"
                          style={{
                            width: `${Math.max(8, ((data.daily.temperature_2m_max[i] - data.daily.temperature_2m_min[i]) / 25) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{Math.round(data.daily.temperature_2m_max[i])}°</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
        {!loading && !data && !error && (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Eye className="mr-2 size-4" /> Waiting for data…
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Wind; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-black/20 p-2">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

function SunStat({ icon: Icon, label, value }: { icon: typeof Wind; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-black/10 px-3 py-2">
      <Icon className="size-4 text-amber-400" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-medium">{value}</span>
    </div>
  );
}
