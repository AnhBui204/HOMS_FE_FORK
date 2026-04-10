import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout, Card, Button, message, Spin, Checkbox, Typography,
  Divider, Modal, Input, Space, Progress, Tooltip
} from 'antd';
import {
  SafetyCertificateOutlined, CheckCircleOutlined, InfoCircleOutlined,
  EditOutlined, ClearOutlined, MailOutlined, ReloadOutlined
} from '@ant-design/icons';
import AppHeader from '../../../components/header/header';
import AppFooter from '../../../components/footer/footer';
import api from '../../../services/api';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

// ─── Canvas chữ ký ───────────────────────────────────────────────────────────
const SignatureCanvas = ({ onSignatureChange }) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const source = e.touches ? e.touches[0] : e;
    return {
      x: (source.clientX - rect.left) * (canvas.width / rect.width),
      y: (source.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
    setHasSignature(true);
    onSignatureChange(canvas.toDataURL('image/png'));
  }, [onSignatureChange]);

  const stopDraw = useCallback(() => { isDrawing.current = false; }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={780}
        height={180}
        style={{
          border: '2px dashed #2D4F36',
          borderRadius: '8px',
          cursor: 'crosshair',
          width: '100%',
          height: '180px',
          backgroundColor: '#fafff9',
          touchAction: 'none'
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      {!hasSignature && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#bbb', fontSize: '15px', pointerEvents: 'none', userSelect: 'none'
        }}>
          ✍️ Ký tên của bạn vào đây
        </div>
      )}
      {hasSignature && (
        <Tooltip title="Xóa chữ ký">
          <Button
            icon={<ClearOutlined />}
            size="small"
            danger
            style={{ position: 'absolute', top: 8, right: 8 }}
            onClick={clearCanvas}
          >
            Vẽ lại
          </Button>
        </Tooltip>
      )}
    </div>
  );
};

// ─── Modal OTP ────────────────────────────────────────────────────────────────
const OtpModal = ({ visible, email, contractId, onSuccess, onClose }) => {
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Đếm ngược cho nút gửi lại
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post(`/customer/contracts/${contractId}/request-otp`);
      message.success('Đã gửi lại mã OTP!');
      setCountdown(60);
      setOtp('');
    } catch (err) {
      message.error('Không thể gửi lại OTP: ' + (err.response?.data?.message || ''));
    } finally {
      setResending(false);
    }
  };

  const handleVerify = () => {
    if (otp.length !== 6) {
      message.warning('Vui lòng nhập đủ 6 chữ số');
      return;
    }
    onSuccess(otp);
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={420}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MailOutlined style={{ color: '#2D4F36', fontSize: 20 }} />
          <span>Xác nhận OTP ký hợp đồng</span>
        </div>
      }
    >
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#f0f7f1', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <MailOutlined style={{ fontSize: 28, color: '#2D4F36' }} />
        </div>
        <Paragraph>
          Mã OTP <strong>6 chữ số</strong> đã được gửi đến email:
          <br />
          <Text strong style={{ color: '#2D4F36', fontSize: 15 }}>{email}</Text>
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Mã có hiệu lực trong <strong>5 phút</strong>. Vui lòng kiểm tra hộp thư (kể cả Spam).
        </Paragraph>

        <Input
          size="large"
          maxLength={6}
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="_ _ _ _ _ _"
          style={{
            textAlign: 'center',
            fontSize: '28px',
            letterSpacing: '12px',
            fontWeight: 'bold',
            width: '220px',
            borderColor: '#2D4F36',
            margin: '8px 0 24px'
          }}
          onPressEnter={handleVerify}
          autoFocus
        />

        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            size="large"
            block
            loading={verifying}
            onClick={handleVerify}
            style={{ background: '#2D4F36', borderColor: '#2D4F36', height: 48, fontSize: 15 }}
          >
            Xác nhận & Ký hợp đồng
          </Button>
          <Button
            size="large"
            block
            icon={<ReloadOutlined />}
            loading={resending}
            disabled={countdown > 0}
            onClick={handleResend}
          >
            {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

// ─── Trang chính ──────────────────────────────────────────────────────────────
const SignContract = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);

  // Bước: 'idle' | 'otp' | 'signing' | 'paying'
  const [step, setStep] = useState('idle');
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [paying, setPaying] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/customer/contracts/ticket/${ticketId}`);
        if (res.data?.success) setContract(res.data.data);
        else message.error('Không thể lấy thông tin hợp đồng.');
      } catch (err) {
        message.error('Lỗi: ' + (err.response?.data?.message || ''));
      }
      try {
        const invRes = await api.get(`/invoices/ticket/${ticketId}`);
        if (invRes.data?.success) setInvoice(invRes.data.data);
      } catch (_) { }
      // Lấy email để hiển thị trong OTP modal
      try {
        const meRes = await api.get('/customer/personal-info');
        setCustomerEmail(meRes.data?.data?.email || '');
      } catch (_) { }
      setLoading(false);
    };
    if (ticketId) fetchData();
  }, [ticketId]);

  // Bước 1: Validate → Gửi OTP
  const handleRequestOtp = async () => {
    if (!agreed) {
      message.warning('Vui lòng đọc và đồng ý với các điều khoản.');
      return;
    }
    if (!signatureImage) {
      message.warning('Vui lòng ký tên vào ô chữ ký trước khi tiếp tục.');
      return;
    }
    setStep('otp');
    try {
      await api.post(`/customer/contracts/${contract._id}/request-otp`);
      message.success('Đã gửi mã OTP về email của bạn!');
      setOtpModalVisible(true);
    } catch (err) {
      message.error('Không thể gửi OTP: ' + (err.response?.data?.message || ''));
      setStep('idle');
    }
  };

  // Bước 2: OTP xác nhận → Gọi API ký hợp đồng
  const handleSignWithOtp = async (otp) => {
    setStep('signing');
    try {
      await api.post(`/customer/contracts/${contract._id}/signs`, {
        signatureImage,
        otp,
        ipAddress: null // Server tự lấy req.ip
      });

      setOtpModalVisible(false);
      message.success('✅ Ký hợp đồng thành công! Đang chuyển đến thanh toán...');

      // Bước 3: Tạo link thanh toán cọc
      setStep('paying');
      try {
        const depositRes = await api.post(`/request-tickets/${ticketId}/deposit`);
        if (depositRes.data?.success && depositRes.data?.data?.checkoutUrl) {
          window.location.href = depositRes.data.data.checkoutUrl;
        } else {
          message.warning('Không thể tạo link thanh toán, vui lòng thanh toán sau.');
          navigate('/customer/order');
        }
      } catch {
        message.warning('Có lỗi khi tạo thanh toán, vui lòng thanh toán cọc sau.');
        navigate('/customer/order');
      }
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('otp')) {
        message.error('Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
        setStep('otp');
      } else {
        message.error('Ký hợp đồng thất bại: ' + msg);
        setStep('idle');
        setOtpModalVisible(false);
      }
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <Layout><AppHeader />
      <Content style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </Content>
      <AppFooter />
    </Layout>
  );

  if (!contract) return (
    <Layout><AppHeader />
      <Content style={{ padding: 50, textAlign: 'center' }}>
        <Title level={3}>Không tìm thấy hợp đồng.</Title>
        <Button onClick={() => navigate('/customer/order')}>Quay lại</Button>
      </Content>
      <AppFooter />
    </Layout>
  );

  const isSigned = !['DRAFT', 'SENT'].includes(contract.status);
  const isBusy = step === 'otp' || step === 'signing' || step === 'paying';

  return (
    <Layout className="sign-contract-page">
      <AppHeader />
      <Content style={{ padding: '40px 20px', backgroundColor: '#f0f2f5' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Card bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden' }}
            bodyStyle={{ padding: 0 }}
          >
            {/* Header */}
            <div style={{
              background: '#2D4F36', padding: '30px 40px', color: 'white',
              borderBottom: '4px solid #e1b12c'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Title level={2} style={{ color: 'white', margin: 0, fontWeight: 700 }}>
                    HỢP ĐỒNG VẬN CHUYỂN HOMS
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, display: 'block', marginTop: 8 }}>
                    Mã hợp đồng: <strong style={{ color: '#fff' }}>{contract.contractNumber}</strong>
                  </Text>
                </div>
                <SafetyCertificateOutlined style={{ fontSize: 48, color: '#e1b12c' }} />
              </div>
            </div>

            <div style={{ padding: '40px', backgroundColor: '#fff' }}>
              {/* Tiêu đề pháp lý */}
              <div style={{ textAlign: 'center', marginBottom: 30, fontFamily: '"Times New Roman", serif' }}>
                <Text strong style={{ fontSize: 18, display: 'block' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
                <Text strong style={{ fontSize: 16, display: 'block', textDecoration: 'underline' }}>
                  Độc lập - Tự do - Hạnh phúc
                </Text>
                <Title level={3} style={{ marginTop: 30, marginBottom: 10, fontFamily: '"Times New Roman", serif' }}>
                  HỢP ĐỒNG CUNG CẤP DỊCH VỤ VẬN CHUYỂN
                </Title>
                <Text style={{ fontStyle: 'italic', color: '#666' }}>
                  Số: {contract.contractNumber} / HĐVC
                </Text>
              </div>

              {/* Nội dung hợp đồng */}
              <div
                style={{
                  fontFamily: '"Times New Roman", serif', fontSize: 16, lineHeight: 1.6,
                  color: '#000', textAlign: 'justify', minHeight: 400,
                  padding: '20px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee',
                  marginBottom: 30
                }}
                dangerouslySetInnerHTML={{ __html: contract.content }}
              />

              {/* Hiển thị chữ ký quản trị (nếu có) và khung chữ ký khách hàng để minh hoạ */}
              <div style={{ display: 'flex', gap: 24, marginTop: 20, marginBottom: 20 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Bên A — Đại diện HOMS</div>
                  <div style={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {contract.adminSignature?.signatureImage ? (
                      <img src={contract.adminSignature.signatureImage} alt="admin-sign" style={{ maxWidth: '260px', maxHeight: 90 }} />
                    ) : (
                      <div style={{ width: 260, height: 90, borderBottom: '2px solid #ccc' }} />
                    )}
                  </div>
                  <div style={{ marginTop: 8, color: '#555' }}>{contract.adminSignature?.signedByName || 'HOMS Vận Chuyển'}</div>
                  {/* Admin signature time intentionally omitted (remove "Ký lúc") */}
                </div>

                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Bên B — Khách hàng</div>
                  <div style={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {contract.customerSignature?.signatureImage ? (
                      <img src={contract.customerSignature.signatureImage} alt="customer-sign" style={{ maxWidth: '260px', maxHeight: 90 }} />
                    ) : (
                      <div style={{ width: 260, height: 90, borderBottom: '2px solid #ccc' }} />
                    )}
                  </div>
                  <div style={{ marginTop: 8, color: '#555' }}>{contract.customerId?.fullName || ''}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{contract.customerSignature?.signedAt ? new Date(contract.customerSignature.signedAt).toLocaleString('vi-VN') : ''}</div>
                </div>
              </div>

              {/* ── CHƯA KÝ: Form ký ── */}
              {!isSigned ? (
                <div style={{
                  background: '#f8f9fa', padding: 30, borderRadius: 8,
                  border: '1px solid #e9ecef'
                }}>
                  <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2D4F36', marginBottom: 16 }}>
                    <EditOutlined /> XÁC NHẬN VÀ KÝ KẾT ĐIỆN TỬ
                  </Title>

                  <Paragraph style={{ color: '#555', fontSize: 14, lineHeight: 1.6 }}>
                    Vui lòng ký tên vào ô bên dưới, sau đó nhấn <strong>"Gửi OTP & Xác nhận"</strong>.
                    Mã OTP sẽ được gửi về email của bạn để xác thực trước khi hợp đồng có hiệu lực pháp lý.
                  </Paragraph>

                  {/* Checkbox đồng ý */}
                  <div style={{
                    marginBottom: 20, padding: 16, background: '#fff',
                    borderRadius: 6, border: '1px solid #d9d9d9', borderLeft: '4px solid #1890ff'
                  }}>
                    <Checkbox
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      style={{ fontSize: 15, fontWeight: 500 }}
                    >
                      Tôi cam kết tuân thủ các điều khoản và đồng ý ký hợp đồng vận chuyển này.
                    </Checkbox>
                  </div>

                  {/* Canvas chữ ký */}
                  <div style={{ marginBottom: 24 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8, color: '#333' }}>
                      ✍️ Chữ ký của bạn:
                    </Text>
                    <SignatureCanvas onSignatureChange={setSignatureImage} />
                    {signatureImage && (
                      <Text type="success" style={{ fontSize: 13, marginTop: 6, display: 'block' }}>
                        ✅ Đã có chữ ký — sẵn sàng tiến hành xác thực OTP
                      </Text>
                    )}
                  </div>

                  {/* Nút gửi OTP */}
                  <div style={{ textAlign: 'center' }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<MailOutlined />}
                      onClick={handleRequestOtp}
                      loading={isBusy}
                      disabled={!agreed || !signatureImage}
                      style={{
                        background: (agreed && signatureImage) ? '#2D4F36' : undefined,
                        borderColor: (agreed && signatureImage) ? '#2D4F36' : undefined,
                        height: 50, padding: '0 40px', fontSize: 16,
                        fontWeight: 'bold', borderRadius: 25,
                        boxShadow: (agreed && signatureImage) ? '0 4px 14px rgba(45,79,54,0.4)' : 'none'
                      }}
                    >
                      GỬI OTP & XÁC NHẬN KÝ HỢP ĐỒNG
                    </Button>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      Địa chỉ IP, thời gian và chữ ký điện tử của bạn sẽ được lưu trữ mã hóa nhằm mục đích chứng thực pháp lý.
                    </Text>
                  </div>
                </div>
              ) : (
                /* ── ĐÃ KÝ ── */
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{
                    display: 'inline-block', padding: '24px 40px', background: '#f6ffed',
                    border: '1px solid #b7eb8f', borderRadius: 8, marginBottom: 24
                  }}>
                    <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                    <Title level={4} style={{ color: '#237804', margin: 0 }}>
                      Hợp đồng đã được ký điện tử thành công
                    </Title>
                    <Text style={{ display: 'block', marginTop: 8, color: '#555' }}>
                      Toàn bộ điều khoản đã có hiệu lực pháp lý và được lưu trữ an toàn.
                    </Text>
                    {contract.signedAt && (
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        🕐 Ký lúc: {new Date(contract.signedAt).toLocaleString('vi-VN')}
                      </Text>
                    )}
                  </div>

                  {(!invoice || invoice.paymentStatus === 'UNPAID') && (
                    <div style={{ marginTop: 20 }}>
                      <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 16 }}>
                        Vui lòng thanh toán cọc 50% để chúng tôi tiến hành sắp xếp nguồn lực.
                      </Text>
                      <Button
                        type="primary" size="large" loading={paying}
                        style={{
                          background: '#d9363e', borderColor: '#d9363e',
                          height: 50, padding: '0 40px', fontSize: 16,
                          fontWeight: 'bold', borderRadius: 25,
                          boxShadow: '0 4px 14px rgba(217,54,62,0.4)'
                        }}
                        onClick={async () => {
                          setPaying(true);
                          try {
                            const r = await api.post(`/request-tickets/${ticketId}/deposit`);
                            if (r.data?.success && r.data?.data?.checkoutUrl)
                              window.location.href = r.data.data.checkoutUrl;
                            else message.warning('Không thể tạo link thanh toán, vui lòng thử lại.');
                          } catch (err) {
                            message.error('Lỗi thanh toán: ' + (err.response?.data?.message || err.message));
                          } finally {
                            setPaying(false);
                          }
                        }}
                      >
                        THANH TOÁN CỌC 50%
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Divider />
              <div style={{ textAlign: 'center' }}>
                <Button onClick={() => navigate('/customer/order')}>Quay lại danh sách đơn hàng</Button>
              </div>
            </div>
          </Card>
        </div>
      </Content>

      {/* Modal OTP */}
      <OtpModal
        visible={otpModalVisible}
        email={customerEmail}
        contractId={contract?._id}
        onSuccess={handleSignWithOtp}
        onClose={() => {
          setOtpModalVisible(false);
          setStep('idle');
        }}
      />

      <AppFooter />
    </Layout>
  );
};

export default SignContract;