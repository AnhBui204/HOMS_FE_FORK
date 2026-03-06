// src/services/apiService.js
import api from './api'; 

export const requestTicketService = {
  getTickets: async (params) => {
    const response = await api.get('/request-tickets', { params });
    return response.data;
  }
};

export const surveyService = {
  scheduleSurvey: async (data) => {
    const response = await api.post('/surveys/schedule', data);
    return response.data;
  },

  getSurveyByTicket: async (ticketId) => {
    const response = await api.get(`/surveys/ticket/${ticketId}`);
    return response.data;
  },

  completeSurvey: async (ticketId, data) => {
    const response = await api.put(`/surveys/${ticketId}/complete`, data);
    return response.data;
  }
};
export const userService = {
  getDispatchers: async () => {
    const response = await api.get('/customer/dispatchers'); 
    return response.data;
  }
};