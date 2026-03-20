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

            // Adapt to typical backend response structure
            const data = response.data?.users || response.data || [];
            const total = response.data?.pagination?.totalItems || data.length;

            setUsers(data);
            setPagination({ ...pagination, current: page, pageSize, total: total });
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

    const requestToggleStatus = (user) => {
        setUserToToggle(user);
        setConfirmStatusVisible(true);
    };

    const handleConfirmToggleStatus = async () => {
        if (!userToToggle) return;
        try {
            const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
            await adminUserService.updateUser(userToToggle._id, { status: newStatus });
            notification.success({ message: `User status changed to ${newStatus}` });
            fetchUsers(pagination.current, pagination.pageSize);
        } catch (error) {
            console.error('Failed to update status', error);
            notification.error({ message: 'Error updating user status' });
        } finally {
            setConfirmStatusVisible(false);
            setUserToToggle(null);
        }
    };

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
            render: (status) => (
                <Tag color={status === 'Active' ? 'success' : 'error'}>
                    Account: {status === 'Active' ? 'Active' : 'Inactive'}
                </Tag>
            )
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
                        <Tooltip title={record.status === 'active' ? 'Deactivate Account' : 'Activate Account'}>
                            <Button
                                type="text"
                                icon={record.status === 'active' ? <LockOutlined style={{ color: 'red' }} /> : <UnlockOutlined style={{ color: 'green' }} />}
                                size="small"
                                onClick={() => requestToggleStatus(record)}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>User List</Title>
                <Title level={5} type="secondary" style={{ margin: 0 }}>User Management</Title>
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

                        <Select
                            placeholder="Gender"
                            style={{ width: 120, borderRadius: '8px' }}
                            onChange={(val) => handleFilterChange('gender', val)}
                            allowClear
                        >
                            <Option value="all">All Genders</Option>
                            <Option value="Male">Male</Option>
                            <Option value="Female">Female</Option>
                        </Select>

                        <Button icon={<ExportOutlined />} style={{ borderRadius: '8px' }}>
                            Export
                        </Button>
                        <Button type="primary" icon={<FilterOutlined />} style={{ borderRadius: '8px', background: '#237804' }}>
                            Filter
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

            <Modal
                title={null}
                open={confirmStatusVisible}
                onCancel={() => setConfirmStatusVisible(false)}
                footer={null}
                closable={false}
                centered
                bodyStyle={{ textAlign: 'center', padding: '30px 20px', backgroundColor: '#cad5c1', borderRadius: '16px' }}
                width={300}
            >
                <h3 style={{ color: 'white', marginBottom: '30px', fontWeight: 'bold' }}>
                    Xác nhận "{userToToggle?.status === 'active' ? 'Cấm' : 'Không cấm'}"<br />người dùng ?
                </h3>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <Button
                        onClick={handleConfirmToggleStatus}
                        style={{ borderRadius: '20px', padding: '0 24px', fontWeight: 'bold' }}
                    >
                        Xác nhận
                    </Button>
                    <Button
                        onClick={() => setConfirmStatusVisible(false)}
                        style={{ borderRadius: '20px', padding: '0 24px', fontWeight: 'bold' }}
                    >
                        Hủy
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;
