import { useEffect, useState } from "react"
import {
  Image,
  Modal,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View
} from "react-native"
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics
} from "react-native-safe-area-context"
import {
  api,
  ApiError,
  persistTokens,
  restoreTokens,
  setSessionExpiredHandler,
  type User
} from "./src/api"
import * as ExpoLinking from "expo-linking"
import {
  AttendanceScreen,
  AuthScreen,
  DashboardScreen,
  InviteScreen,
  LeavesScreen,
  ManagementScreen
} from "./src/screens"
import { AppIcon, navIcons } from "./src/ui/AppIcon"
import {
  Button,
  Card,
  colors,
  Heading,
  SkeletonBlock,
  SkeletonCard,
  SkeletonMetrics,
  styles,
  useAppColorScheme
} from "./src/ui"
import {
  checkIsOnline,
  getCachedUser,
  initNetworkSyncListener,
  persistCachedUser,
  syncOfflineEssentialData,
  syncPendingAttendance,
  validateTokensLocally
} from "./src/shared/offline"

type Screen =
  | "Dashboard"
  | "Employees"
  | "Attendance"
  | "All Attendance"
  | "Leaves"
  | "Branches"
  | "Data Import"

const navigationItems: {
  key: Screen
  icon: string
  roles?: User["role"][]
}[] = [
  { key: "Dashboard", icon: "âŒ‚" },
  { key: "Employees", icon: "â™™", roles: ["SUPER_ADMIN", "ADMIN", "HR"] },
  { key: "Attendance", icon: "â—·" },
  { key: "All Attendance", icon: "â—·", roles: ["SUPER_ADMIN", "ADMIN", "HR"] },
  { key: "Leaves", icon: "â–¤" },
  { key: "Branches", icon: "âŒ–", roles: ["SUPER_ADMIN", "ADMIN", "HR"] },
  { key: "Data Import", icon: "â‡§", roles: ["SUPER_ADMIN"] }
]

const bottomItems: { key: Screen | "Menu"; icon: string }[] = [
  { key: "Dashboard", icon: "âŒ‚" },
  { key: "Attendance", icon: "â—·" },
  { key: "Leaves", icon: "â–¤" },
  { key: "Menu", icon: "â˜°" }
]

function MainApp() {
  const [scheme, chooseScheme, appearanceError] = useAppColorScheme()
  const statusBarStyle = scheme === "dark" ? "light-content" : "dark-content"
  const [user, setUser] = useState<User | null>(null)
  const [authNotice, setAuthNotice] = useState("")
  const [screen, setScreen] = useState<Screen>("Dashboard")
  const [booting, setBooting] = useState(true)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const unsubscribe = initNetworkSyncListener((online) => {
      setIsOffline(!online);
      if (!online) {
        setScreen((curr) => (curr !== "Attendance" ? "Attendance" : curr));
      }
    });
    return unsubscribe;
  }, []);



  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null)
      setAuthNotice("Your session expired. Please sign in again.")
    })
    return () => setSessionExpiredHandler(null)
  }, [])

  useEffect(() => {
    const readInvitation = (url: string | null) => {
      const token = url ? ExpoLinking.parse(url).queryParams?.token : null
      if (typeof token === "string" && token.trim()) {
        setInviteToken(token)
        setUser(null)
      }
    }
    void Linking.getInitialURL().then(readInvitation)
    const subscription = Linking.addEventListener("url", ({ url }) =>
      readInvitation(url)
    )
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      try {
        const tokens = await restoreTokens()
        const cachedUser = await getCachedUser()
        const isOnline = await checkIsOnline()

        if (!tokens.access && !tokens.refresh) {
          if (active) setBooting(false)
          return
        }

        if (isOnline) {
          try {
            const response = await api.get<User | { user: User }>("/auth/me")
            const restoredUser =
              "user" in response ? response.user : response
            await persistCachedUser(restoredUser)
            if (active) {
              setUser(restoredUser)
              setIsOffline(false)
            }
            void syncOfflineEssentialData()
            void syncPendingAttendance()
            return
          } catch (onlineErr) {
            if (
              onlineErr instanceof ApiError &&
              (onlineErr.status === 401 || onlineErr.status === 403)
            ) {
              await persistTokens(null, null)
              await persistCachedUser(null)
              if (active) {
                setUser(null)
                setAuthNotice("Your session expired. Please sign in again.")
              }
              return
            }
          }
        }

        // Offline mode or network error: validate tokens locally!
        const validation = validateTokensLocally(tokens.access, tokens.refresh)

        if (validation.status === "valid" || validation.status === "refresh_valid") {
          if (cachedUser) {
            if (active) {
              setUser(cachedUser)
              setIsOffline(true)
              setScreen("Attendance")
            }
          } else if (validation.claims?.id) {
            const fallbackUser: User = {
              id: validation.claims.id,
              fullName: "Employee",
              email: "",
              role: validation.claims.role || "EMPLOYEE"
            }
            if (active) {
              setUser(fallbackUser)
              setIsOffline(true)
              setScreen("Attendance")
            }
          } else {
            if (active) {
              setAuthNotice("Please connect to the internet to complete initial sign-in.")
            }
          }
        } else if (validation.status === "expired") {
          await persistTokens(null, null)
          await persistCachedUser(null)
          if (active) {
            setUser(null)
            setAuthNotice("Your session has expired. Please connect to the internet to sign in.")
          }
        }
      } catch (restoreError) {
        if (restoreError instanceof Error) {
          setAuthNotice(restoreError.message)
        } else {
          setAuthNotice("Could not restore your session. Please try again.")
        }
      } finally {
        if (active) setBooting(false)
      }
    }
    void restoreSession()
    return () => {
      active = false
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await api.post<{
      token: string
      refreshToken: string
      user: User
    }>("/auth/login", { email, password })
    await persistTokens(response.token, response.refreshToken)
    await persistCachedUser(response.user)
    setAuthNotice("")
    setUser(response.user)
    setIsOffline(false)
    setScreen("Dashboard")
    void syncOfflineEssentialData()
    void syncPendingAttendance()
  }

  const googleLogin = async (accessToken: string) => {
    const response = await api.post<{
      token: string
      refreshToken: string
      user: User
    }>("/auth/google", { token: accessToken })
    await persistTokens(response.token, response.refreshToken)
    await persistCachedUser(response.user)
    setAuthNotice("")
    setUser(response.user)
    setIsOffline(false)
    setScreen("Dashboard")
    void syncOfflineEssentialData()
    void syncPendingAttendance()
  }

  const logout = async () => {
    await persistTokens(null, null)
    await persistCachedUser(null)
    setAuthNotice("")
    setUser(null)
    setScreen("Dashboard")
  }

  if (booting) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
          gap: 16,
          paddingHorizontal: 20
        }}
      >
        <StatusBar barStyle={statusBarStyle} backgroundColor="transparent" translucent />
        <Image
          source={require("./assets/ijse-badge.png")}
          style={{ width: 64, height: 64, borderRadius: 16 }}
          resizeMode="contain"
        />
        <SkeletonBlock width={180} height={22} radius={7} />
        <SkeletonMetrics count={2} />
        <SkeletonCard rows={2} />
      </SafeAreaView>
    )
  }

  if (inviteToken) {
    return (
      <>
        <StatusBar barStyle={statusBarStyle} backgroundColor="transparent" translucent />
        <InviteScreen
          token={inviteToken}
          onComplete={() => setInviteToken(null)}
        />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <StatusBar barStyle={statusBarStyle} backgroundColor="transparent" translucent />
        <AuthScreen
          onLogin={login}
          onGoogleLogin={googleLogin}
          initialError={authNotice}
        />
      </>
    )
  }

  const availableItems = navigationItems.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={statusBarStyle} backgroundColor="transparent" translucent />
      <View
        style={{
          minHeight: 64,
          paddingHorizontal: 18,
          paddingVertical: 10,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          onPress={() => setMenuOpen(true)}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: colors.background
          }}
        >
          <AppIcon name="menu" color={colors.ink} size={26} />
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <Image
            source={require("./assets/ijse-badge.png")}
            style={{ width: 34, height: 34, borderRadius: 9 }}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "900", letterSpacing: 0.3 }}>
              IJSE
            </Text>
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "600" }} numberOfLines={1}>
              Institute of Software Engineering
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open account menu for ${user.fullName}`}
          onPress={() => setAccountOpen(true)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }}>
            {user.fullName.charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {isOffline ? (
          <View
            style={{
              backgroundColor: colors.orange,
              paddingVertical: 7,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
              ðŸ“¶ NO DATA SIGNAL Â· OFFLINE ATTENDANCE ONLY
            </Text>
          </View>
        ) : null}
        {isOffline && screen !== "Attendance" ? (
          <ScrollView contentContainerStyle={styles.page}>
            <Card
              style={{
                borderColor: colors.orange,
                backgroundColor: colors.orangeSoft,
                padding: 18,
                gap: 12
              }}
            >
              <Text style={{ color: colors.orange, fontWeight: "900", fontSize: 16 }}>
                ðŸ“¶ Data Signal Not Available
              </Text>
              <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }}>
                You are currently offline. During offline mode, only Employee Attendance marking is available. Other enterprise services require an active internet connection.
              </Text>
              <Button
                title="Go to My Attendance"
                onPress={() => setScreen("Attendance")}
              />
            </Card>
          </ScrollView>
        ) : (
          <>
            {screen === "Dashboard" ? <DashboardScreen user={user} /> : null}
            {screen === "Attendance" ? (
              <AttendanceScreen isOfflineMode={isOffline} />
            ) : null}
            {screen === "Leaves" ? <LeavesScreen user={user} /> : null}
            {screen === "Employees" ||
            screen === "All Attendance" ||
            screen === "Branches" ||
            screen === "Data Import" ? (
              <ManagementScreen user={user} section={screen} />
            ) : null}
          </>
        )}
      </View>

      <View
        style={{
          minHeight: 62,
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          paddingHorizontal: 8,
          paddingTop: 5,
          paddingBottom: 4
        }}
      >
        {bottomItems.map((item) => {
          const selected =
            item.key === "Menu"
              ? !["Dashboard", "Attendance", "Leaves"].includes(screen)
              : screen === item.key
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.key === "Menu" ? "Open all navigation" : item.key}
              accessibilityState={{ selected }}
              onPress={() => {
                if (item.key === "Menu") {
                  setMenuOpen(true)
                } else {
                  setScreen(item.key)
                }
              }}
              style={{
                flex: 1,
                minHeight: 56,
                alignItems: "center",
                justifyContent: "center",
                gap: 2
              }}
            >
              <View
                style={{
                  minWidth: 56,
                  height: 32,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? colors.primarySoft : "transparent"
                }}
              >
                <AppIcon
                  name={navIcons[item.key][selected ? "active" : "idle"]}
                  color={selected ? colors.primary : colors.muted}
                  size={24}
                />
              </View>
              <Text
                style={{
                  color: selected ? colors.primary : colors.muted,
                  fontSize: 11,
                  fontWeight: selected ? "800" : "600"
                }}
              >
                {item.key}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.overlay }}>
          <SafeAreaView
            style={{
              width: "86%",
              maxWidth: 330,
              flexGrow: 0,
              flexShrink: 1,
              backgroundColor: colors.surface
            }}
          >
            <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
              <View
                style={{
                  minHeight: 54,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 2,
                  marginBottom: 16
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Image
                    source={require("./assets/ijse-badge.png")}
                    style={{ width: 40, height: 40, borderRadius: 10 }}
                    resizeMode="contain"
                  />
                  <View>
                    <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                      IJSE<Text style={{ color: colors.primary }}>.</Text>
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 }}>
                      INSTITUTE OF SOFTWARE ENGINEERING
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close navigation menu"
                  onPress={() => setMenuOpen(false)}
                  style={{
                    width: 40,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 13,
                    backgroundColor: colors.surfaceAlt
                  }}
                >
                  <AppIcon name="close" color={colors.muted} size={21} />
                </Pressable>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 18 }}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: colors.primarySoft,
                    borderColor: colors.primaryBorder,
                    borderWidth: 1,
                    gap: 12
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>
                      {user.fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }} numberOfLines={1}>
                      {user.fullName}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      {user.email}
                    </Text>
                    <View
                      style={{
                        alignSelf: "flex-start",
                        marginTop: 7,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 7,
                        backgroundColor: colors.surface
                      }}
                    >
                      <Text style={{ color: colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>
                        {user.role.replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 1,
                    marginTop: 24,
                    marginBottom: 9,
                    marginLeft: 4
                  }}
                >
                  APPEARANCE
                </Text>
                <View
                  accessibilityRole="radiogroup"
                  style={{
                    flexDirection: "row",
                    padding: 4,
                    borderRadius: 15,
                    backgroundColor: colors.surfaceAlt
                  }}
                >
                  {(["light", "dark"] as const).map((option) => {
                    const selected = scheme === option
                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="radio"
                        accessibilityLabel={`${option === "light" ? "Light" : "Dark"} mode`}
                        accessibilityState={{ selected }}
                        onPress={() => chooseScheme(option)}
                        style={{
                          flex: 1,
                          minHeight: 44,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 7,
                          borderRadius: 11,
                          backgroundColor: selected ? colors.surface : "transparent",
                          borderWidth: selected ? 1 : 0,
                          borderColor: selected ? colors.line : "transparent"
                        }}
                      >
                        <AppIcon
                          name={option === "light" ? "sunny-outline" : "moon-outline"}
                          color={selected ? colors.primary : colors.muted}
                          size={18}
                        />
                        <Text
                          style={{
                            color: selected ? colors.ink : colors.muted,
                            fontSize: 13,
                            fontWeight: selected ? "800" : "600"
                          }}
                        >
                          {option === "light" ? "Light" : "Dark"}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                {appearanceError ? (
                  <Text
                    accessibilityRole="alert"
                    style={{ color: colors.red, fontSize: 11, marginTop: 8, marginHorizontal: 4 }}
                  >
                    {appearanceError}
                  </Text>
                ) : null}

                <View
                  style={{
                    marginTop: 25,
                    marginBottom: 9,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 4
                  }}
                >
                  <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                    WORKSPACE
                  </Text>
                  <Text style={{ color: colors.placeholder, fontSize: 10, fontWeight: "700" }}>
                    {availableItems.length} ITEMS
                  </Text>
                </View>
                <View style={{ gap: 5 }}>
                  {availableItems.map((item) => {
                    const selected = screen === item.key
                    return (
                      <Pressable
                        key={item.key}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setScreen(item.key)
                          setMenuOpen(false)
                        }}
                        style={{
                          minHeight: 52,
                          paddingHorizontal: 10,
                          borderRadius: 15,
                          backgroundColor: selected ? colors.primarySoft : "transparent",
                          borderWidth: selected ? 1 : 0,
                          borderColor: selected ? colors.primaryBorder : "transparent",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12
                        }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 11,
                            backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <AppIcon
                            name={navIcons[item.key][selected ? "active" : "idle"]}
                            color={selected ? "#fff" : colors.muted}
                            size={19}
                          />
                        </View>
                        <Text
                          style={{
                            flex: 1,
                            color: selected ? colors.primary : colors.ink,
                            fontSize: 14,
                            fontWeight: selected ? "800" : "600"
                          }}
                        >
                          {item.key}
                        </Text>
                        {selected ? <AppIcon name="chevron-forward" color={colors.primary} size={17} /> : null}
                      </Pressable>
                    )
                  })}
                </View>
              </ScrollView>

              <View
                style={{
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.line
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                  onPress={() => {
                    setMenuOpen(false)
                    void logout()
                  }}
                  style={{
                    minHeight: 48,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    borderRadius: 14,
                    backgroundColor: colors.redSoft
                  }}
                >
                  <AppIcon name="log-out-outline" color={colors.red} size={20} />
                  <Text style={{ color: colors.red, fontSize: 14, fontWeight: "800" }}>Sign out</Text>
                </Pressable>
                <Pressable
                  onPress={() => void Linking.openURL("https://shamodha.com")}
                  style={{ marginTop: 12, alignItems: "center", paddingVertical: 4 }}
                >
                  <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "500" }}>
                    Developed by <Text style={{ color: colors.primary, fontWeight: "700" }}>shamodha.com</Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
            onPress={() => setMenuOpen(false)}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
      <Modal
        visible={accountOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close account menu"
          onPress={() => setAccountOpen(false)}
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            alignItems: "center",
            justifyContent: "center",
            padding: 24
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: colors.surface,
              borderRadius: 20,
              borderColor: colors.line,
              borderWidth: 1,
              padding: 20,
              gap: 16
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 15,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>
                  {user.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>
                  {user.fullName}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                  {user.email}
                </Text>
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "800", marginTop: 3 }}>
                  {user.role.replace("_", " ")}
                </Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAccountOpen(false)
                void logout()
              }}
              style={{
                minHeight: 44,
                borderRadius: 12,
                backgroundColor: colors.redSoft,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: colors.red, fontSize: 13, fontWeight: "800" }}>
                Sign out
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <MainApp />
    </SafeAreaProvider>
  )
}
