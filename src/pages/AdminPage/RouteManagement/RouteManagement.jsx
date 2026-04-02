import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Card, Select, Space, Tag, message, Popconfirm, Row, Col, InputNumber, Typography, Divider, Tooltip, List, Badge } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, EnvironmentOutlined, SearchOutlined, ClearOutlined, UndoOutlined, CompassOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import adminRouteService from '../../../services/adminRouteService';

const { Option } = Select;
const { Text } = Typography;

// Sửa lỗi icon Marker
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const DANANG_CENTER = [16.0544, 108.2022];
const DISTRICTS = ["HAI_CHAU", "THANH_KHE", "SON_TRA", "NGU_HANH_SON", "LIEN_CHIEU", "CAM_LE"];
const DISTRICT_LABELS = {
    "HAI_CHAU": "Quận Hải Châu", "THANH_KHE": "Quận Thanh Khê",
    "SON_TRA": "Quận Sơn Trà", "NGU_HANH_SON": "Quận Ngũ Hành Sơn",
    "LIEN_CHIEU": "Quận Liên Chiểu", "CAM_LE": "Quận Cẩm Lệ"
};
const RULE_TYPE_LABELS = { "PEAK_HOUR": "Giờ cao điểm", "TRUCK_BAN": "Cấm xe tải", "WEATHER": "Thời tiết", "HOLIDAY": "Ngày lễ" };

// --- HÀM XỬ LÝ TỌA ĐỘ AN TOÀN ---
// Giúp Leaflet không bao giờ bị lỗi do DB lưu ngược [Lat, Lng] hay [Lng, Lat]
const toLatLng = (c) => {
    if (!c) return [0, 0];
    if (Array.isArray(c)) {
        // Tọa độ VN luôn có Kinh độ (Lng) > 100, Vĩ độ (Lat) ~ 16
        // Leaflet cần [Lat, Lng]
        return c[0] > c[1] ? [c[1], c[0]] : [c[0], c[1]];
    }
    return [c.lat || 0, c.lng || 0];
};

// --- COMPONENTS HỖ TRỢ MAP ---
const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({ click(e) { onMapClick([e.latlng.lng, e.latlng.lat]); } });
    return null;
};

const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center && Array.isArray(center) && !isNaN(center[0]) && !isNaN(center[1])) {
            const size = map.getSize();
            if (size.x > 0 && size.y > 0) {
                map.flyTo(center, zoom || 15, { animate: true, duration: 1.5 });
            } else {
                map.setView(center, zoom || 15);
            }
        }
    }, [center, map, zoom]);
    return null;
};

const FixMapSize = () => {
    const map = useMap();
    useEffect(() => {
        const invalidate = () => map.invalidateSize();
        // Ép map tính toán lại liên tục trong 1 giây đầu khi Modal giãn nở
        const timers = [50, 150, 300, 500, 800, 1000].map(t => setTimeout(invalidate, t));
        window.addEventListener('resize', invalidate);
        return () => {
            timers.forEach(t => clearTimeout(t));
            window.removeEventListener('resize', invalidate);
        };
    }, [map]);
    return null;
};

const RouteManagement = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    // Modal States
    const [isRouteModalVisible, setIsRouteModalVisible] = useState(false);
    const [isRuleModalVisible, setIsRuleModalVisible] = useState(false);
    const [isRestrictionModalVisible, setIsRestrictionModalVisible] = useState(false);

    const [editingRoute, setEditingRoute] = useState(null);
    const [editingRestriction, setEditingRestriction] = useState(null);

    const [drawnCoords, setDrawnCoords] = useState([]);
    const [mapCenter, setMapCenter] = useState(DANANG_CENTER);

    const [form] = Form.useForm();
    const [ruleForm] = Form.useForm();
    const [restrictionForm] = Form.useForm();
    const geometryType = Form.useWatch('geometryType', restrictionForm);

    const fetchRoutes = async () => {
        setLoading(true);
        try {
            const data = await adminRouteService.getAllRoutes();
            setRoutes(data.data || []);
        } catch (error) { message.error('Lỗi tải dữ liệu'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRoutes(); }, []);

    // --- ROUTE & RULES SUBMIT ---
    const showCreateRouteModal = () => {
        setEditingRoute(null);
        form.resetFields();
        setIsRouteModalVisible(true);
    };

    const showEditRouteModal = (record) => {
        setEditingRoute(record);
        form.setFieldsValue(record);
        setIsRouteModalVisible(true);
    };

    const handleRouteSubmit = async (values) => {
        try {
            if (editingRoute) {
                await adminRouteService.updateRoute(editingRoute._id, values);
                message.success('Cập nhật lộ trình thành công');
            } else {
                await adminRouteService.createRoute(values);
                message.success('Tạo lộ trình mới thành công');
            }
            setIsRouteModalVisible(false);
            fetchRoutes();
        } catch (error) { message.error(error.response?.data?.message || 'Có lỗi xảy ra'); }
    };

    const handleDeleteRoute = async (id) => {
        try {
            await adminRouteService.deleteRoute(id);
            message.success('Đã tắt trạng thái lộ trình');
            fetchRoutes();
        } catch (error) { message.error('Lỗi khi xóa lộ trình'); }
    };

    const showAddRuleModal = (record) => {
        setEditingRoute(record);
        ruleForm.resetFields();
        setIsRuleModalVisible(true);
    };

    const handleRuleSubmit = async (values) => {
        try {
            await adminRouteService.addTrafficRule(editingRoute._id, values);
            message.success('Thêm luật giao thông thành công');
            setIsRuleModalVisible(false);
            fetchRoutes();
        } catch (error) { message.error(error.response?.data?.message || 'Có lỗi xảy ra'); }
    };

    // --- ROAD RESTRICTIONS (VẼ MAP) ---
    const showAddRestrictionModal = (route, existingRes = null) => {
        setEditingRoute(route);
        setEditingRestriction(existingRes);

        if (existingRes && existingRes.geometry) {
            // Load dữ liệu cũ an toàn
            const coords = existingRes.geometry.type === 'Point'
                ? [existingRes.geometry.coordinates]
                : (existingRes.geometry.coordinates || []);

            setDrawnCoords(coords);
            if (coords.length > 0) {
                const centerLatLng = toLatLng(coords[0]);
                setMapCenter([centerLatLng[0], centerLatLng[1]]);
            } else {
                setMapCenter(DANANG_CENTER);
            }

            restrictionForm.setFieldsValue({
                roadName: existingRes.roadName,
                severity: existingRes.severity,
                geometryType: existingRes.geometry.type,
                description: existingRes.description
            });
        } else {
            setDrawnCoords([]);
            setMapCenter(DANANG_CENTER);
            restrictionForm.resetFields();
            restrictionForm.setFieldsValue({ geometryType: 'LineString', severity: 'AVOID', roadName: route.name });
        }
        setIsRestrictionModalVisible(true);
    };

    const handleMapClick = (coord) => {
        if (geometryType === 'Point') {
            setDrawnCoords([coord]);
        } else {
            setDrawnCoords(prev => [...prev, coord]);
        }
    };

    const handleSearchLocation = async (value) => {
        if (!value) return;
        setSearchLoading(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value + ", Đà Nẵng")}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                message.success(`Đã tìm thấy: ${data[0].display_name}`, 2);
            } else {
                message.warning('Không tìm thấy địa điểm này ở Đà Nẵng');
            }
        } catch (error) { message.error('Lỗi khi tìm kiếm'); }
        finally { setSearchLoading(false); }
    };

    const handleRestrictionSubmit = async (values) => {
        if (drawnCoords.length === 0) return message.error('Vui lòng chấm tọa độ trên bản đồ!');
        if (values.geometryType === 'LineString' && drawnCoords.length < 2) return message.error('Vẽ đường LineString cần chấm ít nhất 2 điểm!');

        try {
            const finalCoords = values.geometryType === 'Point' ? drawnCoords[0] : drawnCoords;
            const payload = {
                roadName: values.roadName || editingRoute.name,
                severity: values.severity,
                description: values.description,
                geometry: { type: values.geometryType, coordinates: finalCoords }
            };

            if (editingRestriction) {
                await adminRouteService.updateRoadRestriction(editingRoute._id, editingRestriction._id, payload);
                message.success('Cập nhật đoạn đường thành công');
            } else {
                await adminRouteService.addRoadRestriction(editingRoute._id, payload);
                message.success('Thêm mới đoạn đường thành công');
            }

            setIsRestrictionModalVisible(false);
            fetchRoutes();
        } catch (error) { message.error('Có lỗi xảy ra khi lưu tọa độ'); }
    };

    const handleDeleteRestriction = async (routeId, resId) => {
        try {
            await adminRouteService.deleteRoadRestriction(routeId, resId);
            message.success('Đã xóa đoạn đường hạn chế');
            if (editingRestriction && editingRestriction._id === resId) {
                setIsRestrictionModalVisible(false);
            }
            fetchRoutes();
        } catch (error) { message.error('Lỗi khi xóa đoạn đường'); }
    };

    // --- BẢNG HIỂN THỊ ---
    const filteredRoutes = routes.filter(r =>
        (r.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (r.code || '').toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        { title: 'Mã Tuyến', dataIndex: 'code', key: 'code', render: t => <Text strong>{t}</Text> },
        { title: 'Tên Đường', dataIndex: 'name', key: 'name', render: t => <Text strong>{t}</Text> },
        { title: 'Quận/Huyện', dataIndex: 'district', key: 'district', render: d => <Tag color="blue">{DISTRICT_LABELS[d] || d}</Tag> },
        { title: 'Thành phố', dataIndex: 'area', key: 'area' },
        { title: 'K/cách (km)', dataIndex: 'estimatedDistanceKm', key: 'estimatedDistanceKm', align: 'center' },
        {
            title: 'Thống kê',
            key: 'stats',
            render: (_, r) => (
                <Space direction="vertical" size="small">
                    <Badge count={r.trafficRules?.length || 0} showZero color="#faad14" text="Luật thời gian" />
                    <Badge count={r.roadRestrictions?.length || 0} showZero color="#f5222d" text="Đoạn cấm (Map)" />
                </Space>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Sửa Lộ trình"><Button type="primary" ghost icon={<EditOutlined />} onClick={() => showEditRouteModal(record)} /></Tooltip>
                    <Tooltip title="Thêm Luật Giờ/Tải trọng"><Button style={{ color: '#faad14', borderColor: '#faad14' }} icon={<InfoCircleOutlined />} onClick={() => showAddRuleModal(record)} /></Tooltip>
                    <Tooltip title="Vẽ tọa độ cấm trên Bản đồ"><Button danger icon={<EnvironmentOutlined />} onClick={() => showAddRestrictionModal(record)} /></Tooltip>
                    <Popconfirm title="Tắt trạng thái hoạt động lộ trình này?" onConfirm={() => handleDeleteRoute(record._id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const expandedRowRender = (record) => (
        <div style={{ padding: '16px', background: '#fcfcfc', border: '1px solid #f0f0f0', borderRadius: 8 }}>
            <Row gutter={24}>
                <Col span={10}>
                    <Text strong style={{ color: '#faad14' }}>📜 Luật Giao Thông (Giờ/Tải trọng)</Text>
                    <Divider style={{ margin: '8px 0' }} />
                    {record.trafficRules?.length > 0 ? (
                        <List size="small" dataSource={record.trafficRules} renderItem={rule => (
                            <List.Item>
                                <Text>[{RULE_TYPE_LABELS[rule.ruleType]}] {rule.startTime} - {rule.endTime}</Text><br />
                                <Text type="secondary">Cấm: {rule.restrictedVehicles?.join(', ')}</Text>
                            </List.Item>
                        )} />
                    ) : <Text type="secondary">Chưa có luật nào.</Text>}
                </Col>
                <Col span={14}>
                    <Text strong style={{ color: '#f5222d' }}>📍 Tọa độ cấm (Road Restrictions)</Text>
                    <Divider style={{ margin: '8px 0' }} />
                    <List
                        size="small"
                        dataSource={record.roadRestrictions}
                        locale={{ emptyText: 'Chưa vẽ đoạn cấm nào trên bản đồ.' }}
                        renderItem={res => (
                            <List.Item actions={[
                                <Button size="small" type="link" icon={<EditOutlined />} onClick={() => showAddRestrictionModal(record, res)}>Sửa trên Map</Button>,
                                <Popconfirm title="Xóa đoạn vẽ này khỏi bản đồ?" onConfirm={() => handleDeleteRestriction(record._id, res._id)}>
                                    <Button size="small" type="link" danger icon={<DeleteOutlined />}>Xóa</Button>
                                </Popconfirm>
                            ]}>
                                <List.Item.Meta
                                    title={<Space><Tag color={res.severity === 'AVOID' ? 'red' : 'orange'}>{res.severity}</Tag><Text strong>{res.roadName}</Text></Space>}
                                    description={<span>{res.description} <Text type="secondary">(Dạng: {res.geometry.type})</Text></span>}
                                />
                            </List.Item>
                        )}
                    />
                </Col>
            </Row>
        </div>
    );

    return (
        <Card title="Quản lý Lộ Trình & Bản đồ Hạn chế" extra={<Button type="primary" icon={<PlusOutlined />} onClick={showCreateRouteModal}>Tạo Tuyến Mới</Button>}>
            <Space style={{ marginBottom: 16 }}>
                <Input placeholder="Tìm tuyến đường..." prefix={<SearchOutlined />} onChange={e => setSearchText(e.target.value)} style={{ width: 300 }} />
            </Space>

            <Table columns={columns} dataSource={filteredRoutes} rowKey="_id" loading={loading} expandable={{ expandedRowRender }} />

            {/* MODAL 1: TẠO / SỬA LỘ TRÌNH CHÍNH */}
            <Modal title={editingRoute ? 'Cập nhật lộ trình' : 'Tạo mới lộ trình'} visible={isRouteModalVisible} onCancel={() => setIsRouteModalVisible(false)} onOk={() => form.submit()} width={800}>
                <Form form={form} layout="vertical" onFinish={handleRouteSubmit}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="code" label="Mã đường (Viết tắt)" rules={[{ required: true }]}><Input placeholder="Ví dụ: NGUYEN_TAT_THANH" disabled={!!editingRoute} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="name" label="Tên đường" rules={[{ required: true }]}><Input placeholder="Ví dụ: Nguyễn Tất Thành" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="district" label="Quận/Huyện" rules={[{ required: true }]}><Select>{DISTRICTS.map(d => <Option key={d} value={d}>{DISTRICT_LABELS[d]}</Option>)}</Select></Form.Item></Col>
                        <Col span={12}><Form.Item name="area" label="Khu vực / Thành phố" rules={[{ required: true }]}><Input placeholder="Ví dụ: Da_Nang" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="estimatedDistanceKm" label="Khoảng cách (km)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="estimatedDurationMin" label="Thời gian (phút)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="routeSurcharge" label="Phụ phí lộ trình (VND)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>

            {/* MODAL 2: THÊM LUẬT GIAO THÔNG */}
            <Modal title={`Thêm luật giao thông: ${editingRoute?.name}`} visible={isRuleModalVisible} onCancel={() => setIsRuleModalVisible(false)} onOk={() => ruleForm.submit()}>
                <Form form={ruleForm} layout="vertical" onFinish={handleRuleSubmit}>
                    <Form.Item name="ruleType" label="Loại luật" rules={[{ required: true }]}><Select><Option value="PEAK_HOUR">Giờ cao điểm</Option><Option value="TRUCK_BAN">Cấm tải</Option><Option value="WEATHER">Thời tiết xấu</Option><Option value="HOLIDAY">Ngày lễ</Option></Select></Form.Item>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="startTime" label="Giờ bắt đầu (VD: 06:00)" rules={[{ required: true }]}><Input placeholder="06:00" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="endTime" label="Giờ kết thúc (VD: 08:30)" rules={[{ required: true }]}><Input placeholder="08:30" /></Form.Item></Col>
                    </Row>
                    <Form.Item name="restrictedVehicles" label="Loại xe bị cấm (Tùy chọn)"><Select mode="tags" placeholder="Ví dụ: 1.5TON, 2TON" /></Form.Item>
                    <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>

            {/* MODAL 3: WORKSPACE VẼ VÀ QUẢN LÝ BẢN ĐỒ */}
            <Modal
                title={<span><EnvironmentOutlined style={{ color: 'red' }} /> {editingRestriction ? 'Sửa đoạn đường' : 'Vẽ khu vực mới'}: {editingRoute?.name}</span>}
                visible={isRestrictionModalVisible}
                onCancel={() => setIsRestrictionModalVisible(false)}
                onOk={() => restrictionForm.submit()}
                width={1200} style={{ top: 20 }}
                okText={editingRestriction ? "Lưu thay đổi" : "Thêm đoạn cấm"}
                destroyOnClose={true} // QUAN TRỌNG: ÉP BẢN ĐỒ RESET KHI ĐÓNG ĐỂ TRÁNH LỖI XÁM
            >
                <Form form={restrictionForm} layout="vertical" onFinish={handleRestrictionSubmit}>
                    <Row gutter={16} align="bottom">
                        <Col span={5}>
                            <Form.Item name="geometryType" label="Công cụ vẽ" rules={[{ required: true }]}>
                                <Select onChange={() => setDrawnCoords([])} disabled={!!editingRestriction}>
                                    <Option value="LineString">Đoạn đường (LineString)</Option>
                                    <Option value="Point">Một điểm (Point)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Tìm vị trí nhanh trên Map">
                                <Input.Search placeholder="Nhập tên đường..." enterButton="Tìm" onSearch={handleSearchLocation} loading={searchLoading} />
                            </Form.Item>
                        </Col>
                        <Col span={11} style={{ textAlign: 'right', paddingBottom: 24 }}>
                            <Space>
                                <Button icon={<CompassOutlined />} onClick={() => setMapCenter([...DANANG_CENTER])}>Trung tâm ĐN</Button>
                                <Button danger icon={<ClearOutlined />} onClick={() => setDrawnCoords([])}>Xóa trắng bản đồ</Button>
                            </Space>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        {/* VÙNG CHỨA MAP */}
                        <Col span={17}>
                            <div style={{ height: '450px', border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                                {isRestrictionModalVisible && (
                                    <MapContainer center={DANANG_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <FixMapSize />
                                        <MapController center={mapCenter} zoom={16} />
                                        <MapClickHandler onMapClick={(c) => geometryType === 'Point' ? setDrawnCoords([c]) : setDrawnCoords(p => [...p, c])} />

                                        {/* HIỂN THỊ CÁC ĐOẠN KHÁC (Lớp nền xám) AN TOÀN TRÁNH CRASH */}
                                        {(editingRoute?.roadRestrictions || []).filter(r => r._id !== editingRestriction?._id).map(res => {
                                            if (!res.geometry || !res.geometry.coordinates) return null;

                                            // Xử lý an toàn nếu là 1 điểm
                                            if (res.geometry.type === 'Point') {
                                                const c = toLatLng(res.geometry.coordinates);
                                                return (
                                                    <Marker key={res._id} position={c} eventHandlers={{ click: () => showAddRestrictionModal(editingRoute, res) }}>
                                                        <Popup>Đoạn: {res.roadName} <br /> (Click sửa)</Popup>
                                                    </Marker>
                                                );
                                            }

                                            // Xử lý an toàn nếu là đường kẻ
                                            if (res.geometry.type === 'LineString') {
                                                const positions = res.geometry.coordinates.map(c => toLatLng(c));
                                                return (
                                                    <Polyline
                                                        key={res._id} positions={positions}
                                                        pathOptions={{ color: '#bfbfbf', weight: 4, dashArray: '5, 10' }}
                                                        eventHandlers={{ click: () => showAddRestrictionModal(editingRoute, res) }}
                                                    >
                                                        <Popup><b>{res.roadName}</b><br /><Text type="secondary">Click vào đường để sửa</Text></Popup>
                                                    </Polyline>
                                                );
                                            }
                                            return null;
                                        })}

                                        {/* ĐOẠN ĐANG VẼ */}
                                        {drawnCoords.map((coord, idx) => (
                                            <Marker
                                                key={idx} position={[coord[1], coord[0]]} draggable={true}
                                                eventHandlers={{
                                                    dragend: (e) => {
                                                        const { lat, lng } = e.target.getLatLng();
                                                        setDrawnCoords(prev => { const n = [...prev]; n[idx] = [lng, lat]; return n; });
                                                    }
                                                }}
                                            >
                                                <Popup>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <b>Điểm thứ {idx + 1}</b><br />
                                                        <Button size="small" danger style={{ marginTop: 8 }} onClick={() => setDrawnCoords(prev => prev.filter((_, i) => i !== idx))}>Xóa điểm này</Button>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}

                                        {geometryType === 'LineString' && drawnCoords.length > 1 && (
                                            <Polyline positions={drawnCoords.map(c => [c[1], c[0]])} color="red" weight={5} />
                                        )}
                                    </MapContainer>
                                )}
                            </div>
                        </Col>

                        {/* BẢNG ĐIỀU KHIỂN TỌA ĐỘ */}
                        <Col span={7}>
                            <Card
                                size="small" title={<span>Tọa độ đã chấm <Tag color="blue">{drawnCoords.length}</Tag></span>}
                                extra={<Button size="small" type="link" icon={<UndoOutlined />} disabled={drawnCoords.length === 0} onClick={() => setDrawnCoords(p => p.slice(0, -1))}>Lùi 1 bước</Button>}
                                style={{ height: '450px', display: 'flex', flexDirection: 'column' }}
                                bodyStyle={{ flex: 1, overflowY: 'auto', padding: 0 }}
                            >
                                <List size="small" dataSource={drawnCoords} locale={{ emptyText: 'Hãy click lên bản đồ để vẽ' }} renderItem={(coord, idx) => (
                                    <List.Item style={{ padding: '8px 12px' }} actions={[<Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => setDrawnCoords(prev => prev.filter((_, i) => i !== idx))} />]}>
                                        <List.Item.Meta title={<Text>Điểm {idx + 1}</Text>} description={<Text type="secondary" style={{ fontSize: 11 }}>Lng: {coord[0].toFixed(5)}<br />Lat: {coord[1].toFixed(5)}</Text>} />
                                    </List.Item>
                                )} />
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={16} style={{ marginTop: 16 }}>
                        <Col span={8}><Form.Item name="roadName" label="Tên đoạn cấm" rules={[{ required: true }]}><Input placeholder="Ví dụ: Đoạn qua bãi tắm" /></Form.Item></Col>
                        <Col span={6}><Form.Item name="severity" label="Mức độ cảnh báo" rules={[{ required: true }]}><Select><Option value="AVOID">Cấm đi (Màu đỏ)</Option><Option value="WARN">Cảnh báo (Màu vàng)</Option></Select></Form.Item></Col>
                        <Col span={10}><Form.Item name="description" label="Ghi chú hiển thị cho Tài xế"><Input placeholder="Ví dụ: Đang sửa chữa cầu đường" /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>
        </Card>
    );
};

export default RouteManagement;