import React, { useEffect, useState } from 'react';
import { Modal, Row, Col, Avatar, Typography, Tag, Divider, Statistic, Button, List, Spin } from 'antd';
import { UserOutlined, PhoneOutlined, CalendarOutlined, EnvironmentOutlined, DollarCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import adminOrderService from '../../../services/admin/adminOrderService';

const { Title, Text } = Typography;
const primaryColor = '#44624A';

const formatCurrency = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v || 0));

const OrderDetailModal = ({ visible, onClose, order }) => {
  const [fullOrder, setFullOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!visible) return;
      // determine id
      const id = typeof order === 'string' ? order : (order && (order._id || order.id));
      if (!id) {
        // if order is already an object, use it
        if (order && typeof order === 'object') setFullOrder(order);
        return;
      }
      setLoading(true);
      try {
        const resp = await adminOrderService.fetchAdminOrderById(id);
        if (mounted) setFullOrder(resp);
      } catch (e) {
        if (mounted && order && typeof order === 'object') setFullOrder(order);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [visible, order]);

  if (!visible) return null;
  const orderObj = fullOrder || order;
  if (!orderObj) return null;

  const statusColor = (s) => s === 'CONVERTED' ? 'green' : s === 'CANCELLED' ? 'red' : '#f0ad4e';

  const initials = (name) => {
    // accept string or object with fullName/name
    if (!name) return 'KH';
    let str = '';
    if (typeof name === 'object') {
      str = name.fullName || name.name || name.displayName || '';
    } else {
      str = String(name);
    }
    if (!str) return 'KH';
    return str.split(' ').map(n => n[0] || '').slice(0,2).join('').toUpperCase();
  };

  const customerName = (typeof orderObj.customer === 'string') ? orderObj.customer : (orderObj.customer && (orderObj.customer.fullName || orderObj.customer.name)) || '';
  const customerPhone = orderObj.customerPhone || (orderObj.customer && orderObj.customer.phone) || '';

  const breakdownItems = orderObj.pricingSnapshot && orderObj.pricingSnapshot.breakdown ? Object.entries(orderObj.pricingSnapshot.breakdown) : [];
  // normalized (lowercase) labels to cover different casing styles from backend
  const breakdownLabels = {
    basetransportfee: 'Phí vận chuyển cơ bản',
    vehiclefee: 'Phí xe',
    laborfee: 'Phí nhân công',
    distancefee: 'Phí khoảng cách',
    floorfee: 'Phí tầng',
    carryfee: 'Phí bốc xếp',
    assemblingfee: 'Phí lắp ráp',
    packingfee: 'Phí đóng gói',
    insurancefee: 'Phí bảo hiểm',
    managementfee: 'Phí quản lý',
    itemservicefee: 'Phí dịch vụ đồ',
    estimatedhours: 'Số giờ ước tính'
  };

  const normalizeKey = (k) => (k || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
  const humanizeKey = (k) => {
    if (!k) return '';
    // split camelCase or snake_case and capitalize first letter
    const spaced = k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={<Button type="primary" style={{ background: primaryColor, borderColor: primaryColor }} onClick={onClose}>Đóng</Button>}
      width={900}
      centered
      bodyStyle={{ padding: 24, overflow: 'auto' }}
      destroyOnClose
    >
      <style>{`
        .od-modal-header { display:flex; align-items:center; gap:16px; }
        .od-code { font-weight:700; color: ${primaryColor}; }
        .od-section { background: #fbfdfb; border-radius:8px; padding:12px; }
        .breakdown-item { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #eee }
        .od-avatar { background: ${primaryColor}; color: #fff }
        .fade-in { animation: fadeIn .18s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div className="od-modal-header fade-in">
        <Avatar size={64} className="od-avatar">{initials(customerName)}</Avatar>
        <div style={{ flex: 1 }}>
          <Title level={4} style={{ margin: 0 }}>{customerName || 'Khách hàng'}</Title>
          <Text type="secondary">{customerPhone}</Text>
          <div style={{ marginTop: 6 }}>
            <Text className="od-code">{orderObj.code}</Text>
            <Tag style={{ marginLeft: 12, fontWeight: 600 }} color={statusColor(orderObj.status)}>{orderObj.status}</Tag>
            {orderObj.serviceType && <Tag style={{ marginLeft: 8 }} color="#108ee9">{orderObj.serviceType}</Tag>}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <Statistic title="Tổng tiền" value={formatCurrency(orderObj.totalPrice || (orderObj.pricingSnapshot && orderObj.pricingSnapshot.totalPrice))} valueStyle={{ color: primaryColor, fontWeight: 700 }} />
          <div style={{ marginTop: 6 }}><Text type="secondary"><CalendarOutlined /> {orderObj.createdAt ? dayjs(orderObj.createdAt).format('DD/MM/YYYY HH:mm') : '-'}</Text></div>
        </div>
      </div>

      <Divider />

      <Row gutter={16} className="fade-in">
        <Col xs={24} lg={12}>
          <div className="od-section">
            <Title level={5}><EnvironmentOutlined style={{ color: primaryColor, marginRight: 8 }} />Địa điểm</Title>
            <div style={{ marginTop: 8 }}>
              <Text strong>Điểm lấy</Text>
              <div>{orderObj.pickup?.address || '-'}</div>
              <Text type="secondary">{orderObj.pickup?.district || ''}</Text>
            </div>
            <Divider />
            <div>
              <Text strong>Điểm giao</Text>
              <div>{orderObj.delivery?.address || '-'}</div>
              <Text type="secondary">{orderObj.delivery?.district || ''}</Text>
            </div>
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <div className="od-section">
            <Title level={5}><DollarCircleOutlined style={{ color: primaryColor, marginRight: 8 }} />Chi phí & Ghi chú</Title>
            <div style={{ marginTop: 8 }}>
              <Text strong>Ghi chú</Text>
              <div>{orderObj.notes || '-'}</div>
            </div>

            {breakdownItems.length > 0 && (
              <>
                <Divider />
                <Text strong>Chi tiết giá</Text>
                <List size="small" style={{ marginTop: 8 }}>
                  {loading ? <List.Item style={{ padding: 12 }}><Spin /></List.Item> : breakdownItems.map(([k, v]) => {
                    const nk = normalizeKey(k);
                    const label = breakdownLabels[nk] || humanizeKey(k);
                    const isHours = nk === 'estimatedhours';
                    return (
                      <List.Item key={k} style={{ padding: 6 }}>
                        <div style={{ width: '70%' }}>{label}</div>
                        <div style={{ textAlign: 'right', width: '30%' }}>
                          {isHours ? `${v} giờ` : formatCurrency(v)}
                        </div>
                      </List.Item>
                    );
                  })}
                </List>
              </>
            )}
          </div>
        </Col>
      </Row>

      {order.pricingSnapshot && (
        <div style={{ marginTop: 16 }} className="fade-in">
          <Divider />
          <Title level={5}><FileTextOutlined style={{ color: primaryColor, marginRight: 8 }} /> Bản ghi giá</Title>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div><Text type="secondary">Tạm tính</Text><div>{formatCurrency(order.pricingSnapshot.subtotal)}</div></div>
              <div><Text type="secondary">Thuế</Text><div>{formatCurrency(order.pricingSnapshot.tax)}</div></div>
              <div><Text type="secondary">Tổng cộng</Text><div style={{ fontWeight: 700 }}>{formatCurrency(order.pricingSnapshot.totalPrice)}</div></div>
            </div>
            <div style={{ color: '#888' }}>{order.pricingSnapshot.notes || ''}</div>
          </div>
        </div>
      )}

    </Modal>
  );
};

export default OrderDetailModal;
