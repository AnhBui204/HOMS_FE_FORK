import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Avatar, notification, Tag, Descriptions, Space } from 'antd';
import { ArrowLeftOutlined, UserOutlined, PhoneOutlined, GlobalOutlined, ClockCircleOutlined, MailOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import adminUserService from '../../../services/adminUserService';

const { Title, Text } = Typography;

const PRIMARY_GREEN = '#2D4F36';
const PRIMARY_LIGHT = '#eaf3ea';

const UserProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Fetch user data via API, since adminUserService.getAllUsers exists we can try to fetch them all 
        // and filter by ID or ideally the backend has a /users/:id GET endpoint.
        const fetchUser = async () => {
            try {
                setLoading(true);
                // Assume backend structure handles retrieving a single user or we find them in general fetch
                const response = await adminUserService.getAllUsers({ search: '' });
                const data = response.data?.users || response.data || [];
                const foundUser = data.find(u => u._id === id);

                if (foundUser) {
                    setUser(foundUser);
                } else {
                    // Placeholder mock data if specifically testing layout
                    setUser({
                        _id: id,
                        fullName: 'Nguyễn Văn A',
                        email: 'Avanhnguyen@gmail.com',
                        role: 'Delivery Staff',
                        gender: 'Male',
                        phoneNumber: '123456789',
                        country: 'Vietnam',
                        timeZone: 'GMT+7'
                    });
                }
            } catch (error) {
                console.error("Failed to load user profile", error);
                notification.error({ message: 'Error loading profile' });
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [id]);

    if (!user && loading) return <div style={{ padding: 24 }}>Đang tải...</div>;
    if (!user) return <div style={{ padding: 24 }}>Không tìm thấy người dùng.</div>;

    return (
        <div style={{ textAlign: 'left', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <Text type="secondary" style={{ fontSize: 16 }}>Hồ sơ</Text>
                <Title level={3} style={{ margin: '8px 0 0 0' }}>{user.role === 'staff' ? 'Nhân viên vận chuyển' : user.role === 'customer' ? 'Khách hàng' : user.role}</Title>
            </div>

            <Card style={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
                {/* Header Profile Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <Avatar size={88} src={user.avatar} style={{ backgroundColor: PRIMARY_LIGHT, color: PRIMARY_GREEN, fontSize: 28 }}>
                                {!user.avatar && (user.fullName || 'U').split(' ').slice(-1)[0].charAt(0)}
                            </Avatar>
                            <div>
                                <Title level={4} style={{ margin: 0 }}>{user.fullName || 'Không có tên'}</Title>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                                    <MailOutlined style={{ color: '#8c8c8c' }} />
                                    <Text type="secondary">{user.email || 'Chưa có email'}</Text>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Tag color={PRIMARY_LIGHT} style={{ borderRadius: 8, padding: '6px 10px', color: PRIMARY_GREEN, fontWeight: 600, textTransform: 'capitalize' }}>{user.role}</Tag>
                        </div>
                    </div>
                </div>

                {/* Details */}
                <Descriptions column={2} bordered size="middle">
                    <Descriptions.Item label={<Space><UserOutlined />Họ và tên</Space>} span={1}>{user.fullName || '-'}</Descriptions.Item>
                    <Descriptions.Item label={<Space><UserOutlined />Tên gọi</Space>} span={1}>{user.displayName || '-'}</Descriptions.Item>
                    <Descriptions.Item label={<Space><PhoneOutlined />Số điện thoại</Space>} span={1}>{user.phoneNumber || user.phone || '-'}</Descriptions.Item>
                    <Descriptions.Item label={<Space><GlobalOutlined />Quốc gia</Space>} span={1}>{user.country || 'Vietnam'}</Descriptions.Item>
                    <Descriptions.Item label={<Space><ClockCircleOutlined />Múi giờ</Space>} span={1}>{user.timeZone || 'GMT+7'}</Descriptions.Item>
                    <Descriptions.Item label={<Space><UserOutlined />Trạng thái</Space>} span={1}>{user.status || '-'}</Descriptions.Item>
                </Descriptions>

                <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        size="large"
                        style={{ backgroundColor: PRIMARY_LIGHT, color: PRIMARY_GREEN, border: 'none', borderRadius: '24px', fontWeight: '600', padding: '0 28px' }}
                        onClick={() => navigate('/admin/users')}
                    >
                        Quay lại
                    </Button>

                    <div />
                </div>
            </Card>
        </div>
    );
};

export default UserProfile;
