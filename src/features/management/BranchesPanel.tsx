import { useCallback, useEffect, useState } from "react"
import { Text, View } from "react-native"

import * as Location from "expo-location"
import { api } from "../../api"
import { Button, Card, EmptyState, Field, Heading, Notice, SectionTitle, SkeletonList, colors, styles } from "../../ui"

import { messageFrom } from "../../shared/common"

type Branch = {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  isActive: boolean
}

export function BranchesPanel() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [editingId, setEditingId] = useState("")
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [radius, setRadius] = useState("500")
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setError("")
    try {
      setBranches(await api.get<Branch[]>("/branches"))
    } catch (loadError) {
      setError(messageFrom(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const clear = () => {
    setEditingId("")
    setName("")
    setAddress("")
    setLatitude("")
    setLongitude("")
    setRadius("500")
  }

  const searchAddress = async () => {
    const query = address.trim()
    if (!query) return
    setSearching(true)
    setError("")
    try {
      const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1" })
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      )
      if (!response.ok) {
        throw new Error(`Address search failed (${response.status}).`)
      }
      const results = (await response.json()) as { lat: string; lon: string }[]
      const result = results[0]
      if (!result) {
        setError("No matching place found. Try a more specific address.")
        return
      }
      setLatitude(String(Number(Number(result.lat).toFixed(6))))
      setLongitude(String(Number(Number(result.lon).toFixed(6))))
    } catch (searchError) {
      setError(messageFrom(searchError))
    } finally {
      setSearching(false)
    }
  }

  const useCurrentLocation = async () => {
    setError("")
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (!permission.granted) {
        setError("Location permission is required to read this device's coordinates.")
        return
      }
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      })
      setLatitude(String(result.coords.latitude))
      setLongitude(String(result.coords.longitude))
    } catch (locationError) {
      setError(messageFrom(locationError))
    }
  }

  const save = async () => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    const radiusMeters = Number(radius)
    if (
      !name.trim() ||
      !Number.isFinite(lat) ||
      Math.abs(lat) > 90 ||
      !Number.isFinite(lng) ||
      Math.abs(lng) > 180 ||
      !Number.isInteger(radiusMeters) ||
      radiusMeters < 1
    ) {
      setError("Enter a name, valid coordinates, and a positive whole-number radius.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const payload = { name: name.trim(), latitude: lat, longitude: lng, radiusMeters }
      if (editingId) {
        const existing = branches.find((branch) => branch.id === editingId)
        await api.patch(`/branches/${editingId}`, {
          ...payload,
          isActive: existing?.isActive ?? true
        })
      } else {
        await api.post("/branches", payload)
      }
      clear()
      await load()
    } catch (saveError) {
      setError(messageFrom(saveError))
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (branch: Branch) => {
    setBusy(true)
    setError("")
    try {
      await api.patch(`/branches/${branch.id}`, {
        name: branch.name,
        latitude: branch.latitude,
        longitude: branch.longitude,
        radiusMeters: branch.radiusMeters,
        isActive: !branch.isActive
      })
      await load()
    } catch (toggleError) {
      setError(messageFrom(toggleError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <Heading
        title="Branch locations"
        subtitle="Active branches are used to verify clock-in and clock-out locations."
      />
      {error ? <Notice>{error}</Notice> : null}
      <Card>
        <Heading title={editingId ? "Edit branch" : "Add branch"} subtitle="Active branch geofences are used to verify clock-in and clock-out." />
        <Field label="Branch name" value={name} onChangeText={setName} />
        <Field
          label="Search for a branch address"
          value={address}
          onChangeText={setAddress}
          placeholder="Search a place or address"
        />
        <Button
          title={searching ? "Searching..." : "Search address"}
          variant="secondary"
          onPress={() => void searchAddress()}
          loading={searching}
          disabled={!address.trim()}
        />
        <View style={{ flexDirection: "row", gap: 9 }}>
          <View style={{ flex: 1 }}>
            <Field label="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" />
          </View>
        </View>
        <Field label="Radius in meters" value={radius} onChangeText={setRadius} keyboardType="numeric" />
        <Button title="Use this device's location" variant="secondary" onPress={() => void useCurrentLocation()} />
        <Text style={styles.muted}>
          Search for an address or enter its coordinates. Map data © OpenStreetMap contributors.
        </Text>
        <Button title={editingId ? "Save branch" : "Create branch"} onPress={() => void save()} loading={busy} />
        {editingId ? <Button title="Cancel edit" variant="secondary" onPress={clear} /> : null}
      </Card>
      <Card>
        <SectionTitle title="Branch locations" />
        {loading ? <SkeletonList rows={4} /> : null}
        {!branches.length && !loading ? <EmptyState>No branches have been configured.</EmptyState> : null}
        {!loading && branches.map((branch) => (
          <View key={branch.id} style={{ borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 12, gap: 6 }}>
            <Text style={{ color: colors.ink, fontWeight: "800" }}>{branch.name}</Text>
            <Text style={styles.muted}>
              {branch.latitude}, {branch.longitude} · {branch.radiusMeters} m · {branch.isActive ? "Active" : "Inactive"}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Edit"
                  compact
                  variant="secondary"
                  onPress={() => {
                    setEditingId(branch.id)
                    setName(branch.name)
                    setLatitude(String(branch.latitude))
                    setLongitude(String(branch.longitude))
                    setRadius(String(branch.radiusMeters))
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={branch.isActive ? "Deactivate" : "Activate"}
                  compact
                  variant={branch.isActive ? "danger" : "success"}
                  onPress={() => void toggle(branch)}
                  loading={busy}
                />
              </View>
            </View>
          </View>
        ))}
      </Card>
    </View>
  )
}
