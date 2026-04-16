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
  DRAFT: { color: 'default', label: 'Nháp', icon: <EditOutlined /> },
  SENT: { color: 'processing', label: 'Chờ ký', icon: <ClockCircleOutlined /> },
  SIGNED: { color: 'success', label: 'Đã ký', icon: <CheckCircleOutlined /> },
  EXPIRED: { color: 'warning', label: 'Hết hạn', icon: <ExclamationCircleOutlined /> },
  CANCELLED: { color: 'error', label: 'Đã huỷ', icon: <CloseCircleOutlined /> },
};

const StatusTag = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return <Tag icon={cfg.icon} color={cfg.color} style={{ fontWeight: 500 }}>{cfg.label}</Tag>;
};


const ContractDetailModal = ({ contract, open, onClose, onDownload }) => {
  if (!contract) return null;

  const customerSignedAt = contract.customerSignature?.signedAt
    ? dayjs(contract.customerSignature.signedAt).format('HH:mm DD/MM/YYYY') : null;
  // Support both `adminSignature` (newer), template-level adminSignature (fallback), and `homsSignature` (older)
  const adminSig = contract.adminSignature || contract.templateId?.adminSignature || contract.homsSignature || null;
  const adminSignedAt = adminSig?.signedAt ? dayjs(adminSig.signedAt).format('HH:mm DD/MM/YYYY') : null;

  return (
    <Modal
      open={open} onCancel={onClose} width={860} centered
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
            Tải PDF
          </Button>
        </Space>
      }
    >
      {/* Meta */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {contract.depositDeadline && contract.status === 'SIGNED' && (
          <Col span={24}>
            <Alert
              type={new Date(contract.depositDeadline) > new Date() ? 'warning' : 'error'}
              showIcon
              message={
                new Date(contract.depositDeadline) > new Date()
                  ? ` Hạn đặt cọc: ${dayjs(contract.depositDeadline).format('HH:mm DD/MM/YYYY')} — còn ${Math.ceil((new Date(contract.depositDeadline) - new Date()) / 3600000)} giờ`
                  : ' Đã quá hạn đặt cọc'
              }
            />
          </Col>
        )}
      </Row>

      {/* Nội dung hợp đồng */}
      <Divider orientation="left" style={{ color: '#64748b', fontSize: 13 }}>Nội dung hợp đồng</Divider>
      <div
        style={{
          maxHeight: 320, overflowY: 'auto',
          border: '1px solid #e2e8f0', borderRadius: 8,
          padding: '16px 20px', background: '#fff',
          lineHeight: 1.8, fontSize: 14, marginBottom: 24
        }}
        dangerouslySetInnerHTML={{ __html: contract.content }}
      />

      {/* Chữ ký 2 bên */}
      <Divider orientation="left" style={{ color: '#64748b', fontSize: 13 }}>Chữ ký các bên</Divider>
      <Row gutter={24}>
        {/* Bên A — HOMS */}
        <Col span={12}>
          <div style={{
            border: '1px solid #e2e8f0', borderRadius: 10,
            padding: '20px 16px', textAlign: 'center', background: '#f8fafc'
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#0f172a', textTransform: 'uppercase' }}>
              Bên A — Đại diện HOMS
            </div>
            {(() => {
              // normalize: some records store full image, some only thumbnail
              const adminImg = adminSig?.signatureImage || adminSig?.signatureImageThumb;
              if (adminImg) {
                return (
                  <img
                    src={adminImg}
                    alt="Chữ ký HOMS"
                    style={{ maxWidth: 200, maxHeight: 80, border: '1px solid #ddd', borderRadius: 4, background: '#fff', padding: 4 }}
                  />
                );
              }
              return (
                <div style={{ width: '100%', height: 80, border: '1px dashed #cbd5e1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Chưa ký
                </div>
              );
            })()}
            <div style={{ marginTop: 10, fontWeight: 600, color: '#1e293b' }}>
              {adminSig?.signedByName || 'HOMS Vận Chuyển'}
            </div>
            {adminSignedAt && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                <CheckCircleOutlined style={{ color: '#10b981', marginRight: 4 }} />
                {adminSignedAt}
              </div>
            )}
          </div>
        </Col>

        {/* Bên B — Khách hàng */}
        <Col span={12}>
          <div style={{
            border: `1px solid ${contract.customerSignature?.signedAt ? '#bbf7d0' : '#e2e8f0'}`,
            borderRadius: 10, padding: '20px 16px', textAlign: 'center',
            background: contract.customerSignature?.signedAt ? '#f0fdf4' : '#f8fafc'
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#0f172a', textTransform: 'uppercase' }}>
              Bên B — Khách hàng
            </div>
            {contract.customerSignature?.signatureImageThumb ? (
              <img
                src={contract.customerSignature.signatureImageThumb}
                alt="Chữ ký khách hàng"
                style={{ maxWidth: 200, maxHeight: 80, border: '1px solid #ddd', borderRadius: 4, background: '#fff', padding: 4 }}
              />
            ) : (
              <div style={{ width: '100%', height: 80, border: '1px dashed #cbd5e1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                Chưa ký
              </div>
            )}
            <div style={{ marginTop: 10, fontWeight: 600, color: '#1e293b' }}>
              {contract.customerId?.fullName || 'Khách hàng'}
            </div>
            {customerSignedAt && (
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                {customerSignedAt}
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* Hash xác thực */}
      {contract.contentHash && (
        <div style={{ marginTop: 16, padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, fontSize: 11, color: '#94a3b8', wordBreak: 'break-all' }}>
          🔒 Mã xác thực SHA-256: {contract.contentHash}
        </div>
      )}
    </Modal>
  );
};

const MyContract = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ status: undefined, search: '' });
  const [stats, setStats] = useState({ total: 0, signed: 0, pending: 0, expired: 0 });
  const [selectedContract, setSelectedContract] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

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
            { title: 'Tổng hợp đồng', value: stats.total, icon: <FileTextOutlined />, color: '#3b82f6', bg: '#eff6ff' },
            { title: 'Đã ký', value: stats.signed, icon: <CheckCircleOutlined />, color: '#10b981', bg: '#ecfdf5' },
            { title: 'Chờ ký', value: stats.pending, icon: <ClockCircleOutlined />, color: '#f59e0b', bg: '#fffbeb' },
            { title: 'Hết hạn', value: stats.expired, icon: <ExclamationCircleOutlined />, color: '#ef4444', bg: '#fef2f2' },
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