import React from 'react';
import { Card, Button, Select, Form, Row, Col, Space, Typography, Alert, DatePicker, Tag } from 'antd';
import { CarOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

const renderVehicleOption = (label, type, vehicleStats) => {
    const count = vehicleStats[type];
    if (count === undefined) return label;
    const isAvailable = count > 0;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ opacity: isAvailable ? 1 : 0.5 }}>{label}</span>
            {isAvailable
                ? <Tag color="#44624a" bordered={false} style={{ margin: 0 }}>{count} sẵn sàng</Tag>
                : <Tag color="error" bordered={false} style={{ margin: 0 }}>Hết xe</Tag>
            }
        </div>
    );
};

const DispatchPlanCard = ({ vehicleStats, submitting, handleCancel, form, totalHours }) => (
    <>
        <Card
            size="small"
            style={{ marginTop: '16px', border: '1px solid #d9d9d9', borderRadius: '8px' }}
            styles={{ body: { maxHeight: '220px', overflowY: 'auto' } }}
            title={<Space><CarOutlined style={{ color: '#44624a' }} /><Text strong style={{ fontSize: 15, color: '#44624a' }}>Kế hoạch xuất phát & Vận tải</Text></Space>}
        >
            <Row gutter={24}>
                <Col span={10}>
                    <Form.Item
                        name="dispatchTime"
                        label={<span style={{ fontWeight: 500, color: '#44624a' }}>Thời điểm khởi hành dự kiến</span>}
                        rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
                    >
                        <DatePicker
                            showTime
                            format="DD/MM/YYYY HH:mm"
                            style={{ width: '100%', borderRadius: '6px' }}
                            placeholder="Chọn ngày và giờ vận chuyển"
                            disabledDate={(current) => current && current < dayjs().startOf('day')}
                            disabledTime={(current) => {
                                if (current && current.isSame(dayjs(), 'day')) {
                                    return {
                                        disabledHours: () => Array.from({ length: dayjs().hour() }, (_, i) => i),
                                        disabledMinutes: (selectedHour) => {
                                            if (selectedHour === dayjs().hour()) {
                                                return Array.from({ length: dayjs().minute() }, (_, i) => i);
                                            }
                                            return [];
                                        }
                                    };
                                }
                                return {};
                            }}
                        />
                    </Form.Item>
                </Col>
                <Col span={14}>
                    <Form.Item
                        label={<span style={{ fontWeight: 500, color: '#44624a' }}>Danh sách Phương tiện cần thiết</span>}
                        required
                        style={{ marginBottom: 0 }}
                    >
                        <Form.List name="vehicles" initialValue={[{ vehicleType: undefined, count: 1 }]}>
                            {(fields, { add, remove }) => (
                                <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Space key={key} style={{ display: 'flex', marginBottom: fields.length > 1 ? 8 : 0 }} align="baseline">
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'vehicleType']}
                                                rules={[{ required: true, message: 'Chọn xe' }]}
                                                style={{ margin: 0, width: 200 }}
                                            >
                                                <Select placeholder="Chọn loại xe" allowClear>
                                                    <Option value="500KG" disabled={vehicleStats['500KG'] === 0}>{renderVehicleOption('Xe 500 KG', '500KG', vehicleStats)}</Option>
                                                    <Option value="1TON" disabled={vehicleStats['1TON'] === 0}>{renderVehicleOption('Xe 1 Tấn', '1TON', vehicleStats)}</Option>
                                                    <Option value="1.5TON" disabled={vehicleStats['1.5TON'] === 0}>{renderVehicleOption('Xe 1.5 Tấn', '1.5TON', vehicleStats)}</Option>
                                                    <Option value="2TON" disabled={vehicleStats['2TON'] === 0}>{renderVehicleOption('Xe 2 Tấn', '2TON', vehicleStats)}</Option>
                                                </Select>
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'count']}
                                                rules={[{ required: true, message: 'Nhập SL' }]}
                                                style={{ margin: 0, width: 80 }}
                                            >
                                                <Select placeholder="Số lượng">
                                                    <Option value={1}>1 xe</Option>
                                                    <Option value={2}>2 xe</Option>
                                                    <Option value={3}>3 xe</Option>
                                                    <Option value={4}>4 xe</Option>
                                                </Select>
                                            </Form.Item>
                                            {fields.length > 1 ? (
                                                <DeleteOutlined
                                                    onClick={() => remove(name)}
                                                    style={{ color: '#ff4d4f', cursor: 'pointer', padding: '4px' }}
                                                />
                                            ) : null}
                                        </Space>
                                    ))}
                                    <Button
                                        type="dashed"
                                        onClick={() => add({ vehicleType: undefined, count: 1 })}
                                        style={{ width: '100%', marginTop: '8px' }}
                                        icon={<PlusOutlined />}
                                    >
                                        Bổ sung xe tải phụ vào đội hình
                                    </Button>
                                </div>
                            )}
                        </Form.List>
                    </Form.Item>
                </Col>
            </Row>
        </Card>

        {/* Action footer with inline missing seats alert */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <Form.Item
                shouldUpdate={(prev, cur) =>
                    prev.vehicles !== cur.vehicles ||
                    prev.leaderId !== cur.leaderId ||
                    prev.driverIds !== cur.driverIds ||
                    prev.staffIds !== cur.staffIds
                }
                style={{ margin: 0, flex: 1 }}
            >
                {() => {
                    const vals = form.getFieldsValue(['vehicles', 'leaderId', 'driverIds', 'staffIds']);
                    const totalStaff = (vals.leaderId ? 1 : 0) + (vals.driverIds?.length || 0) + (vals.staffIds?.length || 0);
                    const totalSeats = (vals.vehicles || []).reduce((sum, v) => {
                        const vt = v.vehicleType;
                        const c = parseInt(v.count || 1);
                        let spv = 2;
                        if (vt === '1.5TON' || vt === '2TON' || vt === '5000KG') spv = 3;
                        return sum + spv * c;
                    }, 0);
                    const missingSeats = totalStaff - totalSeats;
                    return missingSeats > 0 ? (
                        <Alert
                            message={`Phát sinh di chuyển phụ: Cần ${missingSeats} xe máy phụ (cabin chỉ đủ ${totalSeats} chỗ).`}
                            type="warning"
                            showIcon
                            style={{ padding: '4px 12px' }}
                        />
                    ) : null;
                }}
            </Form.Item>
            <Space style={{ flexShrink: 0 }}>
                <Button onClick={handleCancel}>Hủy</Button>
                <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    size="large"
                    style={{ background: '#44624a' }}
                >
                    Xác nhận điều phối
                </Button>
            </Space>
        </div>
    </>
);

export default DispatchPlanCard;
