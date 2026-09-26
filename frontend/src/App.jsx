import { CaseProvider, useCase } from "./context/CaseContext.jsx";
import AppShell from "./components/AppShell.jsx";
import IncidentWorkspace from "./pages/IncidentWorkspace.jsx";
import InvestigationCopilotPage from "./pages/InvestigationCopilotPage.jsx";
import NewCaseUpload from "./pages/NewCaseUpload.jsx";
import CaseAnalysisPage from "./pages/CaseAnalysisPage.jsx";
import SpillDetectionPage from "./pages/SpillDetectionPage.jsx";
import SpillGeometryPage from "./pages/SpillGeometryPage.jsx";
import AISInvestigationPage from "./pages/AISInvestigationPage.jsx";
import OriginBacktrackingPage from "./pages/OriginBacktrackingPage.jsx";
import FuturePredictionPage from "./pages/FuturePredictionPage.jsx";
import ValidationAccuracyPage from "./pages/ValidationAccuracyPage.jsx";
import CaseHistoryPage from "./pages/CaseHistoryPage.jsx";
import SystemHealth from "./pages/SystemHealth.jsx";

function PageRouter() {
  const { currentPage } = useCase();
  if (currentPage === "workspace") return <IncidentWorkspace />;

  const pageMap = {
    copilot: <InvestigationCopilotPage />,
    upload: <NewCaseUpload />,
    analysis: <CaseAnalysisPage />,
    detection: <SpillDetectionPage />,
    geometry: <SpillGeometryPage />,
    ais: <AISInvestigationPage />,
    backtracking: <OriginBacktrackingPage />,
    prediction: <FuturePredictionPage />,
    validation: <ValidationAccuracyPage />,
    history: <CaseHistoryPage />,
    systemhealth: <SystemHealth />,
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <InvestigationSidebar />
      <div className="flex-1 overflow-y-auto bg-[#040c1e] px-6 py-6 text-slate-200">
        {pageMap[currentPage] || <IncidentWorkspace />}
      </div>
    </div>
  );
}

function InvestigationSidebar() {
  const { currentPage, navigateTo, currentCase } = useCase();
  const hasAnalysis = Boolean(currentCase?.analysis);
  const hasValidation = Boolean(currentCase?.validation);

  const nav = [
    { id: "workspace", icon: "◉", label: "Incident Overview", section: "MISSION" },
    { id: "copilot", icon: "✦", label: "Evidence Fusion", section: null },
    { id: "upload", icon: "↑", label: "Observation Sources", section: null },
    { id: "analysis", icon: "⌁", label: "Incident Reconstruction", section: null },
    { id: "detection", icon: "◎", label: "Slick Characterization", section: "SPILL" },
    { id: "geometry", icon: "◇", label: "Slick Geometry", section: null },
    { id: "ais", icon: "▣", label: "AIS Traffic Review", section: "VESSEL CORRELATION" },
    { id: "backtracking", icon: "↶", label: "Release Origin", section: null },
    { id: "prediction", icon: "↗", label: "Drift Projection", section: null },
    { id: "validation", icon: "✓", label: "Model Diagnostics", section: "ASSURANCE" },
    { id: "history", icon: "▤", label: "Incident Archive", section: "PLATFORM" },
    { id: "systemhealth", icon: "●", label: "Data Services", section: null },
  ];

  let lastSection = null;
  return (
    <div className="w-56 shrink-0 bg-[#060d1e] border-r border-[#142340] flex flex-col overflow-y-auto z-10 shadow-2xl">
      <div className="p-3 border-b border-[#142340]">
        <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">POSEIDON</div>
        <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">Marine Spill Intelligence</div>
        <div className="text-[11px] text-slate-400 mt-1 truncate">{currentCase?.name || "Incident reconstruction"}</div>
      </div>
      <nav className="flex-1 py-2">
        {nav.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          const isActive = currentPage === item.id;
          return (
            <div key={item.id}>
              {showSection && <div className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">{item.section}</div>}
              <button onClick={() => navigateTo(item.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all ${isActive ? "bg-[#0c2845] text-white border-r-2 border-cyan-400 font-semibold" : "text-slate-400 hover:text-white hover:bg-[#0a1630]"}`}>
                <span className="text-sm leading-none">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {item.id === "analysis" && !hasAnalysis && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                {item.id === "validation" && hasAnalysis && !hasValidation && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return <CaseProvider><AppShell><PageRouter /></AppShell></CaseProvider>;
}
