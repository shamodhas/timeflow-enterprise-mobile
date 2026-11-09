export type ColorScheme = "light" | "dark"

export const lightPalette = {
  background: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#f4f6fa",
  inputBg: "#ffffff",
  ink: "#0f172a",
  muted: "#64748b",
  placeholder: "#9aa5b5",
  line: "#e2e8f0",
  primary: "#2563eb",
  primarySoft: "#eaf0ff",
  primaryBorder: "#c7d6ff",
  green: "#13855b",
  greenSoft: "#e7f7ef",
  greenBorder: "#c9e8d8",
  orange: "#b75b0b",
  orangeSoft: "#fff3e6",
  red: "#b42318",
  redSoft: "#fff0ee",
  skeleton: "#e8edf4",
  skeletonShimmer: "#f8fafc",
  overlay: "rgba(15,23,42,0.42)"
}

export type Palette = typeof lightPalette

export const darkPalette: Palette = {
  background: "#0b1020",
  surface: "#131a2b",
  surfaceAlt: "#1a2338",
  inputBg: "#0f1626",
  ink: "#f1f5f9",
  muted: "#94a3b8",
  placeholder: "#64748b",
  line: "#263149",
  primary: "#4f8dfd",
  primarySoft: "#1b2a4d",
  primaryBorder: "#2f4a86",
  green: "#34d399",
  greenSoft: "#11352a",
  greenBorder: "#1f5a45",
  orange: "#fbbf24",
  orangeSoft: "#3a2e12",
  red: "#f87171",
  redSoft: "#3b1d28",
  skeleton: "#1e283d",
  skeletonShimmer: "#2a3753",
  overlay: "rgba(0,0,0,0.6)"
}

// Mutated in place on scheme change so every `colors.x` read picks up the new palette.
export const colors: Palette = { ...lightPalette }

export const setPalette = (scheme: ColorScheme) => {
  Object.assign(colors, scheme === "dark" ? darkPalette : lightPalette)
}
