import { useState, useEffect, useCallback } from "react";

// ─── Styles ────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --sun: #FFB830;
    --sun-pale: #FFE08A;
    --sky: #0F1923;
    --sky-mid: #1A2E42;
    --sky-light: #243B55;
    --accent: #00E5A0;
    --accent-dim: #00E5A033;
    --warn: #FF6B35;
    --text: #E8F4F8;
    --text-dim: #7FA3B8;
    --card: #162433;
    --card-border: #1E3448;
    --radius: 16px;
  }

  body { background: var(--sky); color: var(--text); font-family: 'DM Sans', sans-serif; }

  .app {
    min-height: 100vh;
    background:
      radial-gradient(ellipse at 20% 0%, #1a3a5c55 0%, transparent 60%),
      radial-gradient(ellipse at 80% 100%, #0d2a1a44 0%, transparent 60%),
      var(--sky);
    padding: 0 0 80px;
  }

  /* Header */
  .header {
    padding: 24px 20px 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header-title {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--sun);
    margin-bottom: 4px;
  }
  .header-location {
    font-size: 22px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.2;
  }
  .header-sub {
    font-size: 12px;
    color: var(--text-dim);
    margin-top: 2px;
  }
  .settings-btn {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    width: 42px; height: 42px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: var(--text-dim);
    font-size: 18px;
    transition: all 0.2s;
  }
  .settings-btn:hover { border-color: var(--sun); color: var(--sun); }

  /* Hero card */
  .hero {
    margin: 0 16px 20px;
    background: linear-gradient(135deg, #1c3a5a, #0e2235);
    border: 1px solid var(--card-border);
    border-radius: 24px;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 200px; height: 200px;
    background: radial-gradient(circle, #FFB83022 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .hero-value {
    font-size: 56px;
    font-weight: 300;
    color: var(--sun);
    line-height: 1;
    font-family: 'Space Mono', monospace;
  }
  .hero-unit { font-size: 20px; color: var(--sun-pale); }
  .hero-sub {
    margin-top: 8px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 16px;
    padding: 8px 14px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
  }
  .badge-great { background: #00E5A022; color: var(--accent); border: 1px solid #00E5A044; }
  .badge-ok    { background: #FFB83022; color: var(--sun); border: 1px solid #FFB83044; }
  .badge-poor  { background: #FF6B3522; color: var(--warn); border: 1px solid #FF6B3544; }
  .badge-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

  /* Section */
  .section { margin: 0 16px 20px; }
  .section-title {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 12px;
  }

  /* 7-day bar chart */
  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .day-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 10px 4px;
    border-radius: 14px;
    border: 1px solid transparent;
    transition: all 0.2s;
    background: var(--card);
  }
  .day-bar:hover { border-color: var(--card-border); }
  .day-bar.active { border-color: var(--sun); background: #1c3a5a; }
  .day-name {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-dim);
    font-family: 'Space Mono', monospace;
    text-transform: uppercase;
  }
  .day-bar.active .day-name { color: var(--sun); }
  .bar-wrap {
    width: 28px;
    height: 60px;
    background: #0d1e2e;
    border-radius: 6px;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
  }
  .bar-fill {
    width: 100%;
    border-radius: 6px 6px 0 0;
    transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .day-kwh {
    font-size: 10px;
    font-family: 'Space Mono', monospace;
    color: var(--text-dim);
  }
  .day-bar.active .day-kwh { color: var(--text); }

  /* Hourly chart */
  .hourly-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 8px;
    scrollbar-width: none;
  }
  .hourly-scroll::-webkit-scrollbar { display: none; }
  .hourly-track {
    display: flex;
    gap: 8px;
    min-width: max-content;
  }
  .hour-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 44px;
  }
  .hour-label {
    font-size: 10px;
    font-family: 'Space Mono', monospace;
    color: var(--text-dim);
  }
  .hour-bar-wrap {
    height: 80px;
    width: 28px;
    background: #0d1e2e;
    border-radius: 6px;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
  }
  .hour-bar-fill {
    width: 100%;
    border-radius: 6px 6px 0 0;
  }
  .hour-wh {
    font-size: 9px;
    font-family: 'Space Mono', monospace;
    color: var(--text-dim);
    text-align: center;
    line-height: 1.2;
  }

  /* Recommendation card */
  .rec-card {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    padding: 18px;
  }
  .rec-card.great { border-color: #00E5A044; }
  .rec-card.ok    { border-color: #FFB83044; }
  .rec-card.poor  { border-color: #FF6B3544; }
  .rec-title { font-weight: 600; font-size: 15px; margin-bottom: 6px; }
  .rec-body  { font-size: 13px; color: var(--text-dim); line-height: 1.6; }
  .rec-action {
    margin-top: 14px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .action-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 500;
    background: #0d1e2e;
    color: var(--text-dim);
    border: 1px solid var(--card-border);
  }

  /* Stats row */
  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }
  .stat-card {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    padding: 16px 12px;
    text-align: center;
  }
  .stat-val {
    font-family: 'Space Mono', monospace;
    font-size: 18px;
    color: var(--sun);
    font-weight: 700;
  }
  .stat-lbl {
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 4px;
    line-height: 1.3;
  }

  /* Settings panel */
  .panel-overlay {
    position: fixed; inset: 0;
    background: #00000088;
    z-index: 50;
    display: flex;
    align-items: flex-end;
    animation: fadeIn 0.2s;
  }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  .panel {
    background: #121e2a;
    border: 1px solid var(--card-border);
    border-radius: 24px 24px 0 0;
    padding: 24px 20px 40px;
    width: 100%;
    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
  .panel-handle {
    width: 40px; height: 4px;
    background: #2a3f54;
    border-radius: 2px;
    margin: 0 auto 20px;
  }
  .panel-title {
    font-family: 'Space Mono', monospace;
    font-size: 14px;
    letter-spacing: 1px;
    color: var(--sun);
    margin-bottom: 20px;
  }
  .field { margin-bottom: 16px; }
  .field label {
    display: block;
    font-size: 11px;
    font-family: 'Space Mono', monospace;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 8px;
  }
  .field input, .field select {
    width: 100%;
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 10px;
    padding: 12px 14px;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    outline: none;
    transition: border-color 0.2s;
  }
  .field input:focus, .field select:focus { border-color: var(--sun); }
  .field input[type=range] {
    padding: 8px 0;
    background: transparent;
    -webkit-appearance: none;
    border: none;
  }
  .field input[type=range]::-webkit-slider-track {
    height: 4px; background: var(--card-border); border-radius: 2px;
  }
  .field input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px; height: 20px;
    background: var(--sun);
    border-radius: 50%;
    margin-top: -8px;
    cursor: pointer;
  }
  .range-val {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    color: var(--sun);
    text-align: right;
    margin-top: 4px;
  }
  .btn-row { display: flex; gap: 10px; margin-top: 20px; }
  .btn-primary {
    flex: 1;
    padding: 14px;
    background: var(--sun);
    color: var(--sky);
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: opacity 0.2s;
  }
  .btn-primary:hover { opacity: 0.9; }
  .btn-secondary {
    padding: 14px 20px;
    background: var(--card);
    color: var(--text-dim);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    font-size: 14px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }

  /* Loading */
  .loading-wrap {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 60vh; gap: 16px;
  }
  .sun-spin {
    width: 60px; height: 60px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--sun) 40%, transparent 70%);
    box-shadow: 0 0 40px var(--sun);
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.15); opacity: 0.7; }
  }
  .loading-text { color: var(--text-dim); font-size: 13px; }

  /* Error */
  .error-card {
    margin: 20px 16px;
    background: #2a1515;
    border: 1px solid #5a2a2a;
    border-radius: var(--radius);
    padding: 20px;
    text-align: center;
  }
  .error-icon { font-size: 32px; margin-bottom: 8px; }
  .error-msg { color: var(--warn); font-size: 14px; }
  .error-retry {
    margin-top: 14px;
    padding: 10px 20px;
    background: var(--warn);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
  }

  /* GPS btn */
  .gps-btn {
    width: 100%;
    padding: 11px;
    margin-bottom: 12px;
    background: var(--accent-dim);
    color: var(--accent);
    border: 1px solid #00E5A044;
    border-radius: 10px;
    font-size: 13px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background 0.2s;
  }
  .gps-btn:hover { background: #00E5A033; }
`;

// ─── Constants ────────────────────────────────────────────────────────────
const DAYS_FR = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const ORIENTATIONS = [
  { value: 0,   label: "Nord (0°)" },
  { value: 45,  label: "Nord-Est (45°)" },
  { value: 90,  label: "Est (90°)" },
  { value: 135, label: "Sud-Est (135°)" },
  { value: 180, label: "Sud (180°) ← optimal" },
  { value: 225, label: "Sud-Ouest (225°)" },
  { value: 270, label: "Ouest (270°)" },
  { value: 315, label: "Nord-Ouest (315°)" },
];

const DEFAULT_CONFIG = {
  lat: 50.637,
  lon: 4.611,
  locationName: "Genval, Belgique",
  peakPower: 5,       // kWc
  azimuth: 180,       // sud
  tilt: 35,           // degrés
  efficiency: 0.80,   // 80%
};

// ─── Solar model ──────────────────────────────────────────────────────────
// Estimate PV output from GHI using simplified PVGIS model
// radiation: W/m², peakPower: kWc, tilt: deg, azimuth: deg
function estimateKwh(radiationWh, peakPower, efficiency) {
  // radiationWh is already Wh/m² for that hour from API (direct_normal_irradiance + diffuse_radiation)
  // Simplified: GHI * peakPower(kWp) * performance_ratio / 1000
  return (radiationWh * peakPower * efficiency) / 1000;
}

// ─── Recommendation logic ─────────────────────────────────────────────────
function getRecommendation(days) {
  if (!days.length) return null;
  const today = days[0];
  const best = [...days].sort((a, b) => b.totalKwh - a.totalKwh)[0];
  const todayRank = days.sort((a, b) => b.totalKwh - a.totalKwh).findIndex(d => d.date === today.date);

  const bestDayStr = DAYS_FR[new Date(best.date).getDay()];

  if (today.totalKwh >= best.totalKwh * 0.85) {
    return {
      quality: "great",
      icon: "⚡",
      title: "Aujourd'hui est optimal",
      body: `Excellente production prévue aujourd'hui (${today.totalKwh.toFixed(1)} kWh). C'est le bon moment pour charger votre voiture ou lancer vos gros appareils.`,
      actions: ["🚗 Charger VE", "🧺 Lave-linge", "🍽️ Lave-vaisselle"],
    };
  } else if (best.totalKwh > today.totalKwh * 1.3) {
    return {
      quality: "poor",
      icon: "⏳",
      title: `Attendre ${bestDayStr} sera plus rentable`,
      body: `La production de ${bestDayStr} sera ~${best.totalKwh.toFixed(1)} kWh vs ${today.totalKwh.toFixed(1)} kWh aujourd'hui. Décaler votre recharge de VE ou vos appareils gourmands pourrait vous faire économiser sur le réseau.`,
      actions: ["📅 Reporter au " + bestDayStr],
    };
  } else {
    return {
      quality: "ok",
      icon: "🌤️",
      title: "Production correcte cette semaine",
      body: `La production sera stable autour de ${today.totalKwh.toFixed(1)}–${best.totalKwh.toFixed(1)} kWh/jour. ${bestDayStr} sera légèrement meilleur si vous souhaitez maximiser l'autoconsommation.`,
      actions: ["🚗 Charger VE", "🔌 Autoconsommation"],
    };
  }
}

// ─── API fetch ────────────────────────────────────────────────────────────
async function fetchSolarForecast(lat, lon, peakPower, efficiency) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);
  url.searchParams.set("hourly", "direct_radiation,diffuse_radiation,shortwave_radiation");
  url.searchParams.set("daily", "sunrise,sunset,shortwave_radiation_sum");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "Europe/Brussels");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();

  // Process hourly → daily kWh
  const times = data.hourly.time;
  const ghi = data.hourly.shortwave_radiation; // W/m²

  const dailyMap = {};
  for (let i = 0; i < times.length; i++) {
    const dateStr = times[i].substring(0, 10);
    const hour = parseInt(times[i].substring(11, 13));
    const kwh = estimateKwh(ghi[i] ?? 0, peakPower, efficiency); // hourly Wh/m² → kWh
    if (!dailyMap[dateStr]) dailyMap[dateStr] = { totalKwh: 0, hours: [] };
    dailyMap[dateStr].totalKwh += kwh;
    dailyMap[dateStr].hours.push({ hour, ghi: ghi[i] ?? 0, kwh });
  }

  // Add sunrise/sunset
  for (let i = 0; i < data.daily.time.length; i++) {
    const d = data.daily.time[i];
    if (dailyMap[d]) {
      dailyMap[d].sunrise = data.daily.sunrise[i];
      dailyMap[d].sunset  = data.daily.sunset[i];
    }
  }

  return Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));
}

// ─── Component ───────────────────────────────────────────────────────────
export default function SolarForecastPWA() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [draftConfig, setDraftConfig] = useState(DEFAULT_CONFIG);
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = useCallback(async (cfg) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSolarForecast(cfg.lat, cfg.lon, cfg.peakPower, cfg.efficiency);
      setDays(result);
      setSelectedDay(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(config); }, [config]);

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraftConfig(d => ({
          ...d,
          lat: parseFloat(pos.coords.latitude.toFixed(4)),
          lon: parseFloat(pos.coords.longitude.toFixed(4)),
          locationName: "Ma position GPS",
        }));
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const handleSave = () => {
    setConfig(draftConfig);
    setShowSettings(false);
  };

  const maxKwh = Math.max(...days.map(d => d.totalKwh), 0.1);
  const sel = days[selectedDay];
  const rec = days.length ? getRecommendation([...days]) : null;

  // Bar color based on % of max
  const barColor = (kwh) => {
    const pct = kwh / maxKwh;
    if (pct > 0.7) return "#FFB830";
    if (pct > 0.4) return "#FFD580";
    return "#3a5a7a";
  };

  const maxHourKwh = sel ? Math.max(...sel.hours.map(h => h.kwh), 0.001) : 1;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* Header */}
        <div className="header">
          <div>
            <div className="header-title">☀ Solar Forecast</div>
            <div className="header-location">{config.locationName}</div>
            <div className="header-sub">{config.peakPower} kWc · {config.tilt}° · {ORIENTATIONS.find(o=>o.value===config.azimuth)?.label.split(" ")[0]}</div>
          </div>
          <button className="settings-btn" onClick={() => { setDraftConfig(config); setShowSettings(true); }}>⚙</button>
        </div>

        {loading ? (
          <div className="loading-wrap">
            <div className="sun-spin" />
            <div className="loading-text">Chargement des prévisions…</div>
          </div>
        ) : error ? (
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <div className="error-msg">{error}</div>
            <button className="error-retry" onClick={() => load(config)}>Réessayer</button>
          </div>
        ) : (
          <>
            {/* Hero */}
            {sel && (
              <div className="hero">
                <div className="hero-label">Production estimée · {sel.date}</div>
                <div className="hero-value">
                  {sel.totalKwh.toFixed(1)}<span className="hero-unit"> kWh</span>
                </div>
                <div className="hero-sub">
                  {sel.sunrise && `🌅 ${sel.sunrise.substring(11,16)}`}
                  {sel.sunset && ` · 🌇 ${sel.sunset.substring(11,16)}`}
                </div>
                {rec && (
                  <div className={`hero-badge badge-${rec.quality}`}>
                    <div className="badge-dot" />
                    {rec.icon} {rec.title}
                  </div>
                )}
              </div>
            )}

            {/* 7-day bars */}
            <div className="section">
              <div className="section-title">Prévision 7 jours</div>
              <div className="days-grid">
                {days.map((d, i) => {
                  const date = new Date(d.date + "T12:00:00");
                  const dayName = DAYS_FR[date.getDay()];
                  const pct = d.totalKwh / maxKwh;
                  return (
                    <div
                      key={d.date}
                      className={`day-bar${i === selectedDay ? " active" : ""}`}
                      onClick={() => setSelectedDay(i)}
                    >
                      <div className="day-name">{i === 0 ? "Auj." : dayName}</div>
                      <div className="bar-wrap">
                        <div
                          className="bar-fill"
                          style={{
                            height: `${Math.max(pct * 100, 4)}%`,
                            background: i === selectedDay
                              ? `linear-gradient(to top, ${barColor(d.totalKwh)}, ${barColor(d.totalKwh)}99)`
                              : barColor(d.totalKwh) + "88",
                          }}
                        />
                      </div>
                      <div className="day-kwh">{d.totalKwh.toFixed(1)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hourly for selected day */}
            {sel && (
              <div className="section">
                <div className="section-title">Courbe horaire · {DAYS_FR[new Date(sel.date+"T12:00:00").getDay()]}</div>
                <div className="hourly-scroll">
                  <div className="hourly-track">
                    {sel.hours.filter(h => h.ghi > 0 || (h.hour >= 6 && h.hour <= 21)).map(h => (
                      <div key={h.hour} className="hour-col">
                        <div className="hour-label">{String(h.hour).padStart(2,"0")}h</div>
                        <div className="hour-bar-wrap">
                          <div
                            className="hour-bar-fill"
                            style={{
                              height: `${Math.max((h.kwh / maxHourKwh) * 100, h.kwh > 0 ? 3 : 0)}%`,
                              background: `linear-gradient(to top, #FFB830, #FFD58055)`,
                            }}
                          />
                        </div>
                        <div className="hour-wh">
                          {h.kwh > 0.01 ? (h.kwh * 1000).toFixed(0) + "Wh" : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="section">
              <div className="section-title">Résumé semaine</div>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-val">{days.reduce((s,d)=>s+d.totalKwh,0).toFixed(0)}</div>
                  <div className="stat-lbl">kWh total 7j</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val">{maxKwh.toFixed(1)}</div>
                  <div className="stat-lbl">kWh meilleur jour</div>
                </div>
                <div className="stat-card">
                  <div className="stat-val">{(days.reduce((s,d)=>s+d.totalKwh,0)/days.length).toFixed(1)}</div>
                  <div className="stat-lbl">kWh/j moyenne</div>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            {rec && (
              <div className="section">
                <div className="section-title">Recommandation</div>
                <div className={`rec-card ${rec.quality}`}>
                  <div className="rec-title">{rec.icon} {rec.title}</div>
                  <div className="rec-body">{rec.body}</div>
                  <div className="rec-action">
                    {rec.actions.map(a => (
                      <div key={a} className="action-chip">{a}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="panel-overlay" onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
            <div className="panel">
              <div className="panel-handle" />
              <div className="panel-title">⚙ Configuration installation</div>

              <button className="gps-btn" onClick={handleGPS} disabled={locating}>
                📍 {locating ? "Localisation…" : "Utiliser ma position GPS"}
              </button>

              <div className="field">
                <label>Nom du lieu</label>
                <input
                  value={draftConfig.locationName}
                  onChange={e => setDraftConfig(d=>({...d, locationName: e.target.value}))}
                  placeholder="ex: Genval, Belgique"
                />
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
                <div className="field">
                  <label>Latitude</label>
                  <input type="number" step="0.001"
                    value={draftConfig.lat}
                    onChange={e => setDraftConfig(d=>({...d, lat: parseFloat(e.target.value)}))}
                  />
                </div>
                <div className="field">
                  <label>Longitude</label>
                  <input type="number" step="0.001"
                    value={draftConfig.lon}
                    onChange={e => setDraftConfig(d=>({...d, lon: parseFloat(e.target.value)}))}
                  />
                </div>
              </div>

              <div className="field">
                <label>Puissance crête — {draftConfig.peakPower} kWc</label>
                <input type="range" min="0.5" max="30" step="0.5"
                  value={draftConfig.peakPower}
                  onChange={e => setDraftConfig(d=>({...d, peakPower: parseFloat(e.target.value)}))}
                />
                <div className="range-val">{draftConfig.peakPower} kWc</div>
              </div>

              <div className="field">
                <label>Inclinaison — {draftConfig.tilt}°</label>
                <input type="range" min="0" max="90" step="5"
                  value={draftConfig.tilt}
                  onChange={e => setDraftConfig(d=>({...d, tilt: parseInt(e.target.value)}))}
                />
                <div className="range-val">{draftConfig.tilt}°</div>
              </div>

              <div className="field">
                <label>Orientation (azimut)</label>
                <select value={draftConfig.azimuth} onChange={e => setDraftConfig(d=>({...d, azimuth: parseInt(e.target.value)}))}>
                  {ORIENTATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Performance ratio — {Math.round(draftConfig.efficiency * 100)}%</label>
                <input type="range" min="0.5" max="1" step="0.01"
                  value={draftConfig.efficiency}
                  onChange={e => setDraftConfig(d=>({...d, efficiency: parseFloat(e.target.value)}))}
                />
                <div className="range-val">{Math.round(draftConfig.efficiency * 100)}%</div>
              </div>

              <div className="btn-row">
                <button className="btn-secondary" onClick={() => setShowSettings(false)}>Annuler</button>
                <button className="btn-primary" onClick={handleSave}>Appliquer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
