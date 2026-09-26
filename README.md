# POSEIDON Marine Intelligence

> **Satellite-driven marine oil-spill investigation and vessel attribution platform**
>
> Smart India Hackathon 2026 · Problem Statement 26143

## What Poseidon does

Poseidon combines remote sensing, environmental forcing and historical AIS traffic into a single incident-reconstruction workflow. The objective is to move from **"a slick was observed"** to **"where could it have originated, how will it move, and which vessel trajectories are consistent with that origin window?"**.

## Run locally

Poseidon has two services: a React frontend and a FastAPI backend. **Start both terminals** before using the investigation controls.

### Terminal 1 — Backend

From the repository root:

```powershell
cd C:\Users\Aarya\poseidon-marine-intelligence
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify it is running by opening:

```text
http://127.0.0.1:8000/api/health
```

You should receive a JSON health response.

### Terminal 2 — Frontend

```powershell
cd C:\Users\Aarya\poseidon-marine-intelligence\frontend
npm.cmd install
npm.cmd run dev
```

Then open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

If PowerShell blocks `npm`, use `npm.cmd` as shown above.

## Investigation flow

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

### Slick Detection
- Satellite-derived slick observation
- Slick geometry and dimensions
- Detection confidence
- Data-quality context

### Drift Reconstruction
- Surface-current and wind forcing
- Backward origin reconstruction
- Estimated release time window
- Forward drift corridor and uncertainty

### AIS Traffic Reconstruction
- Historical vessel movement reconstruction
- Space/time traffic filtering
- Trajectory comparison against the reconstructed origin

### Vessel Correlation Evidence
Candidates are examined using multiple signals:

- Spatial proximity
- Temporal alignment
- Trajectory compatibility
- Behavioural movement signal
- Environmental compatibility

The result is an analytical decision-support signal, not proof of responsibility or legal liability.

### Investigation Workspace
Poseidon uses one unified incident workflow rather than separate application modes:

- Incident Overview
- Evidence Fusion
- Observation Sources
- Incident Reconstruction
- Slick Characterization
- Slick Geometry
- AIS Traffic Review
- Release Origin
- Drift Projection
- Model Diagnostics
- Incident Archive
- Data Services

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
       FastAPI backend :8000
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
   ML/vision  Ocean   AIS adapters
      │       │        │
      └───────┼────────┘
              ▼
       Incident evidence
```

## Backend health indicator

The frontend checks `GET /api/health` when it starts and every 30 seconds. The top-right **BACKEND ONLINE/OFFLINE** indicator can also be clicked to retry the connection. This makes a missing backend immediately visible instead of making investigation buttons appear unresponsive.

## Project structure

```text
frontend/
  src/
    components/       # map layers and investigation UI
    context/          # incident state and workflow
    pages/            # investigation workflow pages
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
