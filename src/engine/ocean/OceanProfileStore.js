/**
 * OceanView — Scientific Ocean Profile Store
 * Stores and indexes vertical column profiles (Argo, CTD, Glider) for fast 3D querying.
 */

export class OceanProfileStore {
  /**
   * @param {object} [options={}]
   * @param {number} [options.maxProfiles=2000] - Maximum profile casts retained
   */
  constructor(options = {}) {
    this.maxProfiles = options.maxProfiles || 2000;
    this.profiles = new Map(); // id -> CanonicalProfile
    this.platformIndex = new Map(); // platformId -> Set<profileId>
  }

  /**
   * Ingests a CanonicalProfile into the store.
   *
   * @param {object} profile - CanonicalProfile object
   * @returns {{ success: boolean, profileId: string, count: number }}
   */
  addProfile(profile) {
    if (!profile || !profile.id || profile.kind !== 'CANONICAL_PROFILE') {
      throw new Error('OceanProfileStore requires a valid CanonicalProfile object');
    }

    if (this.profiles.size >= this.maxProfiles) {
      const oldestId = this.profiles.keys().next().value;
      this.deleteProfile(oldestId);
    }

    this.profiles.set(profile.id, profile);

    // Index by platform
    const platformId = profile.platformId;
    if (!this.platformIndex.has(platformId)) {
      this.platformIndex.set(platformId, new Set());
    }
    this.platformIndex.get(platformId).add(profile.id);

    return {
      success: true,
      profileId: profile.id,
      count: this.profiles.size,
    };
  }

  /**
   * Retrieves a profile by ID.
   */
  getProfile(id) {
    return this.profiles.get(id) || null;
  }

  /**
   * Retrieves all profiles for a given platform.
   */
  getProfilesByPlatform(platformId) {
    const idSet = this.platformIndex.get(platformId);
    if (!idSet) return [];
    return Array.from(idSet).map((id) => this.profiles.get(id)).filter(Boolean);
  }

  /**
   * Retrieves profiles within a geographical bounding box.
   *
   * @param {{ minLat: number, maxLat: number, minLon: number, maxLon: number }} bbox
   * @returns {Array<object>}
   */
  getProfilesInBounds(bbox) {
    if (!bbox) return Array.from(this.profiles.values());
    const { minLat, maxLat, minLon, maxLon } = bbox;

    const results = [];
    for (const p of this.profiles.values()) {
      const { lat, lon } = p.location;
      if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
        results.push(p);
      }
    }
    return results;
  }

  /**
   * Finds the nearest profile to a target coordinate within maxDistanceKm.
   *
   * @param {number} targetLat
   * @param {number} targetLon
   * @param {number} [maxDistanceKm=200]
   * @returns {{ profile: object, distanceKm: number }|null}
   */
  getNearestProfile(targetLat, targetLon, maxDistanceKm = 200) {
    let nearest = null;
    let minDistance = Infinity;

    for (const p of this.profiles.values()) {
      const d = haversineDistanceKm(targetLat, targetLon, p.location.lat, p.location.lon);
      if (d <= maxDistanceKm && d < minDistance) {
        minDistance = d;
        nearest = p;
      }
    }

    return nearest ? { profile: nearest, distanceKm: Number(minDistance.toFixed(2)) } : null;
  }

  /**
   * Returns all stored profiles.
   */
  getAll() {
    return Array.from(this.profiles.values());
  }

  /**
   * Deletes a profile by ID.
   */
  deleteProfile(id) {
    const profile = this.profiles.get(id);
    if (profile) {
      const platformSet = this.platformIndex.get(profile.platformId);
      if (platformSet) {
        platformSet.delete(id);
        if (platformSet.size === 0) {
          this.platformIndex.delete(profile.platformId);
        }
      }
      this.profiles.delete(id);
    }
  }

  /**
   * Clears the store.
   */
  clear() {
    this.profiles.clear();
    this.platformIndex.clear();
  }
}

/**
 * Fast spherical Haversine distance in km.
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * (Math.PI / 180.0);
  const dLon = (lon2 - lon1) * (Math.PI / 180.0);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180.0)) *
      Math.cos(lat2 * (Math.PI / 180.0)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
