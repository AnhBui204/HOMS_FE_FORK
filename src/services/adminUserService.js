import api from './api';

const adminUserService = {
    getAllUsers: async (params) => {
        try {
            const response = await api.get('/admin/users', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching admin users', error);
            throw error;
        }
    },

    createUser: async (userData) => {
        try {
            const response = await api.post('/admin/users', userData);
            return response.data;
        } catch (error) {
            console.error('Error creating user from admin', error);
            throw error;
        }
    },

    updateUser: async (id, userData) => {
        try {
            const response = await api.put(`/admin/users/${id}`, userData);
            return response.data;
        } catch (error) {
            console.error('Error updating user from admin', error);
            throw error;
        }
    },

    deleteUser: async (id) => {
        try {
            const response = await api.delete(`/admin/users/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting user from admin', error);
            throw error;
        }
    }
};

export default adminUserService;
