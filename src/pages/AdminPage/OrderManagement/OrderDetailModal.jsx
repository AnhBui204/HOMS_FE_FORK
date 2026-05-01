import React from 'react';
import { Modal, Descriptions, Tag, Divider } from 'antd';
import dayjs from 'dayjs';

const OrderDetailModal = ({ visible, onClose, order }) => {
  if (!order) return null;

  const statusColor = (s) => s === 'CONVERTED' ? 'green' : s === 'CANCELLED' ? 'red' : 'gold';

  return (
    <Modal visible={visible} title={`Chi tiết đơn ${order.code || ''}`} footer={null} onCancel={onClose} width={800}>
      <Descriptions column={1} bordered>
        <Descriptions.Item label="Mã đơn">{order.code}</Descriptions.Item>
        <Descriptions.Item label="Ngày tạo">{order.createdAt ? dayjs(order.createdAt).format('DD/MM/YYYY HH:mm') : ''}</Descriptions.Item>
        <Descriptions.Item label="Khách hàng">{order.customer || ''}</Descriptions.Item>
        <Descriptions.Item label="SĐT">{order.customerPhone || ''}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái"><Tag color={statusColor(order.status)}>{order.status}</Tag></Descriptions.Item>
        <Descriptions.Item label="Tổng tiền">{order.totalPrice ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice) : '0 đ'}</Descriptions.Item>
        <Descriptions.Item label="Địa điểm lấy">{order.pickup && (order.pickup.address || '')}</Descriptions.Item>
        <Descriptions.Item label="Quận lấy">{order.pickup && order.pickup.district}</Descriptions.Item>
        <Descriptions.Item label="Địa điểm giao">{order.delivery && (order.delivery.address || '')}</Descriptions.Item>
        <Descriptions.Item label="Quận giao">{order.delivery && order.delivery.district}</Descriptions.Item>
        <Descriptions.Item label="Ghi chú">{order.notes || '-'}</Descriptions.Item>
        {order.pricingSnapshot && (
          <>
            <Divider />
            <Descriptions.Item label="Giá (snapshot)">Tổng: {order.pricingSnapshot.totalPrice ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.pricingSnapshot.totalPrice) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Chi tiết breakdown">{order.pricingSnapshot.breakdown ? JSON.stringify(order.pricingSnapshot.breakdown) : '-'}</Descriptions.Item>
          </>
        )}
      </Descriptions>
    </Modal>
  );
};

export default OrderDetailModal;
