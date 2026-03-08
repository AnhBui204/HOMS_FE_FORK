import React, { useState, useEffect, useMemo } from 'react';
import {
    Card, Table, Typography, Button, Select, Input,
    Row, Col, Descriptions, Divider, Badge, Tag, Modal,
    Form, Upload, message, Image,
} from 'antd';
import {
    SearchOutlined, EyeOutlined,
    SyncOutlined, PlusOutlined, WarningOutlined,
    UploadOutlined, PictureOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/* ── MOCK DATA (TODO: replace with real API call) ──────── */
const MOCK_INCIDENTS = [
    {
        _id: 'INC-2024-001',
        invoiceId: { _id: 'INV-10023', code: 'INV-10023' },
        reporterId: { fullName: 'Nguyen Van A', phone: '0901234567' },
        type: 'Damage',
        description: 'Cargo damaged during transport from the central warehouse.',
        images: ['placeholder'],
        status: 'Open',
        createdAt: '2024-03-05T08:30:00Z',
        resolution: {},
    },
    {
        _id: 'INC-2024-002',
        invoiceId: { _id: 'INV-10045', code: 'INV-10045' },
        reporterId: { fullName: 'Tran Thi B', phone: '0987654321' },
        type: 'Delay',
        description: 'Truck had a flat tire mid-route, causing 4-hour delivery delay.',
        images: [],
        status: 'Investigating',
        createdAt: '2024-03-04T14:15:00Z',
        resolution: {},
    },
    {
        _id: 'INC-2024-003',
        invoiceId: { _id: 'INV-10011', code: 'INV-10011' },
        reporterId: { fullName: 'Le Van C', phone: '0912345678' },
        type: 'Accident',
        description: 'Minor traffic collision, no cargo damage but vehicle swap was required.',
        images: ['placeholder', 'placeholder'],
        status: 'Resolved',
        createdAt: '2024-03-01T09:00:00Z',
        resolution: {
            action: 'Compensation',
            compensationAmount: 2000000,
            resolvedAt: '2024-03-02T10:00:00Z',
        },
    },
];

/* ── HELPERS ────────────────────────────────────────────── */
const TYPE_COLORS = { Damage: 'volcano', Delay: 'orange', Accident: 'red', Loss: 'magenta', Other: 'default' };

const getTypeTag   = (type)   => <Tag color={TYPE_COLORS[type] || 'default'}>{type}</Tag>;
const getStatusBadge = (status) => {
    const map = { Open: 'error', Investigating: 'processing', Resolved: 'success', Dismissed: 'default' };
    return <Badge status={map[status] || 'default'} text={status} />;
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
const StaffIncidentReport = () => {
    const [loading, setLoading]           = useState(false);
    const [incidents, setIncidents]       = useState([]);
    const [searchText, setSearchText]     = useState('');
    const [filterType, setFilterType]     = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    /* Detail modal */
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState(null);

    /* Report modal */
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportForm]  = Form.useForm();
    const [fileList, setFileList]               = useState([]);
    const [previewImages, setPreviewImages]     = useState([]);
    const [submitting, setSubmitting]           = useState(false);

    /* ── load ──────────────────────────────────────────── */
    const loadData = () => {
        setLoading(true);
        setTimeout(() => { setIncidents(MOCK_INCIDENTS); setLoading(false); }, 400);
    };

    useEffect(() => { loadData(); }, []);

    /* ── live filter (derived) ───────────────────────────────────── */
    const displayedIncidents = useMemo(() => {
        let result = incidents;
        if (searchText) {
            const q = searchText.toLowerCase();
            result = result.filter(i =>
                i._id.toLowerCase().includes(q) ||
                i.invoiceId.code.toLowerCase().includes(q) ||
                i.reporterId.fullName.toLowerCase().includes(q)
            );
        }
        if (filterType && filterType !== 'all')     result = result.filter(i => i.type === filterType);
        if (filterStatus && filterStatus !== 'all') result = result.filter(i => i.status === filterStatus);
        return result;
    }, [incidents, searchText, filterType, filterStatus]);

    /* ── open detail modal ────────────────────────────── */
    const openDetail = (record) => {
        setSelectedIncident(record);
        setDetailModalOpen(true);
    };

    /* ── image preview ─────────────────────────────────── */
    const handleUploadChange = ({ fileList: newList }) => {
        setFileList(newList);
        const previews = newList.map(f =>
            f.thumbUrl || (f.originFileObj ? URL.createObjectURL(f.originFileObj) : null)
        ).filter(Boolean);
        setPreviewImages(previews);
    };

    /* ── submit new incident ───────────────────────────── */
    const handleReportSubmit = async () => {
        try {
            const values = await reportForm.validateFields();
            setSubmitting(true);
            // TODO: replace with real API → POST /api/incidents
            setTimeout(() => {
                const newIncident = {
                    _id: `INC-${Date.now()}`,
                    invoiceId: { _id: values.invoiceCode, code: values.invoiceCode },
                    reporterId: { fullName: values.reporterName, phone: values.reporterPhone },
                    type: values.type,
                    description: values.description,
                    images: previewImages,
                    status: 'Open',
                    createdAt: new Date().toISOString(),
                    resolution: {},
                };
                setIncidents(prev => [newIncident, ...prev]);
                message.success('Incident report submitted successfully');
                setSubmitting(false);
                setReportModalOpen(false);
                reportForm.resetFields();
                setFileList([]);
                setPreviewImages([]);
            }, 600);
        } catch {
            // validation errors shown inline
        }
    };

    /* ── columns ───────────────────────────────────────── */
    const columns = [
        {
            title: 'Incident ID',
            dataIndex: '_id',
            render: t => <strong>{t}</strong>,
            width: 150,
        },
        {
            title: 'Invoice Code',
            dataIndex: ['invoiceId', 'code'],
            render: t => <a href={`#${t}`} style={{ color: '#1890ff' }}>{t}</a>,
            width: 130,
        },
        {
            title: 'Reporter',
            dataIndex: ['reporterId', 'fullName'],
            width: 160,
        },
        {
            title: 'Type',
            dataIndex: 'type',
            render: getTypeTag,
            width: 110,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: getStatusBadge,
            width: 130,
        },
        {
            title: 'Report Date',
            dataIndex: 'createdAt',
            render: d => dayjs(d).format('DD/MM/YYYY HH:mm'),
            width: 160,
        },
        {
            title: 'Action',
            width: 100,
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    style={{ background: '#44624A', borderColor: '#44624A' }}
                    onClick={() => openDetail(record)}
                >
                    View
                </Button>
            ),
        },
    ];

    /* ── render ─────────────────────────────────────────── */
    return (
        <div style={{ textAlign: 'left' }}>
            {/* ── Page header ──────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Incident Reports</Title>
                <Button
                    type="primary"
                    icon={<WarningOutlined />}
                    style={{ background: '#44624A', borderColor: '#44624A', borderRadius: 8, fontWeight: 600 }}
                    onClick={() => setReportModalOpen(true)}
                >
                    Report Incident
                </Button>
            </div>

            {/* ── Filter bar ───────────────────────────── */}
            <Card style={{ borderRadius: 12, border: 'none', marginBottom: 24, padding: '8px' }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Input
                        placeholder="Search Incident ID, Invoice, or Reporter..."
                        prefix={<SearchOutlined />}
                        style={{ width: 300, borderRadius: 4 }}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                    />
                    <Select placeholder="Incident Type" style={{ width: 150 }} value={filterType} onChange={setFilterType}>
                        <Option value="all">All Types</Option>
                        <Option value="Damage">Damage</Option>
                        <Option value="Delay">Delay</Option>
                        <Option value="Accident">Accident</Option>
                        <Option value="Loss">Loss</Option>
                        <Option value="Other">Other</Option>
                    </Select>
                    <Select placeholder="Status" style={{ width: 160 }} value={filterStatus} onChange={setFilterStatus}>
                        <Option value="all">All Statuses</Option>
                        <Option value="Open">Open</Option>
                        <Option value="Investigating">Investigating</Option>
                        <Option value="Resolved">Resolved</Option>
                        <Option value="Dismissed">Dismissed</Option>
                    </Select>
                    <Button icon={<SyncOutlined />} onClick={() => { setSearchText(''); setFilterType('all'); setFilterStatus('all'); loadData(); }}>Refresh</Button>
                </div>
            </Card>

            {/* ── Table ────────────────────────────────── */}
            <Card style={{ borderRadius: 12, border: 'none' }}>
                <Table
                    columns={columns}
                    dataSource={displayedIncidents}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* ══ DETAIL MODAL ══════════════════════════ */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>Incident Ticket: {selectedIncident?._id}</span>
                        {selectedIncident && getStatusBadge(selectedIncident.status)}
                    </div>
                }
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                footer={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {selectedIncident && `Reported: ${dayjs(selectedIncident.createdAt).format('DD/MM/YYYY HH:mm')}`}
                        </Text>
                        <Button onClick={() => setDetailModalOpen(false)} style={{ borderRadius: 8 }}>Close</Button>
                    </div>
                }
                width="72vw"
                style={{ top: 40 }}
                destroyOnClose
            >
                {selectedIncident && (
                    <Row gutter={[32, 0]} style={{ padding: '8px 0' }}>
                        {/* LEFT: Incident details */}
                        <Col span={14}>
                            <Descriptions
                                bordered
                                column={1}
                                size="middle"
                                labelStyle={{ fontWeight: 600, background: '#fafafa', width: 160, fontSize: 13 }}
                                contentStyle={{ fontSize: 14 }}
                            >
                                <Descriptions.Item label="Related Invoice">
                                    <a href={`#${selectedIncident.invoiceId.code}`} style={{ color: '#1890ff', fontWeight: 600 }}>
                                        {selectedIncident.invoiceId.code}
                                    </a>
                                </Descriptions.Item>
                                <Descriptions.Item label="Reporter">
                                    {selectedIncident.reporterId.fullName}
                                    <span style={{ color: '#888', marginLeft: 8 }}>({selectedIncident.reporterId.phone})</span>
                                </Descriptions.Item>
                                <Descriptions.Item label="Incident Type">{getTypeTag(selectedIncident.type)}</Descriptions.Item>
                                <Descriptions.Item label="Description">
                                    <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14 }}>{selectedIncident.description}</span>
                                </Descriptions.Item>
                            </Descriptions>
                        </Col>

                        {/* RIGHT: Evidence + Resolution */}
                        <Col span={10}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#333' }}>
                                <PictureOutlined style={{ marginRight: 8, color: '#44624A' }} />
                                Evidence Images
                            </div>
                            {selectedIncident.images && selectedIncident.images.length > 0 ? (
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {selectedIncident.images.map((img, idx) => (
                                        img === 'placeholder' ? (
                                            <div key={idx} className="evidence-placeholder">
                                                <PictureOutlined style={{ fontSize: 22, color: '#aaa' }} />
                                                <span style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Evidence {idx + 1}</span>
                                            </div>
                                        ) : (
                                            <Image key={idx} src={img} width={150} height={150}
                                                style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e8e8e8' }} />
                                        )
                                    ))}
                                </div>
                            ) : (
                                <Text type="secondary">No evidence images provided.</Text>
                            )}

                            {selectedIncident.status === 'Resolved' && selectedIncident.resolution?.action && (
                                <>
                                    <Divider style={{ margin: '20px 0 14px' }} />
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#333' }}>Resolution Details</div>
                                    <Card type="inner" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                                        <p style={{ margin: '0 0 6px' }}><strong>Action:</strong> {selectedIncident.resolution.action}</p>
                                        {selectedIncident.resolution.compensationAmount > 0 && (
                                            <p style={{ margin: '0 0 6px' }}><strong>Compensation:</strong>{' '}
                                                <span style={{ color: '#1890ff', fontWeight: 500 }}>
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedIncident.resolution.compensationAmount)}
                                                </span>
                                            </p>
                                        )}
                                        <p style={{ margin: 0 }}><strong>Resolved At:</strong> {dayjs(selectedIncident.resolution.resolvedAt).format('DD/MM/YYYY HH:mm')}</p>
                                    </Card>
                                </>
                            )}
                        </Col>
                    </Row>
                )}
            </Modal>

            {/* ══ REPORT INCIDENT MODAL ══════════════════ */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <WarningOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                        <span>New Incident Report</span>
                    </div>
                }
                open={reportModalOpen}
                onCancel={() => { setReportModalOpen(false); reportForm.resetFields(); setFileList([]); setPreviewImages([]); }}
                footer={null}
                width={600}
                destroyOnClose
            >
                <Form form={reportForm} layout="vertical" style={{ marginTop: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                        <Form.Item
                            label="Related Invoice Code"
                            name="invoiceCode"
                            rules={[{ required: true, message: 'Please enter invoice code' }]}
                        >
                            <Input placeholder="VD: INV-10023" prefix={<span style={{ color: '#1890ff', fontSize: 13 }}>📄</span>} />
                        </Form.Item>

                        <Form.Item
                            label="Incident Type"
                            name="type"
                            rules={[{ required: true, message: 'Please select incident type' }]}
                        >
                            <Select placeholder="Select incident type">
                                <Option value="Damage">Damage</Option>
                                <Option value="Delay">Delay</Option>
                                <Option value="Accident">Accident</Option>
                                <Option value="Loss">Loss</Option>
                                <Option value="Other">Other</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="Reporter Name"
                            name="reporterName"
                            rules={[{ required: true, message: 'Please enter name' }]}
                        >
                            <Input placeholder="Full name" />
                        </Form.Item>

                        <Form.Item
                            label="Phone Number"
                            name="reporterPhone"
                            rules={[{ required: true, message: 'Please enter phone number' }]}
                        >
                            <Input placeholder="VD: 0901234567" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Incident Description"
                        name="description"
                        rules={[{ required: true, message: 'Please describe the incident' }]}
                    >
                        <TextArea
                            rows={4}
                            placeholder="Describe incident in detail (what happened to cargo, where, when...)"
                        />
                    </Form.Item>

                    {/* Evidence upload */}
                    <Form.Item label="Evidence Images (optional)">
                        <Upload
                            listType="picture-card"
                            fileList={fileList}
                            onChange={handleUploadChange}
                            beforeUpload={() => false}
                            accept="image/*"
                            multiple
                        >
                            {fileList.length >= 6 ? null : (
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8, fontSize: 12 }}>Upload</div>
                                </div>
                            )}
                        </Upload>
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                        <Button
                            onClick={() => { setReportModalOpen(false); reportForm.resetFields(); setFileList([]); }}
                            style={{ borderRadius: 8 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            loading={submitting}
                            onClick={handleReportSubmit}
                            icon={<UploadOutlined />}
                            style={{ background: '#44624A', borderColor: '#44624A', borderRadius: 8, fontWeight: 600 }}
                        >
                            Submit Report
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default StaffIncidentReport;
