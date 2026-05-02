import React from "react";
import { Modal, Spin, Row, Col, Divider, Typography, Tooltip, Tag } from "antd";
import {
  CompassOutlined,
  CarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  InboxOutlined,
  ToolOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  ArrowRightOutlined,
  SafetyOutlined,
  FileTextOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  PercentageOutlined,
  GiftOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StarFilled
} from "@ant-design/icons";
import OrderTrackingMap from "../../../../components/OrderTrackingMap/OrderTrackingMap";
import { fmtDate, getFinalPrice, translateTruckType, InfoRow } from "../constants";

const OrderDetailsModal = ({
  visible,
  onClose,
  ticket,
  survey,
  pricing,
  loading,
  hasFetched,
  dispatchDetails,
  tourRefs,
  shortCode,
  isContractSigned,
  isInvoiceCompleted,
  isRated,
  isPaid
}) => {
  if (!ticket) return null;

  // Determine effective pricing: prefer server-backed ticket.pricing when it contains
  // a promotion or discount (this survives refresh/server restarts). Otherwise use
  // the pricing prop passed from parent.
  const effectivePricing = (ticket.pricing && (ticket.pricing.promotion || ticket.pricing.discountAmount || ticket.pricing.totalAfterPromotion))
    ? ticket.pricing
    : (pricing || ticket.pricing || {});

  return (
    <Modal
      title={
        <span style={{ fontSize: 18 }}>
          Chi tiết lộ trình: <span style={{ color: '#1677ff' }}>{shortCode}</span>
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1300}
      centered
      styles={{ body: { padding: '20px 24px', maxHeight: '85vh', overflowY: 'auto' } }}
    >
      {(ticket.invoice?.code || ticket.status === 'ACCEPTED' || isInvoiceCompleted) && (
        <div className="mo-expand-grid">
          {ticket.invoice?.code && (
            <div className="mo-expand-item">
              <span className="mo-expand-label">Mã hóa đơn</span>
              <span className="mo-expand-val">#{ticket.invoice.code}</span>
            </div>
          )}
          {ticket.status === 'ACCEPTED' && (
            <div className="mo-expand-item">
              <span className="mo-expand-label">Hợp đồng</span>
              <span className="mo-expand-val">
                {isContractSigned ? (
                  <span style={{ color: '#52c41a', fontWeight: 600 }}>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />
                    Đã ký — {fmtDate(ticket.contract?.signedAt)}
                  </span>
                ) : (
                  <span style={{ color: '#fa8c16' }}>Chưa ký hợp đồng</span>
                )}
              </span>
            </div>
          )}
          {ticket.contract?.depositDeadline && ticket.status === 'ACCEPTED' && (
            <div className="mo-expand-item">
              <span className="mo-expand-label">Hạn đặt cọc</span>
              <span className="mo-expand-val">
                {new Date(ticket.contract.depositDeadline) > new Date() ? (
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                    ⏰ {fmtDate(ticket.contract.depositDeadline)}
                    {' '}— còn {Math.ceil((new Date(ticket.contract.depositDeadline) - new Date()) / 3600000)}h
                  </span>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>❌ Đã quá hạn</span>
                )}
              </span>
            </div>
          )}
          {isInvoiceCompleted && (
            <div className="mo-expand-item">
              <span className="mo-expand-label">Đánh giá dịch vụ</span>
              <span className="mo-expand-val">
                {isRated
                  ? <span style={{ color: '#f59e0b', fontWeight: 600 }}><StarFilled style={{ marginRight: 4 }} />Đã đánh giá</span>
                  : isPaid
                    ? <span style={{ color: '#64748b' }}>Chưa đánh giá</span>
                    : <span style={{ color: '#ef4444' }}>Cần thanh toán đủ để đánh giá</span>
                }
              </span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}><Spin tip="Đang tải chi tiết..." /></div>
      ) : hasFetched && (
        <div style={{ marginTop: (ticket.invoice?.code || ticket.status === 'ACCEPTED' || isInvoiceCompleted) ? 24 : 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* MAP */}
          {ticket.pickup?.coordinates && ticket.delivery?.coordinates && (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e8e8e8', padding: '14px 18px', background: '#fff', pointerEvents: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ background: '#1677ff', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CompassOutlined style={{ color: '#fff', fontSize: 13 }} />
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Lộ trình điều phối</span>
                </div>
              </div>
              <OrderTrackingMap
                pickup={{ lat: ticket.pickup.coordinates.lat || ticket.pickup.coordinates[1], lng: ticket.pickup.coordinates.lng || ticket.pickup.coordinates[0], address: ticket.pickup.address }}
                delivery={{ lat: ticket.delivery.coordinates.lat || ticket.delivery.coordinates[1], lng: ticket.delivery.coordinates.lng || ticket.delivery.coordinates[0], address: ticket.delivery.address }}
                routeData={dispatchDetails?.routeId || ticket.routeData}
                mapHeight="300px"
              />
            </div>
          )}

          {/* TRUCK RENTAL DETAILS */}
         {ticket.moveType === 'TRUCK_RENTAL' && (
  <div style={{ fontSize: 14 }}>
    <Row gutter={16}>
      <Col span={24}>
        <div style={{ background: '#e6f4ff', border: '1px solid #91caff', borderRadius: 10, padding: '14px 18px', marginBottom: 14, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ background: '#1677ff', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CarOutlined style={{ color: '#fff', fontSize: 13 }} />
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Thông tin thuê xe tải</span>
            </div>
          </div>
          <Row gutter={[10, 10]}>
            {[
              { 
                icon: <CarOutlined />, 
                label: 'Loại xe', 
                value: translateTruckType(ticket.rentalDetails?.truckType || ticket.truckType || survey?.suggestedVehicle) 
              },
              { 
                icon: <ClockCircleOutlined />, 
                label: 'Thời gian thuê', 
                value: (ticket.rentalDetails?.estimatedHours || survey?.estimatedHours) 
                  ? `${ticket.rentalDetails?.estimatedHours || survey?.estimatedHours} giờ` 
                  : 'Không xác định' 
              },
              { 
                icon: <TeamOutlined />, 
                label: 'Tổng nhân sự', 
                value: `${1 + (ticket.rentalDetails?.extraStaffCount || 0)} người` 
              },
              { 
                icon: <InboxOutlined />, 
                label: 'Đóng gói', 
                value: ticket.rentalDetails?.needsPacking ? 'Có' : 'Không' 
              },
              { 
                icon: <ToolOutlined />, 
                label: 'Tháo lắp', 
                value: ticket.rentalDetails?.needsAssembling ? 'Có' : 'Không' 
              },
            ].map((item, i) => (
              <Col span={4} md={4} sm={8} xs={12} key={i}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center', 
                  gap: 4, 
                  padding: '8px 4px', 
                  background: '#fff', 
                  borderRadius: 8, 
                  border: '1px solid #bae0ff', 
                  height: '100%' 
                }}>
                  <span style={{ color: '#1677ff', fontSize: 18 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: '#888' }}>{item.label}</div>
                    <div style={{ 
                      fontWeight: 700, 
                      color: '#1677ff', 
                      fontSize: 13, 
                      lineHeight: '1.2' 
                    }}>
                      {item.value}
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Col>
    </Row>
  </div>
)}

          {/* SURVEY & PRICING */}
          {ticket.moveType !== 'TRUCK_RENTAL' && survey && pricing && (
            <div style={{ fontSize: 14 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div ref={tourRefs?.refModalSurvey} style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 10, padding: '14px 18px', marginBottom: 14, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ background: '#52c41a', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <FileTextOutlined style={{ color: '#fff', fontSize: 13 }} />
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Thông tin khảo sát</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 30 }}>
                      <Row gutter={[16, 10]}>
                        <Col span={24}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content', gap: '12px 24px', justifyContent: 'center' }}>
                            <InfoRow icon={<EnvironmentOutlined />} label="Quãng đường" value={`${survey.distanceKm} km`} />
                            <InfoRow icon={<AppstoreOutlined />} label="Tầng lầu" value={survey.floors > 0 ? `${survey.floors} tầng` : 'Trệt'} />
                            <InfoRow icon={<ArrowRightOutlined />} label="Thang máy" value={<Tag color={survey.hasElevator ? 'success' : 'default'} style={{ margin: 0 }}>{survey.hasElevator ? 'Có' : 'Không'}</Tag>} />
                            <InfoRow icon={<ArrowRightOutlined />} label="Khênh bộ" value={survey.carryMeter > 0 ? `${survey.carryMeter} m` : 'Không'} />
                            <InfoRow icon={<InboxOutlined />} label="Đóng gói" value={<Tag color={survey.needsPacking ? 'blue' : 'default'} style={{ margin: 0 }}>{survey.needsPacking ? 'Có' : 'Không'}</Tag>} />
                            <InfoRow icon={<ToolOutlined />} label="Tháo lắp" value={<Tag color={survey.needsAssembling ? 'blue' : 'default'} style={{ margin: 0 }}>{survey.needsAssembling ? 'Có' : 'Không'}</Tag>} />
                            <InfoRow icon={<SafetyOutlined />} label="Bảo hiểm" value={survey.insuranceRequired ? <><Tag color="gold" style={{ margin: 0 }}>Có</Tag><span style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>{(survey.declaredValue || 0).toLocaleString()} ₫</span></> : <Tag color="default" style={{ margin: 0 }}>Không</Tag>} />
                            <InfoRow icon={<ClockCircleOutlined />} label="Ước tính" value={`${survey.estimatedHours || '—'} giờ`} />
                          </div>
                        </Col>
                        {survey.notes && (
                          <Col span={24} style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{ background: '#fff', borderRadius: 6, padding: '6px 10px', border: '1px dashed #b7eb8f', color: '#555', fontSize: 12, marginTop: 4, maxWidth: '90%' }}>
                              <FileTextOutlined style={{ marginRight: 6, color: '#52c41a' }} />
                              <em>{survey.notes}</em>
                            </div>
                          </Col>
                        )}
                      </Row>
                    </div>
                  </div>
                </Col>

                <Col span={16}>
                  <div ref={tourRefs?.refModalResources} style={{ background: '#e6f4ff', border: '1px solid #91caff', borderRadius: 10, padding: '14px 18px', marginBottom: 14, height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ background: '#1677ff', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CarOutlined style={{ color: '#fff', fontSize: 13 }} />
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Tài nguyên đề xuất</span>
                      </div>
                    </div>
                    <Row gutter={[10, 10]}>
                      {[
                        { icon: <CarOutlined />, label: 'Xe tải', value: survey.suggestedVehicles?.length > 0 ? survey.suggestedVehicles.map(v => `${v.count} x ${translateTruckType(v.vehicleType)}`).join(' + ') : (translateTruckType(survey.suggestedVehicle) || survey.suggestedVehicle) },
                        { icon: <TeamOutlined />, label: 'Nhân sự', value: `${survey.suggestedStaffCount} người` },
                        { icon: <ClockCircleOutlined />, label: 'Thời gian', value: `${survey.estimatedHours || pricing.breakdown?.estimatedHours || '—'} giờ` },
                      ].map((item, i) => (
                        <Col span={8} key={i}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4, padding: '8px 4px', background: '#fff', borderRadius: 8, border: '1px solid #bae0ff' }}>
                            <span style={{ color: '#1677ff', fontSize: 18 }}>{item.icon}</span>
                            <div>
                              <div style={{ fontSize: 11, color: '#888' }}>{item.label}</div>
                              <div style={{ fontWeight: 700, color: '#1677ff', fontSize: 13, lineHeight: '1.2' }}>{item.value}</div>
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
                </Col>
              </Row>
            </div>
          )}

          {/* PRICING BREAKDOWN */}
          {effectivePricing && (
            <div ref={tourRefs?.refModalPricing} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ background: '#44624A', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <DollarOutlined style={{ color: '#fff', fontSize: 13 }} />
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Cấu thành giá chi tiết</span>
                </div>
              </div>
              {(() => {
                const bd = effectivePricing.breakdown || {};
                const appliedDiscount = (effectivePricing?.discountAmount || effectivePricing?.promotion?.discountAmount || 0);
                const lines = [
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
                      <span style={{ fontWeight: 600, color: '#444' }}>{(pricing.subtotal || 0).toLocaleString()} ₫</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 10px', color: '#888' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PercentageOutlined /> Thuế VAT</span>
                      <span>{(pricing.tax || 0).toLocaleString()} ₫</span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#cf1322' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><GiftOutlined /> Khuyến mãi {pricing?.promotion?.code ? `(${pricing.promotion.code})` : '(sau thuế)'}</span>
                        <span style={{ fontWeight: 500 }}>− {appliedDiscount.toLocaleString()} ₫</span>
                      </div>
                    )}
                    <div style={{ borderBottom: '2px dashed #e8e8e8', marginTop: 6 }} />
                    {pricing.minimumChargeApplied && (
                      <Tag icon={<WarningOutlined />} color="orange" style={{ marginTop: 10, width: '100%', textAlign: 'center', borderRadius: 6 }}>Áp dụng phí tối thiểu</Tag>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', marginTop: 8, background: 'linear-gradient(135deg, #f6ffed, #d9f7be)', borderRadius: 8, border: '1.5px solid #73d13d' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#237804', display: 'flex', alignItems: 'center', gap: 8 }}><DollarOutlined /> TỔNG CỘNG</span>
                      <span style={{ fontSize: 24, fontWeight: 800, color: '#237804' }}>{getFinalPrice(effectivePricing).toLocaleString()} ₫</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default OrderDetailsModal;
