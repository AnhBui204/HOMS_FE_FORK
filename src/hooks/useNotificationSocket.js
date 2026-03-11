import { useEffect } from "react";
import socket from "../services/socketService";

const useNotificationSocket = (user, setNotifications, setUnreadCount) => {

  useEffect(() => {
    if (!user) return;

    // đăng ký user với socket
    socket.emit("register_user", user._id);

    socket.on("new_notification", (data) => {

      setNotifications(prev => [data, ...prev]);

      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.off("new_notification");
    };

  }, [user]);
};

export default useNotificationSocket;