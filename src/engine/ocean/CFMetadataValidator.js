/**
 * OceanView — Climate & Forecast (CF) Metadata Validator
 * Inspects NetCDF metadata attributes against CF-1.8 Conventions for spatial, temporal, and physical honesty.
 */

export const CF_STANDARD_NAMES = new Set([
  'sea_water_temperature',
  'sea_surface_temperature',
  'sea_water_potential_temperature',
  'sea_water_practical_salinity',
  'sea_water_salinity',
  'eastward_sea_water_velocity',
  'northward_sea_water_velocity',
  'sea_water_velocity',
  'mass_concentration_of_chlorophyll_a_in_sea_water',
  'mole_concentration_of_dissolved_molecular_oxygen_in_sea_water',
  'sea_water_sigma_t',
  'speed_of_sound_in_sea_water',
  'depth',
  'sea_water_pressure',
  'latitude',
  'longitude',
  'time',
]);

/**
 * Validates raw NetCDF dataset metadata structure against CF Conventions.
 *
 * @param {object} metadata - NetCDF variable and global attribute map
 * @returns {{ status: 'VALID'|'PARTIAL'|'INVALID', score: number, issues: string[], validFields: string[] }}
 */
export function validateCFMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return {
      status: 'INVALID',
      score: 0,
      issues: ['Metadata object is null or missing.'],
      validFields: [],
    };
  }

  const issues = [];
  const validFields = [];
  let checksPassed = 0;
  let totalChecks = 0;

  // 1. Coordinate Axis Checks
  const coords = ['latitude', 'longitude', 'time', 'depth'];
  for (const c of coords) {
    totalChecks += 1;
    const coordMeta = metadata[c] || metadata[c.slice(0, 3)] || null;
    if (coordMeta) {
      if (coordMeta.units) {
        checksPassed += 1;
        validFields.push(c);
      } else {
        issues.push(`Coordinate '${c}' is missing required 'units' attribute.`);
      }
    } else {
      issues.push(`Standard coordinate '${c}' is not defined.`);
    }
  }

  // 2. Physical Data Variable Attributes
  const dataVars = Object.keys(metadata).filter((k) => !coords.includes(k));
  if (dataVars.length === 0) {
    issues.push('No scientific data variables found in dataset metadata.');
  }

  for (const v of dataVars) {
    const varMeta = metadata[v];
    if (varMeta && typeof varMeta === 'object') {
      totalChecks += 3;

      // Check standard_name / long_name
      if (varMeta.standard_name && CF_STANDARD_NAMES.has(varMeta.standard_name)) {
        checksPassed += 1;
      } else if (varMeta.long_name) {
        checksPassed += 0.5;
        issues.push(`Variable '${v}' has 'long_name' but lacks authoritative CF 'standard_name'.`);
      } else {
        issues.push(`Variable '${v}' lacks both 'standard_name' and 'long_name'.`);
      }

      // Check units
      if (varMeta.units && typeof varMeta.units === 'string' && varMeta.units.trim().length > 0) {
        checksPassed += 1;
      } else {
        issues.push(`Variable '${v}' is missing required 'units' attribute.`);
      }

      // Check _FillValue or missing_value
      if (varMeta._FillValue !== undefined || varMeta.missing_value !== undefined) {
        checksPassed += 1;
      } else {
        issues.push(`Variable '${v}' has no explicit '_FillValue' or 'missing_value' declared.`);
      }
    }
  }

  const score = totalChecks > 0 ? Math.round((checksPassed / totalChecks) * 100) : 0;
  let status = 'INVALID';
  if (score >= 80) status = 'VALID';
  else if (score >= 40) status = 'PARTIAL';

  return {
    status,
    score,
    issues,
    validFields,
    cfConvention: metadata.Conventions || 'CF-1.8 (Evaluated)',
  };
}
