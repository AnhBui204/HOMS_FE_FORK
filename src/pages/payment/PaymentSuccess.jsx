import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import api from '../../services/api';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'warning'

  const ticketId = searchParams.get('ticketId');
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  const getTitle = () => {
    if (status === 'verifying') return "Đang xác minh giao dịch...";
    if (code !== '00') return "Giao dịch không thành công hoặc đã bị hủy";

    if (type === "MOVING_REMAINING") {
      return "Thanh toán hoàn tất đơn hàng!";
    }

    if (type === "MOVING_DEPOSIT") {
      return "Thanh toán đặt cọc thành công!";
    }

    if (type === "SURVEY_DEPOSIT") {
      return "Thanh toán phí khảo sát thành công!";
    }

    return "Thanh toán thành công!";
  };

  const getSubTitle = () => {
    if (status === 'verifying') return "Hệ thống đang kiểm tra trạng thái thanh toán từ PayOS, vui lòng chờ trong giây lát.";
    if (code !== '00') return "Có lỗi xảy ra trong quá trình thanh toán. Vui lòng kiểm tra lại.";

    if (type === "MOVING_REMAINING") {
      return "Đơn hàng của bạn đã được tất toán đầy đủ. Cảm ơn quý khách!";
    }

    if (type === "MOVING_DEPOSIT") {
      return "Khoản đặt cọc (50%) đã được ghi nhận. Chúng tôi sẽ tiến hành vận chuyển theo đúng lịch trình.";
    }

    if (type === "SURVEY_DEPOSIT") {
      return "Phí khảo sát của bạn đã được thanh toán. Chúng tôi sẽ liên hệ trong thời gian sớm nhất.";
    }

    return "Cảm ơn bạn đã sử dụng dịch vụ của HOMS.";
  };

  useEffect(() => {
    const verify = async () => {
      if (code === '00' && ticketId) {
        try {
          // Manual trigger a backend verification.
          await api.get(`/request-tickets/${ticketId}/verify-payment`);
          setStatus('success');
        } catch (err) {
          console.error("Verify payment fallback failed:", err);
          setStatus('warning');
        }
      } else {
        setStatus(code === '00' ? 'success' : 'warning');
      }
    };

    verify();
  }, [code, ticketId]);

  return (
    <div style={{ padding: '80px 0', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {status === 'verifying' ? (
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <h2 style={{ marginTop: 24, color: '#2D4F36' }}>{getTitle()}</h2>
          <p style={{ color: '#64748b' }}>{getSubTitle()}</p>
        </div>
      ) : (
        <Result
          status={status === 'success' ? "success" : "warning"}
          title={getTitle()}
          subTitle={getSubTitle()}
          extra={[
            <Button type="primary" key="console" onClick={() => navigate('/customer/order')} style={{ background: '#2D4F36', borderColor: '#2D4F36' }}>
              Quản lý đơn hàng
            </Button>,
            <Button key="home" onClick={() => navigate('/')}>
              Trang chủ
            </Button>,
          ]}
        />
      )}
    </div>
  );
};

export default PaymentSuccess;