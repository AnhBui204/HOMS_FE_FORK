import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Button, Tag, Space, Typography, Tooltip, Avatar, notification, Modal, Row, Col, Statistic, Progress, Tabs } from 'antd';
import { SearchOutlined, FilterOutlined, ExportOutlined, EyeOutlined, EditOutlined, LockOutlined, UnlockOutlined, UserOutlined, TeamOutlined, CheckCircleOutlined, UserAddOutlined, ApartmentOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import adminUserService from '../../../services/adminUserService';
import UserModal from './components/UserModal';

const { Title } = Typography;
const { Option } = Select;

// primary color used across admin pages
const primaryColor = '#44624A';

const UserManagement = () => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 7, total: 0 });
    const [filters, setFilters] = useState({ search: '', role: undefined });

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Confirm Status Modal State
    const [confirmStatusVisible, setConfirmStatusVisible] = useState(false);
    const [userToToggle, setUserToToggle] = useState(null);

    const navigate = useNavigate();

    // quick metrics for dashboard cards (aggregate totals across all users)
    const [totalUsers, setTotalUsers] = useState(0);
    const [activeUsers, setActiveUsers] = useState(0);
    const [staffUsers, setStaffUsers] = useState(0);
    const [dispatcherUsers, setDispatcherUsers] = useState(0);
    const [lockedUsers, setLockedUsers] = useState(0);

    const fetchUsers = async (page = 1, pageSize = 7, currentFilters = filters) => {
        try {
            setLoading(true);
            // roleFilter drives which tab we're fetching for. If currentFilters._roleFilter === 'staff'
            // we fetch a large set and filter out customers client-side to simulate "staff" group (all roles except customer).
            const roleFilter = currentFilters._roleFilter || undefined;
            let params = {
                page,
                limit: pageSize,
                search: currentFilters.search || undefined,
            };

            // If the UI explicitly requested a role filter, forward it to the backend.
            // (handleFilterChange already sets role to undefined when selecting "all")
            if (currentFilters.role) {
                params.role = currentFilters.role;
            }

            // If requesting the customers tab, explicitly request only customers from backend
            if (roleFilter === 'customers') {
                params.role = 'customer';
            }

            // If requesting staff (all non-customer roles) we'll request a large limit and paginate client-side
            // but still forward any explicit role selection (e.g. driver) so backend can filter further.
            if (roleFilter === 'staff') {
                params.page = 1;
                params.limit = 10000;
            }

            const response = await adminUserService.getAllUsers(params);

            // adminUserService may return the axios response or already return response.data
            let payload = response;
            let headers = undefined;
            if (response && typeof response === 'object' && response.hasOwnProperty('data')) {
                payload = response.data;
                headers = response.headers;
            }

            // possible payload shapes: array, { users: [...] }, { docs: [...] }, { data: [...] }
            let data = [];
            if (Array.isArray(payload)) data = payload;
            else if (Array.isArray(payload?.users)) data = payload.users;
            else if (Array.isArray(payload?.docs)) data = payload.docs;
            else if (Array.isArray(payload?.data)) data = payload.data;
            else if (payload?.users) data = payload.users;
            else if (payload?.docs) data = payload.docs;
            else data = [];

            // determine total from payload common fields or from headers, fallback to data.length
            // backend (admin) returns { users, totalPages, currentPage, totalUsers }
            let total = payload?.pagination?.totalItems ?? payload?.totalDocs ?? payload?.total ?? payload?.meta?.total ?? payload?.totalUsers ?? payload?.length;
            if ((total === undefined || total === null) && headers && headers['x-total-count']) {
                total = parseInt(headers['x-total-count'], 10);
            }
            total = total != null ? parseInt(total, 10) : data.length;

            // If roleFilter === 'staff', filter out customers and then paginate client-side
            if (roleFilter === 'staff') {
                const staffData = data.filter(u => (u.role || '').toString().toLowerCase() !== 'customer');
                const staffTotal = staffData.length;
                // slice for current page
                const start = (page - 1) * pageSize;
                const paged = staffData.slice(start, start + pageSize);
                setUsers(paged);
                setPagination((prev) => ({ ...prev, current: page, pageSize, total: staffTotal }));
            } else {
                setUsers(data);
                setPagination((prev) => ({ ...prev, current: page, pageSize, total }));
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
            notification.error({ message: 'Error fetching users' });
        } finally {
            setLoading(false);
        }
    };

    // tabKey = 'customers' | 'staff'
    const [tabKey, setTabKey] = useState('customers');

    useEffect(() => {
        // pass the tab filter inside filters via a reserved _roleFilter key
        fetchUsers(1, pagination.pageSize, { ...filters, _roleFilter: tabKey });
        fetchMetrics();
    }, []);

    // fetch aggregate metrics from the backend (not paginated)
    const fetchMetrics = async () => {
        try {
            // request a large limit to get all users for metrics
            const params = { page: 1, limit: 10000 };
            const res = await adminUserService.getAllUsers(params);

            let payload = res;
            if (res && res.data) payload = res.data;

            let data = [];
            if (Array.isArray(payload)) data = payload;
            else if (Array.isArray(payload.users)) data = payload.users;
            else if (Array.isArray(payload.docs)) data = payload.docs;
            else if (Array.isArray(payload.data)) data = payload.data;
            else if (payload.users) data = payload.users;
            else if (payload.docs) data = payload.docs;

            const total = data.length;
            const active = data.filter(u => (u.status || '').toString().toLowerCase() === 'active').length;
            const staff = data.filter(u => (u.role || '').toString().toLowerCase() === 'staff').length;
            const dispatchers = data.filter(u => (u.role || '').toString().toLowerCase() === 'dispatcher').length;
            const locked = data.filter(u => {
                const s = (u.status || '').toString().toLowerCase();
                return s === 'inactive' || s === 'locked' || s === 'banned';
            }).length;

            setTotalUsers(total);
            setActiveUsers(active);
            setStaffUsers(staff);
            setDispatcherUsers(dispatchers);
            setLockedUsers(locked);
        } catch (err) {
            console.error('Failed to fetch metrics', err);
        }
    };

    const handleTableChange = (newPagination) => {
        fetchUsers(newPagination.current, newPagination.pageSize, { ...filters, _roleFilter: tabKey });
    };

    const handleSearch = (value) => {
        const newFilters = { ...filters, search: value };
        setFilters(newFilters);
        fetchUsers(1, pagination.pageSize, { ...newFilters, _roleFilter: tabKey });
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
        setFilters(newFilters);
        fetchUsers(1, pagination.pageSize, { ...newFilters, _roleFilter: tabKey });
    };

    const handleTabChange = (key) => {
        setTabKey(key);
        // reset to page 1 when switching tabs
        fetchUsers(1, pagination.pageSize, { ...filters, _roleFilter: key });
    };

    const exportUsers = async () => {
        try {
            setLoading(true);
            // request a large limit to get all users (backend supports limit)
            const params = { page: 1, limit: 10000, search: filters.search || undefined, role: filters.role || undefined };
            const res = await adminUserService.getAllUsers(params);

            // adminUserService returns response.data (which has { success, data })
            let payload = res;
            if (res && res.success && res.data) payload = res.data;

            let data = [];
            if (Array.isArray(payload)) data = payload;
            else if (Array.isArray(payload.users)) data = payload.users;
            else if (Array.isArray(payload.docs)) data = payload.docs;
            else if (Array.isArray(payload.data)) data = payload.data;
            else if (payload.users) data = payload.users;
            else if (payload.docs) data = payload.docs;

            if (!data || data.length === 0) {
                notification.info({ message: 'Không có người dùng để xuất' });
                return;
            }

            // Try to export as Excel (.xlsx) using dynamic import of xlsx
            try {
                const XLSX = await import('xlsx');

                const sheetData = data.map(u => ({
                    'Full Name': u.fullName || '',
                    Email: u.email || '',
                    Phone: u.phone || '',
                    Role: u.role || '',
                    Status: u.status || '',
                    'Created At': u.createdAt ? new Date(u.createdAt).toLocaleString() : ''
                }));

                const ws = XLSX.utils.json_to_sheet(sheetData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Users');

                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const filename = `users_export_${yyyy}${mm}${dd}.xlsx`;

                // XLSX.writeFile works in browser builds created by CRA
                XLSX.writeFile(wb, filename);

                notification.success({ message: 'Xuất file người dùng (.xlsx) thành công' });
                return;
            } catch (xlsxErr) {
                // If xlsx isn't available, fall back to CSV
                console.warn('xlsx library not available, falling back to CSV export', xlsxErr);
            }

            // fallback: build CSV
            const headers = ['Full Name', 'Email', 'Phone', 'Role', 'Status', 'Created At'];
            const rows = data.map(u => [
                `"${(u.fullName || '').replace(/"/g, '""')}"`,
                `"${(u.email || '').replace(/"/g, '""')}"`,
                `"${(u.phone || '')}"`,
                `"${(u.role || '')}"`,
                `"${(u.status || '')}"`,
                `"${u.createdAt ? new Date(u.createdAt).toLocaleString() : ''}"`
            ].join(','));

            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const now2 = new Date();
            const yyyy2 = now2.getFullYear();
            const mm2 = String(now2.getMonth() + 1).padStart(2, '0');
            const dd2 = String(now2.getDate()).padStart(2, '0');
            link.setAttribute('download', `users_export_${yyyy2}${mm2}${dd2}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            notification.success({ message: 'Xuất file người dùng thành công' });
        } catch (err) {
            console.error('Export users failed', err);
            notification.error({ message: 'Lỗi khi xuất file người dùng' });
        } finally {
            setLoading(false);
        }
    };

    const requestToggleStatus = (user) => {
        setUserToToggle(user);
        setConfirmStatusVisible(true);
    };

    const handleConfirmToggleStatus = async () => {
        if (!userToToggle) return;
        try {
            const current = (userToToggle.status || '').toString().toLowerCase();
            const newStatus = current === 'active' ? 'inactive' : 'active';
            const res = await adminUserService.updateUser(userToToggle._id, { status: newStatus });
            const returnedStatus = res?.data?.status || (res?.data ? res.data.status : null) || newStatus;
            notification.success({ message: `Trạng thái người dùng đã được thay đổi thành: ${returnedStatus || newStatus}` });
            await fetchUsers(pagination.current, pagination.pageSize);
            fetchMetrics();
        } catch (error) {
            console.error('Failed to update status', error);
            notification.error({ message: 'Lỗi khi cập nhật trạng thái người dùng' });
        } finally {
            setConfirmStatusVisible(false);
            setUserToToggle(null);
        }
    };

    // ...existing toggle handler remains above

    const openCreateModal = () => {
        setEditingUser(null);
        setIsModalVisible(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setIsModalVisible(true);
    };

    const columns = [
        {
            title: 'Avatar',
            dataIndex: 'avatar',
            key: 'avatar',
            render: (_, record) => {
                const src = record?.avatar || record?.avatarUrl || record?.profilePicture || null;
                const name = record?.fullName || '';
                const initials = name
                    ? name.split(' ').filter(Boolean).slice(-2).map(n => n[0]).join('').toUpperCase()
                    : '';
                return (
                    <Avatar
                        src={src}
                        icon={!src ? <UserOutlined /> : undefined}
                        style={{ backgroundColor: !src ? '#f0f0f0' : undefined, color: !src ? '#8c8c8c' : undefined }}
                    >
                        {!src && initials}
                    </Avatar>
                );
            }
        },
        {
            title: 'Họ và tên',
            dataIndex: 'fullName',
            key: 'fullName',
            sorter: (a, b) => a.fullName.localeCompare(b.fullName),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        // Gender column removed as requested
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (role) => {
                const colors = {
                    customer: 'blue',
                    dispatcher: 'geekblue',
                    driver: 'cyan',
                    admin: 'purple',
                    staff: 'magenta'
                };
                const map = {
                    customer: 'Khách hàng',
                    dispatcher: 'Điều phối viên',
                    driver: 'Tài xế',
                    admin: 'Quản trị',
                    staff: 'Nhân viên'
                };
                const label = role ? (map[role] || role) : 'UNKNOWN';
                return <Tag color={colors[role] || 'default'}>{label}</Tag>;
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const s = (status || '').toString();
                const lower = s.toLowerCase();

                // map status to Vietnamese labels
                const statusMap = {
                    active: 'Hoạt động',
                    inactive: 'Không hoạt động',
                    banned: 'Bị cấm',
                    blocked: 'Bị khóa',
                    pending_password: 'Chờ đổi mật khẩu'
                };
                const label = statusMap[lower] || s;

                // Custom styling for inactive: red text, light red background, red border
                if (lower === 'inactive') {
                    return (
                        <Tag
                            style={{
                                color: '#ff4d4f',
                                background: 'rgba(255,77,79,0.06)',
                                border: '1px solid #ff4d4f',
                                borderRadius: 6,
                                fontWeight: 600,
                            }}
                        >
                            {label}
                        </Tag>
                    );
                }

                // keep existing presets for other statuses
                let color = 'default';
                if (lower === 'active') color = 'success';
                else if (lower === 'banned' || lower === 'blocked') color = 'error';
                return (
                    <Tag color={color}>
                        {label}
                    </Tag>
                );
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Xem chi tiết">
                        <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/admin/users/${record._id}`)} />
                    </Tooltip>
                    <Tooltip title={(record.role || '').toString().toLowerCase() === 'customer' ? 'Không có quyền chỉnh sửa thông tin khách hàng' : 'Chỉnh sửa'}>
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => openEditModal(record)}
                            disabled={(record.role || '').toString().toLowerCase() === 'customer'}
                        />
                    </Tooltip>
                    {record.role !== 'admin' && (
                        <>
                            {/* Activate / Deactivate control (lock icon) */}
                            <Tooltip title={((record.status || '').toString().toLowerCase() === 'active') ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}>
                                <Button
                                    type="text"
                                    icon={((record.status || '').toString().toLowerCase() === 'active') ? <UnlockOutlined style={{ color: 'green' }} /> : <LockOutlined style={{ color: 'red' }} />}
                                    size="small"
                                    onClick={() => requestToggleStatus(record)}
                                />
                            </Tooltip>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Quản Lý người dùng</Title>
            </div>

            {/* Top metrics - compact horizontal cards */}
            <div style={{ marginBottom: 18 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.04)', minHeight: 112, background: 'linear-gradient(180deg,#eef8ff, #ffffff)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e6f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <UserOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                                    </div>
                                    <div>
                                        <div style={{ color: '#4c6ef5', fontSize: 12, fontWeight: 700 }}>Tổng người dùng</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{totalUsers}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 13, color: '#8c8c8c' }}>Tất cả</div>
                                </div>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                        <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.04)', minHeight: 112, background: 'linear-gradient(180deg,#f1fbf1,#ffffff)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eaf4ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircleOutlined style={{ color: '#2D4F36', fontSize: 18 }} />
                                    </div>
                                    <div>
                                        <div style={{ color: '#3e6b3e', fontSize: 12, fontWeight: 700 }}>Người dùng hoạt động</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{activeUsers} <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600 }}>/{totalUsers || 0}</span></div>
                                    </div>
                                </div>
                                <div style={{ width: 140 }}>
                                    <Progress percent={totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0} showInfo={false} strokeColor="#88c48a" strokeWidth={8} />
                                </div>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                        <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.04)', minHeight: 112, background: 'linear-gradient(180deg,#fff6f6,#ffffff)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <LockOutlined style={{ color: '#ff6b6b', fontSize: 18 }} />
                                    </div>
                                    <div>
                                        <div style={{ color: '#6b6b6b', fontSize: 12, fontWeight: 700 }}>Tài khoản bị khóa</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{lockedUsers} <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600 }}>/{totalUsers || 0}</span></div>
                                    </div>
                                </div>
                                <div style={{ width: 140 }}>
                                    <Progress percent={totalUsers ? Math.round((lockedUsers / totalUsers) * 100) : 0} showInfo={false} strokeColor="#ffb3b8" strokeWidth={8} />
                                </div>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                        <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.04)', minHeight: 112, background: 'linear-gradient(180deg,#f6f4ff,#ffffff)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3eeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <TeamOutlined style={{ color: '#722ed1', fontSize: 18 }} />
                                    </div>
                                    <div>
                                        <div style={{ color: '#6b6b6b', fontSize: 12, fontWeight: 700 }}>Điều phối viên</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{dispatcherUsers}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 13, color: '#8c8c8c' }}>{staffUsers} nhân viên</div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>

            <Tabs activeKey={tabKey} onChange={handleTabChange} type="card">
                <Tabs.TabPane key="customers" tab={<span style={{ color: tabKey === 'customers' ? primaryColor : '#888', fontWeight: 600 }}>Khách hàng</span>}>
                    <Card style={{ borderRadius: '12px', border: 'none' }}>
                        {/* Header Controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: '16px' }}>
                            <Input
                                placeholder="Tìm theo tên hoặc email"
                                prefix={<SearchOutlined />}
                                style={{ width: 300, borderRadius: '8px' }}
                                onChange={(e) => handleSearch(e.target.value)}
                                allowClear
                            />

                            <Space size="middle">
                                <Select
                                    placeholder="Vai trò"
                                    style={{ width: 120, borderRadius: '8px' }}
                                    onChange={(val) => handleFilterChange('role', val)}
                                    allowClear
                                >
                                    <Option value="all">Tất cả vai trò</Option>
                                    <Option value="customer">Khách hàng</Option>
                                    <Option value="dispatcher">Điều phối viên</Option>
                                    <Option value="driver">Tài xế</Option>
                                    <Option value="staff">Nhân viên</Option>
                                </Select>

                                <Tooltip title="Làm mới">
                                    <Button
                                        icon={<ReloadOutlined />}
                                        style={{
                                            borderRadius: '8px',
                                            border: '1px solid #2D4F36',
                                            color: '#2D4F36',
                                            background: 'transparent'
                                        }}
                                        onClick={async () => { await fetchUsers(pagination.current, pagination.pageSize, { ...filters, _roleFilter: tabKey }); fetchMetrics(); }}
                                        disabled={loading}
                                    />
                                </Tooltip>

                                <Button
                                    icon={<ExportOutlined />}
                                    style={{
                                        borderRadius: '8px',
                                        border: '1px solid #2D4F36',
                                        color: '#2D4F36',
                                        background: 'transparent'
                                    }}
                                    onClick={exportUsers}
                                    disabled={loading}
                                >
                                    Xuất
                                </Button>

                                <Button
                                    onClick={openCreateModal}
                                    style={{
                                        borderRadius: '8px',
                                        backgroundColor: '#2D4F36',
                                        borderColor: '#2D4F36',
                                        color: '#ffffff'
                                    }}
                                >
                                    + Thêm Nhân Viên
                                </Button>
                            </Space>
                        </div>

                        {/* Users Table */}
                        <Table
                            columns={columns}
                            dataSource={users}
                            rowKey="_id"
                            pagination={pagination}
                            loading={loading}
                            onChange={handleTableChange}
                        />
                    </Card>
                </Tabs.TabPane>

                <Tabs.TabPane key="staff" tab={<span style={{ color: tabKey === 'staff' ? primaryColor : '#888', fontWeight: 600 }}>Nhân sự</span>}>
                    <Card style={{ borderRadius: '12px', border: 'none' }}>
                        {/* Reuse same header controls for staff tab */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: '16px' }}>
                            <Input
                                placeholder="Tìm theo tên hoặc email"
                                prefix={<SearchOutlined />}
                                style={{ width: 300, borderRadius: '8px' }}
                                onChange={(e) => handleSearch(e.target.value)}
                                allowClear
                            />

                            <Space size="middle">
                                <Select
                                    placeholder="Vai trò"
                                    style={{ width: 120, borderRadius: '8px' }}
                                    onChange={(val) => handleFilterChange('role', val)}
                                    allowClear
                                >
                                    <Option value="all">Tất cả vai trò</Option>
                                    <Option value="customer">Khách hàng</Option>
                                    <Option value="dispatcher">Điều phối viên</Option>
                                    <Option value="driver">Tài xế</Option>
                                    <Option value="staff">Nhân viên</Option>
                                </Select>

                                <Tooltip title="Làm mới">
                                    <Button
                                        icon={<ReloadOutlined />}
                                        style={{
                                            borderRadius: '8px',
                                            border: '1px solid #2D4F36',
                                            color: '#2D4F36',
                                            background: 'transparent'
                                        }}
                                        onClick={async () => { await fetchUsers(pagination.current, pagination.pageSize, { ...filters, _roleFilter: tabKey }); fetchMetrics(); }}
                                        disabled={loading}
                                    />
                                </Tooltip>

                                <Button
                                    icon={<ExportOutlined />}
                                    style={{
                                        borderRadius: '8px',
                                        border: '1px solid #2D4F36',
                                        color: '#2D4F36',
                                        background: 'transparent'
                                    }}
                                    onClick={exportUsers}
                                    disabled={loading}
                                >
                                    Export
                                </Button>

                                <Button
                                    onClick={openCreateModal}
                                    style={{
                                        borderRadius: '8px',
                                        backgroundColor: '#2D4F36',
                                        borderColor: '#2D4F36',
                                        color: '#ffffff'
                                    }}
                                >
                                    + Thêm nhân viên
                                </Button>
                            </Space>
                        </div>

                        {/* Users Table */}
                        <Table
                            columns={columns}
                            dataSource={users}
                            rowKey="_id"
                            pagination={pagination}
                            loading={loading}
                            onChange={handleTableChange}
                        />
                    </Card>
                </Tabs.TabPane>
            </Tabs>

            <UserModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                user={editingUser}
                onSuccess={() => { fetchUsers(pagination.current, pagination.pageSize); fetchMetrics(); }}
            />

            {/* Confirm modal (activate / deactivate) - decorated */}
            <Modal
                title={null}
                open={confirmStatusVisible}
                onCancel={() => setConfirmStatusVisible(false)}
                footer={null}
                closable={false}
                centered
                bodyStyle={{ padding: 0, background: 'transparent' }}
                width={520}
            >
                <div style={{ borderRadius: 12, padding: 28, background: '#ffffff', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', textAlign: 'center' }}>
                    {(() => {
                        const isActive = ((userToToggle?.status || '').toString().toLowerCase() === 'active');
                        return (
                            <>
                                <div style={{ width: 84, height: 84, margin: '0 auto', borderRadius: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? '#fff7f6' : 'rgba(68,98,74,0.06)', border: isActive ? '1px solid rgba(255,77,79,0.12)' : '1px solid rgba(68,98,74,0.12)' }}>
                                    {isActive ? <LockOutlined style={{ fontSize: 34, color: '#ff4d4f' }} /> : <UnlockOutlined style={{ fontSize: 34, color: '#8BA888' }} />}
                                </div>

                                <h3 style={{ marginTop: 18, marginBottom: 8, fontSize: 20, fontWeight: 700 }}>
                                    {`Xác nhận "${isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}" người dùng?`}
                                </h3>

                                <div style={{ color: '#595959', marginBottom: 12, fontWeight: 600 }}>
                                    {userToToggle ? `${userToToggle.fullName || ''}` : ''}
                                </div>

                                <div style={{ color: '#8c8c8c', marginBottom: 20, fontSize: 13 }}>
                                    {userToToggle ? `${userToToggle.email || ''}` : ''}
                                </div>

                                <div style={{ color: '#8c8c8c', marginBottom: 20 }}>
                                    Hành động này sẽ thay đổi trạng thái truy cập của người dùng. Vui lòng xác nhận để tiếp tục.
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 6 }}>
                                    <Button onClick={() => setConfirmStatusVisible(false)} style={{ borderRadius: 20, padding: '6px 28px' }}>
                                        Hủy
                                    </Button>
                                    <Button
                                        onClick={handleConfirmToggleStatus}
                                        type="primary"
                                        danger={isActive}
                                        style={isActive ? { borderRadius: 20, padding: '6px 28px' } : { borderRadius: 20, padding: '6px 28px', background: '#8BA888', borderColor: '#8BA888' }}
                                    >
                                        Xác nhận
                                    </Button>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;