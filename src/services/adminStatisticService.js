import api from './api';

const adminStatisticService = {
    getOverview: async () => {
        try {
            const response = await api.get('/admin/statistics/overview');
            return response.data;
        } catch (error) {
            console.error('Error fetching admin overview stats', error);
            throw error;
        }
    },

    getRevenue: async (params) => {
        try {
            const response = await api.get('/admin/statistics/revenue', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching admin revenue stats', error);
            throw error;
        }
    },

    getOrders: async (params) => {
        try {
            const response = await api.get('/admin/statistics/orders', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching admin order stats', error);
            throw error;
        }
    }
};

export default adminStatisticService;
