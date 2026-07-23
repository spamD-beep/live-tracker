export type DeviceStatus = "ONLINE" | "IDLE" | "OFFLINE";
export const getStatus = (lastSeenAt?: Date | string | null): DeviceStatus => {
  if (!lastSeenAt) return "OFFLINE";
  const age = Date.now() - new Date(lastSeenAt).getTime();
  return age <= 60_000 ? "ONLINE" : age <= 300_000 ? "IDLE" : "OFFLINE";
};
