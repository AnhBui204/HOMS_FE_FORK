import React, { useState, useEffect } from "react";
import { Layout, Table, Tag, Empty, Button, Tabs, Row, Col, Typography, Image } from "antd";
import {
    EnvironmentOutlined,
    PhoneOutlined,
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

import "./style.css";

const { Content } = Layout;

const ViewMovingOrder = () => {
    const { user, isAuthenticated } = useUser();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

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
        "SURVEYING": "cyan",
        "WAITING_PRICING": "gold",
        "CHECKING_PRICING": "purple",
        "IN_PROGRESS": "processing",
        "COMPLETED": "success",
        "CANCELLED": "error"
    };

    const statusLabelMap = {
        "CREATED": "Mới tạo",
        "WAITING_SURVEY": "Chờ khảo sát",
        "SURVEYING": "Đang khảo sát",
        "WAITING_PRICING": "Chờ báo giá",
        "CHECKING_PRICING": "Khách duyệt giá",
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
            title: "Trạng Thái",
            dataIndex: "status",
            render: (status) => (
                <Tag color={statusColorMap[status] || "default"}>
                    {statusLabelMap[status] || status}
                </Tag>
            ),
        },
        {
            title: "Thao tác",
            render: () => (
                <Button type="link" icon={<PhoneOutlined />}>
                    Liên hệ
                </Button>
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
