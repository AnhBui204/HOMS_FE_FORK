import React, { useState, useMemo, useEffect } from 'react';
import { Row, Col, Card, Tabs, Table, Tag, Select, Button, Space, DatePicker, Input, Statistic } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ShopOutlined, FacebookOutlined, FilterOutlined, SearchOutlined, ShoppingCartOutlined, DollarCircleOutlined, LineChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import adminOrderService from '../../../services/admin/adminOrderService';
import { Card as AntCard } from 'antd';
import OrderDetailModal from './OrderDetailModal';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const primaryColor = '#44624A';

// Orders are fetched from the server and stored in `ordersData`.

const STATUS_LABELS = {
  CREATED: 'Chờ xử lý',
  QUOTED: 'Đã báo giá',
  ACCEPTED: 'Đã nhận',
  CONVERTED: 'Đã hoàn thành',
  CANCELLED: 'Đã huỷ'
};

const currency = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v || 0));

const OrderManagement = () => {
  const [activeTab, setActiveTab] = useState('web');
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()]);
  const [searchText, setSearchText] = useState('');
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [charts, setCharts] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // derive source filter from active tab
  const sourceFilter = activeTab === 'web' ? 'WEB' : 'FACEBOOK';

  // Use server data only. If empty, table will show no rows.
  const baseOrders = Array.isArray(ordersData) ? ordersData : [];

  const filtered = baseOrders.filter(o => {
    // ensure source matches the selected tab
    if (o.source && o.source !== sourceFilter) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    if (dateRange && dateRange.length === 2) {
      const from = dayjs(dateRange[0]).startOf('day');
      const to = dayjs(dateRange[1]).endOf('day');
      const d = dayjs(o.createdAt);
      // use isBefore/isAfter available in core
      if (d.isBefore(from) || d.isAfter(to)) return false;
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      const hay = `${o.code || ''} ${o.customer || ''} ${o.phone || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Fetch function
  const fetchOrders = async (opts = {}) => {
    setLoading(true);
    try {
      const params = {
        page: opts.page || page,
        limit: opts.limit || limit,
        status: statusFilter,
        search: searchText,
      };
      if (dateRange && dateRange.length === 2) {
        params.from = dayjs(dateRange[0]).startOf('day').toISOString();
        params.to = dayjs(dateRange[1]).endOf('day').toISOString();
      }
      // include source so backend can filter if implemented server-side
      params.source = sourceFilter;

      // fetch paginated items
      const resp = await adminOrderService.fetchAdminOrders(params);
      if (resp && resp.items) {
        setOrdersData(resp.items);
        setTotal(resp.total || 0);
        setPage(resp.page || params.page || 1);
        setLimit(resp.limit || params.limit || limit);
      } else {
        // fallback: empty
        setOrdersData([]);
        setTotal(0);
      }

      // fetch summary (metrics + charts) independently so charts are not page-limited
      try {
        const summaryParams = { ...params, summary: true, page: 1, limit: 1 };
        const summaryResp = await adminOrderService.fetchAdminOrders(summaryParams);
        if (summaryResp) {
          if (summaryResp.metrics) setMetrics(summaryResp.metrics);
          if (summaryResp.charts) setCharts(summaryResp.charts);
        }
      } catch (e) {
        // ignore summary errors
        // eslint-disable-next-line no-console
        console.warn('summary fetch failed', e);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('fetchOrders error', err);
    } finally {
      setLoading(false);
    }
  };

  // refetch when filters, tab, or pagination change
  useEffect(() => {
    // when tab or filters change, reset to page 1
    setPage(1);
    fetchOrders({ page: 1, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter, dateRange, searchText]);

  useEffect(() => {
    // fetch when page/limit change
    fetchOrders({ page, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const kpi = useMemo(() => {
    if (metrics) {
      return {
        totalOrders: metrics.totalOrders || 0,
        totalValue: metrics.totalValue || 0,
        avg: metrics.avg || 0,
        conversionRate: metrics.conversionRate || 0
      };
    }
    const totalOrders = filtered.length;
    const totalValue = filtered.reduce((s, it) => s + (it.totalPrice || 0), 0);
    const avg = totalOrders ? Math.round(totalValue / totalOrders) : 0;
    const converted = filtered.filter(f => f.status === 'CONVERTED').length;
    const conversionRate = totalOrders ? Math.round((converted / totalOrders) * 100) : 0;
    return { totalOrders, totalValue, avg, conversionRate };
  }, [filtered, metrics]);

  const timeseries = useMemo(() => {
    if (charts && Array.isArray(charts.timeseries)) {
      return charts.timeseries.map(t => ({ date: dayjs(t.date).format('DD MMM'), count: t.count, value: t.value }));
    }
    // group by day
    const groups = {};
    filtered.forEach(o => {
      const d = dayjs(o.createdAt).format('DD MMM');
      groups[d] = groups[d] || { date: d, count: 0, value: 0 };
      groups[d].count++;
      groups[d].value += o.totalPrice || 0;
    });
    return Object.values(groups).reverse();
  }, [filtered, charts]);

  const statusDistribution = useMemo(() => {
    if (charts && Array.isArray(charts.statusDistribution)) {
      return charts.statusDistribution.map(s => ({ name: STATUS_LABELS[s.name] || s.name, value: s.value }));
    }
    const map = {};
    filtered.forEach(o => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.keys(map).map(k => ({ name: STATUS_LABELS[k] || k, value: map[k] }));
  }, [filtered, charts]);

  // Custom tooltip for pie status chart
  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload; // our data contains name, value, notes
    return (
      <div style={{ background: '#fff', padding: 10, border: '1px solid #eee', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ fontWeight: 700 }}>{`${data.name} - ${data.value}`}</div>
      </div>
    );
  };


  const columns = [
    { title: 'Mã đơn', dataIndex: 'code', key: 'code', render: c => <strong>{c}</strong> },
    { title: 'Ngày', dataIndex: 'createdAt', key: 'createdAt', render: d => dayjs(d).format('DD/MM/YYYY HH:mm') },
    { title: 'Khách hàng', dataIndex: 'customer', key: 'customer' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', render: s => {
        const color = s === 'CONVERTED' ? 'green' : s === 'CANCELLED' ? 'red' : 'gold';
        const labelMap = {
          CREATED: 'Chờ xử lý',
          QUOTED: 'Đã báo giá',
          ACCEPTED: 'Đã nhận',
          CONVERTED: 'Đã hoàn thành',
          CANCELLED: 'Đã huỷ'
        };
        const label = labelMap[s] || s;
        return <Tag color={color}>{label}</Tag>;
      }
    },
    { title: 'Tổng tiền', dataIndex: 'totalPrice', key: 'totalPrice', render: v => <span style={{ fontWeight: 700 }}>{currency(v)}</span> },
    {
      title: 'Hành động', key: 'action', render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => { setDetailOrder(record); setDetailVisible(true); }}
            style={{ background: '#fff', color: primaryColor, border: `1px solid ${primaryColor}` }}
          >
            Xem
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ textAlign: 'left' }}>
      <style>{`
        .om-kpi { border-radius: 12px; }
        .om-filter-btn { background: #fff; color: ${primaryColor}; border: 1px solid ${primaryColor}; }
        .om-filter-btn:hover { background: ${primaryColor}; color: #fff; }

        /* Tabs: inactive tabs - light gray background and darker gray text; active tab - white background */
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab {
          background: #f5f5f5; /* light gray */
          color: rgba(0,0,0,0.65); /* darker gray text */
          padding: 8px 14px;
          margin-right: 8px;
          border-radius: 8px 8px 0 0;
        }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab .anticon {
          margin-right: 6px;
          color: rgba(0,0,0,0.45);
        }

        /* Active tab: white background, primary color text & icons */
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active {
          background: #fff !important;
        }
        /* Force the tab label text and any inner spans/buttons to primary color */
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active,
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn,
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn span,
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn div,
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn a,
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn button {
          color: ${primaryColor} !important;
          fill: ${primaryColor} !important;
          stroke: ${primaryColor} !important;
        }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .anticon {
          color: ${primaryColor} !important;
        }

        /* small underline for selected tab */
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active::after {
          content: '';
          display: block;
          height: 3px;
          background: ${primaryColor};
          border-radius: 3px 3px 0 0;
          margin-top: 8px;
        }
      `}</style>

      <Card style={{ borderRadius: 12, marginBottom: 16 }} title={<strong>Quản lý đơn hàng</strong>} extra={<Space>
      </Space>}>
        <Tabs defaultActiveKey="web" activeKey={activeTab} onChange={setActiveTab} type="card">
          <TabPane tab={<span><ShopOutlined /> Đơn Web</span>} key="web">
            {/* Filters row */}
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              <Col xs={24} lg={6}>
                <Select allowClear style={{ width: '100%' }} placeholder="Trạng thái" value={statusFilter} onChange={setStatusFilter}>
                  <Select.Option value="CREATED">Chờ xử lý</Select.Option>
                  <Select.Option value="QUOTED">Đã báo giá</Select.Option>
                  <Select.Option value="ACCEPTED">Đã nhận</Select.Option>
                  <Select.Option value="CONVERTED">Đã hoàn thành</Select.Option>
                  <Select.Option value="CANCELLED">Đã huỷ</Select.Option>
                </Select>
              </Col>

              <Col xs={24} lg={8}>
                <RangePicker value={dateRange} onChange={(r) => setDateRange(r)} style={{ width: '100%' }} />
              </Col>
              <Col xs={24} lg={4}>
                <Input prefix={<SearchOutlined />} placeholder="Tìm mã/khách/sđt" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
              </Col>
            </Row>

            <Row gutter={[12, 12]}>
              <Col xs={24} lg={6}>
                <Card className="om-kpi" style={{ borderRadius: 12, background: '#f3faf3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Statistic title="Tổng đơn" value={kpi.totalOrders} />
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e6f3e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShoppingCartOutlined style={{ color: '#2f7a44', fontSize: 22 }} />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={6}>
                <Card className="om-kpi" style={{ borderRadius: 12, background: '#fffaf5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Statistic title="Tổng giá trị" value={currency(kpi.totalValue)} />
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#fff4e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarCircleOutlined style={{ color: '#b86a00', fontSize: 22 }} />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={6}>
                <Card className="om-kpi" style={{ borderRadius: 12, background: '#f7fff6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Statistic title="Giá trị trung bình" value={currency(kpi.avg)} />
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e6f3e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LineChartOutlined style={{ color: '#2f7a44', fontSize: 22 }} />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={6}>
                <Card className="om-kpi" style={{ borderRadius: 12, background: '#f6f7ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Statistic title="Nguồn" value="Web" />
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#eef2f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShopOutlined style={{ color: '#5560b5', fontSize: 20 }} />
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={24} lg={16}>
                <Card title="Đơn theo thời gian" style={{ borderRadius: 12 }}>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeseries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef6ef" />
                        <Tooltip formatter={(v) => `${v}`} />
                        <Area type="monotone" dataKey="count" stroke={primaryColor} fill={primaryColor} fillOpacity={0.12} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title="Phân bố trạng thái" style={{ borderRadius: 12 }}>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<PieTooltip />} />
                        <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={40} outerRadius={70} paddingAngle={4}>
                          {statusDistribution.map((_, i) => <Cell key={i} fill={['#82ca9d', '#ffd591', '#ffd6e7', '#d3f6ff', '#ff7875'][i % 5]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 12 }}>
              <Card style={{ borderRadius: 12 }}>
                <Table
                  columns={columns}
                  dataSource={filtered}
                  rowKey={(r) => r._id || r.key || r.code}
                  pagination={{ current: page, pageSize: limit, total, showSizeChanger: true, pageSizeOptions: ['5', '10', '20'] }}
                  loading={loading}
                  onChange={(pg) => { if (pg && pg.current) setPage(pg.current); if (pg && pg.pageSize) setLimit(pg.pageSize); }}
                />
              </Card>
            </div>
          </TabPane>

          <TabPane tab={<span><FacebookOutlined style={{ color: '#3b5998' }} /> Đơn Fanpage</span>} key="facebook">
            {/* Reuse same UI for FB but reflect source and slightly different KPI colors */}
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              <Col xs={24} lg={6}>
                <Select allowClear style={{ width: '100%' }} placeholder="Trạng thái" value={statusFilter} onChange={setStatusFilter}>
                  <Select.Option value="CREATED">CREATED</Select.Option>
                  <Select.Option value="QUOTED">QUOTED</Select.Option>
                  <Select.Option value="ACCEPTED">ACCEPTED</Select.Option>
                  <Select.Option value="CONVERTED">CONVERTED</Select.Option>
                  <Select.Option value="CANCELLED">CANCELLED</Select.Option>
                </Select>
              </Col>

              <Col xs={24} lg={8}>
                <RangePicker value={dateRange} onChange={(r) => setDateRange(r)} style={{ width: '100%' }} />
              </Col>
              <Col xs={24} lg={4}>
                <Input prefix={<SearchOutlined />} placeholder="Tìm mã/khách/sđt" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
              </Col>
            </Row>

            <Row gutter={[12, 12]}>
              <Col xs={24} lg={6}>
                <Card className="om-kpi" style={{ borderRadius: 12, background: '#f3f9ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Statistic title="Tổng đơn (FB)" value={kpi.totalOrders} />
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e6f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShoppingCartOutlined style={{ color: '#2f57a6', fontSize: 22 }} />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={6}>
                <Card className="om-kpi" style={{ borderRadius: 12, background: '#fff7f7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Statistic title="Tổng giá trị" value={currency(kpi.totalValue)} />
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#fff4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarCircleOutlined style={{ color: '#b86a00', fontSize: 22 }} />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={6}>
                <Card className="om-kpi" style={{ borderRadius: 12, background: '#f7fff6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Statistic title="Giá trị trung bình" value={currency(kpi.avg)} />
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e6f3e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LineChartOutlined style={{ color: '#2f7a44', fontSize: 22 }} />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={6}>
                <Card className="om-kpi" style={{ borderRadius: 12, background: '#fffaf5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Statistic title="Nguồn" value="Fanpage" />
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#fff4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FacebookOutlined style={{ color: '#3b5998', fontSize: 20 }} />
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={24} lg={16}>
                <Card title="Đơn theo thời gian (FB)" style={{ borderRadius: 12 }}>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeseries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f5ff" />
                        <Tooltip formatter={(v) => `${v}`} />
                        <Bar dataKey="count" fill="#3b5998" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title="Phân bố trạng thái (FB)" style={{ borderRadius: 12 }}>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<PieTooltip />} />
                        <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={40} outerRadius={70}>
                          {statusDistribution.map((_, i) => <Cell key={i} fill={['#7bb4ff', '#ffd591', '#ffd6e7', '#d3f6ff', '#ff9fb1'][i % 5]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 12 }}>
              <Card style={{ borderRadius: 12 }}>
                <Table columns={columns} dataSource={filtered} pagination={{ current: page, pageSize: limit, total }} loading={loading} onChange={(pg) => { if (pg && pg.current) setPage(pg.current); if (pg && pg.pageSize) setLimit(pg.pageSize); }} />
              </Card>
            </div>

          </TabPane>
        </Tabs>
      </Card>
      <OrderDetailModal visible={detailVisible} onClose={() => setDetailVisible(false)} order={detailOrder} />
    </div>
  );
};

export default OrderManagement;
