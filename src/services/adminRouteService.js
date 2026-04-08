import api from './api';

const adminRouteService = {
    getAllRoutes: async (params) => {
        try {
            const response = await api.get('/admin/routes', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching admin routes', error);
            throw error;
        }
    },

    getRouteById: async (id) => {
        try {
            const response = await api.get(`/admin/routes/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching route details', error);
            throw error;
        }
    },

    createRoute: async (routeData) => {
        try {
            const response = await api.post('/admin/routes', routeData);
            return response.data;
        } catch (error) {
            console.error('Error creating route', error);
            throw error;
        }
    },

    updateRoute: async (id, routeData) => {
        try {
            const response = await api.put(`/admin/routes/${id}`, routeData);
            return response.data;
        } catch (error) {
            console.error('Error updating route', error);
            throw error;
        }
    },

    deleteRoute: async (id) => {
        try {
            const response = await api.delete(`/admin/routes/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting route', error);
            throw error;
        }
    },

    addTrafficRule: async (id, ruleData) => {
        try {
            const response = await api.post(`/admin/routes/${id}/rules`, ruleData);
            return response.data;
        } catch (error) {
            console.error('Error adding traffic rule', error);
            throw error;
        }
    },

    updateTrafficRule: async (routeId, ruleId, ruleData) => {
        try {
            const response = await api.put(`/admin/routes/${routeId}/rules/${ruleId}`, ruleData);
            return response.data;
        } catch (error) {
            console.error('Error updating traffic rule', error);
            throw error;
        }
    },

    addRoadRestriction: async (id, restrictionData) => {
        try {
            const response = await api.post(`/admin/routes/${id}/road-restrictions`, restrictionData);
            return response.data;
        } catch (error) {
            console.error('Error adding road restriction', error);
            throw error;
        }
    },

    updateRoadRestriction: async (routeId, resId, restrictionData) => {
        try {
            const response = await api.put(`/admin/routes/${routeId}/road-restrictions/${resId}`, restrictionData);
            return response.data;
        } catch (error) {
            console.error('Error updating road restriction', error);
            throw error;
        }
    },

    deleteTrafficRule: async (routeId, ruleId) => {
        try {
            const response = await api.delete(`/admin/routes/${routeId}/rules/${ruleId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting traffic rule', error);
            throw error;
        }
    },

    deleteRoadRestriction: async (routeId, resId) => {
        try {
            const response = await api.delete(`/admin/routes/${routeId}/road-restrictions/${resId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting road restriction', error);
            throw error;
        }
    }
};

export default adminRouteService;
