import api from "./api";

export const getNotifications = async () => {
  const res = await api.get("/notifications");
  return res.data.data;
};
export const markNotificationRead = async (id) => {
  await api.patch(`/notifications/${id}/read`);
};