import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Button, Tag, Space, Typography, Tooltip, Avatar, notification, Modal } from 'antd';
import { SearchOutlined, FilterOutlined, ExportOutlined, EyeOutlined, EditOutlined, LockOutlined, UnlockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import adminUserService from '../../../services/adminUserService';
import UserModal from './components/UserModal';

const { Title } = Typography;
const { Option } = Select;

const UserManagement = () => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [filters, setFilters] = useState({ search: '', role: undefined, gender: undefined });

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Confirm Status Modal State
    const [confirmStatusVisible, setConfirmStatusVisible] = useState(false);
    const [userToToggle, setUserToToggle] = useState(null);

    const navigate = useNavigate();

    const fetchUsers = async (page = 1, pageSize = 10, currentFilters = filters) => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: pageSize,
                search: currentFilters.search || undefined,
                role: currentFilters.role || undefined,
                gender: currentFilters.gender || undefined
            };
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

            setUsers(data);
            setPagination((prev) => ({ ...prev, current: page, pageSize, total }));
        } catch (error) {
            console.error('Failed to fetch users', error);
            notification.error({ message: 'Error fetching users' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleTableChange = (newPagination) => {
        fetchUsers(newPagination.current, newPagination.pageSize);
    };

    const handleSearch = (value) => {
        const newFilters = { ...filters, search: value };
        setFilters(newFilters);
        fetchUsers(1, pagination.pageSize, newFilters);
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
        setFilters(newFilters);
        fetchUsers(1, pagination.pageSize, newFilters);
    };

    const exportUsers = async () => {
        try {
            setLoading(true);
            // request a large limit to get all users (backend supports limit)
            const params = { page: 1, limit: 10000, search: filters.search || undefined, role: filters.role || undefined, gender: filters.gender || undefined };
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
            fetchUsers(pagination.current, pagination.pageSize);
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
            render: (avatar) => <Avatar src={avatar} icon={<UserOutlined />} />
        },
        {
            title: 'Full Name',
            dataIndex: 'fullName',
            key: 'fullName',
            sorter: (a, b) => a.fullName.localeCompare(b.fullName),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Gender',
            dataIndex: 'gender',
            key: 'gender',
        },
        {
            title: 'Role',
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
                return <Tag color={colors[role] || 'default'}>{role ? role.toUpperCase() : 'UNKNOWN'}</Tag>;
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const s = (status || '').toString();
                const lower = s.toLowerCase();

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
                            {s}
                        </Tag>
                    );
                }

                // keep existing presets for other statuses
                let color = 'default';
                if (lower === 'active') color = 'success';
                else if (lower === 'banned' || lower === 'blocked') color = 'error';
                return (
                    <Tag color={color}>
                        {s}
                    </Tag>
                );
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="View Details">
                        <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/admin/users/${record._id}`)} />
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEditModal(record)} />
                    </Tooltip>
                    {record.role !== 'admin' && (
                        <>
                            {/* Activate / Deactivate control (lock icon) */}
                            <Tooltip title={((record.status || '').toString().toLowerCase() === 'active') ? 'Deactivate Account' : 'Activate Account'}>
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

            <Card style={{ borderRadius: '12px', border: 'none' }}>
                {/* Header Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: '16px' }}>
                    <Input
                        placeholder="Search by name or email"
                        prefix={<SearchOutlined />}
                        style={{ width: 300, borderRadius: '8px' }}
                        onChange={(e) => handleSearch(e.target.value)}
                        allowClear
                    />

                    <Space size="middle">
                        <Select
                            placeholder="Role"
                            style={{ width: 120, borderRadius: '8px' }}
                            onChange={(val) => handleFilterChange('role', val)}
                            allowClear
                        >
                            <Option value="all">All Roles</Option>
                            <Option value="customer">Customer</Option>
                            <Option value="dispatcher">Dispatcher</Option>
                            <Option value="driver">Driver</Option>
                            <Option value="staff">Staff</Option>
                        </Select>

                        <Button icon={<ExportOutlined />} style={{ borderRadius: '8px' }} onClick={exportUsers} disabled={loading}>
                            Export
                        </Button>

                        <Button type="primary" onClick={openCreateModal} style={{ borderRadius: '8px' }}>
                            + Add User
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

            <UserModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                user={editingUser}
                onSuccess={() => fetchUsers(pagination.current, pagination.pageSize)}
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
