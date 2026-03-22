import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Steps, Card, Row, Col, Input, Button, DatePicker, message, Alert, Tour, ConfigProvider } from "antd";
import { QuestionCircleOutlined, EnvironmentOutlined } from "@ant-design/icons";
import viVN from 'antd/locale/vi_VN';
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

    // Handle location changes from map
    const handleLocationChange = (locationData) => {
        if (activeLocation === 'pickup') {
            setPickupLocation(locationData);
        } else {
            setDropoffLocation(locationData);
        }
    };

    // Product Tour Setup
    const refSteps = React.useRef(null);
    const refLocationToggle = React.useRef(null);
    const refDatePicker = React.useRef(null);
    const refMap = React.useRef(null);
    const refNextBtn = React.useRef(null);
    const [tourOpen, setTourOpen] = useState(false);

    React.useEffect(() => {
        if (!localStorage.getItem('hasSeenBookingTour')) {
            setTimeout(() => setTourOpen(true), 800);
            localStorage.setItem('hasSeenBookingTour', 'true');
        }
    }, []);

    const tourSteps = [
        {
            title: 'Tiến độ Đặt Lịch',
            description: 'Các bước bạn cần thực hiện để hoàn thành việc đặt dịch vụ.',
            target: () => refSteps.current,
        },
        {
            title: 'Bản Đồ Trực Quan',
            description: 'Bạn có thể tìm kiếm và ghim trực tiếp địa điểm bằng bản đồ tương tác này.',
            target: () => refMap.current,
        },
        {
            title: 'Chuyển Đổi Địa Điểm',
            description: 'Nhấp vào đây để luân phiên nhập thông tin giữa "Nơi chuyển đi" và "Nơi chuyển đến".',
            target: () => refLocationToggle.current,
        },
        {
            title: 'Thời Gian Chuyển',
            description: 'Lựa chọn ngày và giờ cụ thể bạn muốn chúng tôi thực hiện dịch vụ.',
            target: () => refDatePicker.current,
        },
        {
            title: 'Hoàn Tất & Xem Ước Tính',
            description: 'Sau khi đã kiểm tra kỹ thông tin, hãy nhấn "Tiếp theo" để tiếp tục.',
            target: () => refNextBtn.current,
        },
    ];

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
                <section className="moving-hero" style={{ position: 'relative' }}>
                    <h1>{selectedService.title}</h1>
                    <Button 
                        type="primary" 
                        icon={<QuestionCircleOutlined />} 
                        onClick={() => setTourOpen(true)}
                        style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', borderColor: 'white', color: 'white' }}
                    >
                        Hướng dẫn đặt lịch
                    </Button>
                </section>

                {/* STEPS */}
                <section className="service-steps-container" ref={refSteps}>
                    <Card className="steps-card">
                        <Steps
                            current={1}
                            responsive
                            items={[
                                { title: 'Chọn dịch vụ' },
                                { title: 'Địa điểm & Thông tin đồ đạc' },
                                { title: 'Xác nhận' },
                                { title: 'Thỏa thuận' },
                                { title: 'Thanh toán' },
                            ]}
                        />
                    </Card>
                </section>

                {/* LOCATION SECTION */}
                <section className="moving-location">
                    <h1>Chúng Tôi Cần Biết Bạn Chuyển Từ Đâu Đến Đâu</h1>

                    <Row gutter={40}>
                        <Col md={10} xs={24}>
                            <Card className="location-card" bordered={false}>
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

                                    <div ref={refDatePicker} style={{ width: '100%', marginBottom: '15px' }}>
                                        <DatePicker
                                            placeholder="Chọn thời gian"
                                            onChange={(date) => setMovingDate(date)}
                                            showTime
                                            format="DD/MM/YYYY HH:mm"
                                            className="custom-input"
                                            style={{ width: '100%', marginBottom: 0 }}
                                            disabledDate={(current) => current && current.isBefore(dayjs().add(2, 'day').startOf('day'))}
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
                                    </div>

                                    <Alert
                                        message="Lưu ý đặt lịch"
                                        description="Để đảm bảo chất lượng phục vụ tốt nhất, thời gian chuyển nhà cần được đặt cách thời điểm hiện tại ít nhất 2 ngày. Lịch khảo sát bắt buộc phải diễn ra trước ngày chuyển nhà tối thiểu 1 ngày (24 giờ) để chúng tôi chuẩn bị phương tiện và nhân sự."
                                        type="info"
                                        showIcon
                                        style={{ marginBottom: '15px', borderRadius: '8px' }}
                                    />

                                    <TextArea
                                        rows={3}
                                        placeholder="Mô tả sơ bộ (tầng, thang máy, đường dẫn vào nơi chuyển...)"
                                        className="custom-input"
                                        value={activeLocation === 'pickup' ? pickupDescription : dropoffDescription}
                                        onChange={(e) => activeLocation === 'pickup'
                                            ? setPickupDescription(e.target.value)
                                            : setDropoffDescription(e.target.value)
                                        }
                                    />

                                    <div className="location-switch-group" ref={refLocationToggle}>
                                        <Button
                                            type={activeLocation === 'pickup' ? 'primary' : 'default'}
                                            onClick={() => setActiveLocation('pickup')}
                                            className={activeLocation === 'pickup' ? 'segment-btn active' : 'segment-btn'}
                                        >
                                            Nơi chuyển đi
                                        </Button>
                                        <Button
                                            type={activeLocation === 'dropoff' ? 'primary' : 'default'}
                                            onClick={() => setActiveLocation('dropoff')}
                                            className={activeLocation === 'dropoff' ? 'segment-btn active' : 'segment-btn'}
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
                            </Card>
                        </Col>

                        <Col md={14} xs={24}>
                            <div ref={refMap} style={{ height: '100%' }}>
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
                            </div>
                        </Col>
                    </Row>
                </section>

                {/* ITEMS SECTION TEMPORARILY DISABLED: item details will be collected by survey staff after onsite survey */}

                <div className="next-button" ref={refNextBtn}>
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

            <ConfigProvider locale={viVN}>
                <Tour open={tourOpen} onClose={() => setTourOpen(false)} steps={tourSteps} />
            </ConfigProvider>

            <AppFooter />
        </Layout>
    );
};

export default React.memo(MovingInformationPage);
