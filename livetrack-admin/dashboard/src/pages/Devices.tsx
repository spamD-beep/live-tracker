import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import type { Device } from "../types";
import { StatusBadge } from "../components/StatusBadge";

export function Devices(){
  const [q,setQ]=useState(""),[status,setStatus]=useState("ALL");
  const role=useAuth(state=>state.user?.role);
  const {data=[],isLoading}=useQuery({queryKey:["devices"],queryFn:()=>api.get("/devices").then(r=>r.data.devices as Device[])});
  const rows=data.filter(d=>(status==="ALL"||d.status===status)&&`${d.deviceName} ${d.user.fullName}`.toLowerCase().includes(q.toLowerCase()));
  return <div className="page"><div className="page-title"><div><span className="eyebrow">{role==="MANAGER"?"AUTHORIZED TEAM":"FLEET MANAGEMENT"}</span><h1>{role==="MANAGER"?"Team search":"Devices"}</h1><p>{role==="MANAGER"?"Search and monitor only employees assigned to your team.":"Search, monitor, and manage authorized devices."}</p></div></div><section className="table-card"><div className="toolbar"><label><Search/><input placeholder="Search device or owner..." value={q} onChange={e=>setQ(e.target.value)}/></label><div><SlidersHorizontal/>{["ALL","ONLINE","IDLE","OFFLINE"].map(s=><button key={s} className={status===s?"active":""} onClick={()=>setStatus(s)}>{s}</button>)}</div></div><table><thead><tr><th>Device</th><th>Owner</th><th>Platform</th><th>Tracking</th><th>Status</th><th>Estimated location</th><th>Battery</th><th>Last seen</th><th/></tr></thead><tbody>{isLoading?<tr><td colSpan={9}>Loading fleet...</td></tr>:rows.map(d=><tr key={d.id}><td><b>{d.deviceName}</b><small>{d.deviceUuid}</small></td><td>{d.user.fullName}</td><td>{d.platform}</td><td><span className={d.isTracking?"tracking on":"tracking"}>{d.isTracking?"Enabled":"Paused"}</span></td><td><StatusBadge status={d.status}/></td><td><b>{d.latestEstimate?.room?.name ?? d.latestEstimate?.floor?.name ?? "Unknown"}</b><small>{d.latestEstimate ? `${d.latestEstimate.status} - ${Math.round(d.latestEstimate.confidence*100)}%` : "No Wi-Fi estimate yet"}</small></td><td>{d.latestLocation?.batteryLevel??"-"}%</td><td>{d.lastSeenAt?new Date(d.lastSeenAt).toLocaleString():"Never"}</td><td><Link to={`/devices/${d.id}`}>View</Link></td></tr>)}</tbody></table>{!isLoading&&!rows.length&&<div className="empty">No devices match these filters.</div>}</section></div>
}
