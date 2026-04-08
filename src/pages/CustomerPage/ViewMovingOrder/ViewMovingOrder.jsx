import React, { useState, useEffect, useRef } from "react";
import { Layout, Modal, message, Spin, Tour, Button, ConfigProvider } from "antd";
import viVN from 'antd/locale/vi_VN';
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
  QuestionCircleOutlined,
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
import CancelTicketModal from "../../../components/MovingOrder/CancelTicketModal";
import RescheduleSurveyModal from "../../../components/MovingOrder/RescheduleSurveyModal";
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
  CREATED: { label: "Chờ xác nhận lịch", cls: "mo-tag--blue" },
  WAITING_SURVEY: { label: "Đã phân công nhân viên khảo sát", cls: "mo-tag--orange" },
  SURVEYED: { label: "Đã khảo sát", cls: "mo-tag--cyan" },
  QUOTED: { label: "Đã báo giá", cls: "mo-tag--orange" },
  ACCEPTED: { label: "Đã chấp nhận báo giá", cls: "mo-tag--geekblue" },
  CONVERTED: { label: "Đã tạo HĐ", cls: "mo-tag--purple" },
  IN_PROGRESS: { label: "Đang vận chuyển", cls: "mo-tag--processing" },
  COMPLETED: { label: "Hoàn thành", cls: "mo-tag--green" },
  CANCELLED: { label: "Đã hủy", cls: "mo-tag--red" },
};

const INVOICE_STATUS = {
  DRAFT: { label: "Nháp hóa đơn", cls: "mo-tag--purple" },
  CONFIRMED: { label: "Đã xác nhận", cls: "mo-tag--blue" },
  ASSIGNED: { label: "Đã phân công xe", cls: "mo-tag--cyan" },
  IN_PROGRESS: { label: "Đang vận chuyển", cls: "mo-tag--processing" },
  COMPLETED: { label: "Hoàn thành", cls: "mo-tag--green" },
  CANCELLED: { label: "Đã hủy", cls: "mo-tag--red" },
};

const PAYMENT_STATUS = {
  UNPAID: { label: "Chưa thanh toán", cls: "mo-tag--orange" },
  PARTIAL: { label: "Đã đặt cọc", cls: "mo-tag--cyan" },
  PAID: { label: "Đã thanh toán", cls: "mo-tag--green" },
};

const INCIDENT_STATUS = {
  Open: { label: "Đã báo cáo", cls: "mo-tag--orange" },
  Investigating: { label: "Đang xử lý", cls: "mo-tag--processing" },
  Resolved: { label: "Đã giải quyết", cls: "mo-tag--green" },
  Dismissed: { label: "Từ chối xử lý", cls: "mo-tag--red" },
};

const MOVE_TYPE = {
  FULL_HOUSE: { label: "Chuyển Nhà Trọn Gói", cls: "mo-tag--geekblue" },
  SPECIFIC_ITEMS: { label: "Chuyển Đồ Đạc", cls: "mo-tag--cyan" },
  TRUCK_RENTAL: { label: "Thuê Xe Tải", cls: "mo-tag--purple" },
  OFFICE_MOVING: { label: "Chuyển Văn Phòng", cls: "mo-tag--orange" },
};

/* ─── filter tabs config ──────────────────────────────────── */
const FILTERS = [
  { key: "ALL", label: "Tất cả" },
  { key: "QUOTED", label: "Chờ chấp nhận báo giá" },
  { key: "PROCESSING", label: "Đang xử lý" },
  { key: "IN_PROGRESS", label: "Đang vận chuyển" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELLED", label: "Đã hủy" },
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
  tourRefs,
  onDepositPayment,      // Refs for Ant Design Tour
  onPayRemaining,
  onCancelTicketRequest,
  onRescheduleSurveyRequest,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Status mapping
  const invoiceSt = ticket.invoice ? INVOICE_STATUS[ticket.invoice.status] : null;
  const ticketSt = TICKET_STATUS[ticket.status] || { label: ticket.status, cls: "mo-tag--gray" };
  const displaySt = invoiceSt || ticketSt;
  const paymentSt = ticket.invoice?.paymentStatus ? PAYMENT_STATUS[ticket.invoice.paymentStatus] : null;
  const incident = ticket.invoice?.incident;
  const incidentSt = incident ? INCIDENT_STATUS[incident.status] : null;

  // Conditions
  const isQuoted = ticket.status === "QUOTED";
  const isAcceptedUnpaid = ticket.status === "ACCEPTED" && ticket.invoice?.paymentStatus === "UNPAID";
  const canReport = ["COMPLETED", "IN_PROGRESS"].includes(ticket.invoice?.status) && !incident;
  const hasPricing = ticket.pricing?.totalPrice > 0;
  const shortCode = `#${(ticket.code || "").slice(-14).toUpperCase() || "N/A"}`;

  // [RATING] Kiểm tra điều kiện hiển thị nút đánh giá
  const isInvoiceCompleted = ticket.invoice?.status === "COMPLETED";
  const isPaid = ticket.invoice?.paymentStatus === "PAID";
  const isRated = ticket.invoice?.isRated === true;
  const canRate = isInvoiceCompleted && isPaid && !isRated;
  const canPayRemaining =
    ["IN_PROGRESS", "COMPLETED"].includes(ticket.invoice?.status) &&
    ticket.invoice?.paymentStatus === "PARTIAL";
  const moveType = ticket.moveType ? (MOVE_TYPE[ticket.moveType] || { label: ticket.moveType, cls: "mo-tag--gray" }) : null;
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
        <div className="mo-card__head-right" ref={tourRefs?.refStatus} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {moveType && (
            <StatusTag cls={moveType.cls}>{moveType.label}</StatusTag>
          )}
          {incidentSt && (
            <IncidentTag incident={incident} status={incidentSt} onClick={() => onViewIncident(incident)} />
          )}
          {/* [RATING] Badge "Đã đánh giá" ở header nếu isRated */}
          {isRated && (
            <span className="mo-tag mo-tag--rated" style={{ cursor: 'pointer' }}
              onClick={() => onRateService(ticket)}>
              <StarFilled style={{ marginRight: 4, color: '#f59e0b' }} />
              Đã đánh giá
            </span>
          )}
          <StatusTag cls={displaySt.cls} icon={<CarOutlined />}>{displaySt.label}</StatusTag>
        </div>
      </div>

      {/* ── ROUTE UI ── */}
      <div className="mo-card__route-container" ref={tourRefs?.refRoute}>
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
            {hasPricing ? (
              <span className="mo-price-value">{ticket.pricing.totalPrice.toLocaleString()} ₫</span>
            ) : (
              <span className="mo-price-empty">Đang cập nhật...</span>
            )}
          </div>
        </div>
      </div>

      {/* ── ACTIONS ── */}
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

          {/* New Actions for Created / Waiting Survey */}
          {(ticket.status === "CREATED" || ticket.status === "WAITING_SURVEY") && (
            <button className="mo-btn mo-btn--reject" onClick={() => onCancelTicketRequest(ticket)}>
              <CloseCircleOutlined /> Hủy yêu cầu
            </button>
          )}

          {(ticket.status === "WAITING_SURVEY" && ticket.scheduledTime) && (
            <button className="mo-btn mo-btn--deposit" style={{backgroundColor: '#e67e22', color: '#fff'}} onClick={() => onRescheduleSurveyRequest(ticket)}>
              <CalendarOutlined /> Đổi giờ khảo sát
            </button>
          )}

          {isAcceptedUnpaid && (
            <button className="mo-btn mo-btn--deposit" onClick={() => (window.location.href = `/customer/sign-contract/${ticket._id}`)}>
              <CreditCardOutlined /> Thanh toán cọc
            </button>
          )}
          {canPayRemaining && (
            <button
              className="mo-btn mo-btn--deposit"
              onClick={() => onPayRemaining(ticket)}
            >
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

          {/* [RATING] Nút Đánh giá — vàng cam, nổi bật */}
          {canRate && (
            <button className="mo-btn mo-btn--rate" onClick={() => onRateService(ticket)}>
              <StarOutlined /> Đánh giá dịch vụ
            </button>
          )}
        </div>

        <div className="mo-card__btns-secondary">
          {ticket.status !== "QUOTED" && (
            <button
              className="mo-btn mo-btn--contact"
              onClick={() => window.open(`/customer/video-chat?room=${ticket.code}`, '_blank')}
            >
              <PhoneOutlined /> CSKH
            </button>
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
                ) : isPaid ? (
                  <span style={{ color: '#64748b' }}>Chưa đánh giá</span>
                ) : (
                  <span style={{ color: '#ef4444' }}>
                    Cần thanh toán đủ để đánh giá
                  </span>
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

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [isSurveyModalVisible, setIsSurveyModalVisible] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTicketPricing, setSelectedTicketPricing] = useState(null);
  const [isSurveyTimeModalVisible, setIsSurveyTimeModalVisible] = useState(false);
  const [selectedTicketForTime, setSelectedTicketForTime] = useState(null);
  const [isIncidentModalVisible, setIsIncidentModalVisible] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  // [RATING] State cho modal đánh giá
  const [isRateModalVisible, setIsRateModalVisible] = useState(false);
  const [ticketToRate, setTicketToRate] = useState(null);

  // States for Cancel / Reschedule Modals
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isRescheduleModalVisible, setIsRescheduleModalVisible] = useState(false);
  const [actionTicket, setActionTicket] = useState(null);

  // [TOUR] State & Refs
  const refStatus = useRef(null);
  const refRoute = useRef(null);
  const refMeta = useRef(null);
  const refPricing = useRef(null);
  const refActions = useRef(null);

  const handleRemainingPayment = (ticket) => {
    confirm({
      title: "Xác nhận thanh toán phần còn lại",
      content: (
        <>
          <p>Bạn sắp thanh toán <b>phần còn lại của đơn hàng</b>.</p>
          <p>
            Số tiền:{" "}
            <b style={{ color: "#d9363e" }}>
              {(ticket.pricing.totalPrice / 2).toLocaleString()} ₫
            </b>
          </p>
        </>
      ),
      onOk: async () => {
        try {
          const res = await orderService.createMovingRemaining(ticket._id);
          if (res?.data?.checkoutUrl) {
            window.location.href = res.data.checkoutUrl;
          } else {
            message.error("Không tạo được link thanh toán");
          }
        } catch (err) {
          message.error("Lỗi thanh toán: " + (err.response?.data?.message || err.message));
        }
      },
    });
  };

  // Modal Refs
  const refModalSurvey = useRef(null);
  const refModalResources = useRef(null);
  const refModalPricing = useRef(null);

  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('hasSeenViewOrderTour')) {
      setTimeout(() => setTourOpen(true), 800);
      localStorage.setItem('hasSeenViewOrderTour', 'true');
    }
  }, []);

  const tourSteps = [
    {
      title: 'Tình Trạng Đơn Hàng',
      description: 'Cập nhật liên tục trạng thái hiện tại (Tạo mới, Đã khảo sát, Đang vận chuyển).',
      target: () => refStatus.current,
    },
    {
      title: 'Lộ Trình Vận Chuyển',
      description: 'Cho biết địa điểm bắt đầu (Nơi đi) và đích đến (Nơi đến) chính xác của bạn.',
      target: () => refRoute.current,
    },
    {
      title: 'Chi Phí Dự Kiến (Pricing Meta)',
      description: 'Hiển thị tóm tắt tổng chi phí dự kiến. Giá trị này được thuật toán tổng kết tự động.',
      target: () => refPricing.current,
    },
    {
      title: 'Xem Chi Tiết Báo Giá',
      description: 'Nhấn vào nút "Chấp nhận báo giá" hoặc "Xem báo giá" để mở Bảng Phân Tích Cấu Thành Giá cực kỳ chi tiết của hệ thống.',
      target: () => refActions.current,
    },
    {
      title: 'Mục 1: Thông tin khảo sát địa hình',
      description: 'Các yếu tố then chốt như Tổng Quãng Đường (km), Số lầu nhà, Có/Không Thang máy và Quãng đường khênh vác (nếu hẻm nhỏ xe không vào được) sẽ trực tiếp ảnh hưởng đến thuật toán tính giá.',
      target: () => refModalSurvey.current,
    },
    {
      title: 'Mục 2: Tài Nguyên & Nhân Dực',
      description: 'Dựa vào bảng kê khai số lượng và loại đồ đạc bên dưới, hệ thống tự động suy ra loại Xe Tải phù hợp và số lượng Nhân viên khuân vác, đóng gói cần thiết.',
      target: () => refModalResources.current,
    },
    {
      title: 'Mục 3: Cấu Thành Giá (Phân Rã Toán Học)',
      description: (
        <div>
          <p>Thuật toán lõi sẽ chia nhỏ chi phí một cách minh bạch, KHÔNG BAO GIỜ có chi phí ẩn:</p>
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            <li><b>Phí xe tải:</b> Lấy quãng đường (km) nhân với Đơn giá của loại xe Tải được cấu hình sẵn.</li>
            <li><b>Phí Nhân công & Khuân vác:</b> Là tập hợp của Phí khiêng bộ xa, Phí số tầng lầu bê vác, và khối lượng đồ đạc.</li>
            <li><b>Phí dịch vụ:</b> Các phụ phí như bọc màng co, thùng carton, bảo hiểm hàng hóa, tháo ráp máy lạnh.</li>
          </ul>
        </div>
      ),
      target: () => refModalPricing.current,
    },
  ];

  const mockTicketForTour = {
    _id: "mock_123",
    code: "MOK-99999999",
    createdAt: new Date().toISOString(),
    scheduledTime: new Date(Date.now() + 86400000).toISOString(),
    status: "QUOTED",
    pickup: { address: "123 Đường Bắt Đầu, Phường 1, Quận 10" },
    delivery: { address: "456 Đường Kết Thúc, Quận 7, TP.HCM" },
    pricing: { totalPrice: 1850000 },
    invoice: null,
    isMock: true,
  };

  const mockSurveyForTour = {
    distanceKm: 15, floors: 2, hasElevator: false, carryMeter: 50, needsPacking: true, needsAssembling: true,
    insuranceRequired: true, declaredValue: 50000000, estimatedHours: 4, notes: "Ghi chú: Đồ đạc cồng kềnh, cần bọc lót kỹ.",
    suggestedVehicle: "Xe tải 1.5 Tấn", suggestedStaffCount: 4,
    items: [
      { name: "Sofa góc L", condition: "GOOD", actualWeight: 80 },
      { name: "Tủ lạnh 400L", condition: "FRAGILE" },
      { name: "⚠️ Tủ kính trang trí", condition: "FRAGILE" }
    ]
  };

  const mockPricingBreakdownForTour = {
    totalPrice: 1850000, subtotal: 1850000, discountAmount: 0, tax: 0,
    breakdown: { baseTransportFee: 300000, vehicleFee: 400000, laborFee: 600000, distanceSurcharge: 100000, floorFee: 250000, carryFee: 200000, serviceFee: 0 }
  };

  const handleTourChange = (currentStep) => {
    // Steps 4, 5, 6 require the modal to be open
    if (currentStep >= 4) {
      setSelectedTicket(mockTicketForTour);
      setSelectedSurvey(mockSurveyForTour);
      setSelectedTicketPricing(mockPricingBreakdownForTour);
      setIsSurveyModalVisible(true);
    } else {
      setIsSurveyModalVisible(false);
    }
  };

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

  const handleCancelTicketRequest = (ticket) => {
    setActionTicket(ticket);
    setIsCancelModalVisible(true);
  };

  const handleRescheduleSurveyRequest = (ticket) => {
    setActionTicket(ticket);
    setIsRescheduleModalVisible(true);
  };

  const handleActionSuccess = (ticketId, updatedFields) => {
    setTickets((prev) =>
      prev.map((t) =>
        t._id === ticketId ? { ...t, ...updatedFields } : t
      )
    );
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
    const ticketStatus = t.status;
    const invoiceStatus = t.invoice?.status;
    const hasInvoice = !!invoiceStatus;

    if (key === "ALL") return true;
    if (key === "QUOTED") return ticketStatus === "QUOTED";
    if (key === "PROCESSING") {
      if (!hasInvoice) return ["CREATED", "WAITING_SURVEY", "SURVEYED", "ACCEPTED"].includes(ticketStatus);
      return ["DRAFT", "CONFIRMED"].includes(invoiceStatus);
    }
    if (key === "IN_PROGRESS") return ["ASSIGNED", "IN_PROGRESS"].includes(invoiceStatus);
    if (key === "COMPLETED") return invoiceStatus === "COMPLETED";
    if (key === "CANCELLED") return ticketStatus === "CANCELLED" || invoiceStatus === "CANCELLED";
    return false;
  };

  const filtered = tickets.filter((t) => matchFilter(t, activeFilter));
  const countFor = (key) => tickets.filter((t) => matchFilter(t, key)).length;

  const displayTickets = tourOpen && tickets.length === 0 ? [mockTicketForTour] : (tourOpen ? [mockTicketForTour, ...filtered] : filtered);

  return (
    <Layout className="view-order-page">
      <AppHeader />

      <Content>
        {/* HERO */}
        <section className="order-hero" style={{ position: 'relative' }}>
          <div className="overlay" />
          <h1>Thông Tin Chi Tiết</h1>
          <Button
            type="primary"
            icon={<QuestionCircleOutlined />}
            onClick={() => setTourOpen(true)}
            style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', borderColor: 'white', color: 'white', zIndex: 2 }}
          >
            Hướng dẫn xem đơn
          </Button>
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
          ) : displayTickets.length === 0 ? (
            <div className="mo-empty"><p>Không có đơn hàng nào.</p></div>
          ) : (
            <div className="mo-card-list">
              {displayTickets.map((ticket, idx) => (
                <OrderCard
                  key={ticket._id}
                  ticket={ticket}
                  tourRefs={idx === 0 && tourOpen ? { refStatus, refRoute, refMeta, refPricing, refActions } : null}
                  onViewSurvey={ticket.isMock ? () => message.info('Đây là dữ liệu mẫu.') : handleViewSurvey}
                  onReportIncident={ticket.isMock ? () => message.info('Đây là dữ liệu mẫu.') : handleReportIncident}
                  onViewIncident={ticket.isMock ? () => message.info('Đây là dữ liệu mẫu.') : handleViewIncident}
                  onDepositPayment={ticket.isMock ? () => message.info('Đây là dữ liệu mẫu.') : handleDepositPayment}
                  onPayRemaining={ticket.isMock ? () => message.info('Đây là dữ liệu mẫu.') : handleRemainingPayment}
                  onCancelQuote={ticket.isMock ? () => message.info('Đây là dữ liệu mẫu.') : handleCancelQuote}
                  onRateService={ticket.isMock ? () => message.info('Đây là dữ liệu mẫu.') : handleRateService}
                  onCancelTicketRequest={ticket.isMock ? () => message.info('Đây là dữ liệu mẫu.') : handleCancelTicketRequest}
                  onRescheduleSurveyRequest={ticket.isMock ? () => message.info('Đây là dữ liệu mẫu.') : handleRescheduleSurveyRequest}
                />
              ))}
            </div>
          )}
        </section>

        {/* Tour Component */}
        <ConfigProvider locale={viVN}>
          <Tour
            open={tourOpen}
            onChange={handleTourChange}
            onClose={() => { setTourOpen(false); setIsSurveyModalVisible(false); }}
            steps={tourSteps}
            mask={{ color: 'rgba(0, 0, 0, 0.4)' }}
          />
        </ConfigProvider>

        {/* ── Modals ── */}
        <SurveyPricingModal
          visible={isSurveyModalVisible}
          onClose={() => setIsSurveyModalVisible(false)}
          ticket={selectedTicket}
          survey={selectedSurvey}
          pricing={selectedTicketPricing}
          onPromotionApplied={(ticketId, pricingUpdate) => {
            setTickets(prev => prev.map(t => t._id === ticketId ? { ...t, pricing: { ...(t.pricing || {}), ...(pricingUpdate || {}) } } : t));
            // also update selectedTicketPricing for modal view
            setSelectedTicketPricing(prev => ({ ...(prev || {}), ...(pricingUpdate || {}) }));
          }}
          tourRefs={{ refModalSurvey, refModalResources, refModalPricing }}
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

        <CancelTicketModal
          visible={isCancelModalVisible}
          onClose={() => setIsCancelModalVisible(false)}
          ticket={actionTicket}
          onSuccess={handleActionSuccess}
        />

        <RescheduleSurveyModal
          visible={isRescheduleModalVisible}
          onClose={() => setIsRescheduleModalVisible(false)}
          ticket={actionTicket}
          onSuccess={handleActionSuccess}
        />
      </Content>

      <AppFooter />
    </Layout>
  );
};

export default ViewMovingOrder;