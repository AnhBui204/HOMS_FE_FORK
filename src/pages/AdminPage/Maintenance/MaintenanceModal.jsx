import React, { useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, DatePicker, InputNumber, Button, Space, message, Avatar, Card, Divider } from 'antd';
import { CarOutlined, DollarOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;

const primaryColor = '#44624A';

// Helper currency formatter
const formatVND = (value) => {
  if (value == null) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
};

export default function MaintenanceModal({ visible, onCancel, onCreate, vehicles = [], staff = [] }) {
  const [form] = Form.useForm();
  const [recurrenceType, setRecurrenceType] = useState(null);
  // removed attachments, priority and active fields per request

  // vehicles list comes from props; no local vehicle summary state needed

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // If user used the RangePicker, map scheduledRange -> scheduledStartDate/scheduledEndDate
      const vals = { ...values };
      if (vals.scheduledRange && vals.scheduledRange[0] && vals.scheduledRange[1]) {
        try {
          vals.scheduledStartDate = vals.scheduledRange[0].toDate ? vals.scheduledRange[0].toDate() : vals.scheduledRange[0];
          vals.scheduledEndDate = vals.scheduledRange[1].toDate ? vals.scheduledRange[1].toDate() : vals.scheduledRange[1];
        } catch (e) {
          // fallback: leave as-is
        }
        delete vals.scheduledRange;
      }

      // normalize values before sending to parent
      const payload = {
        ...vals,
        cost: vals.cost || 0,
        costDetails: vals.costDetails || '',
        active: !!vals.active
      };
      onCreate && onCreate(payload);
      form.resetFields();
    } catch (err) {
      // validation failed
      message.error('Vui lòng kiểm tra các trường bắt buộc.');
    }
  };

  // upload removed

  return (
    <Modal
      open={visible}
      title={<div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><CarOutlined style={{ color: primaryColor }} />Tạo kế hoạch bảo trì</span>
        <small style={{ color: '#666', marginTop: 4 }}>Tạo hoặc lên lịch công việc bảo trì cho xe — thông tin chính xác giúp theo dõi đơn giản hơn</small>
      </div>}
      onCancel={() => { form.resetFields(); onCancel && onCancel(); }}
      onOk={handleOk}
      okText="Tạo"
      cancelText="Hủy"
      okButtonProps={{ style: { background: primaryColor, borderColor: primaryColor, fontWeight: 700, minWidth: 90 } }}
      width={920}
      maskClosable={false}
      bodyStyle={{ paddingTop: 10 }}
    >
      <Form form={form} layout="vertical" initialValues={{ priority: 'normal', active: true }}>
        <Row gutter={24}>
          <Col span={16}>
            <div className="section-header">Thông tin kế hoạch</div>
            <Form.Item name="vehicleId" label="Chọn xe" rules={[{ required: true, message: 'Vui lòng chọn xe' }]}>
              <Select showSearch placeholder="Biển số hoặc model" optionFilterProp="label" optionLabelProp="label">
                {vehicles.map(v => (
                  <Option key={v._id || v.vehicleId || v.plateNumber} value={v._id || v.vehicleId || v.plateNumber} label={`${v.plateNumber} — ${v.model || v.vehicleType}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar size="small" icon={<CarOutlined />} style={{ background: '#eef6ee', color: primaryColor }} />
                      <div>
                        <div style={{ fontWeight: 700 }}>{v.plateNumber}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{v.model || v.vehicleType}</div>
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="maintenanceType" label="Loại bảo trì" rules={[{ required: true, message: 'Vui lòng chọn loại bảo trì' }]}>
              <Select placeholder="Chọn loại bảo trì">
                <Option value="Oil Change">Thay dầu</Option>
                <Option value="Tire Replacement">Thay lốp</Option>
                <Option value="Brake Service">Bảo dưỡng phanh</Option>
                <Option value="Engine Inspection">Kiểm tra động cơ</Option>
                <Option value="Preventive Check">Kiểm tra phòng ngừa</Option>
                <Option value="Repair">Sửa chữa</Option>
                <Option value="Other">Khác</Option>
              </Select>
            </Form.Item>

            <Form.Item name="description" label="Mô tả ngắn (description)">
              <Input placeholder="Mô tả ngắn về công việc" />
            </Form.Item>

            <Form.Item name="notes" label="Ghi chú chi tiết (notes)">
              <TextArea rows={4} placeholder="Ghi chú nội bộ, hướng dẫn thêm cho thợ" />
            </Form.Item>

            <Divider dashed style={{ margin: '8px 0 16px' }} />

            <div className="section-header">Thời gian lịch</div>
            <Form.Item name="scheduledRange" label="Khoảng thời gian" rules={[{ required: true, message: 'Chọn khoảng thời gian' }]}> 
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                allowClear={false}
                onChange={(vals) => {
                  // keep the form fields for compatibility if needed
                  if (vals && vals[0] && vals[1]) {
                    form.setFieldsValue({ scheduledStartDate: vals[0], scheduledEndDate: vals[1] });
                  }
                }}
                disabledDate={(current) => {
                  if (!current) return false;
                  try { const d = current.toDate ? current.toDate() : current; const today = new Date(); d.setHours(0,0,0,0); today.setHours(0,0,0,0); return d < today; } catch (e) { return false; }
                }}
              />
            </Form.Item>

            {/* Preset helpers removed per request */}

          </Col>

          <Col span={8}>
            <Card className="sticky-card" bordered={false}>
              <div className="card-title"><InfoCircleOutlined style={{ color: primaryColor, fontSize: 18 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 800 }}>Tuỳ chọn nhanh</div>
                  <div style={{ fontSize: 12, color: '#777' }}>Chi tiết chi phí & giao việc</div>
                </div>
              </div>

              <Form.Item name="cost" label="Chi phí" tooltip="Chi phí (VND)">
                <InputNumber min={0} style={{ width: '100%' }} formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} parser={value => (value || '').toString().replace(/\D/g, '')} prefix={<DollarOutlined />} placeholder="Nhập số tiền (VND)" />
              </Form.Item>

              <Form.Item name="costDetails" label="Chi tiết chi phí" tooltip="Mô tả các hạng mục chi phí">
                <Input placeholder="Nhập chi tiết chi phí" />
              </Form.Item>

              <Form.Item name="assignedTo" label="Giao cho (tuỳ chọn)">
                <Select placeholder="Chọn nhân viên" allowClear showSearch optionFilterProp="label" optionLabelProp="label">
                  {staff.map(s => (
                    <Option key={s.id || s._id} value={s.id || s._id} label={s.name}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>
          </Col>
        </Row>
      </Form>

      <style jsx>{`
        /* subtle focus for inputs */
        .ant-modal .ant-input:focus, .ant-modal .ant-select-focused .ant-select-selector {
          box-shadow: 0 0 0 4px rgba(68,98,74,0.08);
          border-color: ${primaryColor};
        }
        .ant-modal .ant-btn-primary {
          background: ${primaryColor};
          border-color: ${primaryColor};
          box-shadow: none;
        }

        .section-header {
          font-weight: 800;
          margin-bottom: 8px;
          color: #2b2b2b;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .sticky-card {
          border-radius: 10px;
          padding: 14px;
          box-shadow: 0 6px 20px rgba(16,24,40,0.06);
          background: #fbfdfb;
          border: 1px solid #eef4ec;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          margin-bottom: 12px;
          color: ${primaryColor};
        }

        .upload-add {
          display: none; /* upload removed */
        }

        .ant-form-item-label > label {
          font-weight: 700;
        }

        /* smaller helper text style */
        .ant-form-item-explain, .ant-form-item-extra {
          font-size: 12px;
          color: #767676;
        }
      `}</style>
    </Modal>
  );
}
