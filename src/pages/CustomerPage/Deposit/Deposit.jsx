import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Steps, Card, Row, Col, Select, Checkbox, Button, Progress, message, Spin } from "antd";
import { ClockIcon, MapPinIcon, FileText } from "lucide-react";
import dayjs from 'dayjs';

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import { createOrder, updateTicketStatus } from "../../../services/orderService";
import useUser from "../../../contexts/UserContext";

import "./style.css";

const { Content } = Layout;
const { Option } = Select;

const Deposit = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useUser();

    // Get data from previous steps or from localStorage
    const [orderData, setOrderData] = useState(location.state?.orderData || null);
    const [surveyData, setSurveyData] = useState(location.state?.surveyData || null);
    const [ticketId, setTicketId] = useState(location.state?.ticketId || null);
    const [depositAmount] = useState(location.state?.depositAmount || 100000);

    const [paymentMethod, setPaymentMethod] = useState(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if data exists and user is authenticated
    useEffect(() => {
        // Check authentication first
        if (!isAuthenticated) {
            message.error('Vui lòng đăng nhập để tiếp tục');
            navigate('/login', { state: { returnUrl: '/customer/deposit' } });
            return;
        }

        // Try to load pending order from localStorage if no data in state
        if (!orderData || !surveyData) {
            const pendingOrderStr = localStorage.getItem('pendingOrder');

            if (pendingOrderStr) {
                try {
                    const pendingOrder = JSON.parse(pendingOrderStr);

                    // Check if order is not too old (e.g., within 1 hour)
                    const timestamp = pendingOrder.timestamp;
                    const now = new Date().getTime();
                    const oneHour = 60 * 60 * 1000;

                    if (now - timestamp > oneHour) {
                        localStorage.removeItem('pendingOrder');
                        message.error('Phiên làm việc đã hết hạn. Vui lòng tạo yêu cầu mới.');
                        navigate('/customer/create-moving-order');
                        return;
                    }

                    // Load the pending order data
                    setOrderData(pendingOrder.orderData);
                    setSurveyData(pendingOrder.surveyData);
                    if (pendingOrder.ticketId) setTicketId(pendingOrder.ticketId);

                    message.success('Đã tải lại thông tin đơn hàng của bạn');

                    // Clear from localStorage after loading
                    localStorage.removeItem('pendingOrder');

                } catch (error) {
                    console.error('Error loading pending order:', error);
                    localStorage.removeItem('pendingOrder');
                    message.error('Không tìm thấy thông tin đơn hàng. Vui lòng bắt đầu lại.');
                    navigate('/customer/create-moving-order');
                }
            } else {
                message.error('Không tìm thấy thông tin đơn hàng. Vui lòng bắt đầu lại.');
                navigate('/customer/create-moving-order');
            }
        }
    }, [orderData, surveyData, navigate, isAuthenticated]);

    const handleSubmit = async () => {
        if (!paymentMethod || !agreedToTerms || !orderData || !surveyData) {
            return;
        }

        // Double check authentication before submitting
        if (!isAuthenticated) {
            message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            navigate('/login', { state: { returnUrl: '/customer/deposit' } });
            return;
        }

        try {
            setIsSubmitting(true);

            console.log('📤 Submitting deposit for ticket:', ticketId);

            if (!ticketId) {
                message.error('Không tìm thấy mã đơn hàng hợp lệ.');
                setIsSubmitting(false);
                return;
            }

            // Transition ticket to WAITING_SURVEY now that payment has been accepted
            try {
                await updateTicketStatus(ticketId, 'WAITING_SURVEY');
            } catch (statusError) {
                // Non-blocking: don't prevent navigation if status update fails
                console.warn('Could not transition ticket to WAITING_SURVEY:', statusError);
                message.error('Lỗi khi cập nhật trạng thái đơn hàng.');
                setIsSubmitting(false);
                return;
            }

            console.log('✅ Order status updated successfully');
            message.success('Thanh toán phí khảo sát thành công! Yêu cầu của bạn đã được xác nhận.');

            // Clear any pending order data from localStorage
            localStorage.removeItem('pendingOrder');

            // Navigate to order success page or order list
            setTimeout(() => {
                navigate('/', {
                    state: {
                        newOrder: { _id: ticketId, ...orderData }, // Ensure basic order info is passed
                        message: 'Yêu cầu của bạn đã được xác nhận. Chúng tôi sẽ liên hệ sớm!'
                    }
                });
            }, 1500);

        } catch (error) {
            console.error('❌ Error creating order:', error);

            // Check if it's an authentication error
            if (error.response?.status === 401) {
                message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                // Save current order data before redirecting
                const tempOrderData = {
                    orderData,
                    surveyData,
                    depositAmount,
                    ticketId,
                    timestamp: new Date().getTime()
                };
                localStorage.setItem('pendingOrder', JSON.stringify(tempOrderData));
                navigate('/login', { state: { returnUrl: '/customer/deposit' } });
                return;
            }

            const errorMessage = error.message || error.error || 'Có lỗi xảy ra khi tạo yêu cầu. Vui lòng thử lại.';
            message.error(errorMessage);

        } finally {
            setIsSubmitting(false);
        }
    };

    if (!orderData || !surveyData) {
        return (
            <Layout>
                <AppHeader />
                <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Spin size="large" />
                </Content>
                <AppFooter />
            </Layout>
        );
    }

    // Format data for display
    const displayData = {
        orderId: ticketId ? ticketId.slice(-6).toUpperCase() : "Chưa có",
        serviceType: orderData.serviceName || 'Chuyển nhà trọn gói',
        surveyMethod: surveyData.type === 'ONLINE' ? 'Online (Video Call)' : 'Offline (Khảo sát trực tiếp)',
        status: "Chờ đặt cọc",
        progress: 15,
        surveyDateTime: dayjs(surveyData.date).format('HH:mm - DD/MM/YYYY'),
        movingDateTime: dayjs(orderData.movingDate).format('HH:mm - DD/MM/YYYY'),
        fromAddress: orderData.pickupLocation?.address || '',
        toAddress: orderData.dropoffLocation?.address || '',
        depositAmount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(depositAmount || 100000)
    };

    return (
        <Layout className="deposit-page">
            <AppHeader />

            <Content>
                {/* HERO */}
                <section className="deposit-hero">
                    <h1>Thanh toán phí khảo sát</h1>
                </section>

                {/* STEPS */}
                <section className="service-steps-container">
                    <Card className="steps-card">
                        <Steps
                            current={4}
                            responsive
                            items={[
                                { title: 'Chọn dịch vụ' },
                                { title: 'Địa điểm & Thông tin đồ đạc' },
                                { title: 'Xác nhận' },
                                { title: 'Thỏa thuận' },
                                { title: 'Thanh toán' }
                            ]}
                        />
                    </Card>
                </section>

                <section className="deposit-section">
                    <h1 className="deposit-title">Thanh Toán Phí Khảo Sát</h1>

                    <Row gutter={40}>
                        {/* LEFT SIDE - Order Info & Payment */}
                        <Col md={14} xs={24}>
                            {/* Order Information Card */}
                            <Card className="order-info-card">
                                <div className="order-header">
                                    <h3># {displayData.orderId}</h3>
                                </div>

                                <div className="order-details">
                                    <div className="detail-row">
                                        <span className="label">Loại dịch vụ:</span>
                                        <span className="value">{displayData.serviceType}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Hình thức khảo sát:</span>
                                        <span className="value">{displayData.surveyMethod}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Trạng thái:</span>
                                        <span className="status-badge pending">
                                            <span className="status-dot"></span>
                                            {displayData.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="progress-section">
                                    <Progress percent={displayData.progress} strokeColor="#5f7d67" />
                                </div>
                            </Card>

                            {/* Schedule & Location Card */}
                            <Card className="schedule-card">
                                <div className="schedule-item">
                                    <ClockIcon size={20} />
                                    <div>
                                        <div><strong>Khảo sát:</strong> {displayData.surveyDateTime}</div>
                                        <div><strong>Vận chuyển:</strong> {displayData.movingDateTime}</div>
                                    </div>
                                </div>
                                <div className="location-item">
                                    <MapPinIcon size={20} />
                                    <span><strong>Chuyển từ:</strong> {displayData.fromAddress}</span>
                                </div>
                                <div className="location-item">
                                    <MapPinIcon size={20} />
                                    <span><strong>Chuyển đến:</strong> {displayData.toAddress}</span>
                                </div>
                            </Card>

                            {/* Payment Section */}
                            <div className="payment-section">
                                <h2>Thanh toán</h2>

                                <Select
                                    placeholder="Chọn phương thức thanh toán"
                                    className="payment-select"
                                    size="large"
                                    value={paymentMethod}
                                    onChange={(value) => setPaymentMethod(value)}
                                >
                                    <Option value="bank_transfer">Chuyển khoản ngân hàng</Option>
                                    <Option value="momo">Ví MoMo</Option>
                                    <Option value="vnpay">VNPay</Option>
                                    <Option value="zalopay">ZaloPay</Option>
                                </Select>

                                <div className="terms-checkbox">
                                    <Checkbox
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    >
                                        Bằng cách nhấp vào <strong>"Thanh toán"</strong>, tôi đã đọc và đồng ý với các điều khoản của thỏa thuận dịch vụ khảo sát
                                    </Checkbox>
                                </div>

                                <Button
                                    type="primary"
                                    size="large"
                                    className={`submit-payment-button ${!paymentMethod || !agreedToTerms ? 'disabled' : ''}`}
                                    onClick={handleSubmit}
                                    disabled={!paymentMethod || !agreedToTerms || isSubmitting}
                                    loading={isSubmitting}
                                >
                                    {isSubmitting ? 'Đang xử lý...' : 'Thanh toán'}
                                </Button>
                            </div>
                        </Col>

                        {/* RIGHT SIDE - Invoice */}
                        <Col md={10} xs={24}>
                            <div className="invoice-card">
                                <div className="invoice-header">
                                    <div className="invoice-logo">
                                        <img src="/images/logo (2).png" alt="HOMS Logo" className="logo-img" />
                                    </div>
                                    <div className="invoice-text">HOMS</div>
                                </div>

                                <div className="invoice-body">
                                    <div className="invoice-row">
                                        <span className="invoice-label">Mã đơn hàng</span>
                                        <span className="invoice-value">{displayData.orderId}</span>
                                    </div>
                                    <div className="invoice-row highlight">
                                        <span className="invoice-label">Phí khảo sát</span>
                                        <span className="invoice-value">{displayData.depositAmount}</span>
                                    </div>

                                    <div className="invoice-divider"></div>

                                    <div className="invoice-total">
                                        <div className="total-row">
                                            <span className="total-label">Tổng khoản tiền thanh toán</span>
                                            <FileText size={32} className="invoice-icon" />
                                        </div>
                                        <div className="total-amount">{displayData.depositAmount}</div>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </section>
            </Content>

            <AppFooter />
        </Layout>
    );
};

export default React.memo(Deposit);
