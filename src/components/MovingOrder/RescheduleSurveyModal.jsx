import React, { useState } from 'react';
import { Modal, DatePicker, Checkbox, Input, Button, message, Alert } from 'antd';
import dayjs from 'dayjs';
import { rejectSurveyTime } from '../../services/orderService';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrAfter);
const { TextArea } = Input;

const RescheduleSurveyModal = ({ visible, onClose, ticket, onSuccess }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [otherReason, setOtherReason] = useState('');
  const [loading, setLoading] = useState(false);

  const REASONS = [
    "Đi vắng/có việc bận đột xuất",
    "Cần thêm thời gian chuẩn bị đồ đạc",
    "Sai thông tin đơn hàng/nhầm địa chỉ",
    "Lý do khác"
  ];

  const timeSlots = [
    '09:00', '10:30', '12:00', '14:00',
    '15:30', '17:00', '18:30', '20:00'
  ];

  const handleCheckboxChange = (checkedValues) => {
    setSelectedReasons(checkedValues);
  };

  const onDateSelect = (date) => {
      setSelectedDate(date);
      setSelectedTimeIndex(null);
  };

  const disabledDate = (current) => {
      const today = dayjs().startOf('day');
      if (current.isBefore(today, 'day')) {
          return true;
      }
      return false;
  };

  const isTimeSlotDisabled = (timeSlot) => {
      if (!selectedDate) return false;

      const now = dayjs();
      const selectedDay = dayjs(selectedDate);
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const slotTime = selectedDay.hour(hours).minute(minutes);

      // Cách thời điểm hiện tại ít nhất 1 giờ
      if (slotTime.diff(now, 'minute') < 60) {
          return true;
      }

      // Luật 24h: NẾU có Ngày Chuyển Nhà (ticket.scheduledTime) đóng vai trò là "Ngày Vận Chuyển".
      // Tại sao? Vì khi vừa tạo đơn, scheduledTime lưu Ngày Chuyển Nhà.
      // NOTE: Cấu trúc hiện tại có thể khiến scheduledTime là Ngày Khảo Sát, nên ta dùng heuristic:
      // Tạm thời bỏ qua nếu scheduledTime ở quá khứ, chỉ check nếu ScheduledTime tương lai đủ xa.
      if (ticket?.scheduledTime) {
          const checkTargetDate = dayjs(ticket.scheduledTime);
          // Nếu ticket.scheduledTime là ngày chuyển nhà xa tít tắp, khảo sát cách đó 24h.
          if(checkTargetDate.diff(now, 'hour') > 24) {
             const hoursBetween = checkTargetDate.diff(slotTime, 'hour', true);
             if (hoursBetween < 24) return true;
          }
      }

      return false;
  };

  const handleReschedule = async () => {
    if (selectedReasons.length === 0) {
      message.error("Vui lòng chọn lý do đổi lịch!");
      return;
    }
    if (!selectedDate || selectedTimeIndex === null) {
      message.error("Vui lòng chọn Ngày và Giờ khảo sát mới hợp lệ!");
      return;
    }

    let finalReason = selectedReasons.filter(r => r !== "Lý do khác").join(", ");
    if (selectedReasons.includes("Lý do khác") && otherReason.trim()) {
      finalReason += (finalReason ? " - " : "") + otherReason.trim();
    }

    if (!finalReason) {
      message.error("Vui lòng nhập lý do cụ thể!");
      return;
    }

    const proposedDateTime = dayjs(selectedDate)
        .hour(parseInt(timeSlots[selectedTimeIndex].split(':')[0]))
        .minute(parseInt(timeSlots[selectedTimeIndex].split(':')[1]))
        .second(0)
        .millisecond(0);

    try {
      setLoading(true);
      const result = await rejectSurveyTime(ticket._id, finalReason, proposedDateTime.toISOString());
      message.success("Đã yêu cầu đổi lịch! Vui lòng chờ phản hồi từ điều phối viên.");
      
      // Update logic front-end to clear the UI's old scheduled time (since wait dispatch action)
      onSuccess(ticket._id, { scheduledTime: null, proposedSurveyTimes: [proposedDateTime.toISOString()] });
      onClose();
    } catch (err) {
      message.error("Lỗi khi đổi lịch: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Yêu Cầu Đổi Giờ Khảo Sát"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="back" onClick={onClose} disabled={loading}>
          Hủy bỏ
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleReschedule}>
          Gửi yêu cầu đổi lịch
        </Button>
      ]}
    >
      <Alert
        message="Quý khách thông cảm"
        description="Lịch khảo sát thay đổi sẽ cần Điều Phối Viên sắp xếp lại. Nó phải được xử lý cách ngày dự tính chuyển nhà thực tế tối thiểu 24 giờ."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <h4 style={{marginBottom: '8px'}}>1. Chọn lịch mới đề xuất</h4>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
              <DatePicker
                  value={selectedDate}
                  onChange={onDateSelect}
                  disabledDate={disabledDate}
                  style={{ width: '100%', marginBottom: 8 }}
                  placeholder="Chọn ngày khảo sát"
                  format="DD/MM/YYYY"
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {timeSlots.map((time, index) => {
                      const isDisabled = isTimeSlotDisabled(time);
                      return (
                          <div
                              key={index}
                              onClick={() => !isDisabled && setSelectedTimeIndex(index)}
                              style={{
                                  border: `1px solid ${selectedTimeIndex === index ? '#44624A' : '#d9d9d9'}`,
                                  backgroundColor: selectedTimeIndex === index ? '#f2f8f4' : (isDisabled ? '#f5f5f5' : '#fff'),
                                  color: selectedTimeIndex === index ? '#44624A' : (isDisabled ? '#bfbfbf' : 'inherit'),
                                  padding: '4px 8px',
                                  textAlign: 'center',
                                  borderRadius: '4px',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                  fontWeight: selectedTimeIndex === index ? 'bold' : 'normal'
                              }}
                          >
                              {time}
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>

      <h4 style={{marginBottom: '8px'}}>2. Lý do đổi lịch</h4>
      <Checkbox.Group 
        options={REASONS} 
        value={selectedReasons} 
        onChange={handleCheckboxChange} 
        style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 16 }}
      />

      {selectedReasons.includes("Lý do khác") && (
        <TextArea
          rows={3}
          placeholder="Nhập lý do của bạn..."
          value={otherReason}
          onChange={e => setOtherReason(e.target.value)}
        />
      )}
    </Modal>
  );
};

export default RescheduleSurveyModal;
