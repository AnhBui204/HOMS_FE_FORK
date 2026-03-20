import api from './api';

const adminRatingService = {
    getAllRatings: async (params) => {
        try {
            const response = await api.get('/admin/ratings', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching admin ratings', error);
            throw error;
        }
    },

    getRatingById: async (id) => {
        try {
            const response = await api.get(`/admin/ratings/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching rating by id', error);
            throw error;
        }
    }
};

export default adminRatingService;