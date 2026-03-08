import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Card, Button, message, Spin, Checkbox, Typography } from 'antd';
import AppHeader from '../../../components/header/header';
import AppFooter from '../../../components/footer/footer';
import api from '../../../services/api';

const { Content } = Layout;
const { Title, Text } = Typography;

const SignContract = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [agreed, setAgreed] = useState(false);
    const [signing, setSigning] = useState(false);
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get(`/customer/contracts/ticket/${ticketId}`);
                if (response.data?.success) {
                    setContract(response.data.data);
                } else {
                    message.error('Không thể lấy thông tin hợp đồng.');
                }
            } catch (error) {
                console.error(error);
                message.error('Lỗi khi lấy thông tin hợp đồng: ' + (error.response?.data?.message || ''));
            }

            // Also fetch invoice to check payment status
            try {
                const invRes = await api.get(`/invoices/ticket/${ticketId}`);
                if (invRes.data?.success) setInvoice(invRes.data.data);
            } catch (_) {
                // Invoice may not exist yet — that's fine
            }

            setLoading(false);
        };

        if (ticketId) fetchData();
    }, [ticketId]);

    const handleSignContract = async () => {
        if (!agreed) {
            message.warning('Vui lòng đọc và đồng ý với các điều khoản.');
            return;
        }

        setSigning(true);
        try {
            // Fake signature data since there is no actual canvas implemented for customer in this mock
            const payload = {
                signatureImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // transparent pixel
                ipAddress: '127.0.0.1'
            };

            await api.post(`/customer/contracts/${contract._id}/sign`, payload);
            message.success('Ký hợp đồng thành công! Đang chuyển hướng đến cổng thanh toán...');

            // Xử lý thanh toán cọc PayOS cho Invoice vừa được tạo
            try {
                const depositRes = await api.post(`/request-tickets/${ticketId}/deposit`);
                if (depositRes.data?.success && depositRes.data?.data?.checkoutUrl) {
                    window.location.href = depositRes.data.data.checkoutUrl;
                    return; // Stop execution to redirect securely
                } else {
                    message.warning('Không thể tạo link thanh toán, vui lòng thanh toán sau trong chi tiết đơn hàng.');
                    navigate('/customer/order');
                }
            } catch (err) {
                console.error("Lỗi tạo thanh toán cọc PayOS:", err);
                message.warning('Có lỗi xảy ra khi tạo thanh toán, vui lòng thanh toán cọc sau.');
                navigate('/customer/order');
            }

        } catch (error) {
            console.error(error);
            message.error('Ký hợp đồng thất bại: ' + (error.response?.data?.message || ''));
        } finally {
            setSigning(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <AppHeader />
                <Content className="sign-contract-loading">
                    <Spin size="large" />
                </Content>
                <AppFooter />
            </Layout>
        );
    }

    if (!contract) {
        return (
            <Layout>
                <AppHeader />
                <Content style={{ padding: '50px', textAlign: 'center' }}>
                    <Title level={3}>Không tìm thấy hợp đồng.</Title>
                    <Button onClick={() => navigate('/customer/order')}>Quay lại</Button>
                </Content>
                <AppFooter />
            </Layout>
        );
    }

    return (
        <Layout className="sign-contract-page">
            <AppHeader />
            <Content style={{ padding: '40px 20px', backgroundColor: '#f5f5f5' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <Card
                        title={<Title level={3} style={{ color: '#2D4F36', margin: 0, textAlign: 'center' }}>Hợp Đồng Vận Chuyển</Title>}
                        bordered={false}
                        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    >
                        <div style={{ marginBottom: 20 }}>
                            <Text strong>Mã Hợp Đồng: </Text><Text>{contract.contractNumber}</Text>
                        </div>

                        <div
                            className="contract-content"
                            style={{
                                background: '#f9f9f9',
                                padding: '20px',
                                borderRadius: '8px',
                                border: '1px solid #eee',
                                minHeight: '300px',
                                maxHeight: '500px',
                                overflowY: 'auto',
                                marginBottom: '20px'
                            }}
                            dangerouslySetInnerHTML={{ __html: contract.content }}
                        />

                        {contract.status === 'DRAFT' || contract.status === 'SENT' ? (
                            <>
                                <div style={{ marginBottom: 20 }}>
                                    <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
                                        <Text strong>Tôi đã kiểm tra thông tin và đồng ý ký vào Hợp Đồng này.</Text>
                                    </Checkbox>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        onClick={handleSignContract}
                                        loading={signing}
                                        disabled={!agreed}
                                        style={{ background: '#52c41a', borderColor: '#52c41a', width: '200px' }}
                                    >
                                        CHẤP NHẬN & KÝ
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ padding: '20px', background: '#e6f7ff', borderRadius: '8px', marginBottom: 16 }}>
                                    <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>Hợp đồng này đã được ký.</Text>
                                </div>
                                {/* If invoice still unpaid, show retry payment button */}
                                {(!invoice || invoice.paymentStatus === 'UNPAID') && (
                                    <Button
                                        type="primary"
                                        size="large"
                                        loading={paying}
                                        style={{ background: '#d9363e', borderColor: '#d9363e', width: '240px' }}
                                        onClick={async () => {
                                            setPaying(true);
                                            try {
                                                const depositRes = await api.post(`/request-tickets/${ticketId}/deposit`);
                                                if (depositRes.data?.success && depositRes.data?.data?.checkoutUrl) {
                                                    window.location.href = depositRes.data.data.checkoutUrl;
                                                } else {
                                                    message.warning('Không thể tạo link thanh toán, vui lòng thử lại sau.');
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                message.error('Lỗi thanh toán: ' + (err.response?.data?.message || err.message));
                                            } finally {
                                                setPaying(false);
                                            }
                                        }}
                                    >
                                        Thanh toán cọc 50%
                                    </Button>
                                )}
                            </div>
                        )}
                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <Button type="link" onClick={() => navigate('/customer/order')}>
                                Quay lại danh sách đơn hàng
                            </Button>
                        </div>
                    </Card>
                </div>
            </Content>
            <AppFooter />
        </Layout>
    );
};

export default SignContract;
