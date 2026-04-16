import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography, message, Layout } from 'antd';
import { LockOutlined, PhoneOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import api from '../../../services/api'; 

const { Title, Text } = Typography;

const MagicLogin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('Khách hàng');
  const [formData, setFormData] = useState({ phone: '', email: '', password: '' }); 
  
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
      // Thay thế các ký tự Base64Url sang Base64 chuẩn
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decodedPayload = JSON.parse(jsonPayload);
      if (decodedPayload.fullName) {
        setFullName(decodedPayload.fullName);
      }
      if (decodedPayload.email) {
        setFormData(prev => ({ ...prev, email: decodedPayload.email }));
      }
    } catch (e) {
      console.log('Không thể giải mã token để lấy tên', e);
    }
  }, [token, navigate]);

  const handleSubmit = async () => {
    if (!formData.phone || !formData.email || !formData.password) {
      return message.warning('Vui lòng điền đủ số điện thoại, email và mật khẩu.');
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/magic', {
        token,
        phone: formData.phone,
        email: formData.email,
        password: formData.password
      });

      if (res.data.success) {
        localStorage.setItem('accessToken', res.data.accessToken);
        message.success('Thiết lập tài khoản thành công!');
        navigate(redirectUrl); 
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400, marginTop: '10vh', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#2D4F36' }}>Thiết Lập Tài Khoản</Title>
          <Text type="secondary">Chào mừng bạn từ Facebook!</Text>
          <br/>
          <Text type="secondary">Vui lòng tạo mật khẩu để quản lý hợp đồng.</Text>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Tên Facebook</Text>
          <Input size="large" prefix={<UserOutlined />} value={fullName} disabled style={{ marginTop: 8 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Số điện thoại</Text>
          <Input 
            size="large" prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            style={{ marginTop: 8 }} 
          />
        </div>

        {/* THÊM TRƯỜNG NHẬP EMAIL ĐỂ ĐÁP ỨNG YÊU CẦU CỦA BACKEND */}
        <div style={{ marginBottom: 16 }}>
          <Text strong>Email</Text>
          <Input 
            size="large" prefix={<MailOutlined />} placeholder="Nhập email của bạn" 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={{ marginTop: 8 }} 
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text strong>Mật khẩu mới</Text>
          <Input.Password 
            size="large" prefix={<LockOutlined />} placeholder="Tự đặt mật khẩu" 
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            style={{ marginTop: 8 }} 
          />
        </div>

        <Button type="primary" size="large" block loading={loading} onClick={handleSubmit} style={{ background: '#2D4F36', borderColor: '#2D4F36' }}>
          Lưu và Chuyển đến Hợp Đồng
        </Button>
      </Card>
    </Layout>
  );
};

export default MagicLogin;