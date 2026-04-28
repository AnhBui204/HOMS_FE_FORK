import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography, message, Layout } from 'antd';
import { LockOutlined, UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import api from '../../../services/api'; 
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../../store/authSlice';
import { saveAccessToken } from '../../../services/authService';

const { Title, Text } = Typography;

const MagicLogin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({ fullName: '', email: '', phone: '' });
  const [password, setPassword] = useState(''); 
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');
  const redirectUrl = searchParams.get('redirect') || '/customer/order';
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
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
        phone: decodedPayload.phone || ''
      });
    } catch (e) {
      console.log('Lỗi giải mã token', e);
      message.error('Token không đúng định dạng');
    }
  }, [token, navigate]);

  const handleSubmit = async () => {

    if (!userInfo.phone || !/^[0-9]{10}$/.test(userInfo.phone)) {
      return message.warning('Số điện thoại phải đủ 10 số.');
    }
   if (!passwordRegex.test(password)) {
  return message.warning(
    'Mật khẩu phải ≥8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt'
  );
}
    if (password !== confirmPassword) {
      return message.error('Mật khẩu xác nhận không khớp!');
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/magic', { 
        token, 
        password, 
        confirmPassword,
        phone: userInfo.phone 
      });

      if (res.data.success) {
        if (res.data.accessToken) {
            const expiresIn = res.data.expiresInMs || (15 * 60 * 1000);
            saveAccessToken(res.data.accessToken, expiresIn);
        }

        if (res.data.data && res.data.data.user) {
            dispatch(setCredentials({ user: res.data.data.user }));
        }
        
        message.success('Thiết lập tài khoản thành công!');
        navigate(redirectUrl); 
      }
    } catch (error) {
      const responseData = error.response?.data;
      let errorMsg = 'Có lỗi xảy ra, vui lòng thử lại sau.';
      
      if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        errorMsg = responseData.errors[0].message;
      } else if (responseData?.message) {
        errorMsg = responseData.message;
      }

      message.error(errorMsg);

      if (errorMsg.includes('đã được sử dụng') || errorMsg.includes('hết hạn') || errorMsg === 'LINK_USED') {
        setTimeout(() => navigate('/login'), 2000);
      }
    } finally {
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
          <Text strong>Email nhận OTP / Đăng nhập</Text>
          <Input size="large" prefix={<MailOutlined />} value={userInfo.email} disabled style={{ marginTop: 8 }} />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong>Số điện thoại <span style={{color: 'red'}}>*</span></Text>
          <Input 
            size="large" 
            prefix={<PhoneOutlined />} 
            value={userInfo.phone} 
            maxLength={10}
           onChange={(e) => {
  const value = e.target.value.replace(/\D/g, '');
  setUserInfo({ ...userInfo, phone: value });
}}
            style={{ marginTop: 8 }} 
            placeholder="Nhập số điện thoại liên lạc"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Tạo mật khẩu mới <span style={{color: 'red'}}>*</span></Text>
          <Input.Password 
            size="large" prefix={<LockOutlined />} placeholder="Ít nhất 6 ký tự" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginTop: 8 }} 
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <Text strong>Xác nhận mật khẩu <span style={{color: 'red'}}>*</span></Text>
          <Input.Password 
            size="large" prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ marginTop: 8 }} 
          />
        </div>
        
        <Button 
          type="primary" 
          size="large" 
          block 
          loading={loading} 
          onClick={handleSubmit} 
          style={{ background: '#2D4F36', borderColor: '#2D4F36' }}
        >
          Lưu & Xem Xét Đơn Hàng
        </Button>
      </Card>
    </Layout>
  );
};

export default MagicLogin;