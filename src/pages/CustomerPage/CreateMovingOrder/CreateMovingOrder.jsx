import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Steps, Card, Row, Col, Input, Button, DatePicker, message } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import dayjs from 'dayjs';

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import LocationPicker from "../../../components/LocationPicker/LocationPicker";

import "./style.css";

const { Content } = Layout;
const { TextArea } = Input;

// Service mapping for development
const serviceDetails = {
    1: {
        title: 'Chuyển Nhà Trọn Gói',
        description: 'Khảo sát, đóng gói, tháo lắp nội thất, vận chuyển và sắp xếp tại nơi ở mới.'
    },
    2: {
        title: 'Chuyển Văn Phòng - Công Ty',
        description: 'Hỗ trợ di dời văn phòng, công ty nhanh chóng và chuyên nghiệp.'
    },
    3: {
        title: 'Chuyển Đồ Đạc',
        description: 'Hỗ trợ di dời đồ đạc trong nhà, văn phòng nhanh chóng và chuyên nghiệp.'
    },
    4: {
        title: 'Thuê Xe Tải',
        description: 'Hỗ trợ di dời đồ đạc, văn phòng nhanh chóng và chuyên nghiệp.'
    }
};

const MovingInformationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get serviceId from navigation state, default to 1 if not provided
    const serviceId = location.state?.serviceId || 1;
    const selectedService = serviceDetails[serviceId] || serviceDetails[1];
    // Location state management
    const [activeLocation, setActiveLocation] = useState('pickup'); // 'pickup' or 'dropoff'
    const [pickupLocation, setPickupLocation] = useState(null);
    const [dropoffLocation, setDropoffLocation] = useState(null);
    const [pickupDescription, setPickupDescription] = useState('');
    const [dropoffDescription, setDropoffDescription] = useState('');
    const [movingDate, setMovingDate] = useState(null);
    
    // Loading and error states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDateNote, setShowDateNote] = useState(false);

    // Handle location changes from map
    const handleLocationChange = (locationData) => {
        if (activeLocation === 'pickup') {
            setPickupLocation(locationData);
        } else {
            setDropoffLocation(locationData);
        }
    };
    
    const handleNext = async () => {
        // Validate required fields
        if (!pickupLocation) {
            message.error('Vui lòng chọn địa điểm chuyển đi');
            return;
        }
        
        if (!pickupLocation.lat || !pickupLocation.lng || !pickupLocation.address) {
            message.error('Địa điểm chuyển đi không hợp lệ. Vui lòng chọn lại.');
            return;
        }
        
        if (!dropoffLocation) {
            message.error('Vui lòng chọn địa điểm chuyển đến');
            return;
        }
        
        if (!dropoffLocation.lat || !dropoffLocation.lng || !dropoffLocation.address) {
            message.error('Địa điểm chuyển đến không hợp lệ. Vui lòng chọn lại.');
            return;
        }
        
        // Check if pickup and dropoff are the same
        if (pickupLocation.lat === dropoffLocation.lat && pickupLocation.lng === dropoffLocation.lng) {
            message.error('Địa điểm chuyển đi và chuyển đến không thể giống nhau');
            return;
        }
        
        if (!movingDate) {
            message.error('Vui lòng chọn thời gian chuyển');
            return;
        }
        
        // Validate moving date is in the future
        const now = dayjs();
        const selectedMovingDate = dayjs(movingDate);
        
        if (selectedMovingDate.isBefore(now) || selectedMovingDate.isSame(now, 'minute')) {
            message.error('Thời gian chuyển phải sau thời điểm hiện tại');
            return;
        }
        
        // Check if moving date is at least 2 hours from now (reasonable minimum)
        const hoursUntilMoving = selectedMovingDate.diff(now, 'hour', true);
        if (hoursUntilMoving < 2) {
            message.warning('Thời gian chuyển nên cách thời điểm hiện tại ít nhất 2 giờ để chúng tôi có thể chuẩn bị');
        }
        
        // Prepare order data to pass to next step
        const orderData = {
            serviceId,
            serviceName: selectedService.title,
            pickupLocation,
            dropoffLocation,
            pickupDescription,
            dropoffDescription,
            movingDate: movingDate.toISOString()
        };
        
        console.log('📦 Passing order data to confirmation:', orderData);
        
        // Navigate to confirmation page with order data
        navigate('/customer/confirm-order', { state: { orderData } });
    };

    return (
        <Layout className="moving-info-page">
            <AppHeader />

            <Content>

                {/* HERO */}
                <section className="moving-hero">
                    <h1>{selectedService.title}</h1>
                </section>

                {/* STEPS */}
                <section className="service-steps-container">
                    <Card className="steps-card">
                        <Steps
                            current={1}
                            responsive
                            items={[
                                { title: 'Chọn dịch vụ' },
                                { title: 'Địa điểm & Thông tin đồ đạc' },
                                { title: 'Xác nhận' },
                                { title: 'Đặt cọc' },
                            ]}
                        />
                    </Card>
                </section>

                {/* LOCATION SECTION */}
                <section className="moving-location">
                    <h1>Chúng Tôi Cần Biết Bạn Chuyển Từ Đâu Đến Đâu</h1>

                    <Row gutter={40}>
                        <Col md={10} xs={24}>
                            <div className="location-form">
                                <h3>
                                    {activeLocation === 'pickup' ? 'Địa điểm chuyển đi' : 'Địa điểm chuyển đến'}
                                </h3>

                                <Input
                                    placeholder="Địa chỉ tự động từ bản đồ"
                                    value={activeLocation === 'pickup' ? pickupLocation?.address : dropoffLocation?.address}
                                    prefix={<EnvironmentOutlined />}
                                    className="custom-input"
                                    readOnly
                                />

                                <div style={{ position: 'relative' }}>
                                    <DatePicker
                                        placeholder="Chọn thời gian"
                                        onChange={(date) => setMovingDate(date)}
                                        onFocus={() => setShowDateNote(true)}
                                        onBlur={() => setTimeout(() => setShowDateNote(false), 200)}
                                        showTime
                                        format="DD/MM/YYYY HH:mm"
                                        className="custom-input"
                                        style={{ width: '100%' }}
                                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                                        disabledTime={(current) => {
                                            const now = dayjs();
                                            if (current && dayjs(current).isSame(now, 'day')) {
                                                return {
                                                    disabledHours: () => [...Array(now.hour()).keys()],
                                                    disabledMinutes: (selectedHour) => {
                                                        if (selectedHour === now.hour()) {
                                                            return [...Array(now.minute() + 1).keys()];
                                                        }
                                                        return [];
                                                    }
                                                };
                                            }
                                            return {};
                                        }}
                                    />
                                    
                                    {/* Stylish floating note */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '-75px',
                                        left: '0',
                                        right: '0',
                                        backgroundColor: '#44624A',
                                        color: 'white',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        lineHeight: '1.5',
                                        boxShadow: '0 4px 12px rgba(68, 98, 74, 0.3)',
                                        opacity: showDateNote ? 1 : 0,
                                        visibility: showDateNote ? 'visible' : 'hidden',
                                        transform: showDateNote ? 'translateY(0)' : 'translateY(-10px)',
                                        transition: 'all 0.3s ease-in-out',
                                        zIndex: 10,
                                        pointerEvents: 'none'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                            <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
                                            <span>
                                                Quá trình khảo sát cần được hoàn thành trước ngày chuyển ít nhất 1 ngày để chúng tôi có thời gian xử lý hồ sơ và chuẩn bị chu đáo.
                                            </span>
                                        </div>
                                        {/* Arrow pointer */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-6px',
                                            left: '20px',
                                            width: '12px',
                                            height: '12px',
                                            backgroundColor: '#44624A',
                                            transform: 'rotate(45deg)',
                                        }}></div>
                                    </div>
                                </div>

                                <TextArea
                                    rows={3}
                                    placeholder="Mô tả sơ bộ (tầng, thang máy, đường vào...)"
                                    className="custom-input"
                                    value={activeLocation === 'pickup' ? pickupDescription : dropoffDescription}
                                    onChange={(e) => activeLocation === 'pickup' 
                                        ? setPickupDescription(e.target.value) 
                                        : setDropoffDescription(e.target.value)
                                    }
                                />

                                <div className="location-switch">
                                    <Button 
                                        type={activeLocation === 'pickup' ? 'primary' : 'default'}
                                        onClick={() => setActiveLocation('pickup')}
                                    >
                                        Nơi chuyển đi
                                    </Button>
                                    <Button 
                                        type={activeLocation === 'dropoff' ? 'primary' : 'default'}
                                        onClick={() => setActiveLocation('dropoff')}
                                    >
                                        Nơi chuyển đến
                                    </Button>
                                </div>

                                {pickupLocation && dropoffLocation && (
                                    <div className="location-summary">
                                        <p><strong>Từ:</strong> {pickupLocation.address?.substring(0, 150)}</p>
                                        <p><strong>Đến:</strong> {dropoffLocation.address?.substring(0, 150)}</p>
                                    </div>
                                )}
                            </div>
                        </Col>

                        <Col md={14} xs={24}>
                            <LocationPicker
                                onLocationChange={handleLocationChange}
                                initialPosition={
                                    activeLocation === 'pickup' 
                                        ? (pickupLocation ? { lat: pickupLocation.lat, lng: pickupLocation.lng } : null)
                                        : (dropoffLocation ? { lat: dropoffLocation.lat, lng: dropoffLocation.lng } : null)
                                }
                                currentLocationData={
                                    activeLocation === 'pickup' ? pickupLocation : dropoffLocation
                                }
                                otherLocation={
                                    activeLocation === 'pickup' ? dropoffLocation : pickupLocation
                                }
                                locationType={activeLocation}
                            />
                        </Col>
                    </Row>
                </section>

                {/* ITEMS SECTION TEMPORARILY DISABLED: item details will be collected by survey staff after onsite survey */}

                <div className="next-button">
                    <Button
                        type="primary"
                        size="large"
                        onClick={handleNext}
                        loading={isSubmitting}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Đang xử lý...' : 'Tiếp theo'}
                    </Button>
                </div>

            </Content>

            <AppFooter />
        </Layout>
    );
};

export default React.memo(MovingInformationPage);
