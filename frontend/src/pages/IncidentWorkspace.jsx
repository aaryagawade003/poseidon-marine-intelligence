import { useEffect, useMemo, useState } from "react";
import { Calendar, Download, FileCheck2, History, MapPin, Ship, Sparkles, Waves, Wind } from "lucide-react";
import { MapContainer, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useCase } from "../context/CaseContext.jsx";
import { getCaseReportPdfUrl } from "../services/api.js";
import { getIncidentMetadata } from "../services/incidentRegistry.js";
import { BasemapLayer, OilSlickLayer, ForecastSlickLayer, DriftOverlaysLayer, AISVesselsLayer } from "../components/MapLayers.jsx";
import { CanvasVectorLayer } from "../components/CanvasVectorLayer.jsx";
import TimeMachine from "../components/TimeMachine.jsx";
import TechnicalProofModal from "../components/TechnicalProofModal.jsx";

function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center[0] === "number" && typeof center[1] === "number") {
      map.flyTo(center, zoom || 10, { duration: 1.1 });
    }
  }, [center, zoom, map]);
  return null;
}

const dimensionConfig = [
  ["Spatial proximity", "spatial_score"],
  ["Temporal alignment", "temporal_score"],
  ["Trajectory fit", "trajectory_score"],
  ["Behavioural signal", "behavioural_score"],
  ["Environmental fit", "environmental_score"],
];

function EvidenceBar({ label, value }) {
  const numeric = typeof value === "number" ? value : null;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-slate-200">{numeric == null ? "--" : `${Math.round(numeric)}%`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.max(0, Math.min(100, numeric ?? 0))}%` }} />
      </div>
    </div>
  );
}

function CandidateCard({ vessel, index, selected, onSelect }) {
  const score = vessel.correlation_score ?? vessel.score ?? vessel.probability;
  const evidence = vessel.evidence || [];
  const counterEvidence = vessel.counter_evidence || vessel.counterEvidence || [];
  return (
    <button onClick={onSelect} className={`w-full text-left rounded-xl border p-3 transition ${selected ? "border-cyan-400 bg-cyan-950/50" : "border-[#1a2d50] bg-[#0a1428] hover:border-cyan-700"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">{index + 1}</span>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{vessel.name || vessel.vessel_name || "Unnamed vessel"}</div>
            <div className="text-[10px] text-slate-500 font-mono">MMSI {vessel.mmsi || "--"} · {vessel.vessel_type || "Unknown type"}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-extrabold text-cyan-300">{typeof score === "number" ? `${Math.round(score)}%` : "--"}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">correlation</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {dimensionConfig.map(([label, key]) => <EvidenceBar key={key} label={label} value={vessel[key]} />)}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-lg bg-[#0d1a33] p-2"><span className="text-slate-500 block">Origin distance</span><b className="text-slate-200">{vessel.min_distance_km ?? vessel.origin_distance_km ?? "--"} km</b></div>
        <div className="rounded-lg bg-[#0d1a33] p-2"><span className="text-slate-500 block">Time alignment</span><b className="text-emerald-300">{vessel.time_gap_minutes != null ? `${Math.round(vessel.time_gap_minutes)} min` : "--"}</b></div>
      </div>

      {(evidence.length > 0 || counterEvidence.length > 0) && (
        <div className="mt-3 space-y-2 border-t border-slate-800 pt-2">
          {evidence.slice(0, 2).map((item, i) => <div key={`e-${i}`} className="text-[10px] text-slate-300"><span className="text-cyan-400 mr-1">+</span>{item}</div>)}
          {counterEvidence.slice(0, 1).map((item, i) => <div key={`c-${i}`} className="text-[10px] text-amber-300"><span className="mr-1">△</span>{item}</div>)}
        </div>
      )}
    </button>
  );
}

export default function IncidentWorkspace() {
  const { currentCase, casesList, loadCase, runAnalysis, isLoading, loadingStage, navigateTo } = useCase();
  const metadata = useMemo(() => getIncidentMetadata(currentCase?.case_id), [currentCase]);
  const [panel, setPanel] = useState("traffic");
  const [selectedMmsi, setSelectedMmsi] = useState(null);
  const [showWind, setShowWind] = useState(true);
  const [showCurrent, setShowCurrent] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [showTracks, setShowTracks] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [basemap, setBasemap] = useState("satellite");
  const [reportStatus, setReportStatus] = useState("");

  const detectionDate = useMemo(() => new Date(currentCase?.t0_timestamp || currentCase?.incident_date || "2025-05-25T04:15:00Z"), [currentCase]);
  const [selectedTime, setSelectedTime] = useState(detectionDate);
  useEffect(() => { setSelectedTime(detectionDate); setSelectedMmsi(null); }, [detectionDate]);

  const inputs = currentCase?.inputs || {};
  const satellite = inputs.satellite || {};
  const ais = inputs.ais || {};
  const analysis = currentCase?.analysis || {};
  const validation = currentCase?.validation || {};
  const candidates = useMemo(() => analysis?.attribution?.ranked || [], [analysis]);
  const selectedVessel = candidates.find((v) => String(v.mmsi) === String(selectedMmsi));
  const center = useMemo(() => [currentCase?.coordinates?.latitude ?? metadata?.latitude ?? 9.5, currentCase?.coordinates?.longitude ?? metadata?.longitude ?? 75.7667], [currentCase, metadata]);
  const zoom = currentCase?.map_zoom ?? metadata?.mapZoom ?? 10;

  async function exportReport() {
    if (!currentCase?.case_id) return;
    setReportStatus("Generating...");
    try {
      const response = await fetch(getCaseReportPdfUrl(currentCase.case_id));
      if (!response.ok) throw new Error("Report unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentCase.case_id}-poseidon-investigation.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setReportStatus("Report ready");
    } catch {
      setReportStatus("Run reconstruction first");
    } finally {
      setTimeout(() => setReportStatus(""), 3000);
    }
  }

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-[#030711] text-slate-200">
      <header className="z-30 flex min-h-14 items-center justify-between gap-3 border-b border-[#152541] bg-[#07101f]/95 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">POSEIDON · MARINE INTELLIGENCE</div>
            <div className="mt-0.5 text-xs font-semibold text-white">Incident Reconstruction Console</div>
          </div>
          <select value={currentCase?.case_id || ""} onChange={(e) => loadCase(e.target.value)} className="max-w-[250px] rounded-lg border border-[#1d355c] bg-[#0b172b] px-2.5 py-1.5 text-xs text-white outline-none">
            {casesList.map((item) => <option key={item.case_id} value={item.case_id}>{item.name} · {item.location}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateTo("copilot")} className="hidden md:flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-700/30 px-3 py-1.5 text-xs font-semibold text-cyan-100"><Sparkles size={14} /> Evidence Fusion</button>
          <button onClick={runAnalysis} disabled={isLoading} className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50"><Sparkles size={14} className={isLoading ? "animate-spin" : ""} /> {isLoading ? loadingStage || "Reconstructing" : "Run Reconstruction"}</button>
          <button onClick={exportReport} disabled={isLoading} className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-700/25 px-3 py-1.5 text-xs font-semibold text-emerald-200"><Download size={14} /> {reportStatus || "Investigation Report"}</button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <MapContainer center={center} zoom={zoom} minZoom={4} maxZoom={16} zoomControl={false} className="h-full w-full bg-[#02050b]">
            <MapViewController center={center} zoom={zoom} />
            <ZoomControl position="bottomleft" />
            <BasemapLayer basemap={basemap} />
            <CanvasVectorLayer showWind={showWind} showCurrent={showCurrent} />
            <OilSlickLayer polygon={satellite?.t0_spill?.polygon || analysis?.detection?.polygon} centroid={satellite?.t0_spill?.centroid || analysis?.detection?.centroid} selectedTime={selectedTime} detectionTime={detectionDate} />
            <ForecastSlickLayer centroid={satellite?.t0_spill?.centroid || analysis?.detection?.centroid} forecastData={analysis?.forecast} charData={satellite?.t0_spill} selectedTime={selectedTime} detectionTime={detectionDate} />
            <DriftOverlaysLayer hindcast={analysis?.hindcast} forecast={analysis?.forecast} origin={analysis?.hindcast?.probable_origin} corridor={analysis?.hindcast?.corridor} showBacktrack={showOrigin} showHindcast={showOrigin} showForecast={showForecast} selectedTime={selectedTime} detectionTime={detectionDate} />
            <AISVesselsLayer vessels={ais?.vessels || []} selectedMmsi={selectedMmsi} onSelectVessel={setSelectedMmsi} selectedTime={selectedTime} showTracks={showTracks} showMarkers={showVessels} isDemoMode={false} />
          </MapContainer>

          <div className="absolute left-3 top-3 z-[400] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 rounded-xl border border-[#1a2d4e] bg-[#071224]/95 p-1.5 text-xs shadow-2xl backdrop-blur">
            <button onClick={() => setShowWind(!showWind)} className={`rounded-lg px-2.5 py-1 ${showWind ? "border border-amber-500/40 bg-amber-500/15 text-amber-300" : "text-slate-500"}`}><Wind size={13} className="mr-1 inline" />Atmosphere</button>
            <button onClick={() => setShowCurrent(!showCurrent)} className={`rounded-lg px-2.5 py-1 ${showCurrent ? "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300" : "text-slate-500"}`}><Waves size={13} className="mr-1 inline" />Ocean Flow</button>
            <button onClick={() => setShowOrigin(!showOrigin)} className={`rounded-lg px-2.5 py-1 ${showOrigin ? "border border-red-500/40 bg-red-500/15 text-red-300" : "text-slate-500"}`}>Origin Trace</button>
            <button onClick={() => setShowForecast(!showForecast)} className={`rounded-lg px-2.5 py-1 ${showForecast ? "border border-sky-500/40 bg-sky-500/15 text-sky-300" : "text-slate-500"}`}>Drift Outlook</button>
            <button onClick={() => setShowTracks(!showTracks)} className={`rounded-lg px-2 py-1 ${showTracks ? "border border-purple-500/30 bg-purple-500/15 text-purple-300" : "text-slate-500"}`}>AIS Trails</button>
            <button onClick={() => setShowVessels(!showVessels)} className={`rounded-lg px-2 py-1 ${showVessels ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : "text-slate-500"}`}>Traffic</button>
            <select value={basemap} onChange={(e) => setBasemap(e.target.value)} className="rounded-lg border border-[#1e345e] bg-[#0e1b36] px-2 py-1 text-xs text-slate-300"><option value="satellite">Satellite</option><option value="dark">Dark Chart</option><option value="osm">Navigation Map</option></select>
          </div>

          <div className="absolute left-3 top-[4.6rem] z-[400] rounded-lg border border-red-500/30 bg-[#080f1d]/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur">
            <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-red-400" /><span className="text-slate-400">Probable release origin</span><span className="font-mono font-bold text-amber-300">{analysis?.hindcast?.probable_origin?.latitude?.toFixed(4) || "--"}°N, {analysis?.hindcast?.probable_origin?.longitude?.toFixed(4) || "--"}°E</span></div>
            <div className="mt-1 pl-4 text-[9px] text-slate-500">Estimated from backward drift reconstruction · uncertainty ± {analysis?.hindcast?.uncertainty_radius_km ?? "--"} km</div>
          </div>

          <div className="absolute bottom-24 left-4 z-[400] hidden rounded-xl border border-[#1a2e54] bg-[#07101f]/92 px-3 py-2 text-[10px] shadow-xl backdrop-blur lg:block">
            <div className="mb-1 border-b border-slate-700/60 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-300">Reconstruction layers</div>
            <div><span className="text-red-300">■</span> observed slick</div>
            <div><span className="text-amber-300">→</span> atmospheric forcing</div>
            <div><span className="text-cyan-300">→</span> ocean surface flow</div>
            <div><span className="text-slate-300">···</span> reconstructed drift corridor</div>
            <div><span className="text-purple-300">—</span> historical AIS trail</div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 z-[400]"><TimeMachine detectionTime={detectionDate} selectedTime={selectedTime} onTimeChange={setSelectedTime} /></div>
        </main>

        <aside className="z-20 flex w-[390px] shrink-0 flex-col border-l border-[#142641] bg-[#060d1b]/96 shadow-2xl backdrop-blur-xl xl:w-[430px]">
          <div className="border-b border-[#142641] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">Marine incident</div><h1 className="mt-1 text-sm font-bold text-white">{currentCase?.name || "Untitled incident"}</h1><div className="mt-1 flex flex-wrap gap-3 text-[10px] text-slate-500"><span><Calendar size={11} className="mr-1 inline" />{currentCase?.incident_date?.slice(0, 10) || "--"}</span><span><MapPin size={11} className="mr-1 inline" />{currentCase?.location || "Unknown area"}</span></div></div>
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-right"><div className="text-sm font-bold text-cyan-300">{candidates.length}</div><div className="text-[8px] uppercase text-slate-500">AIS candidates</div></div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-b border-[#142641] bg-[#050a14]">
            {[ ["traffic", "Traffic Review", Ship], ["origin", "Origin & Drift", History], ["quality", "Data Quality", FileCheck2] ].map(([id, label, Icon]) => <button key={id} onClick={() => setPanel(id)} className={`border-b-2 px-2 py-3 text-[10px] font-bold uppercase tracking-wider ${panel === id ? "border-cyan-400 bg-[#0b1830] text-cyan-300" : "border-transparent text-slate-500"}`}><Icon size={13} className="mx-auto mb-1" />{label}</button>)}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {panel === "traffic" && <div className="space-y-3">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3"><div className="text-xs font-semibold text-cyan-200">Traffic correlation</div><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Historical AIS traffic is filtered around the reconstructed release window. The indicators below describe correlation evidence, not proof of responsibility.</p></div>
              {candidates.length === 0 ? <div className="rounded-xl border border-[#162a4b] bg-[#0a1428] p-5 text-center text-xs text-slate-500">No vessel correlation is available yet. Run <b className="text-cyan-300">Run Reconstruction</b> after source data is loaded.</div> : candidates.map((vessel, index) => <CandidateCard key={vessel.mmsi || index} vessel={vessel} index={index} selected={String(selectedMmsi) === String(vessel.mmsi)} onSelect={() => setSelectedMmsi(vessel.mmsi)} />)}
              {selectedVessel && <div className="rounded-xl border border-[#21406d] bg-[#08152a] p-3"><div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Selected vessel trace</div><div className="mt-1 text-xs font-bold text-white">{selectedVessel.name || selectedVessel.vessel_name || "Unnamed vessel"}</div><div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><div><span className="text-slate-500">MMSI</span><div className="font-mono text-slate-200">{selectedVessel.mmsi || "--"}</div></div><div><span className="text-slate-500">Correlation</span><div className="font-mono text-cyan-300">{selectedVessel.correlation_score ?? selectedVessel.score ?? "--"}%</div></div></div></div>}
            </div>}

            {panel === "origin" && <div className="space-y-3">
              <section className="rounded-xl border border-[#1b3155] bg-[#0a1428] p-3"><div className="text-xs font-bold text-sky-300">Slick profile</div><div className="mt-1 text-[10px] text-slate-400">Satellite-derived geometry used as the initial condition for reconstruction.</div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono"><div className="rounded bg-[#0d1a33] p-2">Area <b className="block text-white">{satellite?.t0_spill?.area_km2 ?? "--"} km²</b></div><div className="rounded bg-[#0d1a33] p-2">Perimeter <b className="block text-white">{satellite?.t0_spill?.perimeter_km ?? "--"} km</b></div><div className="rounded bg-[#0d1a33] p-2">Length <b className="block text-white">{satellite?.t0_spill?.length_km ?? "--"} km</b></div><div className="rounded bg-[#0d1a33] p-2">Width <b className="block text-white">{satellite?.t0_spill?.width_km ?? "--"} km</b></div></div></section>
              <section className="rounded-xl border border-red-500/25 bg-red-950/15 p-3"><div className="flex justify-between"><div className="text-xs font-bold text-red-300">Release origin estimate</div><span className="text-[9px] uppercase text-amber-300">hindcast</span></div><div className="mt-3 space-y-2 text-[10px] font-mono"><div className="flex justify-between"><span className="text-slate-500">Coordinates</span><span className="text-white">{analysis?.hindcast?.probable_origin?.latitude?.toFixed(4) || "--"}°, {analysis?.hindcast?.probable_origin?.longitude?.toFixed(4) || "--"}°</span></div><div className="flex justify-between"><span className="text-slate-500">Time</span><span className="text-sky-300">{analysis?.hindcast?.probable_origin?.time || "--"}</span></div><div className="flex justify-between"><span className="text-slate-500">Uncertainty</span><span className="text-amber-300">± {analysis?.hindcast?.uncertainty_radius_km ?? "--"} km</span></div></div></section>
              <section className="rounded-xl border border-sky-500/20 bg-sky-950/10 p-3"><div className="text-xs font-bold text-sky-300">Drift outlook</div><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Forward projection estimates the likely movement corridor under the supplied ocean and atmospheric conditions.</p></section>
            </div>}

            {panel === "quality" && <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-3"><div className="text-xs font-bold text-emerald-300">Evidence quality</div><p className="mt-1 text-[10px] text-slate-400">Keep model outputs traceable to their source data and uncertainty. Missing metrics remain blank rather than being invented.</p></div>
              <div className="rounded-xl border border-[#1b3155] bg-[#0a1428] p-3"><div className="text-xs font-bold text-cyan-300">Slick detection</div><div className="mt-3 grid grid-cols-2 gap-2 text-center font-mono">{[["IoU", validation?.iou], ["Dice", validation?.dice], ["Precision", validation?.precision], ["Recall", validation?.recall]].map(([label, value]) => <div key={label} className="rounded-lg bg-[#0d1a33] p-2"><span className="block text-[9px] text-slate-500">{label}</span><b className="text-sm text-slate-200">{value ?? "--"}</b></div>)}</div></div>
              <div className="rounded-xl border border-[#1b3155] bg-[#0a1428] p-3"><div className="text-xs font-bold text-slate-200">Reconstruction diagnostics</div><div className="mt-3 space-y-2 text-[10px] font-mono"><div className="flex justify-between"><span className="text-slate-500">Origin error</span><span className="text-emerald-300">{validation?.origin_error_km ?? "--"} km</span></div><div className="flex justify-between"><span className="text-slate-500">Forecast error</span><span className="text-sky-300">{validation?.forecast_error_km ?? "--"} km</span></div><div className="flex justify-between"><span className="text-slate-500">AIS top match</span><span className="text-cyan-300">{validation?.ais_top1 ?? "--"}</span></div></div></div>
            </div>}
          </div>
        </aside>
      </div>
      <div className="hidden"><TechnicalProofModal /></div>
    </div>
  );
}
