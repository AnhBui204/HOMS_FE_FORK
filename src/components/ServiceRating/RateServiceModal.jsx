import React, { useState, useEffect } from "react";
import { Modal, Rate, Input, message, Spin } from "antd";
import {
  StarFilled,
  SendOutlined,
  SmileOutlined,
  MehOutlined,
  FrownOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import api from "../../services/api";
import "./RateServiceModal.css";

const { TextArea } = Input;

const QUICK_TAGS = [
  "Đúng giờ", "Nhiệt tình", "Cẩn thận", "Chuyên nghiệp",
  "Thân thiện", "Giao tiếp tốt", "Đóng gói cẩn thận", "Xe sạch sẽ",
];

const RATING_MOOD = {
  0: { icon: null, label: "", color: "#94a3b8" },
  1: { icon: <FrownOutlined />, label: "Rất tệ", color: "#ef4444" },
  2: { icon: <FrownOutlined />, label: "Không hài lòng", color: "#f97316" },
  3: { icon: <MehOutlined />, label: "Bình thường", color: "#eab308" },
  4: { icon: <SmileOutlined />, label: "Hài lòng", color: "#22c55e" },
  5: { icon: <SmileOutlined />, label: "Tuyệt vời!", color: "#10b981" },
};

const SubRateRow = ({ label, icon, value, onChange, disabled }) => (
  <div className="rsm-subrate-row">
    <span className="rsm-subrate-label">
      {icon} {label}
    </span>
    <Rate
      value={value}
      onChange={onChange}
      disabled={disabled} // Khóa rate nếu chỉ xem
      character={<StarFilled />}
      className="rsm-subrate-stars"
    />
  </div>
);

const RateServiceModal = ({ visible, onClose, ticket, onSuccess }) => {
  const invoice = ticket?.invoice;
  const isRated = !!invoice?.isRated; // Check xem đã đánh giá chưa

  // State
  const [rating, setRating] = useState(0);
  const [categories, setCategories] = useState({ cleanliness: 0, professionalism: 0, punctuality: 0 });
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadingData, setLoadingData] = useState(false); // Trạng thái chờ fetch data cũ

  useEffect(() => {
    if (visible) {
      if (isRated) {
        // CHẾ ĐỘ XEM: Fetch dữ liệu từ server
        fetchOldRating();
      } else {
        // CHẾ ĐỘ TẠO MỚI: Reset form
        resetForm();
      }
    }
  }, [visible, isRated]);

  const fetchOldRating = async () => {
    setLoadingData(true);
    try {
      // Giả sử endpoint lấy detail rating bằng invoiceId
      const res = await api.get(`/service-ratings/invoice/${invoice._id}`);
      const data = res.data?.data || res.data;
      
      if (data) {
        setRating(data.rating || 0);
        setCategories({
          cleanliness: data.categories?.cleanliness || 0,
          professionalism: data.categories?.professionalism || 0,
          punctuality: data.categories?.punctuality || 0,
        });
        setSelectedTags(data.quickTags || []);
        setComment(data.comment || "");
      }
    } catch (err) {
      message.error("Không thể tải thông tin đánh giá cũ.");
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setCategories({ cleanliness: 0, professionalism: 0, punctuality: 0 });
    setSelectedTags([]);
    setComment("");
    setSubmitted(false);
  };

  const mood = RATING_MOOD[rating] || RATING_MOOD[0];

  const toggleTag = (tag) => {
    if (isRated) return; // Nếu đã rate rồi thì không cho bấm tag
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      message.warning("Vui lòng chọn số sao tổng quan.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/service-ratings", {
        invoiceId: invoice._id,
        rating,
        categories,
        quickTags: selectedTags,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      if (onSuccess) onSuccess(invoice._id);
    } catch (err) {
      message.error(err.response?.data?.message || "Lỗi khi gửi đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Modal open={visible} onCancel={onClose} footer={null} centered width={460}>
        <div className="rsm-thank-you">
          <div className="rsm-thank-icon"><CheckOutlined /></div>
          <h2>Cảm ơn bạn!</h2>
          <p>Đánh giá của bạn giúp chúng tôi cải thiện dịch vụ mỗi ngày.</p>
          <button className="rsm-btn rsm-btn--close" onClick={onClose}>Đóng</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={visible} onCancel={onClose} footer={null} centered width={520} destroyOnClose>
      <Spin spinning={loadingData}>
        <div className="rsm-wrapper">
          <div className="rsm-header">
            <div className="rsm-header-emoji" style={{ color: mood.color }}>
              {mood.icon || <StarFilled />}
            </div>
            <h2 className="rsm-title">{isRated ? "Đánh giá của bạn" : "Đánh giá dịch vụ"}</h2>
            <p className="rsm-subtitle">Mã đơn: <strong>#{(ticket?.code || "").slice(-10).toUpperCase()}</strong></p>
          </div>

          <div className="rsm-section rsm-overall">
            <Rate value={rating} onChange={setRating} disabled={isRated} character={<StarFilled />} className="rsm-main-stars" />
            <div className="rsm-mood-label" style={{ color: mood.color, opacity: rating > 0 ? 1 : 0 }}>
              {mood.icon} {mood.label}
            </div>
          </div>

          <div className="rsm-section">
            <p className="rsm-section-title">Tiêu chí chi tiết</p>
            <SubRateRow label="Sạch sẽ / Gọn gàng" icon="🧹" value={categories.cleanliness} onChange={(v) => setCategories(p => ({ ...p, cleanliness: v }))} disabled={isRated} />
            <SubRateRow label="Chuyên nghiệp" icon="🎯" value={categories.professionalism} onChange={(v) => setCategories(p => ({ ...p, professionalism: v }))} disabled={isRated} />
            <SubRateRow label="Đúng giờ" icon="⏱️" value={categories.punctuality} onChange={(v) => setCategories(p => ({ ...p, punctuality: v }))} disabled={isRated} />
          </div>

<div className="rsm-section">
  <p className="rsm-section-title">Nhận xét nhanh</p>
  <div className="rsm-tags">
    {(isRated ? QUICK_TAGS.filter(tag => selectedTags.includes(tag)) : QUICK_TAGS).map((tag) => (
      <button
        key={tag}
        className={`rsm-tag ${selectedTags.includes(tag) ? "rsm-tag--active" : ""} ${isRated ? "rsm-tag--readonly" : ""}`}
        onClick={() => toggleTag(tag)}
      >
        {selectedTags.includes(tag) && <CheckOutlined style={{ marginRight: 4 }} />}
        {tag}
      </button>
    ))}
    {isRated && selectedTags.length === 0 && (
      <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Không có nhận xét nhanh nào.</span>
    )}
  </div>
</div>

          <div className="rsm-section">
            <p className="rsm-section-title">Nhận xét thêm</p>
            <TextArea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} readOnly={isRated} placeholder="..." className="rsm-textarea" />
          </div>

          <div className="rsm-actions">
            <button className="rsm-btn rsm-btn--cancel" onClick={onClose}>
              {isRated ? "Đóng" : "Huỷ"}
            </button>
            {!isRated && (
              <button className="rsm-btn rsm-btn--submit" onClick={handleSubmit} disabled={submitting || rating === 0}>
                <SendOutlined /> {submitting ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            )}
          </div>
        </div>
      </Spin>
    </Modal>
  );
};

export default RateServiceModal;