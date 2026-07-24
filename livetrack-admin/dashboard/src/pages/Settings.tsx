import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { useAuth } from "../store/auth";

type Office = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  timezone: string;
  floors?: Floor[];
  accessPoints?: AccessPoint[];
};
type Floor = { id: string; name: string; floorOrder: number; rooms: Room[] };
type Room = {
  id: string;
  name: string;
  type: string;
  _count?: { calibrationSessions: number; fingerprintSamples: number; fingerprints: number };
  calibrationSessions?: { id: string; status: string; startedAt: string; publishedAt?: string | null; _count: { samples: number } }[];
  fingerprints?: { id: string; bssid: string; sampleCount: number; publishedAt: string }[];
};
type AccessPoint = { id: string; bssid: string; ssid?: string; label?: string; stabilityStatus: string };
type RecentObservation = {
  id: string;
  officeStatus: string;
  capturedAt: string;
  accessPointCount: number;
  device: { deviceName: string; user: { fullName: string; email: string } };
  accessPoints: { bssid: string; ssid?: string; rssi: number; frequencyMhz?: number }[];
};

const initialOffice = { name: "", latitude: "0", longitude: "0", geofenceRadiusMeters: "150", timezone: "UTC" };

export function Settings() {
  const user = useAuth(state => state.user);
  const queryClient = useQueryClient();
  const [officeForm, setOfficeForm] = useState(initialOffice);
  const [selectedOfficeId, setSelectedOfficeId] = useState("");
  const [floorForm, setFloorForm] = useState({ name: "", floorOrder: "0" });
  const [roomForm, setRoomForm] = useState({ floorId: "", name: "", type: "ROOM" });
  const [apForm, setApForm] = useState({ bssid: "", ssid: "", label: "" });
  const [calibration, setCalibration] = useState({ roomId: "", sessionId: "", bssid: "", ssid: "", rssi: "-55", deviceModel: "" });
  const [selectedObservationIds, setSelectedObservationIds] = useState<string[]>([]);
  const [calibrationSampleCount, setCalibrationSampleCount] = useState(0);
  const [calibrationNotice, setCalibrationNotice] = useState("");
  const [scanFilter, setScanFilter] = useState("");

  const offices = useQuery({ queryKey: ["offices"], queryFn: () => api.get("/offices").then(response => response.data.offices as Office[]) });
  const structure = useQuery({
    queryKey: ["office-structure", selectedOfficeId],
    enabled: Boolean(selectedOfficeId),
    queryFn: () => api.get(`/offices/${selectedOfficeId}/structure`).then(response => response.data.office as Office)
  });
  const recentObservations = useQuery({
    queryKey: ["office-observations", selectedOfficeId],
    enabled: Boolean(selectedOfficeId),
    refetchInterval: 15_000,
    queryFn: () => api.get(`/offices/${selectedOfficeId}/recent-observations?limit=50`).then(response => response.data.observations as RecentObservation[])
  });

  useEffect(() => {
    if (!selectedOfficeId && offices.data?.[0]) setSelectedOfficeId(offices.data[0].id);
  }, [offices.data, selectedOfficeId]);

  const floors = structure.data?.floors ?? [];
  const rooms = useMemo(() => floors.flatMap(floor => floor.rooms.map(room => ({ ...room, floorName: floor.name }))), [floors]);
  const filteredObservations = useMemo(() => {
    const query = scanFilter.trim().toLowerCase();
    const observations = recentObservations.data ?? [];
    if (!query) return observations;
    return observations.filter(observation => {
      const text = [
        observation.device.user.fullName,
        observation.device.user.email,
        observation.device.deviceName,
        observation.officeStatus,
        ...observation.accessPoints.map(accessPoint => `${accessPoint.ssid ?? ""} ${accessPoint.bssid}`)
      ].join(" ").toLowerCase();
      return text.includes(query);
    });
  }, [recentObservations.data, scanFilter]);
  const calibratedRooms = rooms.filter(room => (room.fingerprints?.length ?? 0) > 0).length;

  const refreshOffice = () => {
    queryClient.invalidateQueries({ queryKey: ["offices"] });
    queryClient.invalidateQueries({ queryKey: ["office-structure", selectedOfficeId] });
  };

  const createOffice = useMutation({
    mutationFn: () => toast.promise(api.post("/offices", {
      name: officeForm.name,
      latitude: Number(officeForm.latitude),
      longitude: Number(officeForm.longitude),
      geofenceRadiusMeters: Number(officeForm.geofenceRadiusMeters),
      timezone: officeForm.timezone
    }), {
      loading: "Creating office geofence...",
      success: "Office geofence created.",
      error: errorMessage
    }),
    onSuccess: response => {
      setSelectedOfficeId(response.data.office.id);
      setOfficeForm(initialOffice);
      refreshOffice();
    }
  });

  const createFloor = useMutation({
    mutationFn: () => toast.promise(api.post(`/offices/${selectedOfficeId}/floors`, { name: floorForm.name, floorOrder: Number(floorForm.floorOrder) }), {
      loading: "Adding floor...",
      success: "Floor added.",
      error: errorMessage
    }),
    onSuccess: () => {
      setFloorForm({ name: "", floorOrder: "0" });
      refreshOffice();
    }
  });

  const createRoom = useMutation({
    mutationFn: () => toast.promise(api.post(`/offices/floors/${roomForm.floorId}/rooms`, { name: roomForm.name, type: roomForm.type }), {
      loading: "Adding room...",
      success: "Room added.",
      error: errorMessage
    }),
    onSuccess: () => {
      setRoomForm({ floorId: roomForm.floorId, name: "", type: "ROOM" });
      refreshOffice();
    }
  });

  const upsertAccessPoint = useMutation({
    mutationFn: () => toast.promise(api.post(`/offices/${selectedOfficeId}/access-points`, apForm), {
      loading: "Saving Wi-Fi booster...",
      success: "Wi-Fi booster saved.",
      error: errorMessage
    }),
    onSuccess: () => {
      setApForm({ bssid: "", ssid: "", label: "" });
      refreshOffice();
    }
  });

  const startSession = useMutation({
    mutationFn: () => toast.promise(api.post(`/offices/rooms/${calibration.roomId}/calibration-sessions`, { notes: "Dashboard calibration session" }), {
      loading: "Starting calibration session...",
      success: "Calibration session ready.",
      error: errorMessage
    }),
    onSuccess: response => {
      setCalibration(current => ({ ...current, sessionId: response.data.session.id }));
      setSelectedObservationIds([]);
      setCalibrationSampleCount(0);
      setCalibrationNotice("Session ready. Select phone scans or add manual samples.");
    }
  });

  const addSample = useMutation({
    mutationFn: () => toast.promise(api.post(`/offices/calibration-sessions/${calibration.sessionId}/samples`, {
      samples: [{
        bssid: calibration.bssid,
        ssid: calibration.ssid || undefined,
        rssi: Number(calibration.rssi),
        deviceModel: calibration.deviceModel || undefined,
        capturedAt: new Date().toISOString()
      }]
    }), {
      loading: "Adding calibration sample...",
      success: response => `Added ${response.data.added ?? 1} sample reading.`,
      error: errorMessage
    }),
    onSuccess: response => {
      setCalibration(current => ({ ...current, bssid: "", ssid: "", rssi: current.rssi }));
      setCalibrationSampleCount(current => current + Number(response.data.added ?? 1));
      setCalibrationNotice("Manual sample added.");
    },
    onError: error => setCalibrationNotice(errorMessage(error))
  });

  const importObservationSamples = useMutation({
    mutationFn: () => toast.promise(api.post(`/offices/calibration-sessions/${calibration.sessionId}/samples-from-observations`, {
      observationIds: selectedObservationIds,
      deviceModel: calibration.deviceModel || undefined
    }), {
      loading: "Importing selected phone scans...",
      success: response => `Imported ${response.data.added ?? 0} Wi-Fi readings.`,
      error: errorMessage
    }),
    onSuccess: response => {
      const added = Number(response.data.added ?? 0);
      setSelectedObservationIds([]);
      setCalibrationSampleCount(current => current + added);
      setCalibrationNotice(`Imported ${added} Wi-Fi readings from ${response.data.importedObservations ?? selectedObservationIds.length} phone scan(s).`);
      refreshOffice();
      queryClient.invalidateQueries({ queryKey: ["office-observations", selectedOfficeId] });
    },
    onError: error => setCalibrationNotice(errorMessage(error))
  });

  const publishSession = useMutation({
    mutationFn: () => toast.promise(api.post(`/offices/calibration-sessions/${calibration.sessionId}/publish`), {
      loading: "Publishing room fingerprint...",
      success: response => `Published ${response.data.fingerprints?.length ?? 0} fingerprints.`,
      error: errorMessage
    }),
    onSuccess: () => {
      setCalibration(current => ({ ...current, sessionId: "" }));
      setSelectedObservationIds([]);
      setCalibrationSampleCount(0);
      setCalibrationNotice("Fingerprint published.");
      refreshOffice();
    },
    onError: error => setCalibrationNotice(errorMessage(error))
  });

  const isAdmin = user?.role === "ADMIN";
  const toggleObservation = (id: string) => setSelectedObservationIds(current =>
    current.includes(id) ? current.filter(item => item !== id) : [...current, id]
  );

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">OFFICE INDOOR SETUP</span>
          <h1>Settings</h1>
          <p>Configure geofences, floors, rooms, boosters, and Wi-Fi calibration.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section>
          <h2>Profile</h2>
          <label>Full name<input value={user?.fullName ?? ""} readOnly /></label>
          <label>Email<input value={user?.email ?? ""} readOnly /></label>
          <label>Role<input value={user?.role ?? ""} readOnly /></label>
        </section>

        <section>
          <h2>Office geofence</h2>
          <label>Active office
            <select value={selectedOfficeId} onChange={event => setSelectedOfficeId(event.target.value)}>
              <option value="">Select office</option>
              {offices.data?.map(office => <option key={office.id} value={office.id}>{office.name}</option>)}
            </select>
          </label>
          <label>Office name<input value={officeForm.name} onChange={event => setOfficeForm({ ...officeForm, name: event.target.value })} /></label>
          <label>Latitude<input value={officeForm.latitude} onChange={event => setOfficeForm({ ...officeForm, latitude: event.target.value })} /></label>
          <label>Longitude<input value={officeForm.longitude} onChange={event => setOfficeForm({ ...officeForm, longitude: event.target.value })} /></label>
          <label>Radius meters<input value={officeForm.geofenceRadiusMeters} onChange={event => setOfficeForm({ ...officeForm, geofenceRadiusMeters: event.target.value })} /></label>
          <button className="primary small" disabled={!isAdmin || !officeForm.name || createOffice.isPending} onClick={() => createOffice.mutate()}>Create office</button>
        </section>

        <section>
          <h2>Floors and rooms</h2>
          <label>Floor name<input value={floorForm.name} onChange={event => setFloorForm({ ...floorForm, name: event.target.value })} /></label>
          <label>Floor order<input value={floorForm.floorOrder} onChange={event => setFloorForm({ ...floorForm, floorOrder: event.target.value })} /></label>
          <button className="primary small" disabled={!isAdmin || !selectedOfficeId || !floorForm.name || createFloor.isPending} onClick={() => createFloor.mutate()}>Add floor</button>
          <label>Room floor
            <select value={roomForm.floorId} onChange={event => setRoomForm({ ...roomForm, floorId: event.target.value })}>
              <option value="">Select floor</option>
              {floors.map(floor => <option key={floor.id} value={floor.id}>{floor.name}</option>)}
            </select>
          </label>
          <label>Room / zone name<input value={roomForm.name} onChange={event => setRoomForm({ ...roomForm, name: event.target.value })} /></label>
          <button className="primary small" disabled={!isAdmin || !roomForm.floorId || !roomForm.name || createRoom.isPending} onClick={() => createRoom.mutate()}>Add room</button>
        </section>

        <section>
          <h2>Existing Wi-Fi boosters</h2>
          <label>BSSID<input placeholder="aa:bb:cc:11:22:33" value={apForm.bssid} onChange={event => setApForm({ ...apForm, bssid: event.target.value })} /></label>
          <label>SSID<input value={apForm.ssid} onChange={event => setApForm({ ...apForm, ssid: event.target.value })} /></label>
          <label>Label<input value={apForm.label} onChange={event => setApForm({ ...apForm, label: event.target.value })} /></label>
          <button className="primary small" disabled={!isAdmin || !selectedOfficeId || !apForm.bssid || upsertAccessPoint.isPending} onClick={() => upsertAccessPoint.mutate()}>Save booster</button>
          <p className="empty">{structure.data?.accessPoints?.length ?? 0} booster identifiers registered.</p>
        </section>

        <section>
          <h2>Calibration sample</h2>
          <div className="calibration-progress">
            <b>{calibratedRooms}/{rooms.length || 0} rooms calibrated</b>
            <span>Collect 2-3 phone scans inside each room, import them, then publish that room fingerprint.</span>
          </div>
          <label>Room
            <select value={calibration.roomId} onChange={event => setCalibration({ ...calibration, roomId: event.target.value, sessionId: "" })}>
              <option value="">Select room</option>
              {rooms.map(room => <option key={room.id} value={room.id}>{room.floorName} - {room.name}</option>)}
            </select>
          </label>
          <button className="primary small" disabled={!isAdmin || !calibration.roomId || startSession.isPending} onClick={() => startSession.mutate()}>
            {calibration.sessionId ? "Session ready" : "Start session"}
          </button>
          {calibrationNotice && <p className="status-note">{calibrationNotice}</p>}
          <label>Sample BSSID<input value={calibration.bssid} onChange={event => setCalibration({ ...calibration, bssid: event.target.value })} /></label>
          <label>RSSI dBm<input value={calibration.rssi} onChange={event => setCalibration({ ...calibration, rssi: event.target.value })} /></label>
          <label>Device model<input value={calibration.deviceModel} onChange={event => setCalibration({ ...calibration, deviceModel: event.target.value })} /></label>
          <div className="calibration-actions">
            <button className="primary small" disabled={!isAdmin || !calibration.sessionId || !calibration.bssid || addSample.isPending} onClick={() => addSample.mutate()}>Add sample</button>
            <button className="primary small" disabled={!isAdmin || !calibration.sessionId || !selectedObservationIds.length || importObservationSamples.isPending} onClick={() => importObservationSamples.mutate()}>
              Import {selectedObservationIds.length || ""} phone scans
            </button>
            <button className="primary small" disabled={!isAdmin || !calibration.sessionId || !calibrationSampleCount || publishSession.isPending} onClick={() => publishSession.mutate()}>Publish fingerprint</button>
          </div>
          <div className="calibration-summary">
            <span>{selectedObservationIds.length} scans selected</span>
            <span>{calibrationSampleCount} readings in this session</span>
            <span>{recentObservations.data?.length ?? 0} latest scans loaded</span>
          </div>
          <label>Find phone scan<input placeholder="Search by name, email, device, or Wi-Fi name" value={scanFilter} onChange={event => setScanFilter(event.target.value)} /></label>
          <div className="scan-list">
            {filteredObservations.map(observation => (
              <button type="button" key={observation.id} className={selectedObservationIds.includes(observation.id) ? "selected" : ""} onClick={() => toggleObservation(observation.id)}>
                <b>{selectedObservationIds.includes(observation.id) ? "[selected] " : ""}{observation.device.user.fullName}</b>
                <span>{new Date(observation.capturedAt).toLocaleTimeString()} - {observation.accessPointCount} BSSIDs - {observation.officeStatus}</span>
                <small>{observation.accessPoints.slice(0, 3).map(accessPoint => `${accessPoint.ssid || accessPoint.bssid} ${accessPoint.rssi}dBm`).join(" | ")}</small>
              </button>
            ))}
            {!recentObservations.data?.length && <p className="empty">Start tracking on a phone to capture live Wi-Fi scans.</p>}
            {Boolean(recentObservations.data?.length) && !filteredObservations.length && <p className="empty">No scans match this filter.</p>}
          </div>
        </section>

        <section>
          <h2>Current structure</h2>
          <div className="structure-list">
            {floors.map(floor => (
              <article key={floor.id} className="structure-card">
                <div>
                  <b>{floor.name}</b>
                  <span>{floor.rooms.length} rooms / zones</span>
                </div>
                <div className="room-chip-list">
                  {floor.rooms.map(room => {
                    const activeFingerprintCount = room.fingerprints?.length ?? 0;
                    const sampleCount = room._count?.fingerprintSamples ?? 0;
                    const latestSession = room.calibrationSessions?.[0];
                    return (
                      <small key={room.id} className={activeFingerprintCount ? "ready" : sampleCount ? "draft" : "pending"}>
                        <b>{room.name}</b>
                        <span>
                          {activeFingerprintCount ? `${activeFingerprintCount} fingerprints` : sampleCount ? `${sampleCount} samples pending publish` : "Needs samples"}
                        </span>
                        {latestSession && <em>{latestSession.status.toLowerCase()}</em>}
                      </small>
                    );
                  })}
                  {!floor.rooms.length && <small>No rooms yet</small>}
                </div>
              </article>
            ))}
          </div>
          {!floors.length && <div className="empty">Create an office, then add floors and rooms.</div>}
        </section>
      </div>
    </div>
  );
}

function errorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  return "Request failed. Please try again.";
}
