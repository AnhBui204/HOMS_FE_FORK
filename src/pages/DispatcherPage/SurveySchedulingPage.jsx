import React, { useState, useEffect } from "react";
import {
  Table, Button, Tag, Modal, Form, Select, message, Space, Card, Typography, Descriptions, DatePicker, Divider
} from "antd";
import {
  CheckCircleOutlined, CloseCircleOutlined, RobotOutlined, UserSwitchOutlined, CalendarOutlined, ClockCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  requestTicketService,
  surveyService,
  userService
} from "../../services/surveysService";

const { Title, Text } = Typography;
const { Option } = Select;

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
  ASSIGNMENT_FAILED: { label: 'Lỗi phân công', color: 'red' },
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
  const [isApproveModalVisible, setIsApproveModalVisible] = useState(false);  // FULL_HOUSE approve
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [isManualAssignModalVisible, setIsManualAssignModalVisible] = useState(false); // ASSIGNMENT_FAILED fallback
  const [isAcceptProposedModalVisible, setIsAcceptProposedModalVisible] = useState(false);

  // Selected proposed time inside the "Xem đề xuất khách" modal
  const [selectedProposedTime, setSelectedProposedTime] = useState(null);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [form] = Form.useForm();
  const [formReject] = Form.useForm();
  const [formManual] = Form.useForm();

  // ── Data Fetching ───────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTickets, resDispatchers] = await Promise.all([
        requestTicketService.getTickets({
          status: "CREATED,WAITING_SURVEY,WAITING_REVIEW,ASSIGNMENT_FAILED"
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
  };

  useEffect(() => { fetchData(); }, []);

  // ── Client-side Filter ──────────────────────────────────────────────────────
  useEffect(() => {
    if (activeFilter === 'ALL') {
      setFilteredTickets(tickets);
    } else {
      setFilteredTickets(tickets.filter(t => t.moveType === activeFilter));
    }
  }, [tickets, activeFilter]);

  // ── Action Handlers ─────────────────────────────────────────────────────────

  // "Duyệt đơn" for FULL_HOUSE → open modal to pick surveyor
  const openApproveModal = (ticket) => {
    setSelectedTicket(ticket);
    form.resetFields();
    setIsApproveModalVisible(true);
  };

  // "Duyệt đơn" for SPECIFIC_ITEMS / TRUCK_RENTAL → direct API call
  const handleDirectApprove = async (ticket) => {
    try {
      await requestTicketService.approveTicket(ticket._id);
      message.success(`Đã duyệt và tự động điều phối đơn ${ticket.code}`);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi duyệt đơn!");
    }
  };

  // FULL_HOUSE approve modal submit → calls /approve with surveyorId
  const handleApproveSubmit = async (values) => {
    try {
      await requestTicketService.approveTicket(selectedTicket._id, {
        surveyorId: values.surveyorId,
      });
      message.success(`Đã duyệt và phân công khảo sát cho đơn ${selectedTicket.code}`);
      setIsApproveModalVisible(false);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi xác nhận!");
    }
  };

  // "Từ chối" → propose new time
  const handleCancelTicket = (ticket) => {
    setSelectedTicket(ticket);
    formReject.resetFields();
    setIsRejectModalVisible(true);
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
      render: (code) => <strong>{code}</strong>
    },
    {
      title: "Loại dịch vụ",
      dataIndex: "moveType",
      render: (moveType) => <MoveTypeBadge moveType={moveType} />,
    },
    {
      title: "Khách hàng",
      render: (_, r) => <div>{r.customerId?.fullName}</div>
    },
    {
      title: "Yêu cầu khảo sát",
      render: (_, r) => {
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
      render: (_, r) => (
        <Tag color="orange" style={{ fontWeight: 'bold' }}>
          {r.pickup?.district || "Chưa xác định"}
        </Tag>
      ),
    },
    {
      title: "Tuyến đường",
      render: (_, r) => (
        <div>Từ: {r.pickup?.address} <br />Đến: {r.delivery?.address}</div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status) => {
        const config = STATUS_MAP[status] || { label: status, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "Hành động",
      render: (_, record) => (
        <Space size="small" direction="vertical">
          {/* CREATED — Approve button (both types) */}
          {record.status === "CREATED" && (
            <>
              <Button
                type="primary"
                style={{ background: "#44624a", borderColor: "#44624a" }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleDirectApprove(record)}
              >
                Duyệt đơn
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleCancelTicket(record)}
              >
                Từ chối
              </Button>
            </>
          )}

          {/* WAITING_SURVEY — Show Accept Proposed button if exists */}
          {record.status === "WAITING_SURVEY" && record.proposedSurveyTimes?.length > 0 && (
            <Button
              type="primary"
              style={{ background: "#44624a", borderColor: "#8ba888" }}
              icon={<CheckCircleOutlined />}
              onClick={() => openAcceptProposedModal(record)}
            >
              Xem đề xuất khách
            </Button>
          )}

          {/* ASSIGNMENT_FAILED — Manual fallback */}
          {record.status === "ASSIGNMENT_FAILED" && (
            <Button
              type="primary"
              danger
              icon={<UserSwitchOutlined />}
              onClick={() => openManualAssignModal(record)}
            >
              Phân công thủ công
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const modalSurveyInfo = parseSurveyInfoFromNotes(selectedTicket?.notes);

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
    </Card>
  );
};

export default SurveySchedulingPage;