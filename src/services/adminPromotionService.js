import api from './api';

const adminPromotionService = {
  getPromotions: async (params) => {
    try {
      const response = await api.get('/admin/promotions', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching promotions', error);
      throw error;
    }
  },

  createPromotion: async (data) => {
    try {
      const response = await api.post('/admin/promotions', data);
      return response.data;
    } catch (error) {
      console.error('Error creating promotion', error);
      throw error;
    }
  },

  updatePromotion: async (id, data) => {
    try {
      const response = await api.put(`/admin/promotions/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating promotion', error);
      throw error;
    }
  },

  deletePromotion: async (id) => {
    try {
      const response = await api.delete(`/admin/promotions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting promotion', error);
      throw error;
    }
  },

  exportPromotionsCsv: async (params) => {
    try {
      const response = await api.get('/admin/promotions/export', { params, responseType: 'blob' });
      return response;
    } catch (error) {
      console.error('Error exporting promotions', error);
      throw error;
    }
  }
};

export default adminPromotionService;
