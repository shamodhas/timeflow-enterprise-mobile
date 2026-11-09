import * as SecureStore from "expo-secure-store"

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "HR" | "EMPLOYEE"

export interface User {
  id: string
  employeeCode?: string
  fullName: string
  email: string
  role: UserRole
  tenantId?: string
  tenantSlug?: string
  tenantName?: string
}

export class ApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "")
const ACCESS_TOKEN_KEY = "timeflow-access-token"
const REFRESH_TOKEN_KEY = "timeflow-refresh-token"
const TENANT_SLUG_KEY = "timeflow-tenant-slug"
const DEFAULT_TIMEOUT_MS = 20000

export const NETWORK_ERROR_CODE = "NETWORK_ERROR"

export const isNetworkError = (error: unknown) =>
  error instanceof ApiError && error.code === NETWORK_ERROR_CODE

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number
) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

let accessToken: string | null = null
let refreshToken: string | null = null
let activeTenantSlug: string | null = null
let refreshInFlight: Promise<string | null> | null = null
let sessionExpiredHandler: (() => void) | null = null

export const setTokens = (access: string | null, refresh: string | null) => {
  accessToken = access
  refreshToken = refresh
}

export const setActiveTenantSlug = async (slug: string | null) => {
  activeTenantSlug = slug ? slug.trim().toLowerCase() : null
  if (activeTenantSlug) {
    await SecureStore.setItemAsync(TENANT_SLUG_KEY, activeTenantSlug)
  } else {
    await SecureStore.deleteItemAsync(TENANT_SLUG_KEY)
  }
}

export const getActiveTenantSlug = () => activeTenantSlug

export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  sessionExpiredHandler = handler
}

export const persistTokens = async (
  access: string | null,
  refresh: string | null
) => {
  setTokens(access, refresh)
  if (access) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access)
  } else {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
  }

  if (refresh) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh)
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
  }
}

export const restoreTokens = async () => {
  const [access, refresh, tenantSlug] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(TENANT_SLUG_KEY)
  ])
  setTokens(access, refresh)
  activeTenantSlug = tenantSlug
  return { access, refresh, tenantSlug }
}

export const getActiveTokens = () => ({ access: accessToken, refresh: refreshToken })

const readResponse = async (response: Response) => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return { message: text }
  }
}

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight
  if (!API_URL || !refreshToken) return null

  refreshInFlight = (async () => {
    try {
      const response = await fetchWithTimeout(
        `${API_URL}/api/v1/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        },
        DEFAULT_TIMEOUT_MS
      )
      const body = await readResponse(response)
      if (!response.ok || typeof body?.token !== "string") {
        await persistTokens(null, null)
        sessionExpiredHandler?.()
        return null
      }
      const nextRefresh =
        typeof body.refreshToken === "string" ? body.refreshToken : refreshToken
      await persistTokens(body.token, nextRefresh)
      return body.token
    } catch {
      throw new ApiError(
        "Could not refresh your session. Check your network connection.",
        undefined,
        NETWORK_ERROR_CODE
      )
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export const apiRequest = async <T>(
  path: string,
  init: RequestInit = {},
  retry = true,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> => {
  if (!API_URL) {
    throw new ApiError(
      "API address is not configured. Set EXPO_PUBLIC_API_URL in timeflow-mobile/.env."
    )
  }

  const headers = new Headers(init.headers)
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
  if (activeTenantSlug && !headers.has("x-workspace-slug")) {
    headers.set("x-workspace-slug", activeTenantSlug)
  }

  let response: Response
  try {
    response = await fetchWithTimeout(
      `${API_URL}/api/v1${path}`,
      { ...init, headers },
      timeoutMs
    )
  } catch {
    throw new ApiError(
      `Could not reach the TimeFlow API at ${API_URL}. Check the API address and network connection.`,
      undefined,
      NETWORK_ERROR_CODE
    )
  }

  if (response.status === 401 && retry && refreshToken && path !== "/auth/refresh") {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) return apiRequest<T>(path, init, false, timeoutMs)
  }

  const body = await readResponse(response)
  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : `Request failed (${response.status}).`
    throw new ApiError(
      message,
      response.status,
      typeof body?.code === "string" ? body.code : undefined
    )
  }
  return body as T
}

export const api = {
  get: <T>(path: string, timeoutMs?: number) =>
    apiRequest<T>(path, {}, true, timeoutMs),
  post: <T>(path: string, body: unknown, timeoutMs?: number) =>
    apiRequest<T>(path, { method: "POST", body: JSON.stringify(body) }, true, timeoutMs),
  put: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" })
}

export const isManagementRole = (role: UserRole) =>
  role === "SUPER_ADMIN" || role === "ADMIN" || role === "HR"
