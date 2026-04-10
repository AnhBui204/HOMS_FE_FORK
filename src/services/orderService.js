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

    let moveType = 'SPECIFIC_ITEMS';
    if (Number(orderData.serviceId) === 1) moveType = 'FULL_HOUSE';
    if (Number(orderData.serviceId) === 4) moveType = 'TRUCK_RENTAL';

    const items = orderData.itemsRich || toItemArray(
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

    const payload = {
        moveType,
        pickup: {
            address: pickupLocation?.address || '',
            district: pickupLocation?.district || pickupLocation?.ward || '',
            coordinates: {
                lat: pickupLocation?.lat,
                lng: pickupLocation?.lng
            }
        },
        delivery: {
            address: dropoffLocation?.address || '',
            district: dropoffLocation?.district || dropoffLocation?.ward || '',
            coordinates: {
                lat: dropoffLocation?.lat,
                lng: dropoffLocation?.lng
            }
        },
        scheduledTime: orderData.movingDate || null,
        items,
        notes: notesParts.join(' | ')
    };

    // Include AI estimate for SPECIFIC_ITEMS/TRUCK_RENTAL so WAITING_REVIEW form is pre-filled
    if (orderData.aiEstimate) {
        payload.aiEstimate = orderData.aiEstimate;
    }

    if (moveType === 'TRUCK_RENTAL' && orderData.rentalDetails) {
        payload.rentalDetails = orderData.rentalDetails;
    }

    return payload;
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
        const response = await api.put(`/request-tickets/${ticketId}/status`, { status: newStatus });
        return response.data;
    } catch (error) {
        console.error('Error updating ticket status:', error);
        normalizeApiError(error);
    }
};

// Create payment link for survey deposit
export const createPaymentLink = async (ticketId, amount) => {
    try {
        const response = await api.post(`/request-tickets/${ticketId}/create-payment-link`, { amount });
        return response.data;
    } catch (error) {
        console.error('Error creating survey payment link:', error);
        normalizeApiError(error);
    }
};

// Create payment link for moving deposit (50%)
export const createMovingDeposit = async (ticketId) => {
    try {
        const response = await api.post(`/request-tickets/${ticketId}/deposit`);
        return response.data;
    } catch (error) {
        console.error('Error creating deposit payment:', error);
        normalizeApiError(error);
    }
};

// Create payment link for remaining amount (all-in)
export const createMovingRemaining = async (ticketId) => {
    try {
        const response = await api.post(`/request-tickets/${ticketId}/remaining`);
        return response.data;
    } catch (error) {
        console.error('Error creating remaining payment:', error);
        normalizeApiError(error);
    }
};

export const acceptSurveyTime = async (ticketId, selectedTime) => {
    try {
        const response = await api.put(`/request-tickets/${ticketId}/accept-survey-time`, {
            selectedTime
        });
        return response.data;
    } catch (error) {
        console.error("Error accepting survey time:", error);
        normalizeApiError(error);
    }
};

export const rejectSurveyTime = async (ticketId, reason, proposedTime) => {
    try {
        const response = await api.put(`/request-tickets/${ticketId}/reject-survey-time`, {
            reason,
            proposedTime
        });
        return response.data;
    } catch (error) {
        console.error("Error rejecting survey time:", error);
        normalizeApiError(error);
    }
};

export const dispatcherAcceptTime = async (ticketId, selectedTime) => {
    try {
        const response = await api.put(`/request-tickets/${ticketId}/dispatcher-accept-time`, {
            selectedTime
        });
        return response.data;
    } catch (error) {
        console.error("Error dispatcher accepting survey time:", error);
        normalizeApiError(error);
    }
};

export const cancelOrder = async (ticketId, reason) => {
    try {
        const response = await api.put(`/request-tickets/${ticketId}/cancel`, {
            reason
        });
        return response.data;
    } catch (error) {
        console.error("Error cancelling order:", error);
        normalizeApiError(error);
    }
};

export const fetchUserTickets = async (userId, searchCode) => {
    try {
        const response = await api.get('/request-tickets', {
            params: { customerId: userId }
        });

        let tickets = response.data?.data || [];

        // filter đúng user
        tickets = tickets.filter(t =>
            (t.customerId && t.customerId._id === userId) ||
            t.customerId === userId
        );

        // sort mới nhất
        tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // search code
        if (searchCode) {
            const keyword = searchCode.toLowerCase();

            tickets = tickets.filter(t =>
                (t.code && t.code.toLowerCase().includes(keyword)) ||
                (t.invoice?.code && t.invoice.code.toLowerCase().includes(keyword))
            );
        }

        return tickets;

    } catch (error) {
        console.error("Fetch tickets error", error);
        normalizeApiError(error);
    }
};

const orderService = {
    createOrder,
    getMyOrders,
    getOrderById,
    updateTicketStatus,
    cancelOrder,
    createPaymentLink,
    createMovingDeposit,
    createMovingRemaining,
    acceptSurveyTime,
    rejectSurveyTime,
    dispatcherAcceptTime,
    fetchUserTickets
};

export default orderService;