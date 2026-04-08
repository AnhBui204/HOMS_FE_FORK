// src/services/apiService.js
import api from './api'; 

export const requestTicketService = {
  getTickets: async (params) => {
    const response = await api.get('/request-tickets', { params });
    return response.data;
  },
  updateStatus: async (ticketId, status) => {
    const response = await api.put(`/request-tickets/${ticketId}/status`, { status });
    return response.data;
  },
  proposeTime: async (ticketId, data) => {
    // data = { proposedTimes: [...], reason: "..." }
    const response = await api.put(`/request-tickets/${ticketId}/propose-time`, data);
    return response.data;
  },
  approveTicket: async (ticketId, payload = {}) => {
    // payload = { surveyorId? } — surveyorId required only for FULL_HOUSE
    const response = await api.post(`/request-tickets/${ticketId}/approve`, payload);
    return response.data;
  },
  dispatcherAcceptTime: async (ticketId, selectedTime) => {
    const response = await api.put(`/request-tickets/${ticketId}/dispatcher-accept-time`, { selectedTime });
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
  },

  estimateResources: async (data) => {
    const response = await api.post('/surveys/estimate', data);
    return response.data;
  }
};
export const userService = {
  getDispatchers: async () => {
    const response = await api.get('/customer/dispatchers'); 
    return response.data;
  }
};