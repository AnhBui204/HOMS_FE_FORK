import React, { useState } from 'react';
import { Modal, Checkbox, Input, Button, message } from 'antd';
import { cancelOrder } from '../../services/orderService';

const { TextArea } = Input;

const CancelTicketModal = ({ visible, onClose, ticket, onSuccess }) => {
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [otherReason, setOtherReason] = useState('');
  const [loading, setLoading] = useState(false);

  const REASONS = [
    "Thay đổi kế hoạch chuyển nhà",
    "Tìm được đơn vị vận chuyển khác",
    "Chưa sắp xếp được thời gian",
    "Lý do khác"
  ];

  const handleCheckboxChange = (checkedValues) => {
    setSelectedReasons(checkedValues);
  };

  const handleCancelTicket = async () => {
    if (selectedReasons.length === 0) {
      message.error("Vui lòng chọn ít nhất một lý do hủy!");
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

    try {
      setLoading(true);
      await cancelOrder(ticket._id, finalReason);
      message.success("Đã hủy yêu cầu thành công!");
      onSuccess(ticket._id, { status: 'CANCELLED' });
      onClose();
    } catch (err) {
      message.error("Lỗi khi hủy đơn: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Hủy Yêu Cầu Chuyển Nhà"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose} disabled={loading}>
          Quay lại
        </Button>,
        <Button key="submit" type="primary" danger loading={loading} onClick={handleCancelTicket}>
          Xác nhận Hủy Đơn
        </Button>
      ]}
    >
      <p style={{ marginBottom: 16 }}>Vui lòng cho chúng tôi biết lý do bạn muốn hủy yêu cầu này:</p>
      
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

export default CancelTicketModal;
