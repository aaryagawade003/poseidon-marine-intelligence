import { useEffect, useState } from "react";
import { Shield, Clock, Activity, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { getHealth } from "../services/api.js";

export default function AppShell({ children }) {
  const [utcTime, setUtcTime] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking");

  const checkBackend = async () => {
    setBackendStatus("checking");
    try {
      await getHealth();
      setBackendStatus("online");
    } catch {
      setBackendStatus("offline");
    }
  };

  useEffect(() => {
    const updateTime = () => setUtcTime(new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC");
    updateTime();
    const timer = setInterval(updateTime, 1000);
    checkBackend();
    const healthTimer = setInterval(checkBackend, 30000);
    return () => {
      clearInterval(timer);
      clearInterval(healthTimer);
    };
  }, []);

  const online = backendStatus === "online";

  return (
    <div className="min-h-screen bg-[#eaf5ff] text-[#17324d] flex flex-col font-sans antialiased selection:bg-[#4ea8de] selection:text-white">
      <header className="h-16 border-b border-[#c7e3f7] bg-white/95 backdrop-blur sticky top-0 z-50 px-4 lg:px-6 flex items-center justify-between shadow-[0_4px_18px_rgba(35,99,140,0.10)] gap-3">
        <div className="flex items-center gap-2.5 select-none shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#67c5f5] to-[#2d7fb8] flex items-center justify-center shadow-lg shadow-sky-200 border border-sky-300">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-[#164b6b]">POSEIDON</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#e3f4ff] text-[#2478aa] border border-[#b9def3] tracking-widest uppercase">MARINE INTELLIGENCE</span>
            </div>
            <p className="text-[10px] text-[#6b879c] font-mono tracking-tight -mt-0.5 hidden lg:block">Satellite Slick Detection · Drift Reconstruction · AIS Attribution</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f3faff] border border-[#cce6f7]">
            <Clock size={13} className="text-[#3289bd]" />
            <span className="text-[#45667d] font-medium">{utcTime || "UTC CLOCK"}</span>
          </div>

          <button
            onClick={checkBackend}
            title="Check backend connection"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition ${online ? "bg-[#ecfbf5] border-[#bdebd8] text-[#20805f]" : backendStatus === "checking" ? "bg-[#fff8e8] border-[#f3dfad] text-[#9a7219]" : "bg-[#fff1f1] border-[#f0c6c6] text-[#b04b4b] hover:bg-[#ffe8e8]"}`}
          >
            {backendStatus === "checking" ? <RefreshCw size={12} className="animate-spin" /> : online ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{backendStatus === "checking" ? "CHECKING" : online ? "BACKEND ONLINE" : "BACKEND OFFLINE"}</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f3faff] border border-[#cce6f7] text-[11px]">
            <span className="text-[#6b879c]">SYSTEM:</span>
            <span className="text-[#2679a6] font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#53b8e8]"/>READY</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-[#e9f7ff] border-[#bfe2f5] text-[#277da9] text-[11px] font-semibold">
            <Activity size={12} />
            <span>INVESTIGATION</span>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
