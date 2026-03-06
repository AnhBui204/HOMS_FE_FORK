import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Steps, Card, Row, Col, Button, Checkbox, message, Spin } from 'antd';
import dayjs from 'dayjs';

import AppHeader from '../../../components/header/header';
import AppFooter from '../../../components/footer/footer';
import useUser from '../../../contexts/UserContext';

import './style.css';

const { Content } = Layout;

const MovingRequestContract = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useUser();

    const [orderData, setOrderData] = useState(location.state?.orderData || null);
    const [surveyData, setSurveyData] = useState(location.state?.surveyData || null);
    const [depositAmount] = useState(location.state?.depositAmount || 100000);
    const [agreedToContract, setAgreedToContract] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            if (orderData && surveyData) {
                localStorage.setItem('pendingOrder', JSON.stringify({
                    orderData,
                    surveyData,
                    depositAmount,
                    timestamp: new Date().getTime()
                }));
            }
            message.error('Vui lòng đăng nhập để tiếp tục');
            navigate('/login', { state: { returnUrl: '/customer/moving-request-contract' } });
            return;
        }

        if (!orderData || !surveyData) {
            const pendingOrderStr = localStorage.getItem('pendingOrder');
            if (!pendingOrderStr) {
                message.error('Không tìm thấy thông tin yêu cầu chuyển nhà. Vui lòng bắt đầu lại.');
                navigate('/customer/create-moving-order');
                return;
            }

            try {
                const pendingOrder = JSON.parse(pendingOrderStr);
                setOrderData(pendingOrder.orderData || null);
                setSurveyData(pendingOrder.surveyData || null);
            } catch (error) {
                console.error('Error parsing pending order:', error);
                localStorage.removeItem('pendingOrder');
                message.error('Thông tin yêu cầu không hợp lệ. Vui lòng tạo lại yêu cầu.');
                navigate('/customer/create-moving-order');
            }
        }
    }, [depositAmount, isAuthenticated, navigate, orderData, surveyData]);

    const contractNumber = useMemo(() => {
        const now = dayjs();
        return `HOMS-${now.format('YYYY')}-${now.format('MMDDHHmm')}`;
    }, []);

    const surveyDateText = useMemo(() => {
        if (!surveyData?.date) return '--';
        return dayjs(surveyData.date).format('HH:mm - DD/MM/YYYY');
    }, [surveyData]);

    const movingDateText = useMemo(() => {
        if (!orderData?.movingDate) return '--';
        return dayjs(orderData.movingDate).format('HH:mm - DD/MM/YYYY');
    }, [orderData]);

    const handleBack = () => {
        navigate('/customer/confirm-order', { state: { orderData } });
    };

    const handleContinue = () => {
        if (!agreedToContract) {
            message.error('Vui lòng xác nhận đồng ý nội dung hợp đồng trước khi tiếp tục.');
            return;
        }

        navigate('/customer/deposit', {
            state: {
                orderData,
                surveyData,
                depositAmount
            }
        });
    };

    if (!orderData || !surveyData) {
        return (
            <Layout>
                <AppHeader />
                <Content className="contract-loading">
                    <Spin size="large" />
                </Content>
                <AppFooter />
            </Layout>
        );
    }

    return (
        <Layout className="moving-contract-page">
            <AppHeader />

            <Content>
                <section className="moving-contract-hero">
                    <h1>{orderData?.serviceName || 'Chuyển Nhà Trọn Gói'}</h1>
                </section>

                <section className="service-steps-container">
                    <Card className="steps-card">
                        <Steps
                            current={3}
                            responsive
                            items={[
                                { title: 'Chọn dịch vụ' },
                                { title: 'Địa điểm & Thông tin đồ đạc' },
                                { title: 'Xác nhận' },
                                { title: 'Hợp đồng' },
                                { title: 'Đặt cọc' }
                            ]}
                        />
                    </Card>
                </section>

                <section className="moving-contract-section">
                    <h2>Hợp Đồng Yêu Cầu Chuyển Nhà</h2>

                    <Card className="moving-contract-card">
                        <div className="contract-header">
                            <div>
                                <p><strong>Số hợp đồng:</strong> {contractNumber}</p>
                                <p><strong>Ngày lập:</strong> {dayjs().format('DD/MM/YYYY')}</p>
                            </div>
                            <div className="contract-status">Đang chờ thanh toán phí khảo sát</div>
                        </div>

                        <Row gutter={[24, 16]}>
                            <Col md={12} xs={24}>
                                <div className="contract-block">
                                    <h3>Thông tin khảo sát</h3>
                                    <p><strong>Hình thức:</strong> {surveyData.type === 'ONLINE' ? 'Online (Video Call)' : 'Offline (Khảo sát trực tiếp)'}</p>
                                    <p><strong>Thời gian khảo sát:</strong> {surveyDateText}</p>
                                    <p><strong>Thời gian chuyển:</strong> {movingDateText}</p>
                                </div>
                            </Col>

                            <Col md={12} xs={24}>
                                <div className="contract-block">
                                    <h3>Địa điểm</h3>
                                    <p><strong>Từ:</strong> {orderData.pickupLocation?.address || '--'}</p>
                                    <p><strong>Đến:</strong> {orderData.dropoffLocation?.address || '--'}</p>
                                </div>
                            </Col>
                        </Row>

                        <div className="contract-terms">
                            <h3>Điều khoản chính</h3>
                            <ul>
                                <li>HOMS tiếp nhận yêu cầu và thực hiện khảo sát theo lịch đã chọn.</li>
                                <li>Báo giá chính thức được gửi sau khi khảo sát hoàn tất.</li>
                                <li>Khách hàng thanh toán đặt cọc khảo sát: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(depositAmount)}.</li>
                                <li>Thông tin chi tiết đơn chuyển được xác nhận khi hoàn tất đặt cọc.</li>
                            </ul>
                        </div>
                    </Card>

                    <div className="contract-confirm">
                        <Checkbox
                            checked={agreedToContract}
                            onChange={(event) => setAgreedToContract(event.target.checked)}
                        >
                            <span style={{ fontSize: '16px', color: '#2D4F36' }}>
                                Tôi đã đọc và đồng ý với nội dung hợp đồng yêu cầu chuyển nhà.
                            </span>
                        </Checkbox>
                    </div>

                    <div className="contract-actions">
                        <Button size="large" className="cancel-button" onClick={handleBack}>Quay lại</Button>
                        <Button
                            type="primary"
                            size="large"
                            className="confirm-button"
                            disabled={!agreedToContract}
                            onClick={handleContinue}
                        >
                            Tiếp tục
                        </Button>
                    </div>
                </section>
            </Content>

            <AppFooter />
        </Layout>
    );
};

export default React.memo(MovingRequestContract);
