import { Router } from "express";
import { prisma } from "../../config/db.js";
import { authenticate } from "../../middleware/auth.js";
import { getStatus } from "../../utils/status.js";
export const dashboardRouter=Router();dashboardRouter.use(authenticate);
dashboardRouter.get("/summary",async(_req,res)=>{const d=await prisma.device.findMany({select:{lastSeenAt:true,isTracking:true}});const status=d.map(x=>getStatus(x.lastSeenAt));res.json({total:d.length,online:status.filter(x=>x==="ONLINE").length,idle:status.filter(x=>x==="IDLE").length,offline:status.filter(x=>x==="OFFLINE").length,tracking:d.filter(x=>x.isTracking).length});});
dashboardRouter.get("/online-devices",async(_req,res)=>{const d=await prisma.device.findMany({where:{lastSeenAt:{gte:new Date(Date.now()-300000)}},include:{user:{select:{fullName:true}},locations:{orderBy:{recordedAt:"desc"},take:1}}});res.json({devices:d.map(x=>({...x,status:getStatus(x.lastSeenAt),latestLocation:x.locations[0]??null,locations:undefined}))});});
dashboardRouter.get("/recent-activity",async(_req,res)=>res.json({activity:await prisma.auditLog.findMany({orderBy:{createdAt:"desc"},take:30,include:{user:{select:{fullName:true,email:true}}}})}));
