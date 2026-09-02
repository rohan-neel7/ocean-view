/**
 * OceanView — Bounded 3D Isosurface Extraction Engine
 * Extracts 3D triangular meshes for scalar thresholds (e.g. 20°C Isotherm) using Marching Cubes.
 *
 * Invariants:
 *   - Strictly memory-bounded: Rejects excessive subvolumes (> 60,000 cells).
 *   - Neutral scientific labeling: "20°C ISOTHERM" (never unsupported water mass names).
 *   - Missing ≠ Zero: Land/fill cells do not generate fabricated surface geometry.
 */

// Edge table and triangulation lookup for Marching Cubes
import { MARCHING_CUBES_TRI_TABLE, MARCHING_CUBES_EDGE_TABLE } from './marchingCubesTables.js';
import { toCesiumRenderAltitude } from '../spatial/depthCoordinates.js';

export const MAX_ISOSURFACE_CELLS = 60000;

/**
 * Extracts an isosurface mesh from a 3D CanonicalGridScalar at a target threshold.
 *
 * @param {object} gridScalar - CanonicalGridScalar with 3D depthCount
 * @param {number} isovalue - Target scalar threshold (e.g. 20.0 for 20°C)
 * @param {object} [options]
 * @param {number} [options.verticalExaggeration=20.0]
 * @returns {object} Structured 3D Mesh object (positions, normals, indices)
 */
export function extractIsosurface(gridScalar, isovalue, options = {}) {
  if (!gridScalar || !gridScalar.data) {
    throw new Error('extractIsosurface requires a valid 3D gridScalar');
  }

  const { latCount, lonCount, depthCount = 1 } = gridScalar.dimensions;
  const totalCells = latCount * lonCount * depthCount;

  if (totalCells > MAX_ISOSURFACE_CELLS) {
    throw new Error(
      `Subvolume request (${totalCells} cells) exceeds safe memory ceiling of ${MAX_ISOSURFACE_CELLS} cells`
    );
  }

  if (depthCount < 2 || latCount < 2 || lonCount < 2) {
    return {
      positions: new Float64Array(0),
      normals: new Float32Array(0),
      indices: new Uint32Array(0),
      isovalue,
      triangleCount: 0,
    };
  }

  const lats = gridScalar.coordinates.latitudes;
  const lons = gridScalar.coordinates.longitudes;
  const depths = gridScalar.coordinates.depths;
  const fillValue = gridScalar.fillValue ?? -9999.0;
  const zScale = options.verticalExaggeration || 20.0;

  const positions = [];
  const indices = [];

  // Iterate across 3D grid voxel cells
  for (let d = 0; d < depthCount - 1; d++) {
    const z0 = toCesiumRenderAltitude(depths[d], { verticalExaggeration: zScale });
    const z1 = toCesiumRenderAltitude(depths[d + 1], { verticalExaggeration: zScale });

    for (let r = 0; r < latCount - 1; r++) {
      const lat0 = lats[r];
      const lat1 = lats[r + 1];

      for (let c = 0; c < lonCount - 1; c++) {
        const lon0 = lons[c];
        const lon1 = lons[c + 1];

        // 8 Voxel Corner Values
        const val = [
          gridScalar.getValue(r, c, d),         // 0: (lon0, lat0, z0)
          gridScalar.getValue(r, c + 1, d),     // 1: (lon1, lat0, z0)
          gridScalar.getValue(r + 1, c + 1, d), // 2: (lon1, lat1, z0)
          gridScalar.getValue(r + 1, c, d),     // 3: (lon0, lat1, z0)
          gridScalar.getValue(r, c, d + 1),     // 4: (lon0, lat0, z1)
          gridScalar.getValue(r, c + 1, d + 1), // 5: (lon1, lat0, z1)
          gridScalar.getValue(r + 1, c + 1, d + 1), // 6: (lon1, lat1, z1)
          gridScalar.getValue(r + 1, c, d + 1), // 7: (lon0, lat1, z1)
        ];

        // Skip cell if any corner is fill/landmasked
        if (val.some((v) => v === null || v === fillValue || isNaN(v))) {
          continue;
        }

        // Calculate cube index
        let cubeIndex = 0;
        if (val[0] < isovalue) cubeIndex |= 1;
        if (val[1] < isovalue) cubeIndex |= 2;
        if (val[2] < isovalue) cubeIndex |= 4;
        if (val[3] < isovalue) cubeIndex |= 8;
        if (val[4] < isovalue) cubeIndex |= 16;
        if (val[5] < isovalue) cubeIndex |= 32;
        if (val[6] < isovalue) cubeIndex |= 64;
        if (val[7] < isovalue) cubeIndex |= 128;

        if (cubeIndex === 0 || cubeIndex === 255) {
          continue; // Entirely inside or outside isosurface
        }

        // 8 Corner Coordinates [lon, lat, alt]
        const corners = [
          [lon0, lat0, z0],
          [lon1, lat0, z0],
          [lon1, lat1, z0],
          [lon0, lat1, z0],
          [lon0, lat0, z1],
          [lon1, lat0, z1],
          [lon1, lat1, z1],
          [lon0, lat1, z1],
        ];

        // Edge vertices interpolation
        const edgeFlags = MARCHING_CUBES_EDGE_TABLE[cubeIndex];
        const vertList = new Array(12);

        for (let e = 0; e < 12; e++) {
          if (edgeFlags & (1 << e)) {
            const edgeCorners = EDGE_CORNER_INDICES[e];
            const cA = corners[edgeCorners[0]];
            const cB = corners[edgeCorners[1]];
            const vA = val[edgeCorners[0]];
            const vB = val[edgeCorners[1]];

            const t = Math.abs(vB - vA) > 1e-6 ? (isovalue - vA) / (vB - vA) : 0.5;
            const clampedT = Math.max(0.0, Math.min(1.0, t));

            vertList[e] = [
              cA[0] + clampedT * (cB[0] - cA[0]),
              cA[1] + clampedT * (cB[1] - cA[1]),
              cA[2] + clampedT * (cB[2] - cA[2]),
            ];
          }
        }

        // Generate triangles
        const triRow = MARCHING_CUBES_TRI_TABLE[cubeIndex];
        for (let i = 0; triRow[i] !== -1 && i < 16; i += 3) {
          const v0 = vertList[triRow[i]];
          const v1 = vertList[triRow[i + 1]];
          const v2 = vertList[triRow[i + 2]];

          const baseIdx = positions.length / 3;
          positions.push(v0[0], v0[1], v0[2]);
          positions.push(v1[0], v1[1], v1[2]);
          positions.push(v2[0], v2[1], v2[2]);

          indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        }
      }
    }
  }

  return {
    kind: 'ISOSURFACE_MESH',
    label: `${isovalue}°C ISOTHERM`,
    isovalue,
    triangleCount: indices.length / 3,
    positions: new Float64Array(positions),
    indices: new Uint32Array(indices),
    stats: {
      vertexCount: positions.length / 3,
      triangleCount: indices.length / 3,
    },
  };
}

const EDGE_CORNER_INDICES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];
