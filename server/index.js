/**
 * OceanView Server — Scientific Data Service Entrypoint
 * Express backend for bounded spatial/temporal ERDDAP proxying, in-situ profiles, glider tracks, CTD, and BGC.
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {
  getOceanModelSlice,
  getArgoProfiles,
  getOceanCurrentSlice,
  getGliderMissions,
  getCTDStations,
  getBGCProfiles,
} from './oceanDataService.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Strict Rate Limiting: Max 120 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Rate limit exceeded. Try again in a minute.' },
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'OceanView Scientific Data Engine',
    mode: 'REAL_SCIENTIFIC_DATA_INGESTION',
    timestamp: new Date().toISOString(),
  });
});

// List Available Ocean Datasets
app.get('/api/ocean/datasets', apiLimiter, (req, res) => {
  res.json({
    datasets: [
      {
        id: 'SDC_GLO_CLIM_TS_V2_2',
        name: 'SeaDataNet Global Ocean 4D Climatology & Analysis',
        provider: 'SeaDataNet / Coriolis',
        type: 'GRIDDED_OCEAN_MODEL',
        dataState: 'MODELED',
        variables: ['temperature', 'salinity'],
        spatialResolution: '0.25°',
        depthLevels: 36,
        timeSteps: 12,
      },
      {
        id: 'ArgoFloats',
        name: 'Coriolis Argo Float Profiling Array',
        provider: 'International Argo Programme / Ifremer',
        type: 'IN_SITU_OBSERVATION',
        dataState: 'OBSERVED',
        variables: ['temperature', 'salinity', 'pressure'],
        coverage: 'Global / Indian Ocean',
      },
      {
        id: 'INCOIS_OceanGliders',
        name: 'INCOIS Autonomous Underwater Glider Missions',
        provider: 'INCOIS / OceanGliders',
        type: 'GLIDER_TRAJECTORY',
        dataState: 'OBSERVED',
        variables: ['temperature', 'salinity', 'density'],
        coverage: 'Bay of Bengal',
      },
      {
        id: 'SagarKanya_CTD',
        name: 'ORV Sagar Kanya Shipboard CTD Rosette Stations',
        provider: 'INCOIS / NIO / SeaDataNet',
        type: 'CTD_STATIONS',
        dataState: 'OBSERVED',
        variables: ['temperature', 'salinity', 'dissolved_oxygen'],
        coverage: 'Arabian Sea',
      },
      {
        id: 'BGC_Argo',
        name: 'Biogeochemical Argo Float Array',
        provider: 'Global BGC-Argo GDAC',
        type: 'BGC_IN_SITU',
        dataState: 'OBSERVED',
        variables: ['chlorophyll_a', 'dissolved_oxygen'],
        coverage: 'Indian Ocean Basin',
      },
    ],
  });
});

// Ocean Model 2D Depth Slice API
app.get('/api/ocean/model/slice', apiLimiter, async (req, res) => {
  try {
    const { datasetId, variable, time, depth, minLat, maxLat, minLon, maxLon, stride } = req.query;
    const slice = await getOceanModelSlice({
      datasetId: datasetId || 'SDC_GLO_CLIM_TS_V2_2',
      variable: variable || 'Temperature',
      time: time || '2010-01-16T00:00:00Z',
      depth: depth !== undefined ? Number(depth) : 5.0,
      minLat: minLat !== undefined ? Number(minLat) : 5.0,
      maxLat: maxLat !== undefined ? Number(maxLat) : 20.0,
      minLon: minLon !== undefined ? Number(minLon) : 60.0,
      maxLon: maxLon !== undefined ? Number(maxLon) : 80.0,
      stride: stride !== undefined ? Number(stride) : 4,
    });
    res.json(slice);
  } catch (err) {
    res.status(500).json({ error: 'ModelSliceError', message: err.message });
  }
});

// In-Situ Argo Profiles API
app.get('/api/ocean/argo/profiles', apiLimiter, async (req, res) => {
  try {
    const { minLat, maxLat, minLon, maxLon, maxProfiles } = req.query;
    const argo = await getArgoProfiles({
      minLat: minLat !== undefined ? Number(minLat) : 5.0,
      maxLat: maxLat !== undefined ? Number(maxLat) : 20.0,
      minLon: minLon !== undefined ? Number(minLon) : 60.0,
      maxLon: maxLon !== undefined ? Number(maxLon) : 80.0,
      maxProfiles: maxProfiles !== undefined ? Number(maxProfiles) : 10,
    });
    res.json(argo);
  } catch (err) {
    res.status(500).json({ error: 'ArgoFetchError', message: err.message });
  }
});

// Ocean Current Velocity Slice API (u, v)
app.get('/api/ocean/current/slice', apiLimiter, async (req, res) => {
  try {
    const { datasetId, time, depth, minLat, maxLat, minLon, maxLon, stride } = req.query;
    const slice = await getOceanCurrentSlice({
      datasetId: datasetId || 'ANDRO',
      time: time || '2025-01-01T00:00:00Z',
      depth: depth !== undefined ? Number(depth) : 5.0,
      minLat: minLat !== undefined ? Number(minLat) : 5.0,
      maxLat: maxLat !== undefined ? Number(maxLat) : 20.0,
      minLon: minLon !== undefined ? Number(minLon) : 60.0,
      maxLon: maxLon !== undefined ? Number(maxLon) : 80.0,
      stride: stride !== undefined ? Number(stride) : 2,
    });
    res.json(slice);
  } catch (err) {
    res.status(500).json({ error: 'CurrentSliceError', message: err.message });
  }
});

// Glider Missions API
app.get('/api/ocean/glider/missions', apiLimiter, async (req, res) => {
  try {
    const glider = await getGliderMissions();
    res.json(glider);
  } catch (err) {
    res.status(500).json({ error: 'GliderFetchError', message: err.message });
  }
});

// CTD Cruise Stations API
app.get('/api/ocean/ctd/stations', apiLimiter, async (req, res) => {
  try {
    const ctd = await getCTDStations();
    res.json(ctd);
  } catch (err) {
    res.status(500).json({ error: 'CTDFetchError', message: err.message });
  }
});

// BGC Profiles API
app.get('/api/ocean/bgc/profiles', apiLimiter, async (req, res) => {
  try {
    const bgc = await getBGCProfiles();
    res.json(bgc);
  } catch (err) {
    res.status(500).json({ error: 'BGCFetchError', message: err.message });
  }
});

// Start Server if called directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[OceanView Server] Operational on port ${PORT}`);
  });
}

export default app;
