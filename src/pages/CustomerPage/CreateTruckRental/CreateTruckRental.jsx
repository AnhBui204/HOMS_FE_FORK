import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Steps, Card, Row, Col, Input, Button, DatePicker, message, Alert, Select, Checkbox, ConfigProvider } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import LocationPicker from "../../../components/LocationPicker/LocationPicker";
import api from "../../../services/api";
import { createOrder } from "../../../services/orderService";

import "./style.css";

const { Content } = Layout;
const { TextArea } = Input;
const { Option } = Select;

const CreateTruckRental = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // From navigation state ideally
    const serviceId = location.state?.serviceId || 4;

    // Pick-up location state
    const [pickupLocation, setPickupLocation] = useState(
        JSON.parse(sessionStorage.getItem('pickupLocation')) || null
    );
    const [pickupDescription, setPickupDescription] = useState('');

    // Rental details
    const [truckType, setTruckType] = useState('1TON');
    const [rentalDurationHours, setRentalDurationHours] = useState(2);
    const [withDriver, setWithDriver] = useState(false);

    // Schedule state
    const [movingDate, setMovingDate] = useState(null);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        // Restore moving date if cached
        const savedDate = sessionStorage.getItem('movingDate');
        if (savedDate) setMovingDate(dayjs(savedDate));
    }, []);

    const handleLocationChange = (locationData) => {
        setPickupLocation(locationData);
        sessionStorage.setItem('pickupLocation', JSON.stringify(locationData));
        setErrors(prev => ({ ...prev, pickupLocation: null }));
    };

    const handleNext = async () => {
        const newErrors = {};

        if (!pickupLocation || !pickupLocation.lat || !pickupLocation.lng || !pickupLocation.address) {
            newErrors.pickupLocation = 'Vui lòng chọn địa điểm nhận xe hợp lệ từ bản đồ';
        }

        if (!movingDate) {
            newErrors.movingDate = 'Vui lòng chọn ngày giờ nhận xe';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            message.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        setErrors({});
        setIsSubmitting(true);

        const now = dayjs();
        const selectedMovingDate = dayjs(movingDate);

        // Buffer check
        const hoursUntilMoving = selectedMovingDate.diff(now, 'hour', true);
        if (hoursUntilMoving < 2) {
            message.warning('Thời gian thuê xe nên cách thời điểm hiện tại ít nhất 2 giờ để chúng tôi chuẩn bị xe');
        }

        // Important: for ConfirmMovingOrder, we want dropoffLocation to be pickupLocation or null. Setting identical.
        const orderData = {
            serviceId,
            serviceName: 'Thuê Xe Tải',
            pickupLocation,
            dropoffLocation: pickupLocation, // Both needed
            pickupDescription,
            movingDate: movingDate.toISOString(),
            moveType: 'TRUCK_RENTAL',
            rentalDetails: {
                truckType,
                rentalDurationHours,
                withDriver
            }
        };

        try {
            const response = await createOrder(orderData);
            message.success('Tạo đơn thuê xe thành công!');
            // Save state or ID if needed, then navigate to dashboard
            navigate('/customer/order');
        } catch (error) {
            message.error(error?.message || 'Có lỗi xảy ra khi tạo yêu cầu. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout className="create-order-layout">
            <AppHeader />
            <Content className="create-order-content">
                <main className="main-container">
                    {/* HERO */}
                    <section className="moving-hero" style={{ position: 'relative' }}>
                        <h1>Thuê Xe Tải Tự Lái / Có Tài Xế</h1>
                    </section>

                    {/* STEPS */}
                    <section className="service-steps-container">
                        <Card className="steps-card">
                            <Steps
                                current={0}
                                responsive
                                items={[
                                    { title: 'Chọn Ngày & Xe' },
                                    { title: 'Xác nhận Đơn' },
                                ]}
                            />
                        </Card>
                    </section>

                    <section className="moving-location">
                        <h1>Bạn Mong Muốn Nhận Xe Ở Đâu?</h1>
                        <Row gutter={40}>
                            <Col md={10} xs={24}>
                                <Card className="location-card" bordered={false}>
                                    <div className="location-form">
                                        <h3>Địa điểm nhận xe</h3>
                                        <Input
                                            placeholder="Địa chỉ tự động từ bản đồ"
                                            value={pickupLocation?.address}
                                            prefix={<EnvironmentOutlined />}
                                            readOnly
                                            style={{ marginBottom: 15 }}
                                        />
                                        {errors.pickupLocation && (
                                            <div style={{ color: '#ff4d4f', marginBottom: 15, marginTop: -10, fontSize: 13 }}>{errors.pickupLocation}</div>
                                        )}

                                        <TextArea
                                            placeholder="Ghi chú thêm về địa điểm (vd: Xe có thể đậu trước hẻm)..."
                                            value={pickupDescription}
                                            onChange={(e) => setPickupDescription(e.target.value)}
                                            rows={2}
                                            style={{ marginBottom: 15 }}
                                        />

                                        <h3>Chi tiết thuê xe</h3>
                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', marginBottom: 5 }}>Loại xe Tải:</label>
                                            <Select value={truckType} onChange={setTruckType} style={{ width: '100%' }}>
                                                <Option value="500KG">500 KG</Option>
                                                <Option value="1TON">1 Tấn</Option>
                                                <Option value="1.5TON">1.5 Tấn</Option>
                                                <Option value="2TON">2 Tấn</Option>
                                            </Select>
                                        </div>

                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', marginBottom: 5 }}>Thời gian thuê:</label>
                                            <Select value={rentalDurationHours} onChange={setRentalDurationHours} style={{ width: '100%' }}>
                                                <Option value={2}>2 tiếng</Option>
                                                <Option value={4}>4 tiếng</Option>
                                                <Option value={8}>8 tiếng</Option>
                                                <Option value={24}>24 tiếng (1 ngày)</Option>
                                            </Select>
                                        </div>

                                        <div style={{ marginBottom: 15 }}>
                                            <Checkbox checked={withDriver} onChange={e => setWithDriver(e.target.checked)}>
                                                Cần thêm tài xế hỗ trợ điều khiển xe
                                            </Checkbox>
                                        </div>

                                        <h3>Ngày giờ nhận xe</h3>
                                        <div style={{ width: '100%', marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <ConfigProvider locale={viVN}>
                                                    <DatePicker
                                                        placeholder="Chọn giờ thuê"
                                                        showTime={{ format: 'HH:mm', minuteStep: 15 }}
                                                        format="DD/MM/YYYY HH:mm"
                                                        value={movingDate}
                                                        onChange={(v) => { setMovingDate(v); setErrors(prev => ({ ...prev, movingDate: null })); }}
                                                        disabledDate={(current) => current && current < dayjs().endOf('day')}
                                                        style={{ width: '100%', padding: '10px 14px' }}
                                                    />
                                                </ConfigProvider>
                                                {errors.movingDate && (
                                                    <div style={{ color: '#ff4d4f', marginTop: 5, fontSize: 13 }}>{errors.movingDate}</div>
                                                )}
                                            </div>
                                        </div>

                                        <Alert
                                            message="Lưu ý thuê xe"
                                            description="Vui lòng mang theo CCCD và Bằng lái xe phù hợp (nếu tự lái) khi đến nhận xe. Trễ giờ trả xe sẽ tính phụ phí."
                                            type="info"
                                            showIcon
                                            style={{ marginTop: 20 }}
                                        />
                                    </div>
                                </Card>
                            </Col>

                            <Col md={14} xs={24}>
                                <div style={{ height: '700px' }}>
                                    <LocationPicker
                                        onLocationChange={handleLocationChange}
                                        initialPosition={pickupLocation ? { lat: pickupLocation.lat, lng: pickupLocation.lng } : null}
                                        currentLocationData={pickupLocation}
                                        locationType="pickup"
                                    />
                                </div>
                            </Col>
                        </Row>
                    </section>

                    <div className="next-button">
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleNext}
                            loading={isSubmitting}
                        >
                            Tiếp tục đặt xe
                        </Button>
                    </div>
                </main>
            </Content>
            <AppFooter />
        </Layout>
    );
};

export default CreateTruckRental;