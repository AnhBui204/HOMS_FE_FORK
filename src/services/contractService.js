import api from './api';

const ContractService = {
  /**
   * Lấy danh sách hợp đồng của customer đang đăng nhập.
   * @param {Object} params - { page, limit, status, search }
   */
  getMyContracts: async (params = {}) => {
    const { data } = await api.get('/customer/contracts/my-contracts', { params });
    return data; // { success, data: [...], pagination, stats }
  },

  /**
   * Lấy chi tiết một hợp đồng (chỉ của customer đang đăng nhập).
   * @param {string} contractId
   */
  getContractDetail: async (contractId) => {
    const { data } = await api.get(`/customer/contracts/${contractId}`);
    return data; 
  },

  /**
   * Tải xuống hợp đồng.
   * @param {string} contractId
   * @param {'html'|'docx'} format - Mặc định 'html'
   */
  downloadContract: async (contractId, format = 'html') => {
    const response = await api.get(`/customer/contracts/${contractId}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response;
  },
};

export default ContractService;