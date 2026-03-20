import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Spin, Tag, Select } from 'antd';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarCircleOutlined, ShoppingCartOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import adminStatisticService from '../../../services/adminStatisticService';

const { Title, Text } = Typography;

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState({ totalIncome: 0, perDayIncome: 0, perDayOrders: 0, customers: 0 });
    const [revenueData, setRevenueData] = useState([]);
    const [orderData, setOrderData] = useState([]);

    // Using mock data for Top Moving Car and Last Orders as there's no explicit API defined in the backend routes shown
    const topMovingCars = [
        { id: 1, name: 'truck', count: 150, image: '🚚' },
        { id: 2, name: 'container truck', count: 120, image: '🚛' },
    ];

    const lastOrders = [
        { key: '1', orderId: '#1452', time: '2:27 PM', location: '132, Thanh Xuan', status: 'Completed' },
        { key: '2', orderId: '#1453', time: '3:33 PM', location: '33, Nguyen Trai', status: 'Canceled' },
        { key: '3', orderId: '#1454', time: '3:08 PM', location: '14, Le Loi', status: 'In Progress' },
        { key: '4', orderId: '#1455', time: '2:40 PM', location: '67, Thanh Thuy', status: 'Completed' },
    ];

    const orderColumns = [
        { title: 'Order ID', dataIndex: 'orderId', key: 'orderId' },
        { title: 'O. Time', dataIndex: 'time', key: 'time' },
        { title: 'Location', dataIndex: 'location', key: 'location' },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = status === 'Completed' ? 'green' : status === 'In Progress' ? 'blue' : 'red';
                return <Tag color={color}>{status}</Tag>;
            }
        },
    ];

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // Call APIs
                const [overviewRes, revenueRes, orderRes] = await Promise.all([
                    adminStatisticService.getOverview().catch(() => ({ data: { totalRevenue: 342247, dailyRevenue: 12145, dailyOrders: 214, totalCustomers: 2140 } })),
                    adminStatisticService.getRevenue({ type: 'monthly' }).catch(() => ({
                        data: [
                            { _id: 'Jan', totalRevenue: 30000 }, { _id: 'Feb', totalRevenue: 40000 },
                            { _id: 'Mar', totalRevenue: 35000 }, { _id: 'Apr', totalRevenue: 50000 },
                            { _id: 'May', totalRevenue: 70000 }, { _id: 'Jun', totalRevenue: 55000 },
                            { _id: 'Jul', totalRevenue: 65000 }, { _id: 'Aug', totalRevenue: 30000 },
                            { _id: 'Sep', totalRevenue: 40000 }, { _id: 'Oct', totalRevenue: 38000 },
                            { _id: 'Nov', totalRevenue: 60000 }, { _id: 'Dec', totalRevenue: 75000 }
                        ]
                    })),
                    adminStatisticService.getOrders({ type: 'daily' }).catch(() => ({
                        data: [
                            { _id: 'Mon', count: 150 }, { _id: 'Tue', count: 120 }, { _id: 'Wed', count: 140 },
                            { _id: 'Thu', count: 130 }, { _id: 'Fri', count: 170 }, { _id: 'Sat', count: 190 }, { _id: 'Sun', count: 200 }
                        ]
                    }))
                ]);

                // Map overview 
                setOverview({
                    totalIncome: overviewRes.data?.totalRevenue || 0,
                    perDayIncome: overviewRes.data?.dailyRevenue || 0,
                    perDayOrders: overviewRes.data?.dailyOrders || 0,
                    customers: overviewRes.data?.totalCustomers || 0,
                });

                // Map revenue
                const mappedRevenue = (revenueRes.data || []).map(item => ({
                    name: item._id, // e.g., 'Jan', 'Feb'
                    income: item.totalRevenue
                }));
                setRevenueData(mappedRevenue);

                // Map orders
                const mappedOrders = (orderRes.data || []).map(item => ({
                    name: item._id, // e.g., 'Mon', 'Tue'
                    orders: item.count
                }));
                setOrderData(mappedOrders);

            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: 'auto', marginTop: '20vh' }} />;

    return (
        <div style={{ textAlign: 'left' }}>
            {/* Top Stat Cards */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: '12px', background: '#e6f7ff', border: 'none' }}>
                        <Statistic
                            title="Total Income"
                            value={overview.totalIncome}
                            prefix={<DollarCircleOutlined style={{ color: '#1890ff' }} />}
                            precision={0}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: '12px', background: '#f6ffed', border: 'none' }}>
                        <Statistic
                            title="Per Day Income"
                            value={overview.perDayIncome}
                            prefix={<DollarCircleOutlined style={{ color: '#52c41a' }} />}
                            precision={0}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: '12px', background: '#fff7e6', border: 'none' }}>
                        <Statistic
                            title="Per Day Orders"
                            value={overview.perDayOrders}
                            prefix={<ShoppingCartOutlined style={{ color: '#fa8c16' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: '12px', background: '#f9f0ff', border: 'none' }}>
                        <Statistic
                            title="Customers"
                            value={(overview.customers / 1000).toFixed(1) + 'K'}
                            prefix={<UserOutlined style={{ color: '#722ed1' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Middle Section: Chart and Top Cars */}
            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                <Col xs={24} lg={18}>
                    <Card title="Total Income" style={{ borderRadius: '12px' }} extra={<Select defaultValue="Yearly" style={{ width: 100 }}><Select.Option value="Yearly">Yearly</Select.Option></Select>}>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                                    <RechartsTooltip />
                                    <Area type="monotone" dataKey="income" stroke="#82ca9d" fillOpacity={1} fill="url(#colorIncome)" />
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
                    <Card title="Number of Orders" style={{ borderRadius: '12px' }} extra={<Select defaultValue="Last Week" style={{ width: 120 }}><Select.Option value="Last Week">Last Week</Select.Option></Select>}>
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={orderData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        title="Last Orders"
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
