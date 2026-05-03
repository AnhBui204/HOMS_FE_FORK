import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Typography, Tabs, Button, Select, Space, notification, Modal, Descriptions, Tag, Divider, Row, Col, Input, DatePicker, Popover, Checkbox, Tooltip, Switch } from 'antd';
import { FileTextOutlined, EyeOutlined, CheckCircleOutlined, DownloadOutlined, SearchOutlined, FilterOutlined, ClockCircleOutlined, ProfileOutlined, ReloadOutlined, BulbOutlined, CloseOutlined } from '@ant-design/icons';
import adminContractService from '../../../services/adminContractService';
import adminAiService from '../../../services/adminAiService';
import ContractModal from './ContractModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
// Match InvoiceManagement primary color so buttons look identical
const primaryColor = '#44624A';

const ContractManagement = () => {
    const [loading, setLoading] = useState(false);
    const [allContracts, setAllContracts] = useState([]); // original from server
    const [contracts, setContracts] = useState([]); // displayed (after local filters)
    const [templates, setTemplates] = useState([]);

    // prevent duplicate notifications when effects run twice (e.g. React StrictMode in dev)
    const notifiedCountRef = useRef(null);

    // search / filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [statusFilters, setStatusFilters] = useState([]);
    const [dateRange, setDateRange] = useState([null, null]);

    // Modal state (contract detail shown in separate component)
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedContractId, setSelectedContractId] = useState(null);
    // Template modal state (view / edit)
    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [templateModalMode, setTemplateModalMode] = useState('view'); // 'view' | 'edit'
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [editedTemplate, setEditedTemplate] = useState(null);
    const [savingTemplate, setSavingTemplate] = useState(false);

    // AI Contract Template Generating state
    const [aiGenModalVisible, setAiGenModalVisible] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [generatingAiContent, setGeneratingAiContent] = useState(false);

    const fetchData = async (opts = {}) => {
        setLoading(true);
        try {
            // Use raw response so we can inspect status/data in console for debugging
            // If search by contract number, pass as query param so BE can use regex search
            const params = {};
            if (opts.contractNumber) params.contractNumber = opts.contractNumber;
            const contractsResp = await adminContractService.getContractsRaw(params);
            console.debug('GET /admin/contracts response:', contractsResp);
            const resp = contractsResp?.data;

            // New standardized shape: { success: true, data: [...], meta? }
            if (resp && resp.success && Array.isArray(resp.data)) {
                setAllContracts(resp.data);
                // apply client-side filters after fetching
                const initial = resp.data.slice();
                setContracts(applyLocalFilters(initial, { query: searchQuery, sortOrder, statusFilters, dateRange }));
                // Show notification only if count changed since last notify (avoids duplicate in StrictMode)
                if (notifiedCountRef.current !== resp.data.length) {
                    notifiedCountRef.current = resp.data.length;
                    notification.info({ message: `Đã tải ${resp.data.length} hợp đồng.`, duration: 2 });
                }
            } else {
                console.warn('Unexpected contracts response shape:', resp);
                setContracts([]);
                notification.warn({ message: 'Dữ liệu hợp đồng nhận về không đúng định dạng.' });
            }
        } catch (err) {
            console.error('Error fetching contracts', err);
            // Axios interceptor already shows notifications for errors; add extra info here.
            notification.error({ message: 'Không tải được danh sách hợp đồng từ server. Kiểm tra console/network.' });
            setContracts([]);
        }

        try {
            const templatesResp = await adminContractService.getTemplates();
            console.debug('GET /admin/contracts/templates response:', templatesResp);
            // templatesResp may be either an array (old) or { success, data }
            if (templatesResp && templatesResp.success && Array.isArray(templatesResp.data)) {
                setTemplates(templatesResp.data);
            } else if (Array.isArray(templatesResp)) {
                setTemplates(templatesResp);
            } else {
                setTemplates([]);
            }
        } catch (err) {
            console.error('Error fetching templates', err);
            notification.error({ message: 'Không tải được mẫu hợp đồng từ server.' });
            setTemplates([]);
        }

        setLoading(false);
    };
    // auto-load data on mount
    useEffect(() => {
        // initial fetch (no contractNumber param)
        fetchData();
    }, []);

    // Helper: apply client-side filters and sorting to an array of contracts
    const applyLocalFilters = (list, { query, sortOrder, statusFilters, dateRange }) => {
        let out = Array.isArray(list) ? list.slice() : [];
        if (query && typeof query === 'string' && query.trim()) {
            const q = query.trim().toLowerCase();
            out = out.filter(c => (c.contractNumber || '').toLowerCase().includes(q) || (c.customerId?.fullName || '').toLowerCase().includes(q));
        }
        if (statusFilters && statusFilters.length) {
            out = out.filter(c => statusFilters.includes((c.status || '').toString()));
        }
        if (dateRange && dateRange[0] && dateRange[1]) {
            const start = dateRange[0].startOf('day').toDate();
            const end = dateRange[1].endOf('day').toDate();
            out = out.filter(c => {
                const d = c.createdAt ? new Date(c.createdAt) : null;
                return d && d >= start && d <= end;
            });
        }
        out.sort((a, b) => {
            const da = a.createdAt ? new Date(a.createdAt) : 0;
            const db = b.createdAt ? new Date(b.createdAt) : 0;
            return sortOrder === 'newest' ? db - da : da - db;
        });
        return out;
    };

    // When local filter controls change, recompute displayed contracts
    useEffect(() => {
        setContracts(applyLocalFilters(allContracts, { query: searchQuery, sortOrder, statusFilters, dateRange }));
    }, [searchQuery, sortOrder, statusFilters, dateRange, allContracts]);

    const viewContractDetails = (contract) => {
        // Open modal and let ContractModal fetch details by id
        setSelectedContractId(contract._id || contract.id || contract._id);
        setModalVisible(true);
    };
    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const contractColumns = [
        {
            title: 'Mã hợp đồng',
            dataIndex: 'contractNumber',
            key: 'contractNumber',
            render: text => <strong>{text}</strong>
        },
        {
            title: 'Khách hàng',
            dataIndex: ['customerId', 'fullName'],
            key: 'customer',
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: date => date ? dayjs(date).format('DD/MM/YYYY') : '-'
        },
        // Contract model does not include totalValue by default; omit or map if available
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: status => {
                // normalize to uppercase to match BE enums
                const sRaw = (typeof status === 'string') ? status : (status && (status.name || status.status || String(status))) || '';
                const s = sRaw.toString();
                const upper = s.toUpperCase();
                // per-status color map (Ant Design preset colors)
                const statusColorMap = {
                    DRAFT: 'default',      // gray
                    SENT: 'processing',    // blue
                    SIGNED: 'success',     // green
                    CANCELLED: 'error',    // red
                    EXPIRED: 'warning',    // orange
                    PENDING: 'processing', // blue
                    REJECTED: 'error',     // red
                    APPROVED: 'success',   // green
                    VOID: 'default',       // gray
                    ACTIVE: 'success',
                    INACTIVE: 'default'
                };
                const color = statusColorMap[upper] || 'default';
                // map English status codes to Vietnamese labels
                const statusMap = {
                    DRAFT: 'Bản nháp',
                    SENT: 'Đã gửi',
                    SIGNED: 'Đã ký',
                    CANCELLED: 'Đã hủy',
                    EXPIRED: 'Hết hạn',
                    PENDING: 'Đang chờ',
                    REJECTED: 'Bị từ chối',
                    APPROVED: 'Đã duyệt',
                    VOID: 'Vô hiệu',
                    ACTIVE: 'Hoạt động',
                    INACTIVE: 'Không hoạt động'
                };
                const label = statusMap[upper] || s;
                return <Tag color={color}>{label}</Tag>;
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        className="btn-outline-primary"
                        size="small"
                        onClick={() => viewContractDetails(record)}
                    >
                        Xem
                    </Button>
                    <Button className="btn-download" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)} />
                </Space>
            )
        }
    ];

    // Filter popover content
    const { RangePicker } = DatePicker;
    const filterContent = (
        <div style={{ width: 320 }}>
            <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Trạng thái</label>
                <Checkbox.Group
                    value={statusFilters}
                    onChange={(vals) => setStatusFilters(vals)}
                    options={[
                        { label: 'Bản nháp', value: 'DRAFT' },
                        { label: 'Đã gửi', value: 'SENT' },
                        { label: 'Đã ký', value: 'SIGNED' },
                        { label: 'Đã hủy', value: 'CANCELLED' }
                    ]}
                />
            </div>
            <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Khoảng thời gian</label>
                <RangePicker value={dateRange} onChange={(vals) => setDateRange(vals)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button size="small" onClick={() => { setStatusFilters([]); setDateRange([null, null]); }}>Đặt lại</Button>
                <Button type="primary" size="small" onClick={() => { /* popover will close automatically */ }}>Áp dụng</Button>
            </div>
        </div>
    );

    const handleDownload = async (record) => {
        try {
            // Prefer PDF download (backend returns PDF from the docx endpoint for compatibility)
            const resp = await adminContractService.downloadContractDocx(record._id || record.id);
            // use content-type from response (should be application/pdf) and fallback to pdf
            const blob = new Blob([resp.data], { type: resp.headers['content-type'] || 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            let filename = (record.contractNumber || 'contract') + '.pdf';
            const disp = resp.headers['content-disposition'] || resp.headers['Content-Disposition'];
            if (disp) {
                const m = /filename="?([^";]+)"?/.exec(disp);
                if (m && m[1]) filename = m[1];
            }
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            notification.success({ message: 'Bắt đầu tải xuống (pdf)' });
        } catch (err) {
            console.error('Download failed', err);
            notification.error({ message: 'Tải xuống thất bại' });
        }
    };

    const templateColumns = [
        { title: 'Tiêu đề', dataIndex: 'name', key: 'name' },
        { title: 'Phiên bản', dataIndex: 'version', key: 'version', render: v => <Tag color="blue">v{v}</Tag> },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            render: isActive => <Tag color={isActive ? 'success' : 'default'}>{isActive ? 'Hoạt động' : 'Lưu trữ'}</Tag>
        },
        { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', render: d => dayjs(d).format('DD/MM/YYYY') },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, tpl) => (
                <Space>
                    <Button className="btn-outline-primary" size="small" onClick={() => openTemplateModal(tpl, 'view')}>Xem</Button>
                    <Button className="btn-outline-primary" size="small" onClick={() => openTemplateModal(tpl, 'edit')}>Chỉnh sửa</Button>
                    <Tooltip title={tpl.isActive ? 'Tắt kích hoạt' : 'Kích hoạt'}>
                        <Switch
                            className="tpl-switch"
                            checked={!!tpl.isActive}
                            onChange={(checked) => checked ? handleActivateTemplate(tpl) : showDeactivateConfirm(tpl)}
                            checkedChildren={<CheckCircleOutlined />}
                            unCheckedChildren={<CloseOutlined />}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    const handleActivateTemplate = async (tpl) => {
        if (!tpl || !tpl._id) return;
        try {
            setLoading(true);
            const res = await adminContractService.activateTemplate(tpl._id);
            // server returns the activated template; refresh local templates list
            if (res && res.success && res.data) {
                // set all to inactive then put activated at top
                setTemplates(prev => prev.map(t => ({ ...t, isActive: t._id === res.data._id })));
                notification.success({ message: 'Mẫu hợp đồng đã được kích hoạt' });
            } else if (res && Array.isArray(res)) {
                // unexpected shape; refetch
                await fetchData();
            } else {
                await fetchData();
            }
        } catch (err) {
            console.error('Activate template failed', err);
            notification.error({ message: 'Kích hoạt mẫu hợp đồng thất bại' });
        } finally {
            setLoading(false);
        }
    };

    // Confirm modal state for deactivation
    const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
    const [pendingDeactivateTpl, setPendingDeactivateTpl] = useState(null);

    const showDeactivateConfirm = (tpl) => {
        setPendingDeactivateTpl(tpl);
        setDeactivateModalVisible(true);
    };

    const cancelDeactivate = () => {
        setPendingDeactivateTpl(null);
        setDeactivateModalVisible(false);
    };

    const confirmDeactivate = async () => {
        const tpl = pendingDeactivateTpl;
        setDeactivateModalVisible(false);
        setPendingDeactivateTpl(null);
        if (!tpl || !tpl._id) return;
        try {
            setLoading(true);
            const res = await adminContractService.deactivateTemplate(tpl._id);
            if (res && res.success && res.data) {
                setTemplates(prev => prev.map(t => t._id === res.data._id ? { ...t, isActive: false } : t));
                notification.success({ message: 'Mẫu hợp đồng đã bị tắt kích hoạt' });
            } else {
                await fetchData();
            }
        } catch (err) {
            console.error('Deactivate template failed', err);
            notification.error({ message: 'Tắt kích hoạt mẫu hợp đồng thất bại' });
        } finally {
            setLoading(false);
        }
    };

    // Use explicit TabPane children instead of the `items` prop to avoid issues
    // with certain Ant Design versions that may process labels unexpectedly.

    // --- Template drawer handlers ---
    const openTemplateModal = (tpl, mode = 'view') => {
        setSelectedTemplate(tpl);
        setTemplateModalMode(mode);
        setEditedTemplate(mode === 'edit' ? { ...tpl } : null);
        setTemplateModalVisible(true);
    };
    const closeTemplateModal = () => {
        setTemplateModalVisible(false);
        setSelectedTemplate(null);
        setEditedTemplate(null);
    };

    // Convert uploaded signature file to base64 and store in editedTemplate.adminSignature.signatureImage
    const handleTemplateSignatureFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            setEditedTemplate(prev => ({
                ...prev,
                adminSignature: {
                    ...(prev?.adminSignature || {}),
                    signatureImage: dataUrl,
                    signatureImageThumb: dataUrl
                }
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleTemplateSave = async () => {
        if (!editedTemplate) return;
        setSavingTemplate(true);
        try {
            const templateId = editedTemplate._id || editedTemplate.id;
            let updated;

            if (templateId) {
                // UPDATE existing template
                const resp = await adminContractService.updateTemplate(templateId, editedTemplate);
                updated = resp && resp.success && resp.data ? resp.data : resp;

                setTemplates(prev => prev.map(t =>
                    (t._id === (updated._id || updated.id) || t.id === (updated._id || updated.id)) ? updated : t
                ));
                notification.success({ message: 'Cập nhật mẫu hợp đồng thành công' });
            } else {
                // CREATE new template (e.g. from AI generation)
                const resp = await adminContractService.createTemplate(editedTemplate);
                updated = resp && resp.success && resp.data ? resp.data : resp;

                setTemplates(prev => [updated, ...prev]);
                notification.success({ message: 'Lưu mẫu hợp đồng mới thành công' });
            }

            setTemplateModalMode('view');
            setSelectedTemplate(updated);
            setEditedTemplate(null);
        } catch (err) {
            console.error('Failed to save template', err);
            notification.error({ message: 'Lưu mẫu thất bại. Vui lòng kiểm tra lại dữ liệu.' });
        } finally {
            setSavingTemplate(false);
        }
    };

    const handleAiGenerateTemplate = async () => {
        if (!aiPrompt.trim()) {
            notification.warning({ message: 'Vui lòng nhập mô tả cho mẫu hợp đồng.' });
            return;
        }
        setGeneratingAiContent(true);
        try {
            const resp = await adminAiService.generateTemplateContent(aiPrompt);
            if (resp.success) {
                // Open creation modal with AI content
                const newTpl = {
                    name: `Mẫu AI: ${aiPrompt.substring(0, 30)}...`,
                    version: '1.0',
                    isActive: false,
                    content: resp.data
                };
                setSelectedTemplate(newTpl);
                setEditedTemplate(newTpl);
                setTemplateModalMode('edit');
                setAiGenModalVisible(false);
                setTemplateModalVisible(true);
                setAiPrompt('');
                notification.success({ message: 'Đã tạo nội dung bằng AI! Vui lòng kiểm tra và chỉnh sửa lại.' });
            }
        } catch (err) {
            console.error('AI generation failed', err);
            notification.error({ message: 'Không thể tạo mẫu bằng AI.' });
        } finally {
            setGeneratingAiContent(false);
        }
    };


    // Summary stats for cards
    const totalCount = allContracts.length;
    const signedCount = allContracts.filter(c => (c.status || '').toString().toUpperCase() === 'SIGNED').length;
    const sentCount = allContracts.filter(c => (c.status || '').toString().toUpperCase() === 'SENT').length;
    const draftCount = allContracts.filter(c => (c.status || '').toString().toUpperCase() === 'DRAFT').length;

    return (
        <div style={{ textAlign: 'left' }}>
            {/* Local styles to ensure btn-outline-primary matches InvoiceManagement */}
            <style>{`
                .btn-outline-primary { background: #fff; color: ${primaryColor}; border: 1px solid ${primaryColor}; box-shadow: none; }
                .btn-outline-primary:hover, .btn-outline-primary:focus { background: ${primaryColor} !important; color: #fff !important; border-color: ${primaryColor} !important; }
                .btn-outline-primary[disabled], .btn-outline-primary[aria-disabled="true"] { opacity: 0.6; cursor: not-allowed; }
                /* Download icon button: on hover behave like btn-outline-primary (fill with primary color and white icon) */
                .btn-download { background: transparent; border: 1px solid transparent; color: rgba(0,0,0,0.85); padding: 4px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; }
                /* Default hover: show primary border + primary text (for outline look) */
                .btn-download:hover, .btn-download:focus { border-color: ${primaryColor}; color: ${primaryColor}; }
                /* But when we want the exact btn-outline-primary behavior (filled primary on hover), match it with higher specificity to override Ant defaults */
                .btn-download.ant-btn:hover, .btn-download.ant-btn:focus, .btn-download:hover, .btn-download:focus { background: ${primaryColor} !important; color: #fff !important; border-color: ${primaryColor} !important; }
                /* Ensure Ant icons inherit color and svg paths use currentColor; use !important to override theme rules */
                .btn-download .anticon, .btn-download .anticon svg, .btn-download .anticon svg path { color: inherit !important; fill: currentColor !important; stroke: currentColor !important; }
                /* Search and filter accents */
                .contract-search .ant-input-affix-wrapper { border-color: ${primaryColor}; }
                .contract-search .ant-input-prefix { color: ${primaryColor}; }
                .contract-search .ant-input { color: rgba(0,0,0,0.85); }
                .contract-sort-select .ant-select-selector { border-color: ${primaryColor}; }
                .contract-sort-select.ant-select-focused .ant-select-selector, .contract-sort-select .ant-select-selector:hover { border-color: ${primaryColor}; box-shadow: 0 0 0 2px rgba(68,98,74,0.06); }
                /* Default: white background, primary border and text (outline look) */
                .btn-filter { background: #fff; border: 1px solid ${primaryColor}; color: ${primaryColor}; padding: 6px 10px; border-radius: 6px; }
                /* Hover/focus: fill with primary and make text/icon white */
                .btn-filter:hover, .btn-filter:focus, .btn-filter.ant-btn:hover, .btn-filter.ant-btn:focus { border-color: ${primaryColor}; background: ${primaryColor} !important; color: #fff !important; }
                .btn-filter .anticon, .btn-filter .anticon svg, .btn-filter .anticon svg path { color: inherit !important; fill: currentColor !important; stroke: currentColor !important; }
                /* Tabs: make active tab text and ink-bar use primary color */
                .contract-tabs .ant-tabs-nav .ant-tabs-tab-btn { color: rgba(0,0,0,0.65); }
                .contract-tabs .ant-tabs-nav .ant-tabs-tab:hover .ant-tabs-tab-btn { color: ${primaryColor}; }
                .contract-tabs .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: ${primaryColor}; font-weight: 600; }
                .contract-tabs .ant-tabs-nav .ant-tabs-ink-bar { background: ${primaryColor} !important; height: 3px; }
                /* Summary cards gentle background tints */
                .summary-card { border-radius: 12px; border: 1px solid rgba(0,0,0,0.04); transition: transform 180ms ease, box-shadow 180ms ease; overflow: hidden; }
                .summary-card:hover { transform: translateY(-6px); box-shadow: 0 10px 30px rgba(34,40,49,0.06); }
                .summary-card-inner { display:flex; align-items:center; gap:16px; padding:18px; }
                .summary-icon { width:52px; height:52px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; }
                .summary-icon svg { font-size:20px; }
                .summary-meta { display:flex; flex-direction:column; }
                .summary-label { font-size:13px; color: rgba(0,0,0,0.45); margin-bottom:6px; }
                .summary-number { font-size:20px; font-weight:700; color: rgba(0,0,0,0.9); }
                .summary-card-blue { background: linear-gradient(180deg,#f8fbff 0%, #f3f8ff 100%); }
                .summary-card-green { background: linear-gradient(180deg,#f8fff9 0%, #f5fbf6 100%); }
                .summary-card-yellow { background: linear-gradient(180deg,#fffdf7 0%, #fffaf0 100%); }
                .summary-card-pink { background: linear-gradient(180deg,#fff8fb 0%, #fff5f8 100%); }
                .summary-icon-blue { background: rgba(24,144,255,0.12); color: #1890ff; }
                .summary-icon-green { background: rgba(82,196,26,0.08); color: #52c41a; }
                .summary-icon-yellow { background: rgba(250,173,20,0.08); color: #faad14; }
                .summary-icon-pink { background: rgba(235,47,150,0.06); color: #eb2f96; }
                /* Template content styling for readable contract preview */
                .template-content { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #f0f0f0; font-size: 14px; line-height: 1.7; color: rgba(0,0,0,0.85); text-align: justify; word-wrap: break-word; word-break: break-word; overflow-x: hidden; }
                .template-content h1, .template-content h2, .template-content h3 { text-align: center; margin: 8px 0 12px; }
                .template-content p { margin: 8px 0; }
                .template-content strong { font-weight: 700; }
                .template-content img { max-width: 100%; height: auto; display: block; margin: 8px auto; }
                .template-content .contract-title { text-align: center; font-weight: 800; font-size: 18px; margin-bottom: 8px; }
            `}</style>
            <style>{`
                .tpl-toggle { border-radius: 16px; width: 36px; height: 28px; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
                .tpl-toggle .anticon { font-size: 14px; }
                .btn-activate { background: #e6f4ea; border: 1px solid #2eb34a; color: #2eb34a; }
                .btn-activate:hover, .btn-activate:focus { background: #2eb34a !important; color: #fff !important; }
                .btn-deactivate { background: #fff7f7; border: 1px solid #ff7875; color: #ff4d4f; }
                .btn-deactivate:hover, .btn-deactivate:focus { background: #ff4d4f !important; color: #fff !important; }
                /* Switch styling to use exact requested colors and correct selectors */
                .tpl-switch { width: 56px; height: 28px; padding: 0; }
                /* OFF: track background #ffd8d6, accent color #ff4d4f */
                .ant-switch.tpl-switch { background-color: #ffd8d6 !important; border: 1px solid #ff4d4f !important; }
                .ant-switch.tpl-switch .ant-switch-inner { color: #ff4d4f; }
                /* ON: track filled with #2D4F36, and slightly lighter shade as subtle gradient */
                .ant-switch.tpl-switch.ant-switch-checked { background: linear-gradient(180deg, #375f4a 0%, #2D4F36 100%) !important; border-color: #2D4F36 !important; }
                .ant-switch.tpl-switch.ant-switch-checked .ant-switch-inner { color: #ffffff !important; }
                /* handle size and transitions */
                .ant-switch.tpl-switch .ant-switch-handle { width: 18px; height: 18px; top: 5px; transition: left 180ms cubic-bezier(.22,.9,.36,1), background 120ms; }
                .ant-switch.tpl-switch { transition: background-color 180ms cubic-bezier(.22,.9,.36,1), box-shadow 200ms; }
            `}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý hợp đồng</Title>
                {/* Intentionally keep right side empty so controls appear below the summary cards */}
                <div />
            </div>

            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card className="summary-card summary-card-blue">
                        <div className="summary-card-inner">
                            <div className="summary-icon summary-icon-blue"><FileTextOutlined /></div>
                            <div className="summary-meta">
                                <div className="summary-label">Tổng hợp đồng</div>
                                <div className="summary-number">{totalCount}</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="summary-card summary-card-green">
                        <div className="summary-card-inner">
                            <div className="summary-icon summary-icon-green"><CheckCircleOutlined /></div>
                            <div className="summary-meta">
                                <div className="summary-label">Đã ký</div>
                                <div className="summary-number">{signedCount}</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="summary-card summary-card-yellow">
                        <div className="summary-card-inner">
                            <div className="summary-icon summary-icon-yellow"><ClockCircleOutlined /></div>
                            <div className="summary-meta">
                                <div className="summary-label">Đã gửi</div>
                                <div className="summary-number">{sentCount}</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="summary-card summary-card-pink">
                        <div className="summary-card-inner">
                            <div className="summary-icon summary-icon-pink"><ProfileOutlined /></div>
                            <div className="summary-meta">
                                <div className="summary-label">Bản nháp</div>
                                <div className="summary-number">{draftCount}</div>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Search and filter controls - placed below the summary cards and above the table */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                <Input
                    className="contract-search"
                    placeholder="Tìm kiếm theo mã hoặc tên khách hàng"
                    prefix={<SearchOutlined />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: 320 }}
                    allowClear
                />
                <Select className="contract-sort-select" value={sortOrder} onChange={v => setSortOrder(v)} style={{ width: 140 }}>
                    <Select.Option value="newest">Mới nhất</Select.Option>
                    <Select.Option value="oldest">Cũ nhất</Select.Option>
                </Select>
                <Popover placement="bottomRight" content={filterContent} trigger="click">
                    <Button className="btn-filter" icon={<FilterOutlined />}>Bộ lọc</Button>
                </Popover>
                <Button className="btn-filter" icon={<ReloadOutlined />} onClick={() => fetchData()}>Tải lại</Button>
            </div>

            <Card style={{ borderRadius: '12px', border: 'none' }}>
                <Tabs defaultActiveKey="1" className="contract-tabs">
                    <Tabs.TabPane tab="Hợp đồng" key="1">
                        <Table columns={contractColumns} dataSource={contracts} rowKey="_id" loading={loading} />
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="Mẫu hợp đồng" key="2">
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button
                                type="primary"
                                icon={<BulbOutlined />}
                                onClick={() => setAiGenModalVisible(true)}
                                style={{ background: '#44624A', borderColor: '#44624A', display: 'flex', alignItems: 'center' }}
                            >
                                Tạo mẫu bằng AI
                            </Button>
                        </div>
                        <Table columns={templateColumns} dataSource={templates} rowKey="_id" loading={loading} />
                    </Tabs.TabPane>
                </Tabs>
            </Card>

            {/* Template Drawer (view / edit) */}
            <Modal
                title={templateModalMode === 'edit' ? 'Chỉnh sửa mẫu hợp đồng' : 'Xem mẫu hợp đồng'}
                centered
                width={900}
                onCancel={closeTemplateModal}
                open={templateModalVisible}
                footer={null}
            >
                <div style={{ maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
                    {selectedTemplate ? (
                        templateModalMode === 'view' ? (
                            <div>
                                <Descriptions bordered column={1} size="small" labelStyle={{ width: 160, minWidth: 160, maxWidth: 160, fontWeight: 600 }}>
                                    <Descriptions.Item label="Tên">{selectedTemplate.name || selectedTemplate.title}</Descriptions.Item>
                                    <Descriptions.Item label="Phiên bản">{selectedTemplate.version}</Descriptions.Item>
                                    <Descriptions.Item label="Trạng thái">{selectedTemplate.isActive ? 'Hoạt động' : 'Lưu trữ'}</Descriptions.Item>
                                    <Descriptions.Item label="Ngày tạo">{selectedTemplate.createdAt ? dayjs(selectedTemplate.createdAt).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
                                </Descriptions>
                                <Divider />
                                <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {selectedTemplate.content ? (
                                            <div className="template-content" style={{ padding: 0, overflow: 'hidden' }}>
                                                <iframe
                                                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.7;color:rgba(0,0,0,0.85);text-align:justify;word-wrap:break-word;word-break:break-word;margin:0;padding:16px;}h1,h2,h3{text-align:center;margin:8px 0 12px;}p{margin:8px 0;}strong{font-weight:700;}img{max-width:100%;height:auto;display:block;margin:8px auto;}.contract-title{text-align:center;font-weight:800;font-size:18px;margin-bottom:8px;}table{border-collapse:collapse;width:100%;}table,th,td{border:1px solid black;padding:8px;}</style></head><body>${selectedTemplate.content}</body></html>`}
                                                    style={{ width: '100%', height: '520px', border: 'none', display: 'block' }}
                                                    title="Template Preview"
                                                />
                                            </div>
                                        ) : (
                                            <Text type="secondary">Không có nội dung mẫu để hiển thị.</Text>
                                        )}
                                    </div>
                                    <div style={{ width: 240, minWidth: 240, flexShrink: 0 }}>
                                        <div style={{ marginBottom: 8, fontWeight: 600 }}>Chữ ký quản trị (mẫu)</div>
                                        {selectedTemplate.adminSignature?.signatureImage || selectedTemplate.adminSignature?.signatureImageThumb ? (
                                            <div style={{ border: '1px dashed #eee', padding: 8, borderRadius: 8, textAlign: 'center' }}>
                                                <img src={selectedTemplate.adminSignature.signatureImage || selectedTemplate.adminSignature.signatureImageThumb} alt="admin-sign" style={{ maxWidth: '100%', height: 'auto' }} />
                                                <div style={{ marginTop: 8, fontSize: 12, color: '#555' }}>{selectedTemplate.adminSignature?.signedByName || 'HOMS Vận Chuyển'}</div>
                                            </div>
                                        ) : (
                                            <Text type="secondary">Chưa có chữ ký quản trị trong mẫu này.</Text>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', marginBottom: 6 }}>Tên</label>
                                    <Input value={editedTemplate?.name || editedTemplate?.title || ''} onChange={e => setEditedTemplate(prev => ({ ...prev, name: e.target.value }))} />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', marginBottom: 6 }}>Phiên bản</label>
                                    <Input value={editedTemplate?.version || ''} onChange={e => setEditedTemplate(prev => ({ ...prev, version: e.target.value }))} />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', marginBottom: 6 }}>Trạng thái</label>
                                    <Space>
                                        <Switch checked={!!editedTemplate?.isActive} onChange={v => setEditedTemplate(prev => ({ ...prev, isActive: v }))} />
                                        <Text>{editedTemplate?.isActive ? 'Hoạt động' : 'Lưu trữ'}</Text>
                                    </Space>
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', marginBottom: 6 }}>Nội dung mẫu (HTML)</label>
                                    <Input.TextArea
                                        value={editedTemplate?.content || ''}
                                        onChange={e => setEditedTemplate(prev => ({ ...prev, content: e.target.value }))}
                                        rows={12}
                                        placeholder="Nội dung HTML của mẫu hợp đồng"
                                    />
                                </div>
                                <Divider />
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', marginBottom: 6 }}>Chữ ký quản trị</label>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
                                        <div style={{ width: 180, minWidth: 180, flexShrink: 0, border: '1px dashed #eee', padding: 8, borderRadius: 8, textAlign: 'center' }}>
                                            {editedTemplate?.adminSignature?.signatureImage ? (
                                                <img src={editedTemplate.adminSignature.signatureImage} alt="preview" style={{ maxWidth: '100%', height: 'auto' }} />
                                            ) : (
                                                <Text type="secondary">Chưa có ảnh</Text>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleTemplateSignatureFile(e.target.files && e.target.files[0])}
                                            />
                                            <Input placeholder="Tên người ký" value={editedTemplate?.adminSignature?.signedByName || ''} onChange={e => setEditedTemplate(prev => ({ ...prev, adminSignature: { ...(prev?.adminSignature || {}), signedByName: e.target.value } }))} />
                                            <Button onClick={() => setEditedTemplate(prev => ({ ...prev, adminSignature: {} }))}>Xóa chữ ký</Button>
                                        </div>
                                    </div>
                                </div>
                                <Divider />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    <Button onClick={closeTemplateModal}>Hủy</Button>
                                    <Button type="primary" onClick={handleTemplateSave} loading={savingTemplate}>Lưu</Button>
                                </div>
                            </div>
                        )
                    ) : (
                        <div style={{ textAlign: 'center', padding: 20 }}><Text type="secondary">Không tìm thấy mẫu.</Text></div>
                    )}
                </div>
            </Modal>

            {/* AI Prompt Modal */}
            <Modal
                title={
                    <Space>
                        <BulbOutlined style={{ color: '#44624A' }} />
                        <span>Tạo mẫu hợp đồng bằng AI</span>
                    </Space>
                }
                open={aiGenModalVisible}
                onCancel={() => setAiGenModalVisible(false)}
                onOk={handleAiGenerateTemplate}
                confirmLoading={generatingAiContent}
                okText="Bắt đầu tạo"
                cancelText="Hủy"
                centered
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Mô tả loại hợp đồng hoặc các điều khoản bạn muốn AI tạo (ví dụ: "Hợp đồng chuyển văn phòng cho doanh nghiệp, có điều khoản bảo hiểm đồ đạc giá trị cao").</Text>
                </div>
                <Input.TextArea
                    placeholder="Mô tả mẫu hợp đồng tại đây..."
                    rows={4}
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                />
            </Modal>

            {/* Confirm modal when deactivating a template */}
            <Modal
                title="Xác nhận tắt kích hoạt"
                open={deactivateModalVisible}
                onOk={confirmDeactivate}
                onCancel={cancelDeactivate}
                okText="Tắt kích hoạt"
                cancelText="Hủy"
                centered
            >
                <p>Bạn có chắc muốn tắt kích hoạt mẫu hợp đồng này? Sau khi tắt, mẫu sẽ chuyển sang trạng thái Lưu trữ.</p>
            </Modal>

            {/* Contract detail modal separated into its own component */}
            <ContractModal open={modalVisible} contractId={selectedContractId} onClose={() => setModalVisible(false)} />
        </div>
    );
};

export default ContractManagement;