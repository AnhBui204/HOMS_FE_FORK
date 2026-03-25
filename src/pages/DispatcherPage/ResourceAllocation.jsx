import React, { useState, useEffect } from 'react';
import { Table, Button, Typography, Tag, message, Modal, Select, Form, Space } from 'antd';
import { CarOutlined } from '@ant-design/icons';
import api from '../../services/api';
import adminRouteService from '../../services/adminRouteService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const ResourceAllocation = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Form and Resource Data
    const [form] = Form.useForm();
    const [drivers, setDrivers] = useState([]);
    const [staff, setStaff] = useState([]);
    const [routesList, setRoutesList] = useState([]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            // Fetch CONFIRMED invoices ready for dispatching
            const response = await api.get('/invoices?status=CONFIRMED');
            if (response.data && response.data.success) {
                setInvoices(response.data.data);
            }
        } catch (error) {
            message.error('Lỗi khi tải danh sách hóa đơn: ' + (error.response?.data?.message || ''));
        } finally {
            setLoading(false);
        }
    };

    const fetchResources = async () => {
        try {
            const [driverRes, staffRes] = await Promise.all([
                api.get('/customer/drivers'),
                api.get('/customer/staff')
            ]);

            if (driverRes.data?.success) setDrivers(driverRes.data.data);
            if (staffRes.data?.success) setStaff(staffRes.data.data);

            const routeRes = await adminRouteService.getAllRoutes();
            if (routeRes.success) setRoutesList(routeRes.data || []);
            
        } catch (error) {
            message.error('Lỗi khi tải danh sách nhân sự.');
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchResources();
    }, []);

    const showDispatchModal = (invoice) => {
        setSelectedInvoice(invoice);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setSelectedInvoice(null);
    };

    const handleSubmit = async (values) => {
        if (!selectedInvoice) return;

        setSubmitting(true);
        try {
            const payload = {
                leaderId: values.leaderId,
                driverIds: values.driverIds || [],
                staffIds: values.staffIds || [],
                vehicleType: values.vehicleType,
                vehicleCount: values.vehicleCount || 1,
                routeId: values.routeId,
                totalWeight: selectedInvoice.requestTicketId?.surveyDataId?.totalWeight || 1000,
                totalVolume: selectedInvoice.requestTicketId?.surveyDataId?.totalVolume || 10,
                estimatedDuration: 480 // Mặc định 8 tiếng
            };

            await api.post(`/invoices/${selectedInvoice._id}/dispatch`, payload);
            message.success('Đã điều phối xe và nhân sự thành công!');

            setIsModalVisible(false);
            fetchInvoices(); // Refresh list
        } catch (error) {
            message.error('Lỗi khi điều phối: ' + (error.response?.data?.message || ''));
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        {
            title: 'Mã Hóa Đơn',
            dataIndex: 'code',
            key: 'code',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Mã Yêu Cầu',
            dataIndex: ['requestTicketId', 'code'],
            key: 'ticketCode'
        },
        {
            title: 'Khách hàng',
            dataIndex: ['customerId', 'fullName'],
            key: 'customerName'
        },
        {
            title: 'Địa chỉ lấy',
            dataIndex: ['requestTicketId', 'pickup', 'address'],
            key: 'pickup',
            ellipsis: true
        },
        {
            title: 'Địa chỉ giao',
            dataIndex: ['requestTicketId', 'delivery', 'address'],
            key: 'delivery',
            ellipsis: true
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <Tag color="blue">{status}</Tag>
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    style={{ background: '#52c41a' }}
                    icon={<CarOutlined />}
                    onClick={() => showDispatchModal(record)}
                >
                    Điều phối
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
            <Title level={4}>Điều phối Xe & Đội ngũ bốc xếp</Title>
            <Table
                columns={columns}
                dataSource={invoices}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={`Điều phối hệ thống tự động cho đơn: ${selectedInvoice?.code}`}
                visible={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={600}
            >
                <div style={{ marginBottom: 20 }}>
                    <Text type="secondary">
                        Bạn có thể chọn người phụ trách nhóm (Trưởng nhóm). Mặc định hệ thống sẽ tự động tính toán số lượng/lọai xe, nhưng bạn vẫn có thể chọn thủ công.
                    </Text>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ vehicleCount: 1 }}>
                    <Form.Item
                        name="leaderId"
                        label="Trưởng nhóm (Bắt buộc)"
                        rules={[{ required: true, message: 'Vui lòng chọn 1 tài xế làm trưởng nhóm' }]}
                    >
                        <Select
                            placeholder="Chọn tên tài xế (Trưởng nhóm)"
                            style={{ width: '100%' }}
                            allowClear
                        >
                            {drivers.map(d => (
                                <Option key={d._id} value={d._id}>{d.fullName} - {d.phone}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="driverIds"
                        label="Tài xế phụ (Tùy chọn)"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Chọn tên tài xế bổ sung"
                            style={{ width: '100%' }}
                            allowClear
                        >
                            {drivers.map(d => (
                                <Option key={d._id} value={d._id}>{d.fullName} - {d.phone}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="staffIds"
                        label="Nhân viên phụ bốc xếp (Tùy chọn)"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Chọn tên nhân viên bốc xếp"
                            style={{ width: '100%' }}
                            allowClear
                        >
                            {staff.map(s => (
                                <Option key={s._id} value={s._id}>{s.fullName} - {s.phone}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="routeId"
                        label="Lộ trình di chuyển (Để trống nếu tự do đi lại)"
                    >
                        <Select
                            placeholder="Chọn tuyến đường / lộ trình"
                            style={{ width: '100%' }}
                            allowClear
                        >
                            {routesList.map(r => (
                                <Option key={r._id} value={r._id}>
                                    {r.code} ({r.fromDistrict} ➝ {r.toDistrict}) - {r.estimatedDistanceKm} km
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Chỉ định phương tiện thủ công (Nếu bỏ trống: tự động tính)">
                        <Space>
                            <Form.Item name="vehicleType" noStyle>
                                <Select placeholder="Chọn loại xe" style={{ width: 150 }} allowClear>
                                    <Option value="500KG">Xe 500 KG</Option>
                                    <Option value="1TON">Xe 1 Tấn</Option>
                                    <Option value="1.5TON">Xe 1.5 Tấn</Option>
                                    <Option value="2TON">Xe 2 Tấn</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="vehicleCount" noStyle>
                                <Select placeholder="Số xe" style={{ width: 100 }}>
                                    <Option value={1}>1 xe</Option>
                                    <Option value={2}>2 xe</Option>
                                    <Option value={3}>3 xe</Option>
                                </Select>
                            </Form.Item>
                        </Space>
                    </Form.Item>

                    <Form.Item style={{ textAlign: 'right', marginTop: 30, marginBottom: 0 }}>
                        <Space>
                            <Button onClick={handleCancel}>Hủy</Button>
                            <Button type="primary" htmlType="submit" loading={submitting}>
                                Xác nhận điều phối
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ResourceAllocation;