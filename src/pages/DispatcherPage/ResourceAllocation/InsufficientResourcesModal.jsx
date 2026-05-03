import React, { useState } from 'react';
import { Modal, Alert, Space, Typography, Card, Button, Tag, Progress, Checkbox, Row, Col, Table, Tooltip } from 'antd';
import {
    CalendarOutlined,
    WarningOutlined,
    CloseCircleOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    TeamOutlined,
    CarOutlined,
    SafetyCertificateOutlined,
    RocketOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const InsufficientResourcesModal = ({
    open,
    onClose,
    data,
    submitting,
    onRebuildTeam,
    onPickAlternativeTime,
    onForceProceed,
    onExternalStaff,
}) => {
    const [understoodRisk, setUnderstoodRisk] = useState(false);

    if (!data) return null;

    const feasibility = data.feasibility || {};
    const decision = feasibility.decision || 'CONFIRM';
    const staffingRatio = feasibility.staffingRatio || 0;
    const staffingLevel = feasibility.staffingLevel || 'SAFE';
    const hasConflict = feasibility.hasConflict || false;
    const impactLevel = feasibility.impactLevel || 'LOW';
    const shortages = data.shortages || {};

    const isMissingDriver = (shortages.missing?.leader > 0) || (shortages.missing?.drivers > 0);

    const getStaffingColor = (level) => {
        if (level === 'SAFE') return '#52c41a';
        if (level === 'WARNING') return '#faad14';
        return '#f5222d';
    };

    const getImpactColor = (level) => {
        if (level === 'HIGH') return '#f5222d';
        if (level === 'LOW') return '#faad14';
        return '#52c41a';
    };

    const sameTeam =
        !data.suggestedTeam?.leaderId ||
        (data.valuesSnapshot &&
            data.suggestedTeam.leaderId === data.valuesSnapshot.leaderId &&
            (data.suggestedTeam.driverIds || []).length === (data.valuesSnapshot.driverIds || []).length &&
            (data.suggestedTeam.staffIds || []).length === (data.valuesSnapshot.staffIds || []).length);

    const resourceColumns = [
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Cần',
            dataIndex: 'required',
            key: 'required',
            align: 'center',
            render: (val) => <Tag color="blue" style={{ margin: 0 }}>{val}</Tag>
        },
        {
            title: 'Có',
            dataIndex: 'available',
            key: 'available',
            align: 'center',
            render: (val, record) => (
                <Tag color={val < record.required ? 'red' : 'green'} style={{ margin: 0 }}>{val}</Tag>
            )
        },
        {
            title: 'Thiếu',
            dataIndex: 'missing',
            key: 'missing',
            align: 'center',
            render: (val) => val > 0 ? <Text type="danger" strong>-{val}</Text> : <CheckCircleOutlined style={{ color: '#52c41a' }} />
        }
    ];

    const resourceData = [
        { role: 'Đội trưởng', required: shortages.required?.leader || 0, available: shortages.available?.leader || 0, missing: shortages.missing?.leader || 0 },
        { role: 'Tài xế', required: shortages.required?.drivers || 0, available: shortages.available?.drivers || 0, missing: shortages.missing?.drivers || 0 },
        { role: 'Bốc hàng', required: shortages.required?.helpers || 0, available: shortages.available?.helpers || 0, missing: shortages.missing?.helpers || 0 },
    ];

    const renderHeader = () => {
        if (isMissingDriver) {
            return (
                <Alert
                    type="error"
                    showIcon
                    icon={<CarOutlined />}
                    message={<Text strong style={{ fontSize: 15 }}>THIẾU TÀI XẾ</Text>}
                    description="Không có đủ nhân sự lái xe cho số lượng xe yêu cầu."
                    style={{ borderRadius: 8, borderLeftWidth: 4 }}
                />
            );
        }
        if (decision === 'BLOCK') {
            return (
                <Alert
                    type="error"
                    showIcon
                    icon={<CloseCircleOutlined />}
                    message={<Text strong style={{ fontSize: 15 }}>ĐIỀU PHỐI BỊ CHẶN</Text>}
                    description="Vi phạm các tiêu chuẩn an toàn hoặc vượt giới hạn thời gian."
                    style={{ borderRadius: 8, borderLeftWidth: 4 }}
                />
            );
        }
        // if (decision === 'REQUIRE_CUSTOMER') {
        //     return (
        //         <Alert
        //             type="warning"
        //             showIcon
        //             icon={<WarningOutlined />}
        //             message={<Text strong style={{ fontSize: 15 }}>CẦN DUYỆT</Text>}
        //             description="Nhân sự < 50%. Chỉ có thể gửi đề xuất để khách hàng xác nhận."
        //             style={{ borderRadius: 8, borderLeftWidth: 4 }}
        //         />
        //     );
        // }
        return (
            <Alert
                type="warning"
                showIcon
                message={<Text strong style={{ fontSize: 15 }}>RỦI RO LỊCH TRÌNH</Text>}
                description="Hệ thống phát hiện hạn chế về nhân sự hoặc xung đột thời gian."
                style={{ borderRadius: 8, borderLeftWidth: 4 }}
            />
        );
    };

    return (
        <Modal
            title={
                <Space>
                    <SafetyCertificateOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                    <span style={{ fontSize: 16 }}>Phân Tích Tính Khả Thi Điều Phối</span>
                </Space>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={1200}
            centered
            className="feasibility-modal"
            destroyOnHidden
        >
            <style>
                {`
                .feasibility-modal .ant-modal-content {
                    border-radius: 12px;
                    overflow: hidden;
                    padding-bottom: 24px;
                }
                .option-card {
                    transition: all 0.3s ease;
                    border-left-width: 4px !important;
                }
                .option-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }
                .time-slot-tag {
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }
                .time-slot-tag:hover {
                    border-color: #44624a;
                    background: #eef2ef !important;
                    color: #44624a !important;
                }
                .dashboard-item {
                    text-align: center;
                    padding: 12px 8px;
                    border-radius: 8px;
                    background: #fff;
                    box-shadow: inset 0 0 0 1px #f0f0f0;
                    height: 100%;
                }
                `}
            </style>

            <Row gutter={[24, 0]}>
                {/* ================= LEFT COLUMN: DIAGNOSTICS ================= */}
                <Col span={11}>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        {renderHeader()}

                        <Card size="small" style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                            <Row gutter={[12, 12]} align="stretch">
                                <Col span={8}>
                                    <div className="dashboard-item">
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Nhân sự đáp ứng</Text>
                                        <Title level={4} style={{ margin: 0, color: getStaffingColor(staffingLevel) }}>
                                            {Math.round(staffingRatio * 100)}%
                                        </Title>
                                        <Progress
                                            percent={Math.round(staffingRatio * 100)}
                                            strokeColor={getStaffingColor(staffingLevel)}
                                            showInfo={false}
                                            size="small"
                                            style={{ margin: 0 }}
                                        />
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div className="dashboard-item">
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Dự kiến</Text>
                                        <Title level={4} style={{ margin: 0 }}>
                                            {(feasibility.estimatedDuration / 60).toFixed(1)}h
                                        </Title>
                                        <Tag icon={<ClockCircleOutlined />} color={feasibility.durationExceeded ? 'red' : 'blue'} style={{ margin: 0, fontSize: 10 }}>
                                            {feasibility.durationExceeded ? 'VƯỢT GIỚI HẠN' : 'TRONG TẦM'}
                                        </Tag>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div className="dashboard-item">
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Xung đột</Text>
                                        <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {hasConflict ? (
                                                <Tooltip title={`Ảnh hưởng đơn tiếp theo khoảng ${Math.round(feasibility.maxDelayMinutes)} phút`}>
                                                    <Tag color={getImpactColor(impactLevel)} icon={<WarningOutlined />} style={{ margin: 0, fontSize: 10 }}>
                                                        CÓ ({impactLevel})
                                                    </Tag>
                                                </Tooltip>
                                            ) : (
                                                <Tag color="green" icon={<CheckCircleOutlined />} style={{ margin: 0, fontSize: 10 }}>AN TOÀN</Tag>
                                            )}
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </Card>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <TeamOutlined style={{ color: '#1890ff' }} />
                                <Text strong>Chi tiết nhân sự thực tế:</Text>
                            </div>
                            <Table
                                dataSource={resourceData}
                                columns={resourceColumns}
                                pagination={false}
                                size="small"
                                bordered
                                style={{ borderRadius: 8, overflow: 'hidden' }}
                            />
                        </div>
                    </Space>
                </Col>

                {/* ================= RIGHT COLUMN: ACTIONS ================= */}
                <Col span={13}>
                    <div style={{ paddingLeft: 8, borderLeft: '1px solid #f0f0f0', height: '100%' }}>
                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 14, color: '#44624a' }}>CÁC PHƯƠNG ÁN XỬ LÝ GỢI Ý</Text>
                        </div>

                        {/* Option 1: Rebuild team */}
                        <Card size="small" className="option-card" style={{ borderLeftColor: '#1890ff', marginBottom: 12 }}>
                            <Row align="middle" gutter={12}>
                                <Col flex="auto">
                                    <Space align="start">
                                        <RocketOutlined style={{ color: '#1890ff', fontSize: 16, marginTop: 4 }} />
                                        <div>
                                            <Text strong>Tái cấu trúc đội hình</Text>
                                            <div style={{ color: '#64748b', fontSize: 12 }}>
                                                {sameTeam ? 'Hệ thống không tìm thấy đội hình nào rảnh hơn vào giờ này.' : 'Hoán đổi sang nhân sự đang rảnh rỗi và gần điểm lấy hàng.'}
                                            </div>
                                        </div>
                                    </Space>
                                </Col>
                                <Col>
                                    <Button type="primary" ghost onClick={onRebuildTeam} disabled={sameTeam} size="small">
                                        Áp dụng
                                    </Button>
                                </Col>
                            </Row>
                        </Card>

                        {/* Option 2: Alternative Time Slots */}
                        <Card size="small" className="option-card" style={{ borderLeftColor: '#44624a', marginBottom: 12 }}>
                            <div style={{ marginBottom: 8 }}>
                                <Space>
                                    <CalendarOutlined style={{ color: '#44624a', fontSize: 16 }} />
                                    <Text strong>Đổi sang khung giờ có đủ nhân sự</Text>
                                </Space>
                            </div>
                            {data.nextAvailableSlots?.length > 0 ? (
                                <Space wrap size={[8, 8]} style={{ paddingLeft: 24 }}>
                                    {data.nextAvailableSlots.map((s) => (
                                        <Tag
                                            key={s}
                                            color="#f0fdf4"
                                            className="time-slot-tag"
                                            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: '#166534', border: '1px solid #bcf0da' }}
                                            onClick={() => onPickAlternativeTime(s)}
                                        >
                                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                                            {dayjs(s).format('HH:mm - DD/MM')}
                                        </Tag>
                                    ))}
                                </Space>
                            ) : (
                                <div style={{ paddingLeft: 24 }}>
                                    <Text type="secondary" italic style={{ fontSize: 12 }}>Không tìm thấy khung giờ trống khả thi trong 48h tới.</Text>
                                </div>
                            )}
                        </Card>

                        {/* Option 3: External Staff */}
                        <Card size="small" className="option-card" style={{ borderLeftColor: isMissingDriver ? '#d9d9d9' : '#52c41a', marginBottom: 16 }}>
                            <Row align="middle" gutter={12}>
                                <Col flex="auto">
                                    <Space align="start">
                                        <TeamOutlined style={{ color: isMissingDriver ? '#bfbfbf' : '#52c41a', fontSize: 16, marginTop: 4 }} />
                                        <div>
                                            <Text strong style={{ color: isMissingDriver ? '#bfbfbf' : 'inherit' }}>Sử dụng nhân sự thuê ngoài</Text>
                                            <div style={{ color: '#64748b', fontSize: 12 }}>
                                                Bù đắp phần thiếu hụt bằng cộng tác viên tạp vụ.
                                            </div>
                                        </div>
                                    </Space>
                                </Col>
                                <Col>
                                    <Tooltip title={isMissingDriver ? "Chỉ hỗ trợ thuê tạp vụ ngoài. Không thể áp dụng cho tài xế." : ""}>
                                        <Button
                                            size="small"
                                            style={isMissingDriver ? {} : { borderColor: '#52c41a', color: '#52c41a' }}
                                            onClick={onExternalStaff}
                                            loading={submitting}
                                            disabled={isMissingDriver}
                                        >
                                            Thuê ngoài
                                        </Button>
                                    </Tooltip>
                                </Col>
                            </Row>
                        </Card>

                        {/* Final Action: Force Dispatch */}
                        <div>
                            {isMissingDriver ? (
                                <Alert
                                    type="error"
                                    message={<Text strong style={{ fontSize: 13 }}>Cưỡng ép bị chặn (Thiếu Tài xế)</Text>}
                                    description={<span style={{ fontSize: 12 }}>Bắt buộc phải có 1 Tài xế phụ trách phương tiện.</span>}
                                    showIcon
                                />
                            ) : decision === 'BLOCK' ? (
                                <Alert
                                    type="error"
                                    message={<Text strong style={{ fontSize: 13 }}>Cưỡng ép bị chặn</Text>}
                                    description={<span style={{ fontSize: 12 }}>Không thể điều phối do không đáp ứng đủ điều kiện.</span>}
                                    showIcon
                                />
                            ) : (
                                <Card
                                    size="small"
                                    style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8 }}>
                                    <Row gutter={12} align="middle">
                                        <Col flex="auto">
                                            <div style={{ marginBottom: 4 }}>
                                                <ExclamationCircleOutlined style={{ color: '#dc2626', marginRight: 6 }} />
                                                <Text strong type={'danger'}>
                                                    Cưỡng ép điều phối
                                                </Text>
                                            </div>
                                            <Checkbox checked={understoodRisk} onChange={e => setUnderstoodRisk(e.target.checked)}>
                                                <Text style={{ fontSize: 12 }}>Tôi chấp nhận rủi ro vận hành.</Text>
                                            </Checkbox>
                                        </Col>
                                        <Col>
                                            <Button
                                                type="primary"
                                                danger
                                                // style={decision === 'REQUIRE_CUSTOMER' ? { background: '#faad14', borderColor: '#faad14' } : {}}
                                                onClick={onForceProceed}
                                                loading={submitting}
                                                disabled={!understoodRisk}
                                                icon={<RocketOutlined />}
                                            >
                                                {/* {decision === 'REQUIRE_CUSTOMER' ? 'Gửi đề xuất' : 'Cưỡng ép'} */}
                                                Cưỡng ép
                                            </Button>
                                        </Col>
                                    </Row>
                                </Card>
                            )}
                        </div>
                    </div>
                </Col>
            </Row>
        </Modal>
    );
};

export default InsufficientResourcesModal;