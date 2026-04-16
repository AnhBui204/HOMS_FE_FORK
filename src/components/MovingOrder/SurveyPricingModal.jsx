import React, { useState, useEffect } from "react";
import { Modal, Button, Row, Col, Tag, Divider, Typography, Tooltip, Empty, message, Input, Space, Select } from "antd";
import {
    EyeOutlined, CheckCircleOutlined, FileTextOutlined, EnvironmentOutlined,
    AppstoreOutlined, ArrowRightOutlined, InboxOutlined, ToolOutlined,
    SafetyOutlined, ClockCircleOutlined, CarOutlined, TeamOutlined,
    WarningOutlined, DollarOutlined, GiftOutlined, PercentageOutlined, InfoCircleOutlined
} from "@ant-design/icons";
import api from "../../services/api";

const InfoRow = ({ icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <span style={{ color: '#52c41a', fontSize: 13, flexShrink: 0 }}>{icon}</span>
        <span style={{ color: '#555', flexShrink: 0 }}>{label}:</span>
        <span style={{ fontWeight: 500, color: '#222' }}>{value}</span>
    </div>
);

const SurveyPricingModal = ({ visible, onClose, ticket, survey, pricing, tourRefs, onPromotionApplied }) => {
    const [promoCode, setPromoCode] = useState('');
    const [applying, setApplying] = useState(false);
    const [localPricing, setLocalPricing] = useState(pricing || {});
    const [promotions, setPromotions] = useState([]);

    // Initialize local pricing when the modal opens or when the ticket changes.
    // Avoid re-writing localPricing on every `pricing` prop change so that
    // an applied promotion (which updates localPricing) isn't immediately
    // overwritten by a parent re-render.
    useEffect(() => {
        if (visible) setLocalPricing(pricing || {});
    }, [visible, ticket?._id]);

    useEffect(() => {
        let mounted = true;
        const fetchPromos = async () => {
            if (!ticket || !ticket._id) {
                setPromotions([]);
                return;
            }
            try {
                    // Fetch all active promotions (do not pass requestTicketId here)
                    // This ensures the UI can display available promos even if
                    // server-side filtering (by area/amount) would exclude them.
                    const res = await api.get('/promotions/available');
                if (res.data && res.data.success && Array.isArray(res.data.data) && mounted) {
                    setPromotions(res.data.data);
                }
            } catch (err) {
                console.warn('Failed to load promotions', err);
                setPromotions([]);
            }
        };
        fetchPromos();
        return () => { mounted = false; };
    }, [ticket]);

    const handleApplyPromotion = async () => {
        if (!promoCode || !promoCode.trim()) {
            message.warning('Vui lòng nhập mã khuyến mãi');
            return;
        }
        if (!ticket || !ticket._id) {
            message.error('Không tìm thấy đơn hàng để áp dụng khuyến mãi');
            return;
        }
        setApplying(true);
        try {
            const res = await api.post('/promotions/apply', { code: promoCode.trim(), requestTicketId: ticket._id });
            if (res.data && res.data.success) {
                const returned = res.data.data || {};
                // returned.pricing contains updated pricing snapshot
                if (returned.pricing) {
                    // ensure discountAmount and totalAfterPromotion are present
                    const updated = {
                        ...returned.pricing,
                        discountAmount: returned.pricing.discountAmount || returned.discountAmount || 0,
                        totalAfterPromotion: returned.pricing.totalAfterPromotion || returned.totalAfter
                    };
                    setLocalPricing(updated);
                } else {
                    // fallback: set promotion object and discount info
                    setLocalPricing(prev => ({
                        ...(prev || {}),
                        promotion: { code: promoCode.trim(), discountAmount: returned.discountAmount || 0 },
                        discountAmount: returned.discountAmount || 0,
                        totalAfterPromotion: returned.totalAfter
                    }));
                }
                message.success('Áp dụng khuyến mãi thành công');
                if (typeof onPromotionApplied === 'function') onPromotionApplied(ticket._id, (returned.pricing || { promotion: { code: promoCode.trim(), discountAmount: returned.discountAmount || 0 }, totalAfterPromotion: returned.totalAfter }));
            }
        } catch (err) {
            message.error(err.response?.data?.message || err.message || 'Áp dụng khuyến mãi thất bại');
        } finally {
            setApplying(false);
        }
    };
    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <EyeOutlined style={{ color: '#44624A', fontSize: 18 }} />
                    <span>
                        Chi tiết khảo sát &amp; Báo giá —{' '}
                        <strong style={{ color: '#44624A' }}>
                            #{ticket?.code?.slice(-10).toUpperCase()}
                        </strong>
                    </span>
                </div>
            }
            open={visible}
            onCancel={onClose}
            width={880}
            styles={{ body: { padding: '16px 20px', maxHeight: '80vh', overflowY: 'auto' } }}
            footer={[
                ticket?.status === 'QUOTED' && (
                    <Button
                        key="accept"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        style={{ background: '#52c41a', borderColor: '#52c41a' }}
                        onClick={async () => {
                            try {
                                await api.put(`/request-tickets/${ticket._id}/accept-quote`);
                                message.success('Đã chấp nhận báo giá, vui lòng ký hợp đồng và thanh toán cọc.');
                                onClose();
                                window.location.href = `/customer/sign-contract/${ticket._id}`;
                            } catch (err) {
                                message.error('Lỗi: ' + (err.response?.data?.message || err.message));
                            }
                        }}
                    >
                        Chấp nhận &amp; Ký hợp đồng
                    </Button>
                ),
                ticket?.status === 'ACCEPTED' && ticket?.invoice?.paymentStatus === 'UNPAID' && (
                    <Button
                        key="pay"
                        type="primary"
                        style={{ background: '#d9363e', borderColor: '#d9363e' }}
                        onClick={() => {
                            onClose();
                            window.location.href = `/customer/sign-contract/${ticket._id}`;
                        }}
                    >
                        Xem HĐ &amp; Thanh toán cọc
                    </Button>
                ),
                <Button key="close" onClick={onClose}>Đóng</Button>
            ]}
        >
            {survey && pricing ? (
                <div style={{ fontSize: 14 }}>
                    {/* ── SECTION 1: SURVEY INFO ── */}
                    <div ref={tourRefs?.refModalSurvey} style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <div style={{ background: '#52c41a', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <FileTextOutlined style={{ color: '#fff', fontSize: 13 }} />
                                <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Thông tin khảo sát</span>
                            </div>
                        </div>

                        <Row gutter={[24, 10]}>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <InfoRow icon={<EnvironmentOutlined />} label="Quãng đường" value={`${survey.distanceKm} km`} />
                                    <InfoRow icon={<AppstoreOutlined />} label="Tầng lầu" value={survey.floors > 0 ? `${survey.floors} tầng` : 'Trệt'} />
                                    <InfoRow icon={<ArrowRightOutlined />} label="Thang máy" value={<Tag color={survey.hasElevator ? 'success' : 'default'} style={{ margin: 0 }}>{survey.hasElevator ? 'Có' : 'Không'}</Tag>} />
                                    <InfoRow icon={<ArrowRightOutlined />} label="Khênh vác bộ" value={survey.carryMeter > 0 ? `${survey.carryMeter} m` : 'Không'} />
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <InfoRow icon={<InboxOutlined />} label="Đóng gói" value={<Tag color={survey.needsPacking ? 'blue' : 'default'} style={{ margin: 0 }}>{survey.needsPacking ? 'Có' : 'Không'}</Tag>} />
                                    <InfoRow icon={<ToolOutlined />} label="Tháo lắp" value={<Tag color={survey.needsAssembling ? 'blue' : 'default'} style={{ margin: 0 }}>{survey.needsAssembling ? 'Có' : 'Không'}</Tag>} />
                                    <InfoRow icon={<SafetyOutlined />} label="Bảo hiểm" value={survey.insuranceRequired ? <><Tag color="gold" style={{ margin: 0 }}>Có</Tag><span style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>{(survey.declaredValue || 0).toLocaleString()} ₫</span></> : <Tag color="default" style={{ margin: 0 }}>Không</Tag>} />
                                    <InfoRow icon={<ClockCircleOutlined />} label="Ước tính" value={`${survey.estimatedHours || '—'} giờ`} />
                                </div>
                            </Col>
                            {survey.notes && (
                                <Col span={24}>
                                    <div style={{ background: '#fff', borderRadius: 6, padding: '6px 10px', border: '1px dashed #b7eb8f', color: '#555', fontSize: 12, marginTop: 4 }}>
                                        <FileTextOutlined style={{ marginRight: 6, color: '#52c41a' }} />
                                        <em>{survey.notes}</em>
                                    </div>
                                </Col>
                            )}
                        </Row>
                    </div>

                    {/* ── SECTION 2: RESOURCES & ITEMS ── */}
                    <div ref={tourRefs?.refModalResources} style={{ background: '#e6f4ff', border: '1px solid #91caff', borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <div style={{ background: '#1677ff', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <CarOutlined style={{ color: '#fff', fontSize: 13 }} />
                                <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Tài nguyên đề xuất</span>
                            </div>
                        </div>

                        <Row gutter={[16, 0]}>
                            {[
                                { icon: <CarOutlined />, label: 'Xe tải', value: survey.suggestedVehicle },
                                { icon: <TeamOutlined />, label: 'Nhân viên', value: `${survey.suggestedStaffCount} người` },
                                { icon: <ClockCircleOutlined />, label: 'Thời gian', value: `${survey.estimatedHours || pricing.breakdown?.estimatedHours || '—'} giờ` },
                            ].map((item, i) => (
                                <Col span={8} key={i}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #bae0ff' }}>
                                        <span style={{ color: '#1677ff', fontSize: 18 }}>{item.icon}</span>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#888' }}>{item.label}</div>
                                            <div style={{ fontWeight: 700, color: '#1677ff', fontSize: 14 }}>{item.value}</div>
                                        </div>
                                    </div>
                                </Col>
                            ))}
                        </Row>

                        {survey.items?.length > 0 && (
                            <>
                                <Divider style={{ margin: '12px 0 10px', borderColor: '#91caff' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                    <InboxOutlined style={{ color: '#1677ff', fontSize: 14 }} />
                                    <Typography.Text strong style={{ color: '#1677ff', fontSize: 13 }}>
                                        Đồ đạc cần chuyển ({survey.items.length} món)
                                    </Typography.Text>
                                </div>
                                <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {survey.items.map((item, idx) => {
                                        const isCritical = item.name?.startsWith('⚠️') || item.name?.startsWith('[CRIT');
                                        const isSec = item.name?.startsWith('[SEC:');
                                        const displayName = isSec ? item.name.replace(/^\[SEC:[^\]]+\]\s*/, '') : item.name?.replace('⚠️ ', '') || item.name;
                                        const conditionTooltip = { GOOD: 'Tình trạng tốt', FRAGILE: 'Dễ vỡ — cần bảo quản kỹ', DAMAGED: 'Đã hư hỏng' }[item.condition];
                                        return (
                                            <Tooltip key={idx} title={conditionTooltip || ''}>
                                                <Tag icon={isCritical ? <WarningOutlined /> : null} color={isCritical ? 'error' : isSec ? 'orange' : 'blue'} style={{ fontSize: 12, padding: '2px 8px', cursor: 'default', marginBottom: 0 }}>
                                                    {displayName}
                                                    {item.actualWeight > 0 && <span style={{ opacity: 0.7, fontSize: 11, marginLeft: 4 }}>{item.actualWeight}kg</span>}
                                                </Tag>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── SECTION 3: PRICING BREAKDOWN ── */}
                    <div ref={tourRefs?.refModalPricing} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <div style={{ background: '#44624A', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <DollarOutlined style={{ color: '#fff', fontSize: 13 }} />
                                <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Cấu thành giá chi tiết</span>
                            </div>
                        </div>

                        {(() => {
                            const bd = localPricing?.breakdown || {};
                            // determine applied discount from returned pricing snapshot
                            const appliedDiscount = (localPricing?.discountAmount || localPricing?.promotion?.discountAmount || 0);
                            const lines =[
                                { icon: <ArrowRightOutlined />, label: 'Phí vận chuyển cơ bản', value: bd.baseTransportFee, always: false },
                                { icon: <CarOutlined />, label: 'Phí xe tải (theo km)', value: bd.vehicleFee, always: false },
                                { icon: <TeamOutlined />, label: 'Phí nhân công', value: bd.laborFee, always: false },
                                { icon: <AppstoreOutlined />, label: 'Phí dịch vụ đồ vật', value: bd.itemServiceFee, always: false },
                                { icon: <EnvironmentOutlined />, label: 'Phụ phí chặng xa (>30km)', value: bd.distanceFee, always: false },
                                { icon: <TeamOutlined />, label: 'Phí khiêng vác bộ', value: bd.carryFee, always: false },
                                { icon: <AppstoreOutlined />, label: 'Phí tầng lầu', value: bd.floorFee, always: false },
                                { icon: <ToolOutlined />, label: 'Phí tháo lắp', value: bd.assemblingFee, always: false },
                                { icon: <InboxOutlined />, label: 'Phí đóng gói', value: bd.packingFee, always: false },
                                { icon: <SafetyOutlined />, label: 'Phí bảo hiểm', value: bd.insuranceFee, always: false },
                                { icon: <InfoCircleOutlined />, label: 'Phí quản lý', value: bd.managementFee, always: false },
                            ].filter(l => l.always || (l.value != null && l.value > 0));

                            return (
                                <>
                                    {lines.map((l, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f5f5f5' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555', fontSize: 13 }}>
                                                <span style={{ color: '#44624A', fontSize: 12 }}>{l.icon}</span>
                                                {l.label}
                                            </span>
                                            <strong style={{ color: '#333', fontSize: 13 }}>{(l.value || 0).toLocaleString()} ₫</strong>
                                        </div>
                                    ))}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 6px', marginTop: 2 }}>
                                        <span style={{ fontWeight: 600, color: '#444' }}>Tạm tính</span>
                                        <span style={{ fontWeight: 600, color: '#444' }}>{(localPricing.subtotal || 0).toLocaleString()} ₫</span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 10px', color: '#888' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PercentageOutlined /> Thuế VAT</span>
                                        <span>{(localPricing.tax || 0).toLocaleString()} ₫</span>
                                    </div>

                                    {appliedDiscount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#cf1322' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><GiftOutlined /> Khuyến mãi {localPricing?.promotion?.code ? `(${localPricing.promotion.code})` : '(sau thuế)'}</span>
                                            <span style={{ fontWeight: 500 }}>− {appliedDiscount.toLocaleString()} ₫</span>
                                        </div>
                                    )}

                                    <div style={{ borderBottom: '2px dashed #e8e8e8', marginTop: 6 }} />

                                    {pricing.minimumChargeApplied && (
                                        <Tag icon={<WarningOutlined />} color="orange" style={{ marginTop: 10, width: '100%', textAlign: 'center', borderRadius: 6 }}>Áp dụng phí tối thiểu</Tag>
                                    )}

                                    {/* Promotion input */}
                                    {(!ticket?.invoice?.paymentStatus || ticket.invoice.paymentStatus === 'UNPAID') && (
                                        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                                            <Select
                                                placeholder="Chọn mã khuyến mãi"
                                                style={{ width: 320 }}
                                                value={promoCode || undefined}
                                                onChange={(val) => setPromoCode(val)}
                                                allowClear
                                            >
                                                {promotions.map((p) => (
                                                    <Select.Option key={p.code} value={p.code}>
                                                        {p.code} — {p.description || (p.discountType === 'Percentage' ? `${p.discountValue}%` : `${p.discountValue.toLocaleString()}₫`)}
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                            <Button
                                                onClick={handleApplyPromotion}
                                                loading={applying}
                                                type="default"
                                                style={{ background: '#fff', color: '#2D4F36', borderColor: '#2D4F36' }}
                                            >
                                                Áp dụng
                                            </Button>
                                            {localPricing?.promotion?.code && (
                                                <Tag color="green" icon={<GiftOutlined />}>{localPricing.promotion.code} — −{(localPricing.promotion.discountAmount || 0).toLocaleString()}₫</Tag>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', marginTop: 8, background: 'linear-gradient(135deg, #f6ffed, #d9f7be)', borderRadius: 8, border: '1.5px solid #73d13d' }}>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: '#237804', display: 'flex', alignItems: 'center', gap: 8 }}><DollarOutlined /> TỔNG CỘNG</span>
                                        <span style={{ fontSize: 24, fontWeight: 800, color: '#237804' }}>{((localPricing.totalAfterPromotion != null) ? localPricing.totalAfterPromotion : (Math.max(0, (localPricing.totalPrice || 0) - appliedDiscount))).toLocaleString()} ₫</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            ) : (
                <Empty description="Chưa có thông tin khảo sát" />
            )}
        </Modal>
    );
};

export default SurveyPricingModal;