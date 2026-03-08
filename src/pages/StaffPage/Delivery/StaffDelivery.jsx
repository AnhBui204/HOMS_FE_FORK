import React, { useState, useRef } from 'react';
import { Input, Avatar, Button, Tooltip, Select } from 'antd';
import {
    SearchOutlined, PhoneOutlined, MessageOutlined,
    EnvironmentOutlined, UserOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip as MapTooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './StaffDelivery.css';

/* ── Fix Leaflet default icon ──────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

/* ── Custom truck marker ────────────────────────── */
const truckIcon = L.divIcon({
    className: '',
    html: `<div class="truck-marker">🚛</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

/* ── Colored pin markers (same as LocationPicker) ── */
const pickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const dropoffIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

/* ── MOCK ORDERS ───────────────────────────────── */
const MOCK_DELIVERIES = [
    {
        id: 'HOMS-2024-00123',
        status: 'ON_THE_WAY',
        customer: 'Quang Minh',
        phone: '+84 095 122 3119',
        driver: { name: 'Tran Van Khoa', role: 'Driver', avatar: null },
        estimateTime: '03:50 PM',
        date: 'Dec 12, 2023',
        progress: 55,
        pickup: { label: 'Thanh Khê', address: '05 Hà Huy Tập, Thanh Khê', coords: [16.0748, 108.1803] },
        dropoff: { label: 'Hải Châu',  address: '07 Thạc Gián, Hải Châu',  coords: [16.0544, 108.2022] },
        truck: [16.0646, 108.1912],
        route: [[16.0748, 108.1803], [16.0700, 108.1850], [16.0646, 108.1912], [16.0600, 108.1970], [16.0544, 108.2022]],
    },
    {
        id: 'HOMS-2024-00421',
        status: 'IN_TRANSIT',
        customer: 'Phương Anh',
        phone: '+84 037 485 9123',
        driver: { name: 'Nguyen Thi Lan', role: 'Driver', avatar: null },
        estimateTime: '05:20 PM',
        date: 'Dec 12, 2023',
        progress: 30,
        pickup: { label: 'Sơn Trà',  address: '08 Võ Nguyên Giáp, Sơn Trà', coords: [16.0922, 108.2405] },
        dropoff: { label: 'Ngũ Hành Sơn', address: '15 Hùng Vương, Ngũ Hành Sơn', coords: [15.9810, 108.2620] },
        truck: [16.0420, 108.2550],
        route: [[16.0922, 108.2405], [16.0700, 108.2480], [16.0420, 108.2550], [16.0100, 108.2590], [15.9810, 108.2620]],
    },
    {
        id: 'HOMS-2024-05165',
        status: 'DELIVERED',
        customer: 'Hiếu Nguyễn',
        phone: '+84 038 775 2812',
        driver: { name: 'Le Minh Tam', role: 'Driver', avatar: null },
        estimateTime: '10:00 AM',
        date: 'Dec 11, 2023',
        progress: 100,
        pickup: { label: 'Liên Chiểu', address: '34 Tôn Thất Tùng, Liên Chiểu', coords: [16.1100, 108.1580] },
        dropoff: { label: 'Cẩm Lệ',   address: '11 Tôn Đức Thắng, Cẩm Lệ',     coords: [16.0125, 108.1953] },
        truck: [16.0125, 108.1953],
        route: [[16.1100, 108.1580], [16.0800, 108.1720], [16.0500, 108.1840], [16.0125, 108.1953]],
    },
    {
        id: 'HOMS-2024-51235',
        status: 'ON_THE_WAY',
        customer: 'Vy Trần',
        phone: '+84 086 285 8292',
        driver: { name: 'Pham Duc Huy', role: 'Driver', avatar: null },
        estimateTime: '02:15 PM',
        date: 'Dec 12, 2023',
        progress: 70,
        pickup: { label: 'Thanh Khê',  address: '07 Thạc Gián, Thanh Khê',   coords: [16.0720, 108.1760] },
        dropoff: { label: 'Hải Châu',  address: '15 Hùng Vương, Hải Châu',   coords: [16.0680, 108.2210] },
        truck: [16.0705, 108.2050],
        route: [[16.0720, 108.1760], [16.0710, 108.1900], [16.0705, 108.2050], [16.0690, 108.2150], [16.0680, 108.2210]],
    },
];

const STATUS_CONFIG = {
    ON_THE_WAY: { color: '#44624A', bg: '#edf4ef', label: 'On The Way' },
    IN_TRANSIT: { color: '#faad14', bg: '#fffbe6', label: 'In Transit' },
    DELIVERED:  { color: '#1890ff', bg: '#e6f7ff', label: 'Delivered'  },
};
const { Option } = Select;
/* ── Progress bar with truck icon ────────────────── */
const DeliveryProgress = ({ progress }) => (
    <div className="delivery-progress-wrap">
        <div className="dp-track">
            <div className="dp-fill" style={{ width: `${progress}%` }} />
            <div className="dp-truck" style={{ left: `calc(${progress}% - 16px)` }}>🚛</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="dp-label left"><EnvironmentOutlined /> Pickup</div>
            <div className="dp-label right"><EnvironmentOutlined /> Drop-off</div>
        </div>
    </div>
);

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const StaffDelivery = () => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(MOCK_DELIVERIES[0].id);
    const [mapCenter, setMapCenter] = useState(MOCK_DELIVERIES[0].truck);
    const mapRef = useRef(null);

    const filtered = MOCK_DELIVERIES.filter(d => {
        const matchSearch = !search || d.id.toLowerCase().includes(search.toLowerCase()) || d.customer.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || d.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const activeDelivery = MOCK_DELIVERIES.find(d => d.id === expandedId) || MOCK_DELIVERIES[0];

    const handleExpand = (id) => {
        const isCollapsing = expandedId === id;
        setExpandedId(isCollapsing ? null : id);
        if (!isCollapsing) {
            const delivery = MOCK_DELIVERIES.find(d => d.id === id);
            if (delivery) {
                setMapCenter(delivery.truck);
                if (mapRef.current) {
                    mapRef.current.flyTo(delivery.truck, 14, { duration: 1.2 });
                }
            }
        }
    };

    return (
        <div className="staff-delivery">
            {/* ══ LEFT PANEL ═════════════════════════════ */}
            <div className="delivery-left">
                {/* Search + Filter */}
                <div className="delivery-search">
                    <Input
                        placeholder="Search tracking number"
                        prefix={<SearchOutlined style={{ color: '#aaa' }} />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        allowClear
                        className="tracking-search"
                    />
                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        className="status-filter-select"
                    >
                        <Option value="all">All Status</Option>
                        <Option value="ON_THE_WAY">On The Way</Option>
                        <Option value="IN_TRANSIT">In Transit</Option>
                        <Option value="DELIVERED">Delivered</Option>
                    </Select>
                </div>

                {/* Order cards */}
                <div className="order-cards-list">
                    {filtered.length === 0 ? (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', padding: '48px 16px', color: '#bbb', gap: 10,
                        }}>
                            <SearchOutlined style={{ fontSize: 32 }} />
                            <span style={{ fontSize: 14 }}>No shipments found</span>
                        </div>
                    ) : filtered.map(order => {
                        const cfg = STATUS_CONFIG[order.status] || {};
                        const isExpanded = expandedId === order.id;

                        return (
                            <div
                                key={order.id}
                                className={`delivery-card ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => handleExpand(order.id)}
                            >
                                {/* ── Collapsed header ──────────── */}
                                <div className="card-header-row">
                                    <div className="card-tracking">
                                        <span className="tracking-number">#{order.id}</span>
                                    </div>
                                    <span
                                        className="card-status-badge"
                                        style={{ background: cfg.bg, color: cfg.color }}
                                    >
                                        {cfg.label}
                                    </span>
                                </div>

                                {/* ── Expanded body ──────────────── */}
                                {isExpanded && (
                                    <div
                                        className="card-body"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="card-estimate">
                                            <ClockCircleOutlined style={{ color: '#44624A', marginRight: 6 }} />
                                            <span className="est-time">{order.estimateTime}</span>
                                            <span className="est-date">{order.date}</span>
                                        </div>

                                        <DeliveryProgress progress={order.progress} />

                                        <div className="card-addresses">
                                            <div className="addr-col">
                                                <div className="addr-dot pickup-dot" />
                                                <div>
                                                    <div className="addr-label">{order.pickup.label}</div>
                                                    <div className="addr-text">{order.pickup.address}</div>
                                                </div>
                                            </div>
                                            <div className="addr-col dropoff-col">
                                                <div>
                                                    <div className="addr-label">{order.dropoff.label}</div>
                                                    <div className="addr-text">{order.dropoff.address}</div>
                                                </div>
                                                <div className="addr-dot dropoff-dot" />
                                            </div>
                                        </div>

                                        <div className="driver-section">
                                            <div className="driver-info">
                                                <Avatar
                                                    size={42}
                                                    icon={<UserOutlined />}
                                                    style={{ background: '#44624A', flexShrink: 0 }}
                                                />
                                                <div className="driver-text">
                                                    <span className="driver-name">{order.driver.name}</span>
                                                    <span className="driver-role">{order.driver.role}</span>
                                                </div>
                                            </div>
                                            <div className="driver-actions">
                                                <Tooltip title="Call">
                                                    <Button
                                                        type="primary"
                                                        shape="circle"
                                                        icon={<PhoneOutlined />}
                                                        style={{ background: '#44624A', borderColor: '#44624A' }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Message">
                                                    <Button
                                                        shape="circle"
                                                        icon={<MessageOutlined />}
                                                        style={{ borderColor: '#44624A', color: '#44624A' }}
                                                    />
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══ RIGHT PANEL — MAP ══════════════════════ */}
            <div className="delivery-right">
                <MapContainer
                    center={mapCenter}
                    zoom={14}
                    className="delivery-map"
                    ref={mapRef}
                    zoomControl={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {activeDelivery && (
                        <>
                            {/* Route polyline */}
                            <Polyline
                                positions={activeDelivery.route}
                                pathOptions={{ color: '#44624A', weight: 4, dashArray: '8 6', opacity: 0.85 }}
                            />

                            {/* Pickup pin */}
                            <Marker position={activeDelivery.pickup.coords} icon={pickupIcon}>
                                <MapTooltip permanent direction="top" offset={[0, -8]}>
                                    <span style={{ fontSize: 11 }}>{activeDelivery.pickup.label}</span>
                                </MapTooltip>
                            </Marker>

                            {/* Dropoff pin */}
                            <Marker position={activeDelivery.dropoff.coords} icon={dropoffIcon}>
                                <MapTooltip permanent direction="top" offset={[0, -8]}>
                                    <span style={{ fontSize: 11 }}>{activeDelivery.dropoff.label}</span>
                                </MapTooltip>
                            </Marker>

                            {/* Truck marker */}
                            <Marker position={activeDelivery.truck} icon={truckIcon}>
                                <MapTooltip direction="top" offset={[0, -10]}>
                                    <span style={{ fontSize: 12 }}>{activeDelivery.driver.name}</span>
                                </MapTooltip>
                            </Marker>
                        </>
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default StaffDelivery;
