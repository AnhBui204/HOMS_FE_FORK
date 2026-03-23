import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, message, Space, Divider, Select } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import adminRouteService from '../../../../services/adminRouteService';

const { Option } = Select;

const VehicleModal = ({ visible, onClose, onSuccess, route }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible) {
            if (route) {
                form.setFieldsValue({
                    startPoint: route.startPoint,
                    endPoint: route.endPoint,
                    distance: route.distance,
                    estimatedTime: route.estimatedTime,
                    trafficRules: route.trafficRules || []
                });
            } else {
                form.resetFields();
            }
        }
    }, [visible, route, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (route) {
                // Edit existing route
                await adminRouteService.updateRoute(route._id, values);
                message.success('Cập nhật tuyến đường thành công');
            } else {
                // Create new route
                await adminRouteService.createRoute(values);
                message.success('Tạo tuyến đường thành công');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving route:', error);
            message.error(error.response?.data?.message || 'Lưu tuyến đường thất bại. Vui lòng kiểm tra thông tin.');
        }
    };

    return (
        <Modal
            title={route ? "Chỉnh sửa tuyến đường" : "Tạo tuyến đường mới"}
            open={visible}
            onCancel={onClose}
            onOk={handleSubmit}
            okText={route ? "Lưu thay đổi" : "Tạo"}
            width={800}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <Form.Item name="startPoint" label="Điểm bắt đầu" rules={[{ required: true }]}>
                        <Input placeholder="Ví dụ: Trung tâm Hà Nội" />
                    </Form.Item>
                    <Form.Item name="endPoint" label="Điểm kết thúc" rules={[{ required: true }]}>
                        <Input placeholder="Ví dụ: Cảng Hải Phòng" />
                    </Form.Item>
                    <Form.Item name="distance" label="Khoảng cách (km)" rules={[{ required: true, type: 'number', min: 0 }]}>
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="estimatedTime" label="Thời gian ước tính (giờ)" rules={[{ required: true, type: 'number', min: 0 }]}>
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                </div>

                <Divider orientation="left">Quy tắc và giới hạn giao thông</Divider>

                <Form.List name="trafficRules">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'ruleType']}
                                            rules={[{ required: true, message: 'Vui lòng chọn loại quy tắc' }]}
                                    >
                                            <Select placeholder="Loại quy tắc" style={{ width: 150 }}>
                                                <Option value="WeightLimit">Giới hạn trọng lượng</Option>
                                                <Option value="TimeRestriction">Giới hạn thời gian</Option>
                                                <Option value="VehicleTypeBan">Cấm loại phương tiện</Option>
                                            </Select>
                                    </Form.Item>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'description']}
                                            rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
                                    >
                                            <Input placeholder="Mô tả, ví dụ: Không cho xe > 5T" style={{ width: 300 }} />
                                    </Form.Item>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'value']}
                                    >
                                            <Input placeholder="Giá trị (Tùy chọn)" style={{ width: 150 }} />
                                    </Form.Item>
                                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                                </Space>
                            ))}
                            <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Thêm quy tắc giao thông
                                    </Button>
                            </Form.Item>
                        </>
                    )}
                </Form.List>

            </Form>
        </Modal>
    );
};

export default VehicleModal;
