import React, { useState, useEffect } from "react";
import { Layout, Table, Tag, Empty, Button, Tabs, Row, Col, Typography, Image, Modal, message } from "antd";
import {
    EnvironmentOutlined,
    PhoneOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined
} from "@ant-design/icons";
import {
    Sofa,
    Tv,
    BedDouble,
    Shirt,
    Refrigerator,
    UtensilsCrossed,
    MonitorSpeaker,
    Lamp
} from "lucide-react";
import { FaBoxOpen } from "react-icons/fa";

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import useUser from "../../../contexts/UserContext";
import api from "../../../services/api";
import orderService from "../../../services/orderService";
import "./style.css";

const { Content } = Layout;
const { confirm } = Modal;

const ViewMovingOrder = () => {
    const { user, isAuthenticated } = useUser();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSurveyModalVisible, setIsSurveyModalVisible] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [selectedTicketPricing, setSelectedTicketPricing] = useState(null);

    const handleViewSurvey = async (ticket) => {
        try {
            // Lấy khảo sát
               setSelectedTicket(ticket);  
            const res = await api.get(`/surveys/ticket/${ticket._id}`);
            const surveyData = res.data?.data || res.data;
            setSelectedSurvey(surveyData);

            // Cố gắng lấy báo giá chi tiết (breakdown fees)
            try {
                const resPricing = await api.get(`/pricing/${ticket._id}`);
                const pricingDetail = resPricing.data?.data;
                // Gộp thông tin pricing cơ bản và breakdown
                setSelectedTicketPricing({ ...ticket.pricing, breakdown: pricingDetail?.breakdown });
            } catch (err) {
                // Nếu báo lỗi 404 (chưa có) thì vẫn dùng ticket.pricing gốc
                setSelectedTicketPricing(ticket.pricing);
            }

            setIsSurveyModalVisible(true);
        } catch (error) {
            message.error("Không thể tải thông tin khảo sát: " + (error.response?.data?.message || error.message));
        }
    };
const handleDepositPayment = (ticket) => {
   
    confirm({
        title: "Xác nhận thanh toán cọc",
        content: (
            <>
                <p>Bạn sắp thanh toán <b>50% giá trị đơn hàng</b>.</p>
                <p>
                    Số tiền cọc:{" "}
                    <b style={{ color: "#d9363e" }}>
                        {(ticket.pricing.totalPrice / 2).toLocaleString()} ₫
                    </b>
                </p>
                <p>Bạn có chắc chắn muốn tiếp tục?</p>
            </>
        ),
        okText: "Thanh toán",
        cancelText: "Hủy",
        okType: "primary",

        onOk: async () => {
            try {

                const depositAmount = Math.floor(ticket.pricing.totalPrice * 0.5);

                const res = await orderService.createMovingDeposit(
                    ticket._id,
                    depositAmount
                );

                if (res?.data?.checkoutUrl) {
                    window.location.href = res.data.checkoutUrl;
                } else {
                    message.error("Không tạo được link thanh toán");
                }

            } catch (err) {
                message.error(
                    "Không thể tạo thanh toán: " +
                    (err.response?.data?.message || err.message)
                );
            }
        }
    });
};

    // Fetch user shifting schedule from db
    useEffect(() => {
        const fetchTickets = async () => {
            if (!isAuthenticated || !user) {
                setLoading(false);
                return;
            }

            try {
                const response = await api.get(`/request-tickets`, {
                    params: { customerId: user._id || user.id }
                });

                if (response.data && response.data.success) {
                    let userTickets = response.data.data || [];
                    const currentUserId = user._id || user.id;

                    // Filter just like Dashboard
                    userTickets = userTickets.filter(t =>
                        (t.customerId && t.customerId._id === currentUserId) ||
                        t.customerId === currentUserId
                    );

                    // Sort newest first
                    userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setTickets(userTickets);
                }
            } catch (error) {
                console.error("Could not fetch moving orders.", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [isAuthenticated, user]);

    // Format map for tags/status colors
    const statusColorMap = {
        "CREATED": "blue",
        "WAITING_SURVEY": "orange",
        "SURVEYED": "cyan",
        "QUOTED": "green",
        "ACCEPTED": "geekblue",
        "CONVERTED": "purple",
        "IN_PROGRESS": "processing",
        "COMPLETED": "success",
        "CANCELLED": "error"
    };

    const statusLabelMap = {
        "CREATED": "Chờ xác nhận lịch",
        "WAITING_SURVEY": "Đã phân công",
        "SURVEYED": "Đã khảo sát",
        "QUOTED": "Đã báo giá",
        "ACCEPTED": "Đã chốt đơn",
        "CONVERTED": "Đã tạo HĐ",
        "IN_PROGRESS": "Đang vận chuyển",
        "COMPLETED": "Hoàn thành",
        "CANCELLED": "Đã hủy"
    };

    // Columns for schedule table mapping backend payload
    const columns = [
        {
            title: "Mã Đơn",
            dataIndex: "code",
            render: (text) => <strong>#{text?.slice(-14).toUpperCase() || "N/A"}</strong>
        },
        {
            title: "Ngày Tạo",
            dataIndex: "createdAt",
            render: (date) => new Date(date).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            })
        },
        {
            title: "Chuyển từ",
            dataIndex: "pickup",
            render: (pickup) => pickup?.address || "Chưa cập nhật"
        },
        {
            title: "Chuyển đến",
            dataIndex: "delivery",
            render: (delivery) => delivery?.address || "Chưa cập nhật"
        },
        {
    title: "Trạng thái đơn",
    render: (_, record) => {

        // Nếu đã có invoice → dùng trạng thái invoice
        if (record.invoice) {

            const invoiceStatusMap = {
    DRAFT: { color: "purple", label: "Nháp hóa đơn" },
    CONFIRMED: { color: "blue", label: "Đã xác nhận" },
    ASSIGNED: { color: "cyan", label: "Đã phân công xe" },
    IN_PROGRESS: { color: "processing", label: "Đang vận chuyển" },
    COMPLETED: { color: "success", label: "Hoàn thành" },
    CANCELLED: { color: "error", label: "Đã hủy" }
};
            const invoiceStatus = invoiceStatusMap[record.invoice.status];

            return (
                <Tag color={invoiceStatus?.color || "purple"}>
                    {invoiceStatus?.label || record.invoice.status}
                </Tag>
            );
        }

        // Nếu chưa có invoice → dùng trạng thái ticket
        return (
            <Tag color={statusColorMap[record.status] || "default"}>
                {statusLabelMap[record.status] || record.status}
            </Tag>
        );
    }
},
       {
    title: "Thanh toán",
    render: (_, record) => {

        const paymentStatus = record?.invoice?.paymentStatus;

        if (!paymentStatus) {
            return <Tag color="default">Chưa phát sinh</Tag>;
        }

        const paymentMap = {
            UNPAID: { color: "orange", label: "Chưa thanh toán" },
            PARTIAL: { color: "green", label: "Đã đặt cọc" },
            PAID: { color: "success", label: "Đã thanh toán" }
        };

        const payment = paymentMap[paymentStatus];

        return (
            <Tag color={payment?.color || "default"}>
                {payment?.label || paymentStatus}
            </Tag>
        );
    }
},
        {
            title: "Báo giá (VNĐ)",
            render: (_, record) => {
                if (record.pricing?.totalPrice) {
                    return <strong style={{ color: "#52c41a" }}>{record.pricing.totalPrice.toLocaleString()} ₫</strong>;
                }
                return <span style={{ color: "#aaa" }}>Chưa có</span>;
            }
        },
        {
            title: "Thao tác",
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

                    {/* Hành động khi đơn hàng ở trạng thái QUOTED (Chờ khách chốt) */}
                    {record.status === 'QUOTED' && (
                        <>
                            <Button
                                type="primary"
                                style={{ background: '#52c41a', borderColor: '#52c41a', minWidth: '120px' }}
                                icon={<CheckCircleOutlined />}
                                onClick={async () => {
                                    try {
                                        // Gọi API chấp nhận báo giá
                                        await api.put(`/request-tickets/${record._id}/accept-quote`);
                                        message.success("Đã chấp nhận báo giá, vui lòng ký hợp đồng.");
                                        // Chuyển tới trang Ký Hợp Đồng Mới
                                        window.location.href = `/customer/sign-contract/${record._id}`;
                                    } catch (err) {
                                        message.error("Lỗi khi chấp nhận báo giá: " + (err.response?.data?.message || err.message));
                                    }
                                }}
                            >
                                Chấp nhận
                            </Button>

                            <Button
                                danger
                                icon={<CloseCircleOutlined />}
                                style={{ minWidth: '120px' }}
                                onClick={() => {
                                    confirm({
                                        title: 'Bạn có chắc chắn muốn từ chối báo giá này?',
                                        content: 'Yêu cầu chuyển nhà sẽ bị hủy bỏ.',
                                        okText: 'Từ chối & Hủy',
                                        okType: 'danger',
                                        cancelText: 'Quay lại',
                                        onOk: async () => {
                                            try {
                                                await api.put(`/request-tickets/${record._id}/cancel`, {
                                                    reason: 'Khách hàng từ chối báo giá'
                                                });
                                                message.success("Đã từ chối báo giá và hủy đơn.");
                                                window.location.reload();
                                            } catch (err) {
                                                message.error("Lỗi khi hủy đơn: " + (err.response?.data?.message || err.message));
                                            }
                                        }
                                    });
                                }}
                            >
                                Từ chối
                            </Button>
                        </>
                    )}

                    {/* Hành động mặc định hoặc sau khi chốt */}
                    {record.status !== 'QUOTED' && (
                        <Button type="link" icon={<PhoneOutlined />}>
                            Liên hệ
                        </Button>
                    )}

                    {/* Xem thông tin khảo sát (có báo giá r thì xem được) */}
                    {record.pricing?.totalPrice > 0 && (
                        <Button
                            type="dashed"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewSurvey(record)}
                        >
                            Xem báo giá
                        </Button>
                    )}

            
                  
                </div>
            ),
        },
    ];

    return (
        <Layout className="view-order-page">
            <AppHeader />

            <Content>
                {/* HERO */}
                <section className="order-hero">
                    <div className="overlay" />
                    <h1>Thông Tin Chi Tiết</h1>
                </section>

                {/* SCHEDULE */}
                <section className="order-section">
                    <h2>Lịch Chuyển Nhà Của Tôi</h2>

                    <Table
                        columns={columns}
                        dataSource={tickets}
                        loading={loading}
                        pagination={{ pageSize: 5 }}
                        rowKey="_id"
                    />
                </section>

                <Modal
                    title="Chi tiết khảo sát & Báo giá"
                    open={isSurveyModalVisible}
                    onCancel={() => setIsSurveyModalVisible(false)}
                   footer={[
    selectedTicketPricing?.totalPrice > 1000000 && (
       <Button
    key="deposit"
    type="primary"
    style={{ background: "#d9363e" }}
    onClick={() => handleDepositPayment(selectedTicket)}
>
    Thanh toán cọc 50%
</Button>
    ),
    <Button key="close" onClick={() => setIsSurveyModalVisible(false)}>
        Đóng
    </Button>
]}
                    width={700}
                >
                    {selectedSurvey && selectedTicketPricing ? (
                        <div>
                            <Typography.Title level={5}>1. Thông tin khảo sát</Typography.Title>
                            <Row gutter={[16, 16]}>
                                <Col span={12}>
                                    <ul>
                                        <li><strong>Quãng đường:</strong> {selectedSurvey.distanceKm} km</li>
                                        <li><strong>Khênh vác:</strong> {selectedSurvey.carryMeter > 0 ? `${selectedSurvey.carryMeter} mét` : 'Không'}</li>
                                        <li><strong>Tầng lầu:</strong> {selectedSurvey.floors}</li>
                                        <li><strong>Thang máy:</strong> {selectedSurvey.hasElevator ? 'Có' : 'Không'}</li>
                                    </ul>
                                </Col>
                                <Col span={12}>
                                    <ul>
                                        <li><strong>Tháo lắp:</strong> {selectedSurvey.needsAssembling ? 'Có' : 'Không'}</li>
                                        <li><strong>Đóng gói:</strong> {selectedSurvey.needsPacking ? 'Có' : 'Không'}</li>
                                        <li><strong>Bảo hiểm:</strong> {selectedSurvey.insuranceRequired ? 'Có' : 'Không'}</li>
                                        <li><strong>Số lượng đồ (ước tính):</strong> {selectedSurvey.totalActualItems || selectedSurvey.items?.length || 0} món</li>
                                    </ul>
                                </Col>
                            </Row>

                            <Typography.Title level={5} style={{ marginTop: 20 }}>2. Đề xuất tài nguyên</Typography.Title>
                            <p><strong>Loại xe:</strong> {selectedSurvey.suggestedVehicle}</p>
                            <p><strong>Nhân sự:</strong> {selectedSurvey.suggestedStaffCount} người</p>

                            <Typography.Title level={5} style={{ marginTop: 20 }}>3. Cấu thành giá chi tiết</Typography.Title>
                            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
                                {selectedTicketPricing?.breakdown ? (
                                    <>
                                        <Row justify="space-between" style={{ marginBottom: '8px', color: '#555' }}>
                                            <Col>Phí xe tải:</Col>
                                            <Col>{selectedTicketPricing.breakdown.vehicleFee?.toLocaleString() || 0} ₫</Col>
                                        </Row>
                                        <Row justify="space-between" style={{ marginBottom: '8px', color: '#555' }}>
                                            <Col>Phí nhân công:</Col>
                                            <Col>{selectedTicketPricing.breakdown.laborFee?.toLocaleString() || 0} ₫</Col>
                                        </Row>
                                        {(selectedTicketPricing.breakdown.distanceFee || 0) > 0 && (
                                            <Row justify="space-between" style={{ marginBottom: '8px', color: '#555' }}>
                                                <Col>Phụ phí quãng đường xa:</Col>
                                                <Col>{selectedTicketPricing.breakdown.distanceFee?.toLocaleString() || 0} ₫</Col>
                                            </Row>
                                        )}
                                        {(selectedTicketPricing.breakdown.floorFee || 0) > 0 && (
                                            <Row justify="space-between" style={{ marginBottom: '8px', color: '#555' }}>
                                                <Col>Phụ phí tầng lầu:</Col>
                                                <Col>{selectedTicketPricing.breakdown.floorFee?.toLocaleString() || 0} ₫</Col>
                                            </Row>
                                        )}
                                        {(selectedTicketPricing.breakdown.carryFee || 0) > 0 && (
                                            <Row justify="space-between" style={{ marginBottom: '8px', color: '#555' }}>
                                                <Col>Phí khuân vác nội bộ:</Col>
                                                <Col>{selectedTicketPricing.breakdown.carryFee?.toLocaleString() || 0} ₫</Col>
                                            </Row>
                                        )}
                                        {(selectedTicketPricing.breakdown.assemblingFee || 0) > 0 && (
                                            <Row justify="space-between" style={{ marginBottom: '8px', color: '#555' }}>
                                                <Col>Phí tháo lắp đồ đạc:</Col>
                                                <Col>{selectedTicketPricing.breakdown.assemblingFee?.toLocaleString() || 0} ₫</Col>
                                            </Row>
                                        )}
                                        {(selectedTicketPricing.breakdown.packingFee || 0) > 0 && (
                                            <Row justify="space-between" style={{ marginBottom: '8px', color: '#555' }}>
                                                <Col>Phí đóng gói:</Col>
                                                <Col>{selectedTicketPricing.breakdown.packingFee?.toLocaleString() || 0} ₫</Col>
                                            </Row>
                                        )}
                                        <Row justify="space-between" style={{ borderTop: '1px solid #ddd', paddingTop: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
                                            <Col>Phí cơ bản:</Col>
                                            <Col>{selectedTicketPricing.subtotal?.toLocaleString() || 0} ₫</Col>
                                        </Row>
                                    </>
                                ) : (
                                    <Row justify="space-between" style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                                        <Col>Phí cơ bản (Xe + Quãng đường + Nhân sự):</Col>
                                        <Col>{selectedTicketPricing.subtotal?.toLocaleString() || 0} ₫</Col>
                                    </Row>
                                )}

                                <Row justify="space-between" style={{ marginBottom: '8px' }}>
                                    <Col>Thuế / Phụ phí khác:</Col>
                                    <Col><strong>{selectedTicketPricing.tax?.toLocaleString() || 0} ₫</strong></Col>
                                </Row>
                                <Row justify="space-between" style={{ borderTop: '2px solid #ddd', paddingTop: '8px', fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                                    <Col>Tổng cộng:</Col>
                                    <Col>{selectedTicketPricing.totalPrice?.toLocaleString() || 0} ₫</Col>
                                </Row>
                            </div>
                        </div>
                    ) : (
                        <Empty description="Chưa có thông tin khảo sát" />
                    )}
                </Modal>

                {/* FURNITURE LIST */}
                <section className="order-options-section">
                    <div style={{ marginBottom: "30px", paddingLeft: "5px" }}>
                        <h2 style={{ color: "#44624A", fontSize: "28px" }}>Sơ đồ phòng & Đồ đạc</h2>
                        <p style={{ color: "#666" }}>Chi tiết danh sách đồ đạc cần vận chuyển theo từng phòng.</p>
                    </div>

                    <div className="tabbed-room-layout-container">
                        <Tabs
                            defaultActiveKey="1"
                            tabPosition="top"
                            type="card"
                            className="room-tabs-custom"
                            items={[
                                {
                                    key: '1',
                                    label: 'Phòng Khách',
                                    children: (
                                        <Row gutter={[30, 30]} className="tab-room-content-enhanced">
                                            {/* LEFT: Furniture Cards */}
                                            <Col xs={24} lg={14}>
                                                <Row gutter={[16, 16]}>
                                                    {[
                                                        { name: "Sofa da", quantity: 1, types: ["Cồng kềnh", "Dễ rách/trầy xước"], icon: <Sofa size={24} /> },
                                                        { name: "TV 65 inch", quantity: 1, types: ["Dễ vỡ", "Giá trị cao"], icon: <Tv size={24} /> },
                                                        { name: "Bàn trà kính", quantity: 1, types: ["Dễ vỡ", "Dễ nứt mẻ"], icon: <UtensilsCrossed size={24} /> },
                                                        { name: "Loa Thanh", quantity: 1, types: ["Thiết bị điện tử"], icon: <MonitorSpeaker size={24} /> }
                                                    ].map((item, idx) => (
                                                        <Col xs={24} sm={12} key={idx}>
                                                            <div className="furniture-item-card with-icon">
                                                                <div className="fi-icon-box">{item.icon}</div>
                                                                <div className="fi-info-box">
                                                                    <div className="fi-top">
                                                                        <span className="fi-name">{item.name}</span>
                                                                        <strong className="fi-qty">x{item.quantity}</strong>
                                                                    </div>
                                                                    <div style={{ marginTop: 6, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                        {item.types && item.types.map((t, i) => (
                                                                            <Tag key={i} color={t === "Dễ vỡ" || t.includes("rách") || t.includes("nứt mẻ") ? "red" : "orange"}>{t}</Tag>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Col>
                                                    ))}
                                                </Row>
                                            </Col>

                                            {/* RIGHT: Room Photo */}
                                            <Col xs={24} lg={10}>
                                                <div className="room-image-reference">
                                                    <Image
                                                        src="https://images.unsplash.com/photo-1554995207-c18c203602cb"
                                                        alt="Phòng Khách Tham Khảo"
                                                        className="room-img-cover"
                                                        preview={{ mask: 'Xem Toàn Màn Hình' }}
                                                    />
                                                    <div className="room-image-caption">Hình ảnh tham khảo trước khi vận chuyển</div>
                                                </div>
                                            </Col>
                                        </Row>
                                    )
                                },
                                {
                                    key: '2',
                                    label: 'Phòng Ngủ Master',
                                    children: (
                                        <Row gutter={[30, 30]} className="tab-room-content-enhanced">
                                            {/* LEFT: Furniture Cards */}
                                            <Col xs={24} lg={14}>
                                                <Row gutter={[16, 16]}>
                                                    {[
                                                        { name: "Giường King Size", quantity: 1, types: ["Cồng kềnh", "Cần tháo lắp"], icon: <BedDouble size={24} /> },
                                                        { name: "Tủ quần áo 4 cánh", quantity: 1, types: ["Cồng kềnh", "Cần tháo lắp", "Rất nặng"], icon: <Shirt size={24} /> },
                                                        { name: "Đèn ngủ", quantity: 2, types: ["Dễ vỡ", "Bọc lót giảm xóc"], icon: <Lamp size={24} /> }
                                                    ].map((item, idx) => (
                                                        <Col xs={24} sm={12} key={idx}>
                                                            <div className="furniture-item-card with-icon">
                                                                <div className="fi-icon-box">{item.icon}</div>
                                                                <div className="fi-info-box">
                                                                    <div className="fi-top">
                                                                        <span className="fi-name">{item.name}</span>
                                                                        <strong className="fi-qty">x{item.quantity}</strong>
                                                                    </div>
                                                                    <div style={{ marginTop: 6, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                        {item.types && item.types.map((t, i) => (
                                                                            <Tag key={i} color={t === "Dễ vỡ" ? "red" : "orange"}>{t}</Tag>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Col>
                                                    ))}
                                                </Row>
                                            </Col>

                                            {/* RIGHT: Room Photo */}
                                            <Col xs={24} lg={10}>
                                                <div className="room-image-reference">
                                                    <Image
                                                        src="https://images.unsplash.com/photo-1616594039964-ae9021a400a0"
                                                        alt="Phòng Ngủ Tham Khảo"
                                                        className="room-img-cover"
                                                        preview={{ mask: 'Xem Toàn Màn Hình' }}
                                                    />
                                                    <div className="room-image-caption">Hình ảnh tham khảo trước khi vận chuyển</div>
                                                </div>
                                            </Col>
                                        </Row>
                                    )
                                },
                                {
                                    key: '3',
                                    label: 'Phòng Bếp',
                                    children: (
                                        <Row gutter={[30, 30]} className="tab-room-content-enhanced">
                                            {/* LEFT: Furniture Cards */}
                                            <Col xs={24} lg={14}>
                                                <Row gutter={[16, 16]}>
                                                    {[
                                                        { name: "Tủ lạnh Side-by-side", quantity: 1, types: ["Cồng kềnh", "Tránh đặt nằm ngang", "Rất nặng"], icon: <Refrigerator size={24} /> },
                                                        { name: "Bàn ăn lớn", quantity: 1, types: ["Cồng kềnh", "Dễ nứt góc"], icon: <UtensilsCrossed size={24} /> }
                                                    ].map((item, idx) => (
                                                        <Col xs={24} sm={12} key={idx}>
                                                            <div className="furniture-item-card with-icon">
                                                                <div className="fi-icon-box">{item.icon}</div>
                                                                <div className="fi-info-box">
                                                                    <div className="fi-top">
                                                                        <span className="fi-name">{item.name}</span>
                                                                        <strong className="fi-qty">x{item.quantity}</strong>
                                                                    </div>
                                                                    <div style={{ marginTop: 6, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                        {item.types && item.types.map((t, i) => (
                                                                            <Tag key={i} color={t.includes("nứt") || t.includes("Tránh") ? "red" : "orange"}>{t}</Tag>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Col>
                                                    ))}
                                                </Row>
                                            </Col>

                                            {/* RIGHT: Room Photo */}
                                            <Col xs={24} lg={10}>
                                                <div className="room-image-reference">
                                                    <Image
                                                        src="https://images.unsplash.com/photo-1556910103-1c02745aae4d"
                                                        alt="Phòng Bếp Tham Khảo"
                                                        className="room-img-cover"
                                                        preview={{ mask: 'Xem Toàn Màn Hình' }}
                                                    />
                                                    <div className="room-image-caption">Hình ảnh tham khảo trước khi vận chuyển</div>
                                                </div>
                                            </Col>
                                        </Row>
                                    )
                                }
                            ]}
                        />
                    </div>
                </section>
            </Content>

            <AppFooter />
        </Layout>
    );
};

export default ViewMovingOrder;
