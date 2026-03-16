import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Card, Typography, Spin, Popover, List, Tag, message, Modal, Descriptions, Divider } from 'antd';
import dayjs from 'dayjs';
import { requestTicketService } from '../../services/surveysService';

const { Title } = Typography;

const SurveyCalendar = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const handleShowDetail = (ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'WAITING_SURVEY':
        return 'processing'; // xanh
      case 'QUOTED':
        return 'success'; // xanh lá (đã khảo sát xong)
      default:
        return 'default';
    }
  };

  // --- 1. HÀM HELPER: Bóc tách dữ liệu từ notes ---
  const extractSurveyInfo = (ticket) => {
    // Nếu có trường surveyDate chuẩn thì dùng luôn
    if (ticket.surveyDate) {
      return {
        date: ticket.surveyDate,
        type: 'Unknown', // Hoặc lấy từ trường khác nếu có
      };
    }

    // Nếu không, bóc tách từ notes
    // Format mẫu: "Survey type: ONLINE | Survey date: 2026-03-05T02:00:00.000Z | Payment …"
    const notes = ticket.notes || '';

    // Regex tìm chuỗi sau "Survey date:" cho đến khi gặp dấu "|" hoặc hết dòng
    const dateMatch = notes.match(/Survey date:\s*([^|]+)/);
    // Regex tìm chuỗi sau "Survey type:"
    const typeMatch = notes.match(/Survey type:\s*([^|]+)/);

    let parsedDate = null;
    if (dateMatch && dateMatch[1]) {
      parsedDate = dateMatch[1].trim(); // Xóa khoảng trắng thừa
    }

    return {
      date: parsedDate,
      type: typeMatch ? typeMatch[1].trim() : 'N/A'
    };
  };

  // 2. Fetch API (Giữ nguyên)
  const fetchScheduledTickets = async () => {
    try {
      setLoading(true);
      const response = await requestTicketService.getTickets({
        status: 'WAITING_SURVEY,QUOTED',
        limit: 1000
      });
      if (response && response.success) {
        setTickets(response.data || []);
      }
    } catch (error) {
      console.error("Lỗi tải lịch:", error);
      message.error("Không thể tải lịch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledTickets();
  }, []);

  // --- 3. SỬA HÀM LỌC: Dùng hàm helper extractSurveyInfo ---
  const getListData = (value) => {
    return tickets.filter(ticket => {
      const { date } = extractSurveyInfo(ticket);

      if (!date) return false;

      // So sánh ngày (dayjs tự xử lý convert múi giờ từ UTC trong string)
      return dayjs(date).isSame(value, 'day');
    });
  };

  // --- 4. SỬA POPOVER (Hiển thị chi tiết) ---
  const renderPopoverContent = (list) => (
    <List
      size="small"
      dataSource={list}
      rowKey="_id"
      renderItem={(item) => {
        const { date, type } = extractSurveyInfo(item);
        return (
          <List.Item
            onClick={() => handleShowDetail(item)}
            style={{ cursor: 'pointer', transition: 'background 0.3s' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <strong>
                {dayjs(date).format('HH:mm')} - {item.code}
              </strong>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <Tag color={type === 'ONLINE' ? 'cyan' : 'orange'}>{type}</Tag>
                <span>NV: {item.dispatcherId?.fullName || 'Chưa gán'}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                {item.pickup?.address?.substring(0, 40)}...
              </span>
            </div>
          </List.Item>
        );
      }}
    />
  );

  // --- 5. SỬA Ô LỊCH (Hiển thị ngắn gọn) ---
  const dateCellRender = (value) => {
    const listData = getListData(value);
    if (listData.length === 0) return null;

    const MAX_VISIBLE_ITEMS = 2;
    const visibleItems = listData.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = listData.length - MAX_VISIBLE_ITEMS;

    return (
      <ul className="events" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {visibleItems.map((item) => {
          const { date, type } = extractSurveyInfo(item);
          return (
            <li
              key={item._id}
              style={{ marginBottom: '4px', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                handleShowDetail(item);
              }}
            >
              <Badge
                status={getStatusColor(item.status)}
                text={
                  <span style={{ fontSize: '11px', lineHeight: '1.2' }}>
                    <b style={{ color: '#1890ff' }}>{dayjs(date).format('HH:mm')}</b> {item.code}
                  </span>
                }
              />
            </li>
          );
        })}

        {hiddenCount > 0 && (
          <li>
            <Popover
              title={`Ngày ${value.format('DD/MM/YYYY')}`}
              content={renderPopoverContent(listData)}
              trigger="click"
            >
              <Tag color="geekblue" style={{ cursor: 'pointer', width: '100%', textAlign: 'center', fontSize: '11px' }}>
                +{hiddenCount} nữa...
              </Tag>
            </Popover>
          </li>
        )}
      </ul>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Phần tiêu đề và nút refresh giữ nguyên */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Lịch khảo sát</Title>
        <Badge dot={loading}>
          <Tag color="blue" style={{ cursor: 'pointer' }} onClick={fetchScheduledTickets}>
            Làm mới dữ liệu
          </Tag>
        </Badge>
      </div>

      <Spin spinning={loading}>
        <Card bodyStyle={{ padding: 0 }}>
          <Calendar cellRender={dateCellRender} fullscreen={true} />
        </Card>
      </Spin>

      {/* --- MODAL CHI TIẾT KHẢO SÁT --- */}
      <Modal
        title={`Chi tiết đơn khảo sát: ${selectedTicket?.code}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Tag key="close" color="blue" style={{ cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>
            Đóng
          </Tag>
        ]}
        width={700}
      >
        {selectedTicket && (
          <div style={{ paddingTop: '10px' }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Mã đơn hàng">
                <strong>{selectedTicket.code}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Badge status={getStatusColor(selectedTicket.status)} text={selectedTicket.status} />
              </Descriptions.Item>

              <Descriptions.Item label="Khách hàng">
                <div>
                  <strong>{selectedTicket.customerId?.fullName || 'N/A'}</strong>
                  <br />
                  <span style={{ color: '#666' }}>SĐT: {selectedTicket.customerId?.phone || 'N/A'}</span>
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="Thời gian khảo sát">
                {(() => {
                  const { date, type } = extractSurveyInfo(selectedTicket);
                  return (
                    <div>
                      <Tag color={type === 'ONLINE' ? 'cyan' : 'orange'}>{type}</Tag>
                      <strong>{date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'Chưa rõ'}</strong>
                    </div>
                  );
                })()}
              </Descriptions.Item>

              <Descriptions.Item label="Địa điểm">
                {selectedTicket.pickup?.address || 'Chưa cập nhật'}
              </Descriptions.Item>

              <Descriptions.Item label="Người khảo sát (NV)">
                {selectedTicket.dispatcherId?.fullName || 'Chưa gán'}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ marginTop: '20px', marginBottom: '10px', fontSize: '14px' }}>Ghi chú / Thông tin thêm</Divider>
            <div style={{
              background: '#f9f9f9',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #f0f0f0',
              maxHeight: '150px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              fontSize: '13px'
            }}>
              {selectedTicket.notes || 'Không có ghi chú.'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SurveyCalendar;