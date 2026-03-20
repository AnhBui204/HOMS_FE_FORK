import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Button, Select, Space, Tag, Input, Drawer, Descriptions, Divider, Badge } from 'antd';
import { SearchOutlined, EyeOutlined, CheckCircleOutlined, ExclamationCircleOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ReportManagement = () => {
    const [loading, setLoading] = useState(false);
    const [incidents, setIncidents] = useState([]);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState(undefined);
    const [filterStatus, setFilterStatus] = useState(undefined);

    // Drawer state
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState(null);

    // Mock Data based on Incident.js schema
    const mockIncidents = [
        {
            _id: 'INC-2024-001',
            invoiceId: { _id: 'INV-10023', code: 'INV-10023' },
            reporterId: { fullName: 'Nguyen Van A', phone: '0901234567' },
            type: 'Damage',
            description: 'Hàng hóa bị móp méo trong quá trình vận chuyển từ kho trung tâm.',
            images: ['https://via.placeholder.com/150'],
            status: 'Open',
            createdAt: '2024-03-05T08:30:00Z',
            resolution: {}
        },
        {
            _id: 'INC-2024-002',
            invoiceId: { _id: 'INV-10045', code: 'INV-10045' },
            reporterId: { fullName: 'Tran Thi B', phone: '0987654321' },
            type: 'Delay',
            description: 'Xe tải bị hỏng lốp giữa đường, trễ hẹn giao hàng 4 tiếng.',
            images: [],
            status: 'Investigating',
            createdAt: '2024-03-04T14:15:00Z',
            resolution: {}
        },
        {
            _id: 'INC-2024-003',
            invoiceId: { _id: 'INV-10011', code: 'INV-10011' },
            reporterId: { fullName: 'Le Van C', phone: '0912345678' },
            type: 'Accident',
            description: 'Va chạm giao thông nhẹ, không thiệt hại hàng nhưng cần đổi xe sang tải.',
            images: ['https://via.placeholder.com/150', 'https://via.placeholder.com/150'],
            status: 'Resolved',
            createdAt: '2024-03-01T09:00:00Z',
            resolution: { action: 'Compensation', compensationAmount: 2000000, resolvedAt: '2024-03-02T10:00:00Z' }
        }
    ];

    const loadData = () => {
        setLoading(true);
        setTimeout(() => {
            setIncidents(mockIncidents);
            setLoading(false);
        }, 500);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSearch = () => {
        setLoading(true);
        setTimeout(() => {
            let filtered = [...mockIncidents];
            if (searchText) {
                const lowerSearch = searchText.toLowerCase();
                filtered = filtered.filter(inc =>
                    inc._id.toLowerCase().includes(lowerSearch) ||
                    inc.invoiceId.code.toLowerCase().includes(lowerSearch) ||
                    inc.reporterId.fullName.toLowerCase().includes(lowerSearch)
                );
            }
            if (filterType && filterType !== 'all') {
                filtered = filtered.filter(inc => inc.type === filterType);
            }
            if (filterStatus && filterStatus !== 'all') {
                filtered = filtered.filter(inc => inc.status === filterStatus);
            }
            setIncidents(filtered);
            setLoading(false);
        }, 300);
    };

    const viewIncidentDetails = (incident) => {
        setSelectedIncident(incident);
        setDrawerVisible(true);
    };

    const getTypeTag = (type) => {
        const colors = {
            'Damage': 'volcano',
            'Delay': 'orange',
            'Accident': 'red',
            'Loss': 'magenta',
            'Other': 'default'
        };
        return <Tag color={colors[type] || 'default'}>{type}</Tag>;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Open': return <Badge status="error" text="Open" />;
            case 'Investigating': return <Badge status="processing" text="Investigating" />;
            case 'Resolved': return <Badge status="success" text="Resolved" />;
            case 'Dismissed': return <Badge status="default" text="Dismissed" />;
            default: return <Badge status="default" text={status} />;
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const columns = [
        {
            title: 'Incident ID',
            dataIndex: '_id',
            key: '_id',
            render: text => <strong>{text}</strong>
        },
        {
            title: 'Invoice Ref',
            dataIndex: ['invoiceId', 'code'],
            key: 'invoiceRef',
            render: text => <a href={`#${text}`}>{text}</a>
        },
        {
            title: 'Reporter',
            dataIndex: ['reporterId', 'fullName'],
            key: 'reporter',
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: type => getTypeTag(type)
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: status => getStatusBadge(status)
        },
        {
            title: 'Reported At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: date => dayjs(date).format('DD/MM/YYYY HH:mm')
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => viewIncidentDetails(record)}>
                    View / Resolve
                </Button>
            )
        }
    ];

    return (
        <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Incident Reports</Title>
            </div>

            <Card style={{ borderRadius: '12px', border: 'none', marginBottom: 24, padding: '8px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <Input
                        placeholder="Search Incident ID, Invoice, or Reporter..."
                        prefix={<SearchOutlined />}
                        style={{ width: 300, borderRadius: '4px' }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                    />
                    <Select
                        placeholder="Incident Type"
                        style={{ width: 150 }}
                        allowClear
                        onChange={val => setFilterType(val)}
                        defaultValue="all"
                    >
                        <Option value="all">All Types</Option>
                        <Option value="Damage">Damage</Option>
                        <Option value="Delay">Delay</Option>
                        <Option value="Accident">Accident</Option>
                        <Option value="Loss">Loss</Option>
                        <Option value="Other">Other</Option>
                    </Select>
                    <Select
                        placeholder="Status"
                        style={{ width: 150 }}
                        allowClear
                        onChange={val => setFilterStatus(val)}
                        defaultValue="all"
                    >
                        <Option value="all">All Statuses</Option>
                        <Option value="Open">Open</Option>
                        <Option value="Investigating">Investigating</Option>
                        <Option value="Resolved">Resolved</Option>
                        <Option value="Dismissed">Dismissed</Option>
                    </Select>
                    <Button type="primary" style={{ backgroundColor: '#1f4f29' }} icon={<SearchOutlined />} onClick={handleSearch}>Search</Button>
                    <Button icon={<SyncOutlined />} onClick={() => { setSearchText(''); setFilterType('all'); setFilterStatus('all'); loadData(); }}>Refresh</Button>
                </div>
            </Card>

            <Card style={{ borderRadius: '12px', border: 'none' }}>
                <Table
                    columns={columns}
                    dataSource={incidents}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Drawer
                title={`Incident Ticket: ${selectedIncident?._id || ''}`}
                placement="right"
                width={650}
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
            >
                {selectedIncident && (
                    <div style={{ paddingBottom: '60px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <Title level={5} style={{ margin: 0 }}>Status: {getStatusBadge(selectedIncident.status)}</Title>
                            <Text type="secondary">Reported: {dayjs(selectedIncident.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                        </div>

                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Related Invoice"><a href={`#${selectedIncident.invoiceId.code}`}>{selectedIncident.invoiceId.code}</a></Descriptions.Item>
                            <Descriptions.Item label="Reporter">{selectedIncident.reporterId.fullName} ({selectedIncident.reporterId.phone})</Descriptions.Item>
                            <Descriptions.Item label="Incident Type">{getTypeTag(selectedIncident.type)}</Descriptions.Item>
                            <Descriptions.Item label="Description" style={{ whiteSpace: 'pre-wrap' }}>{selectedIncident.description}</Descriptions.Item>
                        </Descriptions>

                        <Divider orientation="left">Evidence Images</Divider>
                        {selectedIncident.images && selectedIncident.images.length > 0 ? (
                            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                                {selectedIncident.images.map((img, idx) => (
                                    <div key={idx} style={{ width: '150px', height: '150px', backgroundColor: '#f0f0f0', border: '1px solid #d9d9d9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text type="secondary">Evidence {idx + 1}</Text>
                                        {/* <img src={img} alt={`incident-evidence-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> */}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Text type="secondary">No evidence images provided.</Text>
                        )}

                        <Divider orientation="left">Resolution Panel</Divider>

                        {selectedIncident.status === 'Resolved' && selectedIncident.resolution ? (
                            <Card type="inner" title={<><CheckCircleOutlined style={{ color: 'green' }} /> Incident Resolved</>} style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                                <p><strong>Action Taken:</strong> {selectedIncident.resolution.action}</p>
                                {selectedIncident.resolution.compensationAmount > 0 && (
                                    <p><strong>Compensation:</strong> <span style={{ color: '#1890ff', fontWeight: 500 }}>{formatCurrency(selectedIncident.resolution.compensationAmount)}</span></p>
                                )}
                                <p><strong>Resolved At:</strong> {dayjs(selectedIncident.resolution.resolvedAt).format('DD/MM/YYYY HH:mm')}</p>
                            </Card>
                        ) : (
                            <div style={{ backgroundColor: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <Text strong>Update Status</Text>
                                    <Select defaultValue={selectedIncident.status} style={{ width: '100%', marginTop: '8px' }}>
                                        <Option value="Open">Open</Option>
                                        <Option value="Investigating">Investigating</Option>
                                        <Option value="Resolved">Resolved</Option>
                                        <Option value="Dismissed">Dismissed</Option>
                                    </Select>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <Text strong>Resolution Action</Text>
                                    <Select placeholder="Select action..." style={{ width: '100%', marginTop: '8px' }}>
                                        <Option value="Refund">Refund</Option>
                                        <Option value="Compensation">Compensation</Option>
                                        <Option value="Apology">Apology</Option>
                                        <Option value="No Action Required">No Action Required</Option>
                                    </Select>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <Text strong>Compensation Amount (VND)</Text>
                                    <Input type="number" placeholder="Enter amount..." style={{ width: '100%', marginTop: '8px' }} />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <Text strong>Internal Notes</Text>
                                    <TextArea rows={3} placeholder="Add notes about the investigation..." style={{ marginTop: '8px' }} />
                                </div>
                                <Button type="primary" block style={{ backgroundColor: '#1890ff', fontWeight: 'bold' }}>Save Resolution</Button>
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default ReportManagement;
