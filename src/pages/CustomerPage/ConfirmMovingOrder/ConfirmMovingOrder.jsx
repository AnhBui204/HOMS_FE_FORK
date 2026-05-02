import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Steps, Card, Row, Col, Button, Calendar, Checkbox, message, Modal, Alert, Tour, ConfigProvider } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import viVN from 'antd/locale/vi_VN';
import { Monitor, Users } from "lucide-react";
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import { useSelector } from "react-redux";
import { createOrder } from "../../../services/orderService";

import "./style.css";

dayjs.extend(isSameOrAfter);

const { Content } = Layout;

const ConfirmMovingOrder = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useSelector((state) => state.auth);

    // Get order data from previous step
    const orderData = location.state?.orderData;

    // Enforce Online method by default
    const [selectedMethod, setSelectedMethod] = useState('online');
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Tour Refs & State
    const refSurveyMethods = React.useRef(null);
    const refAlert = React.useRef(null);
    const refCalendar = React.useRef(null);
    const refConfirm = React.useRef(null);
    const [tourOpen, setTourOpen] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('hasSeenConfirmTour')) {
            setTimeout(() => setTourOpen(true), 800);
            localStorage.setItem('hasSeenConfirmTour', 'true');
        }
    }, []);

    const tourSteps = [
        {
            title: 'Hình Thức Khảo Sát',
            description: 'Mặc định HOMS sử dụng phương thức Khảo Sát Tự Động bằng Video Call để tiết kiệm thời gian cho bạn.',
            target: () => refSurveyMethods.current,
        },
        {
            title: 'Lưu Ý Quan Trọng Về Thời Gian',
            description: 'Lịch khảo sát BẮT BUỘC phải TRƯỚC ngày chuyển nhà ít nhất 24 giờ. Hãy lưu ý chọn thời gian hợp lệ nhé!',
            target: () => refAlert.current,
        },
        {
            title: 'Khung Giờ Khảo Sát',
            description: 'Chọn ngày và khung giờ bạn rảnh để chuyên viên HOMS có thể gọi Video Call đánh giá đồ đạc.',
            target: () => refCalendar.current,
        },
        {
            title: 'Đồng Ý & Xác Nhận',
            description: 'Đánh dấu tick xác nhận và nhấn Gửi yêu cầu để chuyển sang bước thanh toán.',
            target: () => refConfirm.current,
        },
    ];

    // Check if orderData exists
    useEffect(() => {
        if (!orderData) {
            message.error('Không tìm thấy thông tin đơn hàng. Vui lòng bắt đầu lại.');
            navigate('/customer/create-moving-order');
            return;
        }

        // Validate moving date is valid and in the future
        if (!orderData.movingDate) {
            message.error('Thông tin thời gian chuyển không hợp lệ. Vui lòng quay lại bước trước.');
            navigate('/customer/create-moving-order');
            return;
        }

        const movingDate = dayjs(orderData.movingDate);
        const now = dayjs();

        if (movingDate.isBefore(now)) {
            message.error('Thời gian chuyển đã qua. Vui lòng chọn lại thời gian chuyển.');
            navigate('/customer/create-moving-order');
            return;
        }

        // Check if there's enough time for survey
        const hoursUntilMoving = movingDate.diff(now, 'hour', true);
        if (hoursUntilMoving < 24) {
            message.warning('Thời gian chuyển nhà quá sát. Lịch khảo sát phải cách thời điểm chuyển tối thiểu 1 ngày.');
        }
    }, [orderData, navigate]);

    const timeSlots = [
        '09:00', '10:30', '12:00', '14:00',
        '15:30', '17:00', '18:30', '20:00'
    ];

    const handleCancel = () => {
        navigate('/');
    };

    const handleConfirm = async () => {
        if (!orderData) return;

        // Validate all selections are made
        if (!selectedMethod) {
            message.error('Vui lòng chọn hình thức khảo sát');
            return;
        }

        if (!selectedDate) {
            message.error('Vui lòng chọn ngày khảo sát');
            return;
        }

        if (selectedTimeIndex === null) {
            message.error('Vui lòng chọn giờ khảo sát');
            return;
        }

        // Prepare survey date/time
        const surveyDateTime = dayjs(selectedDate)
            .hour(parseInt(timeSlots[selectedTimeIndex].split(':')[0]))
            .minute(parseInt(timeSlots[selectedTimeIndex].split(':')[1]))
            .second(0)
            .millisecond(0);

        const now = dayjs();
        const movingDate = dayjs(orderData.movingDate);

        // Validate survey date is in the future
        if (surveyDateTime.isBefore(now)) {
            message.error('Thời gian khảo sát phải sau thời điểm hiện tại');
            return;
        }

        // Check if survey date is at least 1 hour from now
        const hoursUntilSurvey = surveyDateTime.diff(now, 'hour', true);
        if (hoursUntilSurvey < 1) {
            message.error('Thời gian khảo sát phải cách thời điểm hiện tại ít nhất 1 giờ');
            return;
        }

        // Validate survey datetime is strictly before moving datetime
        if (surveyDateTime.isSameOrAfter(movingDate)) {
            message.error('Thời gian khảo sát phải trước thời gian chuyển nhà');
            return;
        }

        // Calculate time gap between survey and moving
        const hoursBetween = movingDate.diff(surveyDateTime, 'hour', true);

        // Enforce minimum 24 hours gap for paperwork
        if (hoursBetween < 24) {
            message.error('Thời gian khảo sát bắt buộc phải trước thời gian chuyển nhà ít nhất 1 ngày (24 giờ) để nhân viên sắp xếp và chuẩn bị phương tiện');
            return;
        }

        // Prepare survey data
        const surveyData = {
            type: selectedMethod.toUpperCase(), // 'ONLINE' or 'OFFLINE'
            date: surveyDateTime.toISOString(),
            timeSlot: timeSlots[selectedTimeIndex]
        };

        // CHECK AUTHENTICATION - if not logged in, show modal and save data
        if (!isAuthenticated) {
            console.log('🔒 User not authenticated, prompting login...');

            // Save order data and survey data to localStorage temporarily
            const tempOrderData = {
                orderData,
                surveyData,
                depositAmount: 100000,
                timestamp: new Date().getTime()
            };

            localStorage.setItem('pendingOrder', JSON.stringify(tempOrderData));

            // Show authentication modal
            setShowAuthModal(true);
            return;
        }

        console.log('📋 User authenticated, creating order...');

        try {
            // First, create complete order with survey type/date but default 'CREATED' status
            const completeOrderData = {
                ...orderData,
                survey: surveyData,
            };

            const response = await createOrder(completeOrderData);
            const ticketId = response.data?._id;

            if (!ticketId) {
                message.error('Không thể tạo đơn hàng. Vui lòng thử lại.');
                return;
            }

            console.log('✅ Temporary order created successfully with ID:', ticketId);
            
            // Clear cached form data from MovingInformationPage
            sessionStorage.removeItem('homs_activeLocation');
            sessionStorage.removeItem('homs_pickupDescription');
            sessionStorage.removeItem('homs_dropoffDescription');
            sessionStorage.removeItem('homs_pickupLocation');
            sessionStorage.removeItem('homs_dropoffLocation');
            sessionStorage.removeItem('homs_movingDate');

            message.success('Đã tạo thành công yêu cầu sơ bộ! Vui lòng xác nhận thỏa thuận để tiếp tục.');

            // Navigate to survey agreement page with ticket data
            navigate('/customer/survey-agreement', {
                state: {
                    orderData,
                    surveyData,
                    depositAmount: 100000, // 100,000 VND
                    ticketId
                }
            });
        } catch (error) {
            console.error('❌ Error creating initial order:', error);
            message.error(error.message || 'Có lỗi xảy ra khi tạo yêu cầu. Vui lòng thử lại.');
        }
    };

    const onDateSelect = (date) => {
        setSelectedDate(date);
        // Reset time selection when date changes
        setSelectedTimeIndex(null);
    };

    // Disable past dates and dates after moving date
    const disabledDate = (current) => {
        if (!current || !orderData || !orderData.movingDate) return false;

        const today = dayjs().startOf('day');
        const movingDate = dayjs(orderData.movingDate);

        // Disable if date is in the past
        if (current.isBefore(today, 'day')) {
            return true;
        }

        // Disable if date is on or after moving date
        if (current.isSameOrAfter(movingDate, 'day')) {
            return true;
        }

        return false;
    };

    // Check if a time slot should be disabled based on current time
    const isTimeSlotDisabled = (timeSlot) => {
        if (!selectedDate || !orderData || !orderData.movingDate) return false;

        const now = dayjs();
        const selectedDay = dayjs(selectedDate);
        const movingDate = dayjs(orderData.movingDate);
        const [hours, minutes] = timeSlot.split(':').map(Number);
        const slotTime = selectedDay.hour(hours).minute(minutes);

        // Disable if slot time is in the past
        if (slotTime.isBefore(now)) {
            return true;
        }

        // Disable if slot time is within next hour from now
        if (slotTime.diff(now, 'minute') < 60) {
            return true;
        }

        // Disable if slot time is less than 24 hours before moving time
        const hoursBetween = movingDate.diff(slotTime, 'hour', true);
        if (hoursBetween < 24) {
            return true;
        }

        return false;
    };

    if (!orderData) {
        return null; // Will redirect in useEffect
    }

    return (
        <Layout className="confirm-order-page">
            <AppHeader />

            <Content>
                {/* HERO */}
                <section className="confirm-hero" style={{ position: 'relative' }}>
                    <h1>{orderData?.serviceName || 'Chuyển Nhà Trọn Gói'}</h1>
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
                <section className="service-steps-container">
                    <Card className="steps-card">
                        <Steps
                            current={2}
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

                {/* CONFIRMATION SECTION */}
                <section className="confirmation-section">
                    <h1 className="confirmation-title">Xác Nhận Để Chúng Tôi Báo Giá Chính Xác Nhất</h1>
                    <p className="confirmation-subtitle">Chọn hình thức khảo sát</p>

                    <Row gutter={40} className="survey-methods">
                        {/* ONLINE METHOD */}
                        <Col md={12} xs={24} ref={refSurveyMethods}>
                            <div
                                className={`survey-card ${selectedMethod === 'online' ? 'active' : ''}`}
                                onClick={() => setSelectedMethod('online')}
                            >
                                <div className="survey-icon">
                                    <Monitor size={70} />
                                </div>
                                <h3>Online (Video Call)</h3>
                                <p>Khảo sát từ xa qua cuộc gọi video, thủ tục tinh gọn, phù hợp với hầu hết các đơn chuyển nhà hiện tại của HOMS.</p>
                            </div>
                        </Col>

                        {/* EXPLANATION ALERT */}
                        <Col md={12} xs={24} style={{ display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center' }}>
                            <Alert
                                message="Ưu Tiên Khảo Sát Trực Tuyến"
                                description="HOMS hiện đang áp dụng chính sách khảo sát trực tuyến (Online) 100% nhằm rút ngắn tối đa thời gian chờ đợi báo giá. Nếu thực tế phức tạp, chuyên viên sẽ tự chủ động đề xuất lịch Offline."
                                type="info"
                                showIcon
                                className="survey-info-alert"
                            />
                            <div ref={refAlert}>
                                <Alert
                                    message="Quý khách lưu ý"
                                    description="Lịch khảo sát bắt buộc phải được thực hiện trước thời gian chuyển nhà ít nhất 1 ngày (24 giờ) để chúng tôi có thể chốt phương án vận chuyển và sắp xếp nhân sự, xe tải phù hợp nhất."
                                    type="warning"
                                    showIcon
                                    className="survey-warning-alert"
                                />
                            </div>
                        </Col>
                    </Row>

                    {/* CALENDAR AND TIME SLOTS - SHOWN BELOW CARDS */}
                    <div className="survey-details-container" ref={refCalendar}>
                        <div className="survey-details">
                            <Calendar
                                fullscreen={false}
                                onSelect={onDateSelect}
                                {...(selectedDate && { value: selectedDate })}
                                disabledDate={disabledDate}
                            />

                            <div className="time-slots">
                                {timeSlots.map((time, index) => {
                                    const isDisabled = isTimeSlotDisabled(time);
                                    return (
                                        <div
                                            key={index}
                                            className={`time-slot ${selectedTimeIndex === index ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                            onClick={() => !isDisabled && setSelectedTimeIndex(index)}
                                            style={{
                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                opacity: isDisabled ? 0.5 : 1
                                            }}
                                        >
                                            {time}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Show time gap information when both date and time are selected */}
                            {selectedDate && selectedTimeIndex !== null && orderData?.movingDate && (
                                <div className="time-gap-info">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '500' }}>Thời gian giữa khảo sát và chuyển nhà:</span>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: '#2d4f36',
                                            fontSize: '14px'
                                        }}>
                                            {(() => {
                                                const surveyDateTime = dayjs(selectedDate)
                                                    .hour(parseInt(timeSlots[selectedTimeIndex].split(':')[0]))
                                                    .minute(parseInt(timeSlots[selectedTimeIndex].split(':')[1]));
                                                const movingDate = dayjs(orderData.movingDate);
                                                const hoursBetween = movingDate.diff(surveyDateTime, 'hour', true);
                                                const days = Math.floor(hoursBetween / 24);
                                                const hours = Math.floor(hoursBetween % 24);

                                                if (days > 0) {
                                                    return `${days} ngày ${hours} giờ`;
                                                }
                                                return `${hours} giờ`;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div ref={refConfirm}>
                        <div className="confirmation-info">
                            <Checkbox
                                checked={isConfirmed}
                                onChange={(e) => setIsConfirmed(e.target.checked)}
                                disabled={!selectedMethod || !selectedDate || selectedTimeIndex === null}
                            >
                                Tôi xác nhận thông tin là chính xác
                            </Checkbox>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="action-buttons">
                            <Button size="large" className="cancel-button" onClick={handleCancel}>
                                Hủy bỏ
                            </Button>
                            <Button
                                type="primary"
                                size="large"
                                className={`confirm-button ${!isConfirmed || !selectedMethod || !selectedDate || selectedTimeIndex === null ? 'disabled' : ''}`}
                                onClick={handleConfirm}
                                disabled={!isConfirmed || !selectedMethod || !selectedDate || selectedTimeIndex === null}
                            >
                                Xác nhận & Gửi yêu cầu
                            </Button>
                        </div>
                    </div>
                </section>
            </Content>

            <ConfigProvider locale={viVN}>
                <Tour open={tourOpen} onClose={() => setTourOpen(false)} steps={tourSteps} />
            </ConfigProvider>

            <AppFooter />

            {/* Authentication Required Modal */}
            <Modal
                open={showAuthModal}
                onCancel={() => setShowAuthModal(false)}
                footer={null}
                centered
                width={500}
                closable={true}
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: '#fff4e6',
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px'
                    }}>
                        🔒
                    </div>

                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#44624A',
                        marginBottom: '12px'
                    }}>
                        Cần Đăng Nhập
                    </h2>

                    <p style={{
                        fontSize: '16px',
                        color: '#666',
                        marginBottom: '24px',
                        lineHeight: '1.6'
                    }}>
                        Để tiếp tục đặt cọc và hoàn tất yêu cầu dịch vụ, vui lòng đăng nhập hoặc tạo tài khoản.
                        <br />
                        <span style={{ fontSize: '14px', color: '#999' }}>
                            Thông tin đơn hàng của bạn đã được lưu tạm thời.
                        </span>
                    </p>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <Button
                            size="large"
                            onClick={() => {
                                setShowAuthModal(false);
                                navigate('/login', {
                                    state: { returnUrl: '/customer/survey-agreement' }
                                });
                            }}
                            style={{
                                backgroundColor: '#44624A',
                                color: 'white',
                                borderColor: '#44624A',
                                minWidth: '140px',
                                height: '45px',
                                fontSize: '16px',
                                fontWeight: '500'
                            }}
                        >
                            Đăng Nhập
                        </Button>

                        <Button
                            size="large"
                            onClick={() => {
                                setShowAuthModal(false);
                                navigate('/register', {
                                    state: { returnUrl: '/customer/survey-agreement' }
                                });
                            }}
                            style={{
                                backgroundColor: 'white',
                                color: '#44624A',
                                borderColor: '#44624A',
                                minWidth: '140px',
                                height: '45px',
                                fontSize: '16px',
                                fontWeight: '500'
                            }}
                        >
                            Đăng Ký
                        </Button>
                    </div>
                </div>
            </Modal>
        </Layout>
    );
};

export default React.memo(ConfirmMovingOrder);
