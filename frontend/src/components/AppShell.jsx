import { useState, useEffect } from "react";
import { Shield, Clock, Activity } from "lucide-react";

export default function AppShell({ children }) {
  const [utcTime, setUtcTime] = useState("");
  useEffect(() => {
    const updateTime = () => setUtcTime(new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC");
    updateTime(); const timer = setInterval(updateTime, 1000); return () => clearInterval(timer);
  }, []);
  return <div className="min-h-screen bg-[#040812] text-[#e2e8f0] flex flex-col font-sans antialiased selection:bg-[#0284c7] selection:text-white">
    <header className="h-16 border-b border-[#142340] bg-[#070e1c]/95 backdrop-blur sticky top-0 z-50 px-4 lg:px-6 flex items-center justify-between shadow-lg gap-3">
      <div className="flex items-center gap-2.5 select-none shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0891b2] to-[#0369a1] flex items-center justify-center shadow-lg shadow-cyan-900/20 border border-cyan-400/40"><Shield className="w-5 h-5 text-white" /></div>
        <div><div className="flex items-center gap-1.5"><span className="font-extrabold text-base tracking-wider text-white">POSEIDON</span><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 tracking-widest uppercase">MARINE INTELLIGENCE</span></div><p className="text-[10px] text-slate-400 font-mono tracking-tight -mt-0.5 hidden lg:block">Satellite Slick Detection · Drift Reconstruction · AIS Attribution</p></div>
      </div>
      <div className="flex items-center gap-2 text-xs font-mono shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0b162c] border border-[#162a50]"><Clock size={13} className="text-cyan-400"/><span className="text-slate-300 font-medium">{utcTime || "UTC CLOCK"}</span></div>
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0b162c] border border-[#162a50] text-[11px]"><span className="text-slate-400">SYSTEM:</span><span className="text-emerald-400 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>READY</span></div>
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-cyan-500/10 border-cyan-500/30 text-cyan-300 text-[11px] font-semibold"><Activity size={12} className="text-cyan-400"/><span>INVESTIGATION</span></div>
      </div>
    </header>
    <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
  </div>;
}
