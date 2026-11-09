import type { UserRole } from "../../api"

export interface JwtClaims {
  id?: string
  role?: UserRole
  sub?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

export type TokenValidationStatus =
  | "valid"
  | "refresh_valid"
  | "expired"
  | "none"

export interface TokenValidationResult {
  status: TokenValidationStatus
  token?: string
  source?: "access" | "refresh"
  claims?: JwtClaims
  message?: string
}

/**
 * Pure JavaScript base64 decoding safe for React Native/Hermes/web.
 */
export function base64Decode(str: string): string {
  if (typeof globalThis.atob === "function") {
    try {
      return globalThis.atob(str)
    } catch {
      // Fall through to manual decoder if atob fails
    }
  }

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
  let output = ""
  let buffer = 0
  let bits = 0

  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i)
    if (char === "=") break
    const index = chars.indexOf(char)
    if (index === -1) continue

    buffer = (buffer << 6) | index
    bits += 6

    if (bits >= 8) {
      bits -= 8
      output += String.fromCharCode((buffer >> bits) & 0xff)
    }
  }

  return output
}

/**
 * Decodes the payload section of a JWT token.
 */
export function decodeJwtPayload(token: string): JwtClaims | null {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    while (base64.length % 4) {
      base64 += "="
    }
    const decoded = base64Decode(base64)
    return JSON.parse(decoded) as JwtClaims
  } catch {
    return null
  }
}

/**
 * Checks whether a JWT token is expired.
 * exp is given in seconds since Unix epoch.
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  const claims = decodeJwtPayload(token)
  if (!claims || typeof claims.exp !== "number") return true
  const expiryMs = claims.exp * 1000
  // Grace buffer of 5 seconds to prevent edge-case race conditions
  return expiryMs <= Date.now() + 5000
}

/**
 * Validates access and refresh tokens locally when offline.
 *
 * Rules:
 * 1. If access token is valid (not expired) -> "valid"
 * 2. If access token is expired, but refresh token is valid (not expired) -> "refresh_valid"
 * 3. If both tokens are expired -> "expired"
 * 4. If neither token exists -> "none"
 */
export function validateTokensLocally(
  access: string | null,
  refresh: string | null
): TokenValidationResult {
  if (!access && !refresh) {
    return { status: "none", message: "No stored session found." }
  }

  const accessExpired = isTokenExpired(access)
  const refreshExpired = isTokenExpired(refresh)

  if (access && !accessExpired) {
    const claims = decodeJwtPayload(access) ?? undefined
    return {
      status: "valid",
      token: access,
      source: "access",
      claims,
      message: "Access token is valid."
    }
  }

  if (refresh && !refreshExpired) {
    const claims = decodeJwtPayload(refresh) ?? undefined
    return {
      status: "refresh_valid",
      token: refresh,
      source: "refresh",
      claims,
      message: "Access token expired, but refresh token is valid for offline attendance."
    }
  }

  return {
    status: "expired",
    message: "Both access and refresh tokens have expired. Please connect to the internet to sign in."
  }
}
