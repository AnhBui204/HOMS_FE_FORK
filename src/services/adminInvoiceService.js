import api from './api';

const adminInvoiceService = {
  getInvoiceById: async (id) => {
    // Basic client-side validation: avoid calling server with invalid id to prevent global error toasts
    if (!id || typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      // Return a rejected promise so callers can handle it without triggering axios interceptor notifications
      const err = new Error('Invalid invoice id');
      // include a flag so callers can detect it's a client-side validation error
      err.isClientValidation = true;
      return Promise.reject(err);
    }

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
  ,
  // Get server-side aggregate revenue for PAID and PARTIAL invoices
  getRevenueAggregate: async (params = {}) => {
    try {
      const response = await api.get('/admin/invoices/revenue-aggregate', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue aggregate', error);
      throw error;
    }
  }
  
};

export default adminInvoiceService;