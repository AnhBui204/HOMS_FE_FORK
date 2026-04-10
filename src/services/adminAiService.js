import api from './api';

const adminAiService = {
  getBusinessInsight: async () => {
    try {
      const response = await api.get('/admin/ai/business-insight', { timeout: 60000 });
      return response.data;
    } catch (error) {
      console.error('Error fetching AI business insight', error);
      throw error;
    }
  },

  generateTemplateContent: async (prompt) => {
    try {
      const response = await api.post('/admin/ai/generate-template-content', { prompt }, { timeout: 60000 });
      return response.data;
    } catch (error) {
      console.error('Error generating AI template content', error);
      throw error;
    }
  },

  getFeedbackSummary: async () => {
    try {
      const response = await api.get('/admin/ai/feedback-summary', { timeout: 60000 });
      return response.data;
    } catch (error) {
      console.error('Error fetching AI feedback summary', error);
      throw error;
    }
  },

  getPromotionAdvice: async () => {
    try {
      const response = await api.get('/admin/ai/promotion-advice', { timeout: 60000 });
      return response.data;
    } catch (error) {
      console.error('Error fetching AI promotion advice', error);
      throw error;
    }
  }
};

export default adminAiService;
