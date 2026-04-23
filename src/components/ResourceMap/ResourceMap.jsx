import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spin as AntdSpin, Alert, Badge, Space, Typography, List, Tooltip, Button, Tag, Divider } from 'antd';
import { InfoCircleOutlined, CarOutlined, WarningOutlined, CompassOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

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
});

const deliveryIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

const driverIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1126/1126934.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const vehicleIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/75/75815.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

function ChangeView({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        map.invalidateSize();
        const timers = [setTimeout(() => map.invalidateSize(), 500)];
        return () => timers.forEach(t => clearTimeout(t));
    }, [map, bounds]);
    return null;
}

// Tính khoảng cách 2 điểm
function getDistance(p1, p2) {
    const R = 6371e3;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const φ1 = p1.lat * Math.PI / 180;
    const φ2 = p2.lat * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Chuẩn hóa toạ độ tránh lỗi DB lưu ngược
const normalizeCoord = (coord) => {
    let resPoint = { lat: 0, lng: 0 };
    if (Array.isArray(coord)) {
        resPoint.lng = coord[0] > coord[1] ? coord[0] : coord[1];
        resPoint.lat = coord[0] > coord[1] ? coord[1] : coord[0];
    } else if (coord.lat && coord.lng) {
        resPoint = { lat: coord.lat, lng: coord.lng };
    }
    return resPoint;
};

function isRuleActive(rule, vehicleType, time) {
    if (!rule) return false;

    let vehicleMatch = false;
    if (vehicleType && rule.restrictedVehicles?.length > 0) {
        const vehicleNum = vehicleType.match(/(\d+(\.\d+)?)/)?.[0];
        const normalizedInput = vehicleType.replace('ON', '').replace(' ', '').replace('XE', '').toUpperCase();

        vehicleMatch = rule.restrictedVehicles.some(v => {
            const vUpper = v.toUpperCase();
            const vNum = v.match(/(\d+(\.\d+)?)/)?.[0];
            return vUpper === normalizedInput ||
                normalizedInput.includes(vUpper) ||
                vUpper.includes(normalizedInput) ||
                (vehicleNum && vNum && vehicleNum === vNum);
        });
    } else {
        vehicleMatch = true;
    }

    let timeMatch = false;
    if (time && rule.startTime && rule.endTime) {
        const checkTime = dayjs(time);
        const currentMinutes = checkTime.hour() * 60 + checkTime.minute();

        const [startH, startM] = rule.startTime.split(':').map(Number);
        const [endH, endM] = rule.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (endMinutes < startMinutes) {
            timeMatch = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        } else {
            timeMatch = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        }
    } else {
        timeMatch = true;
    }

    return vehicleMatch && timeMatch;
}

function isPointRestricted(point, allRoutes, vehicleType, dispatchTime) {
    for (const route of allRoutes) {
        if (!route.isActive) continue;

        let isCurrentlyRestricted = false;
        let activeNote = "";

        if (route.trafficRules && route.trafficRules.length > 0) {
            const activeRules = route.trafficRules.filter(rule => isRuleActive(rule, vehicleType, dispatchTime));
            if (activeRules.length > 0) {
                isCurrentlyRestricted = true;
                activeNote = activeRules[0].note || "Giờ cao điểm / Cấm tải";
            }
        } else {
            isCurrentlyRestricted = true;
        }

        if (!isCurrentlyRestricted) continue;

        for (const res of (route.roadRestrictions || [])) {
            if (!res.isActive || !res.geometry || !res.geometry.coordinates) continue;
            const geom = res.geometry;
            let isNear = false;

            const checkDistLine = (coordArray) => {
                if (coordArray.length < 2) return false;
                for (let i = 0; i < coordArray.length - 1; i++) {
                    const p1 = normalizeCoord(coordArray[i]);
                    const p2 = normalizeCoord(coordArray[i + 1]);

                    // THUẬT TOÁN NỘI SUY: Băm đoạn thẳng thành các điểm cách nhau 50m
                    const distTotal = getDistance(p1, p2);
                    const steps = Math.max(1, Math.ceil(distTotal / 50));

                    for (let j = 0; j <= steps; j++) {
                        const fraction = j / steps;
                        const interpLat = p1.lat + (p2.lat - p1.lat) * fraction;
                        const interpLng = p1.lng + (p2.lng - p1.lng) * fraction;

                        if (getDistance(point, { lat: interpLat, lng: interpLng }) < 50) {
                            return true;
                        }
                    }
                }
                return false;
            };

            const checkDistPoint = (coordArray) => {
                for (const coord of coordArray) {
                    const p = normalizeCoord(coord);
                    if (getDistance(point, p) < 50) return true;
                }
                return false;
            };

            if (geom.type === 'Point') {
                isNear = checkDistPoint([geom.coordinates]);
            } else if (geom.type === 'LineString') {
                isNear = checkDistLine(geom.coordinates);
            }

            if (isNear) {
                return {
                    ...res,
                    severity: 'AVOID',
                    description: activeNote || res.description || "Tuyến đường hạn chế"
                };
            }
        }
    }
    return null;
}

const ResourceMap = ({ pickup, delivery, allRoutes = [], vehicleType, dispatchTime, nearbyResources = { drivers: [], vehicles: [] } }) => {
    const [routes, setRoutes] = useState([]);
    const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const [segments, setSegments] = useState([]);

    const fetchRoute = useCallback(async () => {
        if (!pickup || !delivery) return;
        setLoading(true);

        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${delivery.lng},${delivery.lat}?overview=full&geometries=geojson&alternatives=true`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok') {
                setRoutes(data.routes);
                setSelectedRouteIdx(0);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [pickup, delivery]);

    useEffect(() => {
        fetchRoute();
    }, [fetchRoute]);

    const routesWithInfo = useMemo(() => {
        return routes.map((r, idx) => {
            const coords = r.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
            const uniqueResIds = new Set();
            const encounterRestrictions = [];

            coords.forEach(p => {
                const res = isPointRestricted(p, allRoutes, vehicleType, dispatchTime);
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
        }).sort((a, b) => {
            if (a.isSafe && !b.isSafe) return -1;
            if (!a.isSafe && b.isSafe) return 1;
            return a.distance - b.distance;
        });
    }, [routes, allRoutes, vehicleType, dispatchTime]);

    useEffect(() => {
        if (routesWithInfo.length === 0) {
            setSegments([]);
            return;
        }

        const route = routesWithInfo[selectedRouteIdx];
        if (!route) return;

        const coordinates = route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));

        const newSegments = [];
        const firstRestriction = isPointRestricted(coordinates[0], allRoutes, vehicleType, dispatchTime);
        let currentSegment = { positions: [coordinates[0]], isRestricted: !!firstRestriction, restriction: firstRestriction };

        for (let i = 1; i < coordinates.length; i++) {
            const p = coordinates[i];
            const restriction = isPointRestricted(p, allRoutes, vehicleType, dispatchTime);
            const isRestricted = !!restriction;

            if (isRestricted === currentSegment.isRestricted) {
                currentSegment.positions.push(p);
            } else {
                newSegments.push(currentSegment);
                currentSegment = {
                    positions: [coordinates[i - 1], p],
                    isRestricted,
                    restriction
                };
            }
        }
        newSegments.push(currentSegment);
        setSegments(newSegments);

    }, [routesWithInfo, selectedRouteIdx, allRoutes, vehicleType, dispatchTime]);

    if (!pickup || !delivery) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <Text type="secondary">Vui lòng chờ geocoding tọa độ...</Text>
            </div>
        );
    }

    // Initial bounds from pickup and delivery
    const boundPoints = [[pickup.lat, pickup.lng], [delivery.lat, delivery.lng]];

    // Add driver locations to bounds to ensure they are visible
    (nearbyResources.drivers || []).forEach(d => {
        if (d.currentLocation?.coordinates) {
            const pos = normalizeCoord(d.currentLocation.coordinates);
            boundPoints.push([pos.lat, pos.lng]);
        }
    });

    const bounds = L.latLngBounds(boundPoints);

    const currentRouteInfo = routesWithInfo[selectedRouteIdx];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <CompassOutlined style={{ color: '#1890ff' }} />
                    <Text strong>Lựa chọn lộ trình tối ưu</Text>
                </Space>
                <div style={{ fontSize: '12px' }}>
                    <Badge color="#1890ff" text="Bình thường" style={{ marginRight: 16 }} />
                    <Badge color="#ff4d4f" text="Đoạn đường hạn chế" style={{ marginRight: 16 }} />
                    <Badge color="blue" text="Đội ngũ/Tài xế (Live GPS)" />
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
                {/* Floating Driver List Overlay */}
                <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 1000,
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '10px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    maxWidth: '220px',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>
                        📡 Nhân sự khả dụng ({nearbyResources.drivers?.length || 0})
                    </Text>
                    <List
                        size="small"
                        dataSource={nearbyResources.drivers || []}
                        renderItem={d => (
                            <List.Item style={{ padding: '4px 0' }}>
                                <Space direction="vertical" size={0}>
                                    <Text style={{ fontSize: '12px' }}>{d.fullName}</Text>
                                    <Tag color={d.availabilityStatus === 'AVAILABLE' ? 'green' : 'orange'} style={{ fontSize: '10px' }}>
                                        {d.availabilityStatus === 'AVAILABLE' ? 'Rảnh' : 'Bận'}
                                    </Tag>
                                </Space>
                            </List.Item>
                        )}
                    />
                </div>

                <div style={{ flex: 1, position: 'relative' }}>
                    <MapContainer bounds={bounds} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <ChangeView bounds={bounds} />

                        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
                            <Popup><b>Điểm lấy hàng</b><br />{pickup.address}</Popup>
                        </Marker>

                        <Marker position={[delivery.lat, delivery.lng]} icon={deliveryIcon}>
                            <Popup><b>Điểm giao hàng</b><br />{delivery.address}</Popup>
                        </Marker>

                        {/* Rendering Driver-based Fleet Markers */}
                        {(nearbyResources.drivers || []).map(driver => {
                            if (!driver.currentLocation?.coordinates) return null;
                            const pos = normalizeCoord(driver.currentLocation.coordinates);

                            // Tìm xe nếu tài xế đang được gán (Nếu có thông tin này trong driver object)
                            const assignedVehicle = driver.assignedVehicle;

                            return (
                                <Marker key={driver._id} position={[pos.lat, pos.lng]} icon={driverIcon}>
                                    <Popup>
                                        <div style={{ minWidth: '180px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Tag color="blue">Tài xế {driver.role === 'driver' ? 'Chính' : 'Phụ'}</Tag>
                                                {driver.dailyOrders !== undefined && <Tag color="orange">{driver.dailyOrders} đơn/ngày</Tag>}
                                            </div>
                                            <div style={{ marginTop: '8px' }}>
                                                <Text strong>{driver.fullName}</Text><br />
                                                <Text type="secondary" style={{ fontSize: '12px' }}>{driver.phone}</Text>
                                            </div>

                                            {assignedVehicle && (
                                                <div style={{ marginTop: '8px', padding: '6px', background: '#f8faf9', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                                    <Text size="small" type="secondary">Đang đi xe:</Text><br />
                                                    <Text strong style={{ color: '#44624a' }}><CarOutlined /> {assignedVehicle.plateNumber}</Text>
                                                </div>
                                            )}

                                            <Divider style={{ margin: '8px 0' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                                <span>Trạng thái:</span>
                                                <Tag color={driver.availabilityStatus === 'AVAILABLE' ? 'green' : 'red'} style={{ margin: 0 }}>
                                                    {driver.availabilityStatus === 'AVAILABLE' ? 'Sẵn sàng' : 'Đang bận'}
                                                </Tag>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        {/* TIA X: Vẽ đường dữ liệu gốc từ Database màu Tím */}
                        {allRoutes.map((route) =>
                            (route.roadRestrictions || []).map((res, i) => {
                                if (!res.isActive || !res.geometry || !res.geometry.coordinates) return null;
                                if (res.geometry.type === 'LineString') {
                                    const positions = res.geometry.coordinates.map(c => {
                                        const p = normalizeCoord(c);
                                        return [p.lat, p.lng];
                                    });
                                    return (
                                        <Polyline
                                            key={`db-${route.code}-${i}`}
                                            positions={positions}
                                            pathOptions={{ color: 'purple', weight: 12, opacity: 0.3 }}
                                        >
                                            <Popup>
                                                <b>Dữ liệu gốc từ DB:</b> {route.name}<br />
                                                Chỉ hiển thị để Admin kiểm tra tọa độ
                                            </Popup>
                                        </Polyline>
                                    );
                                }
                                return null;
                            })
                        )}

                        {routesWithInfo.map((r, idx) => {
                            if (idx === selectedRouteIdx) return null;
                            return (
                                <Polyline
                                    key={`alt-${idx}`}
                                    positions={r.geometry.coordinates.map(c => [c[1], c[0]])}
                                    pathOptions={{ color: '#bfbfbf', weight: 4, opacity: 0.4, dashArray: '5, 10' }}
                                    eventHandlers={{ click: () => setSelectedRouteIdx(idx) }}
                                />
                            );
                        })}

                        {segments.map((seg, idx) => (
                            <Polyline
                                key={`seg-${idx}`}
                                positions={seg.positions.map(p => [p.lat, p.lng])}
                                pathOptions={{
                                    color: seg.isRestricted ? '#ff4d4f' : '#1890ff',
                                    weight: seg.isRestricted ? 8 : 6,
                                    opacity: 0.9,
                                    lineJoin: 'round'
                                }}
                            >
                                {seg.isRestricted && (
                                    <Popup>
                                        <Badge status="error" text="Hạn chế di chuyển" /><br />
                                        <b>{seg.restriction.roadName || 'Tuyến đường hạn chế'}</b><br />
                                        {seg.restriction.description}
                                    </Popup>
                                )}
                            </Polyline>
                        ))}
                    </MapContainer>

                    <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 1000 }}>
                        <Tooltip title="Về trung tâm">
                            <Button shape="circle" icon={<CompassOutlined />} size="large" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                        </Tooltip>
                    </div>
                </div>

                <div style={{ width: '320px', background: '#fff', borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', zIndex: 1001 }}>
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
                                        padding: '12px 16px', cursor: 'pointer', transition: 'all 0.3s',
                                        background: selectedRouteIdx === index ? '#e6f7ff' : '#fff',
                                        borderLeft: selectedRouteIdx === index ? '4px solid #1890ff' : '4px solid transparent',
                                        borderBottom: '1px solid #f0f0f0'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text strong style={{ color: selectedRouteIdx === index ? '#1890ff' : 'inherit' }}>
                                            Tuyến {index + 1} {index === 0 && <Tag color="green" size="small" style={{ marginLeft: 8 }}>Tối ưu</Tag>}
                                        </Text>
                                        {!item.isSafe && <WarningOutlined style={{ color: '#ff4d4f' }} />}
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#595959' }}>
                                        <span><CarOutlined /> {(item.distance / 1000).toFixed(1)} km</span>
                                        <span>Thời gian lái (Xe tải): {Math.round((item.distance / 1000) * 2.5 + 5)} phút</span>
                                    </div>
                                    {!item.isSafe && (
                                        <div style={{ marginTop: 8, fontSize: '11px', color: '#ff4d4f' }}>
                                            <InfoCircleOutlined /> Có {item.restrictions.length} khu vực bị hạn chế
                                        </div>
                                    )}
                                </div>
                            )}
                        />
                    </div>

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
                            <Alert message="Lộ trình an toàn, không có đoạn đường cấm." type="success" showIcon />
                        )}
                    </div>
                </div>
            </div>

            {loading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, background: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AntdSpin size="large" tip="Đang phân tích các cung đường..." />
                </div>
            )}
        </div>
    );
};

export default ResourceMap;