import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Activity, BatteryCharging, Clock3, Radio, Smartphone, WifiOff } from "lucide-react";
import { api } from "../lib/api";
import { connectSocket } from "../lib/socket";
import { useAuth } from "../store/auth";
import type { Device } from "../types";
import { LiveMap } from "../components/LiveMap";
import { StatusBadge } from "../components/StatusBadge";
import "./Dashboard.css";

export function Dashboard() {
  const queryClient = useQueryClient();
  const token = useAuth(state => state.accessToken)!;
  const [selected, setSelected] = useState<string>();
  const summary = useQuery({ queryKey: ["summary"], queryFn: () => api.get("/dashboard/summary").then(response => response.data) });
  const devices = useQuery({ queryKey: ["devices"], queryFn: () => api.get("/devices").then(response => response.data.devices as Device[]) });
  const trackingDevices = (devices.data ?? []).filter(device => device.isTracking);

  useEffect(() => {
    const socket = connectSocket(token);
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    };
    socket.on("device:location", refresh).on("device:online", refresh).on("device:offline", refresh).on("device:updated", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);

  const cards = [
    ["Total fleet", summary.data?.total, Smartphone, "All registered"],
    ["Online now", summary.data?.online, Radio, "Updated < 60 sec"],
    ["Idle", summary.data?.idle, Clock3, "1-5 min ago"],
    ["Offline", summary.data?.offline, WifiOff, "> 5 min ago"],
    ["Tracking", summary.data?.tracking, Activity, "Consent enabled"],
  ] as const;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">OPERATIONS OVERVIEW</span>
          <h1>Command center</h1>
          <p>Live visibility across your authorized device fleet.</p>
        </div>
      </div>

      <div className="stats">
        {cards.map(([label, value, Icon, note], index) => (
          <article key={label} className={`stat s${index}`}>
            <span className="stat-icon"><Icon /></span>
            <div>
              <span>{label}</span>
              <b>{summary.isLoading ? "-" : value}</b>
              <small>{note}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="map-card">
          <div className="card-head">
            <div>
              <h2>Live operations map</h2>
              <span>Markers update automatically</span>
            </div>
            <div className="legend"><i className="online" /> Online <i className="idle" /> Idle <i className="offline" /> Offline</div>
          </div>
          {devices.isLoading ? <div className="skeleton map" /> : <LiveMap devices={trackingDevices} selected={selected} onSelect={setSelected} />}
        </section>

        <section className="fleet-card">
          <div className="card-head">
            <div>
              <h2>Fleet status</h2>
              <span>{trackingDevices.length} tracking devices</span>
            </div>
          </div>
          <div className="fleet-list">
            {trackingDevices.map(device => (
              <button key={device.id} className={selected === device.id ? "selected" : ""} onClick={() => setSelected(device.id)}>
                <span className="device-icon"><Smartphone /></span>
                <span>
                  <b>{device.deviceName}</b>
                  <small>{device.user.fullName} - {device.platform}</small>
                </span>
                <span>
                  <StatusBadge status={device.status} />
                  <small className="battery"><BatteryCharging /> {device.latestLocation?.batteryLevel ?? "-"}%</small>
                </span>
              </button>
            ))}
            {!devices.isLoading && !trackingDevices.length && <div className="empty">No devices are actively tracking.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
