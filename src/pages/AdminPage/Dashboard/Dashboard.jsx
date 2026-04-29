import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Spin, Tag, Select, Button, Space } from 'antd';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { DollarCircleOutlined, CreditCardOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons';
import adminStatisticService from '../../../services/adminStatisticService';
import AIBusinessSummary from '../../../components/Admin/AI/AIBusinessSummary';
import dayjs from 'dayjs';

import { useNavigate } from 'react-router-dom';
const { Title, Text } = Typography;
const primaryColor = '#44624A';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [overview, setOverview] = useState({ totalIncome: 0, perDayIncome: 0, perDayOrders: 0, customers: 0 });
    const [period, setPeriod] = useState('monthly'); // UI choices: 'monthly'|'weekly'|'daily'
    // Week selection state (stores Monday of the selected week)
    const getCurrentWeekStart = () => {
        const now = dayjs();
        return now.day() === 0 ? now.subtract(6, 'day').startOf('day') : now.subtract(now.day() - 1, 'day').startOf('day');
    };
    const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
    const handlePrevWeek = () => setWeekStart(ws => dayjs(ws).subtract(7, 'day').startOf('day'));
    const handleNextWeek = () => setWeekStart(ws => dayjs(ws).add(7, 'day').startOf('day'));

    // Orders chart (Number of Tickets) should have its own week selection state
    const [ordersWeekStart, setOrdersWeekStart] = useState(getCurrentWeekStart());
    const handleOrdersPrevWeek = () => setOrdersWeekStart(ws => dayjs(ws).subtract(7, 'day').startOf('day'));
    const handleOrdersNextWeek = () => setOrdersWeekStart(ws => dayjs(ws).add(7, 'day').startOf('day'));

    const [revenueData, setRevenueData] = useState([]);
    const [orderData, setOrderData] = useState([]);
    const [lastOrders, setLastOrders] = useState([]);
    const [conversionData, setConversionData] = useState([]);
    const [conversionRate, setConversionRate] = useState(0);
    // --- Small UI helpers (keeps formatting on the client, not business logic) ---
    const formatCurrency = (value) => {
        try {
            const n = Number(value || 0);
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
        } catch (e) {
            return String(value || 0);
        }
    };

    const formatNumberFixed = (value, digits = 0) => {
        const n = Number(value || 0);
        return n.toFixed(digits);
    };

    // prepare chart/table shapes expected by the UI (backend should return friendly shapes but keep a small defensive mapper)
    const revenueToRender = (revenueData || []).map((r, i) => ({
        name: r.name || r.label || (r.date ? dayjs(r.date).format('DD MMM') : `P${i + 1}`),
        income: Number(r.income ?? r.value ?? 0)
    }));

    const orderToRender = (orderData || []).map((o, i) => ({
        name: o.name || o.label || (o.date ? dayjs(o.date).format('DD MMM') : `D${i + 1}`),
        orders: Number(o.orders ?? o.value ?? 0)
    }));

    const orderColumns = [
        { title: 'Mã đơn', dataIndex: 'orderId', key: 'orderId', render: (t) => <Text strong>{t}</Text> },
        { title: 'Thời gian', dataIndex: 'time', key: 'time' },
        { title: 'Địa điểm', dataIndex: 'location', key: 'location' },
        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s) => {
            const color = s === 'Completed' ? 'green' : s === 'Canceled' ? 'red' : 'gold';
            return <Tag color={color}>{s}</Tag>;
        } },
    ];
    const localLastOrdersMock = [
        { key: '1', orderId: '#1452', time: '14:27', location: '132, Thanh Xuân', status: 'Completed' },
        { key: '2', orderId: '#1453', time: '15:33', location: '33, Nguyễn Trãi', status: 'Canceled' },
        { key: '3', orderId: '#1454', time: '15:08', location: '14, Lê Lợi', status: 'In Progress' },
        { key: '4', orderId: '#1455', time: '14:40', location: '67, Thanh Thủy', status: 'Completed' },
    ];

    useEffect(() => {
            const fetchDashboardData = async () => {
                try {
                    setLoading(true);
                    // Ask backend to compute a UI-ready bundle to avoid duplicating heavy logic on the client.
                    const params = {
                        period,
                        weekStart: weekStart ? weekStart.format('YYYY-MM-DD') : undefined,
                        ordersWeekStart: ordersWeekStart ? ordersWeekStart.format('YYYY-MM-DD') : undefined
                    };
                    const res = await adminStatisticService.getDashboardUI(params).catch(() => null);
                    if (res && res.data) {
                        const b = res.data;
                        setOverview(b.overview || { totalIncome: 0, perDayIncome: 0, perDayOrders: 0, customers: 0 });
                        setRevenueData(b.revenueData || []);
                        setOrderData(b.orderData || []);
                        setLastOrders(b.lastOrders && b.lastOrders.length ? b.lastOrders : localLastOrdersMock);
                        setConversionData(b.conversionData || []);
                        setConversionRate(Number(b.conversionRate || 0));
                    } else {
                        // Graceful fallback: keep previous values (don't inject mocked points)
                        console.warn('Dashboard UI bundle missing, keeping current state');
                    }
                } catch (error) {
                    console.error('Failed to load dashboard data', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchDashboardData();
    }, [period, weekStart, ordersWeekStart]);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: 'auto', marginTop: '20vh' }} />;

    return (
        <div style={{ textAlign: 'left' }}>
            <style>{`
                .btn-outline-primary { background: #fff !important; color: ${primaryColor} !important; border: 1px solid ${primaryColor} !important; padding: 6px 12px; border-radius: 6px; box-shadow: none !important; transition: all .18s ease; }
                .btn-outline-primary:hover, .btn-outline-primary:focus { background: ${primaryColor} !important; color: #fff !important; border-color: ${primaryColor} !important; box-shadow: none !important; }
                .btn-outline-primary:focus { outline: none !important; box-shadow: 0 0 0 4px rgba(68,98,74,0.12) !important; }
            `}</style>
            {/* Top Stat Cards (compact Figma style) */}
            <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: 12, background: '#f3faf3', border: 'none', padding: 12, minHeight: 84 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: '#8c978e', fontSize: 13, marginBottom: 6 }}>Tổng doanh thu</div>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(overview.totalIncome)}</div>
                            </div>
                            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e6f3e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <DollarCircleOutlined style={{ color: '#2f7a44', fontSize: 24 }} />
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: 12, background: '#f7fff6', border: 'none', padding: 12, minHeight: 84 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: '#8c978e', fontSize: 13, marginBottom: 6 }}>Doanh thu/ngày</div>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(overview.perDayIncome)}</div>
                            </div>
                            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e6f3e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CreditCardOutlined style={{ color: '#2f7a44', fontSize: 24 }} />
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: 12, background: '#fffaf5', border: 'none', padding: 12, minHeight: 84 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: '#8c978e', fontSize: 13, marginBottom: 6 }}>Số đơn/ngày</div>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{formatNumberFixed(overview.perDayOrders, 2)}</div>
                            </div>
                            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#f3efe6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShopOutlined style={{ color: '#b86a00', fontSize: 24 }} />
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: 12, background: '#f6f7ff', border: 'none', padding: 12, minHeight: 84 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: '#8c978e', fontSize: 13, marginBottom: 6 }}>Khách hàng</div>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{Number(overview.customers || 0).toLocaleString()}</div>
                            </div>
                            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#eef2f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TeamOutlined style={{ color: '#5560b5', fontSize: 24 }} />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* AI Insight Section */}
            <div style={{ marginTop: '24px' }}>
                <AIBusinessSummary />
            </div>

            {/* Middle Section: Chart and Top Cars */}
            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                <Col xs={24} lg={18}>
                    <Card title="Tổng doanh thu" style={{ borderRadius: '12px' }} extra={
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Select value={period} onChange={(v) => setPeriod(v)} style={{ width: 140 }}>
                                <Select.Option value="monthly">Hàng tháng</Select.Option>
                                <Select.Option value="weekly">Hàng tuần</Select.Option>
                                <Select.Option value="daily">Hàng ngày</Select.Option>
                            </Select>
                            {period === 'weekly' && (
                                <Space>
                                    <Button size="small" onClick={handlePrevWeek}>Trước</Button>
                                    <div style={{ minWidth: 140, textAlign: 'center', fontSize: 12 }}>
                                        {weekStart.format('DD MMM')} - {weekStart.add(6, 'day').format('DD MMM')}
                                    </div>
                                    <Button size="small" onClick={handleNextWeek}>Tiếp</Button>
                                </Space>
                            )}
                        </div>
                    }>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueToRender} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9f0ea" />
                                    <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                                    <Area type="monotone" dataKey="income" stroke="#2f7a44" strokeWidth={2} dot={true} fillOpacity={0.25} fill="url(#colorIncome)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={6}>
                    <Card title="Tỷ lệ chuyển đổi" style={{ borderRadius: '12px', height: '100%' }}>
                        <Text type="secondary">Tỷ lệ giữa đơn hàng thành công và tổng số Request Ticket</Text>
                        {/* increased height so the donut can be larger without clipping */}
                        <div style={{ marginTop: 12, height: 260, position: 'relative' }}>
                            {conversionData && conversionData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={conversionData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={60}
                                            outerRadius={95}
                                            paddingAngle={3}
                                        >
                                            {/* pastel palette: soft green for success, pale rose for non-converted */}
                                            <Cell key="cell-0" fill="#8BA888" />
                                            <Cell key="cell-1" fill="#FFF4C2" />
                                        </Pie>
                                        <RechartsTooltip formatter={(value) => `${value}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Không có dữ liệu</div>
                            )}

                            {/* Center label showing conversion percent (slightly smaller) */}
                            <div style={{ position: 'absolute', left: 0, right: 0, top: '42%', textAlign: 'center', pointerEvents: 'none' }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: primaryColor }}>{conversionRate}%</div>
                                <div style={{ fontSize: 12, color: '#666' }}>Tỷ lệ chuyển đổi</div>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Bottom Section: Orders Chart and Last Orders Table */}
            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                <Col xs={24} lg={10}>
                    <Card
                        title="Số yêu cầu"
                        style={{ borderRadius: '12px' }}
                        extra={
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <Space>
                                            <Button size="small" onClick={handleOrdersPrevWeek}>Trước</Button>
                                            <div style={{ minWidth: 140, textAlign: 'center', fontSize: 12 }}>
                                                {ordersWeekStart.format('DD MMM')} - {ordersWeekStart.add(6, 'day').format('DD MMM')}
                                            </div>
                                            <Button size="small" onClick={handleOrdersNextWeek}>Tiếp</Button>
                                        </Space>
                                    </div>
                        }
                    >
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={orderToRender} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <RechartsTooltip />
                                    <Bar dataKey="orders" fill="#82ca9d" radius={[4, 4, 0, 0]} barSize={10} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={14}>
                    <Card
                        title="Hóa đơn gần đây"
                        style={{ borderRadius: '12px' }}
                        extra={<Button size="small" className="btn-outline-primary" onClick={() => navigate('/admin/invoices')}>Xem tất cả</Button>}
                    >
                        <Table
                            columns={orderColumns}
                            dataSource={lastOrders}
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;