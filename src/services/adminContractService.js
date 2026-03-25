import api from './api';

const adminContractService = {
    getTemplates: async (params) => {
        try {
            // backend mounts admin routes under /api/admin
            const response = await api.get('/admin/contracts/templates', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching contract templates', error);
            throw error;
        }
    },

    getContracts: async (params) => {
        try {
            const response = await api.get('/admin/contracts', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching contracts', error);
            throw error;
        }
    },
    // Return raw axios response for diagnostics (includes status, headers)
    getContractsRaw: async (params) => {
        try {
            const response = await api.get('/admin/contracts', { params });
            return response;
        } catch (error) {
            console.error('Error fetching contracts (raw)', error);
            throw error;
        }
    },
    getContractById: async (id) => {
        try {
            const response = await api.get(`/admin/contracts/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching contract by id', error);
            throw error;
        }
    },

    downloadContract: async (id) => {
        try {
            const response = await api.get(`/admin/contracts/${id}/download`, { responseType: 'blob' });
            return response;
        } catch (error) {
            console.error('Error downloading contract', error);
            throw error;
        }
    },
    downloadContractDocx: async (id) => {
        try {
            const response = await api.get(`/admin/contracts/${id}/download/docx`, { responseType: 'blob' });
            return response;
        } catch (error) {
            console.error('Error downloading contract (docx)', error);
            throw error;
        }
    },

    createTemplate: async (templateData) => {
        try {
            const response = await api.post('/admin/contracts/templates', templateData);
            return response.data;
        } catch (error) {
            console.error('Error creating contract template', error);
            throw error;
        }
    },

    updateTemplate: async (id, templateData) => {
        try {
            const response = await api.put(`/admin/contracts/templates/${id}`, templateData);
            return response.data;
        } catch (error) {
            console.error('Error updating contract template', error);
            throw error;
        }
    },

    generateContract: async (contractData) => {
        try {
            const response = await api.post('/admin/contracts/generate', contractData);
            return response.data;
        } catch (error) {
            console.error('Error generating contract', error);
            throw error;
        }
    }
};

export default adminContractService;
