import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Spin, Tag, Select, Button, Space } from 'antd';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarCircleOutlined, CreditCardOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons';
import adminStatisticService from '../../../services/adminStatisticService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState({ totalIncome: 0, perDayIncome: 0, perDayOrders: 0, customers: 0 });
        const [revenueData, setRevenueData] = useState([]);
        const [orderData, setOrderData] = useState([]);
    // Tickets chart will always show a single week and use its own weekStart controls
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

    // Local mock data used only for UI/dev preview when API isn't connected or returns empty
    const localRevenueMock = [
        { name: 'Jan', income: 30000 }, { name: 'Feb', income: 40000 }, { name: 'Mar', income: 35000 },
        { name: 'Apr', income: 50000 }, { name: 'May', income: 70000 }, { name: 'Jun', income: 55000 },
        { name: 'Jul', income: 65000 }, { name: 'Aug', income: 30000 }, { name: 'Sep', income: 40000 },
        { name: 'Oct', income: 38000 }, { name: 'Nov', income: 60000 }, { name: 'Dec', income: 75000 }
    ];

    const localOrderMock = [
        { name: 'Mon', orders: 150 }, { name: 'Tue', orders: 120 }, { name: 'Wed', orders: 140 },
        { name: 'Thu', orders: 130 }, { name: 'Fri', orders: 170 }, { name: 'Sat', orders: 190 }, { name: 'Sun', orders: 200 }
    ];

    // Render only real fetched data. Do NOT fall back to local sample data for
    // missing days — if the API returns no buckets for a date, the chart will
    // simply render no line/bar for that day.
    const revenueToRender = revenueData || [];
    const orderToRender = orderData || [];

    // Using mock data for Top Moving Car; Last Orders will be fetched from backend and stored in state
    const topMovingCars = [
        { id: 1, name: 'truck', count: 150, image: '🚚' },
        { id: 2, name: 'container truck', count: 120, image: '🚛' },
    ];
    const [lastOrders, setLastOrders] = useState([]);
    const localLastOrdersMock = [
        { key: '1', orderId: '#1452', time: '2:27 PM', location: '132, Thanh Xuan', status: 'Completed' },
        { key: '2', orderId: '#1453', time: '3:33 PM', location: '33, Nguyen Trai', status: 'Canceled' },
        { key: '3', orderId: '#1454', time: '3:08 PM', location: '14, Le Loi', status: 'In Progress' },
        { key: '4', orderId: '#1455', time: '2:40 PM', location: '67, Thanh Thuy', status: 'Completed' },
    ];

    const orderColumns = [
        { title: 'Mã hóa đơn', dataIndex: 'orderId', key: 'orderId' },
        { title: 'Thời gian', dataIndex: 'time', key: 'time' },
        { title: 'Khách hàng', dataIndex: 'customer', key: 'customer' },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = (status === 'PAID' || status === 'Completed' || status === 'PAID') ? 'green' : status === 'PARTIAL' ? 'orange' : 'default';
                return <Tag color={color}>{status}</Tag>;
            }
        },
    ];

    // Helpers for formatting numbers to match Figma style (thousands separated by dot)
    const formatCurrency = (v) => {
        const n = Number(v) || 0;
        // Format as Vietnamese Dong, e.g. 1.234.567 ₫
        return n.toLocaleString('vi-VN') + ' ₫';
    };

    const formatNumberFixed = (v, digits = 2) => {
        const n = Number(v) || 0;
        return n.toFixed(digits);
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // Call APIs
                // Decide revenue query params based on selected UI period so that
                // "Monthly" shows days of current month, "Weekly" shows days of current week,
                // and "Daily" shows the last 7 days.
                const computeRevenueParams = () => {
                    const now = dayjs();
                    if (period === 'monthly') {
                        // request monthly buckets for the current year (Jan..Dec)
                        return {
                            period: 'monthly',
                            startDate: now.startOf('year').format('YYYY-MM-DD'),
                            endDate: now.endOf('year').format('YYYY-MM-DD')
                        };
                    }
                    if (period === 'weekly') {
                        // For weekly view request daily buckets for the selected week (Mon..Sun)
                        const monday = weekStart.startOf('day');
                        const sunday = monday.add(6, 'day').endOf('day');
                        return {
                            period: 'daily',
                            startDate: monday.format('YYYY-MM-DD'),
                            endDate: sunday.format('YYYY-MM-DD'),
                            usePaymentTimeline: true
                        };
                    }
                    // daily -> show last 7 days (including today)
                    return {
                        period: 'daily',
                        startDate: now.subtract(6, 'day').startOf('day').format('YYYY-MM-DD'),
                        endDate: now.endOf('day').format('YYYY-MM-DD')
                    };
                };

                const revenueParams = computeRevenueParams();

                // Build a period-appropriate fallback so UI labels match the selected period
                const buildRevenueFallback = (params) => {
                    if (params.period === 'monthly') {
                        // 12 months
                        return [
                            { date: '2026-01', revenue: 30000 }, { date: '2026-02', revenue: 40000 }, { date: '2026-03', revenue: 35000 },
                            { date: '2026-04', revenue: 50000 }, { date: '2026-05', revenue: 70000 }, { date: '2026-06', revenue: 55000 },
                            { date: '2026-07', revenue: 65000 }, { date: '2026-08', revenue: 30000 }, { date: '2026-09', revenue: 40000 },
                            { date: '2026-10', revenue: 38000 }, { date: '2026-11', revenue: 60000 }, { date: '2026-12', revenue: 75000 }
                        ];
                    }
                    if (params.usePaymentTimeline) {
                        // fallback for a specific week (Mon..Sun) when using payment timeline
                        const monday = (params.startDate && dayjs(params.startDate).isValid()) ? dayjs(params.startDate) : getCurrentWeekStart();
                        const arr = [];
                        for (let i = 0; i < 7; i++) {
                            const d = monday.add(i, 'day');
                            arr.push({ date: d.format('YYYY-MM-DD'), revenue: 20000 + Math.floor(Math.random() * 40000) });
                        }
                        return arr;
                    }
                    // daily: last 7 days
                    const arr = [];
                    for (let i = 6; i >= 0; i--) {
                        const d = dayjs().subtract(i, 'day');
                        arr.push({ date: d.format('YYYY-MM-DD'), revenue: 20000 + Math.floor(Math.random() * 40000) });
                    }
                    return arr;
                };

                const revenueFallback = buildRevenueFallback(revenueParams);

                // compute date range for orders chart: always use ordersWeekStart (Mon..Sun)
                const monday = (ordersWeekStart && dayjs(ordersWeekStart).isValid()) ? dayjs(ordersWeekStart) : getCurrentWeekStart();
                const orderParams = {
                    startDate: monday.startOf('day').format('YYYY-MM-DD'),
                    endDate: monday.add(6, 'day').endOf('day').format('YYYY-MM-DD')
                };

                const [overviewRes, revenueRes, orderRes, recentInvoicesRes] = await Promise.all([
                    // adminStatisticService methods return response.data, so the resolved value is the data itself.
                    // Make the catch fallbacks return the same shape (data, not wrapped in { data: ... }).
                        adminStatisticService.getOverview().catch(() => ({ totalRevenue: 342247, dailyRevenue: 12145, dailyOrders: 214, totalCustomers: 2140 })),
                        // Do not inject sample data on error — return empty arrays so
                        // charts do not show mocked points for missing dates.
                        adminStatisticService.getRevenue(revenueParams).catch(() => ([])),
                        // Use the new endpoint that returns RequestTicket daily counts
                        adminStatisticService.getRequestTicketsDaily({ startDate: orderParams.startDate, endDate: orderParams.endDate }).catch(() => ([])),
            adminStatisticService.getRecentInvoices({ limit: 5 }).catch(() => ([]))
                ]);

                // Debug: log raw responses so we can inspect shapes in the browser console
                // (useful because some APIs return { data: [...] } while others return [...] directly)
                // eslint-disable-next-line no-console
                console.log('overviewRes', overviewRes, 'revenueRes', revenueRes, 'orderRes', orderRes);

                // Normalize shapes: support both direct data and { data: ... }
                const normalizeToArray = (v) => {
                    if (!v) return [];
                    if (Array.isArray(v)) return v;
                    if (v && Array.isArray(v.data)) return v.data;
                    if (v && v.data && typeof v.data === 'object') return [v.data];
                    if (typeof v === 'object') return [v];
                    return [];
                };

                const overviewData = overviewRes && overviewRes.data ? overviewRes.data : overviewRes;
                const revenueArray = normalizeToArray(revenueRes);
                const orderArray = normalizeToArray(orderRes);
                const recentInvoicesArray = normalizeToArray(recentInvoicesRes);

                // Map overview
                setOverview({
                    totalIncome: overviewData?.totalRevenue || 0,
                    perDayIncome: overviewData?.dailyRevenue || 0,
                    perDayOrders: overviewData?.dailyOrders || 0,
                    customers: overviewData?.totalCustomers || 0,
                });

                // Map revenue (safe)
                let sanitizedRevenue = [];
                try {
                    const mappedRevenue = (revenueArray || []).map(item => {
                        // For date-bearing items we'll preserve raw date on the object so we can
                        // aggregate by weekday when needed. We still compute a naive display name
                        // for non-weekly contexts.
                        let name = item.name || '';
                        const rawDate = item.date;
                        if (rawDate && typeof rawDate === 'string') {
                            if (period === 'monthly') {
                                const parts = rawDate.split('-');
                                const month = parts.length >= 2 ? Number(parts[1]) : dayjs(rawDate).month() + 1;
                                name = `Th ${month}`;
                            } else if (period === 'daily') {
                                const d = dayjs(rawDate);
                                const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                                const idx = d.day();
                                name = weekdayLabels[idx] || d.format('DD MMM');
                            } else {
                                // fallback
                                name = rawDate;
                            }
                        } else if (item._id && typeof item._id === 'object') {
                            if (period === 'monthly' && item._id.month) name = `Th ${String(item._id.month)}`;
                            else if (period === 'daily' && item._id.day) name = String(item._id.day).padStart(2, '0');
                            else name = String(item._id);
                        }

                        const incomeVal = item.totalPrice ?? item.totalRevenue ?? item.revenue ?? item.income ?? item.value ?? 0;
                        return { name, income: Number(incomeVal) || 0, __rawDate: item.date, __source: item };
                    });
                    sanitizedRevenue = mappedRevenue.map(r => ({ name: r.name, income: Number(r.income) || 0, __rawDate: r.__rawDate, __source: r.__source }));
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to map revenue array, falling back to empty', e, revenueArray);
                    sanitizedRevenue = [];
                }

                // If weekly, aggregate daily buckets into Mon..Sun slots (user requested weekday totals)
                if (period === 'weekly') {
                    const weekdayLabelsMonFirst = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const weekMap = [0, 0, 0, 0, 0, 0, 0]; // index 0 => Monday
                    (revenueArray || []).forEach(item => {
                        let d = null;
                        if (item.date) d = dayjs(item.date);
                        else if (item._id && typeof item._id === 'object' && item._id.year && item._id.month && item._id.day) {
                            const y = item._id.year; const m = String(item._id.month).padStart(2, '0'); const day = String(item._id.day).padStart(2, '0');
                            d = dayjs(`${y}-${m}-${day}`);
                        } else if (typeof item._id === 'string') {
                            d = dayjs(item._id);
                        }
                        if (!d || !d.isValid()) return;
                        const dayIndex = d.day(); // 0 Sun .. 6 Sat
                        const pos = dayIndex === 0 ? 6 : dayIndex - 1; // convert to Mon-first index 0..6
                        const v = Number(item.totalPrice ?? item.totalRevenue ?? item.revenue ?? item.income ?? item.value ?? 0) || 0;
                        weekMap[pos] = (weekMap[pos] || 0) + v;
                    });
                    const mondayRef = (weekStart && dayjs(weekStart).isValid()) ? dayjs(weekStart).startOf('day') : getCurrentWeekStart();
                    const weeklyFull = weekdayLabelsMonFirst.map((label, idx) => {
                        const dateLabel = mondayRef.add(idx, 'day').format('DD/MM');
                        return { name: `${label} - ${dateLabel}`, income: Number(weekMap[idx] || 0) };
                    });
                    setRevenueData(weeklyFull);
                } else {
                    // non-weekly default render
                    // eslint-disable-next-line no-console
                    console.log('mappedRevenue', sanitizedRevenue);
                    setRevenueData(sanitizedRevenue.map(r => ({ name: r.name, income: r.income })));
                }

                // If monthly, ensure we display all 12 months (Jan..Dec) even if some months have 0
                if (period === 'monthly') {
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    // Build map from backend items to month index
                    const monthMap = {};
                    (revenueArray || []).forEach(item => {
                        const incomeVal = Number(item.totalPrice ?? item.totalRevenue ?? item.revenue ?? item.income ?? item.value ?? 0) || 0;
                        let month = null;
                        if (item.date && typeof item.date === 'string') {
                            const parts = item.date.split('-');
                            if (parts.length >= 2 && !parts[1].startsWith('W')) month = Number(parts[1]);
                        }
                        if (!month && item._id && typeof item._id === 'object' && item._id.month) month = Number(item._id.month);
                        if (!month && item._id && typeof item._id === 'string') {
                            const p = item._id.split('-'); if (p.length >= 2) month = Number(p[1]);
                        }
                        if (!month && item.date) {
                            const d = dayjs(item.date);
                            if (d.isValid()) month = d.month() + 1;
                        }
                        if (month) monthMap[month] = (monthMap[month] || 0) + incomeVal;
                    });
                    const monthlyFull = monthNames.map((m, idx) => ({ name: m, income: Number(monthMap[idx + 1] || 0) }));
                    setRevenueData(monthlyFull);
                }

                // Map orders (RequestTicket daily counts) into Mon..Sun buckets
                let mappedOrders = [];
                try {
                    // Build a map from date -> count for faster lookup. Backend returns
                    // items like { date: 'YYYY-MM-DD', count: N } (our new endpoint).
                    const dateCountMap = {};
                    (orderArray || []).forEach(item => {
                        if (!item) return;
                        // Prefer `date` field; support legacy _id-based shapes too.
                        let dateStr = null;
                        if (item.date && typeof item.date === 'string') dateStr = item.date;
                        else if (item._id && typeof item._id === 'string') dateStr = item._id;
                        else if (item._id && typeof item._id === 'object' && item._id.year && item._id.month && item._id.day) {
                            const y = item._id.year; const m = String(item._id.month).padStart(2, '0'); const d = String(item._id.day).padStart(2, '0');
                            dateStr = `${y}-${m}-${d}`;
                        }
                        if (!dateStr) return;
                        const v = Number(item.count ?? item.orders ?? item.value ?? 0) || 0;
                        dateCountMap[dateStr] = (dateCountMap[dateStr] || 0) + v;
                    });

                    // Build 7 buckets starting from ordersWeekStart (Monday)
                    const mondayRef = (ordersWeekStart && dayjs(ordersWeekStart).isValid()) ? dayjs(ordersWeekStart).startOf('day') : getCurrentWeekStart();
                    const weekdayLabelsMonFirst = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    mappedOrders = weekdayLabelsMonFirst.map((label, idx) => {
                        const day = mondayRef.add(idx, 'day');
                        const dateKey = day.format('YYYY-MM-DD');
                        return { name: label, orders: Number(dateCountMap[dateKey] || 0) };
                    });
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to map order array', e, orderArray);
                    mappedOrders = [];
                }
                // eslint-disable-next-line no-console
                console.log('mappedOrders', mappedOrders);
                setOrderData(mappedOrders);

                // Map recent invoices into lastOrders table rows
                try {
                    const mappedRecent = (recentInvoicesArray || []).map(inv => ({
                        key: inv._id,
                        orderId: inv.code,
                        time: inv.createdAt ? dayjs(inv.createdAt).format('HH:mm DD/MM/YYYY') : '',
                        customer: inv.customer?.fullName || '',
                        status: inv.paymentStatus || inv.status || ''
                    }));
                    setLastOrders(mappedRecent.length ? mappedRecent : localLastOrdersMock);
                } catch (e) {
                    // fallback to mock
                    setLastOrders(localLastOrdersMock);
                }

            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [period, weekStart, ordersWeekStart]);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: 'auto', marginTop: '20vh' }} />;

    return (
        <div style={{ textAlign: 'left' }}>
            {/* Top Stat Cards (compact Figma style) */}
            <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: 12, background: '#f3faf3', border: 'none', padding: 12, minHeight: 84 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: '#8c978e', fontSize: 13, marginBottom: 6 }}>Total Income</div>
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
                                <div style={{ color: '#8c978e', fontSize: 13, marginBottom: 6 }}>Per Day Income</div>
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
                                <div style={{ color: '#8c978e', fontSize: 13, marginBottom: 6 }}>Per Day Orders</div>
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
                                <div style={{ color: '#8c978e', fontSize: 13, marginBottom: 6 }}>Customers</div>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{Number(overview.customers || 0).toLocaleString()}</div>
                            </div>
                            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#eef2f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TeamOutlined style={{ color: '#5560b5', fontSize: 24 }} />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Middle Section: Chart and Top Cars */}
            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                <Col xs={24} lg={18}>
                    <Card title="Total Income" style={{ borderRadius: '12px' }} extra={
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Select value={period} onChange={(v) => setPeriod(v)} style={{ width: 140 }}>
                                <Select.Option value="monthly">Monthly</Select.Option>
                                <Select.Option value="weekly">Weekly</Select.Option>
                                <Select.Option value="daily">Daily</Select.Option>
                            </Select>
                            {period === 'weekly' && (
                                <Space>
                                    <Button size="small" onClick={handlePrevWeek}>Prev</Button>
                                    <div style={{ minWidth: 140, textAlign: 'center', fontSize: 12 }}>
                                        {weekStart.format('DD MMM')} - {weekStart.add(6, 'day').format('DD MMM')}
                                    </div>
                                    <Button size="small" onClick={handleNextWeek}>Next</Button>
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
                    <Card title="Top Moving Car" style={{ borderRadius: '12px', height: '100%' }}>
                        <Text type="secondary">The top choosen vehicle</Text>
                        <div style={{ marginTop: '20px' }}>
                            {topMovingCars.map(car => (
                                <div key={car.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '24px' }}>{car.image}</span>
                                    <Text strong>{car.name}</Text>
                                    <Text>{car.count}</Text>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Bottom Section: Orders Chart and Last Orders Table */}
            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                <Col xs={24} lg={10}>
                    <Card
                        title="Number of Tickets"
                        style={{ borderRadius: '12px' }}
                        extra={
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <Space>
                                            <Button size="small" onClick={handleOrdersPrevWeek}>Prev</Button>
                                            <div style={{ minWidth: 140, textAlign: 'center', fontSize: 12 }}>
                                                {ordersWeekStart.format('DD MMM')} - {ordersWeekStart.add(6, 'day').format('DD MMM')}
                                            </div>
                                            <Button size="small" onClick={handleOrdersNextWeek}>Next</Button>
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
                        title="Last Invoice"
                        style={{ borderRadius: '12px' }}
                        extra={<a href="#!">View All</a>}
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