import React, { useState } from 'react';
import { Modal, Alert, Space, Typography, Card, Button, Tag, Progress, Divider, Checkbox, Row, Col } from 'antd';
import { CalendarOutlined, InfoCircleOutlined, WarningOutlined, CloseCircleOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
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
}) => {
    const [understoodRisk, setUnderstoodRisk] = useState(false);

    if (!data) return null;

    const feasibility = data.feasibility || {};
    const decision = feasibility.decision || 'CONFIRM';
    const staffingRatio = feasibility.staffingRatio || 0;
    const staffingLevel = feasibility.staffingLevel || 'SAFE';
    const hasConflict = feasibility.hasConflict || false;
    const impactLevel = feasibility.impactLevel || 'LOW';

    const getStaffingColor = (level) => {
        if (level === 'SAFE') return '#52c41a';
        if (level === 'WARNING') return '#faad14';
        return '#f5222d';
    };

    const sameTeam =
        !data.suggestedTeam?.leaderId ||
        (data.valuesSnapshot &&
            data.suggestedTeam.leaderId === data.valuesSnapshot.leaderId &&
            (data.suggestedTeam.driverIds || []).length === (data.valuesSnapshot.driverIds || []).length &&
            (data.suggestedTeam.staffIds || []).length === (data.valuesSnapshot.staffIds || []).length);

    const renderHeader = () => {
        if (decision === 'BLOCK') {
            return (
                <Alert
                    type="error"
                    showIcon
                    icon={<CloseCircleOutlined />}
                    message={<Text strong style={{ fontSize: 16 }}>ĐIỀU PHỐI BỊ CHẶN</Text>}
                    description="Kế hoạch này vi phạm các tiêu chuẩn an toàn hoặc giới hạn thời gian (10h). Không thể thực hiện dispatch với cấu hình này."
                />
            );
        }
        if (decision === 'REQUIRE_CUSTOMER') {
            return (
                <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message={<Text strong style={{ fontSize: 16 }}>CẦN KHÁCH HÀNG PHÊ DUYỆT</Text>}
                    description="Mức độ thiếu hụt nhân sự nghiêm trọng (< 50%). Hệ thống yêu cầu gửi đề xuất để khách hàng xác nhận chấp nhận rủi ro hoặc dời lịch."
                />
            );
        }
        return (
            <Alert
                type="warning"
                showIcon
                message={<Text strong style={{ fontSize: 16 }}>CẢNH BÁO RỦI RO LỊCH TRÌNH</Text>}
                description="Việc thiếu nhân sự hoặc xung đột thời gian có thể ảnh hưởng đến chất lượng dịch vụ và các đơn hàng tiếp theo."
            />
        );
    };

    return (
        <Modal
            title={
                <Space>
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    <span>Đánh giá tính khả thi điều phối</span>
                </Space>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={700}
            centered
        >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                {renderHeader()}

                {/* Dashboard Layer */}
                <Card size="small" className="feasibility-dashboard" style={{ background: '#fafafa', borderRadius: 8 }}>
                    <Row gutter={[24, 16]}>
                        <Col span={12}>
                            <div style={{ marginBottom: 8 }}>
                                <Text type="secondary" size="small">Mức độ đáp ứng nhân sự</Text>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <Progress 
                                        percent={Math.round(staffingRatio * 100)} 
                                        strokeColor={getStaffingColor(staffingLevel)}
                                        size="small"
                                        showInfo={false}
                                    />
                                    <Tag color={getStaffingColor(staffingLevel)} style={{ margin: 0 }}>
                                        {staffingLevel === 'SAFE' ? 'AN TOÀN' : staffingLevel === 'WARNING' ? 'CẢNH BÁO' : 'TỚI HẠN'}
                                    </Tag>
                                </div>
                                <Text style={{ fontSize: 12 }}>
                                    {Math.round(staffingRatio * 100)}% yêu cầu ({feasibility.estimatedDuration / 60}h dự kiến)
                                </Text>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div style={{ marginBottom: 8 }}>
                                <Text type="secondary" size="small">Xung đột lịch trình (Domino Effect)</Text>
                                <div style={{ marginTop: 4 }}>
                                    {hasConflict ? (
                                        <Space direction="vertical" size={2}>
                                            <Tag color={impactLevel === 'HIGH' ? 'red' : 'orange'} icon={<WarningOutlined />}>
                                                XUNG ĐỘT {impactLevel === 'HIGH' ? 'CAO' : 'THẤP'}
                                            </Tag>
                                            <Text type="danger" style={{ fontSize: 12 }}>
                                                Gây trễ đơn sau khoảng {Math.round(feasibility.maxDelayMinutes)} phút
                                            </Text>
                                        </Space>
                                    ) : (
                                        <Tag color="green" icon={<CheckCircleOutlined />}>KHÔNG CÓ XUNG ĐỘT</Tag>
                                    )}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Card>

                <div>
                    <Text strong>Các phương án xử lý:</Text>

                    {/* Option 1: Rebuild team */}
                    <Card size="small" style={{ marginTop: 12, borderLeft: '4px solid #1890ff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1, paddingRight: 16 }}>
                                <Text strong>1. Tái cấu trúc theo thực tế (Hệ thống gợi ý)</Text>
                                <div style={{ color: '#595959', fontSize: 13, marginTop: 4 }}>
                                    {sameTeam ? (
                                        <Text type="secondary">Không tìm thấy đội hình thay thế nào rảnh vào giờ này.</Text>
                                    ) : (
                                        <span>Cập nhật Form với nhân sự rảnh rỗi nhất hiện tại.</span>
                                    )}
                                </div>
                            </div>
                            <Button type="primary" onClick={onRebuildTeam} disabled={sameTeam}>
                                Áp dụng
                            </Button>
                        </div>
                    </Card>

                    {/* Option 2: Pick alternative time */}
                    <Card size="small" style={{ marginTop: 12, borderLeft: '4px solid #44624a' }}>
                        <div>
                            <Text strong>2. Dời thời gian vận chuyển sang khung giờ trống</Text>
                            <div style={{ marginTop: 8 }}>
                                {data.nextAvailableSlots?.length > 0 ? (
                                    <Space wrap size={[8, 8]}>
                                        {data.nextAvailableSlots.map((s, i) => (
                                            <Tag
                                                key={i}
                                                color="#44624a"
                                                style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: 4 }}
                                                onClick={() => onPickAlternativeTime(s)}
                                            >
                                                <CalendarOutlined style={{ marginRight: 4 }} />
                                                {dayjs(s).format('HH:mm - DD/MM')}
                                            </Tag>
                                        ))}
                                    </Space>
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 13 }}>Không tìm thấy khung giờ thay thế khả thi.</Text>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Option 3: Force/Proposal */}
                    <Divider style={{ margin: '24px 0 16px' }} />
                    
                    {decision === 'BLOCK' ? (
                        <div style={{ textAlign: 'center', padding: '12px', background: '#fff1f0', borderRadius: 8 }}>
                            <Text type="danger" strong>
                                <CloseCircleOutlined /> Kế hoạch bị chặn do vượt quá giới hạn an toàn.
                            </Text>
                        </div>
                    ) : (
                        <Card size="small" style={{ 
                            background: decision === 'REQUIRE_CUSTOMER' ? '#fff7e6' : '#fff1f0', 
                            borderColor: decision === 'REQUIRE_CUSTOMER' ? '#ffd591' : '#ffa39e' 
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, paddingRight: 16 }}>
                                    <Text strong type={decision === 'REQUIRE_CUSTOMER' ? 'warning' : 'danger'}>
                                        {decision === 'REQUIRE_CUSTOMER' ? 'Gửi đề xuất cho Khách hàng' : 'Vẫn tiến hành (Chấp nhận rủi ro)'}
                                    </Text>
                                    <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                                        {decision === 'REQUIRE_CUSTOMER' 
                                            ? 'Mức độ thiếu hụt lớn. Sau khi bạn xác nhận, khách hàng sẽ nhận được thông báo và cần nhấn "Chấp nhận" để ca vận chuyển bắt đầu.'
                                            : hasConflict 
                                                ? 'Lưu ý: Lựa chọn này sẽ trực tiếp làm trễ các đơn hàng tiếp theo và yêu cầu khách hàng xác nhận chấp nhận rủi ro trễ lịch.'
                                                : 'Lưu ý: Thiếu hụt nhân sự sẽ được gửi tới khách hàng để xác nhận chấp nhận rủi ro.'}
                                    </div>
                                    <Checkbox 
                                        style={{ marginTop: 8 }}
                                        checked={understoodRisk}
                                        onChange={e => setUnderstoodRisk(e.target.checked)}
                                    >
                                        Tôi xác nhận và {decision === 'REQUIRE_CUSTOMER' ? 'muốn gửi đề xuất này' : 'chấp nhận rủi ro trễ lịch'}
                                    </Checkbox>
                                </div>
                                <Button 
                                    type="primary"
                                    danger={decision !== 'REQUIRE_CUSTOMER'}
                                    style={decision === 'REQUIRE_CUSTOMER' ? { background: '#faad14', borderColor: '#faad14' } : {}}
                                    onClick={onForceProceed} 
                                    loading={submitting}
                                    disabled={!understoodRisk}
                                >
                                    Xác nhận Force Dispatch
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            </Space>
        </Modal>
    );
};

export default InsufficientResourcesModal;
