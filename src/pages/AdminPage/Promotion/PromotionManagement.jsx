import React, { useEffect, useMemo, useState } from 'react';
import {Row,Col,Card,Typography,Input,Select,DatePicker,Space,Button, Table,Tag, Modal, Form, InputNumber, Switch, notification, Tooltip,} from 'antd';
import { PlusOutlined,EditOutlined, DeleteOutlined, DownloadOutlined, SearchOutlined, FilterOutlined, TagOutlined, CheckCircleOutlined, PauseCircleOutlined, ExclamationCircleOutlined, BulbOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import adminPromotionService from '../../../services/adminPromotionService';
import AIPromotionAdvisor from '../../../components/Admin/AI/AIPromotionAdvisor';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const primaryColor = '#44624A';
// Pastel palette for a softer, lighter donut chart look (Active, Inactive, Expired)
const palette = ['#A8E6CF', '#FFD3B6', '#FFAAA5'];

const PromotionManagement = () => {
  const [loading, setLoading] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // controls
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState([null, null]);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [form] = Form.useForm();
  const [advForm] = Form.useForm();

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const resp = await adminPromotionService.getPromotions();
      // resp may be { success, data } or array
      const data = resp && resp.success && Array.isArray(resp.data) ? resp.data : (Array.isArray(resp) ? resp : (resp && resp.data ? resp.data : []));
      setPromotions(data.map(p => ({ ...p, key: p._id || p.id })));
    } catch (err) {
      console.error(err);
      notification.error({ message: 'Không tải được danh sách khuyến mãi' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotions, search, statusFilter, dateRange, advancedFilters]);

  const applyFilters = () => {
    let out = promotions.slice();
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(p => (p.code || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    if (statusFilter && statusFilter !== 'All') {
      // use derived status (expired override) when filtering
      out = out.filter(p => {
        const now = new Date();
        if (p.validUntil) {
          const vu = new Date(p.validUntil);
          if (vu < now) return statusFilter === 'Expired';
        }
        return p.status === statusFilter;
      });
    }
    if (dateRange && dateRange[0] && dateRange[1]) {
      const from = dateRange[0].startOf('day').toDate();
      const to = dateRange[1].endOf('day').toDate();
      out = out.filter(p => {
        const vf = p.validFrom ? new Date(p.validFrom) : null;
        const vu = p.validUntil ? new Date(p.validUntil) : null;
        // include if it overlaps the range
        return (vf && vf <= to) && (vu && vu >= from);
      });
    }
    // apply advanced filters
    if (advancedFilters) {
      const af = advancedFilters;
      if (af.discountType) {
        out = out.filter(p => p.discountType === af.discountType);
      }
      if (af.minDiscount != null) {
        out = out.filter(p => (p.discountValue || 0) >= af.minDiscount);
      }
      if (af.maxDiscount != null) {
        out = out.filter(p => (p.discountValue || 0) <= af.maxDiscount);
      }
      if (af.usageMin != null) {
        out = out.filter(p => (p.usageCount || 0) >= af.usageMin);
      }
      if (af.usageMax != null) {
        out = out.filter(p => (p.usageCount || 0) <= af.usageMax);
      }
      if (af.applicableArea && Array.isArray(af.applicableArea) && af.applicableArea.length) {
        out = out.filter(p => {
          const areas = p.applicableAreas || [];
          return af.applicableArea.every(a => areas.includes(a));
        });
      }
    }
    setFiltered(out);
  };

  const stats = useMemo(() => {
    // derive status from dates first (expired if validUntil < now)
    const total = promotions.length;
    const now = new Date();
    const active = promotions.filter(p => {
      if (p.validUntil) {
        const vu = new Date(p.validUntil);
        if (vu < now) return false; // expired
      }
      return p.status === 'Active';
    }).length;
    const inactive = promotions.filter(p => {
      if (p.validUntil) {
        const vu = new Date(p.validUntil);
        if (vu < now) return false;
      }
      return p.status === 'Inactive';
    }).length;
    const expired = promotions.filter(p => {
      if (p.validUntil) {
        const vu = new Date(p.validUntil);
        if (vu < now) return true;
      }
      return p.status === 'Expired';
    }).length;
    return { total, active, inactive, expired };
  }, [promotions]);

  // Pie chart should reflect the raw status field stored in the DB (not the date-derived status)
  // Keep internal key (Active/Inactive/Expired) for logic, but expose Vietnamese labels for display
  const pieData = useMemo(() => {
    const counts = { Active: 0, Inactive: 0, Expired: 0 };
    promotions.forEach(p => {
      const s = p.status || 'Inactive';
      if (counts[s] == null) counts[s] = 0;
      counts[s]++;
    });
    return [
      { key: 'Active', name: 'Hoạt động', value: counts.Active || 0 },
      { key: 'Inactive', name: 'Tạm dừng', value: counts.Inactive || 0 },
      { key: 'Expired', name: 'Hết hạn', value: counts.Expired || 0 },
    ];
  }, [promotions]);

  const usageData = useMemo(() => {
    // top 6 promotions by usage
    const d = promotions.slice().sort((a,b) => (b.usageCount||0) - (a.usageCount||0)).slice(0,6).map(p => ({ code: p.code, usage: p.usageCount || 0 }));
    return d;
  }, [promotions]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };
  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      code: record.code,
      description: record.description,
      discountType: record.discountType,
      discountValue: record.discountValue,
      maxDiscount: record.maxDiscount,
      minOrderAmount: record.minOrderAmount,
      usageLimit: record.usageLimit,
      // RangePicker expects an array [start, end]
      dateRange: record.validFrom && record.validUntil ? [dayjs(record.validFrom), dayjs(record.validUntil)] : null,
      applicableServices: record.applicableServices || [],
      applicableAreas: record.applicableAreas || [],
      status: record.status,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Xoá khuyến mãi',
      content: 'Bạn có chắc muốn xoá khuyến mãi này? Hành động không thể hoàn tác.',
      onOk: async () => {
        try {
          await adminPromotionService.deletePromotion(id);
          notification.success({ message: 'Đã xoá khuyến mãi' });
          setPromotions(prev => prev.filter(p => (p._id || p.id) !== id));
        } catch (err) {
          console.error(err);
          notification.error({ message: 'Xoá thất bại' });
        }
      }
    });
  };

  const handleExport = async () => {
    try {
      const resp = await adminPromotionService.exportPromotionsCsv();
      const blob = new Blob([resp.data], { type: resp.headers['content-type'] || 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promotions_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notification.success({ message: 'Bắt đầu tải CSV' });
    } catch (err) {
      console.error(err);
      notification.error({ message: 'Xuất CSV thất bại' });
    }
  };

  const handleToggleActive = async (record) => {
    // Do not allow toggling promotions that are marked Expired in DB
    if (record.status === 'Expired') {
      notification.warning({ message: 'Không thể thay đổi trạng thái', description: 'Mã đã hết hạn, không thể bật/tắt' });
      return;
    }
    try {
      const payload = { ...record, status: record.status === 'Active' ? 'Inactive' : 'Active' };
      const id = record._id || record.id;
      const resp = await adminPromotionService.updatePromotion(id, payload);
      const updated = resp && resp.success && resp.data ? resp.data : resp;
      setPromotions(prev => prev.map(p => ((p._id||p.id) === (updated._id||updated.id) ? updated : p)));
      notification.success({ message: 'Cập nhật trạng thái thành công' });
    } catch (err) {
      console.error(err);
      notification.error({ message: 'Cập nhật trạng thái thất bại' });
    }
  };

  const onFinish = async (values) => {
    const payload = {
      code: values.code,
      description: values.description,
      discountType: values.discountType,
      discountValue: values.discountValue,
      maxDiscount: values.maxDiscount,
      minOrderAmount: values.minOrderAmount,
      usageLimit: values.usageLimit,
    validFrom: values.dateRange && values.dateRange[0] ? values.dateRange[0].toISOString() : null,
    validUntil: values.dateRange && values.dateRange[1] ? values.dateRange[1].toISOString() : null,
      applicableServices: values.applicableServices || [],
      applicableAreas: values.applicableAreas || [],
      status: values.status || 'Active'
    };

    try {
      if (editing) {
        const id = editing._id || editing.id;
        const resp = await adminPromotionService.updatePromotion(id, payload);
        const updated = resp && resp.success && resp.data ? resp.data : resp;
        setPromotions(prev => prev.map(p => ((p._id||p.id) === (updated._id||updated.id) ? updated : p)));
        notification.success({ message: 'Cập nhật khuyến mãi thành công' });
      } else {
        const resp = await adminPromotionService.createPromotion(payload);
        const created = resp && resp.success && resp.data ? resp.data : resp;
        setPromotions(prev => [ { ...created, key: created._id || created.id }, ...prev ]);
        notification.success({ message: 'Tạo khuyến mãi thành công' });
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      console.error(err);
      notification.error({ message: 'Lưu khuyến mãi thất bại' });
    }
  };

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      render: code => <Text strong>{code}</Text>
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      // Limit visible description to 1 line with ellipsis; show full text on tooltip
      render: d => (
        <div style={{ maxWidth: 420 }}>
          <Text ellipsis={{ tooltip: d, rows: 1 }}>{d}</Text>
        </div>
      )
    },
    {
      title: 'Chiết khấu',
      key: 'discount',
      render: (_, r) => (
        <Text>{r.discountType === 'Percentage' ? `${r.discountValue || 0}%` : `${new Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'}).format(r.discountValue || 0)}`}</Text>
      )
    },
    {
      title: 'Thời gian',
      dataIndex: 'validFrom',
      key: 'time',
      render: (_, r) => (
        <div>
          <div>{r.validFrom ? dayjs(r.validFrom).format('DD/MM/YYYY') : '-'}</div>
          <div style={{ color: 'rgba(0,0,0,0.45)' }}>{r.validUntil ? dayjs(r.validUntil).format('DD/MM/YYYY') : '-'}</div>
        </div>
      )
    },
    {
      title: 'Sử dụng',
      dataIndex: 'usageCount',
      key: 'usageCount',
      render: u => <Text>{u || 0}</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: s => {
        // Map backend status values to Vietnamese labels
        const labelMap = {
          Active: 'Hoạt động',
          Inactive: 'Tạm dừng',
          Expired: 'Hết hạn'
        };
        // New color mapping: Active = green, Inactive = orange, Expired = red
        const color = s === 'Active' ? 'green' : (s === 'Inactive' ? 'orange' : (s === 'Expired' ? 'red' : 'default'));
        const label = labelMap[s] || s;
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, r) => (
        <Space>
          <Tooltip title="Sửa"><Button className="action-btn" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          {
            (() => {
              const isExpired = r.status === 'Expired';
              const tip = isExpired ? 'Mã đã hết hạn - không thể bật/tắt' : (r.status === 'Active' ? 'Tắt kích hoạt' : 'Kích hoạt');
              return (
                <Tooltip title={tip}>
                  <Button className="action-btn" size="small" onClick={() => handleToggleActive(r)} disabled={isExpired}>{r.status === 'Active' ? 'Tắt' : 'Bật'}</Button>
                </Tooltip>
              );
            })()
          }
          <Tooltip title="Xoá"><Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(r._id || r.id)} /></Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý khuyến mãi</Title>
        <Space>
          <Button className="control-btn export-btn" icon={<DownloadOutlined />} onClick={handleExport}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ background: primaryColor, borderColor: primaryColor }}>Tạo khuyến mãi</Button>
        </Space>
      </div>

      <AIPromotionAdvisor />

      <Row gutter={12} style={{ marginBottom: 12 }}>
        <style>{`
          .promo-card { border-radius: 10px; padding: 12px; border: 1px solid rgba(0,0,0,0.04); }
          .promo-inner { display:flex; align-items:center; justify-content:space-between; gap:8px }
          .promo-meta { display:flex; flex-direction:column }
          .promo-label { font-size:12px; color: rgba(0,0,0,0.6); }
          .promo-number { font-size:18px; font-weight:700; color: rgba(0,0,0,0.9); }
          .promo-desc { font-size:12px; color: rgba(0,0,0,0.45); }
          .promo-icon { width:44px; height:44px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; }

          /* Button hover/focus styles for requested controls: white background, green text and green border on hover/focus.
             Use AntD-specific selectors and !important to override default theme/focus rings. */
          .control-btn.ant-btn, .action-btn.ant-btn { background: #fff; color: rgba(0,0,0,0.85); border-color: transparent; transition: all 0.14s ease; }
          .control-btn .anticon, .action-btn .anticon { color: inherit; }
          .control-btn.ant-btn:hover, .control-btn.ant-btn:focus, .control-btn.ant-btn:active,
          .action-btn.ant-btn:hover, .action-btn.ant-btn:focus, .action-btn.ant-btn:active {
            background: #fff !important;
            color: #44624A !important;
            border: 1px solid #44624A !important;
            box-shadow: none !important;
            outline: none !important;
          }
          /* ensure focus-visible (keyboard) doesn't show blue ring */
          .control-btn.ant-btn:focus-visible, .action-btn.ant-btn:focus-visible {
            box-shadow: none !important;
            outline: none !important;
          }

          /* Plan B palette: distinct card bg tints + stronger icon gradients */
          /* Card backgrounds (soft tints) */
          .card-total { background: #eef7ff; border: none; }
          .card-active { background: #eef6ee; border: none; }
          .card-inactive { background: #fbfbfb; border: none; }
          .card-expired { background: #fff6f2; border: none; }

          /* Icon backgrounds: stronger, saturated gradients (keep card bg soft) */
          /* Total: saturated blue-teal */
          .card-total .promo-icon { background: linear-gradient(180deg,#2f80ed,#1c6ed6); color:#fff }
          /* Active: saturated primary-based green */
          .card-active .promo-icon { background: linear-gradient(180deg,#2e7d32,#44624A); color:#fff }
          /* Inactive: medium gray gradient for contrast */
          .card-inactive .promo-icon { background: linear-gradient(180deg,#808080,#616161); color:#fff }
          /* Expired: warm strong coral/red */
          .card-expired .promo-icon { background: linear-gradient(180deg,#ff7043,#d84315); color:#fff }

          /* Number color overrides to match icon tones and ensure contrast */
          .card-total .promo-number { color: #0b60b7; }
          .card-active .promo-number { color: #2f6b3e; }
          .card-inactive .promo-number { color: #424242; }
          .card-expired .promo-number { color: #b71c1c; }
        `}</style>

        <Col span={6}>
          <Card className="promo-card card-total">
            <div className="promo-inner">
              <div className="promo-meta">
                <div className="promo-label">Tổng khuyến mãi</div>
                <div style={{ marginTop: 8 }} className="promo-number">{stats.total}</div>
                <div style={{ marginTop: 8 }} className="promo-desc">Tổng số mã hiện có</div>
              </div>
              <div className="promo-icon"><TagOutlined style={{ fontSize: 16 }} /></div>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="promo-card card-active">
            <div className="promo-inner">
              <div className="promo-meta">
                <div className="promo-label">Đang hoạt động</div>
                <div style={{ marginTop: 8 }} className="promo-number" >{stats.active}</div>
                <div style={{ marginTop: 8 }} className="promo-desc">Số mã kích hoạt</div>
              </div>
              <div className="promo-icon"><CheckCircleOutlined style={{ fontSize: 16 }} /></div>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="promo-card card-inactive">
            <div className="promo-inner">
              <div className="promo-meta">
                <div className="promo-label">Đang tắt</div>
                <div style={{ marginTop: 8 }} className="promo-number">{stats.inactive}</div>
                <div style={{ marginTop: 8 }} className="promo-desc">Số mã tạm dừng</div>
              </div>
              <div className="promo-icon"><PauseCircleOutlined style={{ fontSize: 16 }} /></div>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="promo-card card-expired">
            <div className="promo-inner">
              <div className="promo-meta">
                <div className="promo-label">Hết hạn</div>
                <div className="promo-number" style={{ marginTop: 8 }}>{stats.expired}</div>
                <div style={{ marginTop: 8 }} className="promo-desc">Số mã đã hết hạn</div>
              </div>
              <div className="promo-icon"><ExclamationCircleOutlined style={{ fontSize: 16 }} /></div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Search & filters - moved to sit above the table for quicker access */}

      <Row gutter={16} style={{ marginBottom: 18 }}>
        <Col span={10}>
          <Card title="Tình trạng mã" style={{ borderRadius: 12 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 220, height: 220, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    {/* Larger, thicker donut for clearer display */}
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={3}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center overlay showing percentage of Active promotions */}
                <div style={{ position: 'absolute', width: 110, height: 110, borderRadius: 55, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {(() => {
                    const total = pieData.reduce((s, d) => s + (d.value || 0), 0);
                    const active = pieData.find(d => d.key === 'Active')?.value || 0;
                    const pct = total ? Math.round((active / total) * 100) : 0;
                    return (
                      <>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: 600 }}>Hoạt động</div>
                        <div style={{ fontSize: 22, color: '#2f6b3e', fontWeight: 800, marginTop: 4 }}>{pct}%</div>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 2 }}>{active}/{total}</div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 120 }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pieData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 6, display: 'inline-block', background: palette[i % palette.length] }} />
                      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.8)' }}>{d.name} <span style={{ color: 'rgba(0,0,0,0.45)' }}>({d.value})</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={14}>
          <Card title="Top mã được sử dụng" style={{ borderRadius: 12 }}>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={usageData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="code" />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  {/* Bar uses Vietnamese label and lighter green fill */}
                  <Bar name="Số lượt sử dụng" dataKey="usage" fill="#7FA68A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

            {/* Move search controls here so they appear immediately above the table */}
            <Card style={{ margin: '0 0 18px 0' }}>
              <Row gutter={12} align="middle">
                <Col flex="320px">
                  <Input
                    placeholder="Tìm kiếm theo mã hoặc mô tả"
                    prefix={<SearchOutlined />}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    allowClear
                  />
                </Col>
                <Col>
                  <Select value={statusFilter} onChange={v => setStatusFilter(v)} style={{ width: 140 }}>
                    <Option value="All">Tất cả</Option>
                    <Option value="Active">Hoạt động</Option>
                    <Option value="Inactive">Tạm dừng</Option>
                    <Option value="Expired">Hết hạn</Option>
                  </Select>
                </Col>
                <Col>
                  <RangePicker onChange={vals => setDateRange(vals)} />
                </Col>
                <Col flex="auto" />
                <Col>
                  <Space>
                    <Button className="control-btn filter-btn" icon={<FilterOutlined />} onClick={() => setAdvancedVisible(true)}>Bộ lọc nâng cao</Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Advanced filter modal */}
            <Modal title="Bộ lọc nâng cao" open={advancedVisible} onCancel={() => setAdvancedVisible(false)} footer={null} width={640}>
              <Form layout="vertical" form={advForm} id="adv-filter-form" initialValues={advancedFilters} onFinish={(vals) => {
                // normalize and store advanced filters
                setAdvancedFilters(vals);
                setAdvancedVisible(false);
              }}>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item label="Loại giảm giá" name="discountType">
                      <Select allowClear>
                        <Option value="Percentage">% (Phần trăm)</Option>
                        <Option value="FixedAmount">Số tiền</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Min giảm tối thiểu" name="minDiscount">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Max giảm tối đa" name="maxDiscount">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item label="Sử dụng tối thiểu" name="usageMin">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Sử dụng tối đa" name="usageMax">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Khu vực" name="applicableArea">
                      <Select mode="tags" placeholder="Nhập khu vực..." />
                    </Form.Item>
                  </Col>
                </Row>

                <Row justify="end">
                  <Space>
                    <Button onClick={() => { setAdvancedFilters({}); setAdvancedVisible(false); applyFilters(); }}>Huỷ</Button>
                    <Button type="primary" onClick={() => advForm.submit()}>Áp dụng</Button>
                  </Space>
                </Row>
              </Form>
            </Modal>

            <Card>
              <Table
                columns={columns}
                dataSource={filtered}
                loading={loading}
                rowKey={r => r._id || r.id}
                pagination={{ pageSize: 5, showSizeChanger: false }}
              />
            </Card>

      <Modal title={editing ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={800}>
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Mã (code)" name="code" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
                <Input placeholder="VD: SPRING2026" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Trạng thái" name="status" initialValue="Active">
                {/* Disable changing status when editing an existing promotion; use table action to toggle. */}
                <Select disabled={!!editing}>
                  <Option value="Active">Active</Option>
                  <Option value="Inactive">Inactive</Option>
                  <Option value="Expired">Expired</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Loại giảm giá" name="discountType" rules={[{ required: true }]}>
                <Select>
                  <Option value="Percentage">Phần trăm</Option>
                  <Option value="FixedAmount">Số tiền cố định</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Giá trị" name="discountValue" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Giới hạn tối đa" name="maxDiscount">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Giá trị tối thiểu đơn hàng" name="minOrderAmount">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Giới hạn sử dụng" name="usageLimit">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Khu vực áp dụng" name="applicableAreas">
                <Select mode="tags" placeholder="Nhập khu vực..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Ngày bắt đầu / kết thúc" name="dateRange">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12} style={{ display: 'flex', alignItems: 'end', justifyContent: 'flex-end' }}>
              <Space>
                <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Hủy</Button>
                <Button type="primary" htmlType="submit" style={{ background: primaryColor, borderColor: primaryColor }}>Lưu</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default PromotionManagement;
