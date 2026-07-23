import { describe,expect,it } from "vitest";import { getStatus } from "./status.js";
describe("device status",()=>{it("classifies recent updates",()=>expect(getStatus(new Date())).toBe("ONLINE"));it("classifies idle updates",()=>expect(getStatus(new Date(Date.now()-120000))).toBe("IDLE"));it("classifies old updates",()=>expect(getStatus(new Date(Date.now()-600000))).toBe("OFFLINE"))});
