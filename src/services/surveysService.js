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
export const getSurveyDetail = async (ticket) => {

    const surveyRes = await api.get(`/surveys/ticket/${ticket._id}`);
    const surveyData = surveyRes.data?.data || surveyRes.data;

    let pricing = ticket.pricing;

    try {
        const pricingRes = await api.get(`/pricing/${ticket._id}`);
        const detail = pricingRes.data?.data;

        pricing = {
            ...ticket.pricing,
            breakdown: detail?.breakdown
        };

    } catch {
        pricing = ticket.pricing;
    }

    return {
        survey: surveyData,
        pricing
    };
};