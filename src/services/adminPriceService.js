import api from './api';

const adminPriceService = {
    getAllPriceLists: async (params) => {
        try {
            const response = await api.get('/admin/price-lists', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching price lists', error);
            throw error;
        }
    },

    getPriceListById: async (id) => {
        try {
            const response = await api.get(`/admin/price-lists/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching price list details', error);
            throw error;
        }
    },

    createPriceList: async (priceData) => {
        try {
            const response = await api.post('/admin/price-lists', priceData);
            return response.data;
        } catch (error) {
            console.error('Error creating price list', error);
            throw error;
        }
    },

    updatePriceList: async (id, priceData) => {
        try {
            const response = await api.put(`/admin/price-lists/${id}`, priceData);
            return response.data;
        } catch (error) {
            console.error('Error updating price list', error);
            throw error;
        }
    },

    toggleActive: async (id, isActive) => {
        try {
            const response = await api.patch(`/admin/price-lists/${id}/toggle-active`, { isActive });
            return response.data;
        } catch (error) {
            console.error('Error toggling active state', error);
            throw error;
        }
    },

    deletePriceList: async (id) => {
        try {
            const response = await api.delete(`/admin/price-lists/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting price list', error);
            throw error;
        }
    }
};

export default adminPriceService;
