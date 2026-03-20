import api from './api';

const adminStatisticService = {
    getOverview: async () => {
        try {
            const response = await api.get('/admin/dashboard/overview');
            return response.data;
        } catch (error) {
            console.error('Error fetching admin overview stats', error);
            throw error;
        }
    },

    getRevenue: async (params) => {
        try {
            const response = await api.get('/admin/dashboard/revenue', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching admin revenue stats', error);
            throw error;
        }
    },

    getOrders: async (params) => {
        try {
            const response = await api.get('/admin/dashboard/orders', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching admin order stats', error);
            throw error;
        }
    }
    ,
    getRequestTicketsDaily: async (params) => {
        try {
            const response = await api.get('/admin/statistics/request-tickets/daily', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching request tickets daily', error);
            throw error;
        }
    },
    getRecentInvoices: async (params) => {
        try {
            const response = await api.get('/admin/dashboard/recent-invoices', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching recent invoices', error);
            throw error;
        }
    }
};

export default adminStatisticService;