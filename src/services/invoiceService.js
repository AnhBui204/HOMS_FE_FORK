import api from './api';

const invoiceService = {
  getInvoices: async (params) => {
    try {
      const response = await api.get('/invoices', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices', error);
      throw error;
    }
  },

  getInvoiceById: async (id) => {
    if (!id || typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      const err = new Error('Invalid invoice id');
      err.isClientValidation = true;
      return Promise.reject(err);
    }
    try {
      const response = await api.get(`/invoices/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching invoice by id', error);
      throw error;
    }
  }
};

export default invoiceService;
