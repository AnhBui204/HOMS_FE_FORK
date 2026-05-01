import api from '../../services/api';

export const fetchAdminOrders = async ({ page = 1, limit = 5, status, from, to, search, source } = {}) => {
  const params = { page, limit };
  if (status) params.status = status;
  if (from) params.from = from;
  if (to) params.to = to;
  if (search) params.search = search;
  if (source) params.source = source;
  const res = await api.get('/admin/orders', { params });
  // backend responds { success: true, data: { items, total, page, limit } }
  if (res?.data?.success) return res.data.data;
  return res.data;
};

export const fetchAdminOrderById = async (id) => {
  if (!id) return null;
  const res = await api.get(`/admin/orders/${id}`);
  if (res?.data?.success) return res.data.data;
  return res.data;
};

const adminOrderService = { fetchAdminOrders, fetchAdminOrderById };
export default adminOrderService;
