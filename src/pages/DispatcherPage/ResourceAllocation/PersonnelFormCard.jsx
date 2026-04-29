import React from 'react';
import { Card, Button, Select, Form, Divider, Tag, Row, Col, Space, Typography, message } from 'antd';
import { ReloadOutlined, BulbOutlined, CarOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

const TRUCK_TYPE_LABELS = {
    '500KG': 'Xe 500 KG',
    '1TON': 'Xe 1 Tấn',
    '1.5TON': 'Xe 1.5 Tấn',
    '2TON': 'Xe 2 Tấn',
    '5000KG': 'Xe 5 Tấn',
};

const transTruckType = (code) => TRUCK_TYPE_LABELS[code] || code;

const renderVehicleTags = (svData) => {
    if (svData.suggestedVehicles?.length > 0) {
        return svData.suggestedVehicles.map((v, idx) => (
            <Tag key={idx} color="default" style={{ margin: '2px 4px 2px 0', border: '1px dashed #c0cfb2', color: '#44624a', background: '#fafafa' }}>
                <strong>{v.count || 1}</strong> x {transTruckType(v.vehicleType)}
            </Tag>
        ));
    }
    if (svData.suggestedVehicle) {
        return (
            <Tag color="default" style={{ margin: '2px 4px 2px 0', border: '1px dashed #c0cfb2', color: '#44624a', background: '#fafafa' }}>
                <strong>1</strong> x {transTruckType(svData.suggestedVehicle)}
            </Tag>
        );
    }
    return <span style={{ color: '#8ba888' }}>Chưa xác định</span>;
};

const renderResourceOption = (resource) => {
    let tag;
    if (resource.availabilityStatus === 'UNAVAILABLE') {
        tag = <Tag color="error" bordered={false} style={{ margin: 0 }}>Đang bận</Tag>;
    } else if (resource.availabilityStatus === 'TIGHT') {
        tag = <Tag color="warning" bordered={false} style={{ margin: 0 }}>Sát giờ</Tag>;
    } else {
        tag = <Tag color="#44624a" bordered={false} style={{ margin: 0, color: '#fff' }}>Sẵn sàng</Tag>;
    }
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ opacity: resource.availabilityStatus === 'UNAVAILABLE' ? 0.5 : 1 }}>
                {resource.fullName} - {resource.phone}
            </span>
            {tag}
        </div>
    );
};

const PersonnelFormCard = ({
    selectedInvoice,
    drivers,
    staff,
    currentLeaderId,
    currentDriverIds,
    currentStaffIds = [],
    totalHours,
    missingStaffCount: missingStaff,
    originalHours,
    penaltyHours,
    handleAutoFill,
    setReloadTrigger,
}) => {
    const svData = selectedInvoice?.requestTicketId?.surveyDataId;

    return (
        <Card
            size="small"
            title={<Space><Text strong>Cấu hình Nhân sự & Phương tiện</Text></Space>}
            extra={
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        size="small"
                        onClick={() => {
                            setReloadTrigger(prev => prev + 1);
                            message.success('Đã lấy dữ liệu nhân sự mới nhất!');
                        }}
                    >
                        Làm mới tải trọng
                    </Button>
                    <Button type="dashed" danger onClick={handleAutoFill} size="small" style={{ borderRadius: '8px' }}>
                        ✨ Smart Auto-fill
                    </Button>
                </Space>
            }
            styles={{ header: { minHeight: '36px', background: '#f8f9fa' } }}
        >
            {/* Survey suggestion block */}
            {svData && (
                <div style={{ background: '#fafafa', border: '1px solid #c0cfb2', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                        <BulbOutlined style={{ fontSize: '18px', color: '#8ba888', marginRight: '8px' }} />
                        <span style={{ fontWeight: '600', color: '#44624a', fontSize: '15px' }}>Đề xuất Hệ thống (Dựa trên khối lượng)</span>
                    </div>
                    <Row gutter={[16, 16]} align="stretch">
                        <Col span={12}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #c0cfb2', height: '100%' }}>
                                <div style={{ background: '#f5f5f5', padding: '6px', borderRadius: '50%', color: '#44624a', display: 'flex' }}>
                                    <CarOutlined />
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#8ba888', marginBottom: '4px' }}>Phương tiện</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>{renderVehicleTags(svData)}</div>
                                </div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #c0cfb2', height: '100%' }}>
                                <div style={{ background: '#f5f5f5', padding: '6px', borderRadius: '50%', color: '#8ba888', display: 'flex' }}>
                                    <TeamOutlined />
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#8ba888', marginBottom: '4px' }}>Nhân sự bốc xếp</div>
                                    <div style={{ fontWeight: '500', color: '#44624a' }}>{svData.suggestedStaffCount || '?'} người</div>
                                </div>
                            </div>
                        </Col>
                        <Col span={24}>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                background: '#ffffff', 
                                padding: '10px 14px', 
                                borderRadius: '6px', 
                                border: '1px solid #c0cfb2',
                                marginTop: '4px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ background: '#f5f5f5', padding: '6px', borderRadius: '50%', color: '#8ba888', display: 'flex' }}>
                                        <CalendarOutlined />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#8ba888' }}>Thời gian hoàn thành dự kiến</div>
                                        <div style={{ 
                                            fontWeight: '700', 
                                            fontSize: '15px',
                                            color: totalHours > 10 ? '#f5222d' : '#44624a' 
                                        }}>
                                            {totalHours.toFixed(1)} giờ 
                                            {missingStaff > 0 && (
                                                <span style={{ fontSize: '12px', fontWeight: '400', marginLeft: '8px', color: '#8c8c8c' }}>
                                                    (Gốc: {originalHours}h + {penaltyHours.toFixed(1)}h bù thiếu {missingStaff} người)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {totalHours > 10 && (
                                    <Tag color="error" style={{ margin: 0 }}>Vượt giới hạn 10h</Tag>
                                )}
                            </div>
                        </Col>
                    </Row>
                </div>
            )}

            <Divider orientation="left" style={{ margin: '8px 0', fontSize: '13px' }}>Đội ngũ nhân sự</Divider>

            <Form.Item
                name="leaderId"
                label="Trưởng nhóm (Bắt buộc)"
                rules={[{ required: true, message: 'Vui lòng chọn 1 tài xế làm trưởng nhóm' }]}
            >
                <Select placeholder="Chọn tên tài xế (Trưởng nhóm)" style={{ width: '100%' }} allowClear optionLabelProp="label" menuItemSelectedIcon={null}>
                    {drivers.map(d => (
                        <Option key={d._id} value={d._id} disabled={d.availabilityStatus === 'UNAVAILABLE' || currentDriverIds.includes(d._id)} label={d.fullName}>
                            {renderResourceOption(d)}
                        </Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item name="driverIds" label="Tài xế phụ">
                <Select mode="multiple" maxTagCount="responsive" placeholder="Chọn tên tài xế bổ sung" allowClear optionLabelProp="label" menuItemSelectedIcon={null}>
                    {drivers.map(d => (
                        <Option key={d._id} value={d._id} disabled={d.availabilityStatus === 'UNAVAILABLE' || d._id === currentLeaderId} label={d.fullName}>
                            {renderResourceOption(d)}
                        </Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item name="staffIds" label="Nhân viên phụ bốc xếp">
                <Select mode="multiple" maxTagCount="responsive" placeholder="Chọn tên nhân viên bốc xếp" allowClear optionLabelProp="label" menuItemSelectedIcon={null}>
                    {staff.map(s => (
                        <Option key={s._id} value={s._id} disabled={s.availabilityStatus === 'UNAVAILABLE'} label={s.fullName}>
                            {renderResourceOption(s)}
                        </Option>
                    ))}
                </Select>
            </Form.Item>
        </Card>
    );
};

export default PersonnelFormCard;
