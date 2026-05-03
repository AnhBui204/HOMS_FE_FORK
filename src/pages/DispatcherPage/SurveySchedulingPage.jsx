import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from 'react-redux';
import {
  Table, Button, Tag, Modal, Form, Select, message, Space, Card, Typography, DatePicker, Divider,
  Row, Col, InputNumber, Checkbox, Alert, Input, Image, Tooltip
} from "antd";
import {
  CheckCircleOutlined, CloseCircleOutlined, RobotOutlined, UserSwitchOutlined, CalendarOutlined, ClockCircleOutlined, DollarCircleOutlined, EyeOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  requestTicketService,
  surveyService,
  userService
} from "../../services/surveysService";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ─── Constants ────────────────────────────────────────────────────────────────
const MOVE_TYPE_CONFIG = {
  FULL_HOUSE: { label: 'Chuyển nhà', color: '#44624a', textColor: '#fff' },
  SPECIFIC_ITEMS: { label: 'Đồ vật lẻ', color: '#8ba888', textColor: '#fff' },
  TRUCK_RENTAL: { label: 'Thuê xe', color: '#f1ebe1', textColor: '#44624a' },
};

const STATUS_MAP = {
  CREATED: { label: 'Chờ xác nhận', color: 'blue' },
  WAITING_SURVEY: { label: 'Đã phân công KS', color: 'green' },
  WAITING_REVIEW: { label: 'Chờ xem xét', color: 'gold' },
  SURVEYED: { label: 'Đã khảo sát', color: 'cyan' },
  QUOTED: { label: 'Đã báo giá', color: 'green' },
  ACCEPTED: { label: 'Đã chấp nhận báo giá', color: 'purple' },
  ASSIGNMENT_FAILED: { label: 'Lỗi phân công', color: 'red' },
  CANCELLED: { label: 'Đã hủy', color: 'red' },
};

const MAX_PORTERS = {
  "500KG": 1,
  "1TON": 2,
  "1.5TON": 3,
  "2TON": 4,
};

const FILTER_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'FULL_HOUSE', label: 'Chuyển nhà' },
  { key: 'SPECIFIC_ITEMS', label: 'Đồ vật lẻ' },
  { key: 'TRUCK_RENTAL', label: 'Thuê xe' },
];

const parseSurveyInfoFromNotes = (notesString) => {
  let surveyType = "Chưa rõ";
  let scheduledDate = null;
  if (!notesString) return { surveyType, scheduledDate };
  const typeMatch = notesString.match(/Survey type:\s*([a-zA-Z]+)/i);
  if (typeMatch && typeMatch[1]) surveyType = typeMatch[1].toUpperCase();
  const dateMatch = notesString.match(/Survey date:\s*([^\s|]+)/i);
  if (dateMatch && dateMatch[1]) scheduledDate = dateMatch[1];
  return { surveyType, scheduledDate };
};
const isAiGeneratedTicket = (notesString) => {
  if (!notesString) return false;
  return notesString.includes("[TẠO TỪ AI BOT");
};
// ─── MoveType Badge ───────────────────────────────────────────────────────────
const MoveTypeBadge = ({ moveType }) => {
  const cfg = MOVE_TYPE_CONFIG[moveType] || { label: moveType, color: '#ccc', textColor: '#333' };
  return (
    <span style={{
      display: 'inline-block',
      background: cfg.color,
      color: cfg.textColor,
      borderRadius: 12,
      padding: '2px 12px',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: 0.3,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
};

// ─── Filter Tab Bar ───────────────────────────────────────────────────────────
const FilterTabBar = ({ active, onChange }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
    {FILTER_TABS.map(tab => {
      const isActive = active === tab.key;
      const cfg = MOVE_TYPE_CONFIG[tab.key];
      return (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          style={{
            padding: '6px 18px',
            borderRadius: 20,
            border: `1.5px solid ${isActive ? '#44624a' : '#c0cfb2'}`,
            background: isActive
              ? (cfg?.color || '#44624a')
              : '#fff',
            color: isActive
              ? (cfg?.textColor || '#fff')
              : '#44624a',
            cursor: 'pointer',
            fontWeight: isActive ? 700 : 500,
            fontSize: 13,
            transition: 'all 0.18s',
          }}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const SurveySchedulingPage = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Modals
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [isManualAssignModalVisible, setIsManualAssignModalVisible] = useState(false); // ASSIGNMENT_FAILED fallback
  const [isAcceptProposedModalVisible, setIsAcceptProposedModalVisible] = useState(false);
  const [isTruckRentalModalVisible, setIsTruckRentalModalVisible] = useState(false);
  const [isPreviewPricingModalVisible, setIsPreviewPricingModalVisible] = useState(false);

  // Selected proposed time inside the "Xem đề xuất khách" modal
  const [selectedProposedTime, setSelectedProposedTime] = useState(null);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [previewPricingData, setPreviewPricingData] = useState(null);
  const [isCalculatingPreview, setIsCalculatingPreview] = useState(false);

  const [formReject] = Form.useForm();
  const [formManual] = Form.useForm();
  const [formTruckRental] = Form.useForm();
  const [isAiReviewModalVisible, setIsAiReviewModalVisible] = useState(false);
  const [currentAiSurveyData, setCurrentAiSurveyData] = useState(null);
  const [formAiReview] = Form.useForm();

  const user = useSelector((state) => state.auth.user);
  // console.log(" [DEBUG] Current User Object:", user);
  const isHeadDispatcher =
    user?.dispatcherProfile?.isGeneral === true ||
    user?.dispatcherProfile?.isGeneral === "true";

  // ── Data Fetching ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      /* 
      Filter statuses conditionally based on the role: 
       - Head Dispatcher sees CREATED to perform approve/reject actions.
       - District Dispatcher only sees tickets that have already been approved (status != CREATED).
      */
      const queryStatuses = isHeadDispatcher
        ? "CREATED,WAITING_SURVEY,WAITING_REVIEW,ASSIGNMENT_FAILED"
        : "WAITING_SURVEY,WAITING_REVIEW,ASSIGNMENT_FAILED";

      const [resTickets, resDispatchers] = await Promise.all([
        requestTicketService.getTickets({
          status: queryStatuses
        }),
        userService.getDispatchers()
      ]);

      const ticketsData = resTickets.data?.data || resTickets.data || [];
      const dispatchersData = resDispatchers.data?.data || resDispatchers.data || [];

      setTickets(ticketsData);
      setSurveyors(dispatchersData);
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi tải dữ liệu từ máy chủ");
    } finally {
      setLoading(false);
    }
  }, [isHeadDispatcher]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Client-side Filter ──────────────────────────────────────────────────────
  useEffect(() => {
    if (activeFilter === 'ALL') {
      setFilteredTickets(tickets);
    } else {
      setFilteredTickets(tickets.filter(t => t.moveType === activeFilter));
    }
  }, [tickets, activeFilter]);

  // ── Action Handlers ─────────────────────────────────────────────────────────
  const openAiReviewModal = async (ticket) => {
    setSelectedTicket(ticket);
    setLoading(true);
    try {
      // Gọi API lấy dữ liệu khảo sát (Backend đã viết sẵn hàm tự động fallback nếu cần)
      const res = await surveyService.getSurveyByTicket(ticket._id);
      const surveyData = res.data?.data || res.data || res;
      setCurrentAiSurveyData(surveyData);

      // Đổ dữ liệu AI đề xuất vào form để dispatcher có thể sửa nếu muốn
      formAiReview.resetFields();
      formAiReview.setFieldsValue({
        suggestedVehicle: surveyData.suggestedVehicle || '1TON',
        suggestedStaffCount: surveyData.suggestedStaffCount || 2,
        distanceKm: surveyData.distanceKm || ticket.distanceKm || 0,
        needsAssembling: !!surveyData.needsAssembling,
        needsPacking: !!surveyData.needsPacking,
        notes: surveyData.notes || ""
      });

      setIsAiReviewModalVisible(true);
    } catch (error) {
      message.error("Lỗi khi tải dữ liệu AI từ hệ thống!");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  const handlePreviewAiPricing = async () => {
    try {
      const values = await formAiReview.validateFields();
      setIsCalculatingPreview(true);

      const payload = { ...currentAiSurveyData, ...values };
      const res = await surveyService.previewPricing(selectedTicket._id, payload);
      const apiData = res.data?.data || res.data;

      if (apiData.breakdown) {
        apiData.breakdown.suggestedVehicle = apiData.breakdown.suggestedVehicle || values.suggestedVehicle;
        apiData.breakdown.suggestedStaffCount = apiData.breakdown.suggestedStaffCount || values.suggestedStaffCount;
      }

      setPreviewPricingData(apiData);
      setIsPreviewPricingModalVisible(true);
    } catch (error) {
      message.error("Vui lòng kiểm tra lại thông tin!");
    } finally {
      setIsCalculatingPreview(false);
    }
  };

  // Nút chốt báo giá cuối cùng từ Modal Preview
  const handleConfirmAiQuote = async () => {
    try {
      const values = await formAiReview.validateFields();
      const payload = {
        ...currentAiSurveyData,
        ...values,
        status: 'COMPLETED'
      };

      // Gửi API completeSurvey -> Backend sẽ tự chuyển thành QUOTED và gửi cho khách
      await surveyService.completeSurvey(selectedTicket._id, payload);

      message.success(`Đã báo giá thành công cho đơn AI ${selectedTicket.code}`);
      setIsPreviewPricingModalVisible(false);
      setIsAiReviewModalVisible(false);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi khi chốt báo giá!");
    }
  };

  // "Duyệt đơn" for SPECIFIC_ITEMS → direct API call
  const handleDirectApprove = async (ticket) => {
    try {
      await requestTicketService.approveTicket(ticket._id);
      message.success(`Đã duyệt và tự động điều phối đơn ${ticket.code}`);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi duyệt đơn!");
    }
  };

  // "Báo giá" for TRUCK_RENTAL → open custom modal
  const openTruckRentalQuoteModal = async (ticket) => {
    setSelectedTicket(ticket);
    const rental = ticket.rentalDetails || {};

    // Reset and then set values to ensure checkboxes update correctly
    formTruckRental.resetFields();
    formTruckRental.setFieldsValue({
      suggestedVehicle: rental.truckType || '1TON',
      suggestedStaffCount: (rental.extraStaffCount || 0) + 1, // +1 for driver
      rentalDurationHours: rental.rentalDurationHours || 2,
      needsAssembling: !!rental.needsAssembling,
      needsPacking: !!rental.needsPacking,
      notes: ticket.notes || ""
    });
    setIsTruckRentalModalVisible(true);
  };

  const handlePreviewTruckRentalPricing = async () => {
    try {
      const values = await formTruckRental.validateFields();
      setIsCalculatingPreview(true);
      const payload = {
        ...values,
        suggestedVehicles: [{ vehicleType: values.suggestedVehicle, count: 1 }],
        estimatedHours: values.rentalDurationHours,
        items: [] // Truck rental usually doesn't need detailed items for pricing
      };
      const res = await surveyService.previewPricing(selectedTicket._id, payload);
      const apiData = res.data?.data || res.data;

      if (apiData.breakdown) {
        apiData.breakdown.suggestedVehicle = apiData.breakdown.suggestedVehicle || values.suggestedVehicle;
        apiData.breakdown.suggestedStaffCount = apiData.breakdown.suggestedStaffCount || values.suggestedStaffCount;
      }

      setPreviewPricingData(res.data);
      setIsPreviewPricingModalVisible(true);
    } catch (error) {
      message.error("Vui lòng điền đủ thông tin!");
    } finally {
      setIsCalculatingPreview(false);
    }
  };

  const handleConfirmTruckRentalQuote = async () => {
    try {
      const values = await formTruckRental.validateFields();
      const payload = {
        ...values,
        suggestedVehicles: [{ vehicleType: values.suggestedVehicle, count: 1 }],
        estimatedHours: values.rentalDurationHours,
        items: [],
        status: 'COMPLETED'
      };

      // Step 1: Complete Survey
      await surveyService.completeSurvey(selectedTicket._id, payload);

      // Step 2: Transition is already handled by completeSurvey in BE (transitions to QUOTED)

      message.success(`Đã báo giá thành công cho đơn ${selectedTicket.code}`);
      setIsPreviewPricingModalVisible(false);
      setIsTruckRentalModalVisible(false);
      fetchData();
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || "Lỗi khi báo giá!");
    }
  };

  // "Từ chối" → propose new time
  const handleCancelTicket = (ticket) => {
    setSelectedTicket(ticket);
    formReject.resetFields();
    setIsRejectModalVisible(true);
  };

  // Confirmation dialogs before performing approve/reject actions
  const showApproveConfirm = (ticket) => {
    Modal.confirm({
      title: 'Xác nhận duyệt đơn',
      content: `Bạn có chắc muốn duyệt đơn #${ticket?.code || ''}?`,
      okText: 'Duyệt',
      cancelText: 'Hủy',
      onOk: async () => {
        // call existing approve handler
        await handleDirectApprove(ticket);
      }
    });
  };

  const showRejectConfirm = (ticket) => {
    Modal.confirm({
      title: 'Xác nhận từ chối đơn',
      content: `Bạn có chắc muốn từ chối đơn #${ticket?.code || ''}? Sau khi xác nhận, bạn có thể gửi đề xuất lịch mới cho khách.`,
      okText: 'Từ chối',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => {
        // open the reject modal flow
        handleCancelTicket(ticket);
      }
    });
  };

  const handleRejectSubmit = async (values) => {
    try {
      if (!values.proposedTimes || values.proposedTimes.length === 0) {
        return message.error("Vui lòng thêm ít nhất một thời gian đề xuất!");
      }
      const proposedTimes = values.proposedTimes.map(d => d.toISOString());
      await requestTicketService.proposeTime(selectedTicket._id, {
        proposedTimes,
        surveyorId: values.surveyorId,
        reason: values.reason?.join(", ") || ""
      });
      message.success(`Đã từ chối đơn ${selectedTicket.code} và đề xuất lịch mới`);
      setIsRejectModalVisible(false);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi khi từ chối đơn!");
    }
  };

  // "Phân công thủ công" for ASSIGNMENT_FAILED
  const openManualAssignModal = (ticket) => {
    setSelectedTicket(ticket);
    formManual.resetFields();
    setIsManualAssignModalVisible(true);
  };

  const handleManualAssignSubmit = async (values) => {
    try {
      // Re-approve with a specific surveyor selected manually
      await requestTicketService.approveTicket(selectedTicket._id, {
        surveyorId: values.surveyorId,
      });
      message.success(`Đã phân công thủ công cho đơn ${selectedTicket.code}`);
      setIsManualAssignModalVisible(false);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi phân công thủ công!");
    }
  };

  const openAcceptProposedModal = (ticket) => {
    setSelectedTicket(ticket);
    setIsAcceptProposedModalVisible(true);
  };

  const handleAcceptProposed = async (time) => {
    try {
      await requestTicketService.dispatcherAcceptTime(selectedTicket._id, time);
      message.success(`Đã chấp nhận giờ khảo sát cho đơn ${selectedTicket.code}`);
      setIsAcceptProposedModalVisible(false);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi khi chấp nhận giờ!");
    }
  };

  // ── Table Columns ───────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Mã Đơn",
      dataIndex: "code",
      width: 150,
      render: (code, r) => (
        <div style={{ minWidth: 140 }}>
          <Text strong>{code}</Text>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {r.isHighValue && (
              <Tag color="#d4b106" style={{ fontSize: '10px', margin: 0, border: 'none', fontWeight: 700 }}>
                💎 GIÁ TRỊ CAO
              </Tag>
            )}
            {r.insurance?.isInsured && (
              <Tag color="#10b981" style={{ fontSize: '10px', margin: 0, border: 'none', fontWeight: 700 }}>
                🛡️ BẢO HIỂM
              </Tag>
            )}
          </div>
        </div>
      )
    },
    {
      title: "Loại dịch vụ",
      dataIndex: "moveType",
      width: 130,
      render: (moveType) => <MoveTypeBadge moveType={moveType} />,
    },
    {
      title: "Khách hàng",
      width: 160,
      ellipsis: true,
      render: (_, r) => <div style={{ minWidth: 140 }}>{r.customerId?.fullName}</div>
    },
    // {
    //   title: "Ghi chú đặc biệt",
    //   width: 220,
    //   render: (_, r) => (
    //     <div style={{ minWidth: 200 }}>
    //       {r.isHighValue && (
    //         <div style={{ marginBottom: 4 }}>
    //           <Text type="secondary" size="small">Giá trị: </Text>
    //           <Text strong>{(r.highValueDetails?.declaredValue || 0).toLocaleString()} ₫</Text>
    //           <br />
    //           <Text italic style={{ fontSize: '12px' }}>{r.highValueDetails?.description}</Text>
    //         </div>
    //       )}
    //       {r.insurance?.isInsured && (
    //         <Tag color="cyan">Gói: {r.insurance.packageId}</Tag>
    //       )}
    //     </div>
    //   )
    // },
    {
      title: "Yêu cầu khảo sát",
      width: 200,
      render: (_, r) => {
        if (isAiGeneratedTicket(r.notes)) {
          return (
            <div>
              <b>Thời gian:</b> <Tag color="purple">Tự động (AI)</Tag> <br />
              <b>Hình thức:</b> <Tag color="purple">Trực tuyến (AI)</Tag>
            </div>
          );
        }
        if (r.moveType !== 'FULL_HOUSE') {
          return (
            <Tag
              icon={<RobotOutlined />}
              style={{
                background: '#f1ebe1',
                color: '#8ba888',
                border: '1px solid #c0cfb2',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Tự động điều phối
            </Tag>
          );
        }
        const { surveyType, scheduledDate } = parseSurveyInfoFromNotes(r.notes);
        return (
          <div>
            <b>Thời gian:</b> {scheduledDate ? dayjs(scheduledDate).format("HH:mm - DD/MM/YYYY") : "Chưa rõ"} <br />
            <b>Hình thức:</b>{' '}
            <Tag color={surveyType === "ONLINE" ? "purple" : "cyan"}>
              {surveyType === "ONLINE" ? "Trực tuyến" : "Trực tiếp"}
            </Tag>
          </div>
        );
      },
    },
    {
      title: "Khu vực",
      width: 110,
      render: (_, r) => (
        <Tag color="orange" style={{ fontWeight: 'bold' }}>
          {r.pickup?.district || "Chưa xác định"}
        </Tag>
      ),
    },
    {
      title: "Tuyến đường",
      width: 280,
      render: (_, r) => (
        <div style={{ maxWidth: 260 }}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" small>Từ: </Text>
            <Text ellipsis={{ tooltip: r.pickup?.address }}>{r.pickup?.address}</Text>
          </div>
          <div>
            <Text type="secondary" small>Đến: </Text>
            <Text ellipsis={{ tooltip: r.delivery?.address }}>{r.delivery?.address}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 150,
      render: (status) => {
        const config = STATUS_MAP[status] || { label: status, color: "default" };
        return <Tag color={config.color} style={{ minWidth: 100, textAlign: 'center' }}>{config.label}</Tag>;
      },
    },
    {
      title: "Hành động",
      width: 120, // using less width since it's just circular icons now
      fixed: "right",
      render: (_, record) => {
        const isAi = isAiGeneratedTicket(record.notes);

        return (
          <Space size="small">
            {/* --- ĐỐI VỚI TRẠNG THÁI CREATED --- */}
            {record.status === "CREATED" && (
              <>
                {!isAi && record.moveType === 'TRUCK_RENTAL' ? (
                  <Tooltip title="Báo giá">
                    <Button
                      type="primary"
                      shape="circle"
                      style={{ background: "#44624a", borderColor: "#44624a" }}
                      icon={<DollarCircleOutlined />}
                      onClick={() => openTruckRentalQuoteModal(record)}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip title="Duyệt đơn">
                    <Button
                      type="primary"
                      shape="circle"
                      style={{ background: "#44624a", borderColor: "#44624a" }}
                      icon={<CheckCircleOutlined />}
                      onClick={() => showApproveConfirm(record)}
                    />
                  </Tooltip>
                )}
                <Tooltip title="Từ chối">
                  <Button
                    danger
                    shape="circle"
                    icon={<CloseCircleOutlined />}
                    onClick={() => showRejectConfirm(record)}
                  />
                </Tooltip>
              </>
            )}
            {/* --- STATE: WAITING_REVIEW --- */}
            {record.status === "WAITING_REVIEW" && (
              <>
                {record.moveType === 'TRUCK_RENTAL' ? (
                  <Tooltip title="Xem xét & Báo giá">
                    <Button
                      type="primary"
                      shape="circle"
                      style={{ background: "#44624a", borderColor: "#44624a" }}
                      icon={<DollarCircleOutlined />}
                      onClick={() => openTruckRentalQuoteModal(record)}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip title={isAi ? "Xem DL AI & Báo giá" : "Xem xét & Báo giá"}>
                    <Button
                      type="primary"
                      shape="circle"
                      style={{
                        background: isAi ? "#722ed1" : "#1890ff",
                        borderColor: isAi ? "#722ed1" : "#1890ff"
                      }}
                      icon={isAi ? <RobotOutlined /> : <EyeOutlined />}
                      onClick={() => openAiReviewModal(record)}
                    />
                  </Tooltip>
                )}
              </>
            )}

            {/* --- STATE: WAITING_SURVEY --- */}
            {record.status === "WAITING_SURVEY" && record.proposedSurveyTimes?.length > 0 && (
              <Tooltip title="Xem đề xuất khách">
                <Button
                  type="primary"
                  shape="circle"
                  style={{ background: "#44624a", borderColor: "#8ba888" }}
                  icon={<CalendarOutlined />}
                  onClick={() => openAcceptProposedModal(record)}
                />
              </Tooltip>
            )}

            {/* --- STATE: ASSIGNMENT_FAILED --- */}
            {record.status === "ASSIGNMENT_FAILED" && (
              <Tooltip title="Phân công thủ công">
                <Button
                  type="primary"
                  danger
                  shape="circle"
                  icon={<UserSwitchOutlined />}
                  onClick={() => openManualAssignModal(record)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Card>
      <Title level={4} style={{ color: "#44624a" }}>
        Xác nhận & Phân công
      </Title>

      {/* Filter Tab Bar */}
      <FilterTabBar active={activeFilter} onChange={setActiveFilter} />

      <Table
        columns={columns}
        dataSource={filteredTickets}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 1400 }}
        rowClassName={(record) =>
          record.status === 'ASSIGNMENT_FAILED' ? 'row-assignment-failed' : ''
        }
      />

      {/* ── Modal: Từ chối & Đề xuất lịch mới ── */}
      <Modal
        title={`TỪ CHỐI & ĐỀ XUẤT LỊCH MỚI — #${selectedTicket?.code}`}
        open={isRejectModalVisible}
        onCancel={() => setIsRejectModalVisible(false)}
        onOk={() => formReject.submit()}
        okText="Từ chối & Gửi đề xuất"
        okButtonProps={{ danger: true }}
      >
        <Form form={formReject} layout="vertical" onFinish={handleRejectSubmit}>
          <Form.Item
            name="surveyorId"
            label="Nhân viên dự kiến (khi khách chọn lịch mới)"
          >
            <Select placeholder="Chọn nhân viên" allowClear>
              {surveyors.map((u) => (
                <Option key={u._id} value={u._id}>
                  {u.fullName} {u.phone ? `- ${u.phone}` : ""}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.List name="proposedTimes">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name]}
                      rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
                    >
                      <DatePicker showTime format="HH:mm DD/MM/YYYY" placeholder="Chọn ngày giờ" />
                    </Form.Item>
                    <CloseCircleOutlined style={{ color: "red" }} onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block>
                    + Thêm mốc thời gian đề xuất
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item name="reason" label="Lý do từ chối">
            <Select mode="tags" style={{ width: "100%" }} placeholder="Nhập lý do và ấn Enter..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Phân công thủ công (ASSIGNMENT_FAILED fallback) ── */}
      <Modal
        title={`PHÂN CÔNG THỦ CÔNG — #${selectedTicket?.code}`}
        open={isManualAssignModalVisible}
        onCancel={() => setIsManualAssignModalVisible(false)}
        onOk={() => formManual.submit()}
        okText="Xác nhận phân công"
        okButtonProps={{ style: { background: '#44624a', borderColor: '#44624a' } }}
      >
        <div style={{
          marginBottom: 16, padding: 14, background: '#fff1f0',
          borderRadius: 10, border: '1px solid #ffccc7'
        }}>
          <Text type="danger" strong>
            Hệ thống không thể tự động phân công vì tất cả nhân viên đang quá tải.
            Vui lòng chọn thủ công.
          </Text>
        </div>
        <Form form={formManual} layout="vertical" onFinish={handleManualAssignSubmit}>
          <Form.Item
            name="surveyorId"
            label="Phân công nhân viên điều phối"
            rules={[{ required: true, message: "Vui lòng chọn nhân viên!" }]}
          >
            <Select placeholder="Chọn nhân viên điều phối">
              {surveyors.map((u) => (
                <Option key={u._id} value={u._id}>
                  {u.fullName} {u.phone ? `- ${u.phone}` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Chấp nhận giờ khách đề xuất ── */}
      <Modal
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarOutlined /> GIỜ KHẢO SÁT KHÁCH ĐỀ XUẤT — <span style={{ color: '#8ba888', marginLeft: 8, fontWeight: 700 }}>{selectedTicket?.code}</span></span>}
        open={isAcceptProposedModalVisible}
        onCancel={() => { setIsAcceptProposedModalVisible(false); setSelectedProposedTime(null); }}
        onOk={() => {
          if (!selectedProposedTime) { message.warning('Vui lòng chọn một khung giờ trước khi chốt'); return; }
          handleAcceptProposed(selectedProposedTime);
          setSelectedProposedTime(null);
        }}
        okText="Chốt giờ này"
        okButtonProps={{ style: { background: '#44624a', borderColor: '#44624a' } }}
        cancelText="Hủy"
      >
        <style>{`
          .proposed-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; cursor: pointer; border: 1px solid #f0f0f0; }
          .proposed-card:hover { transform: translateY(-6px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
          .proposed-card.selected { border-color: #8ba888; box-shadow: 0 12px 30px rgba(139,168,136,0.18); transform: translateY(-8px); }
          .proposed-time { font-size: 15px; font-weight: 700; color: #333; }
          .proposed-sub { color: #666; font-size: 13px; }
        `}</style>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ background: '#fff7ed', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClockCircleOutlined style={{ fontSize: 20, color: '#d46b08' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong>Lý do khách đổi lịch:</Text>
            <div style={{ marginTop: 6 }}>
              <Text type="danger">{selectedTicket?.rescheduleReason || "Không có lý do cụ thể"}</Text>
            </div>
          </div>
        </div>

        <Divider orientation="left">Chọn một khung giờ để chốt</Divider>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {selectedTicket?.proposedSurveyTimes?.length ? selectedTicket.proposedSurveyTimes.map((time, idx) => {
            const isSel = selectedProposedTime === time;
            return (
              <Card key={idx} className={`proposed-card ${isSel ? 'selected' : ''}`} bodyStyle={{ padding: 12 }} onClick={() => setSelectedProposedTime(time)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="proposed-time"><CalendarOutlined style={{ marginRight: 8, color: '#8ba888' }} />{dayjs(time).format('HH:mm - DD/MM/YYYY')}</div>
                    <div className="proposed-sub">Đề xuất bởi khách hàng</div>
                  </div>
                  <div style={{ minWidth: 72, textAlign: 'right' }}>
                    {isSel ? (
                      <Button type="primary" style={{ background: '#8ba888', borderColor: '#8ba888' }} icon={<CheckCircleOutlined />}>Đã chọn</Button>
                    ) : (
                      <Button type="default" style={{ background: '#ffffff', border: '1px solid #8ba888', color: '#8ba888' }} onClick={() => setSelectedProposedTime(time)}>Chọn</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          }) : (
            <div style={{ padding: 18, textAlign: 'center', color: '#666' }}>Không có đề xuất giờ nào từ khách</div>
          )}
        </div>
      </Modal>

      {/* ── Modal: Báo giá Thuê xe tải (Global Dispatcher) ── */}
      <Modal
        title={`XEM XÉT & BÁO GIÁ THUÊ XE — #${selectedTicket?.code}`}
        open={isTruckRentalModalVisible}
        onCancel={() => setIsTruckRentalModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsTruckRentalModalVisible(false)}>Hủy</Button>,
          <Button
            key="preview"
            type="primary"
            icon={<DollarCircleOutlined />}
            loading={isCalculatingPreview}
            onClick={handlePreviewTruckRentalPricing}
            style={{ background: '#44624a', borderColor: '#44624a' }}
          >
            Tính giá & Xem trước
          </Button>
        ]}
        width={700}
      >
        <Form form={formTruckRental} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="suggestedVehicle" label="Loại xe tải" rules={[{ required: true }]}>
                <Select onChange={() => {
                  const val = formTruckRental.getFieldValue('suggestedVehicle');
                  const currentStaff = formTruckRental.getFieldValue('suggestedStaffCount');
                  const max = 1 + (MAX_PORTERS[val] || 0);
                  if (currentStaff > max) formTruckRental.setFieldsValue({ suggestedStaffCount: max });
                }}>
                  <Option value="500KG">Xe 500 KG</Option>
                  <Option value="1TON">Xe 1 Tấn</Option>
                  <Option value="1.5TON">Xe 1.5 Tấn</Option>
                  <Option value="2TON">Xe 2 Tấn</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rentalDurationHours" label="Thời gian thuê (giờ)" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="suggestedStaffCount"
                label="Tổng nhân sự (Tài xế + Người giúp)"
                rules={[{ required: true }]}
                extra={(() => {
                  const v = formTruckRental.getFieldValue('suggestedVehicle');
                  return `Tối đa ${1 + (MAX_PORTERS[v] || 0)} người cho xe này (Đã bao gồm 1 tài xế)`;
                })()}
              >
                <InputNumber
                  min={1}
                  max={1 + (MAX_PORTERS[formTruckRental.getFieldValue('suggestedVehicle')] || 4)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="needsAssembling" valuePropName="checked">
                <Checkbox>Cần tháo lắp đồ đạc</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="needsPacking" valuePropName="checked">
                <Checkbox>Cần đóng gói đồ đạc</Checkbox>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Ghi chú điều phối">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Chi tiết tính giá (Preview) ── */}
      <Modal
        title={<Title level={4} style={{ margin: 0, color: '#44624A' }}>Chi tiết tính giá đơn hàng</Title>}
        open={isPreviewPricingModalVisible}
        onCancel={() => setIsPreviewPricingModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsPreviewPricingModalVisible(false)}>Quay lại</Button>,
          <Button
            key="submit"
            type="primary"
            style={{ background: '#44624A', borderColor: '#44624A' }}
            onClick={() => {
              if (isAiReviewModalVisible) {
                handleConfirmAiQuote();
              } else if (isTruckRentalModalVisible) {
                handleConfirmTruckRentalQuote();
              }
            }}
          >
            Xác nhận & Gửi báo giá
          </Button>
        ]}
        width={600}
      >
        {previewPricingData && (
          <div style={{ padding: '10px 0' }}>
            <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text>Phí thuê xe ({previewPricingData.breakdown?.suggestedVehicles?.map(v => `${v.count}x${v.vehicleType}`).join(' + ') || previewPricingData.breakdown?.suggestedVehicle || '—'}):</Text>
                <Text strong>{(previewPricingData.breakdown?.vehicleFee || 0).toLocaleString()} ₫</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text>Phí nhân công ({previewPricingData.breakdown?.suggestedStaffCount || 0} người):</Text>
                <Text strong>{(previewPricingData.breakdown?.laborFee || 0).toLocaleString()} ₫</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text>Phí tháo lắp:</Text>
                <Text strong>{(previewPricingData.breakdown?.assemblingFee || 0).toLocaleString()} ₫</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text>Phí đóng gói:</Text>
                <Text strong>{(previewPricingData.breakdown?.packingFee || 0).toLocaleString()} ₫</Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Title level={4} style={{ margin: 0 }}>TỔNG CỘNG:</Title>
                <Title level={4} style={{ margin: 0, color: '#44624A' }}>
                  {(previewPricingData.totalPrice || 0).toLocaleString()} ₫
                </Title>
              </div>
            </div>
            <Alert
              message="Thông báo"
              description="Hệ thống sẽ lưu bảng giá này và gửi thông báo cho khách hàng xác nhận."
              type="info"
              showIcon
            />
          </div>
        )}
      </Modal>
      <Modal
        title={
          <span style={{ color: '#722ed1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RobotOutlined /> DUYỆT DỮ LIỆU AI & BÁO GIÁ — #{selectedTicket?.code}
          </span>
        }
        open={isAiReviewModalVisible}
        onCancel={() => setIsAiReviewModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setIsAiReviewModalVisible(false)}>Hủy</Button>,
          <Button
            key="preview"
            type="primary"
            icon={<DollarCircleOutlined />}
            loading={isCalculatingPreview}
            onClick={handlePreviewAiPricing}
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
          >
            Tính giá & Báo giá
          </Button>
        ]}
      >
        <Alert
          message="Đơn hàng được phân tích tự động từ Facebook/AI"
          description="Vui lòng kiểm tra lại danh sách đồ đạc AI đã quét và điều chỉnh loại xe/nhân sự nếu cần trước khi gửi báo giá cuối cùng cho khách."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Typography.Title level={5}>🖼️ Ảnh chụp đồ đạc từ khách hàng:</Typography.Title>
        <div style={{ marginBottom: 20 }}>
          {currentAiSurveyData?.images?.length > 0 ? (
            <Image.PreviewGroup>
              <Space wrap>
                {currentAiSurveyData.images.map((img, idx) => (
                  <Image
                    key={idx}
                    width={100}
                    height={100}
                    src={img.url}
                    alt={`Ảnh khách gửi ${idx + 1}`}
                    style={{ objectFit: 'cover', borderRadius: '8px', border: '1px solid #d9d9d9' }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          ) : (
            <Text type="secondary" italic>Không có hình ảnh đính kèm từ khách hàng.</Text>
          )}
        </div>
        {/* Hiển thị danh sách đồ đạc AI quét được */}
        <Typography.Title level={5}>📦 Danh sách đồ đạc AI nhận diện:</Typography.Title>
        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: 20, border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
          {currentAiSurveyData?.items?.length > 0 ? (
            currentAiSurveyData.items.map((item, idx) => (
              <Tag color="geekblue" key={idx} style={{ margin: '4px', fontSize: '13px', padding: '4px 8px' }}>
                {item.name || item.itemName} (SL: {item.quantity || 1})
              </Tag>
            ))
          ) : (
            <Text type="secondary" italic>AI không bóc tách được chi tiết đồ đạc, hoặc chỉ quét ra khối lượng tổng.</Text>
          )}
        </div>

        {/* Form điều chỉnh để Dispatcher sửa quyết định của AI */}
        <Typography.Title level={5}>🛠️ Điều chỉnh phương án vận chuyển:</Typography.Title>
        <Form form={formAiReview} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="suggestedVehicle" label="Loại xe tải đề xuất" rules={[{ required: true }]}>
                <Select>
                  <Option value="500KG">Xe 500 KG</Option>
                  <Option value="1TON">Xe 1 Tấn</Option>
                  <Option value="1.5TON">Xe 1.5 Tấn</Option>
                  <Option value="2TON">Xe 2 Tấn</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="suggestedStaffCount" label="Số nhân viên (Gồm tài xế)" rules={[{ required: true }]}>
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="distanceKm" label="Quãng đường (Km)" rules={[{ required: true }]}>
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="needsAssembling" valuePropName="checked">
                <Checkbox>Cần tháo lắp đồ đạc</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="needsPacking" valuePropName="checked">
                <Checkbox>Cần đóng gói đồ đạc</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Ghi chú thêm (Gửi khách hàng)">
            <TextArea rows={2} placeholder="Ví dụ: AI đã tính toán thiếu, chúng tôi bổ sung thêm xe..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SurveySchedulingPage;