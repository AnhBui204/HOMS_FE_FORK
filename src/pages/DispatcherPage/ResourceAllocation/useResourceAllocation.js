import { useState, useEffect } from 'react';
import { Form, message, notification } from 'antd';
import dayjs from 'dayjs';
import api from '../../../services/api';
import adminRouteService from '../../../services/adminRouteService';
import { useSocket } from '../../../contexts/SocketContext';

export const useResourceAllocation = () => {
    const { socket } = useSocket() || {};
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [isResolutionModalVisible, setIsResolutionModalVisible] = useState(false);
    const [insufficientResourcesData, setInsufficientResourcesData] = useState(null);

    // Form and Resource Data
    const [form] = Form.useForm();
    const vehicleType = Form.useWatch('vehicleType', form);
    const dispatchTime = Form.useWatch('dispatchTime', form);
    const currentLeaderId = Form.useWatch('leaderId', form);
    const currentDriverIds = Form.useWatch('driverIds', form) || [];
    const currentStaffIds = Form.useWatch('staffIds', form) || [];

    const svData = selectedInvoice?.requestTicketId?.surveyDataId;
    const originalHours = svData?.estimatedHours || 8;
    const idealStaffCount = svData?.suggestedStaffCount || 2;
    const actualStaffCount = (currentLeaderId ? 1 : 0) + currentDriverIds.length + currentStaffIds.length;
    const missingStaffCount = Math.max(0, idealStaffCount - actualStaffCount);
    const penaltyHours = missingStaffCount * 1.3;
    const totalHours = originalHours + penaltyHours;

    const [drivers, setDrivers] = useState([]);
    const [staff, setStaff] = useState([]);
    const [vehicleStats, setVehicleStats] = useState({});
    const [routesList, setRoutesList] = useState([]);
    const [allAdminRoutes, setAllAdminRoutes] = useState([]);
    const [mapCoords, setMapCoords] = useState({ pickup: null, delivery: null });

    const [reloadTrigger, setReloadTrigger] = useState(0);

    // ─── Data fetchers ────────────────────────────────────────────────────
    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await api.get('/invoices?status=CONFIRMED');
            if (response.data?.success) setInvoices(response.data.data);
        } catch (error) {
            message.error('Lỗi khi tải danh sách hóa đơn: ' + (error.response?.data?.message || ''));
        } finally {
            setLoading(false);
        }
    };

    const fetchResources = async () => {
        try {
            if (!dispatchTime || !isModalVisible) {
                const [driverRes, staffRes] = await Promise.all([
                    api.get('/customer/drivers'),
                    api.get('/customer/staff')
                ]);
                if (driverRes.data?.success) setDrivers(driverRes.data.data);
                if (staffRes.data?.success) setStaff(staffRes.data.data);
            }
            const routeRes = await adminRouteService.getAllRoutes();
            if (routeRes.success) {
                setRoutesList(routeRes.data || []);
                setAllAdminRoutes(routeRes.data || []);
            }
        } catch {
            message.error('Lỗi khi tải danh sách nhân sự.');
        }
    };

    // ─── Effects ─────────────────────────────────────────────────────────
    useEffect(() => {
        fetchInvoices();
        fetchResources();
    }, [reloadTrigger]);

    useEffect(() => {
        if (!socket) return;
        const handler = (data) => {
            console.log('🔄 [SOCKET] Giới chức điều phối đã cập nhật. Làm mới dữ liệu...', data);
            message.info({ content: 'Dữ liệu điều phối vừa được cập nhật, đang lấy lại...', key: 'resourceUpdate', duration: 2 });
            setReloadTrigger(prev => prev + 1);
        };
        socket.on('resources_updated', handler);
        return () => socket.off('resources_updated', handler);
    }, [socket]);

    useEffect(() => {
        const checkAvailability = async () => {
            if (dispatchTime && selectedInvoice && isModalVisible) {
                try {
                    const payload = { dispatchTime: dispatchTime.toISOString(), estimatedDuration: 480 };
                    const response = await api.post('/admin/dispatch-assignments/check-availability', payload);
                    if (response.data?.success) {
                        const newDrivers = response.data.data.drivers || [];
                        const newStaff = response.data.data.staff || [];
                        setDrivers(newDrivers);
                        setStaff(newStaff);

                        const vStats = { '500KG': 0, '1TON': 0, '1.5TON': 0, '2TON': 0 };
                        response.data.data.vehicles?.forEach(v => {
                            if (v.availabilityStatus !== 'UNAVAILABLE') {
                                vStats[v.vehicleType] = (vStats[v.vehicleType] || 0) + 1;
                            }
                        });
                        setVehicleStats(vStats);

                        const currentVals = form.getFieldsValue(['leaderId', 'driverIds', 'staffIds', 'vehicleType', 'vehicleCount']);
                        const updates = {};
                        let changed = false;

                        if (currentVals.leaderId) {
                            const l = newDrivers.find(d => d._id === currentVals.leaderId) || newStaff.find(s => s._id === currentVals.leaderId);
                            if (l?.availabilityStatus === 'UNAVAILABLE') { updates.leaderId = undefined; changed = true; }
                        }
                        if (currentVals.driverIds?.length > 0) {
                            const valid = currentVals.driverIds.filter(id => {
                                const d = newDrivers.find(nd => nd._id === id);
                                return d && d.availabilityStatus !== 'UNAVAILABLE';
                            });
                            if (valid.length !== currentVals.driverIds.length) { updates.driverIds = valid; changed = true; }
                        }
                        if (currentVals.staffIds?.length > 0) {
                            const valid = currentVals.staffIds.filter(id => {
                                const s = newStaff.find(ns => ns._id === id);
                                return s && s.availabilityStatus !== 'UNAVAILABLE';
                            });
                            if (valid.length !== currentVals.staffIds.length) { updates.staffIds = valid; changed = true; }
                        }
                        if (currentVals.vehicleType && currentVals.vehicleCount) {
                            const avail = vStats[currentVals.vehicleType] || 0;
                            if (avail < currentVals.vehicleCount) {
                                updates.vehicleCount = avail > 0 ? avail : undefined;
                                if (avail === 0) updates.vehicleType = undefined;
                                changed = true;
                            }
                        }
                        if (changed) form.setFieldsValue(updates);
                    }
                } catch (error) {
                    console.error('Failed to check availability:', error);
                }
            } else if (!dispatchTime && isModalVisible) {
                const [driverRes, staffRes] = await Promise.all([api.get('/customer/drivers'), api.get('/customer/staff')]);
                if (driverRes.data?.success) setDrivers(driverRes.data.data);
                if (staffRes.data?.success) setStaff(staffRes.data.data);
            }
        };
        checkAvailability();
    }, [dispatchTime, selectedInvoice, isModalVisible, reloadTrigger]);

    // ─── Geocoding ──────────────────────────────────────────────────────
    const geocodeAddress = async (address) => {
        if (!address) return null;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await response.json();
            if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), address };
        } catch (error) {
            console.error('Geocoding error:', error);
        }
        return null;
    };

    // ─── Modal actions ───────────────────────────────────────────────────
    const showDispatchModal = async (invoice) => {
        setSelectedInvoice(invoice);
        form.resetFields();
        const ticket = invoice.requestTicketId;
        const surveyData = ticket?.surveyDataId || {};

        if (ticket?.scheduledTime) {
            form.setFieldsValue({
                dispatchTime: dayjs(ticket.scheduledTime),
                vehicles: surveyData.suggestedVehicles?.length > 0
                    ? surveyData.suggestedVehicles
                    : (surveyData.suggestedVehicle ? [{ vehicleType: surveyData.suggestedVehicle, count: 1 }] : undefined)
            });
        }
        setIsModalVisible(true);

        let pCoords = ticket?.pickup?.coordinates;
        let dCoords = ticket?.delivery?.coordinates;
        if (!pCoords?.lat) pCoords = await geocodeAddress(ticket?.pickup?.address);
        else pCoords = { ...pCoords, address: ticket.pickup.address };
        if (!dCoords?.lat) dCoords = await geocodeAddress(ticket?.delivery?.address);
        else dCoords = { ...dCoords, address: ticket.delivery.address };

        setMapCoords({ pickup: pCoords, delivery: dCoords });
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setSelectedInvoice(null);
    };

    // ─── Submit ──────────────────────────────────────────────────────────
    const handleSubmit = async (values, isForceProceed = false, isExternalStaff = false) => {
        if (!selectedInvoice) return;
        setSubmitting(true);
        try {
            const payload = {
                leaderId: values.leaderId,
                driverIds: values.driverIds || [],
                staffIds: values.staffIds || [],
                vehicles: values.vehicles,
                routeId: values.routeId,
                dispatchTime: values.dispatchTime ? values.dispatchTime.toISOString() : null,
                totalWeight: selectedInvoice.requestTicketId?.surveyDataId?.totalWeight || 1000,
                totalVolume: selectedInvoice.requestTicketId?.surveyDataId?.totalVolume || 10,
                estimatedDuration: 480,
                forceProceed: isForceProceed,
                useExternalStaff: isExternalStaff
            };
            await api.post(`/admin/dispatch-assignments/invoice/${selectedInvoice._id}/allocate`, payload);
            message.success('Đã điều phối xe và nhân sự thành công!');
            setIsResolutionModalVisible(false);
            setIsModalVisible(false);
            fetchInvoices();
        } catch (error) {
            const errRes = error.response?.data;
            if (errRes?.message === 'INSUFFICIENT_RESOURCES' || errRes?.message === 'MAX_DURATION_EXCEEDED') {
                setInsufficientResourcesData({ ...errRes.data, valuesSnapshot: values });
                setIsResolutionModalVisible(true);
                setReloadTrigger(prev => prev + 1);
            } else {
                message.error('Lỗi khi điều phối: ' + (errRes?.message || ''));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleForceProceed = () => {
        if (!insufficientResourcesData) return;
        const suggested = insufficientResourcesData.suggestedTeam;
        handleSubmit({ ...insufficientResourcesData.valuesSnapshot, leaderId: suggested.leaderId, driverIds: suggested.driverIds, staffIds: suggested.staffIds }, true, false);
    };

    const handleExternalStaffProceed = () => {
        if (!insufficientResourcesData) return;
        handleSubmit(insufficientResourcesData.valuesSnapshot, false, true);
    };

    const handleAutoRebuildTeam = () => {
        if (!insufficientResourcesData) return;
        const suggested = insufficientResourcesData.suggestedTeam;
        form.setFieldsValue({ leaderId: suggested.leaderId, driverIds: suggested.driverIds, staffIds: suggested.staffIds });
        setIsResolutionModalVisible(false);
        message.info('Đã tự động điền lại nhân sự dựa trên gợi ý từ hệ thống.');
    };

    const handlePickAlternativeTime = (timeParam) => {
        if (!insufficientResourcesData?.nextAvailableSlots.length) return;
        const nextTime = timeParam || insufficientResourcesData.nextAvailableSlots[0];
        form.setFieldsValue({ dispatchTime: dayjs(nextTime) });
        setIsResolutionModalVisible(false);
        message.info(`Đã chọn giờ mới: ${dayjs(nextTime).format('HH:mm DD/MM')}. Vui lòng kiểm tra lại phân công.`);
    };

    // ─── Smart auto-fill ─────────────────────────────────────────────────
    const handleAutoFill = async () => {
        if (!selectedInvoice) return;
        try {
            setSubmitting(true);
            const ticket = selectedInvoice.requestTicketId;
            const payload = {
                requestTicketId: ticket?._id,
                totalWeight: ticket?.surveyDataId?.totalWeight || 1000,
                totalVolume: ticket?.surveyDataId?.totalVolume || 10,
                pickupLocation: mapCoords.pickup ? { coordinates: [mapCoords.pickup.lng, mapCoords.pickup.lat] } : null,
                dispatchTime: form.getFieldValue('dispatchTime') ? form.getFieldValue('dispatchTime').toISOString() : undefined
            };

            console.log(" [DEBUG] React Payload:", JSON.stringify(payload, null, 2));
            console.log(" [DEBUG] Full Ticket Object:", ticket);

            const response = await api.post('/admin/dispatch-assignments/optimal-squad', payload);
            if (response.data?.success) {
                const squad = response.data.data;
                const newValues = {};
                if (squad.vehicle) newValues.vehicleType = squad.vehicle.vehicleType;
                if (squad.leader) {
                    setDrivers(prev => prev.some(d => d._id === squad.leader._id) ? prev : [...prev, squad.leader]);
                    newValues.leaderId = squad.leader._id;
                }
                if (squad.driver && squad.driver._id !== squad.leader?._id) {
                    setDrivers(prev => prev.some(d => d._id === squad.driver._id) ? prev : [...prev, squad.driver]);
                    newValues.driverIds = [squad.driver._id];
                }
                if (squad.drivers && Array.isArray(squad.drivers)) {
                    const extraDrivers = [];
                    squad.drivers.forEach(d => {
                        if (d._id !== squad.leader?._id) {
                            extraDrivers.push(d._id);
                            setDrivers(prev => prev.some(e => e._id === d._id) ? prev : [...prev, d]);
                        }
                    });
                    if (extraDrivers.length > 0) newValues.driverIds = extraDrivers;
                }
                if (squad.helpers?.length > 0) {
                    setStaff(prev => { const arr = [...prev]; squad.helpers.forEach(h => { if (!arr.some(s => s._id === h._id)) arr.push(h); }); return arr; });
                    newValues.staffIds = squad.helpers.map(h => h._id);
                }

                form.setFieldsValue(newValues);

                if (squad.shortages && (squad.shortages.missing.leader > 0 || squad.shortages.missing.helpers > 0 || squad.shortages.missing.drivers > 0)) {
                    setInsufficientResourcesData({
                        requestedTime: form.getFieldValue('dispatchTime') || dayjs(),
                        duration: squad.logisticsPlan?.estimatedMinutes || 480,
                        shortages: squad.shortages,
                        suggestedTeam: {
                            leaderId: squad.leader?._id || null,
                            driverIds: squad.drivers ? squad.drivers.filter(d => d._id !== squad.leader?._id).map(d => d._id) : (squad.driver && squad.driver._id !== squad.leader?._id ? [squad.driver._id] : []),
                            staffIds: squad.helpers?.map(h => h._id) || []
                        },
                        nextAvailableSlots: squad.nextAvailableSlots || [],
                        canForce: true,
                        valuesSnapshot: newValues,
                        feasibility: squad.feasibility
                    });
                    setIsResolutionModalVisible(true);
                } else {
                    message.success('Đã áp dụng Biệt đội tối ưu (Smart Squad)!');
                    if (squad.logisticsPlan) {
                        notification.info({
                            message: 'Bản phân tích từ Hệ thống Logistics',
                            description: (
                                <div style={{ fontSize: 15, marginTop: 4 }}>
                                    <p style={{ marginBottom: 4 }}><strong style={{ color: '#44624a' }}>Nhân sự đề xuất:</strong> {squad.logisticsPlan.staffTotal} người (Dự kiến hoàn thành trong {squad.logisticsPlan.estimatedMinutes} phút)</p>
                                    <p style={{ marginBottom: 4 }}><strong style={{ color: '#44624a' }}>Phương tiện tải:</strong> {squad.logisticsPlan.vehicles.map(v => `${v.trips} chuyến xe ${v.type}`).join(', ')}</p>
                                    {squad.logisticsPlan.extraTransport?.motorbikes > 0 && (
                                        <p style={{ marginBottom: 4 }}><strong style={{ color: '#44624a' }}>Di chuyển phụ:</strong> Cần {squad.logisticsPlan.extraTransport.motorbikes} xe máy cá nhân do thiếu chỗ ngồi trên cabin</p>
                                    )}
                                    <p style={{ marginBottom: 4 }}><strong style={{ color: '#44624a' }}>Thiết bị mang theo:</strong> {squad.logisticsPlan.equipmentPlan?.onTruck?.length > 0 ? squad.logisticsPlan.equipmentPlan.onTruck.join(', ') : 'Cơ bản'}</p>
                                    <p style={{ marginBottom: 0, color: '#8c8c8c' }}><em>*Độ tự tin của thuật toán: {squad.logisticsPlan.confidenceLevel}</em></p>
                                </div>
                            ),
                            duration: 10,
                            placement: 'topRight'
                        });
                    }
                }
            }
        } catch {
            message.error('Lỗi khi tính toán đội ngũ tối ưu.');
        } finally {
            setSubmitting(false);
        }
    };

    return {
        // state
        invoices, loading,
        isModalVisible, selectedInvoice, submitting,
        isResolutionModalVisible, insufficientResourcesData,
        form, vehicleType, dispatchTime, currentLeaderId, currentDriverIds, currentStaffIds,
        totalHours, missingStaffCount, originalHours, penaltyHours,
        drivers, staff, vehicleStats,
        routesList, allAdminRoutes, mapCoords,
        setDrivers, setStaff,
        // actions
        setReloadTrigger,
        showDispatchModal,
        handleCancel,
        handleSubmit,
        handleForceProceed,
        handleExternalStaffProceed,
        handleAutoRebuildTeam,
        handlePickAlternativeTime,
        handleAutoFill,
        setIsResolutionModalVisible
    };
};
