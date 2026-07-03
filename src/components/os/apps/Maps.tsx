import { useState } from "react";
import { Search, MapPin } from "lucide-react";

const PLACES = [
  { name: "Stockholm", lat: 59.3293, lon: 18.0686 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
  { name: "Nairobi", lat: -1.2921, lon: 36.8219 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
];

export function Maps() {
  const [place, setPlace] = useState(PLACES[0]);
  const [q, setQ] = useState("");
  const bbox = `${place.lon - 0.05},${place.lat - 0.03},${place.lon + 0.05},${place.lat + 0.03}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${place.lat},${place.lon}`;

  return (
    <div className="flex h-full">
      <aside className="w-52 border-r border-white/10 bg-black/30 p-3">
        <div className="mb-3 flex items-center gap-1 rounded-md bg-white/5 px-2">
          <Search className="size-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter" className="w-full bg-transparent py-1.5 text-xs outline-none" />
        </div>
        <ul className="space-y-1 text-sm">
          {PLACES.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).map((p) => (
            <li key={p.name}>
              <button onClick={() => setPlace(p)} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10 ${p.name === place.name ? "bg-primary/20 text-primary" : ""}`}>
                <MapPin className="size-3.5" />{p.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex-1">
        <iframe title="map" src={src} className="h-full w-full border-0" />
      </div>
    </div>
  );
}
