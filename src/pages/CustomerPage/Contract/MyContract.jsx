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


const MyContract = () => {
  const [contracts, setContracts]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters]       = useState({ status: undefined, search: '' });
  const [stats, setStats]           = useState({ total: 0, signed: 0, pending: 0, expired: 0 });
  const [selectedContract, setSelectedContract] = useState(null);
  const [detailOpen, setDetailOpen]             = useState(false);
  const [detailLoading, setDetailLoading]       = useState(false);

  const fetchContracts = useCallback(async (page = 1, pageSize = 10, currentFilters = filters) => {
    setLoading(true);
    try {
      const res = await ContractService.getMyContracts({
        page, limit: pageSize,
        ...(currentFilters.status && { status: currentFilters.status }),
        ...(currentFilters.search && { search: currentFilters.search }),
      });
      if (res.success) {
        setContracts(res.data);
        setPagination(prev => ({ ...prev, current: page, pageSize, total: res.pagination?.total || 0 }));
        if (res.stats) setStats(res.stats);
      }
    } catch {
      message.error('Không thể tải danh sách hợp đồng.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchContracts(1, 10, { status: undefined, search: '' });
  
  }, []);

  const openDetail = async (contractId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await ContractService.getContractDetail(contractId);
      if (res.success) setSelectedContract(res.data);
    } catch {
      message.error('Không thể tải chi tiết hợp đồng.');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setDetailOpen(false); setSelectedContract(null); };

const handleDownload = async (contractId) => {
  try {
    const response = await ContractService.downloadContract(contractId, 'pdf');

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hop-dong-${contractId}.pdf`);

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch {
    message.error('Tải xuống thất bại.');
  }
};

  const columns = [
    {
      title: 'Số hợp đồng', dataIndex: 'contractNumber',
      render: (val) => <Text strong style={{ color: '#1e40af', fontFamily: 'monospace', fontSize: 13 }}>{val}</Text>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: 'Hiệu lực từ', dataIndex: 'validFrom', width: 130,
      render: (date) => date ? <Text>{dayjs(date).format('DD/MM/YYYY')}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Hiệu lực đến', dataIndex: 'validUntil', width: 130,
      render: (date) => {
        if (!date) return <Text type="secondary">—</Text>;
        const isNear = dayjs(date).diff(dayjs(), 'day') <= 30;
        return (
          <Text style={{ color: isNear ? '#ef4444' : undefined, fontWeight: isNear ? 600 : 400 }}>
            {dayjs(date).format('DD/MM/YYYY')}
            {isNear && <ExclamationCircleOutlined style={{ marginLeft: 6 }} />}
          </Text>
        );
      },
    },
    {
      title: 'Ngày tạo', dataIndex: 'createdAt', width: 130,
      render: (date) => <Text type="secondary">{dayjs(date).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 100, align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button type="text" icon={<EyeOutlined />} size="small"
              style={{ color: '#3b82f6' }} onClick={() => openDetail(record._id)} />
          </Tooltip>
          <Tooltip title="Tải xuống">
            <Button type="text" icon={<DownloadOutlined />} size="small"
              style={{ color: '#64748b' }} onClick={() => handleDownload(record._id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
       <AppHeader />
    <div style={{ padding: 24, background: '#f1f5f9', minHeight: '100vh' }}>
 
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
          <FileTextOutlined style={{ marginRight: 10, color: '#3b82f6' }} />
          Hợp đồng của tôi
        </Title>
        <Text type="secondary">Xem và tải xuống tất cả hợp đồng của bạn</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Tổng hợp đồng', value: stats.total,   icon: <FileTextOutlined />,         color: '#3b82f6', bg: '#eff6ff' },
          { title: 'Đã ký',         value: stats.signed,  icon: <CheckCircleOutlined />,       color: '#10b981', bg: '#ecfdf5' },
          { title: 'Chờ ký',        value: stats.pending, icon: <ClockCircleOutlined />,       color: '#f59e0b', bg: '#fffbeb' },
          { title: 'Hết hạn',       value: stats.expired, icon: <ExclamationCircleOutlined />, color: '#ef4444', bg: '#fef2f2' },
        ].map((s) => (
          <Col xs={24} sm={12} md={6} key={s.title}>
            <Card size="small" style={{ border: 'none', borderRadius: 12, background: s.bg, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <Statistic
                  title={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{s.title}</span>}
                  value={s.value}
                  valueStyle={{ fontSize: 22, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }} bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Search
            placeholder="Tìm theo số hợp đồng..."
            allowClear
            style={{ width: 280 }}
            onSearch={(val) => {
              const f = { ...filters, search: val };
              setFilters(f);
              fetchContracts(1, pagination.pageSize, f);
            }}
          />
          <Select
            placeholder="Lọc trạng thái" allowClear style={{ width: 160 }}
            value={filters.status}
            onChange={(val) => {
              const f = { ...filters, status: val };
              setFilters(f);
              fetchContracts(1, pagination.pageSize, f);
            }}
          >
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <Option value={key} key={key}><Space size={6}>{val.icon}{val.label}</Space></Option>
            ))}
          </Select>
          <Button icon={<SyncOutlined />} style={{ marginLeft: 'auto' }}
            onClick={() => fetchContracts(1, pagination.pageSize, filters)}>
            Làm mới
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={contracts}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Tổng ${total} hợp đồng`,
             locale: {
      items_per_page: '/Trang',
    },
            style: { padding: '12px 20px' },
          }}
          onChange={(pag) => fetchContracts(pag.current, pag.pageSize, filters)}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text type="secondary">
                    {filters.status || filters.search ? 'Không tìm thấy hợp đồng phù hợp' : 'Bạn chưa có hợp đồng nào'}
                  </Text>
                }
              />
            ),
          }}
        />
      </Card>

      {detailLoading ? (
        <Modal open={detailOpen} footer={null} onCancel={closeDetail} width={820}>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="Đang tải..." />
          </div>
        </Modal>
      ) : (
        <ContractDetailModal
          contract={selectedContract}
          open={detailOpen}
          onClose={closeDetail}
          onDownload={handleDownload}
        />
      )}
    </div>
    </>
  );
};

export default MyContract;