import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FileTextOutlined,
    CalendarOutlined,
    NotificationOutlined,
    HomeOutlined,
    EnvironmentOutlined,
    DollarCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    CreditCardOutlined,
    WarningOutlined,
    StarOutlined,
    StarFilled,
    PhoneOutlined,
    EyeOutlined,
    CarOutlined
} from "@ant-design/icons";
import api from "../../../../services/api";
import {
    fmtDate,
    getFinalPrice,
    TICKET_STATUS,
    INVOICE_STATUS,
    PAYMENT_STATUS,
    INCIDENT_STATUS,
    MOVE_TYPE,
    StatusTag,
    IncidentTag
} from "../constants";
import OrderDetailsModal from "./OrderDetailsModal";

const OrderCard = ({
    ticket,
    onViewSurvey,
    onReportIncident,
    onViewIncident,
    onCancelQuote,
    onRateService,
    tourRefs,
    onDepositPayment,
    onPayRemaining,
    onCancelTicketRequest,
    onRescheduleSurveyRequest,
    onConfirmReschedule,
    onConfirmUnderstaffed,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [surveyDetails, setSurveyDetails] = useState(null);
    const [pricingDetails, setPricingDetails] = useState(null);
    const [dispatchDetails, setDispatchDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [hasFetchedDetails, setHasFetchedDetails] = useState(false);

    const navigate = useNavigate();

    const fetchAdditionalDetails = async () => {
        if (hasFetchedDetails) return;
        setIsLoadingDetails(true);
        try {
            const endpoints = [];
            endpoints.push(api.get(`/surveys/ticket/${ticket._id}`).catch(() => null));
            endpoints.push(api.get(`/pricing/${ticket._id}`).catch(() => null));
            endpoints.push(api.get(`/invoices/ticket/${ticket._id}`).catch(() => null));

            const [surveyRes, pricingRes, invoiceRes] = await Promise.all(endpoints);

            if (surveyRes?.data?.success) setSurveyDetails(surveyRes.data.data);
            if (pricingRes?.data?.success) setPricingDetails(pricingRes.data.data);
            if (invoiceRes?.data?.success && invoiceRes.data.data?.dispatchAssignmentId) {
                setDispatchDetails(invoiceRes.data.data.dispatchAssignmentId);
            }
            setHasFetchedDetails(true);
        } catch (err) {
            console.error('Lỗi khi tải chi tiết:', err);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleExpandToggle = () => {
        if (!expanded) {
            fetchAdditionalDetails();
        }
        setExpanded(!expanded);
    };

    const invoiceSt = ticket.invoice ? INVOICE_STATUS[ticket.invoice.status] : null;
    const ticketSt = TICKET_STATUS[ticket.status] || { label: ticket.status, cls: 'mo-tag--gray' };
    const displaySt = invoiceSt || ticketSt;
    const paymentSt = ticket.invoice?.paymentStatus ? PAYMENT_STATUS[ticket.invoice.paymentStatus] : null;
    const incident = ticket.invoice?.incident;
    const incidentSt = incident ? INCIDENT_STATUS[incident.status] : null;

    const isQuoted = ticket.status === 'QUOTED';
    const isCreated = ticket.status === 'CREATED';
    const isConfirmed = ticket.status === 'WAITING_REVIEW' || ticket.status === 'WAITING_SURVEY';

    const hasPricing = ticket.pricing?.totalPrice > 0;
    const canReport = ['COMPLETED', 'IN_PROGRESS'].includes(ticket.invoice?.status) && !incident;
    const shortCode = `#${(ticket.code || '').slice(-14).toUpperCase() || 'N/A'}`;
    const isInvoiceCompleted = ticket.invoice?.status === 'COMPLETED';
    const isPaid = ticket.invoice?.paymentStatus === 'PAID';
    const isRated = ticket.invoice?.isRated === true;
    const canRate = isInvoiceCompleted && isPaid && !isRated;
    const canPayRemaining = ['IN_PROGRESS', 'COMPLETED'].includes(ticket.invoice?.status)
        && ticket.invoice?.paymentStatus === 'PARTIAL';
    const moveType = ticket.moveType ? (MOVE_TYPE[ticket.moveType] || { label: ticket.moveType, cls: 'mo-tag--gray' }) : null;

    const contractStatus = ticket.contract?.status;
    const isContractSigned = contractStatus === 'SIGNED';
    const needsSignContract = ticket.status === 'ACCEPTED' && !isContractSigned;
    const needsDepositPayment = ticket.status === 'ACCEPTED'
        && isContractSigned
        && (ticket.invoice?.paymentStatus === 'UNPAID' || !ticket.invoice);

    const isReschedulePending = ticket.invoice?.rescheduleStatus === 'PENDING_APPROVAL';
    const feasibility = ticket.invoice?.dispatchAssignmentId?.feasibility || {};
    const isUnderstaffedApprovalPending = (feasibility.decision === 'REQUIRE_CUSTOMER' || feasibility.decision === 'CONFIRM')
        && !ticket.invoice?.understaffedApproval;

    return (
        <div className={`mo-card ${isQuoted ? 'mo-card--highlight' : ''} ${isCreated ? 'mo-card--new' : ''}`}>
            {/* Notifications */}
            {isCreated && (
                <div className="mo-new-notice">
                    <FileTextOutlined className="mo-quoted-notice-icon mo-shake-animation" style={{ color: '#1890ff' }} />
                    <span>Đơn hàng đang chờ xử lý — Đội ngũ HOMS sẽ sớm liên hệ với bạn để xác nhận và khảo sát.</span>
                </div>
            )}
            {isQuoted && (
                <div className="mo-quoted-notice">
                    <NotificationOutlined className="mo-quoted-notice-icon mo-shake-animation" />
                    <span>Bạn có báo giá mới — vui lòng xem và xác nhận để tiếp tục tiến trình.</span>
                </div>
            )}

            {isReschedulePending && (
                <div className="mo-quoted-notice" style={{ backgroundColor: '#fffbe6', borderColor: '#ffe58f', color: '#d46b08' }}>
                    <CalendarOutlined className="mo-quoted-notice-icon mo-shake-animation" style={{ color: '#fa8c16' }} />
                    <span>Điều phối viên đề xuất dời lịch vận chuyển sang <b>{fmtDate(ticket.invoice?.proposedDispatchTime)}</b>. Vui lòng xác nhận!</span>
                </div>
            )}

            {isUnderstaffedApprovalPending && (
                <div className="mo-quoted-notice" style={{ backgroundColor: '#fff1f0', borderColor: '#ffa39e', color: '#cf1322' }}>
                    <WarningOutlined className="mo-quoted-notice-icon mo-shake-animation" style={{ color: '#f5222d' }} />
                    <span>Hệ thống phát hiện <b>thiếu hụt nhân sự lớn</b> cho ca vận chuyển này. Thời gian có thể kéo dài thêm khoảng <b>{Math.round(feasibility.estimatedDuration / 60)} tiếng</b>. Vui lòng xác nhận để chúng tôi tiến hành!</span>
                </div>
            )}

            {/* CARD HEAD */}
            <div className="mo-card__head">
                <div className="mo-card__head-left">
                    <span className="mo-card__code">
                        <FileTextOutlined style={{ marginRight: 6, color: '#2D4F36' }} />
                        {shortCode}
                    </span>
                    <span className="mo-card__date">
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        Tạo: {fmtDate(ticket.createdAt)}
                    </span>
                    {ticket.scheduledTime && (
                        <span className="mo-card__date" style={{ color: '#0284c7', fontWeight: 600 }}>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            Ngày chuyển: {fmtDate(ticket.scheduledTime)}
                        </span>
                    )}
                </div>
                <div
                    className="mo-card__head-right"
                    ref={tourRefs?.refStatus}
                    style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}
                >
                    {moveType && <StatusTag cls={moveType.cls}>{moveType.label}</StatusTag>}
                    {incidentSt && (
                        <IncidentTag incident={incident} status={incidentSt} onClick={() => onViewIncident(incident)} />
                    )}
                    {isRated && (
                        <span className="mo-tag mo-tag--rated" style={{ cursor: 'pointer' }} onClick={() => onRateService(ticket)}>
                            <StarFilled style={{ marginRight: 4, color: '#f59e0b' }} />Đã đánh giá
                        </span>
                    )}
                    {ticket.status === 'ACCEPTED' && (
                        <StatusTag
                            cls={isContractSigned ? 'mo-tag--green' : 'mo-tag--orange'}
                            icon={<FileTextOutlined />}
                        >
                            {isContractSigned ? 'Đã ký HĐ' : 'Chờ ký HĐ'}
                        </StatusTag>
                    )}
                    <StatusTag cls={displaySt.cls} icon={<CarOutlined />}>{displaySt.label}</StatusTag>
                </div>
            </div>

            {/* ROUTE */}
            <div className="mo-card__route-container" ref={tourRefs?.refRoute}>
                <div className="mo-route-timeline">
                    <div className="mo-route-point mo-route-point--pickup">
                        <div className="mo-route-icon-box"><HomeOutlined /></div>
                        <div className="mo-route-info">
                            <span className="mo-route-label">{ticket.moveType === 'TRUCK_RENTAL' ? 'Điểm lấy xe / Nơi tài xế đón' : 'Từ (Nơi đi)'}</span>
                            <span className="mo-route-address">{ticket.pickup?.address || 'Chưa cập nhật'}</span>
                        </div>
                    </div>
                    {ticket.moveType !== 'TRUCK_RENTAL' && (
                        <>
                            <div className="mo-route-divider">
                                <div className="mo-route-line" />
                                <div className="mo-route-distance">Chuyển đến</div>
                            </div>
                            <div className="mo-route-point mo-route-point--delivery">
                                <div className="mo-route-icon-box"><EnvironmentOutlined /></div>
                                <div className="mo-route-info">
                                    <span className="mo-route-label">Đến (Nơi đến)</span>
                                    <span className="mo-route-address">{ticket.delivery?.address || 'Chưa cập nhật'}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* META */}
            <div className="mo-card__meta" ref={tourRefs?.refMeta}>
                <div className="mo-card__tags">
                    {paymentSt ? (
                        <StatusTag cls={paymentSt.cls} icon={<DollarCircleOutlined />}>{paymentSt.label}</StatusTag>
                    ) : (
                        <StatusTag cls="mo-tag--gray" icon={<DollarCircleOutlined />}>Chưa TT</StatusTag>
                    )}
                </div>
                <div className="mo-card__price-wrapper" ref={tourRefs?.refPricing}>
                    <div className="mo-card__price-box">
                        <span className="mo-price-label">Tổng chi phí:</span>
                        {hasPricing
                            ? <span className="mo-price-value">{getFinalPrice(ticket.pricing).toLocaleString()} ₫</span>
                            : <span className="mo-price-empty">Đang cập nhật...</span>
                        }
                    </div>
                </div>
            </div>

            {/* ACTIONS */}
            <div className="mo-card__actions" ref={tourRefs?.refActions}>
                <div className="mo-card__btns-primary">
                    {isQuoted && (
                        <>
                            <button className="mo-btn mo-btn--accept" onClick={() => onViewSurvey(ticket)}>
                                <CheckCircleOutlined /> Chấp nhận báo giá
                            </button>
                            <button className="mo-btn mo-btn--reject" onClick={() => onCancelQuote(ticket)}>
                                <CloseCircleOutlined /> Từ chối
                            </button>
                        </>
                    )}

                    {isReschedulePending && (
                        <>
                            <button className="mo-btn mo-btn--accept" onClick={() => onConfirmReschedule(ticket, 'ACCEPT')}>
                                <CheckCircleOutlined /> Đồng ý đổi lịch
                            </button>
                            <button className="mo-btn mo-btn--reject" onClick={() => onConfirmReschedule(ticket, 'REJECT')}>
                                <CloseCircleOutlined /> Từ chối
                            </button>
                        </>
                    )}

                    {(ticket.status === 'CREATED' || ticket.status === 'WAITING_SURVEY') && (
                        <button className="mo-btn mo-btn--reject" onClick={() => onCancelTicketRequest(ticket)}>
                            <CloseCircleOutlined /> Hủy yêu cầu
                        </button>
                    )}

                    {ticket.status === 'WAITING_SURVEY' && ticket.scheduledTime && (
                        <button
                            className="mo-btn mo-btn--deposit"
                            style={{ backgroundColor: '#e67e22', color: '#fff' }}
                            onClick={() => onRescheduleSurveyRequest(ticket)}
                        >
                            <CalendarOutlined /> Đổi giờ khảo sát
                        </button>
                    )}

                    {needsSignContract && (
                        <button
                            className="mo-btn mo-btn--accept"
                            onClick={() => navigate(`/customer/sign-contract/${ticket._id}`)}
                        >
                            <FileTextOutlined /> Ký hợp đồng
                        </button>
                    )}

                    {needsDepositPayment && (
                        <button className="mo-btn mo-btn--deposit" onClick={() => onDepositPayment(ticket)}>
                            <CreditCardOutlined /> Thanh toán cọc 50%
                        </button>
                    )}

                    {canPayRemaining && (
                        <button className="mo-btn mo-btn--deposit" onClick={() => onPayRemaining(ticket)}>
                            <CreditCardOutlined /> Tất toán
                        </button>
                    )}

                    {hasPricing && !isQuoted && (
                        <button className="mo-btn mo-btn--contact" onClick={() => onViewSurvey(ticket)}>
                            <FileTextOutlined /> Xem báo giá
                        </button>
                    )}

                    {canReport && (
                        <button className="mo-btn mo-btn--report" onClick={() => onReportIncident(ticket)}>
                            <WarningOutlined /> Báo cáo sự cố
                        </button>
                    )}

                    {isUnderstaffedApprovalPending && (
                        <>
                            <button className="mo-btn mo-btn--accept" onClick={() => onConfirmUnderstaffed(ticket, 'ACCEPT')}>
                                <CheckCircleOutlined /> Chấp nhận rủi ro
                            </button>
                            <button className="mo-btn mo-btn--reject" onClick={() => onConfirmUnderstaffed(ticket, 'REJECT')}>
                                <CalendarOutlined /> Yêu cầu dời lịch
                            </button>
                        </>
                    )}

                    {canRate && (
                        <button className="mo-btn mo-btn--rate" onClick={() => onRateService(ticket)}>
                            <StarOutlined /> Đánh giá dịch vụ
                        </button>
                    )}
                </div>

                <div className="mo-card__btns-secondary">
                    {ticket.status !== 'QUOTED' && (
                        <button
                            className="mo-btn mo-btn--contact"
                            onClick={() => navigate(`/customer/video-chat?room=${ticket.code}`)}
                        >
                            <PhoneOutlined /> CSKH
                        </button>
                    )}
                    <button
                        className="mo-btn mo-btn--view-quote"
                        onClick={handleExpandToggle}
                    >
                        <EyeOutlined /> Chi tiết
                    </button>
                </div>
            </div>

            <OrderDetailsModal
                visible={expanded}
                onClose={() => setExpanded(false)}
                ticket={ticket}
                survey={surveyDetails}
                pricing={pricingDetails}
                loading={isLoadingDetails}
                hasFetched={hasFetchedDetails}
                dispatchDetails={dispatchDetails}
                tourRefs={tourRefs}
                shortCode={shortCode}
                isContractSigned={isContractSigned}
                isInvoiceCompleted={isInvoiceCompleted}
                isRated={isRated}
                isPaid={isPaid}
            />
        </div>
    );
};

export default OrderCard;
