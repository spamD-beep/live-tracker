import type { Server } from "socket.io";
import { verifyAccess } from "../utils/auth.js";
let io: Server | undefined;
export function configureSockets(server: Server) {
  io = server;
  server.use((socket, next) => {
    try { const token = socket.handshake.auth.token ?? socket.handshake.headers.authorization?.replace(/^Bearer /, ""); socket.data.user = verifyAccess(token); next(); }
    catch { next(new Error("Authentication error")); }
  });
  server.on("connection", socket => socket.join(`user:${socket.data.user.sub}`));
}
export const broadcast = (event: string, data: unknown) => io?.emit(event, data);
