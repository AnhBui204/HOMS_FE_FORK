import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Button, Tag, Space, Typography, Tooltip, notification, Popconfirm } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined, PlusOutlined, DownloadOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const VehicleManagement = () => {
    const [loading, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState([]);

    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState(undefined);

    // Mock data based on screenshot
    const mockVehicles = [
        { id: '1', vehicleId: 'VCL-001', type: 'Truck', status: 'Available', licensePlate: '51F-123.45', currentDriver: 'N/A', lastMaintenance: '2024-03-15' },
        { id: '2', vehicleId: 'VCL-002', type: 'Truck', status: 'In Use', licensePlate: '51F-678.90', currentDriver: 'Nguyen Van A', lastMaintenance: '2024-03-15' },
        { id: '3', vehicleId: 'VCL-003', type: 'Truck', status: 'Under Maintenance', licensePlate: 'N/A', currentDriver: 'N/A', lastMaintenance: '2024-05-10' },
        { id: '4', vehicleId: 'VCL-004', type: 'Van', status: 'Available', licensePlate: '51F-612.23', currentDriver: 'N/A', lastMaintenance: '2024-05-20' },
        { id: '5', vehicleId: 'VCL-005', type: 'Truck', status: 'In Use', licensePlate: '51F-776.88', currentDriver: 'Tran Thi B', lastMaintenance: '2024-05-25' }
    ];

    const loadData = () => {
        setLoading(true);
        // Simulate API fetch delay
        setTimeout(() => {
            setVehicles(mockVehicles);
            setLoading(false);
        }, 600);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSearch = () => {
        setLoading(true);
        setTimeout(() => {
            let filtered = [...mockVehicles];
            if (searchText) {
                filtered = filtered.filter(v => v.vehicleId.toLowerCase().includes(searchText.toLowerCase()) ||
                    (v.licensePlate !== 'N/A' && v.licensePlate.toLowerCase().includes(searchText.toLowerCase())));
            }
            if (filterStatus) {
                filtered = filtered.filter(v => v.status === filterStatus);
            }
            setVehicles(filtered);
            setLoading(false);
        }, 300);
    };

    const columns = [
        {
            title: 'Vehicle ID',
            dataIndex: 'vehicleId',
            key: 'vehicleId',
            render: text => <strong>{text}</strong>
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'default';
                if (status === 'Available') color = 'success';
                else if (status === 'In Use') color = 'processing';
                else if (status === 'Under Maintenance') color = 'error';
                return <span style={{ fontWeight: 500, color: color === 'success' ? '#52c41a' : color === 'processing' ? '#1890ff' : '#f5222d' }}>{status}</span>;
            }
        },
        {
            title: 'License Plate',
            dataIndex: 'licensePlate',
            key: 'licensePlate',
        },
        {
            title: 'Current Driver',
            dataIndex: 'currentDriver',
            key: 'currentDriver',
        },
        {
            title: 'Last Maintenance',
            dataIndex: 'lastMaintenance',
            key: 'lastMaintenance',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Edit">
                        <Button type="text" icon={<EditOutlined />} style={{ color: '#1890ff' }} />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Popconfirm title="Delete this vehicle?">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ textAlign: 'left', backgroundColor: '#fafafa', minHeight: '100vh', padding: '0 0 24px 0' }}>
            {/* Top Bar with Download Report Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24, padding: '16px 24px', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0' }}>
                <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    style={{ backgroundColor: '#237804', borderColor: '#237804', borderRadius: '4px', fontWeight: 'bold' }}
                >
                    Download Report
                </Button>
            </div>

            <div style={{ padding: '0 24px' }}>
                <Title level={3} style={{ marginBottom: 16 }}>Vehicle Fleet Information</Title>

                <div style={{ marginBottom: 24 }}>
                    <Tag color="#1f4f29" style={{ padding: '4px 12px', fontSize: '14px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircleOutlined /> Vehicle fleet information loaded successfully
                    </Tag>
                </div>

                <Card style={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    {/* Filters Row */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: 24 }}>
                        <Input
                            placeholder="Search..."
                            prefix={<SearchOutlined />}
                            style={{ width: 250, borderRadius: '4px' }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />
                        <Select
                            placeholder="Filter by Status"
                            style={{ width: 180 }}
                            allowClear
                            onChange={val => setFilterStatus(val)}
                        >
                            <Option value="Available">Available</Option>
                            <Option value="In Use">In Use</Option>
                            <Option value="Under Maintenance">Under Maintenance</Option>
                        </Select>
                        <Select placeholder="Filter by Group" style={{ width: 180 }} allowClear disabled>
                            <Option value="north">North Branch</Option>
                            <Option value="south">South Branch</Option>
                        </Select>
                        <Button
                            type="primary"
                            style={{ backgroundColor: '#1f4f29', borderRadius: '4px', fontWeight: 'bold' }}
                            onClick={handleSearch}
                        >
                            Search
                        </Button>
                    </div>

                    <Table
                        columns={columns}
                        dataSource={vehicles}
                        rowKey="id"
                        pagination={false}
                        loading={loading}
                    />
                </Card>
            </div>
        </div>
    );
};

export default VehicleManagement;
