import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Card, Typography, Spin, Popover, List, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { requestTicketService } from '../../services/surveysService'; 

const { Title } = Typography;

const SurveyCalendar = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

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
          <List.Item>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong>
                {dayjs(date).format('HH:mm')} - {item.code}
              </strong>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <Tag color={type === 'ONLINE' ? 'cyan' : 'orange'}>{type}</Tag>
                <span>NV: {item.dispatcherId?.fullName || 'Chưa gán'}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                 {item.pickup?.address?.substring(0, 30)}...
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
    if (listData.length === 0) return null;

    const MAX_VISIBLE_ITEMS = 2;
    const visibleItems = listData.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = listData.length - MAX_VISIBLE_ITEMS;

    return (
      <ul className="events" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {visibleItems.map((item) => {
          const { date, type } = extractSurveyInfo(item);
          return (
            <li key={item._id} style={{ marginBottom: '4px' }}>
              <Badge 
               status={getStatusColor(item.status)}

               
                text={
                  <span style={{ fontSize: '12px' }}>
                    <b>{dayjs(date).format('HH:mm')}</b> <br/>
                    {item.code}
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
            <Tag color="blue" style={{cursor: 'pointer'}} onClick={fetchScheduledTickets}>
                Làm mới dữ liệu
            </Tag>
        </Badge>
      </div>
      
      <Spin spinning={loading}>
        <Card bodyStyle={{ padding: 0 }}>
          <Calendar cellRender={dateCellRender} fullscreen={true} />
        </Card>
      </Spin>
    </div>
  );
};

export default SurveyCalendar;