/**
 * OceanView — Model vs Observation Intercomparison Engine
 * Performs 3D/4D spatial and vertical interpolation to quantitatively compare
 * numerical ocean model fields against in-situ Argo/CTD casts.
 */

/**
 * Compares an observed CanonicalProfile against a CanonicalGridScalar model field.
 *
 * @param {object} profile - CanonicalProfile (e.g. Argo float cast)
 * @param {object} gridModel - CanonicalGridScalar (e.g. MOM6 Temperature grid)
 * @param {string} variableName - Physical variable to compare ('temperature', 'salinity')
 * @returns {object} Comparison report
 */
export function compareProfileAgainstModel(profile, gridModel, variableName = 'temperature') {
  if (!profile || !profile.variables || !profile.variables[variableName]) {
    throw new Error(`Profile does not contain variable "${variableName}"`);
  }
  if (!gridModel || !gridModel.data) {
    throw new Error('Valid gridModel is required for intercomparison');
  }

  const { lat, lon } = profile.location;
  const obsDepths = profile.depths;
  const obsValues = profile.variables[variableName];

  // Find nearest grid indices
  const lats = gridModel.coordinates.latitudes;
  const lons = gridModel.coordinates.longitudes;
  const modelDepths = gridModel.coordinates.depths;

  const latIdx = findNearestIndex(lats, lat);
  const lonIdx = findNearestIndex(lons, lon);

  const matchedLat = lats[latIdx];
  const matchedLon = lons[lonIdx];
  
  // Approximate distance (Haversine simplified for reporting)
  const maxSpatialDistanceKm = calculateDistanceKm(lat, lon, matchedLat, matchedLon);

  // Time difference
  const obsTime = new Date(profile.observedAt).getTime();
  const modTime = new Date(gridModel.timestamp).getTime();
  const maxTimeDifferenceHours = Math.abs((obsTime - modTime) / (1000 * 60 * 60));

  const alignment = [];
  let sumSqErr = 0;
  let sumBias = 0;
  let validPairs = 0;

  for (let k = 0; k < obsDepths.length; k++) {
    const d = obsDepths[k];
    const obsVal = obsValues[k];

    // Find nearest model depth level
    const depthIdx = findNearestIndex(modelDepths, d);
    const modelVal = gridModel.getValue(latIdx, lonIdx, depthIdx);

    let delta = null;
    if (obsVal !== null && modelVal !== null && modelVal !== gridModel.fillValue) {
      delta = Number((obsVal - modelVal).toFixed(4));
      sumBias += delta;
      sumSqErr += delta ** 2;
      validPairs++;
    }

    alignment.push({
      depthMeters: d,
      obsVal,
      modelVal: modelVal !== gridModel.fillValue ? modelVal : null,
      delta
    });
  }

  // Only calculate metrics if sufficient samples (e.g., > 1 valid pair)
  const sufficientSamples = validPairs > 1;
  const meanBias = sufficientSamples ? Number((sumBias / validPairs).toFixed(4)) : null;
  const rmse = sufficientSamples ? Number(Math.sqrt(sumSqErr / validPairs).toFixed(4)) : null;
  
  let alignmentStatus = 'UNRESOLVED';
  if (validPairs > 0) {
    alignmentStatus = validPairs === obsDepths.length ? 'MATCHED' : 'PARTIAL';
  }

  return {
    profileId: profile.id,
    modelId: gridModel.id,
    variable: variableName,
    unit: profile.units[variableName] || gridModel.unit,
    location: { lat, lon },
    alignmentStatus,
    alignmentMetadata: {
      horizontalInterpolation: 'Nearest Neighbor',
      verticalInterpolation: 'Nearest Neighbor',
      temporalInterpolation: 'Nearest Time Step',
      maxSpatialDistanceKm: Number(maxSpatialDistanceKm.toFixed(2)),
      maxTimeDifferenceHours: Number(maxTimeDifferenceHours.toFixed(1)),
    },
    alignment,
    metrics: {
      validPairs,
      meanBias,
      rmse,
    },
    comparedAt: new Date().toISOString(),
  };
}

function findNearestIndex(arr, val) {
  let closest = 0;
  let minDiff = Infinity;
  for (let i = 0; i < arr.length; i++) {
    const diff = Math.abs(arr[i] - val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  return closest;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
