import api from './api';

const toItemArray = (manualItems = {}, aiDetectedItems = {}, packedBoxes = 0) => {
    const mergedItems = {};

    Object.entries(manualItems || {}).forEach(([name, quantity]) => {
        if (!quantity || quantity <= 0) return;
        mergedItems[name] = (mergedItems[name] || 0) + quantity;
    });

    Object.entries(aiDetectedItems || {}).forEach(([name, quantity]) => {
        if (!quantity || quantity <= 0) return;
        mergedItems[name] = (mergedItems[name] || 0) + quantity;
    });

    if (packedBoxes > 0) {
        mergedItems.PACKED_BOXES = (mergedItems.PACKED_BOXES || 0) + packedBoxes;
    }

    return Object.entries(mergedItems).map(([name, quantity]) => ({
        name,
        quantity,
        notes: ''
    }));
};

const buildRequestTicketPayload = (orderData) => {
    const pickupLocation = orderData.pickupLocation || orderData.pickup;
    const dropoffLocation = orderData.dropoffLocation || orderData.delivery;

    const moveType = Number(orderData.serviceId) === 1 ? 'FULL_HOUSE' : 'SPECIFIC_ITEMS';

    const items = toItemArray(
        orderData.manualItems,
        orderData.aiDetectedItems,
        orderData.packedBoxes
    );

    const notesParts = [
        orderData.additionalNotes,
        orderData.pickupDescription ? `Pickup note: ${orderData.pickupDescription}` : null,
        orderData.dropoffDescription ? `Delivery note: ${orderData.dropoffDescription}` : null,
        orderData.survey?.type ? `Survey type: ${orderData.survey.type}` : null,
        orderData.survey?.date ? `Survey date: ${orderData.survey.date}` : null,
        orderData.paymentMethod ? `Payment method: ${orderData.paymentMethod}` : null,
        orderData.depositAmount ? `Deposit amount: ${orderData.depositAmount}` : null
    ].filter(Boolean);

    return {
        moveType,
        pickup: {
            address: pickupLocation?.address || '',
            coordinates: {
                lat: pickupLocation?.lat,
                lng: pickupLocation?.lng
            }
        },
        delivery: {
            address: dropoffLocation?.address || '',
            coordinates: {
                lat: dropoffLocation?.lat,
                lng: dropoffLocation?.lng
            }
        },
        items,
        notes: notesParts.join(' | ')
    };
};

const normalizeApiError = (error) => {
    throw error.response?.data || error;
};

// Create new order/request ticket
export const createOrder = async (orderData) => {
    try {
        const payload = buildRequestTicketPayload(orderData);
        const response = await api.post('/request-tickets', payload);
        return response.data;
    } catch (error) {
        console.error('Error creating order:', error);
        normalizeApiError(error);
    }
};

// Get all orders for current user
export const getMyOrders = async (status = null) => {
    try {
        const params = status ? { status } : {};
        const response = await api.get('/request-tickets', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching orders:', error);
        normalizeApiError(error);
    }
};

// Get specific order by ID
export const getOrderById = async (ticketId) => {
    try {
        const response = await api.get(`/request-tickets/${ticketId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching order:', error);
        normalizeApiError(error);
    }
};

// Update ticket status (e.g. CREATED -> WAITING_SURVEY)
export const updateTicketStatus = async (ticketId, newStatus) => {
    try {
        const response = await api.put(`/request-tickets/${ticketId}/status`, { newStatus });
        return response.data;
    } catch (error) {
        console.error('Error updating ticket status:', error);
        normalizeApiError(error);
    }
};

// Cancel order
export const cancelOrder = async (ticketId) => {
    try {
        const response = await api.put(`/request-tickets/${ticketId}/cancel`);
        return response.data;
    } catch (error) {
        console.error('Error cancelling order:', error);
        normalizeApiError(error);
    }
};

const orderService = {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrder
};

export default orderService;
