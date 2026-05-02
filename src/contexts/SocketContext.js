import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";

// Create Context and Hook
const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

// === CONFIG ===
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/api$/, '')) || "http://localhost:5000";
const SOCKET_OPTIONS = {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  extraHeaders: {
    "ngrok-skip-browser-warning": "69420",
  },
};

export const SocketProvider = ({ children }) => {
 const { user, loading } = useSelector((state) => state.auth);

  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // === SOCKET EVENT HANDLERS ===
  useEffect(() => {
    console.log("SocketProvider mounted");
    return () => console.log("SocketProvider unmounted");
  }, []);

  const registerSocketEvents = (socket) => {
    socket.on("connect", () => {
      setIsConnected(true);
      console.log(`✅ [SOCKET] Connected: ${socket.id}`);

      if (user?._id) {
        console.log("📡 [SOCKET] Emitting add-user on connect");
        socket.emit("add-user", user._id);
      }
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      console.log(`❌ [SOCKET] Disconnected: ${reason}`);
    });

    socket.on("connect_error", (err) => {
      setIsConnected(false);
      console.error("⚠️ [SOCKET] Connection error:", err?.message || err);
    });

    socket.on("online-users", (users) => {
      console.log("🟢 [SOCKET] Online users:", users);
      setOnlineUsers(users);
    });

    socket.on("user-added", (data) =>
      console.log("👤 [SOCKET] User added confirmation:", data)
    );

    // --- Chat Events ---
    socket.on("newMessage", (msg) => console.log("💬 [SOCKET] New message:", msg));
    socket.on("typing", ({ userId, roomId, isTyping }) =>
      console.log(
        `⌨️ [SOCKET] User ${userId} is ${isTyping ? "typing" : "stopped typing"} in room ${roomId}`
      )
    );
    socket.on("user-joined", ({ userId, roomId }) =>
      console.log(`👋 [SOCKET] User ${userId} joined room ${roomId}`)
    );
    socket.on("user-left", ({ userId, roomId }) =>
      console.log(`👋 [SOCKET] User ${userId} left room ${roomId}`)
    );

    // --- WebRTC Events ---
    socket.on("webrtc-offer", (payload) => {
      console.log(`📞 [SOCKET] Received offer from ${payload?.fromUserId}`);
      try {
        // dispatch a browser-level event so UI components can listen reliably
        window.dispatchEvent(new CustomEvent("webrtc-offer", { detail: payload }));
      } catch (e) {
        /* ignore in non-browser env */
      }
    });

    socket.on("webrtc-answer", (payload) => {
      console.log(`📞 [SOCKET] Received answer from ${payload?.fromUserId}`);
      try {
        window.dispatchEvent(new CustomEvent("webrtc-answer", { detail: payload }));
      } catch (e) { }
    });

    socket.on("webrtc-ice-candidate", (payload) => {
      console.log(`🧊 [SOCKET] Received ICE candidate from ${payload?.fromUserId}`);
      try {
        window.dispatchEvent(new CustomEvent("webrtc-ice-candidate", { detail: payload }));
      } catch (e) { }
    });
    socket.on("end-call", ({ fromUserId }) =>
      console.log(`📴 [SOCKET] Call ended by ${fromUserId}`)
    );
    socket.on("user-offline", ({ toUserId }) =>
      console.log(`🔴 [SOCKET] User ${toUserId} is offline`)
    );
  };

  // === INITIALIZE SOCKET INSTANCE (once) ===
  useEffect(() => {
    console.log("🔧 [SOCKET] Initializing socket instance...");
    const socket = io(SOCKET_URL, SOCKET_OPTIONS);
    registerSocketEvents(socket);
    socketRef.current = socket;

    return () => {
      console.log("🧹 [SOCKET] Cleaning up socket instance...");
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // === HANDLE USER CONNECTION STATE ===
  useEffect(() => {
    if (loading) {
      console.log("⏳ [SOCKET] Waiting for user to load...");
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      console.log("⚠️ [SOCKET] Socket instance not ready");
      return;
    }

    console.log("🔍 [SOCKET] User state changed:", user?._id || "no user");

    if (user?._id) {
      socket.auth = { userId: user._id };

      if (!socket.connected) {
        console.log(`🔌 [SOCKET] Connecting for user ${user._id}...`);
        socket.connect();
      } else {
        console.log(`🔌 [SOCKET] Already connected, re-emitting add-user for ${user._id}`);
        socket.emit("add-user", user._id);
      }
    } else {
      if (socket.connected) {
        console.log("🔌 [SOCKET] Disconnecting (no user)...");
        socket.disconnect();
      }
      setIsConnected(false);
    }

    return () => socket.off("online-users");
  }, [user?._id, loading]);

  // === DEV STATUS BADGE ===
  // const SocketStatusBadge =
  //   process.env.NODE_ENV === "development" ? (
  //     <div
  //       style={{
  //         position: "fixed",
  //         bottom: 10,
  //         right: 10,
  //         background: isConnected ? "#22c55e" : "#ef4444",
  //         color: "white",
  //         padding: "6px 12px",
  //         borderRadius: "6px",
  //         fontSize: "12px",
  //         fontWeight: "600",
  //         zIndex: 9999,
  //         boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  //       }}
  //     >
  //       Socket: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
  //     </div>
  //   ) : null;

  // === PROVIDER RETURN ===
  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        onlineUsers: onlineUsers || [],
        isConnected,
      }}
    >
      {children}
      {/* {SocketStatusBadge} */}
    </SocketContext.Provider>
  );
};
