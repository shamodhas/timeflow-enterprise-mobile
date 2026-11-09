import { useCallback, useEffect, useRef, useState } from "react"
import { useColorScheme } from "react-native"
import * as SecureStore from "expo-secure-store"
import { refreshStyles } from "./styles"
import { setPalette, type ColorScheme } from "./theme"

const COLOR_SCHEME_KEY = "timeflow-color-scheme"
let applied: ColorScheme | null = null

// Applies palette + rebuilt styles synchronously; call during render before children read them.
export const applyColorScheme = (scheme: ColorScheme) => {
  if (applied === scheme) return
  applied = scheme
  setPalette(scheme)
  refreshStyles()
}

export const useAppColorScheme = (): [
  ColorScheme,
  (scheme: ColorScheme) => void,
  string
] => {
  const systemScheme: ColorScheme = useColorScheme() === "dark" ? "dark" : "light"
  const [override, setOverride] = useState<ColorScheme | null>(null)
  const [error, setError] = useState("")
  const hasUserSelection = useRef(false)
  const scheme = override ?? systemScheme

  applyColorScheme(scheme)

  useEffect(() => {
    let active = true
    void SecureStore.getItemAsync(COLOR_SCHEME_KEY)
      .then((stored) => {
        if (
          active &&
          !hasUserSelection.current &&
          (stored === "light" || stored === "dark")
        ) {
          setOverride(stored)
        }
      })
      .catch((storageError: unknown) => {
        if (active) {
          setError(
            storageError instanceof Error
              ? `Could not load appearance preference: ${storageError.message}`
              : "Could not load appearance preference."
          )
        }
      })
    return () => {
      active = false
    }
  }, [])

  const chooseScheme = useCallback((nextScheme: ColorScheme) => {
    hasUserSelection.current = true
    setOverride(nextScheme)
    setError("")
    void SecureStore.setItemAsync(COLOR_SCHEME_KEY, nextScheme).catch(
      (storageError: unknown) => {
        setError(
          storageError instanceof Error
            ? `Could not save appearance preference: ${storageError.message}`
            : "Could not save appearance preference."
        )
      }
    )
  }, [])

  return [scheme, chooseScheme, error]
}
