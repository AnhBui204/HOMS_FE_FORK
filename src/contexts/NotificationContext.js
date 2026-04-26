// src/contexts/NotificationContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { useSocket } from "./SocketContext";
import { useSelector } from "react-redux";
import { message } from "antd";
import api from "../services/api";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { socket } = useSocket();
 const { user } = useSelector((state) => state.auth);

  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [hasVisitResponse, setHasVisitResponse] = useState(false);

  useEffect(() => {
    // 1. Hàm fetch count ban đầu (vẫn giữ nguyên)
    const fetchInitialCount = async () => {
      if (user.role === "owner") {
        try {
          const response = await api.get("/visit-requests/owner/pending-count");
          setPendingRequestCount(response.data.count);
        } catch (error) {
          console.error("Failed to fetch pending count", error);
        }
      }
    };

    if (socket && user?._id) {
      socket.emit("joinUserRoom", user._id);
      fetchInitialCount();
    }

    // 2. Lắng nghe thông báo popup (cho cả owner và customer)
    socket?.on("new_visit_request", (data) => {
      // Chỉ hiện popup, không tăng count ở đây nữa
      message.info(data.message);
    });

    socket?.on("visit_request_update", (data) => {
      console.log("🟢 Received 'visit_request_update' event:", data);
      setHasVisitResponse(true);
      message.success(data.message);
    });

    // 3. Lắng nghe sự kiện COUNT MỚI (chỉ dành cho owner)
    socket?.on("owner_pending_count_update", (data) => {
      console.log(`🟢 Received 'owner_pending_count_update': ${data.count}`);
      // Cập nhật thẳng state bằng con số chính xác từ backend
      setPendingRequestCount(data.count);
    });

    return () => {
      socket?.off("new_visit_request");
      socket?.off("visit_request_update");
      socket?.off("owner_pending_count_update"); // Nhớ off event mới
    };
  }, [socket, user]);

  // Không cần hàm decrementPendingCount nữa
  // const decrementPendingCount = () => {
  //   setPendingRequestCount((prevCount) => Math.max(0, prevCount - 1)); 
  // };

  const clearCustomerVisitNotif = () => setHasVisitResponse(false);

  return (
    <NotificationContext.Provider
      value={{
        pendingRequestCount,
        // decrementPendingCount, // Bỏ đi
        hasVisitResponse,
        clearCustomerVisitNotif,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);