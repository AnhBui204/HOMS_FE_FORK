import React, { useState, useEffect } from "react";
import { Layout, Modal, message, Spin } from "antd";
import { useLocation } from "react-router-dom";
import {
  EnvironmentOutlined,
  HomeOutlined,
  CalendarOutlined,
  DollarCircleOutlined,
  CreditCardOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  PhoneOutlined,
  DownOutlined,
  UpOutlined,
  FileTextOutlined,
  NotificationOutlined,
  CarOutlined,
  StarOutlined,         // [RATING] icon nút đánh giá
  StarFilled,           // [RATING] icon đã đánh giá
} from "@ant-design/icons";
import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import useUser from "../../../contexts/UserContext";
import api from "../../../services/api";
import orderService from "../../../services/orderService";
import ReportIncidentModal from "../../../components/MovingOrder/ReportIncidentModal";
import ViewIncidentModal from "../../../components/MovingOrder/ViewIncidentModal";
import SurveyPricingModal from "../../../components/MovingOrder/SurveyPricingModal";
import SurveyTimeModal from "../../../components/MovingOrder/SurveyTimeModal";
import RateServiceModal from "../../../components/ServiceRating/RateServiceModal"; 
import "./style.css";

const { Content } = Layout;
const { confirm } = Modal;

/* ─── helpers ────────────────────────────────────────────── */
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

/* ─── status maps ─────────────────────────────────────────── */
const TICKET_STATUS = {
  CREATED:        { label: "Chờ xác nhận lịch",               cls: "mo-tag--blue" },
  WAITING_SURVEY: { label: "Đã phân công nhân viên khảo sát",  cls: "mo-tag--orange" },
  SURVEYED:       { label: "Đã khảo sát",                      cls: "mo-tag--cyan" },
  QUOTED:         { label: "Đã báo giá",                       cls: "mo-tag--orange" },
  ACCEPTED:       { label: "Đã chấp nhận báo giá",             cls: "mo-tag--geekblue" },
  CONVERTED:      { label: "Đã tạo HĐ",                        cls: "mo-tag--purple" },
  IN_PROGRESS:    { label: "Đang vận chuyển",                   cls: "mo-tag--processing" },
  COMPLETED:      { label: "Hoàn thành",                        cls: "mo-tag--green" },
  CANCELLED:      { label: "Đã hủy",                           cls: "mo-tag--red" },
};

const INVOICE_STATUS = {
  DRAFT:       { label: "Nháp hóa đơn",    cls: "mo-tag--purple" },
  CONFIRMED:   { label: "Đã xác nhận",      cls: "mo-tag--blue" },
  ASSIGNED:    { label: "Đã phân công xe",   cls: "mo-tag--cyan" },
  IN_PROGRESS: { label: "Đang vận chuyển",   cls: "mo-tag--processing" },
  COMPLETED:   { label: "Hoàn thành",        cls: "mo-tag--green" },
  CANCELLED:   { label: "Đã hủy",           cls: "mo-tag--red" },
};

const PAYMENT_STATUS = {
  UNPAID:  { label: "Chưa thanh toán", cls: "mo-tag--orange" },
  PARTIAL: { label: "Đã đặt cọc",      cls: "mo-tag--cyan" },
  PAID:    { label: "Đã thanh toán",    cls: "mo-tag--green" },
};

const INCIDENT_STATUS = {
  Open:          { label: "Đã báo cáo",    cls: "mo-tag--orange" },
  Investigating: { label: "Đang xử lý",    cls: "mo-tag--processing" },
  Resolved:      { label: "Đã giải quyết", cls: "mo-tag--green" },
  Dismissed:     { label: "Từ chối xử lý", cls: "mo-tag--red" },
};

/* ─── filter tabs config ──────────────────────────────────── */
const FILTERS = [
  { key: "ALL",         label: "Tất cả" },
  { key: "QUOTED",      label: "Chờ chấp nhận báo giá" },
  { key: "PROCESSING",  label: "Đang xử lý" },
  { key: "IN_PROGRESS", label: "Đang vận chuyển" },
  { key: "COMPLETED",   label: "Hoàn thành" },
  { key: "CANCELLED",   label: "Đã hủy" },
];

/* ─── StatusTag ───────────────────────────────────────────── */
const StatusTag = ({ cls, children, onClick, icon }) => (
  <span className={`mo-tag ${cls || "mo-tag--gray"}`} onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
    {icon && <span className="mo-tag-icon">{icon}</span>}
    {children}
  </span>
);

/* ─── IncidentTag ─────────────────────────────────────────── */
const IncidentTag = ({ incident, status, onClick }) => {
  const isActive = ["Open", "Investigating"].includes(incident?.status);
  if (isActive) {
    return (
      <span className="mo-tag--incident-open" onClick={onClick}>
        <span className="mo-tag--incident-dot" />
        <WarningOutlined style={{ marginRight: 4 }} /> {status.label}
      </span>
    );
  }
  return (
    <StatusTag cls={status.cls} onClick={onClick} icon={<WarningOutlined />}>
      {status.label}
    </StatusTag>
  );
};

/* ─── OrderCard ───────────────────────────────────────────── */
const OrderCard = ({
  ticket,
  onViewSurvey,
  onReportIncident,
  onViewIncident,
  onCancelQuote,
  onRateService,    // [RATING] handler mở modal đánh giá
}) => {
  const [expanded, setExpanded] = useState(false);

  // Status mapping
  const invoiceSt  = ticket.invoice ? INVOICE_STATUS[ticket.invoice.status] : null;
  const ticketSt   = TICKET_STATUS[ticket.status] || { label: ticket.status, cls: "mo-tag--gray" };
  const displaySt  = invoiceSt || ticketSt;
  const paymentSt  = ticket.invoice?.paymentStatus ? PAYMENT_STATUS[ticket.invoice.paymentStatus] : null;
  const incident   = ticket.invoice?.incident;
  const incidentSt = incident ? INCIDENT_STATUS[incident.status] : null;

  // Conditions
  const isQuoted        = ticket.status === "QUOTED";
  const isAcceptedUnpaid = ticket.status === "ACCEPTED" && ticket.invoice?.paymentStatus === "UNPAID";
  const canReport       = ["COMPLETED", "IN_PROGRESS"].includes(ticket.invoice?.status) && !incident;
  const hasPricing      = ticket.pricing?.totalPrice > 0;
  const shortCode       = `#${(ticket.code || "").slice(-14).toUpperCase() || "N/A"}`;

  // [RATING] Kiểm tra điều kiện hiển thị nút đánh giá
  const isInvoiceCompleted = ticket.invoice?.status === "COMPLETED";
  const isRated            = ticket.invoice?.isRated === true;
  const canRate            = isInvoiceCompleted && !isRated;

  return (
    <div className={`mo-card ${isQuoted ? "mo-card--highlight" : ""}`}>
      {/* ── QUOTED: Action notice banner ── */}
      {isQuoted && (
        <div className="mo-quoted-notice">
          <NotificationOutlined className="mo-quoted-notice-icon mo-shake-animation" />
          <span>Bạn có báo giá mới — vui lòng xem và xác nhận để tiếp tục tiến trình.</span>
        </div>
      )}

      {/* ── CARD HEAD ── */}
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
              Khảo sát: {fmtDate(ticket.scheduledTime)}
            </span>
          )}
        </div>
        <div className="mo-card__head-right" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {incidentSt && (
            <IncidentTag incident={incident} status={incidentSt} onClick={() => onViewIncident(incident)} />
          )}
          {/* [RATING] Badge "Đã đánh giá" ở header nếu isRated */}
          {isRated && (
            <span className="mo-tag mo-tag--rated"style={{ cursor: 'pointer' }} 
    onClick={() => onRateService(ticket)}>
              <StarFilled style={{ marginRight: 4, color: '#f59e0b' }} />
              Đã đánh giá
            </span>
          )}
          <StatusTag cls={displaySt.cls} icon={<CarOutlined />}>{displaySt.label}</StatusTag>
        </div>
      </div>

      {/* ── ROUTE UI ── */}
      <div className="mo-card__route-container">
        <div className="mo-route-timeline">
          <div className="mo-route-point mo-route-point--pickup">
            <div className="mo-route-icon-box"><HomeOutlined /></div>
            <div className="mo-route-info">
              <span className="mo-route-label">Từ (Nơi đi)</span>
              <span className="mo-route-address">{ticket.pickup?.address || "Chưa cập nhật"}</span>
            </div>
          </div>
          <div className="mo-route-divider">
            <div className="mo-route-line"></div>
            <div className="mo-route-distance">Chuyển đến</div>
          </div>
          <div className="mo-route-point mo-route-point--delivery">
            <div className="mo-route-icon-box"><EnvironmentOutlined /></div>
            <div className="mo-route-info">
              <span className="mo-route-label">Đến (Nơi đến)</span>
              <span className="mo-route-address">{ticket.delivery?.address || "Chưa cập nhật"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── META & PRICE ── */}
      <div className="mo-card__meta">
        <div className="mo-card__tags">
          {paymentSt ? (
            <StatusTag cls={paymentSt.cls} icon={<DollarCircleOutlined />}>{paymentSt.label}</StatusTag>
          ) : (
            <StatusTag cls="mo-tag--gray" icon={<DollarCircleOutlined />}>Chưa TT</StatusTag>
          )}
        </div>
        <div className="mo-card__price-wrapper">
          <div className="mo-card__price-box">
            <span className="mo-price-label">Tổng chi phí:</span>
            {hasPricing ? (
              <span className="mo-price-value">{ticket.pricing.totalPrice.toLocaleString()} ₫</span>
            ) : (
              <span className="mo-price-empty">Đang cập nhật...</span>
            )}
          </div>
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="mo-card__actions">
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
          {isAcceptedUnpaid && (
            <button className="mo-btn mo-btn--deposit" onClick={() => (window.location.href = `/customer/sign-contract/${ticket._id}`)}>
              <CreditCardOutlined /> Thanh toán cọc
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

          {/* [RATING] Nút Đánh giá — vàng cam, nổi bật */}
          {canRate && (
            <button className="mo-btn mo-btn--rate" onClick={() => onRateService(ticket)}>
              <StarOutlined /> Đánh giá dịch vụ
            </button>
          )}
        </div>

        <div className="mo-card__btns-secondary">
          {ticket.status !== "QUOTED" && (
            <button className="mo-btn mo-btn--contact"><PhoneOutlined /> CSKH</button>
          )}
          <button
            className={`mo-btn ${expanded ? 'mo-btn--ghost' : 'mo-btn--view-quote'}`}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <><UpOutlined /> Thu gọn</> : <>Chi tiết <DownOutlined /></>}
          </button>
        </div>
      </div>

      {/* ── EXPAND DETAILS ── */}
      <div className={`mo-card__expand ${expanded ? 'mo-card__expand--open' : ''}`}>
        <div className="mo-expand-grid">
          <div className="mo-expand-item">
            <span className="mo-expand-label">Ngày tạo yêu cầu</span>
            <span className="mo-expand-val">{fmtDate(ticket.createdAt)}</span>
          </div>
          {ticket.scheduledTime && (
            <div className="mo-expand-item">
              <span className="mo-expand-label">Lịch khảo sát</span>
              <span className="mo-expand-val">{fmtDate(ticket.scheduledTime)}</span>
            </div>
          )}
          {ticket.invoice?.code && (
            <div className="mo-expand-item">
              <span className="mo-expand-label">Mã hóa đơn</span>
              <span className="mo-expand-val">#{ticket.invoice.code}</span>
            </div>
          )}
          {/* [RATING] Hiển thị trạng thái đánh giá trong chi tiết */}
          {isInvoiceCompleted && (
            <div className="mo-expand-item">
              <span className="mo-expand-label">Đánh giá dịch vụ</span>
              <span className="mo-expand-val">
                {isRated ? (
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                    <StarFilled style={{ marginRight: 4 }} />Đã đánh giá
                  </span>
                ) : (
                  <span style={{ color: '#64748b' }}>Chưa đánh giá</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── main page ───────────────────────────────────────────── */
const ViewMovingOrder = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useUser();

  const [tickets,                    setTickets]                    = useState([]);
  const [loading,                    setLoading]                    = useState(true);
  const [activeFilter,               setActiveFilter]               = useState("ALL");
  const [isSurveyModalVisible,       setIsSurveyModalVisible]       = useState(false);
  const [selectedSurvey,             setSelectedSurvey]             = useState(null);
  const [selectedTicket,             setSelectedTicket]             = useState(null);
  const [selectedTicketPricing,      setSelectedTicketPricing]      = useState(null);
  const [isSurveyTimeModalVisible,   setIsSurveyTimeModalVisible]   = useState(false);
  const [selectedTicketForTime,      setSelectedTicketForTime]      = useState(null);
  const [isIncidentModalVisible,     setIsIncidentModalVisible]     = useState(false);
  const [selectedIncident,           setSelectedIncident]           = useState(null);
  const [isReportModalVisible,       setIsReportModalVisible]       = useState(false);

  // [RATING] State cho modal đánh giá
  const [isRateModalVisible,         setIsRateModalVisible]         = useState(false);
  const [ticketToRate,               setTicketToRate]               = useState(null);

  /* ── handlers ── */
  const handleViewSurvey = async (ticket) => {
    try {
      setSelectedTicket(ticket);
      const res = await api.get(`/surveys/ticket/${ticket._id}`);
      setSelectedSurvey(res.data?.data || res.data);
      try {
        const resPricing = await api.get(`/pricing/${ticket._id}`);
        setSelectedTicketPricing({
          ...ticket.pricing,
          breakdown: resPricing.data?.data?.breakdown,
        });
      } catch {
        setSelectedTicketPricing(ticket.pricing);
      }
      setIsSurveyModalVisible(true);
    } catch (error) {
      message.error(
        "Không thể tải thông tin khảo sát: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleReportIncident = (ticket) => {
    setSelectedTicket(ticket);
    setIsReportModalVisible(true);
  };

  const handleCloseReportModal = () => setIsReportModalVisible(false);

  const handleViewIncident = (incident) => {
    setSelectedIncident(incident);
    setIsIncidentModalVisible(true);
  };

  // [RATING] Mở modal đánh giá
  const handleRateService = (ticket) => {
    setTicketToRate(ticket);
    setIsRateModalVisible(true);
  };

  // [RATING] Callback sau khi đánh giá thành công — cập nhật isRated trong state
  const handleRateSuccess = (invoiceId) => {
    setIsRateModalVisible(false);
    setTickets((prev) =>
      prev.map((t) =>
        t.invoice?._id === invoiceId
          ? { ...t, invoice: { ...t.invoice, isRated: true } }
          : t
      )
    );
    message.success("Cảm ơn bạn đã đánh giá dịch vụ!");
  };

  const handleDepositPayment = (ticket) => {
    confirm({
      title: "Xác nhận thanh toán cọc",
      content: (
        <>
          <p>Bạn sắp thanh toán <b>50% giá trị đơn hàng</b>.</p>
          <p>
            Số tiền cọc:{" "}
            <b style={{ color: "#d9363e" }}>
              {(ticket.pricing.totalPrice / 2).toLocaleString()} ₫
            </b>
          </p>
          <p>Bạn có chắc chắn muốn tiếp tục?</p>
        </>
      ),
      okText: "Thanh toán",
      cancelText: "Hủy",
      okType: "primary",
      onOk: async () => {
        try {
          const depositAmount = Math.floor(ticket.pricing.totalPrice * 0.5);
          const res = await orderService.createMovingDeposit(ticket._id, depositAmount);
          if (res?.data?.checkoutUrl) {
            window.location.href = res.data.checkoutUrl;
          } else {
            message.error("Không tạo được link thanh toán");
          }
        } catch (err) {
          message.error(
            "Không thể tạo thanh toán: " +
              (err.response?.data?.message || err.message)
          );
        }
      },
    });
  };

  const handleCancelQuote = (record) => {
    confirm({
      title: "Từ chối báo giá này?",
      content: "Yêu cầu chuyển nhà sẽ bị hủy bỏ.",
      okText: "Từ chối & Hủy",
      okType: "danger",
      cancelText: "Quay lại",
      onOk: async () => {
        try {
          await api.put(`/request-tickets/${record._id}/cancel`, {
            reason: "Khách hàng từ chối báo giá",
          });
          message.success("Đã từ chối báo giá và hủy đơn.");
          setTickets((prev) =>
            prev.map((t) =>
              t._id === record._id ? { ...t, status: "CANCELLED" } : t
            )
          );
        } catch (err) {
          message.error(
            "Lỗi khi hủy đơn: " + (err.response?.data?.message || err.message)
          );
        }
      },
    });
  };

  /* ── fetch ── */
  useEffect(() => {
    const fetchTickets = async () => {
      if (!isAuthenticated || !user) { setLoading(false); return; }
      try {
        const response = await api.get(`/request-tickets`, {
          params: { customerId: user._id || user.id },
        });
        if (response.data?.success) {
          const currentUserId = user._id || user.id;
          let userTickets = (response.data.data || []).filter(
            (t) =>
              (t.customerId && t.customerId._id === currentUserId) ||
              t.customerId === currentUserId
          );
          userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          const searchCode = new URLSearchParams(location.search).get("searchCode");
          if (searchCode) {
            const kw = searchCode.toLowerCase();
            userTickets = userTickets.filter(
              (t) =>
                (t.code && t.code.toLowerCase().includes(kw)) ||
                (t.invoice?.code && t.invoice.code.toLowerCase().includes(kw))
            );
          }
          setTickets(userTickets);
        }
      } catch (error) {
        console.error("Could not fetch moving orders.", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [isAuthenticated, user, location.search]);

  /* ── filter logic ── */
  const matchFilter = (t, key) => {
    const ticketStatus  = t.status;
    const invoiceStatus = t.invoice?.status;
    const hasInvoice    = !!invoiceStatus;

    if (key === "ALL") return true;
    if (key === "QUOTED") return ticketStatus === "QUOTED";
    if (key === "PROCESSING") {
      if (!hasInvoice) return ["CREATED","WAITING_SURVEY","SURVEYED","ACCEPTED"].includes(ticketStatus);
      return ["DRAFT", "CONFIRMED"].includes(invoiceStatus);
    }
    if (key === "IN_PROGRESS")  return ["ASSIGNED","IN_PROGRESS"].includes(invoiceStatus);
    if (key === "COMPLETED")    return invoiceStatus === "COMPLETED";
    if (key === "CANCELLED")    return ticketStatus === "CANCELLED" || invoiceStatus === "CANCELLED";
    return false;
  };

  const filtered  = tickets.filter((t) => matchFilter(t, activeFilter));
  const countFor  = (key) => tickets.filter((t) => matchFilter(t, key)).length;

  return (
    <Layout className="view-order-page">
      <AppHeader />

      <Content>
        {/* HERO */}
        <section className="order-hero">
          <div className="overlay" />
          <h1>Thông Tin Chi Tiết</h1>
        </section>

        {/* CARD SECTION */}
        <section className="order-section">
          <div className="mo-section-header">
            <h2>Lịch Chuyển Nhà Của Tôi</h2>
          </div>

          {/* filter tabs */}
          <div className="mo-filters">
            {FILTERS.map((f) => {
              const cnt = countFor(f.key);
              return (
                <button
                  key={f.key}
                  className={`mo-filter-btn${activeFilter === f.key ? " mo-filter-btn--active" : ""}`}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label}
                  {cnt > 0 && <span className="mo-filter-badge">{cnt}</span>}
                </button>
              );
            })}
          </div>

          {/* cards */}
          {loading ? (
            <div className="mo-loading"><Spin size="large" /></div>
          ) : filtered.length === 0 ? (
            <div className="mo-empty"><p>Không có đơn hàng nào.</p></div>
          ) : (
            <div className="mo-card-list">
              {filtered.map((ticket) => (
                <OrderCard
                  key={ticket._id}
                  ticket={ticket}
                  onViewSurvey={handleViewSurvey}
                  onReportIncident={handleReportIncident}
                  onViewIncident={handleViewIncident}
                  onDepositPayment={handleDepositPayment}
                  onCancelQuote={handleCancelQuote}
                  onRateService={handleRateService}  // [RATING]
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Modals ── */}
        <SurveyPricingModal
          visible={isSurveyModalVisible}
          onClose={() => setIsSurveyModalVisible(false)}
          ticket={selectedTicket}
          survey={selectedSurvey}
          pricing={selectedTicketPricing}
        />
        <SurveyTimeModal
          visible={isSurveyTimeModalVisible}
          onClose={() => setIsSurveyTimeModalVisible(false)}
          ticket={selectedTicketForTime}
          survey={selectedSurvey}
          onSuccess={(ticketId, updatedFields) => {
            setTickets((prev) =>
              prev.map((t) => t._id === ticketId ? { ...t, ...updatedFields } : t)
            );
          }}
        />
        {selectedTicket && (
          <ReportIncidentModal
            visible={isReportModalVisible}
            onClose={handleCloseReportModal}
            ticket={selectedTicket}
            onSuccess={(incident) => {
              setTickets((prev) =>
                prev.map((t) =>
                  t._id === selectedTicket._id
                    ? { ...t, invoice: { ...t.invoice, incident } }
                    : t
                )
              );
            }}
          />
        )}
        <ViewIncidentModal
          visible={isIncidentModalVisible}
          onClose={() => setIsIncidentModalVisible(false)}
          incident={selectedIncident}
        />

        {/* [RATING] Modal đánh giá dịch vụ */}
        {ticketToRate && (
          <RateServiceModal
            visible={isRateModalVisible}
            onClose={() => setIsRateModalVisible(false)}
            ticket={ticketToRate}
            onSuccess={handleRateSuccess}
          />
        )}
      </Content>

      <AppFooter />
    </Layout>
  );
};

export default ViewMovingOrder;