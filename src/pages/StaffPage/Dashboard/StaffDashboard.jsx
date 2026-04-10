import React, { useState, useEffect } from 'react';
import {
    Row, Col, Card, Select, Button, Typography, Spin,
} from 'antd';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowUpOutlined, ArrowDownOutlined, FileDoneOutlined, CheckCircleOutlined, CarOutlined, WarningOutlined, TruckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useUser from '../../../contexts/UserContext';
import './StaffDashboard.css';

const { Text } = Typography;

/* ─────────────────────────────────────────────
   MOCK DATA (replace with real API calls later)
───────────────────────────────────────────── */
const WEEKLY_ORDERS = [
    { day: 'Mon', orders: 175 },
    { day: 'Tue', orders: 137 },
    { day: 'Wed', orders: 160 },
    { day: 'Thu', orders: 148 },
    { day: 'Fri', orders: 188 },
    { day: 'Sat', orders: 170 },
    { day: 'Sun', orders: 182 },
];

const TODAY_SCHEDULE = [
    { time: '08:00', label: 'Relocation: Cam Le → Ngu Hanh Son' },
    { time: '10:30', label: 'Relocation: Hai Chau → Lien Chieu' },
    { time: '11:00', label: 'Relocation: Thanh Khe → Son Tra' },
];

const MOCK_ACTIVE_ORDERS = [
    { _id: 'o1', code: 'HOMS-2024-00125', itemName: 'Sofa', price: 21, status: 'CONFIRMED', date: '2025-12-28T14:30:00' },
    { _id: 'o2', code: 'HOMS-2024-00123', itemName: 'Smart Tivi', price: 12, status: 'CANCELLED', date: '2025-12-29T18:30:00' },
    { _id: 'o3', code: 'HOMS-2024-00127', itemName: 'Wardrobe', price: 10, status: 'CONFIRMED', date: '2025-12-29T16:30:00' },
];

const MOCK_PENDING_ORDERS = [
    { _id: 'o4', code: 'HOMS-2024-00130', itemName: 'Refrigerator', price: 18, status: 'CREATED', date: '2025-12-30T09:00:00' },
    { _id: 'o5', code: 'HOMS-2024-00131', itemName: 'King-size Bed', price: 22, status: 'WAITING_SURVEY', date: '2025-12-30T10:00:00' },
];

/* ──────────────────────────────────────────── */

const STATUS_COLOR = {
    CONFIRMED: '#52c41a',
    CANCELLED: '#ff4d4f',
    CREATED: '#1890ff',
    WAITING_SURVEY: '#faad14',
    IN_PROGRESS: '#13c2c2',
    COMPLETED: '#52c41a',
};

const STATUS_LABEL = {
    CONFIRMED: 'Đã xác nhận',
    CANCELLED: 'Đã hủy',
    CREATED: 'Chờ xử lý',
    WAITING_SURVEY: 'Chờ khảo sát',
    IN_PROGRESS: 'Đang thực hiện',
    COMPLETED: 'Hoàn tất',
};

const STAT_ICONS = {
    'Đã phân công': <FileDoneOutlined style={{ fontSize: 28 }} />,
    'Hoàn thành':  <CheckCircleOutlined style={{ fontSize: 28 }} />,
    'Đang vận chuyển': <TruckOutlined style={{ fontSize: 28 }} />,
    'Sự cố':   <WarningOutlined style={{ fontSize: 28 }} />,
};

const StatCard = ({ label, value, trend, trendUp, color }) => (
    <Card className="staff-stat-card" bodyStyle={{ padding: '20px 24px' }}>
        <div className="stat-card-inner">
            <div>
                <Text className="stat-label">{label}</Text>
                <div className="stat-value">{value}</div>
                <div className={`stat-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
                    {trendUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {trend} (30 ngày gần đây)
                </div>
            </div>
            <div className="stat-icon-wrap" style={{ background: color + '18', color: color }}>
                {STAT_ICONS[label]}
            </div>
        </div>
    </Card>
);

const OrderCard = ({ order }) => {
    const statusColor = STATUS_COLOR[order.status] || '#aaa';
    const statusLabel = STATUS_LABEL[order.status] || order.status;
    const date = new Date(order.date);
    const dateStr = `${date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} PM`;

    return (
        <div className="order-card">
            <div className="order-card-id">ORDER ID - #{order.code}</div>
            <div className="order-card-item">{order.itemName}</div>
            <div className="order-card-footer">
                <div>
                    <div className="order-card-price">Giá: ${order.price}.00</div>
                    <div className="order-card-date">NGÀY ĐẶT : {dateStr.toUpperCase()}</div>
                </div>
                <button
                    className="order-status-btn"
                    style={{ background: statusColor }}
                >
                    {statusLabel} <span className="btn-chevron">▾</span>
                </button>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const StaffDashboard = () => {
    const navigate = useNavigate();
    useUser();
    const [loading, setLoading] = useState(false);
    const [stats] = useState({ assigned: 26, completed: 357, inTransit: 65, incident: 65 });
    const [weeklyData] = useState(WEEKLY_ORDERS);
    const [activeOrders] = useState(MOCK_ACTIVE_ORDERS);
    const [pendingOrders] = useState(MOCK_PENDING_ORDERS);
    const [orderTab, setOrderTab] = useState('active');

    // In production, fetch from real API
    useEffect(() => {
        // Example: api.get('/staff/dashboard') ...
        setLoading(false);
    }, []);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '20vh auto' }} />;

    const displayOrders = orderTab === 'active' ? activeOrders : pendingOrders;

    return (
        <div className="staff-dashboard">
            {/* ── STAT CARDS ───────────────────────────── */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard label="Đã phân công" value={stats.assigned} trend="6.5%" trendUp color="#44624A" />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard label="Hoàn thành" value={stats.completed} trend="2.4%" trendUp={false} color="#52c41a" />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard label="Đang vận chuyển" value={stats.inTransit} trend="4.2%" trendUp color="#1890ff" />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard label="Sự cố" value={stats.incident} trend="4.2%" trendUp color="#ff4d4f" />
                </Col>
            </Row>

            {/* ── CHART + SCHEDULE ─────────────────────── */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {/* Chart */}
                <Col xs={24} lg={14}>
                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontWeight: 600 }}>Số lượng đơn hàng</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#44624A' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#44624A', display: 'inline-block' }} />
                                    Buổi chiều
                                </span>
                            </div>
                        }
                        extra={
                            <Select defaultValue="Tuần trước" size="small" style={{ width: 120 }}>
                                <Select.Option value="Last Week">Tuần trước</Select.Option>
                                <Select.Option value="This Week">Tuần này</Select.Option>
                            </Select>
                        }
                        style={{ borderRadius: 12 }}
                        bodyStyle={{ paddingTop: 0 }}
                    >
                        <ResponsiveContainer width="100%" height={347}>
                            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="4 4" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} style={{ fontSize: 13 }} />
                                <YAxis domain={[0, 200]} axisLine={false} tickLine={false} ticks={[0, 50, 100, 150, 200]} style={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'rgba(68,98,74,0.06)' }} />
                                <Bar dataKey="orders" fill="#44624A" radius={[4, 4, 0, 0]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* Today's Schedule */}
                <Col xs={24} lg={10}>
                    <Card
                        title={<span style={{ fontWeight: 600, fontSize: 16 }}>Lịch trình hôm nay</span>}
                        style={{ borderRadius: 12, height: '100%' }}
                    >
                        <div className="schedule-list">
                            {TODAY_SCHEDULE.map((item, i) => (
                                <div key={i} className="schedule-item">
                                    <span className="schedule-time">{item.time}</span>
                                    <span className="schedule-label">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* ── ORDERS ───────────────────────────────── */}
            <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>Đơn hàng</span>
                    <Button
                        type="default"
                        size="small"
                        style={{ borderRadius: 6, fontWeight: 500 }}
                        onClick={() => navigate('/staff/orders')}
                    >
                        Xem tất cả ↗
                    </Button>
                </div>

                {/* Tabs */}
                <div className="order-tabs">
                    <button
                        className={`order-tab-btn ${orderTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setOrderTab('pending')}
                    >
                        Chờ xử lý
                    </button>
                    <button
                        className={`order-tab-btn ${orderTab === 'active' ? 'active' : ''}`}
                        onClick={() => setOrderTab('active')}
                    >
                        Hoạt động
                    </button>
                </div>

                {/* Order cards */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    {displayOrders.map((order) => (
                        <Col xs={24} sm={12} lg={8} key={order._id}>
                            <OrderCard order={order} />
                        </Col>
                    ))}
                </Row>
            </div>
        </div>
    );
};

export default StaffDashboard;
