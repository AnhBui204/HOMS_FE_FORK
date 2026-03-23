import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tabs, Button, Select, Space, notification, Drawer, Descriptions, Tag, Divider } from 'antd';
import { FileTextOutlined, EyeOutlined, CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import adminContractService from '../../../services/adminContractService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ContractManagement = () => {
    const [loading, setLoading] = useState(false);
    const [contracts, setContracts] = useState([]);
    const [templates, setTemplates] = useState([]);

    // Drawer state
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [contractsRes, templatesRes] = await Promise.all([
                adminContractService.getContracts().catch(() => ({ data: { contracts: [] } })),
                adminContractService.getTemplates().catch(() => ({ data: { templates: [] } }))
            ]);

            const contractData = contractsRes.data?.contracts || contractsRes.data || [];
            const templateData = templatesRes.data?.templates || templatesRes.data || [];

            // Fallback Mock Data if Backend is empty
            if (contractData.length === 0) {
                setContracts([
                    { _id: 'c1', contractCode: 'HD-2024-001', customerId: { fullName: 'Nguyen Van A' }, status: 'Signed', effectiveDate: '2024-03-01', totalValue: 5000000, signatureCustomer: 'url' },
                    { _id: 'c2', contractCode: 'HD-2024-002', customerId: { fullName: 'Tran Thi B' }, status: 'Pending', effectiveDate: '2024-03-05', totalValue: 3200000 }
                ]);
            } else {
                setContracts(contractData);
            }

            if (templateData.length === 0) {
                setTemplates([
                    { _id: 't1', title: 'Hợp Đồng Vận Chuyển Tiêu Chuẩn', version: '1.0', isActive: true, content: 'Nội dung hợp đồng...', createdAt: '2024-01-01' },
                    { _id: 't2', title: 'Hợp Đồng Thuê Xe Tải Nguyên Chuyến', version: '2.1', isActive: true, content: '...', createdAt: '2024-02-15' }
                ]);
            } else {
                setTemplates(templateData);
            }

        } catch (error) {
            console.error('Failed to fetch report data', error);
            notification.error({ message: 'Error loading contracts and templates' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const viewContractDetails = (contract) => {
        setSelectedContract(contract);
        setDrawerVisible(true);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const contractColumns = [
        {
            title: 'Mã',
            dataIndex: 'contractCode',
            key: 'contractCode',
            render: text => <strong>{text}</strong>
        },
        {
            title: 'Khách hàng',
            dataIndex: ['customerId', 'fullName'],
            key: 'customer',
        },
        {
            title: 'Ngày hiệu lực',
            dataIndex: 'effectiveDate',
            key: 'effectiveDate',
            render: date => dayjs(date).format('DD/MM/YYYY')
        },
        {
            title: 'Tổng giá trị',
            dataIndex: 'totalValue',
            key: 'totalValue',
            render: val => <span style={{ color: '#1890ff' }}>{formatCurrency(val)}</span>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: status => {
                let color = status === 'Signed' ? 'success' : (status === 'Expired' || status === 'Cancelled' ? 'error' : 'warning');
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => viewContractDetails(record)}>
                        Xem
                    </Button>
                    <Button size="small" icon={<DownloadOutlined />} />
                </Space>
            )
        }
    ];

    const templateColumns = [
        { title: 'Tiêu đề', dataIndex: 'title', key: 'title' },
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
            render: () => (
                <Button type="link" size="small">Chỉnh sửa mẫu</Button>
            )
        }
    ];

    const items = [
        {
            key: '1',
            label: 'Hợp đồng',
            children: <Table columns={contractColumns} dataSource={contracts} rowKey="_id" loading={loading} />
        },
        {
            key: '2',
            label: 'Mẫu hợp đồng',
            children: <Table columns={templateColumns} dataSource={templates} rowKey="_id" loading={loading} />
        }
    ];

    return (
        <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý hợp đồng</Title>
            </div>

            <Card style={{ borderRadius: '12px', border: 'none' }}>
                <Tabs defaultActiveKey="1" items={items} />
            </Card>

            <Drawer
                title={`Chi tiết hợp đồng: ${selectedContract?.contractCode || ''}`}
                placement="right"
                width={600}
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
            >
                {selectedContract && (
                    <div>
                        <Descriptions title="Thông tin chung" bordered column={1}>
                            <Descriptions.Item label="Khách hàng">{selectedContract.customerId?.fullName || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Ngày hiệu lực">{dayjs(selectedContract.effectiveDate).format('DD/MM/YYYY')}</Descriptions.Item>
                            <Descriptions.Item label="Ngày kết thúc">{selectedContract.endDate ? dayjs(selectedContract.endDate).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Tổng giá trị">{formatCurrency(selectedContract.totalValue)}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={selectedContract.status === 'Signed' ? 'success' : 'warning'}>{selectedContract.status}</Tag>
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        <Title level={5}>Chữ ký</Title>
                        <div style={{ display: 'flex', gap: '20px', marginTop: 16 }}>
                            <Card size="small" title="Chữ ký khách hàng" style={{ width: '50%' }}>
                                {selectedContract.signatureCustomer ? (
                                    <div style={{ color: 'green', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CheckCircleOutlined /> Đã ký
                                    </div>
                                    // In a real app we'd render the image: <img src={selectedContract.signatureCustomer} alt="signature" style={{width: '100%'}}/>
                                ) : (
                                    <Text type="secondary">Đang chờ</Text>
                                )}
                            </Card>
                            <Card size="small" title="Chữ ký quản trị" style={{ width: '50%' }}>
                                {selectedContract.signatureAdmin ? (
                                    <div style={{ color: 'green', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CheckCircleOutlined /> Đã ký
                                    </div>
                                ) : (
                                    <Button type="primary" size="small" style={{ width: '100%' }}>Ký ngay</Button>
                                )}
                            </Card>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default ContractManagement;
