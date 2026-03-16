import React from "react";
import { Modal, Button, Empty, Row, Col, message } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, InboxOutlined, WarningOutlined, InfoCircleOutlined } from "@ant-design/icons";
import orderService from "../../services/orderService";

const { confirm } = Modal;

const SurveyTimeModal = ({ visible, onClose, ticket, survey, onSuccess }) => {
    
    const handleAcceptTime = async (time) => {
        try {
            await orderService.acceptSurveyTime(ticket._id, time);
            message.success("Đã chấp nhận lịch khảo sát");
            onSuccess(ticket._id, { status: "WAITING_SURVEY", scheduledTime: time }); // Truyền data thay đổi về cha
            onClose();
        } catch (err) {
            message.error(err.response?.data?.message || err.message);
        }
    };

    const handleCancelOrder = () => {
        confirm({
            title: "Bạn có chắc muốn hủy yêu cầu chuyển nhà?",
            content: "Yêu cầu này sẽ bị hủy và không thể khôi phục.",
            okText: "Xác nhận hủy",
            okType: "danger",
            cancelText: "Quay lại",
            onOk: async () => {
                try {
                    await orderService.cancelOrder(ticket._id, "Khách hàng từ chối lịch khảo sát");
                    message.success("Đã hủy yêu cầu chuyển nhà");
                    onSuccess(ticket._id, { status: "CANCELLED" }); // Truyền trạng thái Hủy về cha
                    onClose();
                } catch (err) {
                    message.error(err.response?.data?.message || err.message);
                }
            }
        });
    };

    return (
        <Modal
            title="Chọn thời gian khảo sát"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={700}
        >
            {ticket?.rescheduleReason && (
                <div style={{ background: "#fff7e6", border: "1px solid #ffd591", padding: "10px", borderRadius: "6px", marginBottom: "15px" }}>
                    <b>Lý do đề xuất lịch mới:</b> {ticket.rescheduleReason}
                </div>
            )}
            {ticket?.dispatcherId && (
                <div style={{ background: "#f6ffed", border: "1px solid #b7eb8f", padding: "10px", borderRadius: "6px", marginBottom: "15px" }}>
                    <b>Nhân viên khảo sát:</b> {ticket.dispatcherId.fullName}
                    {ticket.dispatcherId.phone && ` - ${ticket.dispatcherId.phone}`}
                </div>
            )}

            {ticket?.proposedSurveyTimes?.map((time, index) => (
                <div key={index} style={{ border: "1px solid #ddd", padding: "12px", borderRadius: "6px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>
                        {new Date(time).toLocaleString("vi-VN", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                    </span>
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAcceptTime(time)}>
                        Chấp nhận
                    </Button>
                </div>
            ))}

            {ticket?.proposedSurveyTimes?.length > 0 && (
                <div style={{ marginTop: 20, textAlign: "right" }}>
                    <Button danger icon={<CloseCircleOutlined />} onClick={handleCancelOrder}>
                        Hủy yêu cầu
                    </Button>
                </div>
            )}

            {ticket?.proposedSurveyTimes?.length === 0 && (
                <Empty description="Chưa có lịch khảo sát" />
            )}

            {/* Danh sách đồ đạc nếu có */}
            {survey && (
                <section className="order-options-section" style={{ marginTop: 24 }}>
                    <div style={{ marginBottom: 20, paddingLeft: 5 }}>
                        <h2 style={{ color: '#44624A', fontSize: 20, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <InboxOutlined style={{ color: '#44624A' }} />
                            Danh sách đồ đạc khảo sát
                        </h2>
                        <p style={{ color: '#666', margin: 0 }}>
                            Đơn <strong>#{ticket?.code?.slice(-10).toUpperCase()}</strong> — {survey.items?.length || 0} món đồ
                        </p>
                    </div>

                    <Row gutter={[16, 16]}>
                        {(survey.items ||[]).map((item, idx) => {
                            const isCritical = item.name?.startsWith('⚠️') || item.name?.startsWith('[CRIT');
                            const isSec = item.name?.startsWith('[SEC:');
                            const displayName = isSec ? item.name.replace(/^\[SEC:[^\]]+\]\s*/, '') : item.name?.replace('⚠️ ', '') || item.name;
                            const conditionLabel = { GOOD: 'Tốt', FRAGILE: 'Dễ vỡ', DAMAGED: 'Hư hỏng' }[item.condition] || item.condition;
                            const conditionColor = { GOOD: '#52c41a', FRAGILE: '#ff4d4f', DAMAGED: '#fa8c16' }[item.condition] || '#aaa';
                            const cardBorder = isCritical ? '#ff4d4f' : isSec ? '#faad14' : '#d9d9d9';
                            const cardBg = isCritical ? '#fff1f0' : isSec ? '#fffbe6' : '#fafafa';

                            return (
                                <Col xs={24} sm={12} md={12} lg={8} key={idx}>
                                    <div style={{ border: `1.5px solid ${cardBorder}`, background: cardBg, borderRadius: 10, padding: '12px 14px', height: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span style={{ fontWeight: 600, fontSize: 13, color: isCritical ? '#cf1322' : '#222', flex: 1, marginRight: 4 }}>
                                                {isCritical && <WarningOutlined style={{ marginRight: 4, color: '#ff4d4f' }} />}
                                                {displayName}
                                            </span>
                                            {item.condition && <span style={{ fontSize: 11, color: conditionColor, fontWeight: 600, whiteSpace: 'nowrap' }}>● {conditionLabel}</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, color: '#777', fontSize: 12 }}>
                                            {item.actualWeight > 0 && <span><InfoCircleOutlined style={{ marginRight: 3 }} />{item.actualWeight} kg</span>}
                                            {item.actualVolume > 0 && <span>{item.actualVolume} m³</span>}
                                        </div>
                                        {item.notes && <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>{item.notes}</div>}
                                    </div>
                                </Col>
                            );
                        })}
                        {(!survey.items || survey.items.length === 0) && (
                            <Col span={24}>
                                <Empty description="Chưa có danh sách đồ đạc từ khảo sát" />
                            </Col>
                        )}
                    </Row>
                </section>
            )}
        </Modal>
    );
};

export default SurveyTimeModal;