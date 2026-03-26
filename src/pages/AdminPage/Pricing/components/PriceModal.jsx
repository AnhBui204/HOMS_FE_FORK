import React, { useState, useEffect } from 'react';
import {
    Modal, Form, Input, InputNumber, Select, Switch,
    message, Tabs, Row, Col, Button, Card, Space,
    Divider, Typography
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import adminPriceService from '../../../../services/adminPriceService';

const { Option } = Select;
const { Text } = Typography;

const VEHICLE_TYPES = ['500KG', '1TON', '1.5TON', '2TON'];

const vndFormatter = v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const vndParser = v => v.replace(/,*/g, '');

/* ── Reusable currency input ── */
const VndInput = (props) => (
    <InputNumber
        style={{ width: '100%' }}
        formatter={vndFormatter}
        parser={vndParser}
        min={0}
        {...props}
    />
);

/* ══════════════════════════════════════════════════════
   PRICE MODAL  — Create / Edit a full PriceList document
   ══════════════════════════════════════════════════════ */
const PriceModal = ({ visible, onClose, onSuccess, priceList }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    /* Pre-fill when editing */
    useEffect(() => {
        if (!visible) return;
        if (priceList) {
            form.setFieldsValue(priceList);
        } else {
            form.resetFields();
            /* Sensible defaults so admin can just tweak numbers */
            form.setFieldsValue({
                isActive: true,
                taxRate: 0.1,
                basePrice: { minimumCharge: 500000, fullHouseBase: 300000, specificItemsBase: 200000 },
                transportTiers: [
                    { fromKm: 0, toKm: 5, flatFee: 500000, pricePerKmBeyond: 0 },
                    { fromKm: 5, toKm: 10, flatFee: 700000, pricePerKmBeyond: 0 },
                    { fromKm: 10, toKm: 20, flatFee: 1000000, pricePerKmBeyond: 0 },
                    { fromKm: 20, toKm: null, flatFee: 1000000, pricePerKmBeyond: 20000 },
                ],
                vehiclePricing: [
                    { vehicleType: '500KG', basePriceForFirstXKm: 500000, limitKm: 5, pricePerNextKm: 8000, pricePerHour: 80000, pricePerDay: 600000 },
                    { vehicleType: '1TON', basePriceForFirstXKm: 700000, limitKm: 5, pricePerNextKm: 12000, pricePerHour: 100000, pricePerDay: 800000 },
                    { vehicleType: '1.5TON', basePriceForFirstXKm: 900000, limitKm: 5, pricePerNextKm: 15000, pricePerHour: 120000, pricePerDay: 1000000 },
                    { vehicleType: '2TON', basePriceForFirstXKm: 1200000, limitKm: 5, pricePerNextKm: 20000, pricePerHour: 150000, pricePerDay: 1200000 },
                ],
                laborCost: { basePricePerPerson: 0, pricePerHourPerPerson: 80000 },
                movingSurcharge: {
                    freeCarryDistance: 15, pricePerExtraMeter: 2000,
                    stairSurchargePerFloor: 50000, elevatorSurcharge: 20000,
                    peakHourMultiplier: 1.2, weekendMultiplier: 1.15,
                },
                additionalServices: {
                    packingFee: 200000, assemblingFee: 300000,
                    insuranceRate: 0.01, managementFeeRate: 0.05,
                },
                itemServiceRates: {
                    TV: 50000, FRIDGE: 100000, BED: 150000, SOFA: 80000,
                    WARDROBE: 100000, AC: 80000, WASHING_MACHINE: 80000, OTHER: 30000,
                },
                surveyFee: { offline: 100000, online: 0 },
            });
        }
    }, [visible, priceList, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = { ...values };
            setLoading(true);
            if (priceList) {
                await adminPriceService.updatePriceList(priceList._id, payload);
                message.success('Bảng giá đã được cập nhật');
            } else {
                await adminPriceService.createPriceList(payload);
                message.success('Bảng giá đã được tạo');
            }
            onSuccess();
            onClose();
        } catch (error) {
            if (error?.errorFields) return; // validation error — antd already shows messages
            message.error(error.response?.data?.message || 'Lỗi khi lưu bảng giá');
        } finally {
            setLoading(false);
        }
    };

    const tabItems = [
        {
            key: 'general',
            label: 'Thông tin chung',
            children: (
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="code" label="Mã bảng giá" rules={[{ required: true, message: 'Bắt buộc' }]}>
                            <Input placeholder="VD: STD-2026" />
                        </Form.Item>
                    </Col>
                    <Col span={10}>
                        <Form.Item name="name" label="Tên bảng giá" rules={[{ required: true, message: 'Bắt buộc' }]}>
                            <Input placeholder="VD: Bảng giá 2026" />
                        </Form.Item>
                    </Col>
                    <Col span={3}>
                        <Form.Item name="taxRate" label="Thuế VAT">
                            <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    {/* isActive switch moved to table actions column */}
                    <Col span={24}>
                        <Form.Item name="description" label="Mô tả">
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>

                    {/* effectiveFrom/effectiveTo removed */}

                    <Col span={24}><Divider orientation="left">Giá sàn tối thiểu</Divider></Col>
                    <Col span={8}>
                        <Form.Item name={['basePrice', 'minimumCharge']} label="Phí tối thiểu (đ)">
                            <VndInput />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name={['basePrice', 'fullHouseBase']} label="Quản lý dọn trọn gói (đ)">
                            <VndInput />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name={['basePrice', 'specificItemsBase']} label="Quản lý dọn đồ lẻ (đ)">
                            <VndInput />
                        </Form.Item>
                    </Col>

                    <Col span={24}><Divider orientation="left">Phí khảo sát</Divider></Col>
                    <Col span={8}>
                        <Form.Item name={['surveyFee', 'offline']} label="Offline (đ)"><VndInput /></Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name={['surveyFee', 'online']} label="Online (đ)"><VndInput /></Form.Item>
                    </Col>
                </Row>
            )
        },
        {
            key: 'transport',
            label: 'Vận chuyển',
            children: (
                <>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                        Ví dụ: 500k cho 0–5km, 700k cho 5–10km, 1M+ cho 10km+
                    </Text>
                    <Form.List name="transportTiers">
                        {(fields, { add, remove }) => (
                            <>
                                <Row gutter={8} style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, color: '#555' }}>
                                    <Col span={5}>Từ (km)</Col>
                                    <Col span={5}>Đến (km)</Col>
                                    <Col span={6}>Phí cố định (đ)</Col>
                                    <Col span={7}>Phí thêm / km (đ)</Col>
                                    <Col span={1} />
                                </Row>
                                {fields.map(({ key, name }) => (
                                    <Row gutter={8} key={key} align="middle" style={{ marginBottom: 6 }}>
                                        <Col span={5}>
                                            <Form.Item name={[name, 'fromKm']} style={{ marginBottom: 0 }}>
                                                <InputNumber min={0} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={5}>
                                            <Form.Item name={[name, 'toKm']} style={{ marginBottom: 0 }}>
                                                <InputNumber min={0} style={{ width: '100%' }} placeholder="null=∞" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={6}>
                                            <Form.Item name={[name, 'flatFee']} style={{ marginBottom: 0 }}>
                                                <VndInput />
                                            </Form.Item>
                                        </Col>
                                        <Col span={7}>
                                            <Form.Item name={[name, 'pricePerKmBeyond']} style={{ marginBottom: 0 }}>
                                                <VndInput placeholder="0 nếu không áp dụng" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={1}>
                                            <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }} onClick={() => remove(name)} />
                                        </Col>
                                    </Row>
                                ))}
                                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => add({ fromKm: 0, toKm: null, flatFee: 0, pricePerKmBeyond: 0 })}>
                                    Thêm bậc
                                </Button>
                            </>
                        )}
                    </Form.List>
                </>
            )
        },
        {
            key: 'vehicle',
            label: 'Phí xe',
            children: (
                <>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                        Phí mở cửa (X km đầu) + phí từng km thêm ngoài limit
                    </Text>
                    <Form.List name="vehiclePricing">
                        {(fields, { add, remove }) => (
                            <>
                                <Row gutter={8} style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, color: '#555' }}>
                                    <Col span={4}>Xe</Col>
                                    <Col span={4}>Phí mở cửa (đ)</Col>
                                    <Col span={3}>Km bao gồm</Col>
                                    <Col span={4}>Phí/ km thêm (đ)</Col>
                                    <Col span={4}>Phí/ giờ (đ)</Col>
                                    <Col span={4}>Phí/ ngày (đ)</Col>
                                    <Col span={1} />
                                </Row>
                                {fields.map(({ key, name }) => (
                                    <Row gutter={8} key={key} align="middle" style={{ marginBottom: 6 }}>
                                        <Col span={4}>
                                            <Form.Item name={[name, 'vehicleType']} style={{ marginBottom: 0 }} rules={[{ required: true }]}>
                                                <Select size="small">
                                                    {VEHICLE_TYPES.map(t => <Option key={t} value={t}>{t}</Option>)}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={4}><Form.Item name={[name, 'basePriceForFirstXKm']} style={{ marginBottom: 0 }}><VndInput size="small" /></Form.Item></Col>
                                        <Col span={3}><Form.Item name={[name, 'limitKm']} style={{ marginBottom: 0 }}><InputNumber size="small" min={0} style={{ width: '100%' }} /></Form.Item></Col>
                                        <Col span={4}><Form.Item name={[name, 'pricePerNextKm']} style={{ marginBottom: 0 }}><VndInput size="small" /></Form.Item></Col>
                                        <Col span={4}><Form.Item name={[name, 'pricePerHour']} style={{ marginBottom: 0 }}><VndInput size="small" /></Form.Item></Col>
                                        <Col span={4}><Form.Item name={[name, 'pricePerDay']} style={{ marginBottom: 0 }}><VndInput size="small" /></Form.Item></Col>
                                        <Col span={1}><DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }} onClick={() => remove(name)} /></Col>
                                    </Row>
                                ))}
                                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => add({ vehicleType: '500KG', basePriceForFirstXKm: 0, limitKm: 5, pricePerNextKm: 0, pricePerHour: 0, pricePerDay: 0 })}>
                                    Thêm loại xe
                                </Button>
                            </>
                        )}
                    </Form.List>
                </>
            )
        },
        {
            key: 'labor',
            label: 'Nhân công & Phụ phí',
            children: (
                <Row gutter={16}>
                    <Col span={24}><Divider orientation="left">Phí nhân công (Giá / người / giờ)</Divider></Col>
                    <Col span={12}>
                        <Form.Item name={['laborCost', 'basePricePerPerson']} label="Phí cơ bản / người (đ)">
                            <VndInput />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name={['laborCost', 'pricePerHourPerPerson']} label="Phí / giờ / người (đ)" rules={[{ required: true }]}>
                            <VndInput />
                        </Form.Item>
                    </Col>

                    <Col span={24}><Divider orientation="left">Phụ phí di chuyển</Divider></Col>
                    <Col span={8}><Form.Item name={['movingSurcharge', 'freeCarryDistance']} label="Miễn phí khiêng bộ (m)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item name={['movingSurcharge', 'pricePerExtraMeter']} label="Phí / m thêm (đ)"><VndInput /></Form.Item></Col>
                    <Col span={8}><Form.Item name={['movingSurcharge', 'distanceSurchargePerKm']} label="Phụ phí / km (đ)"><VndInput /></Form.Item></Col>
                    <Col span={8}><Form.Item name={['movingSurcharge', 'stairSurchargePerFloor']} label="Phí cầu thang / tầng (đ)"><VndInput /></Form.Item></Col>
                    <Col span={8}><Form.Item name={['movingSurcharge', 'elevatorSurcharge']} label="Phí thang máy / tầng (đ)"><VndInput /></Form.Item></Col>
                    <Col span={8}><Form.Item name={['movingSurcharge', 'peakHourMultiplier']} label="Hệ số giờ cao điểm"><InputNumber min={1} step={0.05} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item name={['movingSurcharge', 'weekendMultiplier']} label="Hệ số cuối tuần"><InputNumber min={1} step={0.05} style={{ width: '100%' }} /></Form.Item></Col>

                    <Col span={24}><Divider orientation="left">Dịch vụ bổ sung</Divider></Col>
                    <Col span={6}><Form.Item name={['additionalServices', 'packingFee']} label="Phí đóng gói (đ)"><VndInput /></Form.Item></Col>
                    <Col span={6}><Form.Item name={['additionalServices', 'packingMaterial']} label="Phí vật liệu (đ)"><VndInput /></Form.Item></Col>
                    <Col span={6}><Form.Item name={['additionalServices', 'assemblingFee']} label="Phí tháo lắp (đ)"><VndInput /></Form.Item></Col>
                    <Col span={6}><Form.Item name={['additionalServices', 'insuranceRate']} label="Tỉ lệ bảo hiểm (%)"><InputNumber min={0} max={1} step={0.001} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={6}><Form.Item name={['additionalServices', 'insuranceMinimum']} label="BH tối thiểu (đ)"><VndInput /></Form.Item></Col>
                    <Col span={6}><Form.Item name={['additionalServices', 'insuranceMaximum']} label="BH tối đa (đ)"><VndInput /></Form.Item></Col>
                    <Col span={8}><Form.Item name={['additionalServices', 'managementFeeRate']} label="Phí quản lý (%)"><InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                </Row>
            )
        },
        // 'Phí đồ vật' tab removed as requested
    ];

    return (
        <Modal
            title={priceList ? 'Chỉnh sửa bảng giá' : 'Tạo bảng giá mới'}
            open={visible}
            onCancel={onClose}
            onOk={handleSubmit}
            okText={priceList ? 'Lưu thay đổi' : 'Tạo bảng giá'}
            confirmLoading={loading}
            width={860}
            destroyOnClose
            styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}
        >
            <Form form={form} layout="vertical" size="small">
                <Tabs items={tabItems} />
            </Form>
        </Modal>
    );
};

export default PriceModal;
