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
            notification.error({ message: 'Không tải được danh sách phương tiện.' });
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
                form.setFields([{ name: 'licensePlate', errors: ['Biển số đã tồn tại.'] }]);
                return;
            }

                if (!values.type) {
                form.setFields([{ name: 'type', errors: ['Vui lòng chọn loại xe.'] }]);
                return;
            }

            if (Number(values.capacity) <= 0) {
                form.setFields([{ name: 'capacity', errors: ['Sức chứa phải là số dương.'] }]);
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
                notification.success({ message: 'Tạo phương tiện thành công.' });
                    } catch (err) {
                if (err.response && err.response.data && err.response.data.message) {
                    notification.error({ message: err.response.data.message });
                } else {
                    notification.error({ message: 'Tạo phương tiện thất bại.' });
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
                form.setFields([{ name: 'licensePlate', errors: ['Biển số đã tồn tại.'] }]);
                return;
            }

            if (!values.type) {
                form.setFields([{ name: 'type', errors: ['Vui lòng chọn loại xe.'] }]);
                return;
            }

                if (Number(values.capacity) <= 0) {
                form.setFields([{ name: 'capacity', errors: ['Sức chứa phải là số dương.'] }]);
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
                notification.success({ message: 'Cập nhật phương tiện thành công.' });
                    } catch (err) {
                if (err.response && err.response.data && err.response.data.message) {
                    notification.error({ message: err.response.data.message });
                } else {
                    notification.error({ message: 'Cập nhật phương tiện thất bại.' });
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
            title: 'Xóa phương tiện',
            content: `Bạn có chắc chắn muốn xóa ${vehicle.vehicleId} (${vehicle.licensePlate})? Hành động này không thể hoàn tác.`,
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: () => handleDelete(vehicle),
        });
    };

    const handleDelete = async (vehicle) => {
        // check assigned business rule
        if (vehicle.assigned) {
            notification.error({ message: 'Phương tiện đang được phân công, không thể xóa.' });
            return;
        }
        setIsDeleting(true);
        try {
            await adminVehicleService.deleteVehicle(vehicle.vehicleId);
            await loadData();
            notification.success({ message: 'Xóa phương tiện thành công.' });
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                notification.error({ message: err.response.data.message });
            } else {
                notification.error({ message: 'Xóa phương tiện thất bại.' });
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const columns = [
        {
            title: 'Mã phương tiện',
            dataIndex: 'vehicleId',
            key: 'vehicleId',
            render: text => <strong>{text}</strong>
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            render: (t) => TYPE_LABELS[t] || t,
        },
        {
            title: 'Sức chứa',
            dataIndex: 'capacity',
            key: 'capacity',
            render: (c) => c ? `${c} kg` : '-',
        },
        {
            title: 'Trạng thái',
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
            title: 'Biển số',
            dataIndex: 'licensePlate',
            key: 'licensePlate',
        },
        {
            title: 'Tài xế hiện tại',
            dataIndex: 'currentDriver',
            key: 'currentDriver',
        },
        {
            title: 'Bảo trì gần nhất',
            dataIndex: 'lastMaintenance',
            key: 'lastMaintenance',
            render: (d) => d ? String(d) : '-',
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Chỉnh sửa">
                        <Button type="text" icon={<EditOutlined />} style={{ color: '#1890ff' }} onClick={() => openEditModal(record)} />
                    </Tooltip>
                    <Tooltip title="Xóa">
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
                    <Title level={3} style={{ margin: 0 }}>Thông tin đội xe</Title>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                        icon={<DownloadOutlined />}
                        style={{ borderRadius: 6 }}
                    >
                        Xuất
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        style={{ backgroundColor: '#44624A', borderColor: '#44624A', borderRadius: 6, fontWeight: '600' }}
                        onClick={openCreateModal}
                    >
                        Thêm phương tiện
                    </Button>
                </div>
            </div>

            <div style={{ padding: '0 24px' }}>
                <Card style={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                    {/* Filters Row */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 16, alignItems: 'center' }}>
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <Input
                                placeholder="Tìm theo mã phương tiện hoặc biển số"
                                prefix={<SearchOutlined />}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                allowClear
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={5}>
                            <Select
                                placeholder="Lọc theo trạng thái"
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
                                <Button onClick={resetFilters}>Đặt lại</Button>
                                <Button type="primary" style={{ backgroundColor: '#1f4f29', borderRadius: '6px' }} onClick={handleSearch}>Tìm</Button>
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
                            <Empty description="Không tìm thấy phương tiện" />
                        </div>
                    )}
                </Card>
            </div>

            {/* Create Vehicle Modal */}
            <Modal
                title="Tạo phương tiện"
                visible={isCreateModalVisible}
                onOk={handleCreate}
                onCancel={() => setCreateModalVisible(false)}
                okButtonProps={{ style: { backgroundColor: '#44624A', borderColor: '#44624A', color: '#fff' } }}
            >
                <Form form={form} layout="vertical">
                    <Form.Item label="Loại xe" name="type" rules={[{ required: true, message: 'Vui lòng chọn loại xe' }]}>
                        <Select placeholder="Chọn loại">
                            {Object.entries(TYPE_LABELS).map(([val, label]) => (
                                <Option key={val} value={val}>{label}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label="Biển số" name="licensePlate" rules={[{ required: true, message: 'Vui lòng nhập biển số' }]}>
                        <Input placeholder="ví dụ: 51F-123.45" />
                    </Form.Item>
                    <Form.Item label="Sức chứa (kg)" name="capacity" rules={[{ required: true, message: 'Vui lòng nhập sức chứa' }]}>
                        <InputNumber style={{ width: '100%' }} min={1} />
                    </Form.Item>
                    {/* Current driver is assigned by Dispatcher; admin does not input this */}
                    <Form.Item label="Bảo trì gần nhất" name="lastMaintenance">
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
                <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Chỉ quản trị viên mới có thể tạo phương tiện mới. Biển số phải là duy nhất.</div>
            </Modal>

            {/* Edit Vehicle Modal */}
            <Modal
                title="Chỉnh sửa phương tiện"
                visible={isEditModalVisible}
                onOk={handleUpdate}
                onCancel={() => setEditModalVisible(false)}
                okButtonProps={{ style: { backgroundColor: '#44624A', borderColor: '#44624A', color: '#fff' } }}
            >
                <Form form={form} layout="vertical">
                        <Form.Item label="Mã phương tiện" name="vehicleId">
                            <Input disabled />
                        </Form.Item>
                        <Form.Item label="Loại xe" name="type" rules={[{ required: true, message: 'Vui lòng chọn loại xe' }]}>
                            <Select placeholder="Chọn loại">
                            {Object.entries(TYPE_LABELS).map(([val, label]) => (
                                <Option key={val} value={val}>{label}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                        <Form.Item label="Biển số" name="licensePlate" rules={[{ required: true, message: 'Vui lòng nhập biển số' }]}>
                            <Input placeholder="ví dụ: 51F-123.45" />
                        </Form.Item>
                        <Form.Item label="Sức chứa (kg)" name="capacity" rules={[{ required: true, message: 'Vui lòng nhập sức chứa' }]}>
                            <InputNumber style={{ width: '100%' }} min={1} />
                        </Form.Item>
                        <Form.Item label="Trạng thái" name="status">
                        <Select>
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                <Option key={val} value={val}>{label}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                        <Form.Item label="Đã phân công" name="assigned" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    {/* Current driver is assigned by Dispatcher; admin does not input this */}
                </Form>
            </Modal>
        </div>
    );
};

export default VehicleManagement;