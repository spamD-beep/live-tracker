import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, UsersRound, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import "./Point3.css";

type OccupancyResponse = {
  window: { activeSince: string; generatedAt: string };
  totals: { activeDevices: number; roomsOccupied: number; unknown: number };
  rooms: {
    office?: string | null;
    floor?: string | null;
    room?: string | null;
    status: string;
    occupancy: number;
    averageConfidence: number;
    people: {
      deviceId: string;
      deviceName: string;
      userName: string;
      userEmail?: string;
      status: string;
      confidence: number;
      observedAt?: string;
    }[];
  }[];
};

export function OccupancyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["occupancy"],
    refetchInterval: 15_000,
    queryFn: () => api.get("/dashboard/occupancy").then(response => response.data as OccupancyResponse)
  });
  const totals = data?.totals;
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">ROOM OCCUPANCY</span>
          <h1>Occupancy view</h1>
          <p>Active, consent-enabled devices grouped by current room estimate.</p>
        </div>
      </div>
      <div className="stats quality-stats">
        <article className="stat s1"><span className="stat-icon"><UsersRound /></span><div><span>Active people</span><b>{totals?.activeDevices ?? 0}</b><small>tracking in last 5 min</small></div></article>
        <article className="stat s2"><span className="stat-icon"><Building2 /></span><div><span>Rooms occupied</span><b>{totals?.roomsOccupied ?? 0}</b><small>with named estimates</small></div></article>
        <article className="stat s3"><span className="stat-icon"><WifiOff /></span><div><span>Unknown room</span><b>{totals?.unknown ?? 0}</b><small>needs calibration signal</small></div></article>
        <article className="stat s4"><span className="stat-icon"><CheckCircle2 /></span><div><span>Updated</span><b>{data ? new Date(data.window.generatedAt).toLocaleTimeString() : "-"}</b><small>auto refreshes</small></div></article>
      </div>
      <section className="table-card quality-panel">
        <div className="card-head"><div><h2>Current room occupancy</h2><span>Manager view is automatically limited to assigned employees.</span></div></div>
        {isLoading && <p className="empty">Loading occupancy...</p>}
        {!isLoading && !data?.rooms.length && <p className="empty">No active room occupancy yet.</p>}
        <div className="occupancy-grid">
          {data?.rooms.map(room => (
            <article key={`${room.office}-${room.floor}-${room.room ?? "unknown"}`} className="occupancy-card">
              <div>
                <span>{room.office ?? "No office"} / {room.floor ?? "No floor"}</span>
                <b>{room.room ?? "Unknown room"}</b>
              </div>
              <strong>{room.occupancy}</strong>
              <small>{room.status} - {Math.round(room.averageConfidence * 100)}% average confidence</small>
              <div className="occupancy-people">
                {room.people.map(person => (
                  <Link key={person.deviceId} to={`/devices/${person.deviceId}`}>
                    <b>{person.userName}</b>
                    <span>{person.deviceName} - {Math.round(person.confidence * 100)}%</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
