# POSEIDON Marine Intelligence

> **Satellite-driven marine oil-spill investigation and vessel attribution platform**
>
> Smart India Hackathon 2026 · Problem Statement 26143

## What Poseidon does

Poseidon combines remote sensing, environmental forcing and historical AIS traffic into a single incident-reconstruction workflow. The objective is to move from **"a slick was observed"** to **"where could it have originated, how will it move, and which vessel trajectories are consistent with that origin window?"**.

### Investigation flow

```text
Satellite observation
        ↓
Slick segmentation & characterization
        ↓
Ocean + weather forcing
        ↓
Backward drift reconstruction
        ↓
Estimated release origin + time window
        ↓
Historical AIS traffic reconstruction
        ↓
Spatial / temporal / trajectory filtering
        ↓
Candidate-vessel evidence analysis
        ↓
Forward drift outlook + investigation report
```

## Core capabilities

### 1. Slick Detection
- Processes satellite-derived observations.
- Delineates candidate slick regions.
- Captures area, perimeter and principal dimensions.
- Presents detection confidence and data-quality context.

### 2. Drift Reconstruction
- Combines surface-current and wind information.
- Reconstructs the slick backward from the observation time.
- Estimates a probable release location and time window.
- Projects a forward drift corridor with uncertainty.

### 3. AIS Traffic Reconstruction
- Rebuilds historical vessel movement around the reconstructed origin.
- Filters irrelevant traffic using space and time constraints.
- Compares vessel movement with the estimated drift corridor.

### 4. Vessel Attribution Evidence
Candidate vessels are examined using multiple signals:

- Distance from reconstructed origin
- Temporal overlap with the release window
- Heading / trajectory compatibility
- Speed or movement anomalies
- Vessel-context relevance

The resulting confidence is an **analytical decision-support signal**, not proof of responsibility or legal liability.

### 5. Investigation Workspace
The frontend is intentionally organized as one incident workflow rather than separate application modes:

- Incident Workspace
- Evidence Fusion
- Source Data
- Reconstruct Incident
- Slick Detection
- Slick Profile
- Traffic Reconstruction
- Origin Trace
- Drift Outlook
- Model Checks
- Incident Archive

## Architecture

```text
React + Leaflet
      │
      ▼
Poseidon Incident Workspace
      │
      ├── Satellite / slick analysis
      ├── Environmental forcing
      ├── Drift reconstruction
      └── AIS traffic analysis
              │
              ▼
       FastAPI backend
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
   ML/vision  Ocean   AIS adapters
      │       │        │
      └───────┼────────┘
              ▼
       Incident evidence
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Backend

```powershell
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

## Project structure

```text
frontend/
  src/
    components/       # map layers and investigation UI
    context/          # incident state and workflow
    pages/            # investigation workflow pages
      IncidentWorkspace.jsx
      SpillDetectionPage.jsx
      SpillGeometryPage.jsx
      AISInvestigationPage.jsx
      OriginBacktrackingPage.jsx
      FuturePredictionPage.jsx
      InvestigationCopilotPage.jsx
backend/
  adapters/           # data-source adapters
  integrations/       # satellite, ocean, weather and AIS integrations
  providers/          # provider implementations
  models/             # ML and API schemas
ml/                   # training/inference assets
```

## Responsible interpretation

Poseidon is designed as an investigation aid. Satellite detections, drift estimates and AIS correlations have measurement and modelling uncertainty. Candidate-vessel results should therefore be interpreted together with source provenance, uncertainty and independent maritime evidence.

## Team project

**POSEIDON — Marine Intelligence**

Built for SIH 2026 Problem Statement 26143.
