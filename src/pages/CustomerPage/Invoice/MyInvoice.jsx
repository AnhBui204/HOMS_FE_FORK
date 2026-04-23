import React, { useEffect, useState, useRef } from 'react';
import { Card, Table, Button, Modal, Typography, Tag, Space, Spin, notification, Descriptions, Divider, Row, Col, Statistic, Empty, Input, Select, Tooltip } from 'antd';
import { EyeOutlined, FileTextOutlined, FileTextFilled, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import AppHeader from '../../../components/header/header';
import invoiceService from '../../../services/invoiceService';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const statusColorMap = {
  DRAFT: 'default',
  CONFIRMED: 'blue',
  ASSIGNED: 'cyan',
  ACCEPTED: 'processing',
  IN_PROGRESS: 'gold',
  COMPLETED: 'green',
  CANCELLED: 'red'
};

const statusTextMap = {
  DRAFT: 'Nháp',
  CONFIRMED: 'Đã xác nhận',
  ASSIGNED: 'Đã phân công',
  ACCEPTED: 'Đã chấp nhận',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

const MyInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0 });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ status: undefined, search: '' });
  const searchDebounceRef = useRef(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchInvoices = async (page = 1, pageSize = 10, currentFilters = filters) => {
    setLoading(true);
    try {
  // enforce pageSize 10 regardless of callers
  const enforcedPageSize = 10;
  // backend expects skip & limit (skip = (page-1)*limit)
  const skip = Math.max(0, (Number(page) - 1) * enforcedPageSize);
  const params = { skip, limit: enforcedPageSize, ...(currentFilters.search && { search: currentFilters.search }), ...(currentFilters.status && { status: currentFilters.status }) };
      const resp = await invoiceService.getInvoices(params);
      // payload shape may be { success, data } or direct array
      let payload = resp;
      if (resp && resp.success && resp.data) payload = resp.data;

      const data = Array.isArray(payload) ? payload : (Array.isArray(payload) ? payload : payload);
      // backend returns array for listInvoices; try to derive meta
  const totalFromPayload = (payload && payload.total) || (payload && payload.totalInvoices) || null;

  const list = Array.isArray(payload) ? payload : (payload.invoices || payload.data || []);
  setInvoices(list);
  // update pagination (pageSize fixed to 10). Only set total if server provided it; otherwise leave it to fetchStats
  setPagination(prev => ({ ...prev, current: Number(payload.currentPage || page), pageSize: 10, total: totalFromPayload != null ? Number(totalFromPayload) : prev.total }));

      // compute stats from the full filtered dataset (not only current page)
      fetchStats(currentFilters);
    } catch (err) {
      console.error('Error loading invoices', err);
      notification.error({ message: 'Không thể tải danh sách hóa đơn' });
    } finally {
      setLoading(false);
    }
  };

  // fetch stats based on current filters by retrieving all matching invoices (large limit)
  const fetchStats = async (currentFilters = filters) => {
    try {
      // request a large page to approximate full result set for stats
      // backend expects skip & limit (skip = offset)
      const resp = await invoiceService.getInvoices({ skip: 0, limit: 10000, ...(currentFilters.search && { search: currentFilters.search }), ...(currentFilters.status && { status: currentFilters.status }) });
      let payload = resp;
      if (resp && resp.success && resp.data) payload = resp.data;
      const list = Array.isArray(payload) ? payload : (payload.invoices || payload.data || []);
      const totalCount = Array.isArray(list) ? list.length : 0;
      const paidCount = Array.isArray(list) ? list.filter(i => (i.status === 'COMPLETED' || (i.paymentStatus || '').toUpperCase() === 'PAID' || (i.priceSnapshot && i.priceSnapshot.paidAmount))).length : 0;
      const unpaidCount = totalCount - paidCount;
  setStats({ total: totalCount, paid: paidCount, unpaid: unpaidCount });
  // also update pagination total so table shows correct number of pages
  setPagination(prev => ({ ...prev, total: totalCount }));
    } catch (err) {
      // silently ignore stats errors
      // console.warn('Failed to compute invoice stats', err);
    }
  };

  useEffect(() => {
    fetchInvoices(pagination.current, pagination.pageSize, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search input: when filters.search changes, wait 300ms before fetching
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      // reset to first page when search changes
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchInvoices(1, pagination.pageSize, filters);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.status]);

  const openInvoice = async (id) => {
    try {
      setSelectedInvoice(null);
      setModalVisible(true);
      const resp = await invoiceService.getInvoiceById(id);
      let payload = resp;
      if (resp && resp.success && resp.data) payload = resp.data;
      setSelectedInvoice(payload);
    } catch (err) {
      console.error('Failed to load invoice', err);
      setModalVisible(false);
      notification.error({ message: 'Không thể tải hóa đơn' });
    }
  };

  const columns = [
    { title: 'Mã hóa đơn', dataIndex: 'code', key: 'code', render: (t) => <Text strong>{t}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: s => <Tag color={statusColorMap[s] || 'default'}>{statusTextMap[s] || s}</Tag> },
    { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', render: d => d ? new Date(d).toLocaleString() : '—' },
    { title: 'Hành động', key: 'action', render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openInvoice(record._id || record.id)}>Xem</Button>
        </Space>
      ) }
  ];

  return (
    <>
      <AppHeader />
      <div style={{ padding: 24, background: '#f1f5f9', minHeight: '100vh' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
            <FileTextOutlined style={{ marginRight: 10, color: '#3b82f6' }} />
            Hóa đơn của tôi
          </Title>
          <Text type="secondary">Danh sách các hóa đơn liên quan đến tài khoản của bạn</Text>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {[
            { title: 'Tổng hóa đơn', value: stats.total, icon: <FileTextFilled />, color: '#3b82f6', bg: '#eff6ff' },
            { title: 'Đã thanh toán', value: stats.paid, icon: <CheckCircleOutlined />, color: '#10b981', bg: '#ecfdf5' },
            { title: 'Chưa thanh toán', value: stats.unpaid, icon: <FileTextOutlined />, color: '#f59e0b', bg: '#fffbeb' },
          ].map((s) => (
            <Col xs={24} sm={12} md={8} key={s.title}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileTextOutlined style={{ fontSize: 20, color: '#44624A' }} />
                <div>
                  <Title level={4} style={{ margin: 0 }}>Danh sách hóa đơn</Title>
                  <Text type="secondary">Quản lý và xem chi tiết hóa đơn của bạn</Text>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <Search
                  placeholder="Tìm theo mã hóa đơn..."
                  allowClear
                  style={{ width: 240 }}
                  value={filters.search}
                  onChange={(e) => {
                    const f = { ...filters, search: e.target.value };
                    setFilters(f);
                  }}
                  onSearch={(val) => {
                    const f = { ...filters, search: val };
                    setFilters(f);
                    fetchInvoices(1, pagination.pageSize, f);
                  }}
                />

                <Select
                  placeholder="Lọc trạng thái" allowClear style={{ width: 160 }}
                  value={filters.status}
                  onChange={(val) => {
                    const f = { ...filters, status: val };
                    setFilters(f);
                    fetchInvoices(1, pagination.pageSize, f);
                  }}
                >
                  {Object.keys(statusColorMap).map((key) => (
                    <Option value={key} key={key}><Text>{statusTextMap[key] || key}</Text></Option>
                  ))}
                </Select>

                <Tooltip title="Làm mới">
                  <Button icon={<SyncOutlined />} onClick={() => fetchInvoices(1, pagination.pageSize, filters)} />
                </Tooltip>
              </div>
          </div>

          <div style={{ padding: 20 }}>
            <Table
              columns={columns}
              dataSource={invoices}
              rowKey={(r) => r._id}
              loading={loading}
              pagination={pagination}
              onChange={(pag) => { setPagination(prev => ({ ...prev, current: pag.current, pageSize: pag.pageSize })); fetchInvoices(pag.current, pag.pageSize, filters); }}
            />
          </div>
        </Card>

        <Modal
          title={`Hóa đơn ${selectedInvoice?.code || ''}`}
          open={modalVisible}
          onCancel={() => { setModalVisible(false); setSelectedInvoice(null); }}
          footer={null}
          width={860}
          centered
        >
          {!selectedInvoice ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : (
            (() => {
            // normalize selectedInvoice into data shape similar to admin einvoice
            const data = {
              company: { name: 'HOMS Company', email: 'homsmovinghouse@gmail.com', logo: null },
              invoice: { code: selectedInvoice.code, date: selectedInvoice.createdAt, status: selectedInvoice.status },
              customer: { fullName: selectedInvoice.customerId?.fullName || selectedInvoice.customerId?.name || '—', phone: selectedInvoice.customerId?.phone, email: selectedInvoice.customerId?.email },
              delivery: { address: selectedInvoice.requestTicketId?.delivery?.address || selectedInvoice.delivery?.address || '—' },
              pickup: { address: selectedInvoice.requestTicketId?.pickup?.address || selectedInvoice.pickup?.address || '—' },
              items: [{ id: 'summary', description: 'Dịch vụ vận chuyển', quantity: 1, unitPrice: selectedInvoice.priceSnapshot?.totalPrice || 0, total: selectedInvoice.priceSnapshot?.totalPrice || 0 }],
              totals: {
                subtotal: selectedInvoice.priceSnapshot?.totalPrice || 0,
                discount: selectedInvoice.priceSnapshot?.discount || 0,
                tax: selectedInvoice.priceSnapshot?.tax || 0,
                total: selectedInvoice.priceSnapshot?.totalAfterPromotion || selectedInvoice.priceSnapshot?.totalPrice || 0,
                paidAmount: selectedInvoice.paidAmount || 0
              },
              notes: selectedInvoice.notes || ''
            };

            const primaryColor = '#44624A';
            const hexToRgba = (hex, alpha = 1) => {
              if (!hex) return `rgba(0,0,0,${alpha})`;
              const cleaned = hex.replace('#', '');
              const bigint = parseInt(cleaned, 16);
              const r = (bigint >> 16) & 255;
              const g = (bigint >> 8) & 255;
              const b = bigint & 255;
              return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };

            const formatCurrency = (v) => v != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v)) : '—';

            const columnsItems = [
              { title: 'Mục', dataIndex: 'description', key: 'description' },
              { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' },
              { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', width: 140, align: 'right', render: v => formatCurrency(v) },
              { title: 'Thành tiền', dataIndex: 'total', key: 'total', width: 160, align: 'right', render: v => formatCurrency(v) }
            ];

            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* company logo or avatar */}
                    <div style={{ width: 72, height: 72, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: primaryColor, fontWeight: 700 }}>{(data.company?.name || 'HOMS').slice(0,1)}</div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{data.company?.name || 'HOMS'}</div>
                      <div style={{ marginTop: 6, color: '#444' }}>{data.company?.address ? data.company.address : data.company?.email}</div>
                      <div style={{ marginTop: 4, color: '#666' }}>{data.company?.phone ? `${data.company.phone}` : ''}{data.company?.email ? ` • ${data.company.email}` : ''}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 220 }}>
                    <div style={{ background: hexToRgba(primaryColor, 0.06), padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: primaryColor }}>HÓA ĐƠN</div>
                      <div style={{ marginTop: 8 }}>Mã: <Text strong>{data.invoice?.code}</Text></div>
                      <div>Ngày: <Text>{data.invoice?.date ? new Date(data.invoice.date).toLocaleString() : '—'}</Text></div>
                      {data.invoice?.status ? (
                        <div style={{ marginTop: 8 }}>
                          <Tag color={statusColorMap[data.invoice.status] || 'blue'}>
                            {statusTextMap[data.invoice.status] || data.invoice.status}
                          </Tag>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <Divider />

                <div style={{ display: 'flex', gap: 24, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Thông tin khách hàng</div>
                    <div style={{ marginTop: 6, fontWeight: 700 }}>{data.customer?.fullName}</div>
                    <div style={{ color: '#666', marginTop: 4 }}>{data.customer?.phone || ''} {data.customer?.email ? `• ${data.customer.email}` : ''}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Địa chỉ</div>
                    <div style={{ marginTop: 6 }}><div><strong>Nhận:</strong> {data.delivery?.address}</div><div style={{ marginTop: 6 }}><strong>Lấy:</strong> {data.pickup?.address}</div></div>
                  </div>
                </div>

                <Table
                  columns={columnsItems}
                  dataSource={(Array.isArray(data.items) ? data.items : []).map((it, idx) => ({ ...it, key: it.id || idx }))}
                  rowKey={r => r.id || r.key}
                  pagination={false}
                  bordered
                  style={{ marginTop: 12 }}
                  size="small"
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    {data.notes ? (
                      <div style={{ fontSize: 13, color: '#444' }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Ghi chú</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{data.notes}</div>
                      </div>
                    ) : null}
                  </div>

                  <div style={{ width: 340 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>Tạm tính</div>
                      <div>{formatCurrency(data.totals?.subtotal)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>Giảm giá</div>
                      <div>{formatCurrency(data.totals?.discount)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>Thuế (VAT)</div>
                      <div>{formatCurrency(data.totals?.tax)}</div>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
                      <div>Tổng cộng</div>
                      <div>{formatCurrency(data.totals?.total)}</div>
                    </div>
                    {(() => {
                      const payStatus = selectedInvoice.paymentStatus || (selectedInvoice.priceSnapshot?.paidAmount ? 'PAID' : 'UNPAID');
                      const map = { PAID: ['green', 'Đã thanh toán'], PARTIAL: ['orange', 'Thanh toán một phần'], UNPAID: ['default', 'Chưa thanh toán'] };
                      const info = map[payStatus] || ['default', String(payStatus)];
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                          <div>Trạng thái thanh toán</div>
                          <div>{info[0] === 'default' ? <Tag>{info[1]}</Tag> : <Tag color={info[0]}>{info[1]}</Tag>}</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <Divider />
              </div>
            );
          })()
        )}
      </Modal>
    </div>
    </>
  );
};

export default MyInvoice;
