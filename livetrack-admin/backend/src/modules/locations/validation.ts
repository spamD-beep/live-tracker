import { z } from "zod";
export const locationSchema = z.object({
  deviceId:z.string().uuid(), clientLocationId:z.string().min(1).max(100),
  latitude:z.number().min(-90).max(90), longitude:z.number().min(-180).max(180),
  accuracy:z.number().nonnegative().max(100000).optional(), altitude:z.number().min(-1000).max(100000).optional(),
  speed:z.number().nonnegative().max(500).optional(), heading:z.number().min(0).max(360).optional(),
  batteryLevel:z.number().int().min(0).max(100).optional(), isCharging:z.boolean().optional(),
  recordedAt:z.coerce.date().refine(d=>d<=new Date(Date.now()+5*60_000)&&d>=new Date(Date.now()-30*864e5),"Timestamp outside allowed range")
});
