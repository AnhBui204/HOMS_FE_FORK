import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography, message, Layout } from 'antd';
import { LockOutlined, UserOutlined, MailOutlined,PhoneOutlined } from '@ant-design/icons';
import api from '../../../services/api'; 
import useUser from '../../../contexts/UserContext'; 
import { saveAccessToken } from '../../../services/authService';
const { Title, Text } = Typography;

const MagicLogin = () => {
  const { setUser, setIsAuthenticated } = useUser(); 
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({ fullName: '', email: '',phone:'' });
  const [password, setPassword] = useState(''); 
  const [confirmPassword, setConfirmPassword] = useState('');
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');
  const redirectUrl = searchParams.get('redirect') || '/customer/order';

  useEffect(() => {
    if (!token) {
      message.error('Link không hợp lệ!');
      navigate('/login');
      return;
    }
    try {
      const payloadBase64 = token.split('.')[1];
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decodedPayload = JSON.parse(jsonPayload);
      setUserInfo({
        fullName: decodedPayload.fullName || 'Khách hàng',
        email: decodedPayload.email || '',
        phone:decodedPayload.phone || ''
      });
    } catch (e) {
      console.log('Lỗi giải mã token', e);
    }
  }, [token, navigate]);

  const handleSubmit = async () => {
    if (!password) {
      return message.warning('Vui lòng tạo mật khẩu của bạn.');
    }
 if (password !== confirmPassword) {
    return message.error('Mật khẩu xác nhận không khớp!');
  }
    setLoading(true);
    try {
      const res = await api.post('/auth/magic', { token, password, phone: userInfo.phone,confirmPassword });

      if (res.data.success) {
       if (res.data.accessToken) {
            const expiresIn = res.data.expiresInMs || (15 * 60 * 1000);
            saveAccessToken(res.data.accessToken, expiresIn);
        }

        if (res.data.data && res.data.data.user) {
            setUser(res.data.data.user);
        }
        setIsAuthenticated(true);
        message.success('Thiết lập tài khoản thành công!');
        navigate(redirectUrl); 
      }
    }catch (error) {
  const responseData = error.response?.data;
  
  if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {

    const errorMsg = responseData.errors[0].message;
    message.error(errorMsg);
  } else if (responseData?.message) {

    message.error(responseData.message);
  } else {
    message.error('Có lỗi xảy ra, vui lòng thử lại sau.');
  }

  if (responseData?.message?.includes('đã được sử dụng')) {
    setTimeout(() => navigate('/login'), 2000);
  }
}finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400, marginTop: '10vh', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#2D4F36' }}>Kích Hoạt Tài Khoản</Title>
          <Text type="secondary">Vui lòng tạo mật khẩu để quản lý hợp đồng bảo mật.</Text>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Họ và Tên</Text>
          <Input size="large" prefix={<UserOutlined />} value={userInfo.fullName} disabled style={{ marginTop: 8 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Email nhận OTP</Text>
          <Input size="large" prefix={<MailOutlined />} value={userInfo.email} disabled style={{ marginTop: 8 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
  <Text strong>Số điện thoại</Text>
  <Input 
    size="large" 
    prefix={<PhoneOutlined />} 
    value={userInfo.phone} 
    onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
    style={{ marginTop: 8 }} 
  />
</div>

        <div style={{ marginBottom: 24 }}>
          <Text strong>Tạo mật khẩu mới</Text>
          <Input.Password 
            size="large" prefix={<LockOutlined />} placeholder="Nhập mật khẩu" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginTop: 8 }} 
          />
        </div>
<div style={{ marginBottom: 24 }}>
  <Text strong>Xác nhận mật khẩu</Text>
  <Input.Password 
    size="large" prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" 
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    style={{ marginTop: 8 }} 
  />
</div>
        <Button type="primary" size="large" block loading={loading} onClick={handleSubmit} style={{ background: '#2D4F36', borderColor: '#2D4F36' }}>
          Lưu & Xem xét đơn hàng
        </Button>
      </Card>
    </Layout>
  );
};

export default MagicLogin;