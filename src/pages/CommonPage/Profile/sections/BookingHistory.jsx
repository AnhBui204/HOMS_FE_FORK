import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Modal, message, Carousel } from 'antd';
import { EyeOutlined, CalendarOutlined, HomeOutlined, DollarOutlined } from '@ant-design/icons';
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";
import { getUserBookingHistory } from '../../../../services/bookingService';
import { getBoardingHouseById } from '../../../../services/boardingHouseAPI';
import useUser from '../../../../contexts/UserContext';
import './BookingHistory.css';
import dayjs from "dayjs";

const BookingHistory = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const { user } = useUser();
  const API_BASE = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/api$/, '')) || 'http://localhost:5000';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (user?._id) {
      fetchBookingHistory();
    }
  }, [user]);

  const fetchBookingHistory = async () => {
    try {
      setLoading(true);
      console.log('Fetching booking history for user:', user._id);
      const data = await getUserBookingHistory(user._id);
      console.log('Booking history response:', data);
      setBookings(data);
    } catch (error) {
      console.error('Error fetching booking history:', error);
      messageApi.error(`Unable to load booking history! ${error.response?.data?.message || error.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (booking) => {
    try {
      console.log('Booking object:', booking);
      console.log('PropertyId:', booking.room._id);

      // Lấy ID từ roomId (có thể là object hoặc string)
      const roomId = booking.room._id;
      console.log('Extracted roomId:', roomId);

      const boardingHouseId = booking.boardingHouse._id;
      if (!roomId) {
        messageApi.error('Property ID not found!');
        return;
      }

      // Fetch chi tiết boardinghouse
      const boardinghouseData = await getBoardingHouseById(boardingHouseId);
      setSelectedBooking({
        ...booking,
        boardinghouse: boardinghouseData
      });
      setIsModalVisible(true);
    } catch (error) {
      console.error('Error fetching boardinghouse details:', error);
      console.error('Error details:', error.response?.data);
      messageApi.error(`Unable to load detailed information! ${error.response?.data?.message || error.message || ''}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'processing';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ thanh toán';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getStatusTag = (booking) => {
    const { contractStatus, status } = booking; // status = payment status

    if (status === 'paid') return <Tag color="success">Đã thanh toán</Tag>;
    if (status === 'completed') return <Tag color="default">Đã hoàn thành</Tag>;
    if (contractStatus === 'pending_approval') return <Tag color="processing">Chờ duyệt</Tag>;
    if (contractStatus === 'approved') return <Tag color="warning">Chờ thanh toán</Tag>;
    if (contractStatus === 'rejected') return <Tag color="error">Đã từ chối</Tag>;
    if (contractStatus === 'cancelled_by_tenant') return <Tag color="default">Đã hủy (bởi bạn)</Tag>;
    if (contractStatus === 'cancelled_by_system') return <Tag color="default">Đã hủy (hết hạn)</Tag>;
    if (status === 'pending') return <Tag color="blue">Chờ thanh toán</Tag>; // Payment initiated?

    return <Tag>{contractStatus || status || 'Không rõ'}</Tag>;
  };

  const columns = [
    {
      title: 'Nhà trọ', // ✅ Changed Title
      // ✅ Access name from the populated boardingHouse object
      render: (_, record) => record.boardingHouse?.name || 'N/A',
    },
    {
      title: 'Phòng', // ✅ Added Room column
      // ✅ Access roomNumber from the populated room object
      render: (_, record) => record.room?.roomNumber || 'N/A',
    },
    {
      title: 'Ngày đặt', // Booking Date
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/A', // Added time
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: 'Ngày nhận', // Check-in
      dataIndex: 'checkInDate',
      key: 'checkInDate',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : 'N/A',
    },
    {
      title: 'Ngày trả', // Check-out
      dataIndex: 'checkOutDate',
      key: 'checkOutDate',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : 'N/A',
    },
    {
      title: 'Tổng tiền', // Total Amount
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (price) => price != null ? `${price.toLocaleString('vi-VN')} VND` : 'N/A',
      sorter: (a, b) => (a.totalPrice || 0) - (b.totalPrice || 0),
    },
    {
      title: 'Trạng thái', // Status
      key: 'status',
      // ✅ Use the combined status logic
      render: (_, record) => getStatusTag(record),
      // Filtering might need adjustment based on combined status logic if desired
      filters: [
        { text: 'Đã thanh toán', value: 'paid' },
        { text: 'Chờ duyệt', value: 'pending_approval' },
        { text: 'Chờ thanh toán', value: 'approved' },
        { text: 'Đã từ chối', value: 'rejected' },
        { text: 'Đã hủy', value: 'cancelled_by_tenant' }, // Or combine cancelled statuses
      ],
      onFilter: (value, record) => record.status === value || record.contractStatus === value,
    },
    {
      title: 'Hành động', // Actions
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
          size="small"
          className="booking-history-details-btn"
        >
          Chi tiết
        </Button>
      ),
    },
  ];
  return (
    <>
      {contextHolder}
      <div className="booking-history-container">
        <Card
          title={
            <div className="header-with-icon">
              <CalendarOutlined style={{ marginRight: '8px', color: 'white' }} />
              Lịch sử đặt phòng
            </div>
          }
          className="booking-history-card"
        >
          <Table
            columns={columns}
            dataSource={bookings}
            rowKey="_id"
            loading={loading}
            className="booking-history-table"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} trong ${total} đơn đặt`,
            }}
            scroll={{ x: 800 }}
          />
        </Card>

        {/* Modal chi tiết booking */}
        <Modal
          title="Chi tiết đặt phòng"
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
          width={800}
          style={{ top: 20 }}
          className="booking-history-modal"
        >
          {selectedBooking && (
            <div className="booking-detail-modal">

              {/* Thông tin nhà trọ */}
              {selectedBooking.boardinghouse && (
                <Card
                  title={
                    <div className="detail-section-title">
                      <HomeOutlined /> Thông tin nhà trọ
                    </div>
                  }
                  className="detail-card"
                >
                  {/* Hình ảnh nhà trọ */}
                  {selectedBooking.boardinghouse.photos &&
                    selectedBooking.boardinghouse.photos.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <Carousel
                          autoplay
                          arrows
                          prevArrow={<AiOutlineLeft className="custom-arrow arrow-left" />}
                          nextArrow={<AiOutlineRight className="custom-arrow arrow-right" />}
                        >
                          {selectedBooking.boardinghouse.photos.map((photo, index) => (
                            <div key={index}>
                              <img
                                src={`${API_BASE}${photo}`}
                                alt={`boardinghouse-${index}`}
                                style={{
                                  width: "100%",
                                  maxHeight: "250px",
                                  objectFit: "cover",
                                  borderRadius: "8px"
                                }}
                              />
                            </div>
                          ))}
                        </Carousel>
                      </div>
                    )}

                  <div className="boardinghouse-info">
                    <h3>{selectedBooking.boardinghouse.title}</h3>

                    <p><strong>Địa chỉ:</strong>
                      {selectedBooking.boardinghouse.location?.addressDetail},
                      {selectedBooking.boardinghouse.location?.street},
                      {selectedBooking.boardinghouse.location?.district}
                    </p>

                    <p><strong>Phòng:</strong> {selectedBooking.room?.roomNumber}</p>

                    <p><strong>Giá phòng:</strong>
                      {selectedBooking.room?.price?.toLocaleString('vi-VN')} VND / tháng
                    </p>

                    <p><strong>Ngày nhận phòng:</strong>
                      {selectedBooking.checkInDate
                        ? dayjs(selectedBooking.checkInDate).format('DD/MM/YYYY')
                        : 'N/A'}
                    </p>

                    <p><strong>Ngày trả phòng:</strong>
                      {selectedBooking.checkOutDate
                        ? dayjs(selectedBooking.checkOutDate).format('DD/MM/YYYY')
                        : 'N/A'}
                    </p>

                    <p><strong>Số khách:</strong> {selectedBooking.guests || 1} người</p>

                    <p><strong>Mục đích thuê:</strong>
                      {selectedBooking.guestInfo?.purpose || 'Không có'}
                    </p>

                    <p><strong>Tổng tiền:</strong>
                      {selectedBooking.totalPrice?.toLocaleString('vi-VN')} VND
                    </p>

                    <p><strong>Mã giao dịch:</strong>
                      {selectedBooking.paymentInfo?.payosOrderCode || 'N/A'}
                    </p>

                    <p><strong>Mô tả:</strong> {selectedBooking.boardinghouse.description}</p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </Modal>

      </div>
    </>
  );
};

export default BookingHistory;