import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Select, Space, Avatar, Rate, Tooltip, Button, Drawer, Image, Tag, Typography, notification, Statistic, Divider, Spin, Modal } from 'antd';
import { SearchOutlined, EyeOutlined, ReloadOutlined, CheckOutlined, UserSwitchOutlined, EnvironmentOutlined, CarOutlined, UserOutlined, CalendarOutlined, FullscreenOutlined } from '@ant-design/icons';
import adminRatingService from '../../../services/adminRatingService';
import adminInvoiceService from '../../../services/adminInvoiceService';
import AIFeedbackSummary from '../../../components/Admin/AI/AIFeedbackSummary';
import LocationPicker from '../../../components/LocationPicker';

const { Title, Text } = Typography;
const { Option } = Select;

const primaryColor = '#44624A';
const starColor = '#faad14';

const RatingManagement = () => {
    const [loading, setLoading] = useState(false);
    const [ratings, setRatings] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [filters, setFilters] = useState({ search: '', minRating: undefined });
    const [reviewedIds, setReviewedIds] = useState(new Set());
    const [viewMode, setViewMode] = useState('all'); // all | needs | reviewed

    const [detailVisible, setDetailVisible] = useState(false);
    const [selected, setSelected] = useState(null);
    const [invoiceDetail, setInvoiceDetail] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapMarkers, setMapMarkers] = useState(null); // { pickup: {lat,lng}, delivery: {lat,lng} }
    const [mapFullscreenVisible, setMapFullscreenVisible] = useState(false);

    // Leaflet map in Modal can render blank or stretched when opened; trigger a resize event
    // shortly after Modal opens so the map invalidates its size and tiles render correctly.
    useEffect(() => {
        let t = null;
        if (mapFullscreenVisible) {
            // give Modal time to animate and layout
            t = setTimeout(() => {
                try {
                    window.dispatchEvent(new Event('resize'));
                } catch (e) { /* ignore */ }
            }, 300);
        }
        return () => { if (t) clearTimeout(t); };
    }, [mapFullscreenVisible]);

    const fetchRatings = async (page = 1, pageSize = 10, currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: pageSize,
                search: currentFilters?.search,
                minRating: currentFilters?.minRating
            };
            const res = await adminRatingService.getAllRatings(params);
            // tolerate different response shapes
            let payload = res;
            if (res && res.success && res.data) payload = res.data;

            const data = Array.isArray(payload.ratings) ? payload.ratings : (Array.isArray(payload) ? payload : []);
            const total = payload.totalRatings ?? payload.total ?? 0;

            setRatings(data);
            setPagination(prev => ({ ...prev, current: Number(payload.currentPage || page), pageSize: Number(payload.limit || pageSize), total: Number(total) }));

            // restore reviewed ids if present in payload or localStorage
            try {
                const stored = JSON.parse(localStorage.getItem('admin_reviewed_ratings') || '[]');
                setReviewedIds(new Set(stored || []));
            } catch (e) {
                // ignore
            }
        } catch (err) {
            console.error('Failed fetching ratings', err);
            notification.error({ message: 'Không thể lấy dữ liệu đánh giá' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value) => {
        const newFilters = { ...filters, search: value };
        setFilters(newFilters);
        fetchRatings(1, pagination.pageSize, newFilters);
    };

    const handleFilterRating = (val) => {
        const min = val === 'all' ? undefined : Number(val);
        const newFilters = { ...filters, minRating: min };
        setFilters(newFilters);
        fetchRatings(1, pagination.pageSize, newFilters);
    };

    const handleTableChange = (pag) => {
        setPagination(prev => ({ ...prev, current: pag.current, pageSize: pag.pageSize }));
        fetchRatings(pag.current, pag.pageSize, filters);
    };

    React.useEffect(() => {
        // load reviewed ids from localStorage
        try {
            const stored = JSON.parse(localStorage.getItem('admin_reviewed_ratings') || '[]');
            setReviewedIds(new Set(stored || []));
        } catch (e) {}

        fetchRatings(1, pagination.pageSize, filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openDetail = (record) => {
        setSelected(record);
        setInvoiceDetail(null);
        setDetailVisible(true);
    };

    const openInvoice = async (invoiceId, record) => {
        if (!invoiceId) {
            notification.warning({ message: 'Không có thông tin invoice' });
            return;
        }
        setInvoiceLoading(true);
        try {
            const res = await adminInvoiceService.getInvoiceById(invoiceId);
            let payload = res;
            if (res && res.success && res.data) payload = res.data;
            setInvoiceDetail(payload);
            setSelected(record || null);
            setDetailVisible(true);
        } catch (err) {
            console.error('Failed to fetch invoice', err);
            // suppress noisy toast when id was invalid on client side
            if (err && err.isClientValidation) {
                console.warn('openInvoice: invalid invoice id, skipping toast');
            } else {
                notification.error({ message: 'Không thể lấy thông tin invoice' });
            }
        } finally {
            setInvoiceLoading(false);
        }
    };

    const persistReviewedIds = (set) => {
        try {
            localStorage.setItem('admin_reviewed_ratings', JSON.stringify(Array.from(set)));
        } catch (e) {
            // ignore
        }
    };

    const toggleReviewed = (id) => {
        setReviewedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            persistReviewedIds(next);
            return next;
        });
    };

    const negativeKeywords = ['bad', 'terrible', 'late', 'rude', 'broken', 'damaged', 'delay', 'trễ', 'tệ', 'chậm', 'hỏng', 'không'];
    const needsAttention = (record) => {
        if (!record) return false;
        if (record.rating && record.rating <= 2) return true;
        const text = (record.comment || '').toLowerCase();
        return negativeKeywords.some(k => text.includes(k));
    };

    // Map invoice status to Vietnamese friendly label
    const mapInvoiceStatus = (s) => {
        if (!s) return '—';
        const map = {
            paid: 'Đã thanh toán',
            cancelled: 'Đã hủy',
            pending: 'Chờ xử lý',
            created: 'Đã tạo'
        };
        return map[s] || String(s);
    };

    // try to extract lat/lng from various invoice location shapes
    const parseLatLng = (loc) => {
        if (!loc) return null;
        // direct props
        if (typeof loc.lat === 'number' && typeof loc.lng === 'number') return { lat: loc.lat, lng: loc.lng };
        if (loc.latitude && loc.longitude) return { lat: Number(loc.latitude), lng: Number(loc.longitude) };
        if (loc.lat && loc.lng) return { lat: Number(loc.lat), lng: Number(loc.lng) };
        // geojson style: location.coordinates = [lng, lat]
        if (loc.location && Array.isArray(loc.location.coordinates) && loc.location.coordinates.length >= 2) {
            const [lng, lat] = loc.location.coordinates;
            return { lat: Number(lat), lng: Number(lng) };
        }
        // string coordinates like "16.023779, 108.228200"
        const coordStr = loc.coordinates || loc.coord || (loc.addressDetails && loc.addressDetails.coordinates) || null;
        if (typeof coordStr === 'string') {
            const m = coordStr.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
            if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
        }
        return null;
    };

    // Lightweight client-side geocoding using Nominatim as a fallback when invoice lacks coordinates
    const geocodeAddress = async (address) => {
        if (!address || String(address).trim().length === 0) return null;
        try {
            const q = encodeURIComponent(String(address));
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=vn&accept-language=vi`;
            const res = await fetch(url, { headers: { 'User-Agent': 'HOMS-App' } });
            if (!res.ok) return null;
            const arr = await res.json();
            if (!Array.isArray(arr) || arr.length === 0) return null;
            const item = arr[0];
            return { lat: Number(item.lat), lng: Number(item.lon) };
        } catch (e) {
            console.warn('Geocode failed', e);
            return null;
        }
    };

    // When invoiceDetail changes, prepare markers: prefer provided coords, otherwise attempt quick geocode
    useEffect(() => {
        let mounted = true;
        const prepare = async () => {
            if (!invoiceDetail) {
                if (mounted) setMapMarkers(null);
                return;
            }
            setMapLoading(true);
            try {
                let p = parseLatLng(invoiceDetail.pickup);
                let d = parseLatLng(invoiceDetail.delivery);

                // Attempt geocoding if coords missing
                if (!p && (invoiceDetail.pickup?.address || invoiceDetail.pickup?.fullAddress)) {
                    p = await geocodeAddress(invoiceDetail.pickup.address || invoiceDetail.pickup.fullAddress);
                }
                if (!d && (invoiceDetail.delivery?.address || invoiceDetail.delivery?.fullAddress)) {
                    d = await geocodeAddress(invoiceDetail.delivery.address || invoiceDetail.delivery.fullAddress);
                }

                if (mounted) setMapMarkers({ pickup: p, delivery: d });
            } catch (e) {
                console.warn('prepare map markers error', e);
                if (mounted) setMapMarkers(null);
            } finally {
                if (mounted) setMapLoading(false);
            }
        };
        prepare();
        return () => { mounted = false; };
    }, [invoiceDetail]);

    const columns = [
        {
            title: 'Hóa đơn',
            width: 220,
            dataIndex: ['invoice', 'code'],
            key: 'invoice',
            render: (code, record) => (
                <div style={{ maxWidth: 180 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {record.invoice && record.invoice._id ? (
                            <a onClick={() => openInvoice(record.invoice._id, record)} style={{ color: primaryColor, fontWeight: 600, cursor: 'pointer' }}>{code || record.invoice._id}</a>
                        ) : (
                            <Text strong style={{ color: primaryColor }}>{code || '—'}</Text>
                        )}
                    </div>
                    {/* requestTicketId intentionally hidden to avoid long raw IDs */}
                </div>
            )
        },
        {
            title: 'Khách hàng',
            width: 220,
            dataIndex: ['customer', 'fullName'],
            key: 'customer',
            render: (name, record) => (
                <Space align="center">
                    <Avatar size={40} src={record.customer?.avatar} />
                    <div style={{ maxWidth: 180 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{name || record.customer?.email || 'Unknown'}</div>
                        <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.customer?.email}</div>
                    </div>
                </Space>
            )
        },
        
        {
            title: 'Đánh giá',
            width: 120,
            align: 'center',
            dataIndex: 'rating',
            key: 'rating',
            render: (val) => (
                <div style={{ textAlign: 'center' }}>
                    <Rate disabled allowHalf value={val} style={{ color: starColor }} />
                    <div style={{ fontSize: 12, color: '#555' }}>{val}/5</div>
                </div>
            ),
            sorter: (a, b) => a.rating - b.rating
        },
        {
            title: 'Nhãn nhanh',
            width: 160,
            align: 'center',
            dataIndex: 'quickTags',
            key: 'quickTags',
            render: (tags) => (
                <div style={{ maxWidth: 140, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(tags || []).slice(0, 3).map((t, i) => (
                        <Tag key={i} color="default" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t}</Tag>
                    ))}
                </div>
            )
        },
        {
            title: 'Bình luận',
            dataIndex: 'comment',
            key: 'comment',
            render: (text) => (
                <Tooltip title={text}>
                    <div style={{ maxWidth: 420, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text || '—'}</div>
                </Tooltip>
            )
        },
        {
            title: 'Ngày tạo',
            width: 160,
            align: 'center',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (d) => d ? new Date(d).toLocaleString() : '—'
        },
        // Action column removed per request
    ];

    // derive filtered dataset based on viewMode
    const filteredRatings = ratings.filter(r => {
        if (viewMode === 'needs') return needsAttention(r);
        return true;
    });

    // compute metrics from filtered list
    const totalReviews = filteredRatings.length;
    const avgRating = totalReviews ? (filteredRatings.reduce((s, r) => s + (Number(r.rating) || 0), 0) / totalReviews) : 0;
    const distribution = [5,4,3,2,1].map(star => ({
        star,
        count: filteredRatings.filter(r => Math.round(r.rating) === star).length
    }));

    // Export filtered ratings to Excel (.xlsx) with CSV fallback
    const exportToExcel = async () => {
        if (!filteredRatings || filteredRatings.length === 0) {
            notification.info({ message: 'Không có dữ liệu để xuất' });
            return;
        }

        const rows = filteredRatings.map(r => ({
            'Hóa đơn': r.invoice?.code || r.invoice?._id || '',
            'Khách hàng': r.customer?.fullName || r.customer?.email || '',
            'Email': r.customer?.email || '',
            'Đánh giá': r.rating ?? '',
            'Nhãn': (r.quickTags || []).join(', '),
            'Bình luận': r.comment || '',
            'Ngày tạo': r.createdAt ? new Date(r.createdAt).toLocaleString() : ''
        }));

        try {
            const XLSX = await import('xlsx').then(m => m.default || m);
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Ratings');
            const fname = `ratings_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.xlsx`;
            XLSX.writeFile(wb, fname);
            notification.success({ message: 'Xuất file thành công', description: fname });
        } catch (err) {
            // fallback to CSV
            try {
                const keys = Object.keys(rows[0]);
                const escapeCsv = (val) => {
                    if (val == null) return '';
                    const s = String(val).replace(/"/g, '""');
                    return `"${s}"`;
                };
                const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => escapeCsv(r[k])).join(','))).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const fname = `ratings_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
                a.download = fname;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                notification.success({ message: 'Xuất CSV thành công', description: fname });
            } catch (e) {
                console.error('Export failed', e);
                notification.error({ message: 'Xuất file thất bại' });
            }
        }
    };

    return (
        <div style={{ textAlign: 'left' }} className="rating-container">
                        <style>{`
                                .rating-container { padding: 22px; background: linear-gradient(180deg, #ffffff 0%, #fbfdfb 100%); }
                                .rating-kpi-card { box-shadow: 0 8px 28px rgba(20,40,30,0.04); background: transparent; border-radius: 14px; padding: 10px 12px; }
                                .rating-grid { display: grid; grid-template-columns: 1fr; gap: 18px; align-items: start; }
                                .kpi-row { display: flex; gap: 12px; align-items: center; }
                                .kpi-card { flex: 1; padding: 8px; border-radius: 12px; }
                                .small-muted { color: #777; font-size: 13px; }
                                .rating-table-card { border-radius: 12px; padding: 14px; background: transparent; }
                                .rating-controls { display: flex; gap: 12px; align-items: center; }
                                .rating-actions .ant-btn { border-radius: 8px; }

                                /* KPI tiles layout */
                                .kpi-tiles { display: flex; gap: 12px; align-items: stretch; }
                                .kpi-tile { flex: 1; display: flex; gap: 14px; align-items: center; padding: 16px; border-radius: 10px; background: linear-gradient(180deg, #ffffff 0%, rgba(240,244,240,0.6) 100%); box-shadow: 0 6px 18px rgba(34,60,40,0.04); }
                                .kpi-accent { width: 10px; height: 64px; border-radius: 8px; flex-shrink: 0; }
                                .kpi-title { font-size: 13px; color: #666; }
                                .kpi-value { font-size: 20px; font-weight: 800; color: ${primaryColor}; }
                                .kpi-sub { font-size: 12px; color: #999; margin-top: 6px; }

                                /* distribution removed per request */

                                /* Primary-colored search input/button */
                                .primary-search .ant-input { border: 1px solid ${primaryColor}; border-radius: 8px; }
                                .primary-search .ant-input:focus, .primary-search .ant-input-focused { box-shadow: none; border-color: ${primaryColor}; }
                                .primary-search .ant-input-search-button { background: ${primaryColor}; border-color: ${primaryColor}; color: #fff; border-radius: 8px; }

                                /* Table - cardy rows */
                                .rating-table-card { overflow-x: auto; }
                                /* Invoice drawer styling - simplified & professional */
                                .invoice-drawer .ant-drawer-body { background: #ffffff; padding: 16px; }
                                .invoice-card { margin-top: 6px; padding: 14px; border-radius: 10px; background: #fff; border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 4px 18px rgba(0,0,0,0.04); }
                                .invoice-header { display:flex; align-items:center; gap:12px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.04); }
                                .invoice-code { font-weight: 700; color: ${primaryColor}; font-size: 16px; letter-spacing: 0.4px; }
                                .invoice-sub { font-size: 12px; color: #888; margin-top:4px; }
                                .invoice-section { margin-top: 12px; display:block; }
                                .invoice-row { display:flex; gap:12px; align-items:flex-start; margin-top: 10px; }
                                .invoice-row .icon { color: ${primaryColor}; font-size: 18px; margin-top: 2px; }
                                .invoice-row .cell { flex: 1; }
                                .invoice-key { font-size: 12px; color: #888; margin-bottom: 6px; }
                                .invoice-value { font-weight: 600; color: #111; line-height: 1.35; }
                                .invoice-status { text-align: right; }
                                .invoice-status .tag { border-radius: 8px; padding: 6px 10px; font-weight: 700; }
                                /* When embedding LocationPicker inside invoice drawer, hide its search UI and legend for compact read-only view */
                                .invoice-map .location-picker .search-bar { display: none !important; }
                                .invoice-map .location-picker .map-legend { display: none !important; }
                                .invoice-map .location-picker .map-container { height: 100% !important; }
                                .rating-table-card .ant-table { table-layout: fixed; width: 100%; background: transparent; }
                                .rating-table-card .ant-table-tbody > tr > td { white-space: normal !important; word-break: break-word; vertical-align: middle !important; background: #fff; border-radius: 10px; padding: 12px !important; }
                                /* keep table rows visually stable: remove hover elevation */
                                .rating-table-card .ant-table-tbody > tr { }
                                .rating-table-card .ant-table-tbody > tr:hover td { transform: none; box-shadow: none; }
                                .rating-table-card .ant-table-thead > tr > th { background: #fafafa; }

                                /* Needs attention visual */
                                .rating-needs-attention td { border-left: 4px solid #ff4d4f !important; }

                                @media (max-width: 860px) {
                                    .kpi-tiles { flex-direction: column; }
                                    .kpi-accent { height: 48px; }
                                    .primary-search .ant-input { width: 200px !important; }
                                }
                        `}</style>
            <div className="rating-grid" style={{ marginBottom: 18 }}>
                <AIFeedbackSummary />
                <div>
                    <div className="kpi-row" style={{ marginBottom: 12 }}>
                        <Card className="rating-kpi-card kpi-card" style={{ borderRadius: 12 }}>
                            <div>
                                <div className="kpi-tiles">
                                    <div className="kpi-tile">
                                        <div className="kpi-accent" style={{ background: '#fadb14' }} />
                                        <div>
                                            <div className="kpi-title">Trung bình</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="kpi-value">{avgRating ? avgRating.toFixed(1) : '—'}</div>
                                                <Rate disabled value={Number(avgRating.toFixed(1))} style={{ color: starColor }} />
                                            </div>
                                            <div className="kpi-sub">Điểm trung bình của các đánh giá hiển thị</div>
                                        </div>
                                    </div>

                                    <div className="kpi-tile">
                                        <div className="kpi-accent" style={{ background: primaryColor }} />
                                        <div>
                                            <div className="kpi-title">Tổng đánh giá</div>
                                            <div className="kpi-value">{totalReviews}</div>
                                            <div className="kpi-sub">Đánh giá trên trang này</div>
                                        </div>
                                    </div>

                                    <div className="kpi-tile">
                                        <div className="kpi-accent" style={{ background: '#ff4d4f' }} />
                                        <div>
                                            <div className="kpi-title">Cần chú ý</div>
                                            <div className="kpi-value">{ratings.filter(r => needsAttention(r)).length}</div>
                                            <div className="kpi-sub">Phản hồi tiêu cực</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Distribution intentionally removed to simplify the KPI area */}
                            </div>
                        </Card>
                    </div>

                    <Card className="rating-table-card" style={{ borderRadius: 12 }}>
                        {/* Compact header: title left, search + filters + actions on right */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <Title level={5} style={{ margin: 0 }}>Danh sách đánh giá</Title>
                                <Tag color="volcano">{ratings.filter(r => needsAttention(r)).length} cần chú ý</Tag>
                            </div>

                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <Input.Search className="primary-search" placeholder="Tìm invoice hoặc comment" onSearch={handleSearch} allowClear style={{ width: 260 }} enterButton={<SearchOutlined />} />
                                <Select value={viewMode} style={{ width: 140 }} onChange={(v) => setViewMode(v)}>
                                    <Option value="all">Tất cả</Option>
                                    <Option value="needs">Cần chú ý</Option>
                                </Select>
                                <Select defaultValue="all" style={{ width: 120 }} onChange={handleFilterRating}>
                                    <Option value="all">Tất cả</Option>
                                    <Option value="5">5+</Option>
                                    <Option value="4">4+</Option>
                                    <Option value="3">3+</Option>
                                </Select>
                                <Button onClick={() => fetchRatings(1, pagination.pageSize)} style={{ borderColor: primaryColor, color: primaryColor }}>Tải lại</Button>
                                <Button type="primary" style={{ background: primaryColor, borderColor: primaryColor }} onClick={exportToExcel}>Xuất</Button>
                            </div>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={filteredRatings}
                            rowKey={(r) => r._id}
                            pagination={pagination}
                            loading={loading}
                            onChange={handleTableChange}
                            rowClassName={(record) => needsAttention(record) ? 'rating-needs-attention' : ''}
                        />
                    </Card>
                </div>

                {/* right sidebar removed; rating distribution moved into KPI card */}
            </div>

            {/* previously table moved into left KPI card area */}

            <Drawer
                className="invoice-drawer"
                open={detailVisible}
                title={`Feedback chi tiết`}
                onClose={() => setDetailVisible(false)}
                width={680}
                bodyStyle={{ paddingBottom: 24 }}
            >
                {selected && (
                    <div>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {/* Header (customer name and rating) removed per request */}

                            {/* Invoice detail (if loaded) */}
                            {invoiceLoading && (
                                <div style={{ padding: 8, color: '#666' }}>Đang tải thông tin invoice...</div>
                            )}

                            {invoiceDetail && (
                                <div className="invoice-card">
                                    {/* Map area: prefer to show embedded map when coordinates available */}
                                    <div className="invoice-section invoice-map" style={{ marginBottom: 12 }}>
                                        {mapLoading ? (
                                            <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <Spin />
                                                <div>Đang chuẩn bị bản đồ...</div>
                                            </div>
                                        ) : (() => {
                                            const p = mapMarkers?.pickup || null;
                                            const d = mapMarkers?.delivery || null;
                                            if (p || d) {
                                                return (
                                                    <div style={{ height: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', position: 'relative' }}>
                                                        {/* Fullscreen button overlay */}
                                                        <div style={{ position: 'absolute', right: 8, top: 8, zIndex: 1100 }}>
                                                            <Tooltip title="Toàn màn hình">
                                                                <Button shape="circle" size="small" onClick={() => setMapFullscreenVisible(true)} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }} icon={<FullscreenOutlined style={{ color: primaryColor }} />} />
                                                            </Tooltip>
                                                        </div>
                                                        <LocationPicker
                                                            initialPosition={p || d}
                                                            otherLocation={d && p ? (p.lat === d.lat && p.lng === d.lng ? null : d) : null}
                                                            locationType="pickup"
                                                            currentLocationData={{ address: invoiceDetail.pickup?.address || invoiceDetail.pickup?.fullAddress }}
                                                            showRoute={true}
                                                            routeColor={primaryColor}
                                                        />
                                                    </div>
                                                );
                                            }

                                            // fallback: no coordinates -> show quick links to open Google Maps
                                            const pickupAddr = invoiceDetail.pickup?.address || invoiceDetail.pickup?.fullAddress || '';
                                            const deliveryAddr = invoiceDetail.delivery?.address || invoiceDetail.delivery?.fullAddress || '';
                                            const gmLink = (addr) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

                                            return (
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div className="invoice-key">Bản đồ</div>
                                                        <div className="invoice-value" style={{ fontWeight: 500 }}>
                                                            Không có tọa độ sẵn. Bạn có thể mở địa chỉ trên Google Maps:
                                                            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                                                {pickupAddr ? <a target="_blank" rel="noreferrer" href={gmLink(pickupAddr)}>Mở địa chỉ lấy</a> : null}
                                                                {deliveryAddr ? <a target="_blank" rel="noreferrer" href={gmLink(deliveryAddr)}>Mở địa chỉ giao</a> : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="invoice-header">
                                        <div style={{ flex: 1 }}>
                                            <div className="invoice-code">{invoiceDetail.code || invoiceDetail._id}</div>
                                            <div className="invoice-sub">Chi tiết đơn hàng vận chuyển</div>
                                        </div>
                                        <div className="invoice-status">
                                            <div style={{ fontSize: 12, color: '#666' }}>Trạng thái</div>
                                            <div style={{ marginTop: 6 }}>
                                                <span className="tag" style={{ background: invoiceDetail.status === 'paid' ? '#f6ffed' : (invoiceDetail.status === 'cancelled' ? '#fff1f0' : '#fffbe6'), color: invoiceDetail.status === 'paid' ? '#389e0d' : (invoiceDetail.status === 'cancelled' ? '#cf1322' : '#ad8b00') }}>{mapInvoiceStatus(invoiceDetail.status)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="invoice-section">
                                        <div className="invoice-row">
                                            <EnvironmentOutlined className="icon" />
                                            <div className="cell">
                                                <div className="invoice-key">Địa chỉ lấy</div>
                                                <div className="invoice-value">{invoiceDetail.pickup?.address || invoiceDetail.pickup?.fullAddress || '—'}</div>
                                            </div>
                                        </div>

                                        <div className="invoice-row">
                                            <EnvironmentOutlined className="icon" />
                                            <div className="cell">
                                                <div className="invoice-key">Địa chỉ giao</div>
                                                <div className="invoice-value">{invoiceDetail.delivery?.address || invoiceDetail.delivery?.fullAddress || '—'}</div>
                                            </div>
                                        </div>

                                        <div className="invoice-row">
                                            <UserOutlined className="icon" />
                                            <div className="cell">
                                                    <div className="invoice-key">Khách hàng</div>
                                                    <div className="invoice-value">{invoiceDetail.customer?.fullName || '—'}</div>
                                                </div>
                                        </div>

                                        {(invoiceDetail.assignedVehicles || []).length > 0 && (
                                            <div className="invoice-row">
                                                <CarOutlined className="icon" />
                                                <div className="cell">
                                                    <div className="invoice-key">Xe phân công</div>
                                                    <div className="invoice-value">{invoiceDetail.assignedVehicles.map(v => `${v.plateNumber || v.vehicleId || v._id} ${v.vehicleType ? `(${v.vehicleType})` : ''}`).join(', ')}</div>
                                                </div>
                                            </div>
                                        )}

                                        {(invoiceDetail.assignedDrivers || []).length > 0 && (
                                            <div className="invoice-row">
                                                <UserSwitchOutlined className="icon" />
                                                <div className="cell">
                                                    <div className="invoice-key">Tài xế</div>
                                                    <div className="invoice-value">{invoiceDetail.assignedDrivers.map(d => `${d.fullName || d._id}${d.phone ? ' · ' + d.phone : ''}`).join('; ')}</div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="invoice-row">
                                            <CalendarOutlined className="icon" />
                                            <div className="cell">
                                                <div className="invoice-key">Mã hoá đơn</div>
                                                <div className="invoice-value">{invoiceDetail.code || invoiceDetail._id}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Comment removed per request */}

                            {selected.images && selected.images.length > 0 && (
                                <div>
                                    <Text strong>Hình ảnh</Text>
                                    <div style={{ marginTop: 8 }}>
                                        <Image.PreviewGroup>
                                            {selected.images.map((src, i) => (
                                                <Image key={i} width={120} src={src} style={{ marginRight: 8 }} />
                                            ))}
                                        </Image.PreviewGroup>
                                    </div>
                                </div>
                            )}
                            
                        </Space>
                    </div>
                )}
            </Drawer>
            <Modal
                centered
                open={mapFullscreenVisible}
                onCancel={() => setMapFullscreenVisible(false)}
                footer={null}
                width={'90vw'}
                bodyStyle={{ padding: 0 }}
            >
                <div style={{ height: '80vh', width: '100%' }}>
                    {mapMarkers ? (
                        <LocationPicker
                            initialPosition={mapMarkers.pickup || mapMarkers.delivery}
                            otherLocation={mapMarkers.pickup && mapMarkers.delivery ? (mapMarkers.pickup.lat === mapMarkers.delivery.lat && mapMarkers.pickup.lng === mapMarkers.delivery.lng ? null : mapMarkers.delivery) : null}
                            locationType="pickup"
                            currentLocationData={{ address: invoiceDetail?.pickup?.address || invoiceDetail?.pickup?.fullAddress }}
                            showRoute={true}
                            routeColor={primaryColor}
                        />
                    ) : (
                        <div style={{ padding: 20 }}>
                            <div>Không có vị trí để hiển thị trên bản đồ.</div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default RatingManagement;