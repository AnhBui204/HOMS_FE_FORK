import React, { useState, useEffect } from "react";
import {
  Table, Button, Tag, Modal, Form, Select, message, Space, Card, Typography, Descriptions,
} from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  requestTicketService,
  surveyService,
  userService // Import thêm userService
} from "../../services/surveysService"; // Trỏ đúng đường dẫn file chứa userService

const { Title } = Typography;
const { Option } = Select;
const { confirm } = Modal;

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

const SurveySchedulingPage = () => {
  const [tickets, setTickets] = useState([]);
  const [surveyors, setSurveyors] = useState([]); // Chứa danh sách Dispatchers thật
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const[selectedTicket, setSelectedTicket] = useState(null);
  const [form] = Form.useForm();

  const STATUS_MAP = {
    CREATED: { label: "Chờ xác nhận lịch", color: "blue" },
    SCHEDULED: { label: "Đã phân công", color: "green" },
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Dùng Promise.all để gọi 2 API cùng lúc cho tối ưu tốc độ
      const [resTickets, resDispatchers] = await Promise.all([
        requestTicketService.getTickets({ status: "CREATED,SCHEDULED" }),
        userService.getDispatchers() // Gọi API lấy user
      ]);
      
      // Xử lý dữ liệu Tickets
      const ticketsData = resTickets.data?.data || resTickets.data ||[];
      setTickets(ticketsData);
      
      // Xử lý dữ liệu Dispatchers
      const dispatchersData = resDispatchers.data?.data || resDispatchers.data ||[];
      setSurveyors(dispatchersData);

    } catch (error) {
      console.error(error);
      message.error("Lỗi khi tải dữ liệu từ máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  },[]);

  const openConfirmModal = (ticket) => {
    setSelectedTicket(ticket);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleConfirmSubmit = async (values) => {
    try {
      const { surveyType, scheduledDate } = parseSurveyInfoFromNotes(selectedTicket?.notes);

      const payload = {
        requestTicketId: selectedTicket._id,
        surveyorId: values.surveyorId, 
        notes: values.notes?.join(", ") || "", 
        surveyType: surveyType !== "Chưa rõ" ? surveyType : "OFFLINE", 
        scheduledDate: scheduledDate || new Date().toISOString(), 
      };

      await surveyService.scheduleSurvey(payload); 
      message.success(`Đã xác nhận và phân công khảo sát cho đơn ${selectedTicket.code}`);
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi xác nhận!");
    }
  };

  const handleCancelTicket = (ticket) => {
    confirm({
      title: 'Từ chối yêu cầu khảo sát?',
      content: `Bạn có chắc chắn muốn từ chối đơn yêu cầu ${ticket.code} của khách hàng ${ticket.customerId?.fullName}?`,
      okText: 'Từ chối',
      okType: 'danger',
      cancelText: 'Đóng',
      onOk: async () => {
        try {
          await requestTicketService.updateStatus(ticket._id, "CANCELLED"); // Cẩn thận cách truyền params hàm này
          message.success(`Đã từ chối đơn ${ticket.code}`);
          fetchData();
        } catch (error) {
          message.error("Lỗi khi từ chối đơn!");
        }
      },
    });
  };

  const columns =[
    // ... Giữ nguyên cấu trúc columns của bạn
    { title: "Mã Đơn", dataIndex: "code", fontWeight: "bold" },
    { title: "Khách hàng", render: (_, r) => <div>{r.customerId?.fullName}</div> },
    {
      title: "Yêu cầu khảo sát",
      render: (_, r) => {
        const { surveyType, scheduledDate } = parseSurveyInfoFromNotes(r.notes);
        return (
          <div>
            <b>Thời gian:</b> {scheduledDate ? dayjs(scheduledDate).format("HH:mm - DD/MM/YYYY") : "Chưa rõ"} <br />
            <b>Hình thức:</b> <Tag color={surveyType === "ONLINE" ? "purple" : "cyan"}>{surveyType}</Tag>
          </div>
        );
      },
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
        <Space size="small">
          {record.status === "CREATED" && (
            <>
              <Button type="primary" style={{ background: "#44624A" }} icon={<CheckCircleOutlined />} onClick={() => openConfirmModal(record)}>
                Xác nhận
              </Button>
              <Button danger icon={<CloseCircleOutlined />} onClick={() => handleCancelTicket(record)}>
                Từ chối
              </Button>
            </>
          )}

        </Space>
      ),
    },
  ];

  const modalSurveyInfo = parseSurveyInfoFromNotes(selectedTicket?.notes);

  return (
    <Card>
      <Title level={4} style={{ color: "#44624A" }}>
        Xác nhận & Phân công khảo sát
      </Title>
      <Table columns={columns} dataSource={tickets} rowKey="_id" loading={loading} />

      <Modal
        title={`XÁC NHẬN KHẢO SÁT - Đơn #${selectedTicket?.code}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText="Lưu & Gửi thông tin cho khách"
      >
        <div style={{ marginBottom: 20, padding: 15, background: '#f5f5f5', borderRadius: 8 }}>
          <Descriptions size="small" column={1} title="Thông tin khách hàng đề xuất">
            <Descriptions.Item label="Hình thức">
              <strong>{modalSurveyInfo.surveyType === 'ONLINE' ? 'Khảo sát qua Video (ONLINE)' : 'Khảo sát trực tiếp (OFFLINE)'}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian">
              <strong style={{ color: '#d9363e'}}>
                {modalSurveyInfo.scheduledDate ? dayjs(modalSurveyInfo.scheduledDate).format("HH:mm - DD/MM/YYYY") : "Chưa có"}
              </strong>
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Form form={form} layout="vertical" onFinish={handleConfirmSubmit}>
          <Form.Item
            name="surveyorId"
            label="Phân công nhân viên khảo sát"
            rules={[{ required: true, message: "Vui lòng chọn nhân viên!" }]}
          >
            <Select placeholder="Chọn nhân viên (Thông tin này sẽ gửi cho khách hàng)">
              {/* MAP DỮ LIỆU THẬT Ở ĐÂY */}
              {surveyors.map((u) => (
                <Option key={u._id} value={u._id}>
                  {u.fullName} {u.phone ? `- ${u.phone}` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="notes" label="Ghi chú nội bộ / Lời nhắn cho khách hàng">
            <Select mode="tags" style={{ width: "100%" }} placeholder="Nhập ghi chú và ấn Enter..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SurveySchedulingPage;