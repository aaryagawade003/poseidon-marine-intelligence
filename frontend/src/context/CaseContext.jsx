import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getHistoricalCase, listHistoricalCases, runCaseAnalysis as apiRunCaseAnalysis, validateCaseResults as apiValidateCaseResults, formatApiError } from "../services/api.js";

const CaseContext = createContext(null);

export function CaseProvider({ children }) {
  const [casesList, setCasesList] = useState([]);
  const [currentCaseId, setCurrentCaseId] = useState(() => typeof window !== "undefined" ? localStorage.getItem("poseidon_selected_case_id") || "CASE-2025-MSC-ELSA-3" : "CASE-2025-MSC-ELSA-3");
  const [currentCase, setCurrentCase] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentPage, setCurrentPage] = useState("workspace");

  const navigateTo = useCallback((page) => setCurrentPage(page), []);

  const refreshCasesList = useCallback(async () => {
    try { const res = await listHistoricalCases(); const list = res?.data?.cases || res?.cases || []; setCasesList(list); return list; }
    catch (err) { console.warn("Error fetching incidents:", err); return []; }
  }, []);

  const loadCase = useCallback(async (caseId) => {
    setIsLoading(true); setLoadingStage("Loading incident record..."); setErrorMsg("");
    try {
      const res = await getHistoricalCase(caseId); const c = res?.data || res;
      setCurrentCase(c); setCurrentCaseId(c.case_id);
      if (typeof window !== "undefined") localStorage.setItem("poseidon_selected_case_id", c.case_id);
      return c;
    } catch (err) { console.error("Failed to load incident:", err); setErrorMsg(formatApiError(err)); return null; }
    finally { setIsLoading(false); setLoadingStage(""); }
  }, []);

  useEffect(() => { refreshCasesList().then((list) => loadCase(currentCaseId || list?.[0]?.case_id || "CASE-2025-MSC-ELSA-3")); }, []);

  const runAnalysis = useCallback(async () => {
    if (!currentCase?.case_id) return;
    setIsLoading(true); setErrorMsg(""); setLoadingStage("Reconstructing slick, drift and vessel evidence...");
    try { const res = await apiRunCaseAnalysis(currentCase.case_id); await loadCase(currentCase.case_id); await refreshCasesList(); return res?.data || res; }
    catch (err) { setErrorMsg(formatApiError(err)); throw err; }
    finally { setIsLoading(false); setLoadingStage(""); }
  }, [currentCase, loadCase, refreshCasesList]);

  const runValidation = useCallback(async () => {
    if (!currentCase?.case_id) return;
    setIsLoading(true); setErrorMsg(""); setLoadingStage("Checking reconstruction metrics...");
    try { const res = await apiValidateCaseResults(currentCase.case_id); await loadCase(currentCase.case_id); await refreshCasesList(); return res?.data || res; }
    catch (err) { setErrorMsg(formatApiError(err)); throw err; }
    finally { setIsLoading(false); setLoadingStage(""); }
  }, [currentCase, loadCase, refreshCasesList]);

  return <CaseContext.Provider value={{ casesList, currentCase, currentCaseId, setCurrentCase, loadCase, refreshCasesList, runAnalysis, runValidation, isLoading, loadingStage, errorMsg, setErrorMsg, currentPage, setCurrentPage, navigateTo }}>{children}</CaseContext.Provider>;
}

export function useCase() { const ctx = useContext(CaseContext); if (!ctx) throw new Error("useCase must be used within a CaseProvider"); return ctx; }
