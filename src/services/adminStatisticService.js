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
    ,
    // Get canonical conversion metrics from backend (total requests, successful orders, pie-ready data)
    getConversion: async (params) => {
        try {
            const response = await api.get('/admin/dashboard/conversion', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching conversion metrics', error);
            throw error;
        }
    },
    // Fetch a pre-computed UI bundle for dashboard to avoid heavy client-side processing
    getDashboardUI: async (params) => {
        try {
            const response = await api.get('/admin/dashboard/ui', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard UI bundle', error);
            throw error;
        }
    },
    // Fetch dispatcher stats (includes global invoice counts grouped by status)
    getDispatcherStats: async () => {
        try {
            const response = await api.get('/customer/dispatcher-stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching dispatcher stats', error);
            throw error;
        }
    }
};

export default adminStatisticService;