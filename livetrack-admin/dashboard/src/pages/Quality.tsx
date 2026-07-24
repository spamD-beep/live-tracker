import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BatteryWarning, CheckCircle2, RadioTower, SignalLow, Wifi } from "lucide-react";
import { api } from "../lib/api";

type QualityResponse = {
  window: { since: string; until: string; lowConfidenceThreshold: number };
  totals: {
    estimates: number;
    unknown: number;
    lowConfidence: number;
    unknownRate: number;
    lowConfidenceRate: number;
    staleDevices: number;
  };
  staleDevices: {
    id: string;
    deviceName: string;
    userName: string;
    lastSeenAt?: string | null;
    secondsStale?: number | null;
    latestEstimate?: { room?: string | null; floor?: string | null; office?: string | null; status: string; confidence: number } | null;
  }[];
  confusionMatrix: { room: string; total: number; correct: number; accuracy: number; health: string; predicted: { name: string; count: number }[] }[];
  problemBssids: { bssid: string; ssid?: string | null; count: number; averageRssi: number; range: string }[];
  recentLowQuality: {
    id: string;
    userName: string;
    deviceName: string;
    office?: string | null;
    floor?: string | null;
    room?: string | null;
    status: string;
    confidence: number;
    observedAt: string;
  }[];
};

export function QualityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["quality-dashboard"],
    refetchInterval: 20_000,
    queryFn: () => api.get("/dashboard/quality").then(response => response.data as QualityResponse)
  });

  const totals = data?.totals;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">SIGNAL QUALITY</span>
          <h1>Quality dashboard</h1>
          <p>Unknown rate, low-confidence estimates, stale devices, room confusion, and Wi-Fi signal issues.</p>
        </div>
      </div>

      <div className="stats quality-stats">
        <article className="stat s3">
          <span className="stat-icon"><AlertTriangle /></span>
          <div><span>Unknown rate</span><b>{percent(totals?.unknownRate)}</b><small>{totals?.unknown ?? 0} unknown estimates</small></div>
        </article>
        <article className="stat s2">
          <span className="stat-icon"><SignalLow /></span>
          <div><span>Low confidence</span><b>{percent(totals?.lowConfidenceRate)}</b><small>below {percent(data?.window.lowConfidenceThreshold)}</small></div>
        </article>
        <article className="stat s4">
          <span className="stat-icon"><BatteryWarning /></span>
          <div><span>Stale devices</span><b>{totals?.staleDevices ?? 0}</b><small>tracking but not updating</small></div>
        </article>
        <article className="stat s1">
          <span className="stat-icon"><CheckCircle2 /></span>
          <div><span>Total estimates</span><b>{totals?.estimates ?? 0}</b><small>last 24 hours</small></div>
        </article>
      </div>

      <div className="quality-grid">
        <section className="table-card quality-panel">
          <div className="card-head"><div><h2>Room confusion matrix</h2><span>Latest published session replay. Low score means recalibrate that room.</span></div></div>
          {isLoading && <p className="empty">Loading quality metrics...</p>}
          {!isLoading && !data?.confusionMatrix.length && <p className="empty">No calibrated rooms yet.</p>}
          <div className="quality-list">
            {data?.confusionMatrix.map(row => (
              <article key={row.room} className="quality-row">
                <div>
                  <b>{row.room}</b>
                  <span>{row.correct}/{row.total} replay samples matched</span>
                </div>
                <strong className={row.accuracy >= 0.75 ? "good" : row.accuracy >= 0.5 ? "warn" : "bad"}>{percent(row.accuracy)}</strong>
                <em className={row.health === "HEALTHY" ? "quality-health good" : row.health === "NEEDS_MORE_SAMPLES" ? "quality-health warn" : "quality-health bad"}>
                  {healthLabel(row.health)}
                </em>
                <div className="confusion-chips">
                  {row.predicted.map(item => <small key={item.name}>{item.name}: {item.count}</small>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="table-card quality-panel">
          <div className="card-head"><div><h2>Problem BSSIDs</h2><span>Most common radios in unknown or low-confidence scans</span></div></div>
          <div className="quality-list">
            {data?.problemBssids.map(item => (
              <article key={item.bssid} className="quality-row compact">
                <RadioTower />
                <div>
                  <b>{item.ssid || item.bssid}</b>
                  <span>{item.bssid} - avg {item.averageRssi} dBm - {item.range}</span>
                </div>
                <strong>{item.count}</strong>
              </article>
            ))}
            {!isLoading && !data?.problemBssids.length && <p className="empty">No problem BSSIDs in the current window.</p>}
          </div>
        </section>

        <section className="table-card quality-panel">
          <div className="card-head"><div><h2>Stale devices</h2><span>Tracking devices without recent updates</span></div></div>
          <div className="quality-list">
            {data?.staleDevices.map(device => (
              <article key={device.id} className="quality-row compact">
                <Wifi />
                <div>
                  <b>{device.userName}</b>
                  <span>{device.deviceName} - last seen {age(device.secondsStale)}</span>
                </div>
                <strong>{device.latestEstimate?.status ?? "none"}</strong>
              </article>
            ))}
            {!isLoading && !data?.staleDevices.length && <p className="empty">No stale tracking devices.</p>}
          </div>
        </section>

        <section className="table-card quality-panel">
          <div className="card-head"><div><h2>Recent low-quality estimates</h2><span>Unknown, near, or below threshold results</span></div></div>
          <div className="quality-list">
            {data?.recentLowQuality.map(item => (
              <article key={item.id} className="quality-row">
                <div>
                  <b>{item.userName}</b>
                  <span>{item.floor ?? "No floor"} - {item.room ?? "Unknown room"} - {new Date(item.observedAt).toLocaleTimeString()}</span>
                </div>
                <strong className={item.status === "UNKNOWN" ? "bad" : "warn"}>{item.status} {percent(item.confidence)}</strong>
              </article>
            ))}
            {!isLoading && !data?.recentLowQuality.length && <p className="empty">No low-quality estimates in the current window.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function percent(value?: number) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function age(seconds?: number | null) {
  if (seconds == null) return "never";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

function healthLabel(value: string) {
  if (value === "HEALTHY") return "Healthy";
  if (value === "NEEDS_MORE_SAMPLES") return "Needs more samples";
  if (value === "NO_DATA") return "No calibration data";
  return "Needs recalibration";
}
