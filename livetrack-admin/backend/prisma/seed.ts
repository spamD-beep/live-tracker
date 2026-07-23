import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Platform, Role } from "@prisma/client";
const p=new PrismaClient();
const centers=[[24.8607,67.0011],[31.5204,74.3587],[33.6844,73.0479],[30.1575,71.5249],[25.396,68.3578]];
async function main(){
  const passwordHash=await bcrypt.hash("DemoPass123!",12);
  const admin=await p.user.upsert({where:{email:"admin@livetrack.test"},update:{},create:{fullName:"Ayesha Khan",email:"admin@livetrack.test",passwordHash,role:Role.ADMIN}});
  await p.user.upsert({where:{email:"viewer@livetrack.test"},update:{},create:{fullName:"Omar Siddiqui",email:"viewer@livetrack.test",passwordHash,role:Role.VIEWER}});
  for(let i=0;i<5;i++){const seen=i<2?new Date(Date.now()-i*30000):i===2?new Date(Date.now()-180000):new Date(Date.now()-(i+2)*600000);const d=await p.device.upsert({where:{deviceUuid:`demo-device-${i+1}`},update:{lastSeenAt:seen},create:{userId:admin.id,deviceUuid:`demo-device-${i+1}`,deviceName:["Field Alpha","Courier 12","Service Van","Safety Unit","Warehouse Tablet"][i]!,platform:i%2?Platform.IOS:Platform.ANDROID,appVersion:"2.4.1",isTracking:i!==4,lastSeenAt:seen}});const center=centers[i]!;for(let j=0;j<24;j++){await p.location.upsert({where:{clientLocationId:`seed-${i}-${j}`},update:{},create:{deviceId:d.id,clientLocationId:`seed-${i}-${j}`,latitude:center[0]!+j*.0005,longitude:center[1]!+Math.sin(j/3)*.002,accuracy:5+i,speed:8+i*2,batteryLevel:Math.max(0,92-i*14-j),isCharging:i===4,recordedAt:new Date(seen.getTime()-(23-j)*300000)}});}}
}main().finally(()=>p.$disconnect());
