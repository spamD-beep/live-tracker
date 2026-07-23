import { io } from "socket.io-client";
export const connectSocket=(token:string)=>io(import.meta.env.VITE_SOCKET_URL??"http://localhost:4000",{auth:{token},reconnection:true,reconnectionDelayMax:5000});
