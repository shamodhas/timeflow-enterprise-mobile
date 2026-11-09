import type { CachedBranch } from "./offlineStorage"

export interface OfflineLocationVerificationResult {
  isVerified: boolean
  closestBranch: CachedBranch | null
  distanceMeters: number | null
  userLat: number | null
  userLng: number | null
  message: string
}

/**
 * Calculates the great-circle distance between two geographic coordinates in meters
 * using the standard Haversine formula (identical to server-side implementation).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * Validates whether latitude and longitude are valid finite numbers.
 */
export function isValidCoordinates(lat?: unknown, lon?: unknown): boolean {
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return false
  }
  const numLat = Number(lat)
  const numLon = Number(lon)
  if (Number.isNaN(numLat) || Number.isNaN(numLon)) {
    return false
  }
  if (numLat < -90 || numLat > 90) return false
  if (numLon < -180 || numLon > 180) return false
  return true
}

/**
 * Verifies user coordinates against cached active branches offline.
 */
export function verifyLocationOffline(
  latitude?: number | null,
  longitude?: number | null,
  branches: CachedBranch[] = []
): OfflineLocationVerificationResult {
  if (!isValidCoordinates(latitude, longitude)) {
    return {
      isVerified: false,
      closestBranch: null,
      distanceMeters: null,
      userLat: null,
      userLng: null,
      message: "GPS location is required. Please enable location access."
    }
  }

  const userLat = Number(latitude)
  const userLng = Number(longitude)

  const activeBranches = branches.filter((b) => b.isActive !== false)

  if (activeBranches.length === 0) {
    return {
      isVerified: false,
      closestBranch: null,
      distanceMeters: null,
      userLat,
      userLng,
      message:
        "No active branches found in offline cache. Please connect to internet to sync locations."
    }
  }

  const closest = activeBranches
    .map((branch) => ({
      branch,
      distance: calculateDistanceMeters(
        userLat,
        userLng,
        Number(branch.latitude),
        Number(branch.longitude)
      )
    }))
    .sort((a, b) => a.distance - b.distance)[0]

  if (!closest || closest.distance > closest.branch.radiusMeters) {
    const detail = closest
      ? `${closest.distance}m from ${closest.branch.name}`
      : "no active branches configured"
    return {
      isVerified: false,
      closestBranch: closest?.branch ?? null,
      distanceMeters: closest?.distance ?? null,
      userLat,
      userLng,
      message: `You are outside all branch locations (${detail}). Enter a reason to record this attempt and notify HR.`
    }
  }

  return {
    isVerified: true,
    closestBranch: closest.branch,
    distanceMeters: closest.distance,
    userLat,
    userLng,
    message: `Verified within ${closest.branch.name} perimeter (${closest.distance}m away).`
  }
}
