import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Button, Tag, Space, Typography, Tooltip, notification, Popconfirm, Row, Col, Avatar, Empty, Modal, Form, InputNumber, DatePicker, Switch } from 'antd';
import dayjs from 'dayjs';
import { SearchOutlined, EditOutlined, DeleteOutlined, PlusOutlined, DownloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import adminVehicleService from '../../../services/adminVehicleService';

const { Title, Text } = Typography;
const { Option } = Select;

const VehicleManagement = () => {
    const [loading, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState([]);

    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState(undefined);

    // Data comes from backend via adminVehicleService

    // Friendly labels for vehicle type enums (display-only)
    const TYPE_LABELS = {
        '500KG': '500 kg',
        '1TON': '1 tấn',
        '1.5TON': '1.5 tấn',
        '2TON': '2 tấn',
    };

    // Friendly labels for status enums (display-only)
    const STATUS_LABELS = {
        'Available': 'Sẵn sàng',
        'InTransit': 'Đang vận hành',
        'Maintenance': 'Bảo trì',
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            const list = await adminVehicleService.getAllVehicles(params);
            setVehicles(list);
        } catch (err) {
            console.error('Failed to load vehicles', err);
            notification.error({ message: 'Failed to load vehicles.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const resetFilters = () => {
        setSearchText('');
        setFilterStatus(undefined);
        loadData();
    };

    // Modal/form state
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [editVehicle, setEditVehicle] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState(null);

    const [form] = Form.useForm();

    const handleSearch = async () => {
        setLoading(true);
        try {
            await loadData();
            if (searchText) {
                setVehicles(prev => prev.filter(v => (v.vehicleId || '').toLowerCase().includes(searchText.toLowerCase()) ||
                    ((v.licensePlate || 'N/A') !== 'N/A' && (v.licensePlate || '').toLowerCase().includes(searchText.toLowerCase()))));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        form.resetFields();
        setCreateModalVisible(true);
    };

    const openEditModal = (vehicle) => {
        setEditVehicle(vehicle);
        form.setFieldsValue({
            vehicleId: vehicle.vehicleId,
            type: vehicle.type,
            licensePlate: vehicle.licensePlate === 'N/A' ? '' : vehicle.licensePlate,
            capacity: vehicle.capacity || 0,
            status: vehicle.status,
            lastMaintenance: vehicle.lastMaintenance ? dayjs(vehicle.lastMaintenance) : null,
            assigned: !!vehicle.assigned,
        });
        setEditModalVisible(true);
    };

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();

            // License plate uniqueness check
            const exists = vehicles.some(v => v.licensePlate && v.licensePlate.toLowerCase() === (values.licensePlate || '').toLowerCase());
            if (exists) {
                form.setFields([{ name: 'licensePlate', errors: ['License plate number already exists.'] }]);
                return;
            }

            if (!values.type) {
                form.setFields([{ name: 'type', errors: ['Please select vehicle type.'] }]);
                return;
            }

            if (Number(values.capacity) <= 0) {
                form.setFields([{ name: 'capacity', errors: ['Capacity must be a positive number.'] }]);
                return;
            }

            // Call backend to create
            setCreateModalVisible(false);
            setLoading(true);
            try {
                const payload = {
                    licensePlate: values.licensePlate || '',
                    type: values.type,
                    capacity: Number(values.capacity),
                };
                await adminVehicleService.createVehicle(payload);
                await loadData();
                notification.success({ message: 'Vehicle created successfully.' });
            } catch (err) {
                if (err.response && err.response.data && err.response.data.message) {
                    notification.error({ message: err.response.data.message });
                } else {
                    notification.error({ message: 'Failed to create vehicle.' });
                }
            } finally {
                setLoading(false);
            }

        } catch (err) {
            // validation errors handled by form
        }
    };

    const handleUpdate = async () => {
        try {
            const values = await form.validateFields();

            // uniqueness excluding current edit
            const exists = vehicles.some(v => v.licensePlate && v.id !== editVehicle.id && v.licensePlate.toLowerCase() === (values.licensePlate || '').toLowerCase());
            if (exists) {
                form.setFields([{ name: 'licensePlate', errors: ['License plate number already exists.'] }]);
                return;
            }

            if (!values.type) {
                form.setFields([{ name: 'type', errors: ['Please select vehicle type.'] }]);
                return;
            }

            if (Number(values.capacity) <= 0) {
                form.setFields([{ name: 'capacity', errors: ['Capacity must be a positive number.'] }]);
                return;
            }

            // Call backend to update
            setEditModalVisible(false);
            setLoading(true);
            try {
                const payload = {
                    licensePlate: values.licensePlate || '',
                    type: values.type,
                    capacity: Number(values.capacity),
                    status: values.status,
                    isActive: true,
                };
                await adminVehicleService.updateVehicle(editVehicle.vehicleId, payload);
                await loadData();
                notification.success({ message: 'Vehicle updated successfully.' });
            } catch (err) {
                if (err.response && err.response.data && err.response.data.message) {
                    notification.error({ message: err.response.data.message });
                } else {
                    notification.error({ message: 'Failed to update vehicle.' });
                }
            } finally {
                setLoading(false);
            }

        } catch (err) {
            // handled by form
        }
    };

    const confirmDelete = (vehicle) => {
        setVehicleToDelete(vehicle);
        Modal.confirm({
            title: 'Delete Vehicle',
            content: `Are you sure you want to delete ${vehicle.vehicleId} (${vehicle.licensePlate})? This action is permanent.`,
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => handleDelete(vehicle),
        });
    };

    const handleDelete = async (vehicle) => {
        // check assigned business rule
        if (vehicle.assigned) {
            notification.error({ message: 'Vehicle is currently assigned and cannot be deleted.' });
            return;
        }
        setIsDeleting(true);
        try {
            await adminVehicleService.deleteVehicle(vehicle.vehicleId);
            await loadData();
            notification.success({ message: 'Vehicle deleted successfully.' });
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                notification.error({ message: err.response.data.message });
            } else {
                notification.error({ message: 'Failed to delete vehicle.' });
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const columns = [
        {
            title: 'Vehicle ID',
            dataIndex: 'vehicleId',
            key: 'vehicleId',
            render: text => <strong>{text}</strong>
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (t) => TYPE_LABELS[t] || t,
        },
        {
            title: 'Capacity',
            dataIndex: 'capacity',
            key: 'capacity',
            render: (c) => c ? `${c} kg` : '-',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const getColor = (s) => {
                    if (!s) return 'default';
                    if (s === 'Available') return 'success';
                    if (s === 'InTransit') return 'processing';
                    if (s === 'Maintenance') return 'warning';
                    return 'default';
                };
                return <Tag color={getColor(status)} style={{ fontWeight: 600 }}>{STATUS_LABELS[status] || status}</Tag>;
            }
        },
        {
            title: 'License Plate',
            dataIndex: 'licensePlate',
            key: 'licensePlate',
        },
        {
            title: 'Current Driver',
            dataIndex: 'currentDriver',
            key: 'currentDriver',
        },
        {
            title: 'Last Maintenance',
            dataIndex: 'lastMaintenance',
            key: 'lastMaintenance',
            render: (d) => d ? String(d) : '-',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Edit">
                        <Button type="text" icon={<EditOutlined />} style={{ color: '#1890ff' }} onClick={() => openEditModal(record)} />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(record)} />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ textAlign: 'left', backgroundColor: '#fafafa', minHeight: '100vh', padding: '0 0 24px 0' }}>
            {/* Header: title + actions */}
            <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Vehicle Fleet Information</Title>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                        icon={<DownloadOutlined />}
                        style={{ borderRadius: 6 }}
                    >
                        Export
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        style={{ backgroundColor: '#44624A', borderColor: '#44624A', borderRadius: 6, fontWeight: '600' }}
                        onClick={openCreateModal}
                    >
                        Add Vehicle
                    </Button>
                </div>
            </div>

            <div style={{ padding: '0 24px' }}>
                <Card style={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                    {/* Filters Row */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 16, alignItems: 'center' }}>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Input
                                placeholder="Search by Vehicle ID or License Plate"
                                prefix={<SearchOutlined />}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                allowClear
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={5}>
                            <Select
                                placeholder="Filter by Status"
                                style={{ width: '100%' }}
                                allowClear
                                value={filterStatus}
                                onChange={val => setFilterStatus(val)}
                            >
                                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                    <Option key={val} value={val}>{label}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={24} md={10} lg={13} style={{ textAlign: 'right' }}>
                            <Space>
                                <Button onClick={resetFilters}>Reset</Button>
                                <Button type="primary" style={{ backgroundColor: '#1f4f29', borderRadius: '6px' }} onClick={handleSearch}>Search</Button>
                            </Space>
                        </Col>
                    </Row>

                    {vehicles && vehicles.length > 0 ? (
                        <Table
                            columns={columns}
                            dataSource={vehicles}
                            rowKey="id"
                            pagination={{ pageSize: 5 }}
                            loading={loading}
                            rowClassName={(record) => (record.status === 'Maintenance' ? 'row-maintenance' : '')}
                        />
                    ) : (
                        <div style={{ padding: 48 }}>
                            <Empty description="No vehicles found" />
                        </div>
                    )}
                </Card>
            </div>

            {/* Create Vehicle Modal */}
            <Modal
                title="Create Vehicle"
                visible={isCreateModalVisible}
                onOk={handleCreate}
                onCancel={() => setCreateModalVisible(false)}
                okButtonProps={{ style: { backgroundColor: '#44624A', borderColor: '#44624A', color: '#fff' } }}
            >
                <Form form={form} layout="vertical">
                    <Form.Item label="Vehicle Type" name="type" rules={[{ required: true, message: 'Please select vehicle type' }]}>
                        <Select placeholder="Select type">
                            {Object.entries(TYPE_LABELS).map(([val, label]) => (
                                <Option key={val} value={val}>{label}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label="License Plate" name="licensePlate" rules={[{ required: true, message: 'Please input license plate' }]}>
                        <Input placeholder="e.g., 51F-123.45" />
                    </Form.Item>
                    <Form.Item label="Capacity (kg)" name="capacity" rules={[{ required: true, message: 'Please input capacity' }]}>
                        <InputNumber style={{ width: '100%' }} min={1} />
                    </Form.Item>
                    {/* Current driver is assigned by Dispatcher; admin does not input this */}
                    <Form.Item label="Last Maintenance" name="lastMaintenance">
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
                <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Only administrators may create new vehicles. License plates must be unique.</div>
            </Modal>

            {/* Edit Vehicle Modal */}
            <Modal
                title="Edit Vehicle"
                visible={isEditModalVisible}
                onOk={handleUpdate}
                onCancel={() => setEditModalVisible(false)}
                okButtonProps={{ style: { backgroundColor: '#44624A', borderColor: '#44624A', color: '#fff' } }}
            >
                <Form form={form} layout="vertical">
                    <Form.Item label="Vehicle ID" name="vehicleId">
                        <Input disabled />
                    </Form.Item>
                    <Form.Item label="Vehicle Type" name="type" rules={[{ required: true, message: 'Please select vehicle type' }]}>
                        <Select placeholder="Select type">
                            {Object.entries(TYPE_LABELS).map(([val, label]) => (
                                <Option key={val} value={val}>{label}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label="License Plate" name="licensePlate" rules={[{ required: true, message: 'Please input license plate' }]}>
                        <Input placeholder="e.g., 51F-123.45" />
                    </Form.Item>
                    <Form.Item label="Capacity (kg)" name="capacity" rules={[{ required: true, message: 'Please input capacity' }]}>
                        <InputNumber style={{ width: '100%' }} min={1} />
                    </Form.Item>
                    <Form.Item label="Status" name="status">
                        <Select>
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                <Option key={val} value={val}>{label}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label="Assigned" name="assigned" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    {/* Current driver is assigned by Dispatcher; admin does not input this */}
                </Form>
            </Modal>
        </div>
    );
};

export default VehicleManagement;
