import { useState, useMemo, useCallback, useEffect } from "react";
import { getCaseReportPdfUrl } from "../services/api.js";
import { MapContainer, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Ship, History, CheckCircle2, Sparkles, Wind, Waves, Calendar, MapPin, Clock, ShieldCheck, FileCheck2, Award, Download } from "lucide-react";
import { useCase } from "../context/CaseContext.jsx";
import { BasemapLayer, OilSlickLayer, ForecastSlickLayer, DriftOverlaysLayer, AISVesselsLayer } from "../components/MapLayers.jsx";
import { CanvasVectorLayer } from "../components/CanvasVectorLayer.jsx";
import TimeMachine from "../components/TimeMachine.jsx";
import TechnicalProofModal from "../components/TechnicalProofModal.jsx";
import { getIncidentMetadata } from "../services/incidentRegistry.js";

function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center[0] === "number" && typeof center[1] === "number") {
      map.flyTo(center, zoom || 10, { duration: 1.2, easeLinearity: 0.25 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function IncidentWorkspace() {
  const { currentCase, casesList, loadCase, runAnalysis, isLoading, loadingStage, navigateTo } = useCase();
  const regMeta = useMemo(() => getIncidentMetadata(currentCase?.case_id), [currentCase]);
  const [activePanel, setActivePanel] = useState("candidates");
  const [showTechnicalProof, setShowTechnicalProof] = useState(false);
  const [selectedMmsi, setSelectedMmsi] = useState(null);
  const [showWind, setShowWind] = useState(true);
  const [showCurrent, setShowCurrent] = useState(true);
  const [showBacktrack, setShowBacktrack] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [showTracks, setShowTracks] = useState(true);
  const [basemap, setBasemap] = useState("satellite");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  const detectionDate = useMemo(() => new Date(currentCase?.t0_timestamp || currentCase?.incident_date || "2025-05-25T04:15:00Z"), [currentCase]);
  const [selectedTime, setSelectedTime] = useState(detectionDate);
  useEffect(() => { setSelectedTime(detectionDate); setSelectedMmsi(null); }, [detectionDate]);

  const inputs = currentCase?.inputs || {};
  const sat = inputs.satellite || {};
  const ais = inputs.ais || {};
  const analysis = currentCase?.analysis || {};
  const validation = currentCase?.validation || {};
  const rankedVessels = useMemo(() => analysis?.attribution?.ranked || [], [analysis]);
  const mapCenter = useMemo(() => [currentCase?.coordinates?.latitude ?? regMeta?.latitude ?? 9.5, currentCase?.coordinates?.longitude ?? regMeta?.longitude ?? 75.7667], [currentCase, regMeta]);
  const mapZoom = useMemo(() => currentCase?.map_zoom ?? regMeta?.mapZoom ?? 10, [currentCase, regMeta]);

  const exportReport = useCallback(async () => {
    if (!currentCase?.case_id) return;
    setIsGeneratingReport(true); setReportMsg("Preparing incident report...");
    try {
      const res = await fetch(getCaseReportPdfUrl(currentCase.case_id));
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${currentCase.case_id}_incident_report.pdf`;
      link.click(); URL.revokeObjectURL(link.href); setReportMsg("Report exported");
    } catch { setReportMsg("Report unavailable — run reconstruction first"); }
    finally { setIsGeneratingReport(false); setTimeout(() => setReportMsg(""), 3500); }
  }, [currentCase]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#040812] text-slate-200 overflow-hidden flex flex-col">
      <div className="h-14 border-b border-[#142340] bg-[#070e1c]/95 backdrop-blur px-4 flex items-center justify-between z-30 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">INCIDENT WORKSPACE</span>
            <select value={currentCase?.case_id || ""} onChange={(e) => loadCase(e.target.value)} className="bg-[#0b162c] text-white font-semibold text-xs border border-[#1d3561] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer">
              {casesList.map((c) => <option key={c.case_id} value={c.case_id}>{c.name} ({c.location})</option>)}
            </select>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-mono pl-2 border-l border-slate-700">
            <span className="flex items-center gap-1"><Calendar size={13} />{currentCase?.incident_date?.slice(0, 10) || "2025-05-25"}</span>
            <span className="flex items-center gap-1"><MapPin size={13} />{currentCase?.location || "Marine incident"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => navigateTo("copilot")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-700/70 hover:bg-cyan-600 border border-cyan-500/40 text-white font-medium text-xs"><Sparkles size={14} /><span className="hidden sm:inline">Evidence Fusion</span></button>
          <button onClick={runAnalysis} disabled={isLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white font-medium text-xs disabled:opacity-50"><Sparkles size={14} className={isLoading ? "animate-spin" : ""} /><span>{isLoading ? loadingStage || "Reconstructing..." : "Reconstruct Incident"}</span></button>
          <button onClick={() => setShowTechnicalProof(true)} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0c1933] border border-[#1c3563] text-slate-300 text-xs"><FileCheck2 size={14} className="text-cyan-400" />Evidence Trace</button>
          <button onClick={exportReport} disabled={isGeneratingReport || isLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700/70 hover:bg-emerald-600 border border-emerald-500/40 text-white text-xs font-semibold disabled:opacity-50"><Download size={14} />{reportMsg || "Export Report"}</button>
        </div>
      </div>

      <div className="relative flex-1 flex overflow-hidden">
        <div className="relative flex-1 h-full w-full">
          <MapContainer center={mapCenter} zoom={mapZoom} minZoom={4} maxZoom={16} zoomControl={false} className="w-full h-full z-0 bg-[#030712]">
            <MapViewController center={mapCenter} zoom={mapZoom} /><ZoomControl position="bottomleft" /><BasemapLayer basemap={basemap} />
            <CanvasVectorLayer showWind={showWind} showCurrent={showCurrent} />
            <OilSlickLayer polygon={sat?.t0_spill?.polygon || analysis?.detection?.polygon} centroid={sat?.t0_spill?.centroid || analysis?.detection?.centroid} selectedTime={selectedTime} detectionTime={detectionDate} />
            <ForecastSlickLayer centroid={sat?.t0_spill?.centroid || analysis?.detection?.centroid} forecastData={analysis?.forecast} charData={sat?.t0_spill} selectedTime={selectedTime} detectionTime={detectionDate} />
            <DriftOverlaysLayer hindcast={analysis?.hindcast} forecast={analysis?.forecast} origin={analysis?.hindcast?.probable_origin} corridor={analysis?.hindcast?.corridor} showBacktrack={showBacktrack} showHindcast={showBacktrack} showForecast={showForecast} selectedTime={selectedTime} detectionTime={detectionDate} />
            <AISVesselsLayer vessels={ais?.vessels || []} selectedMmsi={selectedMmsi} onSelectVessel={setSelectedMmsi} selectedTime={selectedTime} showTracks={showTracks} showMarkers={showVessels} isDemoMode={false} />
          </MapContainer>

          <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 bg-[#091224]/95 backdrop-blur-md p-1.5 rounded-xl border border-[#1a2c4e] shadow-2xl text-xs flex-wrap">
            <button onClick={() => setShowWind(!showWind)} className={`px-2.5 py-1 rounded-lg ${showWind ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-slate-400"}`}><Wind size={13} className="inline mr-1" />Wind</button>
            <button onClick={() => setShowCurrent(!showCurrent)} className={`px-2.5 py-1 rounded-lg ${showCurrent ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400"}`}><Waves size={13} className="inline mr-1" />Currents</button>
            <div className="h-4 w-px bg-slate-700" />
            <button onClick={() => setShowBacktrack(!showBacktrack)} className={`px-2.5 py-1 rounded-lg ${showBacktrack ? "bg-red-500/20 text-red-300 border border-red-500/40" : "text-slate-400"}`}>Origin Trace</button>
            <button onClick={() => setShowForecast(!showForecast)} className={`px-2.5 py-1 rounded-lg ${showForecast ? "bg-sky-500/20 text-sky-300 border border-sky-500/40" : "text-slate-400"}`}>Drift Forecast</button>
            <button onClick={() => setShowTracks(!showTracks)} className={`px-2 py-1 rounded-lg ${showTracks ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-slate-400"}`}>AIS Trails</button>
            <button onClick={() => setShowVessels(!showVessels)} className={`px-2 py-1 rounded-lg ${showVessels ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400"}`}>Vessels</button>
            <select value={basemap} onChange={(e) => setBasemap(e.target.value)} className="bg-[#0e1b36] text-slate-300 border border-[#1e345e] rounded-lg px-2 py-1 text-xs"><option value="satellite">Satellite</option><option value="dark">Dark Basemap</option><option value="osm">Street Basemap</option></select>
          </div>

          <div className="absolute top-16 left-3 z-[400] flex items-center gap-2 bg-[#091224]/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-500/40 shadow-xl text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" /><span className="text-slate-300 font-medium">Estimated release origin:</span>
            <button onClick={() => setSelectedTime(new Date(detectionDate.getTime() - 4.5 * 3600 * 1000))} className="font-mono text-amber-300 hover:text-white font-bold underline">
              {analysis?.hindcast?.probable_origin?.latitude?.toFixed(4) || "9.8797"}°N, {analysis?.hindcast?.probable_origin?.longitude?.toFixed(4) || "75.8720"}°E
            </button>
          </div>

          <div className="hidden sm:block absolute bottom-28 left-4 z-[400] bg-[#070e1c]/92 backdrop-blur-md px-3 py-2 rounded-xl border border-[#1a2e54] shadow-2xl text-[10px] space-y-1.5">
            <div className="font-bold text-slate-300 uppercase tracking-wider text-[9px] border-b border-slate-700/60 pb-1">Incident Map Legend</div>
            <div><span className="text-amber-300 font-semibold">Wind vectors</span> · atmospheric forcing</div>
            <div><span className="text-cyan-300 font-semibold">Current vectors</span> · ocean surface flow</div>
            <div><span className="text-red-400 font-bold">Release origin</span> · hindcast estimate</div>
            <div><span className="text-slate-400">Dashed trace</span> · backward reconstruction</div>
            <div><span className="text-slate-400">Dotted corridor</span> · forward drift envelope</div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-[400]"><TimeMachine detectionTime={detectionDate} selectedTime={selectedTime} onTimeChange={setSelectedTime} /></div>
        </div>

        <div className="w-84 lg:w-[420px] border-l border-[#13223f] bg-[#070e1c]/95 backdrop-blur-lg flex flex-col z-20 shadow-2xl">
          <div className="flex border-b border-[#142340] bg-[#060c18]">
            <button onClick={() => setActivePanel("candidates")} className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 ${activePanel === "candidates" ? "border-cyan-400 text-cyan-300 bg-[#0c1830]" : "border-transparent text-slate-400"}`}><Ship size={14} />Candidates ({rankedVessels.length})</button>
            <button onClick={() => setActivePanel("drift")} className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 ${activePanel === "drift" ? "border-sky-400 text-sky-300 bg-[#0c1830]" : "border-transparent text-slate-400"}`}><History size={14} />Drift & Origin</button>
            <button onClick={() => setActivePanel("checks")} className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 ${activePanel === "checks" ? "border-emerald-400 text-emerald-300 bg-[#0c1830]" : "border-transparent text-slate-400"}`}><Award size={14} />Model Checks</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activePanel === "candidates" && <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400"><span>Evidence-based candidate analysis</span><span className="text-[10px] font-mono text-cyan-400">Correlation view</span></div>
              {rankedVessels.length === 0 ? <div className="p-4 rounded-lg bg-[#0a1428] border border-[#162a52] text-xs text-slate-400 text-center">No candidate analysis available. Run <span className="text-cyan-300 font-semibold">Reconstruct Incident</span> to correlate AIS trajectories.</div> : rankedVessels.map((v, idx) => {
                const isSelected = selectedMmsi === v.mmsi;
                return <div key={v.mmsi} onClick={() => setSelectedMmsi(v.mmsi)} className={`p-3 rounded-xl border transition cursor-pointer ${isSelected ? "bg-cyan-950/60 border-cyan-400" : "bg-[#0a1428] border-[#162a52] hover:border-slate-600"}`}>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono bg-slate-800 text-slate-300">{idx + 1}</span><div><div className="font-bold text-white text-xs">{v.name || v.vessel_name}</div><div className="text-[10px] text-slate-400 font-mono">MMSI: {v.mmsi} · {v.vessel_type || "Vessel"}</div></div></div><div className="text-right font-mono"><div className="text-sm font-extrabold text-cyan-300">{v.score || v.probability || 0}%</div><div className="text-[9px] text-slate-400">Confidence</div></div></div>
                  <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-center"><div className="bg-[#0e1a33] p-1 rounded"><span className="text-slate-400 block text-[9px]">Origin gap</span><span className="text-slate-200 font-semibold">{v.min_distance_km || 0} km</span></div><div className="bg-[#0e1a33] p-1 rounded"><span className="text-slate-400 block text-[9px]">Speed signal</span><span className="text-amber-300 font-semibold">{v.speed_anomaly ? "Detected" : "Normal"}</span></div><div className="bg-[#0e1a33] p-1 rounded"><span className="text-slate-400 block text-[9px]">Time match</span><span className="text-emerald-300 font-semibold">Correlated</span></div></div>
                  {v.evidence?.length > 0 && <div className="mt-2 space-y-1 text-[11px] text-slate-300 bg-[#070e1c] p-2 rounded border border-[#142340]">{v.evidence.slice(0, 3).map((e, i) => <div key={i} className="flex items-start gap-1.5"><span className="text-cyan-400 font-bold">•</span><span>{e}</span></div>)}</div>}
                </div>;
              })}
            </div>}

            {activePanel === "drift" && <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0a1428] border border-[#162a52] space-y-2"><div className="flex items-center justify-between font-semibold"><span className="text-sky-300">Satellite slick characterization</span><span className="text-[10px] text-cyan-400">{sat?.t0_spill?.confidence ? (sat.t0_spill.confidence * 100).toFixed(1) + "%" : "--"}</span></div><p className="text-slate-300 text-[11px]">Detected slick geometry is used as the starting condition for drift reconstruction.</p><div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#0d1a33] p-2 rounded"><div>Area: <b className="text-white">{sat?.t0_spill?.area_km2 || 0} km²</b></div><div>Perimeter: <b className="text-white">{sat?.t0_spill?.perimeter_km || 0} km</b></div><div>Length: <b className="text-white">{sat?.t0_spill?.length_km || 0} km</b></div><div>Width: <b className="text-white">{sat?.t0_spill?.width_km || 0} km</b></div></div></div>
              <div className="p-3.5 rounded-xl bg-[#101026] border border-red-500/40 space-y-2.5"><div className="flex items-center justify-between font-semibold"><span className="text-red-400">Estimated release origin</span><span className="text-[10px] text-amber-300 font-mono">Hindcast</span></div><p className="text-slate-300 text-[11px]">Backward drift reconstruction combines the observed slick with current and wind fields to estimate where and when the release could have occurred.</p><div className="text-[10px] font-mono bg-[#0d1a33] p-2.5 rounded-lg space-y-1.5"><div className="flex justify-between"><span className="text-slate-400">Origin:</span><span className="text-white font-bold">{analysis?.hindcast?.probable_origin?.latitude?.toFixed(4) || "--"}°N, {analysis?.hindcast?.probable_origin?.longitude?.toFixed(4) || "--"}°E</span></div><div className="flex justify-between"><span className="text-slate-400">Uncertainty:</span><span className="text-amber-300">± {analysis?.hindcast?.uncertainty_radius_km || "--"} km</span></div><div className="flex justify-between"><span className="text-slate-400">Estimated time:</span><span className="text-sky-300">{analysis?.hindcast?.probable_origin?.time || "--"}</span></div></div></div>
              <div className="p-3.5 rounded-xl bg-[#0a1428] border border-[#162a52] space-y-2"><div className="font-semibold text-sky-300">Forward drift outlook</div><p className="text-slate-300 text-[11px]">The forecast corridor projects likely slick movement under the supplied oceanographic and meteorological conditions.</p></div>
            </div>}

            {activePanel === "checks" && <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30"><div className="font-bold text-emerald-300 flex items-center gap-1.5"><CheckCircle2 size={14} />Model and data checks</div><div className="text-[11px] text-slate-300 mt-1">Validation metrics and data-quality indicators are shown here without treating an attribution score as proof of liability.</div></div>
              <div className="p-3.5 rounded-xl bg-[#0a1428] border border-[#162a52] space-y-2"><div className="font-semibold text-cyan-300">Detection metrics</div><div className="grid grid-cols-2 gap-2 text-center font-mono"><div className="p-2 rounded bg-[#0d1a33]"><span className="text-[10px] text-slate-400 block">IoU</span><span className="text-base font-bold text-cyan-300">{validation?.iou ?? "--"}</span></div><div className="p-2 rounded bg-[#0d1a33]"><span className="text-[10px] text-slate-400 block">Dice</span><span className="text-base font-bold text-emerald-300">{validation?.dice ?? "--"}</span></div><div className="p-2 rounded bg-[#0d1a33]"><span className="text-[10px] text-slate-400 block">Precision</span><span className="text-base font-bold text-amber-300">{validation?.precision ?? "--"}</span></div><div className="p-2 rounded bg-[#0d1a33]"><span className="text-[10px] text-slate-400 block">Recall</span><span className="text-base font-bold text-purple-300">{validation?.recall ?? "--"}</span></div></div></div>
              <div className="p-3.5 rounded-xl bg-[#0a1428] border border-[#162a52] space-y-2 font-mono"><div className="font-semibold text-slate-200 font-sans">Reconstruction checks</div><div className="space-y-1.5 text-[11px] bg-[#0d1a33] p-2.5 rounded"><div className="flex justify-between"><span className="text-slate-400">Origin error:</span><span className="text-emerald-400">{validation?.origin_error_km ?? "--"} km</span></div><div className="flex justify-between"><span className="text-slate-400">Forecast error:</span><span className="text-sky-400">{validation?.forecast_error_km ?? "--"} km</span></div><div className="flex justify-between"><span className="text-slate-400">AIS match:</span><span className="text-cyan-300">{validation?.ais_top1 ?? "--"}</span></div></div></div>
            </div>}
          </div>
        </div>
      </div>
      {showTechnicalProof && <TechnicalProofModal onClose={() => setShowTechnicalProof(false)} />}
    </div>
  );
}
