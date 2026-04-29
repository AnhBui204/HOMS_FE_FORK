import React from 'react';
import { Card, Space, Avatar, Tag, Typography } from 'antd';
import { FileTextOutlined, UserOutlined, PhoneOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const OrderSummaryCard = ({ selectedInvoice }) => (
    <Card
        size="small"
        title={<Space><FileTextOutlined style={{ color: '#44624a' }} /><Text strong style={{ fontSize: 15 }}>Tổng quan Yêu cầu Logistics</Text></Space>}
        styles={{ body: { padding: '16px' }, header: { background: '#fafafa', borderBottom: '1px solid #f0f0f0' } }}
        style={{ border: '1px solid #d9d9d9', borderRadius: '8px', overflow: 'hidden' }}
    >
        {/* Customer banner */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', background: '#e6f7ff', padding: '12px', borderRadius: '8px', border: '1px solid #91d5ff' }}>
            <Avatar size={42} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff', marginRight: '12px' }} />
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#003a8c', lineHeight: 1.2 }}>
                    {selectedInvoice?.customerId?.fullName}
                </div>
                <div style={{ fontSize: '13px', color: '#0050b3', marginTop: '4px' }}>
                    <PhoneOutlined style={{ marginRight: '6px' }} />
                    {selectedInvoice?.customerId?.phone}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <Tag color="cyan">Khách hàng</Tag>
            </div>
        </div>

        {/* Route timeline */}
        <div style={{ position: 'relative', paddingLeft: '16px', borderLeft: '2px dashed #d9d9d9', marginLeft: '8px' }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
                <div style={{ position: 'absolute', left: '-23px', top: '2px', background: '#fff', borderRadius: '50%', padding: '2px' }}>
                    <div style={{ width: '10px', height: '10px', backgroundColor: '#52c41a', borderRadius: '50%' }} />
                </div>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>Điểm lấy hàng</Text>
                <Text strong style={{ color: '#262626' }}>{selectedInvoice?.requestTicketId?.pickup?.address}</Text>
            </div>
            <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-23px', top: '2px', background: '#fff', borderRadius: '50%', padding: '2px' }}>
                    <div style={{ width: '10px', height: '10px', backgroundColor: '#f5222d', borderRadius: '50%' }} />
                </div>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>Điểm giao hàng</Text>
                <Text strong style={{ color: '#262626' }}>{selectedInvoice?.requestTicketId?.delivery?.address}</Text>
            </div>
        </div>

        {/* Schedule */}
        <div style={{ marginTop: '20px', background: '#fafafa', padding: '10px 14px', borderRadius: '6px', border: '1px solid #c0cfb2', display: 'flex', alignItems: 'center' }}>
            <CalendarOutlined style={{ fontSize: '18px', color: '#44624a', marginRight: '8px' }} />
            <Text style={{ color: '#8ba888', marginRight: '8px' }}>Lịch trình dự kiến:</Text>
            <Text strong style={{ color: '#44624a', fontSize: '14px' }}>
                {selectedInvoice?.requestTicketId?.scheduledTime
                    ? dayjs(selectedInvoice.requestTicketId.scheduledTime).format('DD/MM/YYYY HH:mm')
                    : 'Chưa xác định'}
            </Text>
        </div>
    </Card>
);

export default OrderSummaryCard;
