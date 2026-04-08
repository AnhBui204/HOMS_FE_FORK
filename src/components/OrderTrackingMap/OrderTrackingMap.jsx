import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spin, Alert, Badge, Typography, Space } from 'antd';
import { InfoCircleOutlined, CompassOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Fix Leaflet icon issue
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

function ChangeView({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        // Force invalidate size to fix gray areas
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 300);
        return () => clearTimeout(timer);
    }, [map, bounds]);
    return null;
}

const OrderTrackingMap = ({ pickup, delivery, routeData = null }) => {
    const [routeLine, setRouteLine] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchRoute = useCallback(async () => {
        if (!pickup?.lat || !pickup?.lng || !delivery?.lat || !delivery?.lng) return;
        setLoading(true);
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${delivery.lng},${delivery.lat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.code === 'Ok' && data.routes.length > 0) {
                const coordinates = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                setRouteLine(coordinates);
            }
        } catch (err) {
            console.error('OSRM fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [pickup, delivery]);

    useEffect(() => {
        fetchRoute();
    }, [fetchRoute]);

    if (!pickup?.lat || !delivery?.lat) {
        return <Alert message="Thiếu tọa độ lấy/giao hàng để hiển thị bản đồ." type="warning" showIcon />;
    }

    const bounds = L.latLngBounds([pickup.lat, pickup.lng], [delivery.lat, delivery.lng]);
    if (routeLine.length > 0) {
        routeLine.forEach(p => bounds.extend(p));
    }

    return (
        <div style={{ height: '500px', width: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d9d9d9' }}>
            {loading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spin tip="Đang tải lộ trình..." />
                </div>
            )}
            <MapContainer bounds={bounds} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeView bounds={bounds} />

                <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
                    <Popup><b>Điểm lấy hàng</b><br />{pickup.address}</Popup>
                </Marker>

                <Marker position={[delivery.lat, delivery.lng]} icon={deliveryIcon}>
                    <Popup><b>Điểm giao hàng</b><br />{delivery.address}</Popup>
                </Marker>

                {routeLine.length > 0 && (
                    <Polyline positions={routeLine} pathOptions={{ color: '#1890ff', weight: 5, opacity: 0.7 }} />
                )}

                {/* Hiển thị các đoạn đường hạn chế từ Route model */}
                {routeData?.roadRestrictions?.map((res, idx) => {
                    if (!res.isActive || !res.geometry?.coordinates) return null;
                    if (res.geometry.type === 'LineString') {
                        const positions = res.geometry.coordinates.map(c => {
                            // Safe coordinate normalization (lng > lat)
                            return c[0] > c[1] ? [c[1], c[0]] : [c[0], c[1]];
                        });
                        return (
                            <Polyline
                                key={idx}
                                positions={positions}
                                pathOptions={{ 
                                    color: res.severity === 'AVOID' ? '#ff4d4f' : '#faad14', 
                                    weight: 8, 
                                    opacity: 0.8 
                                }}
                            >
                                <Popup>
                                    <Badge status={res.severity === 'AVOID' ? "error" : "warning"} text={res.severity === 'AVOID' ? "Cấm đi" : "Cảnh báo"} /><br />
                                    <b>{res.roadName}</b><br />
                                    {res.description}
                                </Popup>
                            </Polyline>
                        );
                    }
                    if (res.geometry.type === 'Point') {
                        const c = res.geometry.coordinates;
                        const pos = c[0] > c[1] ? [c[1], c[0]] : [c[0], c[1]];
                        return (
                            <Marker key={idx} position={pos}>
                                <Popup>
                                    <Badge status={res.severity === 'AVOID' ? "error" : "warning"} text="Điểm hạn chế" /><br />
                                    <b>{res.roadName}</b><br />
                                    {res.description}
                                </Popup>
                            </Marker>
                        );
                    }
                    return null;
                })}
            </MapContainer>
            
            <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 1000, background: 'white', padding: '8px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                <Space direction="vertical" size={2}>
                    <Badge color="#1890ff" text="Lộ trình di chuyển" />
                    <Badge color="#ff4d4f" text="Đoạn đường cấm (HOMS)" />
                    <Badge color="#faad14" text="Cảnh báo (HOMS)" />
                </Space>
            </div>
        </div>
    );
};

export default OrderTrackingMap;
