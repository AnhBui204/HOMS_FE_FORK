import React, { useState, useEffect } from "react";
import {
  Layout,
  Table,
  Tag,
  Button,
  Modal,
  message,
} from "antd";
import { useLocation } from "react-router-dom";
import {
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  WarningOutlined,
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
import "./style.css";

const { Content } = Layout;
const { confirm } = Modal;

const ViewMovingOrder = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useUser();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSurveyModalVisible, setIsSurveyModalVisible] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTicketPricing, setSelectedTicketPricing] = useState(null);
  const [isSurveyTimeModalVisible, setIsSurveyTimeModalVisible] =
    useState(false);
  const [selectedTicketForTime, setSelectedTicketForTime] = useState(null);
  const [isIncidentModalVisible, setIsIncidentModalVisible] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const handleViewSurvey = async (ticket) => {
    try {
      setSelectedTicket(ticket);
      const res = await api.get(`/surveys/ticket/${ticket._id}`);
      const surveyData = res.data?.data || res.data;
      setSelectedSurvey(surveyData);

      try {
        const resPricing = await api.get(`/pricing/${ticket._id}`);
        const pricingDetail = resPricing.data?.data;
        setSelectedTicketPricing({
          ...ticket.pricing,
          breakdown: pricingDetail?.breakdown,
        });
      } catch {
        setSelectedTicketPricing(ticket.pricing);
      }

      setIsSurveyModalVisible(true);
    } catch (error) {
      message.error(
        "Không thể tải thông tin khảo sát: " +
          (error.response?.data?.message || error.message),
      );
    }
  };
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const handleReportIncident = (ticket) => {
    setSelectedTicket(ticket);
    setIsReportModalVisible(true);
  };
  const handleCloseReportModal = () => {
    setIsReportModalVisible(false);
  };
  const handleViewIncident = (incident) => {
    setSelectedIncident(incident);
    setIsIncidentModalVisible(true);
  };
  const handleDepositPayment = (ticket) => {
    confirm({
      title: "Xác nhận thanh toán cọc",
      content: (
        <>
          <p>
            Bạn sắp thanh toán <b>50% giá trị đơn hàng</b>.
          </p>
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
          const res = await orderService.createMovingDeposit(
            ticket._id,
            depositAmount,
          );
          if (res?.data?.checkoutUrl) {
            window.location.href = res.data.checkoutUrl;
          } else {
            message.error("Không tạo được link thanh toán");
          }
        } catch (err) {
          message.error(
            "Không thể tạo thanh toán: " +
              (err.response?.data?.message || err.message),
          );
        }
      },
    });
  };

  useEffect(() => {
    const fetchTickets = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/request-tickets`, {
          params: { customerId: user._id || user.id },
        });
        if (response.data?.success) {
          let userTickets = response.data.data || [];
          const currentUserId = user._id || user.id;
          userTickets = userTickets.filter(
            (t) =>
              (t.customerId && t.customerId._id === currentUserId) ||
              t.customerId === currentUserId,
          );
          userTickets.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          );

          // Lọc theo searchCode từ header
          const searchParams = new URLSearchParams(location.search);
          const searchCode = searchParams.get("searchCode");
          if (searchCode) {
            const keyword = searchCode.toLowerCase();
            userTickets = userTickets.filter(
              (t) =>
                (t.code && t.code.toLowerCase().includes(keyword)) ||
                (t.invoice?.code &&
                  t.invoice.code.toLowerCase().includes(keyword)),
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

  const statusColorMap = {
    CREATED: "blue",
    WAITING_SURVEY: "orange",
    SURVEYED: "cyan",
    QUOTED: "green",
    ACCEPTED: "geekblue",
    CONVERTED: "purple",
    IN_PROGRESS: "processing",
    COMPLETED: "success",
    CANCELLED: "error",
  };
  const statusLabelMap = {
    CREATED: "Chờ xác nhận lịch",
    WAITING_SURVEY: "Đã phân công",
    SURVEYED: "Đã khảo sát",
    QUOTED: "Đã báo giá",
    ACCEPTED: "Đã chốt đơn",
    CONVERTED: "Đã tạo HĐ",
    IN_PROGRESS: "Đang vận chuyển",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
  };

  const columns = [
    {
      title: "Mã Đơn",
      dataIndex: "code",
      render: (text) => (
        <strong>#{text?.slice(-14).toUpperCase() || "N/A"}</strong>
      ),
    },
    {
      title: "Ngày Tạo",
      dataIndex: "createdAt",
      render: (date) =>
        new Date(date).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      title: "Yêu cầu khảo sát",
      dataIndex: "scheduledTime",
      render: (time) => {
        if (!time) return <span style={{ color: "#aaa" }}>Chưa xác định</span>;

        return new Date(time).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    {
      title: "Chuyển từ",
      dataIndex: "pickup",
      render: (pickup) => pickup?.address || "Chưa cập nhật",
    },
    {
      title: "Chuyển đến",
      dataIndex: "delivery",
      render: (delivery) => delivery?.address || "Chưa cập nhật",
    },
    {
      title: "Trạng thái",
      render: (_, record) => {
        if (record.invoice) {
          const invoiceStatusMap = {
            DRAFT: { color: "purple", label: "Nháp hóa đơn" },
            CONFIRMED: { color: "blue", label: "Đã xác nhận" },
            ASSIGNED: { color: "cyan", label: "Đã phân công xe" },
            IN_PROGRESS: { color: "processing", label: "Đang vận chuyển" },
            COMPLETED: { color: "success", label: "Hoàn thành" },
            CANCELLED: { color: "error", label: "Đã hủy" },
          };
          const s = invoiceStatusMap[record.invoice.status];
          return (
            <Tag color={s?.color || "purple"}>
              {s?.label || record.invoice.status}
            </Tag>
          );
        }
        return (
          <Tag color={statusColorMap[record.status] || "default"}>
            {statusLabelMap[record.status] || record.status}
          </Tag>
        );
      },
    },
    {
      title: "Sự cố",
      render: (_, record) => {
        const incident = record.invoice?.incident;
        console.log(record);
        if (!incident) {
          return <Tag color="default">Không có</Tag>;
        }

        const statusMap = {
          Open: { color: "orange", label: "Đã báo cáo" },
          Investigating: { color: "blue", label: "Đang xử lý" },
          Resolved: { color: "green", label: "Đã giải quyết" },
          Dismissed: { color: "red", label: "Từ chối xử lý" },
        };

        const s = statusMap[incident.status];

        return (
          <Tag
            color={s?.color}
            style={{ cursor: "pointer" }}
            onClick={() => handleViewIncident(incident)}
          >
            {s?.label}
          </Tag>
        );
      },
    },
    {
      title: "Thanh toán",
      render: (_, record) => {
        const paymentStatus = record?.invoice?.paymentStatus;
        if (!paymentStatus) return <Tag color="default">Chưa phát sinh</Tag>;
        const paymentMap = {
          UNPAID: { color: "orange", label: "Chưa thanh toán" },
          PARTIAL: { color: "green", label: "Đã đặt cọc" },
          PAID: { color: "success", label: "Đã thanh toán" },
        };
        const p = paymentMap[paymentStatus];
        return (
          <Tag color={p?.color || "default"}>{p?.label || paymentStatus}</Tag>
        );
      },
    },
    {
      title: "Báo giá",
      render: (_, record) =>
        record.pricing?.totalPrice ? (
          <strong style={{ color: "#52c41a" }}>
            {record.pricing.totalPrice.toLocaleString()} ₫
          </strong>
        ) : (
          <span style={{ color: "#aaa" }}>Chưa có</span>
        ),
    },
    {
      title: "Thao tác",
      render: (_, record) => (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {record.status === "QUOTED" && (
            <>
              <Button
                type="primary"
                size="small"
                style={{ background: "#52c41a", borderColor: "#52c41a" }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleViewSurvey(record)}
              >
                Chấp nhận
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => {
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
                            t._id === record._id
                              ? { ...t, status: "CANCELLED" }
                              : t,
                          ),
                        );
                      } catch (err) {
                        message.error(
                          "Lỗi khi hủy đơn: " +
                            (err.response?.data?.message || err.message),
                        );
                      }
                    },
                  });
                }}
              >
                Từ chối
              </Button>
            </>
          )}
          {record.status !== "QUOTED" && (
            <Button type="link" size="small" icon={<PhoneOutlined />}>
              Liên hệ
            </Button>
          )}
          {record.pricing?.totalPrice > 0 && (
            <Button
              type="dashed"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewSurvey(record)}
            >
              Xem báo giá
            </Button>
          )}
          {record.status === "ACCEPTED" &&
            record.invoice?.paymentStatus === "UNPAID" && (
              <Button
                type="primary"
                size="small"
                style={{ background: "#d9363e", borderColor: "#d9363e" }}
                onClick={() =>
                  (window.location.href = `/customer/sign-contract/${record._id}`)
                }
              >
                Thanh toán cọc
              </Button>
            )}

          {["COMPLETED", "IN_PROGRESS"].includes(record?.invoice?.status) &&
            !record.invoice?.incident && (
              <Button
                danger
                size="small"
                icon={<WarningOutlined />}
                onClick={() => handleReportIncident(record)}
              >
                Báo cáo sự cố
              </Button>
            )}
        </div>
      ),
    },
  ];

  return (
    <Layout className="view-order-page">
      <AppHeader />

      <Content>
        {/* HERO */}
        <section className="order-hero">
          <div className="overlay" />
          <h1>Thông Tin Chi Tiết</h1>
        </section>

        {/* SCHEDULE TABLE */}
        <section className="order-section">
          <h2>Lịch Chuyển Nhà Của Tôi</h2>
          <Table
            columns={columns}
            dataSource={tickets}
            loading={loading}
            pagination={{ pageSize: 5 }}
            rowKey="_id"
            scroll={{ x: 900 }}
          />
        </section>

        {/*Modal Xem Báo Giá / Khảo Sát */}
        <SurveyPricingModal
          visible={isSurveyModalVisible}
          onClose={() => setIsSurveyModalVisible(false)}
          ticket={selectedTicket}
          survey={selectedSurvey}
          pricing={selectedTicketPricing}
        />

        {/* 2. Modal Chọn Thời Gian Khảo Sát */}
        <SurveyTimeModal
          visible={isSurveyTimeModalVisible}
          onClose={() => setIsSurveyTimeModalVisible(false)}
          ticket={selectedTicketForTime}
          survey={selectedSurvey}
          onSuccess={(ticketId, updatedFields) => {
            // Cập nhật lại UI khi người dùng Accept time hoặc Cancel order
            setTickets((prev) =>
              prev.map((t) =>
                t._id === ticketId ? { ...t, ...updatedFields } : t,
              ),
            );
          }}
        />
        {/* 1. Gọi Component Modal Báo cáo sự cố */}
        {selectedTicket && (
          <ReportIncidentModal
            visible={isReportModalVisible}
            onClose={handleCloseReportModal}
            ticket={selectedTicket}
            onSuccess={(incident) => {
              setTickets((prev) =>
                prev.map((t) =>
                  t._id === selectedTicket._id
                    ? {
                        ...t,
                        invoice: {
                          ...t.invoice,
                          incident: incident,
                        },
                      }
                    : t,
                ),
              );
            }}
          />
        )}

        {/* 2. Gọi Component Modal Xem chi tiết sự cố */}
        <ViewIncidentModal
          visible={isIncidentModalVisible}
          onClose={() => setIsIncidentModalVisible(false)}
          incident={selectedIncident}
        />
      </Content>

      <AppFooter />
    </Layout>
  );
};

export default ViewMovingOrder;
