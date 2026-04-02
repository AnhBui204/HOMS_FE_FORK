import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Skeleton, Spin, message, Space, Button } from 'antd';
import {
    FileTextOutlined,
    CheckCircleOutlined,
    CarOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const DispatcherDashboard = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [data, setData] = useState({
        stats: {
            tickets: { total: 0, CREATED: 0, WAITING_SURVEY: 0 },
            invoices: { total: 0, CONFIRMED: 0, ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 0 }
        },
        recentTickets: [],
        recentInvoices: []
    });

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await api.get('/customer/dispatcher-stats');
            if (response.data && response.data.success) {
                setData(response.data.data);
            }
        } catch (error) {
            message.error('Lỗi khi tải dữ liệu thống kê');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const ticketColumns = [
        {
            title: 'Mã đơn',
            dataIndex: 'code',
            key: 'code',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Khách hàng',
            dataIndex: ['customerId', 'fullName'],
            key: 'customer'
        },
        {
            title: 'Điều phối viên',
            dataIndex: ['dispatcherId', 'fullName'],
            key: 'dispatcher',
            render: (name) => name || <Text type="secondary">Chưa gán</Text>
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => dayjs(date).format('HH:mm DD/MM/YYYY')
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'blue';
                let text = status;
                if (status === 'CREATED') {
                    color = 'cyan';
                    text = 'Vừa tạo';
                }
                if (status === 'WAITING_SURVEY') {
                    color = 'orange';
                    text = 'Chờ khảo sát';
                }
                if (status === 'SURVEYED') {
                    color = 'blue';
                    text = 'Đã khảo sát';
                }
                if (status === 'QUOTED') {
                    color = 'green';
                    text = 'Đã báo giá';
                }
                if (status === 'ACCEPTED') {
                    color = 'purple';
                    text = 'Đã chấp nhận báo giá';
                }
                if (status === 'CONVERTED') {
                    color = 'geekblue';
                    text = 'Đã tạo HĐ';
                }
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<MessageOutlined />}
                    onClick={() => navigate(`/dispatcher/video-chat?room=${record.code}`)}
                >
                    Chat & Video
                </Button>
            )
        }
    ];

    const invoiceColumns = [
        {
            title: 'Mã HĐ',
            dataIndex: 'code',
            key: 'code',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Khách hàng',
            dataIndex: ['customerId', 'fullName'],
            key: 'customer'
        },
        {
            title: 'Điều phối viên',
            render: (_, record) => record.requestTicketId?.dispatcherId?.fullName || <Text type="secondary">Chưa gán</Text>,
            key: 'dispatcher'
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'blue';
                let text = status;
                if (status === 'CONFIRMED') { color = 'processing'; text = 'Đã xác nhận'; }
                if (status === 'ASSIGNED') { color = 'warning'; text = 'Đã điều phối'; }
                if (status === 'ACCEPTED') { color = 'cyan'; text = 'Tài xế đã nhận'; }
                if (status === 'IN_PROGRESS') { color = 'purple'; text = 'Đang thực hiện'; }
                if (status === 'COMPLETED') { color = 'success'; text = 'Đã hoàn tất'; }
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<MessageOutlined />}
                    onClick={() => navigate(`/dispatcher/video-chat?room=${record.code}`)}
                >
                    Chat & Video
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2}>Bảng Điều Khiển Hệ Thống</Title>
                <Button icon={<ReloadOutlined />} onClick={fetchStats} loading={loading}>Làm mới</Button>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="stat-card" style={{ borderLeft: '4px solid #1890ff' }}>
                        <Skeleton loading={loading} active paragraph={{ rows: 1 }} title={false}>
                            <Statistic
                                title="Đơn hàng mới"
                                value={data.stats.tickets.CREATED}
                                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                                suffix={`/ ${data.stats.tickets.total}`}
                            />
                        </Skeleton>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="stat-card" style={{ borderLeft: '4px solid #faad14' }}>
                        <Skeleton loading={loading} active paragraph={{ rows: 1 }} title={false}>
                            <Statistic
                                title="Chờ khảo sát"
                                value={data.stats.tickets.WAITING_SURVEY}
                                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                            />
                        </Skeleton>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="stat-card" style={{ borderLeft: '4px solid #722ed1' }}>
                        <Skeleton loading={loading} active paragraph={{ rows: 1 }} title={false}>
                            <Statistic
                                title="Chờ điều phối"
                                value={data.stats.invoices.CONFIRMED}
                                prefix={<CarOutlined style={{ color: '#722ed1' }} />}
                            />
                        </Skeleton>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="stat-card" style={{ borderLeft: '4px solid #52c41a' }}>
                        <Skeleton loading={loading} active paragraph={{ rows: 1 }} title={false}>
                            <Statistic
                                title="Đã hoàn thành"
                                value={data.stats.invoices.COMPLETED}
                                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            />
                        </Skeleton>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Yêu cầu khảo sát mới nhất" bordered={false}>
                        {loading ? <Skeleton active paragraph={{ rows: 5 }} title={false} /> : (
                            <Table
                                dataSource={data.recentTickets}
                                columns={ticketColumns}
                                pagination={false}
                                rowKey="_id"
                                size="small"
                            />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Hóa đơn & Vận chuyển gần đây" bordered={false}>
                        {loading ? <Skeleton active paragraph={{ rows: 5 }} title={false} /> : (
                            <Table
                                dataSource={data.recentInvoices}
                                columns={invoiceColumns}
                                pagination={false}
                                rowKey="_id"
                                size="small"
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            <style jsx>{`
                .stat-card {
                    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                    border-radius: 8px;
                    transition: all 0.3s;
                }
                .stat-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
};

export default DispatcherDashboard;
