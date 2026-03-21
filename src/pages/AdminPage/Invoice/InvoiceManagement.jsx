import React, { useEffect, useState, useRef } from 'react';
import { Card, Table, Input, Select, Space, Button, Drawer, Tag, Typography, notification, Spin, Tabs, Row, Col, Divider, Avatar, Statistic } from 'antd';
import {
  SearchOutlined,
  FolderOpenOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CarOutlined,
  CalendarOutlined,
  DollarCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  StarOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import adminInvoiceService from '../../../services/adminInvoiceService';

const { Title, Text } = Typography;
const { Option } = Select;

const primaryColor = '#44624A';

const InvoiceManagement = () => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5, total: 0 });
  // status is a single selected status value for filtering (keep simple like time order)
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [timeOrder, setTimeOrder] = useState('nearest'); // 'nearest' = gần nhất (most recent first), 'reverse' = ngược lại (oldest first)

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Payments tab local UI state: independent pagination, filters and sorting
  const [paymentsPagination, setPaymentsPagination] = useState({ current: 1, pageSize: 5, total: 0 });
  const [paymentsFilters, setPaymentsFilters] = useState({ amountRange: '', timeRange: '' });
  const [paymentsSorter, setPaymentsSorter] = useState({ field: null, order: null });

  // derived stats (revenue logic removed as requested)
  /*
  const computeRevenue = (list) => {
    if (!Array.isArray(list)) return 0;
    // Sum priceSnapshot.totalPrice (fallbacks) for invoices with paymentStatus PAID or PARTIAL
    return list.reduce((sum, inv) => {
      const status = inv?.paymentStatus;
      if (status !== 'PAID' && status !== 'PARTIAL') return sum;
      const v = Number(inv?.priceSnapshot?.totalPrice ?? inv?.total ?? inv?.amount ?? inv?.price ?? 0) || 0;
      return sum + v;
    }, 0);
  };
  */

  // Stub kept to avoid runtime errors where computeRevenue is referenced in the UI.
  // If you want to re-enable the original logic, uncomment the block above.
  const computeRevenue = (_list) => 0;

  const formatCurrency = (v) => {
    try {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
    } catch (e) {
      return (v || 0).toString();
    }
  };

  // helper: convert hex to rgba string
  const hexToRgba = (hex, alpha = 1) => {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };


  const fetchList = async (page = 1, limit = 5, currentFilters = filters) => {
    setLoading(true);
    try {
      const params = { page, limit, search: currentFilters.search, status: currentFilters.status };
      const res = await adminInvoiceService.getInvoices(params);
      let payload = res;
      if (res && res.success && res.data) payload = res.data;

      const rawInvoices = Array.isArray(payload.invoices) ? payload.invoices : [];
      const sortedInvoices = sortInvoicesByTime(rawInvoices, timeOrder);
      setInvoices(sortedInvoices);
      setPagination(prev => ({ ...prev, current: Number(payload.currentPage || page), pageSize: Number(payload.limit || limit), total: Number(payload.total || 0) }));
    } catch (err) {
      console.error('Failed to fetch invoices', err);
      notification.error({ message: 'Không thể lấy danh sách hóa đơn' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1, pagination.pageSize, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (val) => {
    const n = { ...filters, search: val };
    setFilters(n);
    fetchList(1, pagination.pageSize, n);
  };

  // Debounced live search while typing
  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (val) => {
    const nextFilters = { ...filters, search: val };
    setFilters(nextFilters);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    // debounce 400ms
    searchTimeoutRef.current = setTimeout(() => {
      fetchList(1, pagination.pageSize, nextFilters);
      searchTimeoutRef.current = null;
    }, 400);
  };

  // clear timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to sort invoices by timeline.updatedAt (most recent timeline entry) according to timeOrder
  const sortInvoicesByTime = (list, order) => {
    if (!Array.isArray(list)) return [];
    const copy = [...list];
    const getTimelineTime = (inv) => {
      // timeline is an array of { status, updatedBy, updatedAt, notes }
      if (Array.isArray(inv?.timeline) && inv.timeline.length) {
        // find the most recent updatedAt in timeline
        const times = inv.timeline.map(t => t && t.updatedAt ? new Date(t.updatedAt).getTime() : 0);
        return Math.max(...times);
      }
      // fallback to invoice.updatedAt or scheduledTime
      if (inv?.updatedAt) return new Date(inv.updatedAt).getTime();
      if (inv?.scheduledTime) return new Date(inv.scheduledTime).getTime();
      return 0;
    };

    copy.sort((a, b) => {
      const at = getTimelineTime(a);
      const bt = getTimelineTime(b);
      // 'nearest' means most recent first (descending)
      if (order === 'nearest') return bt - at;
      // 'reverse' means oldest first (ascending)
      return at - bt;
    });
    return copy;
  };

  const handleTimeOrderChange = (val) => {
    setTimeOrder(val);
    // reorder current invoices in UI without refetch
    setInvoices(prev => sortInvoicesByTime(prev, val));
  };

  const handleStatusFilter = (s) => {
    const n = { ...filters, status: s };
    setFilters(n);
    fetchList(1, pagination.pageSize, n);
  };

  const openDetail = async (record) => {
    setSelectedInvoice(null);
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await adminInvoiceService.getInvoiceById(record._id || record._id);
      let payload = res;
      if (res && res.success && res.data) payload = res.data;
      setSelectedInvoice(payload);
    } catch (e) {
      notification.error({ message: 'Không thể lấy chi tiết hóa đơn' });
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { title: 'Mã hóa đơn', dataIndex: 'code', key: 'code', width: 180, render: (text) => <Text strong style={{ color: primaryColor }}>{text}</Text> },
    { title: 'Khách hàng', dataIndex: ['customer', 'fullName'], key: 'customer', render: (t, r) => (t || r.customer?.email || '—') },
    { title: 'Địa chỉ lấy', dataIndex: ['pickup', 'address'], key: 'pickup', render: (t) => t || '—' },
    { title: 'Địa chỉ giao', dataIndex: ['delivery', 'address'], key: 'delivery', render: (t) => t || '—' },
  { title: 'Thời gian', dataIndex: 'lastTimelineUpdatedAt', key: 'lastTimelineUpdatedAt', width: 160, render: (d) => d ? new Date(d).toLocaleString() : '—' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 140, render: (s) => {
      const map = { COMPLETED: ['green','Hoàn thành'], CANCELLED: ['red','Đã hủy'], IN_PROGRESS: ['blue','Đang chạy'], ASSIGNED: ['gold','Đã phân công'], DRAFT: ['default','Nháp'] };
      const info = map[s] || ['default', s || '—'];
      return <Tag color={info[0]}>{info[1]}</Tag>;
    } },
    { title: 'Hành động', key: 'action', width: 120, render: (_, record) => (
      <Space>
        <Button icon={<FolderOpenOutlined />} onClick={() => openDetail(record)}>Xem</Button>
      </Space>
    ) }
  ];
  const tabItems = [
    {
      key: '1',
      label: (<span><FolderOpenOutlined style={{ marginRight: 8 }} />Hóa đơn</span>),
        children: (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Title level={4} style={{ margin: 0 }}>Quản lý hóa đơn</Title>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input.Search
                  className="invoice-search"
                  placeholder="Tìm mã hóa đơn"
                  onSearch={handleSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  allowClear
                  style={{ width: 280 }}
                  enterButton={<Button type="primary" style={{ background: primaryColor, borderColor: primaryColor, display: 'flex', alignItems: 'center', gap: 8 }} icon={<SearchOutlined />} />}
                />
                <Select
                  placeholder="Trạng thái"
                  style={{ width: 180 }}
                  allowClear
                  value={filters.status}
                  onChange={(val) => {
                    const n = { ...filters, status: val || '' };
                    setFilters(n);
                    setPagination(prev => ({ ...prev, current: 1 }));
                    fetchList(1, pagination.pageSize, n);
                  }}
                >
                  <Option value="">Tất cả</Option>
                  <Option value="COMPLETED">Hoàn thành</Option>
                  <Option value="CANCELLED">Đã hủy</Option>
                  <Option value="IN_PROGRESS">Đang chạy</Option>
                  <Option value="ASSIGNED">Đã phân công</Option>
                </Select>
                <Select value={timeOrder} onChange={handleTimeOrderChange} style={{ width: 140 }} size="middle">
                  <Option value="nearest">Gần đây</Option>
                  <Option value="reverse">Trễ nhất</Option>
                </Select>
              </div>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {/* Stat cards */}
              {(() => {
                const total = Number(pagination.total || 0);
                const completed = invoices.filter(i => i.status === 'COMPLETED').length;
                const inProgress = invoices.filter(i => i.status === 'IN_PROGRESS' || i.status === 'ASSIGNED').length;
                const revenueValue = computeRevenue(invoices || []);
                const avg = invoices.length ? Math.round(revenueValue / invoices.length) : 0;

                const statItems = [
                  { key: 'total', label: 'Tổng hóa đơn', value: total, color: '#2f8f6b', icon: <FolderOpenOutlined /> },
                  { key: 'revenue', label: 'Doanh thu', value: formatCurrency(revenueValue), color: '#d48806', icon: <DollarCircleOutlined /> },
                  { key: 'completed', label: 'Hoàn thành', value: completed, color: '#13c2c2', icon: <CheckCircleOutlined /> },
                  { key: 'inProgress', label: 'Chờ/Đang', value: inProgress, color: '#597ef7', icon: <BarChartOutlined /> },
                ];

                return statItems.map(item => {
                  const cardBg = hexToRgba(item.color, 0.06);
                  const borderColor = hexToRgba(item.color, 0.12);
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
                      <Card style={{ borderRadius: 10, minHeight: 92, background: cardBg, border: `1px solid ${borderColor}` }} bodyStyle={{ padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ color: '#888', fontSize: 13 }}>{item.label}</div>
                            <div style={{ fontWeight: 700, fontSize: 18, color: primaryColor }}>{item.value}</div>
                          </div>
                          <div>
                            <Avatar shape="square" size={40} style={{ background: item.color, color: '#fff' }}>{item.icon}</Avatar>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  );
                });
              })()}
            </Row>

            <Card style={{ borderRadius: 12 }}>
              <Table
                columns={columns}
                dataSource={invoices}
                rowKey={(r) => r._id}
                pagination={pagination}
                loading={loading}
                onChange={(pag) => { setPagination(prev => ({ ...prev, current: pag.current, pageSize: pag.pageSize })); fetchList(pag.current, pag.pageSize, filters); }}
              />
            </Card>
          </>
        )
    },
    {
      key: '2',
      label: (<span><DollarCircleOutlined style={{ marginRight: 8 }} />Thanh toán</span>),
      children: (() => {
  const revenue = computeRevenue(invoices || []);
  const avg = invoices.length ? Math.round((computeRevenue(invoices || []) / invoices.length) || 0) : 0; // keep local avg based on current page
        // compute top 5 locally for the left column (visual)
        const topInvoices = [...(invoices || [])]
          .map(i => ({ ...i, _value: Number(i.total ?? i.amount ?? i.price ?? 0) || 0 }))
          .sort((a, b) => b._value - a._value)
          .slice(0, 5);

        // Payments tab: full table (paginated) with client-side sort & filter controls
        const count = Number(pagination.total || 0);
        const completed = invoices.filter(i => i.status === 'COMPLETED').length;

        // Apply payments filters (amountRange/timeRange) to the current invoices array
        const applyPaymentsFilters = (list) => {
          let out = [...list];
          // amountRange values: 'lt100k','100k-1m','1m-10m','gt10m',''
          const ar = paymentsFilters.amountRange;
          if (ar) {
            out = out.filter(i => {
              const v = Number(i.total ?? i.amount ?? i.price ?? 0) || 0;
              switch (ar) {
                case 'lt100k': return v < 100000;
                case '100k-1m': return v >= 100000 && v < 1000000;
                case '1m-10m': return v >= 1000000 && v < 10000000;
                case 'gt10m': return v >= 10000000;
                default: return true;
              }
            });
          }

          // timeRange values: '7d','30d','90d','all'
          const tr = paymentsFilters.timeRange;
          if (tr && tr !== 'all') {
            const now = Date.now();
            let cutoff = 0;
            if (tr === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;
            if (tr === '30d') cutoff = now - 30 * 24 * 60 * 60 * 1000;
            if (tr === '90d') cutoff = now - 90 * 24 * 60 * 60 * 1000;
            out = out.filter(i => {
              const t = i.lastTimelineUpdatedAt ? new Date(i.lastTimelineUpdatedAt).getTime() : 0;
              return t >= cutoff;
            });
          }

          return out;
        };

        // Apply sorter (paymentsSorter) to a list
        const applyPaymentsSorter = (list) => {
          const { field, order } = paymentsSorter;
          if (!field || !order) return list;
          const sorted = [...list].sort((a, b) => {
            let av = a[field];
            let bv = b[field];
            if (field === '_value') { av = Number(a.total ?? a.amount ?? a.price ?? 0) || 0; bv = Number(b.total ?? b.amount ?? b.price ?? 0) || 0; }
            if (field === 'lastTimelineUpdatedAt') { av = a.lastTimelineUpdatedAt ? new Date(a.lastTimelineUpdatedAt).getTime() : 0; bv = b.lastTimelineUpdatedAt ? new Date(b.lastTimelineUpdatedAt).getTime() : 0; }
            if (av < bv) return order === 'ascend' ? -1 : 1;
            if (av > bv) return order === 'ascend' ? 1 : -1;
            return 0;
          });
          return sorted;
        };

        // derive final payments table data and pagination
        const paymentsSourceAll = applyPaymentsFilters(invoices.map(i => ({ ...i, _value: Number(i.total ?? i.amount ?? i.price ?? 0) || 0 })));
        const paymentsSourceSorted = applyPaymentsSorter(paymentsSourceAll);
        const paymentsTotal = paymentsSourceSorted.length;
        const pcur = paymentsPagination.current || 1;
        const psize = paymentsPagination.pageSize || 5;
        const paymentsPaged = paymentsSourceSorted.slice((pcur - 1) * psize, pcur * psize);

        const handlePaymentsTableChange = (pag, filtersArg, sorter) => {
          // update local pagination and sorter
          setPaymentsPagination(prev => ({ ...prev, current: pag.current, pageSize: pag.pageSize }));
          if (sorter && sorter.field) setPaymentsSorter({ field: sorter.field, order: sorter.order });
        };

        const handlePaymentsFilterChange = (k, v) => {
          const next = { ...paymentsFilters, [k]: v };
          setPaymentsFilters(next);
          // reset page to 1 when filters change
          setPaymentsPagination(prev => ({ ...prev, current: 1 }));
        };

        return (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
              <Col xs={24} md={16}>
                <Card style={{ borderRadius: 12, background: primaryColor, color: '#fff' }} bodyStyle={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>Tổng doanh thu</div>
                      <div style={{ color: '#fff', fontSize: 36, fontWeight: 800, marginTop: 6 }}>{formatCurrency(revenue)}</div>
                      <div style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8 }}>Tổng doanh thu từ các hóa đơn hiển thị</div>
                    </div>
                    <div>
                      <Avatar size={72} style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                        <DollarCircleOutlined style={{ fontSize: 32 }} />
                      </Avatar>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Row gutter={[12, 12]}>
                  <Col span={24}>
                    <Card style={{ borderRadius: 8 }} size="small">
                      <Statistic title="Số hóa đơn" value={count} valueStyle={{ color: primaryColor, fontWeight: 700 }} />
                    </Card>
                  </Col>
                  <Col span={24}>
                    <Card style={{ borderRadius: 8 }} size="small">
                      <Statistic title="Hoàn thành" value={completed} valueStyle={{ color: primaryColor, fontWeight: 700 }} />
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>

            <Divider />

            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: '#666' }}>Top hóa đơn theo giá trị</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Select size="small" style={{ width: 180 }} value={paymentsFilters.amountRange} onChange={(v) => handlePaymentsFilterChange('amountRange', v)} allowClear placeholder="Lọc theo số tiền">
                    <Option value="lt100k">Dưới 100.000₫</Option>
                    <Option value="100k-1m">100.000₫ - 1.000.000₫</Option>
                    <Option value="1m-10m">1.000.000₫ - 10.000.000₫</Option>
                    <Option value="gt10m">Trên 10.000.000₫</Option>
                  </Select>
                  <Select size="small" style={{ width: 160 }} value={paymentsFilters.timeRange} onChange={(v) => handlePaymentsFilterChange('timeRange', v)} allowClear placeholder="Lọc theo thời gian">
                    <Option value="all">Tất cả</Option>
                    <Option value="7d">7 ngày</Option>
                    <Option value="30d">30 ngày</Option>
                    <Option value="90d">90 ngày</Option>
                  </Select>
                </div>
              </div>

              {/* Layout: left = top list (compact cards with progress), right = detailed full table (paginated + sortable) */}
              <Row gutter={[12, 12]}>
                <Col xs={24} md={10}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {topInvoices.length ? (() => {
                      const max = Math.max(...topInvoices.map(t => t._value), 1);
                      return topInvoices.map((inv, idx) => (
                        <Card key={inv._id || idx} size="small" style={{ borderRadius: 8 }} className="top-invoice-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Avatar style={{ background: idx === 0 ? '#ffd666' : primaryColor, color: '#fff' }}>{idx + 1}</Avatar>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 700 }}>{inv.code || '—'}</div>
                                <div style={{ fontWeight: 700, color: primaryColor }}>{formatCurrency(inv._value)}</div>
                              </div>
                              <div style={{ color: '#888', fontSize: 12 }}>{inv.customer?.fullName || inv.customer?.email || 'Khách hàng'}</div>
                              <div style={{ height: 8, background: '#f0f0f0', borderRadius: 8, marginTop: 8, overflow: 'hidden' }}>
                                <div className="top-invoice-progress" style={{ width: `${Math.round((inv._value / max) * 100)}%`, height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${hexToRgba(primaryColor,0.9)}, ${hexToRgba(primaryColor,0.6)})` }} />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ));
                    })() : <div style={{ color: '#999' }}>Không có dữ liệu</div>}
                  </div>
                </Col>

                <Col xs={24} md={14}>
                  <Card size="small" style={{ borderRadius: 8 }}>
                    <Table
                      size="small"
                      columns={[
                        { title: 'Rank', dataIndex: 'rank', key: 'rank', width: 60, render: (r) => <strong>{r}</strong> },
                        { title: 'Mã', dataIndex: 'code', key: 'code', render: (c) => <Text strong>{c}</Text> },
                        { title: 'Khách hàng', dataIndex: ['customer', 'fullName'], key: 'customer', render: (t, r) => (t || r.customer?.email || '—') },
                        { title: 'Số tiền', dataIndex: '_value', key: '_value', sorter: true, render: (v, r) => <span style={{ color: primaryColor, fontWeight: 700 }}>{formatCurrency(Number(r.total ?? r.amount ?? r.price ?? v) || 0)}</span> },
                        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s) => {
                            const map = { COMPLETED: ['green','Hoàn thành'], CANCELLED: ['red','Đã hủy'], IN_PROGRESS: ['blue','Đang chạy'], ASSIGNED: ['gold','Đã phân công'], DRAFT: ['default','Nháp'] };
                            const info = map[s] || ['default', s || '—'];
                            return <Tag color={info[0]}>{info[1]}</Tag>;
                          } },
                        { title: 'Thời gian', dataIndex: 'lastTimelineUpdatedAt', key: 'lastTimelineUpdatedAt', sorter: true, render: (d) => d ? new Date(d).toLocaleString() : '—' },
                        { title: 'Hành động', key: 'action', render: (_, record) => (<Button size="small" onClick={() => openDetail(record)}>Xem</Button>) }
                      ]}
                      dataSource={paymentsPaged.map((inv, idx) => ({ ...inv, rank: (paymentsPagination.current - 1) * paymentsPagination.pageSize + idx + 1 }))}
                      pagination={{ current: paymentsPagination.current, pageSize: paymentsPagination.pageSize, total: paymentsTotal, showSizeChanger: true }}
                      onChange={(pag, filtersArg, sorter) => handlePaymentsTableChange(pag, filtersArg, sorter)}
                      rowKey={(r) => r._id}
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          </>
        );
      })()
    }
  ];

  return (
    <div style={{ padding: 22 }}>
      <style>{`
        .invoices-kpi { display:flex; gap:12px; margin-bottom:12px }
        .invoice-tile { flex:1; padding:12px; border-radius:8px; background:#fff; box-shadow:0 6px 18px rgba(0,0,0,0.04) }
        .invoice-key { color:#888; font-size:13px }
        .invoice-val { font-weight:700; font-size:18px; color:${primaryColor} }

        /* Tabs styling to match primary color */
        .invoice-tabs .ant-tabs-ink-bar { background: ${primaryColor} !important; }
        .invoice-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: ${primaryColor} !important; }
        /* ensure hover on tab label uses primary color */
        .invoice-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn { color: ${primaryColor} !important; }

        /* Search input/button styling */
        .invoice-search .ant-input-affix-wrapper { border-color: ${primaryColor} !important; }
        .invoice-search .ant-input { color: rgba(0,0,0,0.85); }
        .invoice-search .ant-btn { background: ${primaryColor} !important; border-color: ${primaryColor} !important; color: #fff !important; }
        /* Top invoice list visuals */
        .top-invoice-card { transition: transform .14s ease, box-shadow .14s ease; }
        .top-invoice-card:hover { transform: translateY(-6px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .top-invoice-progress { transition: width .6s ease; border-radius: 8px; }
      `}</style>

      <Card style={{ borderRadius: 12 }}>
        <Tabs defaultActiveKey="1" items={tabItems} className="invoice-tabs" />
      </Card>

      <Drawer
        title="Chi tiết hóa đơn"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={700}
      >
        {detailLoading || !selectedInvoice ? (
          <div style={{ textAlign: 'center', padding: 20 }}><Spin /> Đang tải...</div>
        ) : (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: primaryColor }}>{selectedInvoice.code}</div>
              <div style={{ color: '#666' }}>Chi tiết đơn hàng vận chuyển</div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#888', marginBottom: 6 }}><EnvironmentOutlined /> Địa chỉ lấy</div>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.pickup?.address || '—'}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#888', marginBottom: 6 }}><EnvironmentOutlined /> Địa chỉ giao</div>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.delivery?.address || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#888', marginBottom: 6 }}><UserOutlined /> Khách hàng</div>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.customer?.fullName || selectedInvoice.customer?.email || '—'}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#888', marginBottom: 6 }}><CarOutlined /> Xe/Tài xế</div>
                <div style={{ fontWeight: 600 }}>{(selectedInvoice.assignedVehicles || []).map(v => v.plateNumber).join(', ') || '—'}</div>
              </div>
            </div>

            <div style={{ color: '#888', marginBottom: 6 }}><CalendarOutlined /> Thời gian</div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>{selectedInvoice.lastTimelineUpdatedAt ? new Date(selectedInvoice.lastTimelineUpdatedAt).toLocaleString() : '—'}</div>

            <div style={{ marginTop: 6 }}>
              <Text strong>Ghi chú</Text>
              <div style={{ marginTop: 8 }}>{selectedInvoice.notes || '—'}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default InvoiceManagement;