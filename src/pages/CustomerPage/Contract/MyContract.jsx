import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Input, Select, Space, Modal,
  Typography, Card, Row, Col, Statistic, Tooltip,
  Empty, Spin, message, Divider, Alert,
} from 'antd';
import {
  FileTextOutlined, SearchOutlined, EyeOutlined, DownloadOutlined,
  EditOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CloseCircleOutlined, ExclamationCircleOutlined, SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ContractService from '../../../services/contractService';
import AppHeader from "../../../components/header/header";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

const STATUS_CONFIG = {
  DRAFT:     { color: 'default',    label: 'Nháp',    icon: <EditOutlined /> },
  SENT:      { color: 'processing', label: 'Chờ ký',  icon: <ClockCircleOutlined /> },
  SIGNED:    { color: 'success',    label: 'Đã ký',   icon: <CheckCircleOutlined /> },
  EXPIRED:   { color: 'warning',    label: 'Hết hạn', icon: <ExclamationCircleOutlined /> },
  CANCELLED: { color: 'error',      label: 'Đã huỷ',  icon: <CloseCircleOutlined /> },
};

const StatusTag = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return <Tag icon={cfg.icon} color={cfg.color} style={{ fontWeight: 500 }}>{cfg.label}</Tag>;
};


const ContractDetailModal = ({ contract, open, onClose, onDownload }) => {
  if (!contract) return null;
  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={820}
      title={
        <Space>
          <FileTextOutlined style={{ color: '#3b82f6' }} />
          <span style={{ fontWeight: 700 }}>{contract.contractNumber}</span>
          <StatusTag status={contract.status} />
        </Space>
      }
      footer={
        <Space>
          <Button onClick={onClose}>Đóng</Button>
          <Button icon={<DownloadOutlined />} onClick={() => onDownload(contract._id)}>
            Tải xuống
          </Button>
        </Space>
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>HIỆU LỰC TỪ</Text>
            <div style={{ fontWeight: 600, marginTop: 4 }}>
              <CalendarOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
              {contract.validFrom ? dayjs(contract.validFrom).format('DD/MM/YYYY') : '—'}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>HẾT HIỆU LỰC</Text>
            <div style={{ fontWeight: 600, marginTop: 4 }}>
              <CalendarOutlined style={{ marginRight: 6, color: '#ef4444' }} />
              {contract.validUntil ? dayjs(contract.validUntil).format('DD/MM/YYYY') : '—'}
            </div>
          </Card>
        </Col>
      </Row>

      {contract.customerSignature?.signedAt && (
        <Alert
          type="success" showIcon style={{ marginBottom: 16 }}
          message={`Bạn đã ký lúc ${dayjs(contract.customerSignature.signedAt).format('HH:mm DD/MM/YYYY')}`}
        />
      )}

      <Divider orientation="left" style={{ color: '#64748b', fontSize: 13 }}>
        Nội dung hợp đồng
      </Divider>
      <div
        style={{
          maxHeight: 400, overflowY: 'auto',
          border: '1px solid #e2e8f0', borderRadius: 8,
          padding: '16px 20px', background: '#fff',
          lineHeight: 1.8, fontSize: 14,
        }}
        dangerouslySetInnerHTML={{ __html: contract.content }}
      />

      {contract.notes && (
        <>
          <Divider orientation="left" style={{ color: '#64748b', fontSize: 13 }}>Ghi chú</Divider>
          <Paragraph style={{ color: '#64748b', fontStyle: 'italic' }}>{contract.notes}</Paragraph>
        </>
      )}
    </Modal>
  );
};



export default MyContract;