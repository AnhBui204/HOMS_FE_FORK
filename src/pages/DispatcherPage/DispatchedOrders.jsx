import React, { useState, useEffect } from 'react';
import { Table, Typography, Tag, message, Button, Modal, Space, Empty, Select } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;

const DispatchedOrders = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

    // Modal state for viewing details
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const fetchInvoices = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const response = await api.get('/invoices');
            if (response.data && response.data.success) {
                const targetStatuses = statusFilter ? [statusFilter] : ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];
                const filtered = response.data.data.filter(inv => targetStatuses.includes(inv.status));
                setInvoices(filtered);
            }
        } catch (error) {
            message.error('Lỗi khi tải danh sách đơn hàng đã điều phối: ' + (error.response?.data?.message || ''));
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();

        // Auto-reload data every 10 seconds to catch DB changes
        const intervalId = setInterval(() => {
            fetchInvoices(true);
        }, 10000);

        return () => clearInterval(intervalId);
    }, [statusFilter]); // trigger re-fetch/filter when filter changes

    const showDetails = async (record) => {
        try {
            // Fetch detailed invoice to get populated dispatchAssignmentId
            const res = await api.get(`/invoices/${record._id}`);
            if (res.data?.success) {
                setSelectedInvoice(res.data.data);
            } else {
                setSelectedInvoice(record); // fallback
            }
        } catch (err) {
            console.error(err);
            setSelectedInvoice(record); // fallback
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setSelectedInvoice(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ASSIGNED': return 'blue';
            case 'IN_DISPATCH': return 'cyan';
            case 'IN_PROGRESS': return 'orange';
            case 'COMPLETED': return 'green';
            case 'CANCELLED': return 'red';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: 'Mã Hóa Đơn',
            dataIndex: 'code',
            key: 'code',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Khách hàng',
            dataIndex: ['customerId', 'fullName'],
            key: 'customerName'
        },
        {
            title: 'Địa chỉ lấy',
            dataIndex: ['requestTicketId', 'pickup', 'address'],
            key: 'pickup',
            ellipsis: true
        },
        {
            title: 'Địa chỉ giao',
            dataIndex: ['requestTicketId', 'delivery', 'address'],
            key: 'delivery',
            ellipsis: true
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="default"
                    icon={<EyeOutlined />}
                    onClick={() => showDetails(record)}
                >
                    Chi tiết
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
            <Title level={4}>Theo dõi đơn hàng đã điều phối</Title>

            <div style={{ marginBottom: 16, display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Text strong>Lọc trạng thái:</Text>
                <Select
                    style={{ width: 200 }}
                    allowClear
                    placeholder="Tất cả trạng thái"
                    value={statusFilter || undefined}
                    onChange={(val) => setStatusFilter(val || '')}
                >
                    <Select.Option value="ASSIGNED">Đã phân công</Select.Option>
                    <Select.Option value="IN_DISPATCH">Đang điều phối</Select.Option>
                    <Select.Option value="IN_PROGRESS">Đang thực hiện</Select.Option>
                    <Select.Option value="COMPLETED">Đã hoàn thành</Select.Option>
                </Select>
                <Button icon={<EyeOutlined />} onClick={() => fetchInvoices()}>Làm mới</Button>
            </div>

            <Table
                columns={columns}
                dataSource={invoices}
                rowKey="_id"
                loading={loading}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn hàng`,
                    onChange: (page, pageSize) => setPagination({ current: page, pageSize })
                }}
                locale={{
                    emptyText: (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_ILLUSTRATION}
                            description={
                                <span>
                                    Hiện không có đơn hàng nào
                                </span>
                            }
                        >
                            <Button type="primary" onClick={fetchInvoices}>Tải lại dữ liệu</Button>
                        </Empty>
                    )
                }}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title={`Chi tiết điều phối: ${selectedInvoice?.code || ''}`}
                visible={isModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="close" onClick={handleCancel}>Đóng</Button>
                ]}
                width={700}
            >
                {selectedInvoice && (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <div>
                            <Text strong>Khách hàng: </Text> <Text>{selectedInvoice.customerId?.fullName} - {selectedInvoice.customerId?.phone}</Text>
                        </div>
                        <div>
                            <Text strong>Trạng thái đơn: </Text> <Tag color={getStatusColor(selectedInvoice.status)}>{selectedInvoice.status}</Tag>
                        </div>

                        {selectedInvoice.dispatchAssignmentId ? (
                            <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '16px' }}>
                                <Title level={5} style={{ marginTop: 0 }}>Đội ngũ và Xe điều phối</Title>
                                {selectedInvoice.dispatchAssignmentId.assignments?.map((assignment, index) => (
                                    <div key={index} style={{ marginBottom: 16, padding: '12px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '6px' }}>
                                        <Text strong>Xe Tải {index + 1}: </Text>
                                        <Text>{assignment.vehicleId?.plateNumber || assignment.vehicleId?._id || assignment.vehicleId} </Text><br />

                                        <Text strong>Tài Xế / Nhóm Trưởng: </Text>
                                        <Text>{assignment.driverIds?.map(d => d.fullName || d.username || d._id || d).join(', ') || 'Chưa phân công'}</Text><br />

                                        <Text strong>Phụ Xe bốc xếp: </Text>
                                        <Text>{assignment.staffIds?.map(s => s.fullName || s.username || s._id || s).join(', ') || 'Không có'}</Text><br />

                                        <Text strong>Thời gian lấy hàng (dự kiến): </Text>
                                        <Text>{assignment.pickupTime ? new Date(assignment.pickupTime).toLocaleString() : 'N/A'}</Text><br />

                                        <div style={{ marginTop: 12 }}>
                                            <Button type="dashed" onClick={() => message.info('Tính năng Điều phối Lộ trình đang được phát triển.')}>
                                                Giám sát lộ trình di chuyển
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {(!selectedInvoice.dispatchAssignmentId.assignments || selectedInvoice.dispatchAssignmentId.assignments.length === 0) && (
                                    <Text type="secondary">Chưa có thông tin xe và nhân sự cụ thể.</Text>
                                )}
                            </div>
                        ) : (
                            <Text type="warning">Chưa có thông tin điều phối chi tiết.</Text>
                        )}
                    </Space>
                )}
            </Modal>
        </div>
    );
};

export default DispatchedOrders;
