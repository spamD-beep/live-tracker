import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GoogleMap,
  InfoWindowF,
  MarkerF,
  PolylineF,
  useJsApiLoader
} from "@react-google-maps/api";
import type { Device, Location } from "../types";
import "./LiveMap.css";

const center = { lat: 30.3, lng: 69.3 };
const mapOptions: google.maps.MapOptions = {
  clickableIcons: false,
  fullscreenControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  zoomControl: true,
  gestureHandling: "greedy"
};

export function LiveMap({
  devices,
  route = [],
  selected,
  onSelect
}: {
  devices: Device[];
  route?: Location[];
  selected?: string;
  onSelect?: (id: string) => void;
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    id: "livetrack-google-map",
    googleMapsApiKey: apiKey ?? ""
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [openDevice, setOpenDevice] = useState<string | undefined>(selected);
  const locatedDevices = useMemo(
    () => devices.filter(device => device.latestLocation),
    [devices]
  );

  useEffect(() => setOpenDevice(selected), [selected]);

  useEffect(() => {
    if (!map || !locatedDevices.length) return;
    const bounds = new google.maps.LatLngBounds();
    locatedDevices.forEach(device => {
      bounds.extend({
        lat: device.latestLocation!.latitude,
        lng: device.latestLocation!.longitude
      });
    });
    map.fitBounds(bounds, 60);
    if (locatedDevices.length === 1) {
      const listener = google.maps.event.addListenerOnce(map, "idle", () => {
        if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
      });
      return () => google.maps.event.removeListener(listener);
    }
  }, [map, locatedDevices]);

  const chooseDevice = useCallback((id: string) => {
    setOpenDevice(id);
    onSelect?.(id);
  }, [onSelect]);

  if (!apiKey) {
    return <FallbackLiveMap devices={devices} selected={selected} onSelect={onSelect} />;
  }
  if (loadError) {
    return <div className="map map-message">Google Maps could not be loaded. Check the API key restrictions.</div>;
  }
  if (!isLoaded) {
    return <div className="map map-message">Loading Google Maps...</div>;
  }

  return (
    <GoogleMap
      mapContainerClassName="map"
      center={center}
      zoom={5}
      options={mapOptions}
      onLoad={setMap}
      onUnmount={() => setMap(null)}
    >
      {locatedDevices.map(device => {
        const location = device.latestLocation!;
        const position = { lat: location.latitude, lng: location.longitude };
        const estimate = device.latestEstimate;
        const place = estimate?.room?.name ?? estimate?.floor?.name ?? estimate?.office?.name;
        return (
          <MarkerF
            key={device.id}
            position={position}
            title={device.deviceName}
            onClick={() => chooseDevice(device.id)}
          >
            {openDevice === device.id && (
              <InfoWindowF position={position} onCloseClick={() => setOpenDevice(undefined)}>
                <div className="popup google-popup">
                  <b>{device.deviceName}</b>
                  <span>{device.user.fullName}</span>
                  {place && (
                    <span>
                      <strong>{place}</strong> - {estimate?.status} {Math.round((estimate?.confidence ?? 0) * 100)}%
                    </span>
                  )}
                  <hr />
                  <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
                  <span>GPS approx {location.accuracy ?? "-"} m - indoor estimate is primary</span>
                  <span>Speed {location.speed ?? "-"} m/s</span>
                  <span>Battery {location.batteryLevel ?? "-"}% {location.isCharging ? "- Charging" : ""}</span>
                  <button onClick={() => chooseDevice(device.id)}>Open details</button>
                </div>
              </InfoWindowF>
            )}
          </MarkerF>
        );
      })}
      {route.length > 1 && (
        <PolylineF
          path={route.map(point => ({ lat: point.latitude, lng: point.longitude }))}
          options={{ strokeColor: "#3478dc", strokeWeight: 4, strokeOpacity: .9 }}
        />
      )}
    </GoogleMap>
  );
}

function FallbackLiveMap({
  devices,
  selected,
  onSelect
}: {
  devices: Device[];
  selected?: string;
  onSelect?: (id: string) => void;
}) {
  const locatedDevices = devices.filter(device => device.latestLocation);
  if (!locatedDevices.length) {
    return <div className="map map-message">Waiting for mobile location updates...</div>;
  }

  const lats = locatedDevices.map(device => device.latestLocation!.latitude);
  const lngs = locatedDevices.map(device => device.latestLocation!.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 0.01);
  const spanLng = Math.max(maxLng - minLng, 0.01);

  return (
    <div className="map fallback-map">
      {locatedDevices.map(device => {
        const location = device.latestLocation!;
        const left = 8 + ((location.longitude - minLng) / spanLng) * 84;
        const top = 92 - ((location.latitude - minLat) / spanLat) * 84;
        const estimate = device.latestEstimate;
        const place = estimate?.room?.name ?? estimate?.floor?.name ?? "Room unknown";
        return (
          <button
            key={device.id}
            className={`fallback-marker ${selected === device.id ? "selected" : ""}`}
            style={{ left: `${left}%`, top: `${top}%` }}
            onClick={() => onSelect?.(device.id)}
            title={`${device.deviceName}: ${place}`}
          >
            <span />
            <b>{device.deviceName}</b>
            <small>{place}</small>
          </button>
        );
      })}
    </div>
  );
}
