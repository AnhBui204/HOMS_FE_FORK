import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spin as AntdSpin, Alert, Badge, Space, Typography, List, Card, Tooltip, Button, Tag } from 'antd';
import { InfoCircleOutlined, CarOutlined, WarningOutlined, CompassOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Fix Leaflet default icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const pickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const deliveryIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Helper component to center map
function ChangeView({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        // Force Leaflet to recalculate dimensions (fixes issues inside Modals)
        // We run it multiple times to catch the end of animations
        map.invalidateSize();
        const timers = [
            setTimeout(() => map.invalidateSize(), 300),
            setTimeout(() => map.invalidateSize(), 800),
            setTimeout(() => map.invalidateSize(), 1500),
        ];
        return () => timers.forEach(t => clearTimeout(t));
    }, [map, bounds]);
    return null;
}

/**
 * Utility: Calculate distance between two coordinates in meters
 */
function getDistance(p1, p2) {
    const R = 6371e3; // metres
    const φ1 = p1.lat * Math.PI / 180;
    const φ2 = p2.lat * Math.PI / 180;
    const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
    const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Utility: Check if a point is near a restricted line or point
 */
function isPointRestricted(point, restrictions) {
    for (const res of restrictions) {
        if (!res.isActive) continue;
        const geom = res.geometry;
        if (!geom || !geom.coordinates) continue;

        if (geom.type === 'Point') {
            const resPoint = { lng: geom.coordinates[0], lat: geom.coordinates[1] };
            if (getDistance(point, resPoint) < 50) return res;
        } else if (geom.type === 'LineString') {
            // Check proximity to any point in the restriction line
            for (const coord of geom.coordinates) {
                const resPoint = { lng: coord[0], lat: coord[1] };
                if (getDistance(point, resPoint) < 40) return res;
            }
        }
    }
    return null;
}

const ResourceMap = ({ pickup, delivery, allRestrictions = [] }) => {
    const [routes, setRoutes] = useState([]);
    const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [segments, setSegments] = useState([]); // [{ positions: [], isRestricted: bool, data: {} }]

    const fetchRoute = useCallback(async () => {
        if (!pickup || !delivery) return;
        setLoading(true);
        setError(null);

        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${delivery.lng},${delivery.lat}?overview=full&geometries=geojson&alternatives=true`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== 'Ok') {
                throw new Error('Không thể tìm thấy tuyến đường phù hợp.');
            }

            setRoutes(data.routes);
            setSelectedRouteIdx(0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [pickup, delivery]);

    useEffect(() => {
        fetchRoute();
    }, [fetchRoute]);

    // Process the selected route to detect restricted segments
    useEffect(() => {
        if (routes.length === 0) {
            setSegments([]);
            return;
        }

        const route = routes[selectedRouteIdx];
        const coordinates = route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));

        const newSegments = [];
        let currentSegment = { positions: [coordinates[0]], isRestricted: false, restriction: null };

        for (let i = 1; i < coordinates.length; i++) {
            const p = coordinates[i];
            const restriction = isPointRestricted(p, allRestrictions);
            const isRestricted = !!restriction;

            if (isRestricted === currentSegment.isRestricted) {
                currentSegment.positions.push(p);
            } else {
                // End current segment and start new one
                newSegments.push(currentSegment);
                currentSegment = {
                    positions: [coordinates[i - 1], p], // Overlap one point to maintain continuity
                    isRestricted,
                    restriction
                };
            }
        }
        newSegments.push(currentSegment);
        setSegments(newSegments);

    }, [routes, selectedRouteIdx, allRestrictions]);

    if (!pickup || !delivery) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <Text type="secondary">Vui lòng chờ geocoding tọa độ...</Text>
            </div>
        );
    }

    const bounds = L.latLngBounds([pickup.lat, pickup.lng], [delivery.lat, delivery.lng]);
    const activeRoute = routes[selectedRouteIdx];

    // Calculate restrictions for each route
    const routesWithInfo = routes.map((r, idx) => {
        const coords = r.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
        const restrictedPoints = coords.filter(p => !!isPointRestricted(p, allRestrictions));
        const uniqueResIds = new Set();
        const encounterRestrictions = [];

        coords.forEach(p => {
            const res = isPointRestricted(p, allRestrictions);
            if (res && !uniqueResIds.has(res._id)) {
                uniqueResIds.add(res._id);
                encounterRestrictions.push(res);
            }
        });

        return {
            ...r,
            index: idx,
            restrictions: encounterRestrictions,
            isSafe: encounterRestrictions.length === 0
        };
    });

    const currentRouteInfo = routesWithInfo[selectedRouteIdx];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header Info */}
            <div style={{
                padding: '8px 16px',
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Space>
                    <CompassOutlined style={{ color: '#1890ff' }} />
                    <Text strong>Lựa chọn lộ trình tối ưu</Text>
                </Space>
                <div style={{ fontSize: '12px' }}>
                    <Badge color="#1890ff" text="Bình thường" style={{ marginRight: 16 }} />
                    <Badge color="#ff4d4f" text="Đoạn đường hạn chế" />
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
                {/* Map Area */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <MapContainer
                        bounds={bounds}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <ChangeView bounds={bounds} />

                        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
                            <Popup><b>Điểm lấy hàng</b><br />{pickup.address}</Popup>
                        </Marker>

                        <Marker position={[delivery.lat, delivery.lng]} icon={deliveryIcon}>
                            <Popup><b>Điểm giao hàng</b><br />{delivery.address}</Popup>
                        </Marker>

                        {/* Draw Unselected Routes (Background) */}
                        {routesWithInfo.map((r, idx) => {
                            if (idx === selectedRouteIdx) return null;
                            return (
                                <Polyline
                                    key={`alt-${idx}`}
                                    positions={r.geometry.coordinates.map(c => [c[1], c[0]])}
                                    pathOptions={{
                                        color: '#bfbfbf',
                                        weight: 4,
                                        opacity: 0.4,
                                        dashArray: '5, 10'
                                    }}
                                    eventHandlers={{
                                        click: () => setSelectedRouteIdx(idx)
                                    }}
                                />
                            );
                        })}

                        {/* Draw Active Route Segments */}
                        {segments.map((seg, idx) => (
                            <Polyline
                                key={`seg-${idx}`}
                                positions={seg.positions.map(p => [p.lat, p.lng])}
                                pathOptions={{
                                    color: seg.isRestricted ? '#ff4d4f' : '#1890ff',
                                    weight: 7,
                                    opacity: 0.9,
                                    lineJoin: 'round'
                                }}
                            >
                                {seg.isRestricted && (
                                    <Popup>
                                        <Badge status="error" text="Hạn chế di chuyển" /><br />
                                        <b>{seg.restriction.roadName}</b><br />
                                        {seg.restriction.description}
                                    </Popup>
                                )}
                            </Polyline>
                        ))}
                    </MapContainer>

                    {/* Floating Map Controls */}
                    <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 1000 }}>
                        <Tooltip title="Về trung tâm">
                            <Button
                                shape="circle"
                                icon={<CompassOutlined />}
                                size="large"
                                onClick={() => { }} // Placeholder for recenter logic if needed, Leaflet handled via ChangeView bounds updates
                                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                            />
                        </Tooltip>
                    </div>
                </div>

                {/* Sidebar - Route Selection */}
                <div style={{
                    width: '320px',
                    background: '#fff',
                    borderLeft: '1px solid #f0f0f0',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1001
                }}>
                    <div style={{ padding: '12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        <Text strong size="small">Tuyển đường gợi ý ({routes.length})</Text>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <List
                            dataSource={routesWithInfo}
                            renderItem={(item, index) => (
                                <div
                                    onClick={() => setSelectedRouteIdx(index)}
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s',
                                        background: selectedRouteIdx === index ? '#e6f7ff' : '#fff',
                                        borderLeft: selectedRouteIdx === index ? '4px solid #1890ff' : '4px solid transparent',
                                        borderBottom: '1px solid #f0f0f0'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text strong style={{ color: selectedRouteIdx === index ? '#1890ff' : 'inherit' }}>
                                            Tuyến {index + 1} {index === 0 && <Tag color="blue" size="small" style={{ marginLeft: 8 }}>Nhanh nhất</Tag>}
                                        </Text>
                                        {!item.isSafe && <WarningOutlined style={{ color: '#ff4d4f' }} />}
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#595959' }}>
                                        <span><CarOutlined /> {(item.distance / 1000).toFixed(1)} km</span>
                                        <span> Thời gian: {Math.round(item.duration / 60)} phút</span>
                                    </div>
                                    {!item.isSafe && (
                                        <div style={{ marginTop: 8, fontSize: '11px', color: '#ff4d4f' }}>
                                            <InfoCircleOutlined /> Có {item.restrictions.length} đoạn đường bị hạn chế
                                        </div>
                                    )}
                                </div>
                            )}
                        />
                    </div>

                    {/* Selected Route Detailed Warnings */}
                    <div style={{ padding: '12px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                        {currentRouteInfo?.restrictions.length > 0 ? (
                            <Alert
                                message="Cảnh báo lộ trình"
                                type="error"
                                showIcon
                                description={
                                    <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '11px' }}>
                                        {currentRouteInfo.restrictions.map((r, i) => (
                                            <div key={i}>• {r.roadName || 'Đường không tên'}: {r.description}</div>
                                        ))}
                                    </div>
                                }
                            />
                        ) : (
                            <Alert message="Lộ trình an toàn, không có đoạn đường cấm tải trọng/giờ." type="success" showIcon />
                        )}
                    </div>
                </div>
            </div>

            {loading && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 2000,
                    background: 'rgba(255, 255, 255, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <AntdSpin size="large" tip="Đang phân tích các cung đường..." />
                </div>
            )}
        </div>
    );
};

export default ResourceMap;
