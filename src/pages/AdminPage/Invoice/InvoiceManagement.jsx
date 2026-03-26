import React, { useEffect, useState, useRef } from 'react';
import { Card, Table, Input, Select, Space, Button, Modal, Tag, Typography, notification, Spin, Tabs, Row, Col, Divider, Avatar, Statistic, Tooltip, Skeleton } from 'antd';
import {
  SearchOutlined,
  FolderOpenOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CarOutlined,
  CalendarOutlined,
  DollarCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  FileTextOutlined,
  StarOutlined,
  TrophyOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import adminInvoiceService from '../../../services/adminInvoiceService';
import adminStatisticService from '../../../services/adminStatisticService';
import LocationPicker from '../../../components/LocationPicker';
import EinvoiceModal from './EinvoiceModal';

const { Title, Text } = Typography;
const { Option } = Select;

const primaryColor = '#44624A';

const InvoiceManagement = () => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  // UI state for selected invoice detail modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  // List filters and pagination for the main invoices table
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5, total: 0 });
  const [timeOrder, setTimeOrder] = useState('nearest');
  
  const [detailLoading, setDetailLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapMarkers, setMapMarkers] = useState(null); // { pickup:{lat,lng}, delivery:{lat,lng} }
  const [mapFullscreenVisible, setMapFullscreenVisible] = useState(false);
  // Payments tab local UI state: independent pagination, filters and sorting
  const [paymentsPagination, setPaymentsPagination] = useState({ current: 1, pageSize: 5, total: 0 });
  const [paymentsFilters, setPaymentsFilters] = useState({ amountRange: '', timeRange: '' });
  const [paymentsSorter, setPaymentsSorter] = useState({ field: null, order: null });
  // recent payments / transactions for Payments dashboard
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentsViewTimeRange, setPaymentsViewTimeRange] = useState('30d');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [einvoiceVisible, setEinvoiceVisible] = useState(false);
  const [einvoiceInvoiceId, setEinvoiceInvoiceId] = useState(null);

  // derived stats (revenue logic removed as requested)
  /*
  const computeRevenue = (list) => {
    if (!Array.isArray(list)) return 0;
    // Sum priceSnapshot.totalPrice (fallbacks) for invoices with paymentStatus PAID or PARTIAL
    return list.reduce((sum, inv) => {
      const status = inv?.paymentStatus;
      if (status !== 'PAID' && status !== 'PARTIAL') return sum;
      const v = Number(inv?.priceSnapshot?.totalPrice ?? inv?.total ?? inv?.amount ?? inv?.price ?? 0) || 0;
      return sum + v;
    }, 0);
  };
  */

  // revenue pulled from backend for the currently displayed invoice range
  const [revenueValue, setRevenueValue] = useState(0);
  const [revenueLoading, setRevenueLoading] = useState(false);
  // if user wants dashboard total, fetch overview.totalRevenue
  const [overviewRevenue, setOverviewRevenue] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  // total paid amount across system (server-side aggregate)
  const [totalPaidSystem, setTotalPaidSystem] = useState(null);
  const [totalPaidLoading, setTotalPaidLoading] = useState(false);

  // global invoice totals (from dispatcher stats) so cards show whole-system counts
  const [invoiceTotals, setInvoiceTotals] = useState(null);
  const [invoiceTotalsLoading, setInvoiceTotalsLoading] = useState(false);

  // computeRevenue: prefer backend-provided revenue for the current invoices; otherwise fallback
  const computeRevenue = (list) => {
    // if caller passes the same reference as our invoices state, return backend value
    if (Array.isArray(list) && list === invoices) return revenueValue || 0;
    // otherwise, compute a reasonable local sum (only PAID and PARTIAL)
    if (!Array.isArray(list)) return 0;
    return list.reduce((sum, inv) => {
      const status = inv?.paymentStatus;
      if (status !== 'PAID' && status !== 'PARTIAL') return sum;
      const v = Number(inv?.priceSnapshot?.totalPrice ?? inv?.total ?? inv?.amount ?? inv?.price ?? 0) || 0;
      return sum + v;
    }, 0);
  };

  // Fetch aggregated revenue from backend covering the date range of the provided invoices.
  // If backend call fails, we silently fall back to local computation.
  const fetchRevenueForInvoices = async (rawInvoices) => {
    if (!Array.isArray(rawInvoices) || rawInvoices.length === 0) {
      setRevenueValue(0);
      return;
    }
    setRevenueLoading(true);
    try {
      // derive date range from invoices' createdAt (fall back to updatedAt/scheduledTime)
      const times = rawInvoices.map(inv => {
        if (inv?.createdAt) return new Date(inv.createdAt).toISOString();
        if (inv?.updatedAt) return new Date(inv.updatedAt).toISOString();
        if (inv?.scheduledTime) return new Date(inv.scheduledTime).toISOString();
        return null;
      }).filter(Boolean).map(t => new Date(t).getTime());

      if (times.length === 0) {
        // no timestamps -> fallback to local sum
        setRevenueValue(computeRevenue(rawInvoices));
        return;
      }

      const minTs = new Date(Math.min(...times)).toISOString();
      const maxTs = new Date(Math.max(...times)).toISOString();

      // ask BE for revenue grouped by day between min..max; then sum up totals
      const res = await adminStatisticService.getRevenue({ startDate: minTs, endDate: maxTs, period: 'daily', usePaymentTimeline: true });
      const payload = (res && res.success && res.data) ? res.data : res;
      if (Array.isArray(payload) && payload.length) {
        const total = payload.reduce((s, it) => s + (Number(it.totalRevenue ?? it.revenue ?? 0) || 0), 0);
        setRevenueValue(total);
      } else {
        // no aggregated rows -> fallback to local computation
        setRevenueValue(computeRevenue(rawInvoices));
      }
    } catch (e) {
      console.warn('Failed to fetch revenue from backend, falling back to local sum', e);
      setRevenueValue(computeRevenue(rawInvoices));
    } finally {
      setRevenueLoading(false);
    }
  };

  // Fetch dashboard overview (contains totalRevenue) and keep it for Payments tab
  const fetchOverviewRevenue = async () => {
    setOverviewLoading(true);
    try {
      const res = await adminStatisticService.getOverview();
      const payload = (res && res.success && res.data) ? res.data : res;
      if (payload && typeof payload.totalRevenue !== 'undefined') {
        setOverviewRevenue(Number(payload.totalRevenue) || 0);
      }
    } catch (e) {
      console.warn('Failed to fetch overview revenue', e);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Fetch global invoice counts grouped by status from dispatcher stats endpoint
  const fetchInvoiceTotals = async () => {
    setInvoiceTotalsLoading(true);
    try {
      const res = await adminStatisticService.getDispatcherStats();
      const payload = (res && res.success && res.data) ? res.data : res;
      if (payload && payload.stats && payload.stats.invoices) {
        setInvoiceTotals(payload.stats.invoices);
      }
    } catch (e) {
      console.warn('Failed to fetch invoice totals', e);
    } finally {
      setInvoiceTotalsLoading(false);
    }
  };

  // Fetch recent payment transactions (used in Payments dashboard)
  const fetchRecentPayments = async (opts = {}) => {
    setRecentLoading(true);
    try {
      const res = await adminStatisticService.getRecentInvoices({ limit: opts.limit || 50 });
      const payload = (res && res.success && res.data) ? res.data : res;
      // admin endpoint may return { recentInvoices } or an array
      if (payload && Array.isArray(payload.recentInvoices)) setRecentPayments(payload.recentInvoices);
      else if (Array.isArray(payload)) setRecentPayments(payload);
      else setRecentPayments(payload.recentInvoices || []);
    } catch (e) {
      console.warn('Failed to fetch recent payments', e);
      setRecentPayments([]);
    } finally {
      setRecentLoading(false);
    }
  };

  // fetch server-side total paid aggregate
  const fetchTotalPaidSystem = async () => {
    setTotalPaidLoading(true);
    try {
      const res = await adminInvoiceService.getRevenueAggregate();
      const payload = (res && res.success && res.data) ? res.data : res;
      if (payload && typeof payload.totalRevenue !== 'undefined') {
        setTotalPaidSystem(Number(payload.totalRevenue) || 0);
      }
    } catch (e) {
      console.warn('Failed to fetch total paid aggregate', e);
    } finally {
      setTotalPaidLoading(false);
    }
  };

  // Build a simple daily revenue series from a list of invoices (for the mini line chart)
  const buildDailySeries = (list = [], daysBack = 30) => {
    const now = new Date();
    const days = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() - i);
      days.push({ key: d.toISOString().slice(0,10), date: d, value: 0 });
    }

    (list || []).forEach(inv => {
      const t = inv.lastTimelineUpdatedAt ? new Date(inv.lastTimelineUpdatedAt) : (inv.paidAt ? new Date(inv.paidAt) : (inv.createdAt ? new Date(inv.createdAt) : null));
      if (!t) return;
      const key = t.toISOString().slice(0,10);
      const item = days.find(d => d.key === key);
      const amount = Number(inv?.priceSnapshot?.totalPrice ?? inv?.total ?? inv?.amount ?? 0) || 0;
      if (item) item.value += amount;
    });
    return days;
  };

  // render a tiny svg line chart from series [{key,date,value}]
  const renderMiniLine = (series = []) => {
    if (!Array.isArray(series) || series.length === 0) {
      return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
          Không có dữ liệu
        </div>
      );
    }
    const w = 360; const h = 84; const pad = 8;
    const vals = series.map(s => s.value);
    const max = Math.max(...vals, 1);
    const points = series.map((s, idx) => {
      const x = pad + (idx / (series.length - 1 || 1)) * (w - pad * 2);
      const y = h - pad - (s.value / max) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');
    const areaPath = series.map((s, idx) => {
      const x = pad + (idx / (series.length - 1 || 1)) * (w - pad * 2);
      const y = h - pad - (s.value / max) * (h - pad * 2);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    const gradientId = 'g_rev_min';
    return (
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={hexToRgba(primaryColor, 0.16)} />
            <stop offset="100%" stopColor={hexToRgba(primaryColor, 0.02)} />
          </linearGradient>
        </defs>
        <path d={areaPath + ` L ${w-pad} ${h-pad} L ${pad} ${h-pad} Z`} fill={`url(#${gradientId})`} stroke="none" />
        <polyline points={points} fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  // Export filtered recent transactions to CSV
  const exportRecentToCsv = (rows = []) => {
    if (!Array.isArray(rows) || rows.length === 0) return notification.info({ message: 'Không có dữ liệu để xuất' });
    const headers = ['Mã hóa đơn', 'Khách hàng', 'Email', 'Số tiền', 'Trạng thái', 'Thời gian'];
    const csvRows = [headers.join(',')];
    rows.forEach(r => {
      const code = `"${(r.code || '')}"`;
      const name = `"${(r.customer?.fullName || '')}"`;
      const email = `"${(r.customer?.email || '')}"`;
      const amount = parseAmount(r?.priceSnapshot?.totalPrice ?? r?.total ?? r?.amount ?? r?.totalPrice ?? 0) || 0;
      const status = `"${(r.paymentStatus || '')}"`;
      const time = `"${(r.lastTimelineUpdatedAt || r.createdAt || r.paidAt || '')}"`;
      csvRows.push([code, name, email, amount, status, time].join(','));
    });
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recent_payments_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (v) => {
    try {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
    } catch (e) {
      return (v || 0).toString();
    }
  };

  // helper: convert hex to rgba string
  const hexToRgba = (hex, alpha = 1) => {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // robust amount parser: accepts numbers or formatted strings like "1.000.000", "1,000,000 VND", etc.
  const parseAmount = (v) => {
    if (v == null) return 0;
    if (typeof v === 'number' && !isNaN(v)) return v;
    let s = String(v).trim();
    // try direct numeric conversion first
    const direct = Number(s);
    if (!isNaN(direct)) return direct;
    // keep only digits, comma, dot and minus
    s = s.replace(/[^0-9.,-]/g, '');
    if (!s) return 0;
    // handle mixed separators
    if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
      // decide which is decimal by position: last separator is decimal
      if (s.lastIndexOf('.') > s.lastIndexOf(',')) {
        // dots are decimals, remove commas
        s = s.replace(/,/g, '');
      } else {
        // commas are decimals, remove dots and replace comma with dot
        s = s.replace(/\./g, '').replace(/,/g, '.');
      }
    } else if (s.indexOf(',') !== -1) {
      // single comma present: treat as decimal if only one comma and less than 3 digits after, else thousand separator
      const commas = (s.match(/,/g) || []).length;
      if (commas === 1 && s.split(',')[1].length <= 2) {
        s = s.replace(/,/g, '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else {
      // only dots: if many dots, remove as thousand separators
      const dots = (s.match(/\./g) || []).length;
      if (dots > 1) s = s.replace(/\./g, '');
    }
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };

  // try to extract lat/lng from various invoice location shapes
  const parseLatLng = (loc) => {
    if (!loc) return null;
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') return { lat: loc.lat, lng: loc.lng };
    if (loc.latitude && loc.longitude) return { lat: Number(loc.latitude), lng: Number(loc.longitude) };
    if (loc.lat && loc.lng) return { lat: Number(loc.lat), lng: Number(loc.lng) };
    if (loc.location && Array.isArray(loc.location.coordinates) && loc.location.coordinates.length >= 2) {
      const [lng, lat] = loc.location.coordinates;
      return { lat: Number(lat), lng: Number(lng) };
    }
    const coordStr = loc.coordinates || loc.coord || (loc.addressDetails && loc.addressDetails.coordinates) || null;
    if (typeof coordStr === 'string') {
      const m = coordStr.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
      if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
    }
    return null;
  };

  // lightweight geocode fallback using Nominatim
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

  // prepare map markers whenever selectedInvoice changes
  useEffect(() => {
    let mounted = true;
    const prepare = async () => {
      if (!selectedInvoice) {
        if (mounted) setMapMarkers(null);
        return;
      }
      setMapLoading(true);
      try {
        let p = parseLatLng(selectedInvoice.pickup);
        let d = parseLatLng(selectedInvoice.delivery);

        if (!p && (selectedInvoice.pickup?.address || selectedInvoice.pickup?.fullAddress)) {
          p = await geocodeAddress(selectedInvoice.pickup.address || selectedInvoice.pickup.fullAddress);
        }
        if (!d && (selectedInvoice.delivery?.address || selectedInvoice.delivery?.fullAddress)) {
          d = await geocodeAddress(selectedInvoice.delivery.address || selectedInvoice.delivery.fullAddress);
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
  }, [selectedInvoice]);

  // Leaflet map inside Modal can render blank or stretched when opened; trigger a resize event
  // shortly after Modal opens so the map invalidates its size and tiles render correctly.
  useEffect(() => {
    let t = null;
    if (detailVisible || mapFullscreenVisible) {
      // give Modal time to animate and layout
      t = setTimeout(() => {
        try {
          window.dispatchEvent(new Event('resize'));
        } catch (e) { /* ignore */ }
      }, 300);
    }
    return () => { if (t) clearTimeout(t); };
  }, [detailVisible, mapFullscreenVisible, mapMarkers]);


  const fetchList = async (page = 1, limit = 5, currentFilters = filters) => {
    setLoading(true);
    try {
      const params = { page, limit, search: currentFilters.search, status: currentFilters.status };
      const res = await adminInvoiceService.getInvoices(params);
      let payload = res;
      if (res && res.success && res.data) payload = res.data;

      const rawInvoices = Array.isArray(payload.invoices) ? payload.invoices : [];
      const sortedInvoices = sortInvoicesByTime(rawInvoices, timeOrder);
      setInvoices(sortedInvoices);
  // fetch aggregated revenue for the range covered by returned invoices
  fetchRevenueForInvoices(rawInvoices);
      setPagination(prev => ({ ...prev, current: Number(payload.currentPage || page), pageSize: Number(payload.limit || limit), total: Number(payload.total || 0) }));
  // refresh global invoice totals (kpi cards)
  fetchInvoiceTotals();
    } catch (err) {
      console.error('Failed to fetch invoices', err);
      notification.error({ message: 'Không thể lấy danh sách hóa đơn' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1, pagination.pageSize, filters);
    // also fetch dashboard overview (totalRevenue) for Payments tab
    fetchOverviewRevenue();
    // fetch total paid aggregate
    fetchTotalPaidSystem();
    // fetch global invoice totals for KPI cards
    fetchInvoiceTotals();
    // fetch recent payments for Payments tab
    fetchRecentPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (val) => {
    const n = { ...filters, search: val };
    setFilters(n);
    fetchList(1, pagination.pageSize, n);
  };

  // Debounced live search while typing
  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (val) => {
    const nextFilters = { ...filters, search: val };
    setFilters(nextFilters);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    // debounce 400ms
    searchTimeoutRef.current = setTimeout(() => {
      fetchList(1, pagination.pageSize, nextFilters);
      searchTimeoutRef.current = null;
    }, 400);
  };

  // clear timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to sort invoices by timeline.updatedAt (most recent timeline entry) according to timeOrder
  const sortInvoicesByTime = (list, order) => {
    if (!Array.isArray(list)) return [];
    const copy = [...list];
    const getTimelineTime = (inv) => {
      // timeline is an array of { status, updatedBy, updatedAt, notes }
      if (Array.isArray(inv?.timeline) && inv.timeline.length) {
        // find the most recent updatedAt in timeline
        const times = inv.timeline.map(t => t && t.updatedAt ? new Date(t.updatedAt).getTime() : 0);
        return Math.max(...times);
      }
      // fallback to invoice.updatedAt or scheduledTime
      if (inv?.updatedAt) return new Date(inv.updatedAt).getTime();
      if (inv?.scheduledTime) return new Date(inv.scheduledTime).getTime();
      return 0;
    };

    copy.sort((a, b) => {
      const at = getTimelineTime(a);
      const bt = getTimelineTime(b);
      // 'nearest' means most recent first (descending)
      if (order === 'nearest') return bt - at;
      // 'reverse' means oldest first (ascending)
      return at - bt;
    });
    return copy;
  };

  const handleTimeOrderChange = (val) => {
    setTimeOrder(val);
    // reorder current invoices in UI without refetch
    setInvoices(prev => sortInvoicesByTime(prev, val));
  };

  const handleStatusFilter = (s) => {
    const n = { ...filters, status: s };
    setFilters(n);
    fetchList(1, pagination.pageSize, n);
  };

  const openDetail = async (record) => {
    setSelectedInvoice(null);
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await adminInvoiceService.getInvoiceById(record._id || record._id);
      let payload = res;
      if (res && res.success && res.data) payload = res.data;
      setSelectedInvoice(payload);
    } catch (e) {
      // If this error was triggered by client-side validation (invalid id), suppress the toast
      if (e && e.isClientValidation) {
        console.warn('openDetail: invalid invoice id, skipping error toast');
      } else {
        notification.error({ message: 'Không thể lấy chi tiết hóa đơn' });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
  { title: 'Mã hóa đơn', dataIndex: 'code', key: 'code', width: 130, ellipsis: true, render: (text) => <Text strong style={{ color: primaryColor, fontSize: 13 }}>{text}</Text> },
    { title: 'Khách hàng', dataIndex: ['customer', 'fullName'], key: 'customer', render: (t, r) => (t || r.customer?.email || '—') },
    { title: 'Địa chỉ lấy', dataIndex: ['pickup', 'address'], key: 'pickup', render: (t) => t || '—' },
    { title: 'Địa chỉ giao', dataIndex: ['delivery', 'address'], key: 'delivery', render: (t) => t || '—' },
  { title: 'Thời gian', dataIndex: 'lastTimelineUpdatedAt', key: 'lastTimelineUpdatedAt', width: 160, render: (d) => d ? new Date(d).toLocaleString() : '—' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 140, render: (s) => {
      const map = { COMPLETED: ['green','Hoàn thành'], CANCELLED: ['red','Đã hủy'], IN_PROGRESS: ['blue','Đang chạy'], ASSIGNED: ['gold','Đã phân công'], DRAFT: ['default','Nháp'] };
      const info = map[s] || ['default', s || '—'];
      return <Tag color={info[0]}>{info[1]}</Tag>;
    } },
    { title: 'Hành động', key: 'action', width: 140, render: (_, record) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <Button className="btn-outline-primary" icon={<FolderOpenOutlined />} size="small" onClick={() => openDetail(record)}>Chi tiết</Button>
  <Button className="btn-outline-primary" icon={<FileTextOutlined />} size="small" onClick={() => { setEinvoiceInvoiceId(record._id); setEinvoiceVisible(true); }}>Hóa đơn điện tử</Button>
      </div>
    ) }
  ];
  const tabItems = [
    {
      key: '1',
      label: (<span><FolderOpenOutlined style={{ marginRight: 8 }} />Hóa đơn</span>),
        children: (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Title level={4} style={{ margin: 0 }}>Quản lý hóa đơn</Title>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input.Search
                  className="invoice-search"
                  placeholder="Tìm mã hóa đơn"
                  onSearch={handleSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  allowClear
                  style={{ width: 280 }}
                  enterButton={<Button type="primary" style={{ background: primaryColor, borderColor: primaryColor, display: 'flex', alignItems: 'center', gap: 8 }} icon={<SearchOutlined />} />}
                />
                <Select
                  placeholder="Trạng thái"
                  style={{ width: 180 }}
                  allowClear
                  value={filters.status}
                  onChange={(val) => {
                    const n = { ...filters, status: val || '' };
                    setFilters(n);
                    setPagination(prev => ({ ...prev, current: 1 }));
                    fetchList(1, pagination.pageSize, n);
                  }}
                >
                  <Option value="">Tất cả</Option>
                  <Option value="COMPLETED">Hoàn thành</Option>
                  <Option value="CANCELLED">Đã hủy</Option>
                  <Option value="IN_PROGRESS">Đang chạy</Option>
                  <Option value="ASSIGNED">Đã phân công</Option>
                </Select>
                <Select value={timeOrder} onChange={handleTimeOrderChange} style={{ width: 140 }} size="middle">
                  <Option value="nearest">Gần đây</Option>
                  <Option value="reverse">Trễ nhất</Option>
                </Select>
              </div>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {/* Stat cards */}
                {(() => {
                // Prefer server-provided global totals when available; otherwise fall back to page-local counts
                const total = invoiceTotals ? Number(invoiceTotals.total || 0) : Number(pagination.total || 0);
                const completed = invoiceTotals ? Number(invoiceTotals.COMPLETED || 0) : invoices.filter(i => i.status === 'COMPLETED').length;
                const inProgress = invoiceTotals ? Number((invoiceTotals.IN_PROGRESS || 0) + (invoiceTotals.ASSIGNED || 0)) : invoices.filter(i => i.status === 'IN_PROGRESS' || i.status === 'ASSIGNED').length;
                // Use dashboard overview total when available; otherwise fall back to computed/page sum
                const revenueValue = overviewLoading ? 0 : (overviewRevenue !== null ? overviewRevenue : computeRevenue(invoices || []));
                const avg = invoices.length ? Math.round((computeRevenue(invoices || []) / invoices.length) || 0) : 0;

                const statItems = [
                  { key: 'total', label: 'Tổng hóa đơn', value: total, color: '#2f8f6b', icon: <FolderOpenOutlined /> },
                  { key: 'revenue', label: 'Doanh thu', value: formatCurrency(revenueValue), color: '#d48806', icon: <DollarCircleOutlined /> },
                  { key: 'completed', label: 'Hoàn thành', value: completed, color: '#13c2c2', icon: <CheckCircleOutlined /> },
                  { key: 'inProgress', label: 'Đã phân công', value: inProgress, color: '#597ef7', icon: <BarChartOutlined /> },
                ];

                return statItems.map(item => {
                  const cardBg = hexToRgba(item.color, 0.06);
                  const borderColor = hexToRgba(item.color, 0.12);
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
                      <Card style={{ borderRadius: 10, minHeight: 92, background: cardBg, border: `1px solid ${borderColor}` }} bodyStyle={{ padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ color: '#888', fontSize: 13 }}>{item.label}</div>
                            <div style={{ fontWeight: 700, fontSize: 18, color: primaryColor }}>{item.value}</div>
                          </div>
                          <div>
                            <Avatar shape="square" size={40} style={{ background: item.color, color: '#fff' }}>{item.icon}</Avatar>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  );
                });
              })()}
            </Row>

            <Card style={{ borderRadius: 12 }}>
              <Table
                columns={columns}
                dataSource={invoices}
                rowKey={(r) => r._id}
                pagination={pagination}
                loading={loading}
                onChange={(pag) => { setPagination(prev => ({ ...prev, current: pag.current, pageSize: pag.pageSize })); fetchList(pag.current, pag.pageSize, filters); }}
              />
            </Card>
          </>
        )
    },
    {
      key: '2',
      label: (<span><DollarCircleOutlined style={{ marginRight: 8 }} />Doanh Thu</span>),
      children: (() => {
        // local helper: filter recentPayments by search and time range
        const getFilteredRecent = () => {
          let list = Array.isArray(recentPayments) ? [...recentPayments] : [];
          const s = (paymentSearch || '').toString().trim().toLowerCase();
          if (s) {
            list = list.filter(i => ((i.code || '') + ' ' + (i.customer?.fullName || '') + ' ' + (i.customer?.email || '')).toLowerCase().includes(s));
          }
          if (paymentsViewTimeRange && paymentsViewTimeRange !== 'all') {
            const now = Date.now();
            let cutoff = 0;
            if (paymentsViewTimeRange === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;
            if (paymentsViewTimeRange === '30d') cutoff = now - 30 * 24 * 60 * 60 * 1000;
            if (paymentsViewTimeRange === '90d') cutoff = now - 90 * 24 * 60 * 60 * 1000;
            list = list.filter(i => {
              const t = i.lastTimelineUpdatedAt ? new Date(i.lastTimelineUpdatedAt).getTime() : (i.createdAt ? new Date(i.createdAt).getTime() : 0);
              return t >= cutoff;
            });
          }
          // filter by payment status: all / PAID / PARTIAL / UNPAID
          if (paymentStatusFilter && paymentStatusFilter !== 'all') {
            if (paymentStatusFilter === 'PAID') {
              list = list.filter(i => (i.paymentStatus === 'PAID'));
            } else if (paymentStatusFilter === 'PARTIAL') {
              list = list.filter(i => (i.paymentStatus === 'PARTIAL'));
            } else if (paymentStatusFilter === 'UNPAID') {
              // treat missing/empty paymentStatus or explicit UNPAID as unpaid
              list = list.filter(i => (!i.paymentStatus || i.paymentStatus === 'UNPAID'));
            }
          }
          return list;
        };

        const filteredRecent = getFilteredRecent();
        const recentCount = filteredRecent.length;
        const recentTotal = filteredRecent.reduce((s, it) => s + (parseAmount(it?.priceSnapshot?.totalPrice ?? it?.total ?? it?.amount ?? it?.totalPrice ?? 0) || 0), 0);

        // KPI helpers (based on filteredRecent)
        const avgTicket = recentCount ? Math.round(recentTotal / recentCount) : 0;
        const topCustomer = (() => {
          const map = {};
          (filteredRecent || []).forEach(r => {
            const key = (r.customer?.email || r.customer?.fullName || 'Khách lạ').toString();
            const amt = parseAmount(r?.priceSnapshot?.totalPrice ?? r?.total ?? r?.amount ?? r?.totalPrice ?? 0) || 0;
            map[key] = (map[key] || 0) + amt;
          });
          const entries = Object.entries(map);
          if (!entries.length) return null;
          entries.sort((a,b) => b[1] - a[1]);
          return { name: entries[0][0], value: entries[0][1] };
        })();

        // status breakdown for donut/legends
        const statusCounts = (() => {
          const m = { PAID: 0, PARTIAL: 0, UNPAID: 0 };
          (filteredRecent || []).forEach(it => {
            if (it?.paymentStatus === 'PAID') m.PAID += 1;
            else if (it?.paymentStatus === 'PARTIAL') m.PARTIAL += 1;
            else m.UNPAID += 1;
          });
          return m;
        })();
        const statusTotal = Math.max(1, (statusCounts.PAID + statusCounts.PARTIAL + statusCounts.UNPAID));
        const pctPaid = Math.round((statusCounts.PAID + statusCounts.PARTIAL) / statusTotal * 100);
        const totalPaidAmount = filteredRecent.reduce((s, it) => {
          const st = it?.paymentStatus;
          if (st !== 'PAID' && st !== 'PARTIAL') return s;
          return s + (parseAmount(it?.priceSnapshot?.totalPrice ?? it?.total ?? it?.amount ?? it?.totalPrice ?? 0) || 0);
        }, 0);

        const paymentsColumns = [
          { title: 'Mã HĐ', dataIndex: 'code', key: 'code', render: (t) => <Text strong>{t}</Text> },
          { title: 'Khách hàng', dataIndex: ['customer', 'fullName'], key: 'customer' },
          { title: 'Số tiền', dataIndex: 'amount', key: 'amount', render: (v, r) => {
              // backend recent-invoices returns totalPrice (priceSnapshot may be absent in this lightweight shape)
              const amt = parseAmount(r?.priceSnapshot?.totalPrice ?? r?.total ?? r?.amount ?? r?.totalPrice ?? 0) || 0;
              return <span className="amount-cell">{formatCurrency(amt)}</span>;
            }
          },
          { title: 'Thanh toán', dataIndex: 'paymentStatus', key: 'paymentStatus', render: (s) => {
              const map = { PAID: ['green','Đã thanh toán'], PARTIAL: ['orange','Thanh toán một phần'] };
              const info = map[s] || ['default', s || 'Chưa thanh toán'];
              return <Tag color={info[0]}>{info[1]}</Tag>;
            } },
          { title: 'Thời gian', dataIndex: 'lastTimelineUpdatedAt', key: 'time', render: (_, record) => {
              const d = record.lastTimelineUpdatedAt || record.createdAt || record.paidAt || null;
              return d ? new Date(d).toLocaleString() : null;
            }
          },
          { title: 'Hành động', key: 'action', render: (_, record) => (<Button size="small" className="btn-outline-primary" onClick={() => openDetail(record)}>Xem</Button>) }
        ];

        return (
          <>
            {/* Top strip: three KPI cards at left (same width as revenue card below) and Recent transactions card on the right */}
            <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
              <Col xs={24} lg={16}>
                <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {/* KPI 1: Trung bình (with color + icon) */}
                    <Card size="small" style={{ borderRadius: 10, flex: 1, background: hexToRgba('#2f8f6b', 0.06), border: `1px solid ${hexToRgba('#2f8f6b', 0.12)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#666', fontSize: 12 }}>Trung bình</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: primaryColor, marginTop: 6 }}>{formatCurrency(avgTicket)}</div>
                          <div style={{ color: '#888', marginTop: 6, fontSize: 12 }}>trên đơn</div>
                        </div>
                        <Avatar size={44} shape="square" style={{ background: '#2f8f6b', color: '#fff' }} icon={<StarOutlined />} />
                      </div>
                    </Card>

                    {/* KPI 2: Khách hàng top (with color + icon) */}
                    <Card size="small" style={{ borderRadius: 10, flex: 1, background: hexToRgba('#597ef7', 0.06), border: `1px solid ${hexToRgba('#597ef7', 0.12)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#666', fontSize: 12 }}>Khách hàng top</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: primaryColor, marginTop: 6 }}>{topCustomer ? topCustomer.name : '—'}</div>
                          <div style={{ color: '#888', marginTop: 6, fontSize: 12 }}>{topCustomer ? formatCurrency(topCustomer.value) : ''}</div>
                        </div>
                        <Avatar size={44} shape="square" style={{ background: '#597ef7', color: '#fff' }} icon={<TrophyOutlined />} />
                      </div>
                    </Card>

                    {/* KPI 3: Tỉ lệ đã thanh toán (PAID/PARTIAL) - complements donut */}
                    <Card size="small" style={{ borderRadius: 10, flex: 1, background: hexToRgba('#d48806', 0.06), border: `1px solid ${hexToRgba('#d48806', 0.12)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#666', fontSize: 12 }}>Tỉ lệ đã thanh toán</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: primaryColor, marginTop: 6 }}>{pctPaid}%</div>
                          <div style={{ color: '#888', marginTop: 6, fontSize: 12 }}>tính trên giao dịch đang lọc</div>
                        </div>
                        <Avatar size={44} shape="square" style={{ background: '#d48806', color: '#fff' }} icon={<CheckCircleOutlined />} />
                      </div>
                    </Card>
                  </div>

                  {/* Put the revenue card under the KPIs in the same left column so it won't be pushed by the right column height */}
                  <div>
                    <Card style={{ borderRadius: 12, background: hexToRgba(primaryColor, 0.06), border: `1px solid ${hexToRgba(primaryColor, 0.12)}` }} bodyStyle={{ padding: 16 }}>
                      {overviewLoading || totalPaidLoading || recentLoading ? (
                        <div style={{ padding: 12 }}><Skeleton active paragraph={{ rows: 3 }} /></div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#666', fontSize: 14 }}>Tổng doanh thu (hệ thống)</div>
                            <div style={{ fontSize: 32, fontWeight: 800, color: primaryColor, marginTop: 6 }}>{formatCurrency(overviewRevenue !== null ? overviewRevenue : revenueValue)}</div>
                            <div style={{ color: '#888', marginTop: 8 }}>Doanh thu đã ghi nhận (PAID / PARTIAL)</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ marginTop: 8 }}>
                              <Avatar size={64} style={{ background: hexToRgba(primaryColor, 0.14), color: primaryColor }}>
                                <DollarCircleOutlined style={{ fontSize: 28 }} />
                              </Avatar>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              </Col>

              <Col xs={24} lg={8}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12, alignItems: 'stretch' }}>
                  {/* Donut chart showing payment status breakdown (PAID / PARTIAL / UNPAID) */}
                  <Card size="small" style={{ borderRadius: 8, minHeight: 256, display: 'flex', flexDirection: 'column' }} bodyStyle={{ padding: 16, flex: 1 }}>
                    {(() => {
                      const m = { PAID: 0, PARTIAL: 0, UNPAID: 0 };
                      (Array.isArray(recentPayments) ? recentPayments : []).forEach(it => {
                        if (it?.paymentStatus === 'PAID') m.PAID += 1;
                        else if (it?.paymentStatus === 'PARTIAL') m.PARTIAL += 1;
                        else m.UNPAID += 1;
                      });
                      const total = Math.max(1, (m.PAID + m.PARTIAL + m.UNPAID));
                      const pPaid = Math.round((m.PAID / total) * 100);
                      const pPartial = Math.round((m.PARTIAL / total) * 100);
                      const pUnpaid = 100 - pPaid - pPartial;
                      const size = 140; // increased donut size
                      const donutStyle = {
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        background: `conic-gradient(#52c41a 0% ${pPaid}%, #fa8c16 ${pPaid}% ${pPaid + pPartial}%, #d9d9d9 ${pPaid + pPartial}% 100%)`,
                        display: 'inline-block',
                        position: 'relative'
                      };
                      // center the donut and show legend underneath using primary palette
                      // pastel palette for a softer look
                      const paidColor = '#b7d3b7'; // pastel green
                      const partialColor = '#f0c58a'; // pastel orange
                      const unpaidColor = '#f5f6f7'; // very light neutral
                      const donutBg = `conic-gradient(${paidColor} 0% ${pPaid}%, ${partialColor} ${pPaid}% ${pPaid + pPartial}%, ${unpaidColor} ${pPaid + pPartial}% 100%)`;
                      const centerDonutStyle = { ...donutStyle, background: donutBg };
                      // build legend items and sort by count descending so largest appears first
                      const legendItems = [
                        { key: 'PAID', label: 'Đã thanh toán', count: m.PAID, color: paidColor },
                        { key: 'PARTIAL', label: 'Một phần', count: m.PARTIAL, color: partialColor },
                        { key: 'UNPAID', label: 'Chưa', count: m.UNPAID, color: unpaidColor }
                      ].sort((a,b) => b.count - a.count);

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            {/* SVG donut with rounded segments */}
                            {(() => {
                              const strokeWidth = Math.max(12, Math.round(size * 0.18));
                              const r = (size - strokeWidth) / 2;
                              const c = 2 * Math.PI * r;
                              const segments = [
                                { key: 'PAID', pct: pPaid, color: paidColor },
                                { key: 'PARTIAL', pct: pPartial, color: partialColor },
                                { key: 'UNPAID', pct: pUnpaid, color: unpaidColor }
                              ];
                              let acc = 0; // accumulated length in px
                              return (
                                <div style={{ width: size, height: size, position: 'relative' }}>
                                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
                                    <g transform={`rotate(-90 ${size/2} ${size/2})`}>
                                      {segments.map(s => {
                                        const len = (s.pct / 100) * c;
                                        const dash = `${len} ${Math.max(0, c - len)}`;
                                        const dashOffset = -acc;
                                        acc += len;
                                        return (
                                          <circle
                                            key={s.key}
                                            cx={size / 2}
                                            cy={size / 2}
                                            r={r}
                                            fill="none"
                                            stroke={s.color}
                                            strokeWidth={strokeWidth}
                                            strokeDasharray={dash}
                                            strokeDashoffset={dashOffset}
                                            strokeLinecap="round"
                                          />
                                        );
                                      })}
                                      {/* subtle track for better contrast */}
                                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth={1} />
                                    </g>
                                  </svg>
                                  <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: size * 0.46, height: size * 0.46, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.02)' }}>
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: 12, color: '#666' }}>PAID%</div>
                                      <div style={{ fontWeight: 700, color: primaryColor }}>{pPaid}%</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {legendItems.map(it => (
                              <div key={it.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ width: 14, height: 14, background: it.color, borderRadius: 3, border: it.key === 'UNPAID' ? '1px solid #e8e8e8' : 'none' }} />
                                <div style={{ fontSize: 13 }}>{it.label}: <strong style={{ color: primaryColor, marginLeft: 6 }}>{it.count}</strong></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </Card>
                </div>
              </Col>
            </Row>

            {/* Duplicate revenue card removed; revenue now lives under the KPI cards in the left column */}

            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input.Search
                    placeholder="Tìm mã / tên khách"
                    onSearch={(v) => setPaymentSearch(v || '')}
                    onChange={(e) => setPaymentSearch(e.target.value || '')}
                    allowClear
                    style={{ width: 240 }}
                  />
                  <Select value={paymentStatusFilter} onChange={(v) => setPaymentStatusFilter(v)} size="small" style={{ width: 160 }}>
                    <Option value="all">Tất cả trạng thái</Option>
                    <Option value="PAID">Đã thanh toán</Option>
                    <Option value="PARTIAL">Thanh toán một phần</Option>
                    <Option value="UNPAID">Chưa thanh toán</Option>
                  </Select>
                  <Select value={paymentsViewTimeRange} onChange={(v) => setPaymentsViewTimeRange(v)} size="small" style={{ width: 120 }}>
                    <Option value="7d">7 ngày</Option>
                    <Option value="30d">30 ngày</Option>
                    <Option value="90d">90 ngày</Option>
                    <Option value="all">Tất cả</Option>
                  </Select>
                  <Button size="small" className="btn-outline-primary" onClick={() => exportRecentToCsv(filteredRecent)} icon={<FileTextOutlined />}>Xuất CSV</Button>
                </div>
                <div style={{ color: '#999', fontSize: 13 }}>Dữ liệu lấy từ giao dịch gần nhất (server)</div>
              </div>

              <Table
                className="payments-table"
                size="small"
                columns={paymentsColumns}
                dataSource={filteredRecent.map((r, idx) => ({ ...r, key: r._id || idx }))}
                loading={recentLoading}
                pagination={{ pageSize: 10 }}
                rowKey={(r) => r._id || r.key}
              />
            </Card>
          </>
        );
      })()
    }
  ];

  return (
    <div style={{ padding: 22 }}>
      <style>{`
        .invoices-kpi { display:flex; gap:12px; margin-bottom:12px }
        .invoice-tile { flex:1; padding:12px; border-radius:8px; background:#fff; box-shadow:0 6px 18px rgba(0,0,0,0.04) }
        .invoice-key { color:#888; font-size:13px }
        .invoice-val { font-weight:700; font-size:18px; color:${primaryColor} }

        /* Tabs styling to match primary color */
        .invoice-tabs .ant-tabs-ink-bar { background: ${primaryColor} !important; }
        .invoice-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: ${primaryColor} !important; }
        /* ensure hover on tab label uses primary color */
        .invoice-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn { color: ${primaryColor} !important; }

        /* Search input/button styling */
        .invoice-search .ant-input-affix-wrapper { border-color: ${primaryColor} !important; }
        .invoice-search .ant-input { color: rgba(0,0,0,0.85); }
        .invoice-search .ant-btn { background: ${primaryColor} !important; border-color: ${primaryColor} !important; color: #fff !important; }
  /* Payments table themed */
  .payments-table .ant-table-thead > tr > th { background: ${hexToRgba(primaryColor, 0.06)}; color: ${primaryColor}; border-bottom: 1px solid ${hexToRgba(primaryColor, 0.12)}; }
  .payments-table .ant-table-tbody > tr:hover > td { background: ${hexToRgba(primaryColor, 0.03)}; }
  .payments-table .ant-table-tbody > tr > td.amount-cell, .payments-table .amount-cell { color: ${primaryColor}; font-weight: 700; }
  .payments-table .ant-pagination .ant-pagination-item-active a, .payments-table .ant-pagination-item-active { border-color: ${primaryColor}; }
    /* Outlined primary button: white bg, primary border/text, invert on hover */
    .btn-outline-primary { background: #fff; color: ${primaryColor}; border: 1px solid ${primaryColor}; box-shadow: none; }
    .btn-outline-primary:hover, .btn-outline-primary:focus { background: ${primaryColor} !important; color: #fff !important; border-color: ${primaryColor} !important; }
    .btn-outline-primary[disabled], .btn-outline-primary[aria-disabled="true"] { opacity: 0.6; cursor: not-allowed; }
        /* Top invoice list visuals */
        .top-invoice-card { transition: transform .14s ease, box-shadow .14s ease; }
        .top-invoice-card:hover { transform: translateY(-6px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .top-invoice-progress { transition: width .6s ease; border-radius: 8px; }
        /* Modal detail styles */
        .invoice-modal-header { display:flex; justify-content:space-between; align-items:center; gap:12px; padding-bottom:12px; border-bottom: 1px solid rgba(0,0,0,0.06) }
        .invoice-code { font-size:20px; font-weight:800; color: ${primaryColor}; }
        .invoice-sub { font-size:13px; color:#777; margin-top:4px; font-weight:500 }
        .invoice-amount { font-size:20px; font-weight:800; color:#d48806 }
        .invoice-section { border-radius:8px; padding:12px; background: linear-gradient(180deg, rgba(255,255,255,0.9), #fff); border: 1px solid rgba(0,0,0,0.04) }
        .invoice-label { color:#666; font-size:13px; margin-bottom:6px }
        .invoice-val { font-weight:600; color: ${primaryColor} }
  /* smaller address text for pickup/delivery to fit modal */
  .invoice-address { font-weight:600; color: ${primaryColor}; font-size:14px; line-height:1.35; }
        .invoice-note { color:#444; white-space:pre-wrap }
  /* compact embedded map inside invoice modal */
  .invoice-map .location-picker .search-bar { display: none !important; }
  .invoice-map .location-picker .map-legend { display: none !important; }
  .invoice-map .location-picker .map-container { height: 100% !important; }
        .invoice-meta .ant-card-body { padding:10px }
        .meta-row { display:flex; align-items:center; gap:10px; margin-bottom:8px }
        .meta-row a { font-size:13px; text-decoration:none }
        @media (max-width: 768px) {
          .invoice-modal-header { flex-direction:column; align-items:flex-start }
        }
      `}</style>

      <Card style={{ borderRadius: 12 }}>
        <Tabs defaultActiveKey="1" items={tabItems} className="invoice-tabs" />
      </Card>

      <Modal
        title={null}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
        bodyStyle={{ padding: 20 }}
      >
        {detailLoading || !selectedInvoice ? (
          <div style={{ textAlign: 'center', padding: 20 }}><Spin /> Đang tải...</div>
        ) : (
          <div>
            <div className="invoice-modal-header">
              <div>
                <div className="invoice-code">{selectedInvoice.code || '—'}</div>
                <div className="invoice-sub">Chi tiết đơn hàng vận chuyển</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="invoice-amount">{formatCurrency(Number(selectedInvoice?.priceSnapshot?.totalPrice ?? selectedInvoice?.total ?? selectedInvoice?.amount ?? 0) || 0)}</div>
                    <div style={{ marginTop: 6 }}>
                      {(() => {
                        const s = selectedInvoice?.status || selectedInvoice?.paymentStatus || '';
                        const map = { COMPLETED: ['green','Hoàn thành'], CANCELLED: ['red','Đã hủy'], IN_PROGRESS: ['blue','Đang chạy'], ASSIGNED: ['gold','Đã phân công'], DRAFT: ['default','Nháp'], PAID: ['green','Đã thanh toán'], PARTIAL: ['orange','Thanh toán một phần'] };
                        const info = map[s] || ['default', s || '—'];
                        return <Tag color={info[0]}>{info[1]}</Tag>;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <Row gutter={[16,16]}>
                <Col xs={24} md={16}>
                  <div className="invoice-section" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div className="invoice-label"><EnvironmentOutlined style={{ marginRight: 8 }} /> Địa chỉ lấy</div>
                        <div className="invoice-val invoice-address">{selectedInvoice.pickup?.address || '—'}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="invoice-label"><EnvironmentOutlined style={{ marginRight: 8 }} /> Địa chỉ giao</div>
                        <div className="invoice-val invoice-address">{selectedInvoice.delivery?.address || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="invoice-section invoice-map" style={{ marginBottom: 12 }}>
                    <div className="invoice-label">Bản đồ</div>
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
                          <div style={{ height: 260, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', position: 'relative' }}>
                            <div style={{ position: 'absolute', right: 8, top: 8, zIndex: 1100 }}>
                              <Tooltip title="Toàn màn hình">
                                <Button shape="circle" size="small" onClick={() => setMapFullscreenVisible(true)} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }} icon={<FullscreenOutlined style={{ color: primaryColor }} />} />
                              </Tooltip>
                            </div>
                            <LocationPicker
                              initialPosition={p || d}
                              otherLocation={d && p ? (p.lat === d.lat && p.lng === d.lng ? null : d) : null}
                              locationType="pickup"
                              currentLocationData={{ address: selectedInvoice.pickup?.address || selectedInvoice.pickup?.fullAddress }}
                              showRoute={false}
                              routeColor={primaryColor}
                            />
                          </div>
                        );
                      }

                      // fallback: no coordinates -> show quick links to open Google Maps
                      const pickupAddr = selectedInvoice.pickup?.address || selectedInvoice.pickup?.fullAddress || '';
                      const deliveryAddr = selectedInvoice.delivery?.address || selectedInvoice.delivery?.fullAddress || '';
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
                </Col>

                <Col xs={24} md={8} className="invoice-meta">
                  <Card size="small" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Avatar size={36} style={{ background: hexToRgba(primaryColor,0.9), color: '#fff', fontWeight: 700 }}>{(selectedInvoice.customer?.fullName || selectedInvoice.customer?.email || 'KH').slice(0,1)}</Avatar>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{selectedInvoice.customer?.fullName || selectedInvoice.customer?.email || '—'}</div>
                        <div style={{ color: '#666', fontSize: 13 }}>{selectedInvoice.customer?.phone || selectedInvoice.customer?.email || ''}</div>
                      </div>
                    </div>
                  </Card>

                  <Card size="small" style={{ marginBottom: 12 }}>
                    <div className="invoice-label">Xe được phân công</div>
                    {(selectedInvoice.assignedVehicles || []).length ? (
                      (selectedInvoice.assignedVehicles || []).map(v => (
                        <div key={v._id || v.vehicleId || v.plateNumber} className="meta-row">
                          <Avatar size={36} style={{ background: hexToRgba(primaryColor, 0.85), color: '#fff' }}>{(v.plateNumber || 'V').slice(0,1)}</Avatar>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{v.plateNumber || '—'}</div>
                            <div style={{ color: '#666', fontSize: 12 }}>{v.vehicleType ? `${v.vehicleType}` : ''}{v.vehicleId ? ` • ${v.vehicleId}` : ''}</div>
                          </div>
                        </div>
                      ))
                    ) : <div style={{ color: '#999' }}>Chưa phân công xe</div>}
                  </Card>

                  <Card size="small" style={{ marginBottom: 12 }}>
                    <div className="invoice-label">Nhân Công</div>
                    {(selectedInvoice.assignedDrivers || []).length ? (
                      (selectedInvoice.assignedDrivers || []).map(d => (
                        <div key={d._id || d.phone || d.fullName} className="meta-row">
                          <Avatar size={36} style={{ background: '#ffd666', color: '#111' }}>{(d.fullName || 'T').slice(0,1)}</Avatar>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{d.fullName || '—'}</div>
                            <div style={{ color: '#666', fontSize: 12 }}>{d.phone || '—'}</div>
                          </div>
                        </div>
                      ))
                    ) : <div style={{ color: '#999' }}>Chưa phân công tài xế</div>}
                  </Card>

                  <Card size="small">
                    <div className="invoice-label">Thời gian cập nhật</div>
                    <div className="invoice-val">{selectedInvoice.lastTimelineUpdatedAt ? new Date(selectedInvoice.lastTimelineUpdatedAt).toLocaleString() : (selectedInvoice.updatedAt ? new Date(selectedInvoice.updatedAt).toLocaleString() : '—')}</div>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Modal>
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
              currentLocationData={{ address: selectedInvoice?.pickup?.address || selectedInvoice?.pickup?.fullAddress }}
              showRoute={false}
              routeColor={primaryColor}
            />
          ) : (
            <div style={{ padding: 20 }}>
              <div>Không có vị trí để hiển thị trên bản đồ.</div>
            </div>
          )}
        </div>
      </Modal>
      {/* E-invoice modal mounted here so it can be opened from the actions column */}
      <EinvoiceModal
        visible={einvoiceVisible}
        invoiceId={einvoiceInvoiceId}
        onClose={() => { setEinvoiceVisible(false); setEinvoiceInvoiceId(null); }}
      />
    </div>
  );
};

export default InvoiceManagement;