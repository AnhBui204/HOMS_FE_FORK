import React, { useEffect, useState } from 'react';
import { Card, Select, Badge, Typography } from 'antd';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from "../../services/api";
const { Text } = Typography;

// Custom Icons for Map
const driverIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const LiveFleetMonitor = () => {
    const [fleetData, setFleetData] = useState({});

    useEffect(() => {
        const fetchInitialLocations = async () => {
            try {
                const response = await api.get('/customer/drivers');
                if (response.data && response.data.success) {
                    const initialData = {};
                    response.data.data.forEach(driver => {
                        if (driver.currentLocation && driver.currentLocation.coordinates) {
                            initialData[driver._id] = {
                                userId: driver._id,
                                role: driver.role,
                                fullName: driver.fullName,
                                location: driver.currentLocation
                            };
                        }
                    });
                    setFleetData(initialData);
                }
            } catch (error) {
                console.error('Lỗi khi tải vị trí ban đầu của đội xe:', error);
            }
        };

        fetchInitialLocations();

        const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const socketUrl = rawUrl.replace(/\/api\/?$/, ''); // Strip out /api if present

        const socket = io(socketUrl, {
            transports: ['polling', 'websocket'],
            withCredentials: true
        });

        socket.on('connect', () => {
            console.log('Connected to Fleet Monitor Socket');
            socket.emit('join_dispatcher_room');
        });

        socket.on('location_updated', (data) => {
            setFleetData(prev => ({
                ...prev,
                [data.userId]: {
                    ...prev[data.userId],
                    ...data
                }
            }));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const activeDrivers = Object.values(fleetData);

    return (
        <Card title="Bản đồ theo dõi Đội xe (Live Fleet Monitor)" bordered={false} style={{ height: '100%' }}>
            <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', zIndex: 1 }}>
                <MapContainer center={[16.0544, 108.2022]} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {activeDrivers.map((driver) => {
                        if (!driver.location || !driver.location.coordinates) return null;
                        return (
                            <Marker
                                key={driver.userId}
                                position={[driver.location.coordinates[1], driver.location.coordinates[0]]}
                                icon={driverIcon}
                            >
                                <Popup>
                                    <div style={{ padding: '4px' }}>
                                        <Text strong>{driver.fullName || 'Tài xế/Nhân viên'}</Text><br />
                                        <Badge status="processing" text={driver.role || 'Đang hoạt động'} />
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        </Card>
    );
};

export default LiveFleetMonitor;
