import { describe,expect,it } from "vitest";
import { locationSchema } from "./validation.js";
const valid={deviceId:"123e4567-e89b-12d3-a456-426614174000",clientLocationId:"x",latitude:24.8,longitude:67,recordedAt:new Date()};
describe("location validation",()=>{it("accepts valid coordinates",()=>expect(locationSchema.safeParse(valid).success).toBe(true));it("rejects impossible latitude",()=>expect(locationSchema.safeParse({...valid,latitude:91}).success).toBe(false));it("rejects invalid battery",()=>expect(locationSchema.safeParse({...valid,batteryLevel:101}).success).toBe(false));it("rejects future timestamps",()=>expect(locationSchema.safeParse({...valid,recordedAt:new Date(Date.now()+9999999)}).success).toBe(false))});
