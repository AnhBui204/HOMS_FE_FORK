import React, { useState } from 'react';
import {
    Table, Button, Input, Select, Modal, Row, Col,
    Upload, message, Descriptions, Image, Typography, Tooltip, Empty
} from 'antd';
import {
    SearchOutlined, FilterOutlined, ExportOutlined,
    EyeOutlined, PlusOutlined, PictureOutlined, DeleteOutlined,
} from '@ant-design/icons';
import './StaffOrderList.css';

const { Title } = Typography;
const { Option } = Select;

/* ── MOCK DATA ──────────────────────────────────────── */
const INITIAL_ORDERS = [
    { id: 'HOMS-2024-05165', detail: 'Sofa', location: 'Hai Chau', customer: 'Quang', phone: '+84 0951223119', service: 'Full House Relocation', status: 'CONFIRMED', pickup: '05 Ha Huy Tap, Hai Chau', dropoff: '12 Le Duan, Ngu Hanh Son', date: '2024-12-28', items: [] },
    { id: 'HOMS-2024-00126', detail: 'TV', location: 'Thanh Khe', customer: 'Phi', phone: '+84 0951223119', service: 'Truck Rental', status: 'CONFIRMED', pickup: '14 Tran Cao Van, Thanh Khe', dropoff: '33 Nguyen Trai, Hai Chau', date: '2024-12-29', items: [] },
    { id: 'HOMS-2024-00163', detail: 'TV', location: 'Son Tra', customer: 'Phuc', phone: '+84 0951223119', service: 'Truck Rental', status: 'CANCELLED', pickup: '08 Vo Nguyen Giap, Son Tra', dropoff: '67 Thanh Thuy, Lien Chieu', date: '2024-12-30', items: [] },
    { id: 'HOMS-2024-07723', detail: 'TV', location: 'Hai Chau', customer: 'Viet Anh', phone: '+84 0198592832', service: 'Full House Relocation', status: 'CANCELLED', pickup: '21 Phan Chau Trinh, Hai Chau', dropoff: '09 Lien Chieu, Lien Chieu', date: '2024-12-31', items: [] },
    { id: 'HOMS-2024-41612', detail: 'Refrigerator', location: 'Thanh Khe', customer: 'Hieu', phone: '+84 037752812', service: 'Full House Relocation', status: 'CONFIRMED', pickup: '03 Dien Bien Phu, Thanh Khe', dropoff: '55 Ngo Quyen, Son Tra', date: '2025-01-02', items: [] },
    { id: 'HOMS-2024-52717', detail: 'Washing Machine', location: 'Cam Le', customer: 'Hoang', phone: '+84 0777252392', service: 'Truck Rental', status: 'CONFIRMED', pickup: '11 Ton Duc Thang, Cam Le', dropoff: '02 Hoang Dieu, Hai Chau', date: '2025-01-03', items: [] },
    { id: 'HOMS-2024-51235', detail: 'Air Conditioner', location: 'Thanh Khe', customer: 'Vy', phone: '+84 0862858292', service: 'Full House Relocation', status: 'IN_TRANSIT', pickup: '07 Thac Gian, Thanh Khe', dropoff: '15 Hung Vuong, Hai Chau', date: '2025-01-04', items: [] },
    { id: 'HOMS-2024-00123', detail: 'TV', location: 'Ngu Hanh Son', customer: 'Phuong Anh', phone: '+84 0374859123', service: 'Truck Rental', status: 'CONFIRMED', pickup: '05 Ha Huy Tap, Ngu Hanh Son', dropoff: '18 Dong Da, Hai Chau', date: '2025-01-05', items: [] },
    { id: 'HOMS-2024-00421', detail: 'Vacuum Cleaner', location: 'Thanh Khe', customer: 'Quan Pham', phone: '+84 0931552293', service: 'Full House Relocation', status: 'CONFIRMED', pickup: '22 Le Loi, Thanh Khe', dropoff: '11 Bach Dang, Hai Chau', date: '2025-01-06', items: [] },
    { id: 'HOMS-2024-01542', detail: 'Bed', location: 'Lien Chieu', customer: 'Khanh Luan', phone: '+84 0951247439', service: 'Truck Rental', status: 'CANCELLED', pickup: '34 Ton That Tung, Lien Chieu', dropoff: '88 Nguyen Van Linh, Cam Le', date: '2025-01-07', items: [] },
];

const STATUS_CONFIG = {
    CONFIRMED: { color: '#52c41a', bg: '#f6ffed', label: 'Đã xác nhận' },
    CANCELLED: { color: '#ff4d4f', bg: '#fff2f0', label: 'Đã hủy' },
    IN_TRANSIT: { color: '#faad14', bg: '#fffbe6', label: 'Đang vận chuyển' },
    COMPLETED: { color: '#1890ff', bg: '#e6f7ff', label: 'Hoàn tất' },
};

/* ── STATUS BADGE ───────────────────────────────────── */
const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || { color: '#aaa', bg: '#fafafa', label: status };
    return (
        <span className="order-status-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color + '55' }}>
            {cfg.label} <span style={{ fontSize: 10 }}>▾</span>
        </span>
    );
};

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const StaffOrderList = () => {
    const [orders, setOrders] = useState(INITIAL_ORDERS);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPreview, setNewItemPreview] = useState(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    /* ── filter ────────────────────────────────────────── */
    const filtered = orders.filter(o => {
        const matchText = !searchText ||
            o.id.toLowerCase().includes(searchText.toLowerCase()) ||
            o.detail.toLowerCase().includes(searchText.toLowerCase()) ||
            o.customer.toLowerCase().includes(searchText.toLowerCase());
        const matchStatus = !statusFilter || o.status === statusFilter;
        return matchText && matchStatus;
    });

    /* ── open detail drawer ────────────────────────────── */
    const openDetail = (record) => {
        setSelectedOrder(record);
        setEditItems(record.items || []);
        setNewItemName('');
        setNewItemPreview(null);
        setModalOpen(true);
    };

    /* ── add item ──────────────────────────────────────── */
    const handleAddItem = () => {
        if (!newItemName.trim()) { message.warning('Vui lòng nhập tên đồ đạc'); return; }
        const newItem = { id: Date.now(), name: newItemName.trim(), preview: newItemPreview };
        const updatedItems = [...editItems, newItem];
        setEditItems(updatedItems);
        // persist back to orders list
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, items: updatedItems } : o));
        setSelectedOrder(prev => ({ ...prev, items: updatedItems }));
        setNewItemName('');
        setNewItemPreview(null);
        message.success('Đồ đạc đã được thêm');
    };

    /* ── remove item ───────────────────────────────────── */
    const handleRemoveItem = (itemId) => {
        const updatedItems = editItems.filter(i => i.id !== itemId);
        setEditItems(updatedItems);
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, items: updatedItems } : o));
        setSelectedOrder(prev => ({ ...prev, items: updatedItems }));
    };


    /* ── table columns ─────────────────────────────────── */
    const columns = [
        {
            title: 'MÃ ĐƠN HÀNG',
            dataIndex: 'id',
            render: (v) => <span className="order-id-cell">#{v}</span>,
            width: 190,
        },
        {
            title: 'CHI TIẾT',
            dataIndex: 'detail',
            width: 130,
        },
        {
            title: 'KHU VỰC',
            dataIndex: 'location',
            width: 130,
        },
        {
            title: 'KHÁCH HÀNG',
            render: (_, r) => <span>{r.customer}<br /><span style={{ color: '#aaa', fontSize: 12 }}>({r.phone})</span></span>,
            width: 200,
        },
        {
            title: 'DỊCH VỤ VẬN CHUYỂN',
            dataIndex: 'service',
            width: 180,
        },
        {
            title: 'TRẠNG THÁI',
            dataIndex: 'status',
            width: 140,
            render: (s) => <StatusBadge status={s} />,
        },
        {
            title: 'NGÀY QUY ĐỊNH',
            dataIndex: 'date',
            width: 115,
            render: (d) => <span style={{ color: '#666', fontSize: 13 }}>{d}</span>,
        },
        {
            title: '',
            width: 48,
            render: (_, record) => (
                <Tooltip title="Xem chi tiết">
                    <Button
                        type="text"
                        icon={<EyeOutlined style={{ color: '#44624A' }} />}
                        onClick={(e) => { e.stopPropagation(); openDetail(record); }}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div className="staff-order-list">
            {/* ── TOOLBAR ──────────────────────────────── */}
            <div className="order-toolbar">
                <div className="toolbar-left">
                    <Input.Group compact className="search-group">
                        <Select defaultValue="Mã đơn hàng" style={{ width: 110 }}>
                            <Option value="Order ID">Mã đơn hàng</Option>
                            <Option value="Customer">Khách hàng</Option>
                            <Option value="Detail">Chi tiết</Option>
                        </Select>
                        <Input
                            placeholder="Tìm kiếm..."
                            prefix={<SearchOutlined />}
                            style={{ width: 220 }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />
                    </Input.Group>

                    <Select
                        placeholder="Trạng thái"
                        style={{ width: 150 }}
                        allowClear
                        onChange={(v) => setStatusFilter(v || null)}
                    >
                        <Option value="CONFIRMED">Đã xác nhận</Option>
                        <Option value="CANCELLED">Đã hủy</Option>
                        <Option value="IN_TRANSIT">Đang vận chuyển</Option>
                        <Option value="COMPLETED">Hoàn tất</Option>
                    </Select>
                </div>

                <div className="toolbar-right">
                    <Button icon={<ExportOutlined />} style={{ borderRadius: 8 }}>Xuất file</Button>
                    <Button type="primary" icon={<FilterOutlined />} style={{ borderRadius: 8, background: '#44624A', borderColor: '#44624A' }}>
                        Bộ lọc
                    </Button>
                </div>
            </div>

            {/* ── TABLE ────────────────────────────────── */}
            <Table
                columns={columns}
                dataSource={filtered}
                rowKey="id"
                className="orders-table"
                locale={{
                    emptyText: (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_ILLUSTRATION}
                            description="Không tìm thấy đơn hàng nào phù hợp"
                        >
                            <Button type="primary" onClick={() => { setSearchText(''); setStatusFilter(null); }}>
                                Xóa bộ lọc
                            </Button>
                        </Empty>
                    )
                }}
                scroll={{ x: 'max-content' }}
                onRow={(record) => ({
                    onClick: () => openDetail(record),
                    style: { cursor: 'pointer' },
                })}
                pagination={{
                    current: page,
                    pageSize: PAGE_SIZE,
                    total: filtered.length,
                    onChange: setPage,
                    showTotal: (total, range) => `Đang hiển thị từ ${range[0]} đến ${range[1]} trong tổng số ${total} kết quả`,
                    showSizeChanger: false,
                }}
            />

            {/* ══ DETAIL MODAL ══════════════════════════ */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>Chi tiết vận chuyển</span>
                        {selectedOrder && <StatusBadge status={selectedOrder.status} />}
                    </div>
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <Button size="large" onClick={() => setModalOpen(false)} style={{ borderRadius: 8 }}>Đóng</Button>
                        <Button
                            type="primary"
                            size="large"
                            style={{ background: '#44624A', borderColor: '#44624A', borderRadius: 8 }}
                            onClick={() => { message.success('Thông tin đơn hàng đã được lưu'); setModalOpen(false); }}
                        >
                            Lưu thay đổi
                        </Button>
                    </div>
                }
                width="75vw"
                style={{ top: 40 }}
                destroyOnClose
            >
                {selectedOrder && (
                    <Row gutter={[32, 16]} style={{ padding: '8px 0' }}>
                        {/* ── Left: Order Info ──────────────── */}
                        <Col span={12}>
                            <Title level={5} style={{ color: '#44624A', marginBottom: 14 }}>Thông tin đơn hàng</Title>
                            <Descriptions
                                bordered
                                column={1}
                                size="middle"
                                className="order-desc"
                                labelStyle={{ fontWeight: 600, background: '#fafafa', width: 145, fontSize: 13 }}
                                contentStyle={{ fontSize: 14 }}
                            >
                                <Descriptions.Item label="Mã đơn hàng">
                                    <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>#{selectedOrder.id}</strong>
                                </Descriptions.Item>
                                <Descriptions.Item label="Đồ đạc">{selectedOrder.detail}</Descriptions.Item>
                                <Descriptions.Item label="Dịch vụ">{selectedOrder.service}</Descriptions.Item>
                                <Descriptions.Item label="Khách hàng">{selectedOrder.customer}</Descriptions.Item>
                                <Descriptions.Item label="Điện thoại">{selectedOrder.phone}</Descriptions.Item>
                                <Descriptions.Item label="Quận/Huyện">{selectedOrder.location}</Descriptions.Item>
                                <Descriptions.Item label="Ngày tháng">{selectedOrder.date}</Descriptions.Item>
                                <Descriptions.Item label="Điểm lấy hàng">{selectedOrder.pickup}</Descriptions.Item>
                                <Descriptions.Item label="Điểm giao hàng">{selectedOrder.dropoff}</Descriptions.Item>
                            </Descriptions>
                        </Col>

                        {/* ── Right: Items ──────────────────── */}
                        <Col span={12}>
                            <Title level={5} style={{ color: '#44624A', marginBottom: 14 }}>
                                <PictureOutlined style={{ marginRight: 8 }} />
                                Danh sách đồ đạc ({editItems.length})
                            </Title>

                            {/* Add new item form */}
                            <div className="add-item-form" style={{ marginBottom: 16 }}>
                                <div className="add-item-row">
                                    <Upload
                                        showUploadList={false}
                                        accept="image/*"
                                        beforeUpload={(file) => {
                                            const reader = new FileReader();
                                            reader.onload = (e) => setNewItemPreview(e.target.result);
                                            reader.readAsDataURL(file);
                                            return false;
                                        }}
                                    >
                                        <div className="image-upload-box">
                                            {newItemPreview
                                                ? <img src={newItemPreview} alt="preview" className="item-preview-img" />
                                                : <><PlusOutlined /><div style={{ marginTop: 4, fontSize: 11 }}>Ảnh</div></>
                                            }
                                        </div>
                                    </Upload>
                                    <Input
                                        placeholder="Tên đồ đạc (vd: Sofa 3 chỗ, Tủ lạnh 2 cánh...)"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        onPressEnter={handleAddItem}
                                        style={{ flex: 1, borderRadius: 8 }}
                                    />
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={handleAddItem}
                                        style={{ background: '#44624A', borderColor: '#44624A', borderRadius: 8 }}
                                    >
                                        Thêm
                                    </Button>
                                </div>
                            </div>

                            {/* Item list */}
                            {editItems.length === 0 ? (
                                <div style={{ padding: '20px 0' }}>
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description="Chưa có đồ đạc nào được thêm"
                                    />
                                </div>
                            ) : (
                                <div className="item-list">
                                    {editItems.map((item, idx) => (
                                        <div key={item.id} className="item-row">
                                            <span className="item-index">{idx + 1}</span>
                                            {item.preview
                                                ? <Image src={item.preview} width={48} height={48} style={{ borderRadius: 8, objectFit: 'cover' }} />
                                                : <div className="item-no-img"><PictureOutlined /></div>
                                            }
                                            <span className="item-name">{item.name}</span>
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => handleRemoveItem(item.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Col>
                    </Row>
                )}
            </Modal>
        </div>
    );
};

export default StaffOrderList;
