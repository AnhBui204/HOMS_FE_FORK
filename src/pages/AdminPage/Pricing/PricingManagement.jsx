import React, { useState, useEffect } from 'react';
import {
    Card, Table, Button, Tag, Space, Typography,
    Tooltip, notification, Popconfirm, Badge, Input, Switch
} from 'antd';
import {
    EditOutlined, DeleteOutlined, PlusOutlined,
    CheckCircleOutlined, CloseCircleOutlined,
    DollarOutlined, ClockCircleOutlined, UnorderedListOutlined, FilterOutlined, ReloadOutlined, SearchOutlined
} from '@ant-design/icons';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip } from 'recharts';
import adminPriceService from '../../../services/adminPriceService';
import PriceModal from './components/PriceModal';

const { Title, Text } = Typography;

const primaryColor = '#2D4F36';

const fmt = (val) =>
    val != null
        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
        : '—';

const PricingManagement = () => {
    const [loading, setLoading] = useState(false);
    const [priceLists, setPriceLists] = useState([]);
    const [filteredPriceLists, setFilteredPriceLists] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingPrice, setEditingPrice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('all'); // all | active | inactive

    const fetchPriceLists = async () => {
        try {
            setLoading(true);
            const response = await adminPriceService.getAllPriceLists();
            // adminPriceService returns response.data from axios.
            // Our BE returns { success, data, total } so `response` will be that object.
            let items = [];
            if (response) {
                if (response.success && Array.isArray(response.data)) items = response.data;
                else if (Array.isArray(response)) items = response;
                else if (response.data && Array.isArray(response.data)) items = response.data;
            }
            setPriceLists(items);
            setFilteredPriceLists(items);
        } catch (error) {
            console.error('Failed to fetch price lists', error);
            notification.error({ message: 'Lỗi tải bảng giá', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPriceLists(); }, []);

    const [togglingIds, setTogglingIds] = useState([]);

    const handleToggleActive = async (record) => {
        const id = record._id;
        const newVal = !record.isActive;
        setTogglingIds(prev => [...prev, id]);
        try {
            // Use dedicated toggle endpoint so backend enforces single-active rule
            await adminPriceService.toggleActive(id, newVal);
            notification.success({ message: `Bảng giá ${newVal ? 'đã kích hoạt' : 'đã chuyển sang không dùng'}` });
            await fetchPriceLists();
        } catch (error) {
            notification.error({ message: 'Không thể thay đổi trạng thái', description: error.response?.data?.message || error.message });
        } finally {
            setTogglingIds(prev => prev.filter(x => x !== id));
        }
    };

    const handleDelete = async (id) => {
        try {
            await adminPriceService.deletePriceList(id);
            notification.success({ message: 'Đã xóa bảng giá' });
            fetchPriceLists();
        } catch (error) {
            notification.error({ message: 'Không thể xóa', description: error.response?.data?.message || error.message });
        }
    };

    const columns = [
        {
            title: 'Mã / Tên',
            key: 'nameCode',
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ color: '#2D4F36' }}>{r.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{r.code}</Text>
                </Space>
            )
        },
        {
            title: 'Thuế VAT',
            dataIndex: 'taxRate',
            width: 90,
            render: val => val != null ? `${(val * 100).toFixed(0)}%` : '—'
        },
        {
            title: 'Phí tối thiểu',
            key: 'min',
            width: 140,
            render: (_, r) => fmt(r.basePrice?.minimumCharge)
        },
        {
            title: 'Phí nhân công / giờ',
            key: 'labor',
            width: 160,
            render: (_, r) => fmt(r.laborCost?.pricePerHourPerPerson)
        },
        {
            title: 'Xe (số bậc)',
            key: 'vehicle',
            width: 110,
            render: (_, r) => {
                const count = r.vehiclePricing?.length || 0;
                return <Badge count={count} color="#1677ff" showZero><Tag>{count} loại xe</Tag></Badge>;
            }
        },
        {
            title: 'Vận chuyển (bậc)',
            key: 'transport',
            width: 130,
            render: (_, r) => {
                const count = r.transportTiers?.length || 0;
                return <Badge count={count} color="#52c41a" showZero><Tag color="green">{count} bậc</Tag></Badge>;
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            width: 110,
            render: (active) =>
                active
                    ? <Tag icon={<CheckCircleOutlined />} color="success">Đang dùng</Tag>
                    : (
                        <Tag
                            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                            style={{
                                color: '#ff4d4f',
                                borderColor: '#ff4d4f',
                                background: '#fff1f0',
                                borderStyle: 'solid'
                            }}
                        >
                            Không dùng
                        </Tag>
                    )
        },
        
        {
            title: 'Thao tác',
            key: 'actions',
            width: 90,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title={record.isActive ? 'Tắt kích hoạt' : 'Kích hoạt'}>
                        <Switch
                            checked={record.isActive}
                            size="small"
                            onChange={() => handleToggleActive(record)}
                            loading={togglingIds.includes(record._id)}
                            checkedChildren={<CheckCircleOutlined style={{ color: '#fff', fontSize: 12 }} />}
                            unCheckedChildren={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />}
                            style={{
                                // change track color depending on state
                                background: record.isActive ? primaryColor : '#fff1f0',
                                borderColor: record.isActive ? primaryColor : '#ffd8d6',
                                boxShadow: record.isActive ? 'none' : 'inset 0 0 0 1px rgba(255,77,79,0.08)'
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            style={{ color: '#1890ff' }}
                            onClick={() => { setEditingPrice(record); setIsModalVisible(true); }}
                        />
                    </Tooltip>
                    <Tooltip title="Xóa">
                        <Popconfirm
                            title="Xóa bảng giá này?"
                            onConfirm={() => handleDelete(record._id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                            disabled={record.isActive}
                        >
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                disabled={record.isActive}
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            )
        },
    ];

    // Derived stats and chart data
    const stats = (() => {
        const total = priceLists.length;
        const active = priceLists.filter(p => p.isActive).length;
        const inactive = total - active;
        const now = new Date();
        const expiringSoon = priceLists.filter(p => p.effectiveTo && (new Date(p.effectiveTo) - now) <= (30 * 24 * 60 * 60 * 1000) && new Date(p.effectiveTo) >= now).length;
        return { total, active, inactive, expiringSoon };
    })();

    // Average minimum charge across price lists (rounded)
    const avgMinCharge = (() => {
        const vals = priceLists.map(p => p.basePrice?.minimumCharge).filter(v => v != null && !isNaN(v));
        if (!vals.length) return 0;
        const sum = vals.reduce((s, v) => s + v, 0);
        return Math.round(sum / vals.length);
    })();

    const pieData = [
        { name: 'Đang dùng', value: stats.active },
        { name: 'Không dùng', value: stats.inactive }
    ];
    // Pastel variants of existing colors (keep hue but soften)
    const pieColors = ['#cfe6d6', '#ffd8d6'];
    const centerPercent = stats.total ? Math.round((stats.active / stats.total) * 100) : 0;

    // Apply client-side search + quick filters
    useEffect(() => {
        let out = Array.isArray(priceLists) ? priceLists.slice() : [];
        if (searchTerm && searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            out = out.filter(p => (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q));
        }
        if (filterMode === 'active') out = out.filter(p => p.isActive);
        if (filterMode === 'inactive') out = out.filter(p => !p.isActive);
        setFilteredPriceLists(out);
    }, [priceLists, searchTerm, filterMode]);

    return (
        <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý Bảng Giá</Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ borderRadius: 8, background: primaryColor, borderColor: primaryColor }}
                    onClick={() => { setEditingPrice(null); setIsModalVisible(true); }}
                >
                    Tạo bảng giá mới
                </Button>
            </div>

            {/* Top summary cards + charts */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'stretch' }}>
                <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Card style={{ borderRadius: 12, padding: 12, background: '#f6faf4' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 56, height: 56, borderRadius: 10, background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                <DollarOutlined style={{ fontSize: 20 }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>Tổng bảng giá</div>
                                <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.total}</div>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Tổng số bảng giá hiện có</div>
                            </div>
                        </div>
                    </Card>

                    <Card style={{ borderRadius: 12, padding: 12, background: '#fffaf0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 8, background: '#d46b08', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                <ClockCircleOutlined style={{ fontSize: 18 }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>Phí sàn trung bình</div>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{avgMinCharge ? fmt(avgMinCharge) : '—'}</div>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Trung bình trên tất cả bảng giá</div>
                            </div>
                        </div>
                    </Card>
                </div>

                <Card style={{ flex: 1, borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                <Input.Search allowClear placeholder="Tìm theo mã hoặc tên" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ maxWidth: 360 }} prefix={<SearchOutlined />} />
                                <Space>
                                    <Button icon={<FilterOutlined />} onClick={() => setFilterMode('active')} type={filterMode === 'active' ? 'primary' : 'default'}>Đang dùng</Button>
                                    <Button icon={<UnorderedListOutlined />} onClick={() => setFilterMode('inactive')} type={filterMode === 'inactive' ? 'primary' : 'default'}>Không dùng</Button>
                                    <Button icon={<ReloadOutlined />} onClick={() => { setFilterMode('all'); setSearchTerm(''); }}>Reset</Button>
                                </Space>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ flex: 1, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            {/* Outer pastel donut */}
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={52}
                                                outerRadius={84}
                                                paddingAngle={6}
                                                startAngle={90}
                                                endAngle={-270}
                                            >
                                                {pieData.map((entry, idx) => (
                                                    <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                                                ))}
                                            </Pie>

                                            {/* Slight inner subtle ring to mimic the example's layered look */}
                                            <Pie
                                                data={[{ value: 1 }]}
                                                dataKey="value"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={38}
                                                outerRadius={46}
                                                isAnimationActive={false}
                                            >
                                                <Cell fill="#f5ecd8" />
                                            </Pie>

                                            {/* Small white center circle drawn as a Pie so it's inside the SVG and perfectly centered */}
                                            <Pie
                                                data={[{ value: 1 }]}
                                                dataKey="value"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius={36}
                                                isAnimationActive={false}
                                            >
                                                <Cell fill="#ffffff" />
                                            </Pie>

                                            {/* Center text inside the SVG for precise centering */}
                                            <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: 'rgba(0,0,0,0.45)', letterSpacing: 1 }}>{'ĐANG DÙNG'}</text>
                                            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 20, fill: primaryColor, fontWeight: 800 }}>{`${centerPercent}%`}</text>

                                            <ReTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    

                                    {/* Legend below the donut */}
                                    <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 12, height: 12, borderRadius: 3, background: pieColors[0], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.03)' }} />
                                            <div style={{ fontSize: 12 }}>Đang dùng <span style={{ color: 'rgba(0,0,0,0.45)' }}>({stats.active})</span></div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 12, height: 12, borderRadius: 3, background: pieColors[1], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.03)' }} />
                                            <div style={{ fontSize: 12 }}>Không dùng <span style={{ color: 'rgba(0,0,0,0.45)' }}>({stats.inactive})</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ width: 220 }}>
                            <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>Đang dùng</div>
                                <div style={{ fontSize: 22, color: primaryColor, fontWeight: 800 }}>{stats.active}</div>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Trong tổng {stats.total}</div>
                            </Card>
                            <Card size="small" style={{ borderRadius: 8, marginTop: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>Hết hạn sắp tới</div>
                                <div style={{ fontSize: 20, color: '#d46b08', fontWeight: 700 }}>{stats.expiringSoon}</div>
                                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Trong 30 ngày</div>
                            </Card>
                        </div>
                    </div>
                </Card>
            </div>

            <Card style={{ borderRadius: 12, border: 'none' }}>
                <Table
                    columns={columns}
                    dataSource={filteredPriceLists}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <PriceModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                priceList={editingPrice}
                onSuccess={fetchPriceLists}
            />
        </div>
    );
};

export default PricingManagement;
