# OceanView (SIH26067)

OceanView is a high-performance 3D/4D web application designed for the rigorous exploration of numerical ocean models and in-situ observational data (Argo, CTD, Gliders). It integrates the spatial visualization power of CesiumJS with custom React-based scientific overlays.

## Features

- **3D/4D Subsurface Exploration**: Visualize scalar fields (Temperature, Salinity) and vector fields (Currents) via Horizontal Slices, Vertical Transects, and 3D Isosurfaces.
- **Model vs Observation Intercomparison**: Instantly align real-world Argo profiles with numerical model outputs to compute RMSE and Mean Bias in real-time.
- **Data Provenance**: Absolute transparency on whether data is sourced from LIVE ERDDAP feeds or VERIFIED FIXTURES.
- **Dual Presentation Modes**: Switch between `Operational` (dense metrics) and `Outreach` (guided insights) to serve both scientists and the general public.
- **Performance Optimized**: Features a custom Render Governor for 0% idle GPU usage, bounds-limited Marching Cubes, and vector flow streaming.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
1. Start the backend proxy server (for live data ingestion):
   ```bash
   node server/index.js
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

## Documentation
- [SIH Final Scorecard](docs/PHASE6_SIH_FINAL_SCORECARD.md)
- [Data Provenance Audit](docs/PHASE6_DATA_PROVENANCE_AUDIT.md)
- [Judge QA](docs/SIH_JUDGE_QA.md)
- [Demonstration Scenario](docs/SIH_DEMO_SCENARIO.md)
- [Security Audit](docs/PHASE6_SECURITY_AUDIT.md)

## Architecture
- **Frontend**: React, Vite, CesiumJS
- **Backend**: Express (Stateless Proxy)
- **Styling**: Vanilla CSS (glassmorphism scientific aesthetic)
