import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;

export function getSocket(tenantId: string, userId: string): Socket {
  if (_socket?.connected) return _socket;

  _socket = io("/", {
    path: "/socket.io",
    auth: { tenantId, userId },
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    transports: ["websocket", "polling"],
  });

  _socket.on("connect", () => console.info("[Socket] Connected", _socket?.id));
  _socket.on("disconnect", (r) => console.warn("[Socket] Disconnected", r));

  return _socket;
}

export function disconnectSocket() {
  _socket?.disconnect();
  _socket = null;
}
