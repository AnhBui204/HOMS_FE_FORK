import React, { useState, useEffect } from 'react';
import {
    Card, Table, Button, Tag, Space, Typography,
    Tooltip, notification, Popconfirm, Badge
} from 'antd';
import {
    EditOutlined, DeleteOutlined, PlusOutlined,
    CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import adminPriceService from '../../../services/adminPriceService';
import PriceModal from './components/PriceModal';

const { Title, Text } = Typography;

const fmt = (val) =>
    val != null
        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
        : '—';

const PricingManagement = () => {
    const [loading, setLoading] = useState(false);
    const [priceLists, setPriceLists] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingPrice, setEditingPrice] = useState(null);

    const fetchPriceLists = async () => {
        try {
            setLoading(true);
            const response = await adminPriceService.getAllPriceLists();
            // BE returns { success, data, total }
            const data = response.data?.data || response.data || [];
            setPriceLists(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch price lists', error);
            notification.error({ message: 'Lỗi tải bảng giá', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPriceLists(); }, []);

    const handleDelete = async (id) => {
        try {
            await adminPriceService.deletePriceList(id);
            notification.success({ message: 'Đã xóa bảng giá' });
            fetchPriceLists();
        } catch (error) {
            notification.error({ message: 'Không thể xóa', description: error.response?.data?.message || error.message });
        }
    };

    const columns = [
        {
            title: 'Mã / Tên',
            key: 'nameCode',
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ color: '#2D4F36' }}>{r.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{r.code}</Text>
                </Space>
            )
        },
        {
            title: 'Thuế VAT',
            dataIndex: 'taxRate',
            width: 90,
            render: val => val != null ? `${(val * 100).toFixed(0)}%` : '—'
        },
        {
            title: 'Phí tối thiểu',
            key: 'min',
            width: 140,
            render: (_, r) => fmt(r.basePrice?.minimumCharge)
        },
        {
            title: 'Phí nhân công / giờ',
            key: 'labor',
            width: 160,
            render: (_, r) => fmt(r.laborCost?.pricePerHourPerPerson)
        },
        {
            title: 'Xe (số bậc)',
            key: 'vehicle',
            width: 110,
            render: (_, r) => {
                const count = r.vehiclePricing?.length || 0;
                return <Badge count={count} color="#1677ff" showZero><Tag>{count} loại xe</Tag></Badge>;
            }
        },
        {
            title: 'Vận chuyển (bậc)',
            key: 'transport',
            width: 130,
            render: (_, r) => {
                const count = r.transportTiers?.length || 0;
                return <Badge count={count} color="#52c41a" showZero><Tag color="green">{count} bậc</Tag></Badge>;
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            width: 110,
            render: (active) =>
                active
                    ? <Tag icon={<CheckCircleOutlined />} color="success">Đang dùng</Tag>
                    : <Tag icon={<CloseCircleOutlined />} color="default">Không dùng</Tag>
        },
        {
            title: 'Ngày hiệu lực',
            key: 'dates',
            width: 160,
            render: (_, r) => {
                const from = r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString('vi-VN') : null;
                const to = r.effectiveTo ? new Date(r.effectiveTo).toLocaleDateString('vi-VN') : null;
                return from || to ? <Text style={{ fontSize: 12 }}>{from || '?'} → {to || '∞'}</Text> : '—';
            }
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 90,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            style={{ color: '#1890ff' }}
                            onClick={() => { setEditingPrice(record); setIsModalVisible(true); }}
                        />
                    </Tooltip>
                    <Tooltip title="Xóa">
                        <Popconfirm
                            title="Xóa bảng giá này?"
                            onConfirm={() => handleDelete(record._id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                            disabled={record.isActive}
                        >
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                disabled={record.isActive}
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            )
        },
    ];

    return (
        <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý Bảng Giá</Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ borderRadius: 8, background: '#2D4F36', borderColor: '#2D4F36' }}
                    onClick={() => { setEditingPrice(null); setIsModalVisible(true); }}
                >
                    Tạo bảng giá mới
                </Button>
            </div>

            <Card style={{ borderRadius: 12, border: 'none' }}>
                <Table
                    columns={columns}
                    dataSource={priceLists}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <PriceModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                priceList={editingPrice}
                onSuccess={fetchPriceLists}
            />
        </div>
    );
};

export default PricingManagement;
