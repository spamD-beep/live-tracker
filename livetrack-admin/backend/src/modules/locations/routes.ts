import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { authenticate } from "../../middleware/auth.js";
import { deviceScope, findVisibleDevice } from "../../services/privacy.js";
import { broadcast } from "../../sockets/index.js";
import { getStatus } from "../../utils/status.js";
import { locationSchema } from "./validation.js";
export const locationsRouter = Router(); locationsRouter.use(authenticate);
const allowed = async (deviceId:string,u:NonNullable<Express.Request["user"]>) => findVisibleDevice(deviceId,u);
async function ingest(data:z.infer<typeof locationSchema>,user:NonNullable<Express.Request["user"]>){
  const device=await allowed(data.deviceId,user); if(!device)throw Object.assign(new Error("Device not found or not authorized"),{status:403});
  const location=await prisma.$transaction(async tx=>{const l=await tx.location.upsert({where:{clientLocationId:data.clientLocationId},create:data,update:{}});await tx.device.update({where:{id:data.deviceId},data:{lastSeenAt:new Date(),isTracking:true}});return l;});
  broadcast("device:location",{...location,device:{id:device.id,deviceName:device.deviceName},status:"ONLINE"}); broadcast("device:online",{deviceId:device.id}); return location;
}
locationsRouter.post("/",async(req,res)=>{const location=await ingest(locationSchema.parse(req.body),req.user!);res.status(201).json(location);});
locationsRouter.post("/batch",async(req,res)=>{const items=z.array(locationSchema).min(1).max(100).parse(req.body);const locations=[];for(const item of items)locations.push(await ingest(item,req.user!));res.status(201).json({locations});});
locationsRouter.get("/latest",async(req,res)=>{const devices=await prisma.device.findMany({where:deviceScope(req.user!),include:{user:{select:{fullName:true}},locations:{orderBy:{recordedAt:"desc"},take:1}}});res.json({locations:devices.filter(d=>d.locations[0]).map(d=>({...d.locations[0],device:{id:d.id,deviceName:d.deviceName,owner:d.user.fullName,isTracking:d.isTracking,lastSeenAt:d.lastSeenAt},status:getStatus(d.lastSeenAt)}))});});
