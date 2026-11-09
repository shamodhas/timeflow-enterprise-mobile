import { useEffect, useRef, useState } from "react"
import { Image, Linking, Pressable, Platform, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Google from "expo-auth-session/providers/google"
import * as WebBrowser from "expo-web-browser"

import { api, setActiveTenantSlug, type UserRole } from "../../api" from "../../api"
import { Button, Card, ChoiceRow, Field, Heading, Notice, Page, colors, styles } from "../../ui"

import { messageFrom } from "../../shared/common"

WebBrowser.maybeCompleteAuthSession()

export function AuthScreen({
  onLogin,
  onGoogleLogin,
  initialError = ""
}: {
  onLogin: (email: string, password: string) => Promise<void>
  onGoogleLogin: (accessToken: string) => Promise<void>
  initialError?: string
}) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [tenantSlug, setTenantSlug] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [employeeCode, setEmployeeCode] = useState("")
  const [role, setRole] = useState<UserRole>("EMPLOYEE")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState("")
  const handledGoogleToken = useRef<string | null>(null)
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  const googleEnabled = Boolean(
    Platform.OS === "android"
      ? androidClientId
      : Platform.OS === "ios"
        ? iosClientId
        : webClientId
  )
  // The provider throws when the current platform's client id is undefined, so pass placeholders.
  const [googleRequest, googleResponse, promptGoogleLogin] = Google.useAuthRequest({
    androidClientId: androidClientId || "unset",
    iosClientId: iosClientId || "unset",
    webClientId: webClientId || "unset",
    scopes: ["profile", "email"]
  })

  useEffect(() => {
    if (googleResponse?.type === "error") {
      setError(googleResponse.error?.message ?? "Google sign-in failed.")
      return
    }
    if (googleResponse?.type !== "success") return
    const token =
      googleResponse.authentication?.accessToken ??
      googleResponse.params.access_token
    if (!token) {
      setError("Google sign-in did not return an access token.")
      return
    }
    if (handledGoogleToken.current === token) return
    handledGoogleToken.current = token

    setError("")
    setSuccess("")
    setSubmitting(true)
    void onGoogleLogin(token)
      .catch((loginError) => setError(messageFrom(loginError)))
      .finally(() => setSubmitting(false))
  }, [googleResponse, onGoogleLogin])

  const submit = async () => {
    setError("")
    setSuccess("")
    setSubmitting(true)
    try {
      if (tenantSlug.trim()) {
        await setActiveTenantSlug(tenantSlug.trim())
      }
      if (mode === "login") {
        await onLogin(email.trim(), password)
      } else {
        await api.post("/auth/register", {
          employeeCode: employeeCode.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          role,
          ...(tenantSlug.trim() ? { tenantSlug: tenantSlug.trim().toLowerCase() } : {})
        })
        setSuccess("Access request submitted. Awaiting administrator approval.")
        setMode("login")
        setPassword("")
      }
    } catch (submitError) {
      setError(messageFrom(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Page contentStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View style={{ alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Image
            source={require("../../../assets/ijse-badge.png")}
            style={{ width: 68, height: 68, borderRadius: 16 }}
            resizeMode="contain"
          />
          <Text style={{ color: colors.ink, fontSize: 26, fontWeight: "900", letterSpacing: 0.5 }}>
            IJSE
          </Text>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800", marginTop: -4 }}>
            Institute of Software Engineering
          </Text>
          <Text style={styles.muted}>Enterprise HRM & Attendance System</Text>
        </View>
        <Card>
          <Heading
            title={mode === "login" ? "Welcome back" : "Request access"}
            subtitle={
              mode === "login"
                ? "Sign in with your corporate account."
                : "Your account will be activated after administrator approval."
            }
          />
          {error ? <Notice>{error}</Notice> : null}
          {success ? <Notice tone="success">{success}</Notice> : null}
          {mode === "register" ? (
            <>
              <Field
                label="Employee code"
                value={employeeCode}
                onChangeText={setEmployeeCode}
                placeholder="EMP-001"
                autoCapitalize="characters"
              />
              <Field
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                autoCapitalize="words"
              />
            </>
          ) : null}
          <Field
            label="Workspace Slug (Optional — Auto-detected)"
            value={tenantSlug}
            onChangeText={setTenantSlug}
            placeholder="e.g. ijse, dialog, mas"
            autoCapitalize="none"
          />
          <Field
            label="Corporate email"
            value={email}
            onChangeText={setEmail}
            placeholder="name@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
          />
          {mode === "register" ? (
            <>
              <Text style={styles.label}>Requested role</Text>
              <ChoiceRow
                value={role}
                onChange={(value) => setRole(value as UserRole)}
                options={[
                  { label: "Employee", value: "EMPLOYEE" },
                  { label: "HR", value: "HR" },
                  { label: "Admin", value: "ADMIN" },
                  { label: "Super Admin", value: "SUPER_ADMIN" }
                ]}
              />
            </>
          ) : null}
          <Button
            title={mode === "login" ? "Sign in" : "Submit access request"}
            onPress={() => void submit()}
            loading={submitting}
            disabled={
              !email.trim() ||
              !password ||
              (mode === "register" && (!fullName.trim() || !employeeCode.trim()))
            }
          />
          {googleEnabled && mode === "login" ? (
            <Button
              title="Continue with Google"
              variant="secondary"
              onPress={() => void promptGoogleLogin()}
              disabled={!googleRequest || submitting}
            />
          ) : null}
          <Pressable
            onPress={() => {
              setMode(mode === "login" ? "register" : "login")
              setError("")
              setSuccess("")
            }}
            style={{ padding: 8 }}
          >
            <Text style={{ color: colors.primary, textAlign: "center", fontWeight: "700" }}>
              {mode === "login"
                ? "New to TimeFlow? Request access"
                : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </Card>
        <Pressable
          onPress={() => void Linking.openURL("https://shamodha.com")}
          style={{ marginTop: 20, alignItems: "center" }}
        >
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>
            Developed by <Text style={{ color: colors.primary, fontWeight: "700" }}>shamodha.com</Text>
          </Text>
        </Pressable>
      </Page>
    </SafeAreaView>
  )
}

export function InviteScreen({
  token,
  onComplete
}: {
  token: string
  onComplete: () => void
}) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const activate = async () => {
    setError("")
    setSuccess("")
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirmation) {
      setError("Passwords do not match.")
      return
    }
    setBusy(true)
    try {
      await api.post("/auth/complete-registration", { token, password })
      setSuccess("Account activated. You can now sign in.")
      setPassword("")
      setConfirmation("")
    } catch (activationError) {
      setError(messageFrom(activationError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Page contentStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Card>
          <Heading
            title="Activate your account"
            subtitle="Set a password to finish joining your TimeFlow team."
          />
          {error ? <Notice>{error}</Notice> : null}
          {success ? <Notice tone="success">{success}</Notice> : null}
          {!success ? (
            <>
              <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry />
              <Field label="Confirm password" value={confirmation} onChangeText={setConfirmation} secureTextEntry />
              <Button
                title="Activate account"
                onPress={() => void activate()}
                loading={busy}
                disabled={!password || !confirmation}
              />
            </>
          ) : (
            <Button title="Go to sign in" onPress={onComplete} />
          )}
        </Card>
      </Page>
    </SafeAreaView>
  )
}
