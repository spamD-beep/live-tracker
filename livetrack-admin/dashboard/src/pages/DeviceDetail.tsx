import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import type { Device, Location } from "../types";
import { LiveMap } from "../components/LiveMap";
import { StatusBadge } from "../components/StatusBadge";
import "./Point3.css";

type Office = { id: string; name: string; floors?: { id: string; name: string; rooms: { id: string; name: string }[] }[] };

export function DeviceDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [reportedRoomId, setReportedRoomId] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const device = useQuery({
    queryKey: ["device", id],
    queryFn: () => api.get(`/devices/${id}`).then(response => response.data as Device)
  });
  const route = useQuery({
    queryKey: ["route", id],
    queryFn: () => api.get(`/devices/${id}/route`).then(response => response.data.points as Location[])
  });
  const stats = useQuery({
    queryKey: ["stats", id],
    queryFn: () => api.get(`/devices/${id}/statistics`).then(response => response.data)
  });
  const rooms = useQuery({
    queryKey: ["correction-rooms"],
    queryFn: async () => {
      const { data } = await api.get("/offices");
      const structures = await Promise.all((data.offices as Office[]).map(office => api.get(`/offices/${office.id}/structure`).then(response => response.data.office as Office)));
      return structures.flatMap(office => (office.floors ?? []).flatMap(floor => floor.rooms.map(room => ({ ...room, floorName: floor.name, officeName: office.name }))));
    }
  });
  const roomOptions = useMemo(() => rooms.data ?? [], [rooms.data]);
  const correction = useMutation({
    mutationFn: () => toast.promise(api.post(`/devices/${id}/corrections`, {
      reportedRoomId: reportedRoomId || undefined,
      note: correctionNote || undefined
    }), {
      loading: "Submitting room correction...",
      success: "Room correction reported.",
      error: "Unable to report correction."
    }),
    onSuccess: () => {
      setReportedRoomId("");
      setCorrectionNote("");
      queryClient.invalidateQueries({ queryKey: ["device", id] });
    }
  });

  if (!device.data) return <div className="page">Loading device...</div>;

  const estimate = device.data.latestEstimate;
  const place = estimate?.room?.name ?? estimate?.floor?.name ?? estimate?.office?.name ?? "No indoor estimate";

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">DEVICE DETAILS</span>
          <h1>{device.data.deviceName}</h1>
          <p>{device.data.user.fullName} - {device.data.platform} - {device.data.appVersion ?? "No app version"}</p>
        </div>
        <StatusBadge status={device.data.status} />
      </div>

      <div className="detail-stats">
        {[
          ["Estimated location", place],
          ["Confidence", `${Math.round((estimate?.confidence ?? 0) * 100)}%`],
          ["Estimate status", estimate?.status ?? "UNKNOWN"],
          ["GPS accuracy", `${Math.round(device.data.latestLocation?.accuracy ?? 0)} m`]
        ].map(item => <article key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></article>)}
      </div>

      <div className="status-note">
        GPS can drift indoors and may appear on a nearby road. Office presence and room/floor estimates come from Wi-Fi fingerprints, so use the estimated location above as the primary indoor result.
      </div>

      <section className="table-card correction-panel">
        <div className="card-head"><div><h2>Report incorrect room</h2><span>Use this when the estimated room does not match the real room.</span></div></div>
        <div className="correction-form">
          <label>
            Correct room
            <select value={reportedRoomId} onChange={event => setReportedRoomId(event.target.value)}>
              <option value="">Select room</option>
              {roomOptions.map(room => <option key={room.id} value={room.id}>{room.officeName} / {room.floorName} / {room.name}</option>)}
            </select>
          </label>
          <label>
            Note
            <input value={correctionNote} onChange={event => setCorrectionNote(event.target.value)} placeholder="Optional note for calibration review" />
          </label>
          <button className="primary small" disabled={correction.isPending || !reportedRoomId} onClick={() => correction.mutate()}>Submit correction</button>
        </div>
      </section>

      <div className="detail-stats">
        {[
          ["Distance", `${stats.data?.totalDistanceKm ?? 0} km`],
          ["Average speed", `${stats.data?.averageSpeed ?? 0} m/s`],
          ["Maximum speed", `${stats.data?.maximumSpeed ?? 0} m/s`],
          ["Recorded points", stats.data?.points ?? 0]
        ].map(item => <article key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></article>)}
      </div>

      <section className="detail-map">
        <LiveMap devices={[device.data]} route={route.data ?? []} />
      </section>
    </div>
  );
}
