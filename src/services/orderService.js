import api from './api';

// Create new order/request ticket
export const createOrder = async (orderData) => {
    try {
        const response = await api.post('/orders/create', orderData);
        return response.data;
    } catch (error) {
        console.error('Error creating order:', error);
        throw error.response?.data || error;
    }
};

// Get all orders for current user
export const getMyOrders = async (status = null) => {
    try {
        const params = status ? { status } : {};
        const response = await api.get('/orders/my-orders', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error.response?.data || error;
    }
};

// Get specific order by ID
export const getOrderById = async (ticketId) => {
    try {
        const response = await api.get(`/orders/${ticketId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching order:', error);
        throw error.response?.data || error;
    }
};

// Cancel order
export const cancelOrder = async (ticketId) => {
    try {
        const response = await api.patch(`/orders/${ticketId}/cancel`);
        return response.data;
    } catch (error) {
        console.error('Error cancelling order:', error);
        throw error.response?.data || error;
    }
};

export default {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrder
};
