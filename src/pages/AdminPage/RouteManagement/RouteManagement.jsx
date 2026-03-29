import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Card, Select, Space, Tag, message, Popconfirm, Row, Col, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import adminRouteService from '../../../services/adminRouteService';

const { Option } = Select;

const DISTRICTS = [
    "HAI_CHAU", "THANH_KHE", "SON_TRA", "NGU_HANH_SON", "LIEN_CHIEU", "CAM_LE"
];

const DISTRICT_LABELS = {
    "HAI_CHAU": "Quận Hải Châu",
    "THANH_KHE": "Quận Thanh Khê",
    "SON_TRA": "Quận Sơn Trà",
    "NGU_HANH_SON": "Quận Ngũ Hành Sơn",
    "LIEN_CHIEU": "Quận Liên Chiểu",
    "CAM_LE": "Quận Cẩm Lệ"
};

const RULE_TYPE_LABELS = {
    "PEAK_HOUR": "Giờ cao điểm",
    "TRUCK_BAN": "Cấm xe tải",
    "WEATHER": "Thời tiết",
    "HOLIDAY": "Ngày lễ"
};

const RouteManagement = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRuleModalVisible, setIsRuleModalVisible] = useState(false);
    const [editingRoute, setEditingRoute] = useState(null);
    const [form] = Form.useForm();
    const [ruleForm] = Form.useForm();
    const [isMenuModalVisible, setIsMenuModalVisible] = useState(false);

    const fetchRoutes = async () => {
        setLoading(true);
        try {
            const data = await adminRouteService.getAllRoutes();
            setRoutes(data.data || []);
        } catch (error) {
            message.error('Failed to load routes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutes();
    }, []);

    const showCreateModal = () => {
        setEditingRoute(null);
        form.resetFields();
        setIsMenuModalVisible(true);
    };

    const showEditModal = (record) => {
        setEditingRoute(record);
        form.setFieldsValue(record);
        setIsMenuModalVisible(true);
    };

    const showAddRuleModal = (record) => {
        setEditingRoute(record);
        ruleForm.resetFields();
        setIsRuleModalVisible(true);
    };

    const handleRouteSubmit = async (values) => {
        try {
            if (editingRoute) {
                await adminRouteService.updateRoute(editingRoute._id, values);
                message.success('Cập nhật lộ trình thành công');
            } else {
                await adminRouteService.createRoute(values);
                message.success('Tạo lộ trình mới thành công');
            }
            setIsMenuModalVisible(false);
            fetchRoutes();
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleRuleSubmit = async (values) => {
        try {
            await adminRouteService.addTrafficRule(editingRoute._id, values);
            message.success('Thêm luật giao thông thành công');
            setIsRuleModalVisible(false);
            fetchRoutes();
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleDelete = async (id) => {
        try {
            await adminRouteService.deleteRoute(id);
            message.success('Đã tắt trạng thái lộ trình');
            fetchRoutes();
        } catch (error) {
            message.error('Lỗi khi xóa lộ trình');
        }
    };

    const columns = [
        {
            title: 'Mã Tuyến',
            dataIndex: 'code',
            key: 'code',
            render: text => <strong>{text}</strong>
        },
        {
            title: 'Tên Đường',
            dataIndex: 'name',
            key: 'name',
            render: text => <strong>{text}</strong>
        },
        {
            title: 'Quận/Huyện',
            dataIndex: 'district',
            key: 'district',
            render: text => <Tag color="blue">{DISTRICT_LABELS[text] || text}</Tag>
        },
        {
            title: 'Khu vực',
            dataIndex: 'area',
            key: 'area',
        },
        {
            title: 'Khoảng cách (km)',
            dataIndex: 'estimatedDistanceKm',
            key: 'estimatedDistanceKm',
            align: 'right'
        },
        {
            title: 'Luật giao thông',
            dataIndex: 'trafficRules',
            key: 'trafficRules',
            render: (rules) => (
                <Space direction="vertical">
                    {(rules || []).map((rule, idx) => (
                        <Tag color="orange" key={idx}>
                            {RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType}: {rule.startTime} - {rule.endTime}
                        </Tag>
                    ))}
                </Space>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="text" icon={<EditOutlined />} onClick={() => showEditModal(record)} />
                    <Button type="text" icon={<InfoCircleOutlined />} onClick={() => showAddRuleModal(record)}>Cập nhật luật</Button>
                    <Popconfirm title="Tắt trạng thái hoạt động của lộ trình này?" onConfirm={() => handleDelete(record._id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Card title="Quản lý Lộ Trình & Khảo sát" extra={<Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>Tạo mới</Button>}>
            <Table columns={columns} dataSource={routes} rowKey="_id" loading={loading} />

            <Modal title={editingRoute ? 'Cập nhật lộ trình' : 'Tạo mới lộ trình'} visible={isMenuModalVisible} onCancel={() => setIsMenuModalVisible(false)} onOk={() => form.submit()} width={800}>
                <Form form={form} layout="vertical" onFinish={handleRouteSubmit}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="code" label="Mã đường (Viết tắt)" rules={[{ required: true }]}>
                                <Input placeholder="Ví dụ: QUANG_TRUNG" disabled={!!editingRoute} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="name" label="Tên đường" rules={[{ required: true }]}>
                                <Input placeholder="Ví dụ: Quang Trung" />
                            </Form.Item>
                        </Col>

                        <Col span={12}>
                            <Form.Item name="district" label="Quận/Huyện" rules={[{ required: true }]}>
                                <Select>
                                    {DISTRICTS.map(d => <Option key={d} value={d}>{d}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col span={12}>
                            <Form.Item name="area" label="Thành phố" rules={[{ required: true }]}>
                                <Input placeholder="Ví dụ: Da_Nang" />
                            </Form.Item>
                        </Col>

                        <Col span={8}>
                            <Form.Item name="estimatedDistanceKm" label="Khoảng cách (km)">
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="estimatedDurationMin" label="Thời gian (phút)">
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="routeSurcharge" label="Phụ phí lộ trình (VND)">
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            <Modal title={`Thêm luật giao thông: ${editingRoute?.code}`} visible={isRuleModalVisible} onCancel={() => setIsRuleModalVisible(false)} onOk={() => ruleForm.submit()}>
                <Form form={ruleForm} layout="vertical" onFinish={handleRuleSubmit}>
                    <Form.Item name="ruleType" label="Loại luật" rules={[{ required: true }]}>
                        <Select>
                            <Option value="PEAK_HOUR">Giờ cao điểm</Option>
                            <Option value="TRUCK_BAN">Cấm tải</Option>
                            <Option value="WEATHER">Thời tiết xấu</Option>
                            <Option value="HOLIDAY">Lễ hội</Option>
                        </Select>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="startTime" label="Giờ bắt đầu (VD: 06:00)" rules={[{ required: true }]}>
                                <Input placeholder="06:00" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="endTime" label="Giờ kết thúc (VD: 09:00)" rules={[{ required: true }]}>
                                <Input placeholder="09:00" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="daysOfWeek" label="Ngày áp dụng">
                        <Select mode="multiple" placeholder="Trống = Cả tuần">
                            <Option value="MONDAY">Thứ 2</Option>
                            <Option value="TUESDAY">Thứ 3</Option>
                            <Option value="WEDNESDAY">Thứ 4</Option>
                            <Option value="THURSDAY">Thứ 5</Option>
                            <Option value="FRIDAY">Thứ 6</Option>
                            <Option value="SATURDAY">Thứ 7</Option>
                            <Option value="SUNDAY">Chủ nhật</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="restrictedVehicles" label="Loại xe bị cấm (Tùy chọn)">
                        <Select mode="tags" placeholder="Ví dụ: 2T, 5T" />
                    </Form.Item>

                    <Form.Item name="note" label="Ghi chú">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default RouteManagement;
