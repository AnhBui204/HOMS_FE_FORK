import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Button, Select, Space, Tag, Input, Drawer, Descriptions, Divider, Badge, Row, Col, Image, Empty, message, Modal, Spin, List } from 'antd';
import { SearchOutlined, EyeOutlined, CheckCircleOutlined, ExclamationCircleOutlined, SyncOutlined, ExportOutlined, CloseCircleOutlined, CarOutlined, UserOutlined, TeamOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PRIMARY = '#1f4f29';

const ReportManagement = () => {
    // API base: prefer env var REACT_APP_API_BASE_URL, otherwise default to localhost:5000
    const API_BASE = (process.env.REACT_APP_API_BASE_URL && process.env.REACT_APP_API_BASE_URL.replace(/\/+$/, '')) || 'http://localhost:5000';
    const [loading, setLoading] = useState(false);
    const [incidents, setIncidents] = useState([]);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Drawer state
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState(null);

    // Invoice modal state
    const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
    const [invoiceDetail, setInvoiceDetail] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    // Collapsible groups in invoice modal (default closed)
    const [driversOpen, setDriversOpen] = useState(false);
    const [staffOpen, setStaffOpen] = useState(false);

    // Pagination & server data
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(8);
    const [total, setTotal] = useState(0);

    const loadData = async ({ page: p = page, limit: l = limit, search = searchText, type = filterType, status = filterStatus } = {}) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (type) params.append('type', type);
            if (status) params.append('status', status);
            params.append('page', String(p));
            params.append('limit', String(l));

            const res = await fetch(`${API_BASE}/api/admin/incidents?${params.toString()}`, { credentials: 'include' });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const body = await res.json();
            if (!body.success) throw new Error(body.message || 'Failed to load incidents');

            setIncidents(body.data.data || []);
            setTotal(body.data.total || 0);
            setPage(body.data.page || p);
            setLimit(body.data.limit || l);
        } catch (err) {
            console.error('Load incidents failed', err);
            message.error('Không thể tải danh sách báo cáo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData({ page, limit, search: '', type: filterType, status: filterStatus });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, filterType, filterStatus]);

    const handleSearch = async () => {
        setPage(1);
        await loadData({ page: 1, limit, search: searchText, type: filterType, status: filterStatus });
    };

    const [resolveStatus, setResolveStatus] = useState(null);
    const [resolveAction, setResolveAction] = useState(null);
    const [compensationAmount, setCompensationAmount] = useState(0);
    const [internalNote, setInternalNote] = useState('');

    const viewIncidentDetails = async (incident) => {
        try {
            setLoading(true);
            // if we already have full object (from list) we still fetch detail to get freshest data
            const res = await fetch(`${API_BASE}/api/admin/incidents/${incident._id}`, { credentials: 'include' });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const body = await res.json();
            if (!body.success) throw new Error(body.message || 'Failed to load incident');

            setSelectedIncident(body.data);
            // initialize resolve fields
            setResolveStatus(body.data.status || null);
            setResolveAction(body.data.resolution?.action || null);
            setCompensationAmount(body.data.resolution?.compensationAmount || 0);
            setInternalNote('');
            setDrawerVisible(true);
        } catch (err) {
            console.error('Failed to fetch incident detail', err);
            message.error('Không thể tải chi tiết phiếu');
        } finally {
            setLoading(false);
        }
    };

    const viewInvoiceDetails = async (invoiceId) => {
        try {
            setInvoiceLoading(true);
            const res = await fetch(`${API_BASE}/api/admin/invoices/${invoiceId}`, { credentials: 'include' });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const body = await res.json();
            if (!body.success) throw new Error(body.message || 'Failed to load invoice');
            setInvoiceDetail(body.data);
            setInvoiceModalVisible(true);
        } catch (err) {
            console.error('Load invoice failed', err);
            message.error('Không thể tải thông tin hóa đơn');
        } finally {
            setInvoiceLoading(false);
        }
    };

    const getTypeTag = (type) => {
        // Display the raw model value (English) but keep color mapping for readability
        const colors = { Damage: 'volcano', Delay: 'orange', Accident: 'red', Loss: 'magenta', Other: 'default' };
        const labels = { Damage: 'Hư hỏng', Delay: 'Trễ hẹn', Accident: 'Tai nạn', Loss: 'Mất hàng', Other: 'Khác' };
        return <Tag color={colors[type] || 'default'}>{labels[type] || type}</Tag>;
    };

    const getStatusBadge = (status) => {
        // Visual mapping (non-interactive)
        const map = {
            Open: { color: 'volcano', icon: <ExclamationCircleOutlined /> },
            Investigating: { color: 'orange', icon: <SyncOutlined /> },
            Resolved: { color: 'green', icon: <CheckCircleOutlined /> },
            Dismissed: { color: 'default', icon: <CloseCircleOutlined /> }
        };
        const labels = { Open: 'Mở', Investigating: 'Đang điều tra', Resolved: 'Đã giải quyết', Dismissed: 'Bỏ qua' };
        const meta = map[status] || { color: 'default', icon: null };
        return <Tag color={meta.color} style={{ fontWeight: 600 }} icon={meta.icon}>{labels[status] || status}</Tag>;
    };

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const columns = [
        // Removed 'Mã Phiếu' column as requested
        {
            title: 'Mã Hóa Đơn',
            dataIndex: ['invoiceId', 'code'],
            key: 'invoiceRef',
            width: 140,
            render: (text, record) => {
                const id = record?.invoiceId?._id || record?.invoiceId;
                return (
                    <a onClick={() => id && viewInvoiceDetails(id)} style={{ cursor: id ? 'pointer' : 'default' }}>{text}</a>
                );
            }
        },
        {
            title: 'Người báo',
            dataIndex: ['reporterId', 'fullName'],
            key: 'reporter',
            width: 180
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: type => getTypeTag(type)
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 160,
            render: (status, record) => getStatusBadge(status, record)
        },
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: date => dayjs(date).format('DD/MM/YYYY HH:mm')
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 140,
            render: (_, record) => (
                <Space>
                    <Button type="primary" size="small" style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }} icon={<EyeOutlined />} onClick={() => viewIncidentDetails(record)}>Xem</Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <Title level={4} style={{ margin: 0, color: PRIMARY }}>Báo cáo sự cố & Bồi thường</Title>
            </div>

            <Card style={{ borderRadius: '12px', border: 'none', marginBottom: 18, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={10} md={8} lg={7}>
                        <Input
                            placeholder="Tìm mã phiếu, mã hóa đơn, hoặc tên người báo..."
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col xs={12} sm={6} md={5} lg={4}>
                        <Select value={filterType} style={{ width: '100%' }} onChange={val => setFilterType(val)}>
                            <Option value="all">Tất cả loại</Option>
                            <Option value="Damage">Hư hỏng</Option>
                            <Option value="Delay">Trễ hẹn</Option>
                            <Option value="Accident">Tai nạn</Option>
                            <Option value="Loss">Mất hàng</Option>
                        </Select>
                    </Col>
                    <Col xs={12} sm={6} md={5} lg={4}>
                        <Select value={filterStatus} style={{ width: '100%' }} onChange={val => setFilterStatus(val)}>
                            <Option value="all">Tất cả trạng thái</Option>
                            <Option value="Open">Mở</Option>
                            <Option value="Investigating">Đang điều tra</Option>
                            <Option value="Resolved">Đã giải quyết</Option>
                            <Option value="Dismissed">Bỏ qua</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={24} md={6} lg={9} style={{ textAlign: 'right' }}>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }}>Tìm</Button>
                            <Button icon={<ExportOutlined />}>Xuất báo cáo</Button>
                            <Button icon={<SyncOutlined />} onClick={() => { setSearchText(''); setFilterType('all'); setFilterStatus('all'); loadData(); }}>Làm mới</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Card style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {incidents.length === 0 && !loading ? <Empty description="Không có báo cáo" /> : (
                    <Table
                        columns={columns}
                        dataSource={incidents}
                        rowKey="_id"
                        loading={loading}
                        pagination={{
                            current: page,
                            pageSize: limit,
                            total,
                            showSizeChanger: true
                        }}
                        onChange={({ current, pageSize }) => {
                            setPage(current);
                            setLimit(pageSize);
                        }}
                    />
                )}
            </Card>

            <Drawer
                title={`Chi Tiết`}
                placement="right"
                width={700}
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
            >
                {selectedIncident && (
                    <div style={{ paddingBottom: '60px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div>
                                <Text type="secondary">Hóa đơn: <a href={`#${selectedIncident.invoiceId.code}`}>{selectedIncident.invoiceId.code}</a></Text>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div>{getStatusBadge(selectedIncident.status)}</div>
                                <Text type="secondary">{dayjs(selectedIncident.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                            </div>
                        </div>

                        <Descriptions bordered column={1} size="small" labelStyle={{ width: 160, whiteSpace: 'nowrap' }}>
                            <Descriptions.Item label="Người báo">
                                <div style={{ background: 'rgba(139,168,136,0.06)', padding: 12, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700 }}>{selectedIncident.reporterId.fullName}</div>
                                        <div style={{ color: '#6b6b6b', marginTop: 6 }}>{selectedIncident.reporterId.phone}</div>
                                    </div>
                                </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Loại">
                                <div style={{ background: 'rgba(139,168,136,0.06)', padding: 12, borderRadius: 8 }}>
                                    {getTypeTag(selectedIncident.type)}
                                </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Mô tả" style={{ whiteSpace: 'pre-wrap' }}>
                                <div style={{ background: 'rgba(139,168,136,0.03)', padding: 12, borderRadius: 8 }}>{selectedIncident.description || '—'}</div>
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider orientation="left">Hình ảnh / Video</Divider>
                        {selectedIncident.images && selectedIncident.images.length > 0 ? (
                            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
                                {selectedIncident.images.map((src, idx) => {
                                    const isVideo = (url) => {
                                        if (!url) return false;
                                        return /\.(mp4|webm|ogg|m4v)(\?.*)?$/i.test(url) || /video\//i.test(url);
                                    };

                                    if (isVideo(src)) {
                                        return (
                                            <div key={idx} style={{ width: 320, minWidth: 320, borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
                                                <video controls src={src} style={{ width: '100%', display: 'block', background: '#000' }} />
                                            </div>
                                        );
                                    }

                                    return (
                                        <Image key={idx} src={src} width={220} style={{ borderRadius: 8, border: '1px solid #eee' }} />
                                    );
                                })}
                            </div>
                        ) : (
                            <Text type="secondary">Không có hình ảnh minh chứng.</Text>
                        )}

                        <Divider orientation="left">Giải quyết</Divider>

                        {selectedIncident.status === 'Resolved' && selectedIncident.resolution ? (
                            <Card type="inner" title={<><CheckCircleOutlined style={{ color: '#8BA888' }} /> Đã giải quyết</>} style={{ backgroundColor: '#f1f6f1', borderColor: '#8BA888' }}>
                                <p><strong>Hành động:</strong> {selectedIncident.resolution.action}</p>
                                {selectedIncident.resolution.compensationAmount > 0 && (
                                    <p><strong>Tiền bồi thường:</strong> <span style={{ color: PRIMARY, fontWeight: 600 }}>{formatCurrency(selectedIncident.resolution.compensationAmount)}</span></p>
                                )}
                                    {selectedIncident.resolution.note && (
                                        <p><strong>Ghi chú:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{selectedIncident.resolution.note}</span></p>
                                    )}
                                <p><strong>Thời gian giải quyết:</strong> {dayjs(selectedIncident.resolution.resolvedAt).format('DD/MM/YYYY HH:mm')}</p>
                            </Card>
                        ) : (
                            <div style={{ backgroundColor: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0' }}>
                                <div style={{ marginBottom: 12 }}>
                                    <Text strong>Chuyển trạng thái</Text>
                                                <Select value={resolveStatus} onChange={val => setResolveStatus(val)} style={{ width: '100%', marginTop: 8 }}>
                                                    <Option value="Open">Mở</Option>
                                                    <Option value="Investigating">Đang điều tra</Option>
                                                    <Option value="Resolved">Đã giải quyết</Option>
                                                    <Option value="Dismissed">Bỏ qua</Option>
                                                </Select>
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <Text strong>Hành động</Text>
                                    <Select value={resolveAction} onChange={val => setResolveAction(val)} placeholder="Chọn hành động" style={{ width: '100%', marginTop: 8 }}>
                                        {/* Temporarily hide Refund option until refund flow is defined */}
                                        <Option value="Compensation">Bồi thường</Option>
                                        <Option value="Apology">Xin lỗi</Option>
                                        <Option value="No Action Required">Không cần hành động</Option>
                                    </Select>
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <Text strong>Ghi chú</Text>
                                    <TextArea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={3} placeholder="Ghi chú..." style={{ marginTop: 8 }} />
                                </div>
                                    <Button type="primary" block style={{ backgroundColor: PRIMARY, borderColor: PRIMARY, fontWeight: 'bold' }} onClick={async () => {
                                        // prepare payload and call resolve endpoint
                                        if (!selectedIncident) return;
                                        const payload = {
                                            status: resolveStatus,
                                            action: resolveAction,
                                            compensationAmount: compensationAmount || 0,
                                            resolvedAt: resolveStatus === 'Resolved' ? new Date().toISOString() : undefined,
                                            note: internalNote
                                        };
                                        try {
                                            setLoading(true);
                                            const res = await fetch(`${API_BASE}/api/admin/incidents/${selectedIncident._id}/resolve`, {
                                                method: 'PATCH',
                                                credentials: 'include',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(payload)
                                            });
                                            if (!res.ok) throw new Error(`Server error ${res.status}`);
                                            const body = await res.json();
                                            if (!body.success) throw new Error(body.message || 'Failed to update incident');
                                            message.success('Cập nhật thành công');
                                            setSelectedIncident(body.data);
                                            // refresh list
                                            loadData({ page, limit, search: searchText, type: filterType, status: filterStatus });
                                        } catch (err) {
                                            console.error('Resolve failed', err);
                                            message.error('Không thể cập nhật phiếu');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}>Lưu</Button>
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
            <Modal
                title={invoiceDetail ? `Hóa đơn ${invoiceDetail.code || ''}` : 'Hóa đơn'}
                open={invoiceModalVisible}
                onCancel={() => setInvoiceModalVisible(false)}
                footer={null}
                width={760}
                centered
            >
                {invoiceLoading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                ) : invoiceDetail ? (
                    <div>
                        {/* Top summary with icons and compact meta */}
                        <Descriptions bordered column={1} size="small" labelStyle={{ width: 160, whiteSpace: 'nowrap' }}>
                            <Descriptions.Item label={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserOutlined style={{ color: PRIMARY }} />Khách hàng</span>}>
                                <div style={{ background: 'rgba(139,168,136,0.06)', padding: 12, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700 }}>{invoiceDetail.customer?.fullName || 'N/A'}</div>
                                        <div style={{ color: '#6b6b6b', marginTop: 6 }}>{invoiceDetail.customer?.phone || ''} {invoiceDetail.customer?.email ? `• ${invoiceDetail.customer.email}` : ''}</div>
                                    </div>
                                </div>
                            </Descriptions.Item>
                            <Descriptions.Item label={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CarOutlined style={{ color: PRIMARY }} />Địa điểm nhận</span>}>
                                <div style={{ background: 'rgba(139,168,136,0.06)', padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontWeight: 600, color: '#222' }}>{invoiceDetail.pickup?.address || 'N/A'}</div>
                                    {invoiceDetail.pickup?.district && <div style={{ color: '#777', marginTop: 4 }}>{invoiceDetail.pickup.district}</div>}
                                </div>
                            </Descriptions.Item>
                            <Descriptions.Item label={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CarOutlined style={{ color: PRIMARY }} />Địa điểm giao</span>}>
                                <div style={{ background: 'rgba(139,168,136,0.06)', padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontWeight: 600, color: '#222' }}>{invoiceDetail.delivery?.address || 'N/A'}</div>
                                    {invoiceDetail.delivery?.district && <div style={{ color: '#777', marginTop: 4 }}>{invoiceDetail.delivery.district}</div>}
                                </div>
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        <Row gutter={24} align="top">
                            <Col xs={24} sm={12}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <CarOutlined style={{ color: PRIMARY, fontSize: 18 }} />
                                    <div style={{ fontWeight: 700 }}>Xe phân công</div>
                                </div>
                                <List
                                    dataSource={invoiceDetail.assignedVehicles || []}
                                    size="small"
                                    locale={{ emptyText: 'Chưa có xe phân công' }}
                                    renderItem={v => (
                                        <List.Item key={v._id} style={{ paddingLeft: 0, paddingTop: 12, paddingBottom: 12 }}>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{v.plateNumber}</div>
                                                <div style={{ color: '#777', marginTop: 6 }}>{v.vehicleType || ''}</div>
                                            </div>
                                        </List.Item>
                                    )}
                                />
                            </Col>

                            <Col xs={24} sm={12}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                    <TeamOutlined style={{ color: PRIMARY, fontSize: 18 }} />
                                    <div style={{ fontWeight: 700 }}>Nhân sự phân công</div>
                                </div>
                                <div style={{ marginBottom: 8 }}>
                                    <div onClick={() => setDriversOpen(!driversOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, backgroundColor: 'rgba(139,168,136,0.06)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <UserOutlined style={{ color: PRIMARY }} />
                                            <div style={{ fontWeight: 600 }}>Lái xe <span style={{ color: '#999', fontWeight: 500 }}>({(invoiceDetail.assignedDrivers||[]).length})</span></div>
                                        </div>
                                        <div style={{ color: PRIMARY }}>{driversOpen ? <DownOutlined /> : <RightOutlined />}</div>
                                    </div>
                                    {driversOpen && (
                                        <List
                                            dataSource={invoiceDetail.assignedDrivers || []}
                                            size="small"
                                            locale={{ emptyText: 'Chưa có lái xe phân công' }}
                                            renderItem={d => (
                                                <List.Item key={d._id} style={{ paddingLeft: 0, paddingTop: 8, paddingBottom: 8 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ fontWeight: 600 }}>{d.fullName}</div>
                                                        <div style={{ color: '#999', marginTop: 4 }}>{d.phone || ''}</div>
                                                    </div>
                                                </List.Item>
                                            )}
                                        />
                                    )}
                                </div>

                                <div>
                                    <div onClick={() => setStaffOpen(!staffOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, backgroundColor: 'rgba(139,168,136,0.06)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <UserOutlined style={{ color: PRIMARY }} />
                                            <div style={{ fontWeight: 600 }}>Nhân viên phụ trợ <span style={{ color: '#999', fontWeight: 500 }}>({(invoiceDetail.assignedStaff||[]).length})</span></div>
                                        </div>
                                        <div style={{ color: PRIMARY }}>{staffOpen ? <DownOutlined /> : <RightOutlined />}</div>
                                    </div>
                                    {staffOpen && (
                                        <List
                                            dataSource={invoiceDetail.assignedStaff || []}
                                            size="small"
                                            locale={{ emptyText: 'Chưa có nhân viên phụ trợ' }}
                                            renderItem={s => (
                                                <List.Item key={s._id} style={{ paddingLeft: 0, paddingTop: 8, paddingBottom: 8 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ fontWeight: 600 }}>{s.fullName}</div>
                                                        <div style={{ color: '#999', marginTop: 4 }}>{s.phone || ''}</div>
                                                    </div>
                                                </List.Item>
                                            )}
                                        />
                                    )}
                                </div>
                            </Col>
                        </Row>
                    </div>
                ) : (
                    <p>Không có dữ liệu</p>
                )}
            </Modal>
        </div>
    );
};

export default ReportManagement;