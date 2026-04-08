// sections/VisitRequests.js
import React, { useState, useEffect } from 'react';
import { List, Card, Tag, Typography, Spin, Empty, Avatar, Divider, message } from 'antd';
import { CalendarOutlined, UserOutlined, ClockCircleOutlined, MessageOutlined } from '@ant-design/icons';
import api from '../../../../services/api'; // Import instance axios của bạn
import { Link } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;


const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};


const getStatusTag = (status) => {
    switch (status) {
        case 'pending':
            return <Tag color="blue">Đang chờ</Tag>;
        case 'confirmed':
            return <Tag color="green">Đã xác nhận</Tag>;
        case 'rejected':
            return <Tag color="red">Đã từ chối</Tag>;
        default:
            return <Tag>{status}</Tag>;
    }
};

const VisitRequests = () => {
    const API_BASE = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/api$/, '')) || 'http://localhost:5000';
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);


    const fetchVisitRequests = async () => {
        setLoading(true);
        try {

            const response = await api.get('/visit-requests/customer');
            setRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch visit requests:', error);
            message.error(error.response?.data?.message || 'Lỗi khi tải lịch hẹn');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisitRequests();
    }, []);

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
    }

    if (requests.length === 0) {
        return <Empty description="Bạn chưa có lịch hẹn nào." />;
    }

    return (
        <div>
            <Title level={2}>Lịch hẹn của tôi</Title>
            <List
                grid={{
                    gutter: 16,
                    xs: 1,
                    sm: 1,
                    md: 2,
                    lg: 2,
                    xl: 3,
                    xxl: 3,
                }}
                dataSource={requests}
                renderItem={item => (
                    <List.Item>
                        <Card
                            hoverable
                            style={{ minHeight: 520, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                            title={
                                <Link to={`/boardingHouse/${item.boardingHouseId?._id}`}>
                                    {item.boardingHouseId.name || 'Accommodation đã bị xóa'}
                                </Link>
                            }
                            cover={
                                item.boardingHouseId?.photos?.[0] && (
                                    <img
                                        alt="boardingHouse"
                                        src={`${API_BASE}${item.boardingHouseId.photos[0]}`}
                                        style={{ height: 200, objectFit: 'cover' }}
                                    />
                                )
                            }
                        >
                            <Card.Meta
                                avatar={<Avatar src={item.ownerId?.avatar} icon={<UserOutlined />} />}
                                title={`Chủ nhà: ${item.ownerId?.name || 'N/A'}`}
                                description={getStatusTag(item.status)}
                            />
                            <Divider />
                            <Paragraph>
                                <ClockCircleOutlined style={{ marginRight: 8 }} />
                                <strong>Thời gian hẹn:</strong> {formatDateTime(item.requestedDateTime)}
                            </Paragraph>
                            <Paragraph>
                                <MessageOutlined style={{ marginRight: 8 }} />
                                <strong>Lời nhắn của bạn:</strong> {item.message || <Text type="secondary">(Không có)</Text>}
                            </Paragraph>
                            {item.ownerNotes && (
                                <Paragraph style={{ background: '#f6f6f6', padding: 8, borderRadius: 4 }}>
                                    <Text strong>Phản hồi của chủ nhà:</Text> {item.ownerNotes}
                                </Paragraph>
                            )}
                        </Card>
                    </List.Item>
                )}
            />
        </div>
    );
};

export default VisitRequests;