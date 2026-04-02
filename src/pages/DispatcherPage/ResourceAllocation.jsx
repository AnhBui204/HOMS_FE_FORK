import React, { useState, useEffect } from 'react';
import { Table, Button, Typography, Tag, message, Modal, Select, Form, Space, Row, Col, Card, Descriptions, Divider, DatePicker } from 'antd';
import { Spin as AntdSpin } from 'antd';
import { CarOutlined } from '@ant-design/icons';
import api from '../../services/api';
import adminRouteService from '../../services/adminRouteService';
import dayjs from 'dayjs';
import ResourceMap from '../../components/ResourceMap/ResourceMap';

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
    const vehicleType = Form.useWatch('vehicleType', form);
    const dispatchTime = Form.useWatch('dispatchTime', form);

    const [drivers, setDrivers] = useState([]);
    const [staff, setStaff] = useState([]);
    const [routesList, setRoutesList] = useState([]);
    const [allAdminRoutes, setAllAdminRoutes] = useState([]); // All routes with restrictions
    const [mapCoords, setMapCoords] = useState({ pickup: null, delivery: null });

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
            if (routeRes.success) {
                setRoutesList(routeRes.data || []);
                setAllAdminRoutes(routeRes.data || []);
            }

        } catch (error) {
            message.error('Lỗi khi tải danh sách nhân sự.');
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchResources();
    }, []);

    const geocodeAddress = async (address) => {
        if (!address) return null;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), address };
            }
        } catch (error) {
            console.error('Geocoding error:', error);
        }
        return null;
    };

    const showDispatchModal = async (invoice) => {
        setSelectedInvoice(invoice);
        form.resetFields();
        // Set default dispatch time to the original scheduled time
        if (invoice.requestTicketId?.scheduledTime) {
            form.setFieldsValue({
                dispatchTime: dayjs(invoice.requestTicketId.scheduledTime)
            });
        }
        setIsModalVisible(true);

        // Prepare coordinates for map
        const ticket = invoice.requestTicketId;
        let pCoords = ticket?.pickup?.coordinates;
        let dCoords = ticket?.delivery?.coordinates;

        // Fallback to geocoding if coordinates are missing
        if (!pCoords || !pCoords.lat) {
            pCoords = await geocodeAddress(ticket?.pickup?.address);
        } else {
            pCoords = { ...pCoords, address: ticket.pickup.address };
        }

        if (!dCoords || !dCoords.lat) {
            dCoords = await geocodeAddress(ticket?.delivery?.address);
        } else {
            dCoords = { ...dCoords, address: ticket.delivery.address };
        }

        setMapCoords({ pickup: pCoords, delivery: dCoords });
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
                dispatchTime: values.dispatchTime ? values.dispatchTime.toISOString() : null,
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
            render: (status) => <Tag color="blue">{status === 'CONFIRMED' ? 'Đã xác nhận' : status}</Tag>
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
                title={
                    <Space>
                        <CarOutlined style={{ color: '#1890ff' }} />
                        <span>Điều phối tài nguyên Vận chuyển</span>
                        <Tag color="geekblue">{selectedInvoice?.code}</Tag>
                    </Space>
                }
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={1500}
                style={{ top: 10 }}
                destroyOnClose={true}
            >
                <Row gutter={[24, 24]}>
                    <Col span={10}>
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            {/* Order Summary Card */}
                            <Card
                                size="small"
                                title="Thông tin đơn hàng"
                                styles={{ body: { padding: '8px 16px' }, header: { minHeight: '36px', background: '#f8f9fa' } }}
                            >
                                <Descriptions column={1} size="small" layout="horizontal">
                                    <Descriptions.Item label="Khách hàng">
                                        <Text strong>{selectedInvoice?.customerId?.fullName}</Text>
                                        <Text type="secondary" style={{ marginLeft: 8 }}>({selectedInvoice?.customerId?.phone})</Text>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Điểm lấy hàng">
                                        <Text size="small">{selectedInvoice?.requestTicketId?.pickup?.address}</Text>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Điểm giao hàng">
                                        <Text size="small">{selectedInvoice?.requestTicketId?.delivery?.address}</Text>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Ngày vận chuyển">
                                        <Text strong style={{ color: '#1890ff' }}>
                                            {selectedInvoice?.requestTicketId?.scheduledTime ?
                                                dayjs(selectedInvoice.requestTicketId.scheduledTime).format('DD/MM/YYYY HH:mm') :
                                                'Chưa xác định'}
                                        </Text>
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>

                            {/* Resource Form Card */}
                            <Card
                                size="small"
                                title="Cấu hình Nhân sự & Phương tiện"
                                styles={{ header: { minHeight: '36px', background: '#f8f9fa' } }}
                            >
                                <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ vehicleCount: 1 }}>
                                    <Divider orientation="left" style={{ margin: '8px 0', fontSize: '13px' }}>Đội ngũ nhân sự</Divider>
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

                                    <Form.Item name="driverIds" label="Tài xế phụ">
                                        <Select mode="multiple" placeholder="Chọn tên tài xế bổ sung" allowClear>
                                            {drivers.map(d => (
                                                <Option key={d._id} value={d._id}>{d.fullName} - {d.phone}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item name="staffIds" label="Nhân viên phụ bốc xếp">
                                        <Select mode="multiple" placeholder="Chọn tên nhân viên bốc xếp" allowClear>
                                            {staff.map(s => (
                                                <Option key={s._id} value={s._id}>{s.fullName} - {s.phone}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Divider orientation="left" style={{ margin: '8px 0', fontSize: '13px' }}>Thời gian & Phương tiện</Divider>
                                    <Form.Item
                                        name="dispatchTime"
                                        label="Thời gian điều phối (Dự kiến)"
                                        rules={[{ required: true, message: 'Vui lòng xác nhận thời gian' }]}
                                    >
                                        <DatePicker
                                            showTime
                                            format="DD/MM/YYYY HH:mm"
                                            style={{ width: '100%' }}
                                            placeholder="Chọn ngày và giờ vận chuyển"
                                        />
                                    </Form.Item>

                                    <Row gutter={16}>
                                        <Col span={14}>
                                            <Form.Item name="vehicleType" label="Loại xe">
                                                <Select placeholder="Chọn loại xe" allowClear>
                                                    <Option value="500KG">Xe 500 KG</Option>
                                                    <Option value="1TON">Xe 1 Tấn</Option>
                                                    <Option value="1.5TON">Xe 1.5 Tấn</Option>
                                                    <Option value="2TON">Xe 2 Tấn</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={10}>
                                            <Form.Item name="vehicleCount" label="Số lượng xe">
                                                <Select placeholder="Số xe">
                                                    <Option value={1}>1 xe</Option>
                                                    <Option value={2}>2 xe</Option>
                                                    <Option value={3}>3 xe</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Divider style={{ margin: '16px 0' }} />

                                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                                        <Space>
                                            <Button onClick={handleCancel}>Hủy</Button>
                                            <Button type="primary" htmlType="submit" loading={submitting} size="large">
                                                Xác nhận điều phối
                                            </Button>
                                        </Space>
                                    </Form.Item>
                                </Form>
                            </Card>
                        </Space>
                    </Col>
                    <Col span={14}>
                        <div style={{ height: '700px', background: '#f0f2f5', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d9d9d9', position: 'relative' }}>
                            {isModalVisible && mapCoords.pickup && mapCoords.delivery ? (
                                <ResourceMap
                                    pickup={mapCoords.pickup}
                                    delivery={mapCoords.delivery}
                                    allRoutes={allAdminRoutes}
                                    vehicleType={vehicleType}
                                    dispatchTime={dispatchTime}
                                />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                    <AntdSpin size="large" />
                                    <span style={{ color: '#8c8c8c', marginTop: 12 }}>Đang chuẩn bị bản đồ địa hình...</span>
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>
            </Modal>
        </div>
    );
};

export default ResourceAllocation;