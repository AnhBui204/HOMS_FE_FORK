import api from "./api";

const incidentService = {
  /**
   * Customer gửi báo cáo sự cố
   */
  createIncident: async (data) => {
    return await api.post("/incidents", data);
  },

  /**
   * Lấy chi tiết sự cố
   */
  getIncidentById: async (incidentId) => {
    return await api.get(`/incidents/${incidentId}`);
  },

  /**
   * Lấy danh sách sự cố theo invoice
   */
  getIncidentsByInvoice: async (invoiceId) => {
    return await api.get(`/invoices/${invoiceId}/incidents`);
  },

  /**
   * Staff/Admin xử lý sự cố
   */
  resolveIncident: async (incidentId, payload) => {
    return await api.patch(`/incidents/${incidentId}/resolve`, payload);
  },
};

export default incidentService;