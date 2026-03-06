import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Typography, Modal, Form, Input, Checkbox, 
  DatePicker, Row, Col, Space, message, Card, InputNumber, 
  Select, Tag, Divider 
} from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { requestTicketService, surveyService } from '../../services/surveysService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SurveyInput = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [form] = Form.useForm();
  
  // State để hiển thị/ẩn nhập giá trị khai báo khi chọn bảo hiểm
  const [isInsuranceChecked, setIsInsuranceChecked] = useState(false);

  // 1. Tải danh sách Ticket
  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Backend: Lấy các ticket cần khảo sát hoặc đã khảo sát xong
      const res = await requestTicketService.getTickets({ status: 'WAITING_SURVEY,SURVEYED,QUOTED' });
      setTickets(res.data || []);
    } catch (error) {
      message.error('Lỗi tải danh sách yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // 2. Mở Modal & Fill dữ liệu cũ
  const openSurveyModal = async (ticket) => {
    setSelectedTicket(ticket);
    form.resetFields();
    setIsInsuranceChecked(false);
    
    try {
      const res = await surveyService.getSurveyByTicket(ticket._id);
      const surveyData = res.data.data;

      if (surveyData) {
        setIsInsuranceChecked(surveyData.insuranceRequired);
        form.setFieldsValue({
          // Map fields khớp với Model SurveyData
          floors: surveyData.floors,
          carryMeter: surveyData.carryMeter,
          distanceKm: surveyData.distanceKm,
          hasElevator: surveyData.hasElevator,
          needsAssembling: surveyData.needsAssembling,
          needsPacking: surveyData.needsPacking,
          insuranceRequired: surveyData.insuranceRequired,
          declaredValue: surveyData.declaredValue,
          suggestedVehicle: surveyData.suggestedVehicle,
          suggestedStaffCount: surveyData.suggestedStaffCount,
          notes: surveyData.notes,
          items: surveyData.items?.length > 0 ? surveyData.items : [{}]
        });
      } else {
        // Giá trị mặc định cho form mới
        form.setFieldsValue({ 
          floors: 0,
          carryMeter: 0,
          distanceKm: 0,
          items: [{}],
          suggestedStaffCount: 2
        });
      }
    } catch (error) {
      // Chưa có survey nào được tạo (lỗi 404 từ API getSurveyByTicket là bình thường với ticket mới)
      form.setFieldsValue({ 
        floors: 0, 
        carryMeter: 0,
        items: [{}] 
      });
    }
    
    setIsModalOpen(true);
  };

  // 3. Xử lý Lưu (Gọi API Complete)
  const handleSaveSurvey = async (values) => {
    try {
      // Chuẩn hóa Payload khớp 100% với Schema SurveyData của Backend
      const payload = {
        // Các trường bắt buộc theo Controller
        suggestedVehicle: values.suggestedVehicle,
        suggestedStaffCount: values.suggestedStaffCount,
        distanceKm: values.distanceKm,

        // Các trường tùy chọn
        carryMeter: values.carryMeter || 0,
        floors: values.floors || 0,
        hasElevator: values.hasElevator || false,
        needsAssembling: values.needsAssembling || false,
        needsPacking: values.needsPacking || false,
        insuranceRequired: values.insuranceRequired || false,
        declaredValue: values.insuranceRequired ? (values.declaredValue || 0) : 0,
        notes: values.notes,
        
        // Danh sách đồ đạc
        items: values.items?.map(item => ({
          name: item.name,
          actualVolume: item.actualVolume || 0,
          actualWeight: item.actualWeight || 0,
          condition: item.condition || 'GOOD',
          // Backend có field này, FE gửi thêm nếu cần
          notes: item.notes || '' 
        })) || []
      };

      // Gọi PUT /api/surveys/:ticketId/complete
      await surveyService.completeSurvey(selectedTicket._id, payload);
      
      message.success('Đã lưu khảo sát & Tính giá thành công!');
      setIsModalOpen(false);
      fetchTickets(); // Reload lại bảng
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Lỗi khi lưu kết quả!';
      message.error(errorMsg);
    }
  };

  // Cấu hình bảng
  const columns = [
    { 
      title: 'Mã Ticket', 
      dataIndex: 'code', 
      fontWeight: 'bold',
      render: (text) => <Text strong>{text}</Text>
    },
    { 
      title: 'Khách hàng', 
      render: (_, r) => r.customerId?.fullName || 'N/A' 
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status',
      render: (status) => {
        let color = 'blue';
        let label = 'Chờ khảo sát';
        if (status === 'SURVEYED') { color = 'cyan'; label = 'Đã khảo sát'; }
        if (status === 'QUOTED') { color = 'green'; label = 'Đã báo giá'; }
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      render: (_, record) => (
        <Button 
          type="primary" 
          style={{ background: '#44624A', borderColor: '#44624A' }} 
          icon={<EditOutlined />} 
          onClick={() => openSurveyModal(record)}
        >
          Nhập Thông Tin Khảo Sát
        </Button>
      )
    }
  ];

  return (
    <Card bordered={false} className="shadow-sm">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ color: '#44624A', margin: 0 }}>Quản Lý Khảo Sát</Title>
        <Button onClick={fetchTickets}>Làm mới</Button>
      </div>
      
      <Table columns={columns} dataSource={tickets} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={1100}
        footer={null}
        centered
        title={<Title level={3} style={{ textAlign: 'center', color: '#44624A', margin: 0 }}>PHIẾU KHẢO SÁT: {selectedTicket?.code}</Title>}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveSurvey} style={{ marginTop: 20 }}>
          <Row gutter={24}>
            
            {/* --- CỘT TRÁI: THÔNG TIN CHI TIẾT --- */}
            <Col span={9}>
              {/* 1. Địa hình & Vận chuyển */}
              <Card size="small" title="1. Địa hình & Vận chuyển" className="mb-3">
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="floors" label="Số tầng lầu">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="hasElevator" valuePropName="checked" label="&nbsp;">
                      <Checkbox>Có thang máy</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="carryMeter" label="Bê bộ (m)">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      name="distanceKm" 
                      label="Quãng đường (Km)" 
                      rules={[{ required: true, message: 'Bắt buộc nhập' }]}
                    >
                      <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* 2. Dịch vụ & Bảo hiểm */}
              <Card size="small" title="2. Dịch vụ & Bảo hiểm" style={{ marginTop: 16 }}>
                <Row>
                  <Col span={12}>
                    <Form.Item name="needsAssembling" valuePropName="checked" style={{ marginBottom: 5 }}>
                      <Checkbox>Cần tháo lắp</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="needsPacking" valuePropName="checked" style={{ marginBottom: 5 }}>
                      <Checkbox>Cần đóng gói</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
                <Divider style={{ margin: '10px 0' }} />
                <Form.Item name="insuranceRequired" valuePropName="checked" style={{ marginBottom: 10 }}>
                  <Checkbox onChange={(e) => setIsInsuranceChecked(e.target.checked)}>Mua bảo hiểm vận chuyển</Checkbox>
                </Form.Item>
                
                {isInsuranceChecked && (
                  <Form.Item 
                    name="declaredValue" 
                    label="Giá trị khai báo (VNĐ)"
                    rules={[{ required: true, message: 'Nhập giá trị hàng hóa' }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                )}
              </Card>

              {/* 3. Đề xuất tài nguyên (Quan trọng cho tính giá) */}
              <Card size="small" title="3. Đề xuất Tài nguyên" style={{ marginTop: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Form.Item 
                  name="suggestedVehicle" 
                  label="Loại xe tải đề xuất" 
                  rules={[{ required: true, message: 'Vui lòng chọn xe' }]}
                >
                  <Select placeholder="Chọn loại xe">
                    <Option value="500KG">Xe 500 KG</Option>
                    <Option value="1TON">Xe 1 Tấn</Option>
                    <Option value="1.5TON">Xe 1.5 Tấn</Option>
                    <Option value="2TON">Xe 2 Tấn</Option>
                  </Select>
                </Form.Item>
                <Form.Item 
                  name="suggestedStaffCount" 
                  label="Số lượng nhân viên"
                  rules={[{ required: true, message: 'Nhập số nhân viên' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Card>
              
              <Form.Item name="notes" label="Ghi chú thêm" style={{ marginTop: 16 }}>
                <TextArea rows={3} placeholder="Ghi chú về địa hình, giờ giấc..." />
              </Form.Item>
            </Col>

            {/* --- CỘT PHẢI: DANH MỤC ĐỒ ĐẠC --- */}
            <Col span={15} style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '24px' }}>
              <Title level={5}>4. Danh Mục Đồ Đạc</Title>
              <div style={{ background: '#fafafa', padding: '10px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                <Row gutter={8} style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '10px', fontSize: '13px' }}>
                  <Col span={9}>Tên đồ đạc</Col>
                  <Col span={4}>Thể tích (m³)</Col>
                  <Col span={4}>Khối lượng (Kg)</Col>
                  <Col span={5}>Tình trạng</Col>
                  <Col span={2}></Col>
                </Row>

                <Form.List name="items">
                  {(fields, { add, remove }) => (
                    <>
                      <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                        {fields.map(({ key, name, ...restField }) => (
                          <Row gutter={8} key={key} style={{ marginBottom: 10 }} align="middle">
                            <Col span={9}>
                              <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: 'Vui lòng nhập tên đồ' }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="Tên đồ" />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item {...restField} name={[name, 'actualVolume']} style={{ marginBottom: 0 }}>
                                <InputNumber min={0} step="0.1" style={{ width: '100%' }} placeholder="m³" />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item {...restField} name={[name, 'actualWeight']} style={{ marginBottom: 0 }}>
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="Kg" />
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item {...restField} name={[name, 'condition']} style={{ marginBottom: 0 }}>
                                <Select placeholder="Tình trạng" defaultValue="GOOD">
                                  <Option value="GOOD">Tốt</Option>
                                  <Option value="FRAGILE">Dễ vỡ</Option>
                                  <Option value="DAMAGED">Hư hỏng</Option>
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col span={2} style={{ textAlign: 'center' }}>
                              <DeleteOutlined style={{ color: 'red', cursor: 'pointer' }} onClick={() => remove(name)} />
                            </Col>
                          </Row>
                        ))}
                      </div>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: 10 }}>
                        Thêm đồ đạc
                      </Button>
                    </>
                  )}
                </Form.List>
              </div>
            </Col>
          </Row>

          {/* FOOTER ACTIONS */}
          <div style={{ textAlign: 'right', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Hủy Bỏ</Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                style={{ background: '#2D4F36', borderColor: '#2D4F36', minWidth: '150px' }}
                icon={<SaveOutlined />}
              >
                Hoàn Tất & Tính Giá
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default SurveyInput;