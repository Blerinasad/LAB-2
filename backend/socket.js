// ============================================================
// socket.js
// Inicializon dhe ekspozon instancën e Socket.IO në mënyrë
// të centralizuar, që shërbimet (market.service.js, cron.js, etj.)
// ta importojnë pa krijuar varësi rrethore me index.js.
// ============================================================
import { Server } from "socket.io";

let io = null;

/**
 * Krijon instancën e Socket.IO të lidhur me HTTP server-in.
 * Duhet thirrur VETËM një herë, nga index.js.
 */
export function initSocket(httpServer, corsOptions) {
  io = new Server(httpServer, { cors: corsOptions });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Frontend dërgon userId menjëherë pas login
    socket.on("join", (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`Socket ${socket.id} -> room user_${userId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Kthen instancën aktive të Socket.IO.
 * Përdoret nga services/cron që duan të emetojnë event live,
 * pa pasur nevojë të importojnë index.js.
 */
export function getIO() {
  return io;
}
