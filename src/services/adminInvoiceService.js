import api from './api';

const adminInvoiceService = {
  getInvoiceById: async (id) => {
    try {
      const response = await api.get(`/admin/invoices/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching admin invoice by id', error);
      throw error;
    }
  },
  getInvoices: async (params) => {
    try {
      const response = await api.get('/admin/invoices', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching admin invoices', error);
      throw error;
    }
  }
  
};

export default adminInvoiceService;