import React, { useState, useEffect } from "react";
import { Layout, Table, Tag, Empty, Button, Tabs, Row, Col, Typography, Image, Modal, message } from "antd";
import { useLocation } from "react-router-dom";
import {
    Layout, Table, Tag, Empty, Button, Divider,
    Row, Col, Typography, Modal, message, Tooltip
} from "antd";
import {
    PhoneOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    CarOutlined,
    TeamOutlined,
    ClockCircleOutlined,
    SafetyOutlined,
    FileTextOutlined,
    AppstoreOutlined,
    DollarOutlined,
    GiftOutlined,
    PercentageOutlined,
    ArrowRightOutlined,
    InfoCircleOutlined,
    ToolOutlined,
    InboxOutlined,
    WarningOutlined,
    EnvironmentOutlined
} from "@ant-design/icons";

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import useUser from "../../../contexts/UserContext";
import api from "../../../services/api";
import orderService from "../../../services/orderService";
import "./style.css";

const { Content } = Layout;
const { confirm } = Modal;

/** Small helper: icon + label + value row */
const InfoRow = ({ icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <span style={{ color: '#52c41a', fontSize: 13, flexShrink: 0 }}>{icon}</span>
        <span style={{ color: '#555', flexShrink: 0 }}>{label}:</span>
        <span style={{ fontWeight: 500, color: '#222' }}>{value}</span>
    </div>
);

const ViewMovingOrder = () => {
    const { user, isAuthenticated } = useUser();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSurveyModalVisible, setIsSurveyModalVisible] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [selectedTicketPricing, setSelectedTicketPricing] = useState(null);
const [isSurveyTimeModalVisible, setIsSurveyTimeModalVisible] = useState(false);
const [selectedTicketForTime, setSelectedTicketForTime] = useState(null);
    const handleViewSurvey = async (ticket) => {
        try {
            setSelectedTicket(ticket);
            const res = await api.get(`/surveys/ticket/${ticket._id}`);
            const surveyData = res.data?.data || res.data;
            setSelectedSurvey(surveyData);

            try {
                const resPricing = await api.get(`/pricing/${ticket._id}`);
                const pricingDetail = resPricing.data?.data;
                setSelectedTicketPricing({ ...ticket.pricing, breakdown: pricingDetail?.breakdown });
            } catch {
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
                    <p>Số tiền cọc: <b style={{ color: "#d9363e" }}>{(ticket.pricing.totalPrice / 2).toLocaleString()} ₫</b></p>
                    <p>Bạn có chắc chắn muốn tiếp tục?</p>
                </>
            ),
            okText: "Thanh toán",
            cancelText: "Hủy",
            okType: "primary",
            onOk: async () => {
                try {
                    const depositAmount = Math.floor(ticket.pricing.totalPrice * 0.5);
                    const res = await orderService.createMovingDeposit(ticket._id, depositAmount);
                    if (res?.data?.checkoutUrl) {
                        window.location.href = res.data.checkoutUrl;
                    } else {
                        message.error("Không tạo được link thanh toán");
                    }
                } catch (err) {
                    message.error("Không thể tạo thanh toán: " + (err.response?.data?.message || err.message));
                }
            }
        });
    };

    useEffect(() => {
        const fetchTickets = async () => {
            if (!isAuthenticated || !user) { setLoading(false); return; }
            try {
                const response = await api.get(`/request-tickets`, {
                    params: { customerId: user._id || user.id }
                });
                if (response.data?.success) {
                    let userTickets = response.data.data || [];
                    const currentUserId = user._id || user.id;
                    userTickets = userTickets.filter(t =>
                        (t.customerId && t.customerId._id === currentUserId) ||
                        t.customerId === currentUserId
                    );
                    userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                    // Lọc theo searchCode từ header
                    const searchParams = new URLSearchParams(location.search);
                    const searchCode = searchParams.get("searchCode");
                    if (searchCode) {
                        const keyword = searchCode.toLowerCase();
                        userTickets = userTickets.filter(t =>
                            (t.code && t.code.toLowerCase().includes(keyword)) ||
                            (t.invoice?.code && t.invoice.code.toLowerCase().includes(keyword))
                        );
                    }

                    setTickets(userTickets);
                }
            } catch (error) {
                console.error("Could not fetch moving orders.", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, [isAuthenticated, user, location.search]);

    const statusColorMap = {
        CREATED: "blue", WAITING_SURVEY: "orange", SURVEYED: "cyan",
        QUOTED: "green", ACCEPTED: "geekblue", CONVERTED: "purple",
        IN_PROGRESS: "processing", COMPLETED: "success", CANCELLED: "error"
    };
    const statusLabelMap = {
        CREATED: "Chờ xác nhận lịch", WAITING_SURVEY: "Đã phân công", SURVEYED: "Đã khảo sát",
        QUOTED: "Đã báo giá", ACCEPTED: "Đã chốt đơn", CONVERTED: "Đã tạo HĐ",
        IN_PROGRESS: "Đang vận chuyển", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy"
    };

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
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit"
            })
        },
        {
    title: "Yêu cầu khảo sát",
    dataIndex: "scheduledTime",
    render: (time) => {
        if (!time) return <span style={{color:"#aaa"}}>Chưa xác định</span>

        return new Date(time).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }
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
            title: "Trạng thái",
            render: (_, record) => {
                if (record.invoice) {
                    const invoiceStatusMap = {
                        DRAFT: { color: "purple", label: "Nháp hóa đơn" },
                        CONFIRMED: { color: "blue", label: "Đã xác nhận" },
                        ASSIGNED: { color: "cyan", label: "Đã phân công xe" },
                        IN_PROGRESS: { color: "processing", label: "Đang vận chuyển" },
                        COMPLETED: { color: "success", label: "Hoàn thành" },
                        CANCELLED: { color: "error", label: "Đã hủy" }
                    };
                    const s = invoiceStatusMap[record.invoice.status];
                    return <Tag color={s?.color || "purple"}>{s?.label || record.invoice.status}</Tag>;
                }
                return <Tag color={statusColorMap[record.status] || "default"}>{statusLabelMap[record.status] || record.status}</Tag>;
            }
        },
        {
            title: "Thanh toán",
            render: (_, record) => {
                const paymentStatus = record?.invoice?.paymentStatus;
                if (!paymentStatus) return <Tag color="default">Chưa phát sinh</Tag>;
                const paymentMap = {
                    UNPAID: { color: "orange", label: "Chưa thanh toán" },
                    PARTIAL: { color: "green", label: "Đã đặt cọc" },
                    PAID: { color: "success", label: "Đã thanh toán" }
                };
                const p = paymentMap[paymentStatus];
                return <Tag color={p?.color || "default"}>{p?.label || paymentStatus}</Tag>;
            }
        },
        {
            title: "Báo giá",
            render: (_, record) => record.pricing?.totalPrice
                ? <strong style={{ color: "#52c41a" }}>{record.pricing.totalPrice.toLocaleString()} ₫</strong>
                : <span style={{ color: "#aaa" }}>Chưa có</span>
        },
        {
            title: "Thao tác",
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {record.status === 'QUOTED' && (
                        <>
                            <Button
                                type="primary"
                                size="small"
                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleViewSurvey(record)}
                            >
                                Chấp nhận
                            </Button>
                            <Button
                                danger
                                size="small"
                                icon={<CloseCircleOutlined />}
                                onClick={() => {
                                    confirm({
                                        title: 'Từ chối báo giá này?',
                                        content: 'Yêu cầu chuyển nhà sẽ bị hủy bỏ.',
                                        okText: 'Từ chối & Hủy',
                                        okType: 'danger',
                                        cancelText: 'Quay lại',
                                        onOk: async () => {
                                            try {
                                                await api.put(`/request-tickets/${record._id}/cancel`, { reason: 'Khách hàng từ chối báo giá' });
                                                message.success("Đã từ chối báo giá và hủy đơn.");
                                                setTickets(prev =>
    prev.map(t =>
        t._id === record._id
            ? { ...t, status: "CANCELLED" }
            : t
    )
);
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
                    {record.status !== 'QUOTED' && (
                        <Button type="link" size="small" icon={<PhoneOutlined />}>Liên hệ</Button>
                    )}
                    {record.pricing?.totalPrice > 0 && (
                        <Button type="dashed" size="small" icon={<EyeOutlined />} onClick={() => handleViewSurvey(record)}>
                            Xem báo giá
                        </Button>
                    )}
                    {record.status === 'ACCEPTED' && record.invoice?.paymentStatus === 'UNPAID' && (
                        <Button
                            type="primary"
                            size="small"
                            style={{ background: '#d9363e', borderColor: '#d9363e' }}
                            onClick={() => window.location.href = `/customer/sign-contract/${record._id}`}
                        >
                            Thanh toán cọc
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

                {/* SCHEDULE TABLE */}
                <section className="order-section">
                    <h2>Lịch Chuyển Nhà Của Tôi</h2>
                    <Table
                        columns={columns}
                        dataSource={tickets}
                        loading={loading}
                        pagination={{ pageSize: 5 }}
                        rowKey="_id"
                        scroll={{ x: 900 }}
                    />
                </section>

                {/* ── SURVEY & PRICING MODAL ── */}
                <Modal
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <EyeOutlined style={{ color: '#44624A', fontSize: 18 }} />
                            <span>
                                Chi tiết khảo sát &amp; Báo giá —{' '}
                                <strong style={{ color: '#44624A' }}>
                                    #{selectedTicket?.code?.slice(-10).toUpperCase()}
                                </strong>
                            </span>
                        </div>
                    }
                    open={isSurveyModalVisible}
                    onCancel={() => setIsSurveyModalVisible(false)}
                    width={880}
                    styles={{ body: { padding: '16px 20px', maxHeight: '80vh', overflowY: 'auto' } }}
                    footer={[
                        selectedTicket?.status === 'QUOTED' && (
                            <Button
                                key="accept"
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                onClick={async () => {
                                    try {
                                        await api.put(`/request-tickets/${selectedTicket._id}/accept-quote`);
                                        message.success('Đã chấp nhận báo giá, vui lòng ký hợp đồng và thanh toán cọc.');
                                        setIsSurveyModalVisible(false);
                                        window.location.href = `/customer/sign-contract/${selectedTicket._id}`;
                                    } catch (err) {
                                        message.error('Lỗi: ' + (err.response?.data?.message || err.message));
                                    }
                                }}
                            >
                                Chấp nhận &amp; Ký hợp đồng
                            </Button>
                        ),
                        selectedTicket?.status === 'ACCEPTED' && selectedTicket?.invoice?.paymentStatus === 'UNPAID' && (
                            <Button
                                key="pay"
                                type="primary"
                                style={{ background: '#d9363e', borderColor: '#d9363e' }}
                                onClick={() => {
                                    setIsSurveyModalVisible(false);
                                    window.location.href = `/customer/sign-contract/${selectedTicket._id}`;
                                }}
                            >
                                Xem HĐ &amp; Thanh toán cọc
                            </Button>
                        ),
                        <Button key="close" onClick={() => setIsSurveyModalVisible(false)}>Đóng</Button>
                    ]}
                >
                    {selectedSurvey && selectedTicketPricing ? (
                        <div style={{ fontSize: 14 }}>

                            {/* ── SECTION 1: SURVEY INFO ── */}
                            <div style={{
                                background: '#f6ffed', border: '1px solid #b7eb8f',
                                borderRadius: 10, padding: '14px 18px', marginBottom: 14
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <div style={{
                                        background: '#52c41a', borderRadius: 6,
                                        padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6
                                    }}>
                                        <FileTextOutlined style={{ color: '#fff', fontSize: 13 }} />
                                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Thông tin khảo sát</span>
                                    </div>
                                </div>

                                <Row gutter={[24, 10]}>
                                    <Col span={12}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <InfoRow icon={<EnvironmentOutlined />} label="Quãng đường" value={`${selectedSurvey.distanceKm} km`} />
                                            <InfoRow icon={<AppstoreOutlined />} label="Tầng lầu" value={selectedSurvey.floors > 0 ? `${selectedSurvey.floors} tầng` : 'Trệt'} />
                                            <InfoRow icon={<ArrowRightOutlined />} label="Thang máy"
                                                value={<Tag color={selectedSurvey.hasElevator ? 'success' : 'default'} style={{ margin: 0 }}>{selectedSurvey.hasElevator ? 'Có' : 'Không'}</Tag>}
                                            />
                                            <InfoRow icon={<ArrowRightOutlined />} label="Khênh vác bộ"
                                                value={selectedSurvey.carryMeter > 0 ? `${selectedSurvey.carryMeter} m` : 'Không'}
                                            />
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <InfoRow icon={<InboxOutlined />} label="Đóng gói"
                                                value={<Tag color={selectedSurvey.needsPacking ? 'blue' : 'default'} style={{ margin: 0 }}>{selectedSurvey.needsPacking ? 'Có' : 'Không'}</Tag>}
                                            />
                                            <InfoRow icon={<ToolOutlined />} label="Tháo lắp"
                                                value={<Tag color={selectedSurvey.needsAssembling ? 'blue' : 'default'} style={{ margin: 0 }}>{selectedSurvey.needsAssembling ? 'Có' : 'Không'}</Tag>}
                                            />
                                            <InfoRow icon={<SafetyOutlined />} label="Bảo hiểm"
                                                value={selectedSurvey.insuranceRequired
                                                    ? <><Tag color="gold" style={{ margin: 0 }}>Có</Tag><span style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>{(selectedSurvey.declaredValue || 0).toLocaleString()} ₫</span></>
                                                    : <Tag color="default" style={{ margin: 0 }}>Không</Tag>}
                                            />
                                            <InfoRow icon={<ClockCircleOutlined />} label="Ước tính" value={`${selectedSurvey.estimatedHours || '—'} giờ`} />
                                        </div>
                                    </Col>
                                    {selectedSurvey.notes && (
                                        <Col span={24}>
                                            <div style={{
                                                background: '#fff', borderRadius: 6,
                                                padding: '6px 10px', border: '1px dashed #b7eb8f',
                                                color: '#555', fontSize: 12, marginTop: 4
                                            }}>
                                                <FileTextOutlined style={{ marginRight: 6, color: '#52c41a' }} />
                                                <em>{selectedSurvey.notes}</em>
                                            </div>
                                        </Col>
                                    )}
                                </Row>
                            </div>

                            {/* ── SECTION 2: RESOURCES & ITEMS ── */}
                            <div style={{
                                background: '#e6f4ff', border: '1px solid #91caff',
                                borderRadius: 10, padding: '14px 18px', marginBottom: 14
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <div style={{
                                        background: '#1677ff', borderRadius: 6,
                                        padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6
                                    }}>
                                        <CarOutlined style={{ color: '#fff', fontSize: 13 }} />
                                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Tài nguyên đề xuất</span>
                                    </div>
                                </div>

                                <Row gutter={[16, 0]}>
                                    {[
                                        { icon: <CarOutlined />, label: 'Xe tải', value: selectedSurvey.suggestedVehicle },
                                        { icon: <TeamOutlined />, label: 'Nhân viên', value: `${selectedSurvey.suggestedStaffCount} người` },
                                        { icon: <ClockCircleOutlined />, label: 'Thời gian', value: `${selectedSurvey.estimatedHours || selectedTicketPricing.breakdown?.estimatedHours || '—'} giờ` },
                                    ].map((item, i) => (
                                        <Col span={8} key={i}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #bae0ff' }}>
                                                <span style={{ color: '#1677ff', fontSize: 18 }}>{item.icon}</span>
                                                <div>
                                                    <div style={{ fontSize: 11, color: '#888' }}>{item.label}</div>
                                                    <div style={{ fontWeight: 700, color: '#1677ff', fontSize: 14 }}>{item.value}</div>
                                                </div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>

                                {selectedSurvey.items?.length > 0 && (
                                    <>
                                        <Divider style={{ margin: '12px 0 10px', borderColor: '#91caff' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                            <InboxOutlined style={{ color: '#1677ff', fontSize: 14 }} />
                                            <Typography.Text strong style={{ color: '#1677ff', fontSize: 13 }}>
                                                Đồ đạc cần chuyển ({selectedSurvey.items.length} món)
                                            </Typography.Text>
                                        </div>
                                        <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {selectedSurvey.items.map((item, idx) => {
                                                const isCritical = item.name?.startsWith('⚠️') || item.name?.startsWith('[CRIT');
                                                const isSec = item.name?.startsWith('[SEC:');
                                                const displayName = isSec
                                                    ? item.name.replace(/^\[SEC:[^\]]+\]\s*/, '')
                                                    : item.name?.replace('⚠️ ', '') || item.name;
                                                const conditionTooltip = { GOOD: 'Tình trạng tốt', FRAGILE: 'Dễ vỡ — cần bảo quản kỹ', DAMAGED: 'Đã hư hỏng' }[item.condition];
                                                return (
                                                    <Tooltip key={idx} title={conditionTooltip || ''}>
                                                        <Tag
                                                            icon={isCritical ? <WarningOutlined /> : null}
                                                            color={isCritical ? 'error' : isSec ? 'orange' : 'blue'}
                                                            style={{ fontSize: 12, padding: '2px 8px', cursor: 'default', marginBottom: 0 }}
                                                        >
                                                            {displayName}
                                                            {item.actualWeight > 0 && (
                                                                <span style={{ opacity: 0.7, fontSize: 11, marginLeft: 4 }}>{item.actualWeight}kg</span>
                                                            )}
                                                        </Tag>
                                                    </Tooltip>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* ── SECTION 3: PRICING BREAKDOWN ── */}
                            <div style={{
                                background: '#fff', border: '1px solid #e8e8e8',
                                borderRadius: 10, padding: '14px 18px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <div style={{
                                        background: '#44624A', borderRadius: 6,
                                        padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6
                                    }}>
                                        <DollarOutlined style={{ color: '#fff', fontSize: 13 }} />
                                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Cấu thành giá chi tiết</span>
                                    </div>
                                </div>

                                {(() => {
                                    const bd = selectedTicketPricing?.breakdown || {};
                                    const lines = [
                                        { icon: <ArrowRightOutlined />, label: 'Phí vận chuyển cơ bản', value: bd.baseTransportFee, always: true },
                                        { icon: <CarOutlined />, label: 'Phí xe tải (theo km)', value: bd.vehicleFee, always: true },
                                        { icon: <TeamOutlined />, label: 'Phí nhân công', value: bd.laborFee, always: true },
                                        { icon: <AppstoreOutlined />, label: 'Phí dịch vụ đồ vật', value: bd.serviceFee, always: false },
                                        { icon: <EnvironmentOutlined />, label: 'Phụ phí chặng xa (>30km)', value: bd.distanceSurcharge, always: false },
                                        { icon: <TeamOutlined />, label: 'Phí khiêng vác bộ', value: bd.carryFee, always: false },
                                        { icon: <AppstoreOutlined />, label: 'Phí tầng lầu', value: bd.floorFee, always: false },
                                        { icon: <SafetyOutlined />, label: 'Phí bảo hiểm', value: bd.insuranceFee, always: false },
                                        { icon: <InfoCircleOutlined />, label: 'Phí quản lý', value: bd.managementFee, always: false },
                                    ].filter(l => l.always || (l.value != null && l.value > 0));

                                    return (
                                        <>
                                            {lines.map((l, i) => (
                                                <div key={i} style={{
                                                    display: 'flex', justifyContent: 'space-between',
                                                    alignItems: 'center', padding: '7px 0',
                                                    borderBottom: '1px solid #f5f5f5'
                                                }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555', fontSize: 13 }}>
                                                        <span style={{ color: '#44624A', fontSize: 12 }}>{l.icon}</span>
                                                        {l.label}
                                                    </span>
                                                    <strong style={{ color: '#333', fontSize: 13 }}>{(l.value || 0).toLocaleString()} ₫</strong>
                                                </div>
                                            ))}

                                            {/* Subtotal */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 6px', marginTop: 2 }}>
                                                <span style={{ fontWeight: 600, color: '#444' }}>Tạm tính</span>
                                                <span style={{ fontWeight: 600, color: '#444' }}>{(selectedTicketPricing.subtotal || 0).toLocaleString()} ₫</span>
                                            </div>

                                            {/* Discount */}
                                            {selectedTicketPricing.discountAmount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#cf1322' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <GiftOutlined />
                                                        Khuyến mãi (trước thuế)
                                                    </span>
                                                    <span style={{ fontWeight: 500 }}>− {selectedTicketPricing.discountAmount.toLocaleString()} ₫</span>
                                                </div>
                                            )}

                                            {/* Tax */}
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                padding: '5px 0 10px', color: '#888',
                                                borderBottom: '2px dashed #e8e8e8'
                                            }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <PercentageOutlined />
                                                    Thuế VAT
                                                </span>
                                                <span>{(selectedTicketPricing.tax || 0).toLocaleString()} ₫</span>
                                            </div>

                                            {/* Min charge notice */}
                                            {selectedTicketPricing.minimumChargeApplied && (
                                                <Tag icon={<WarningOutlined />} color="orange" style={{ marginTop: 10, width: '100%', textAlign: 'center', borderRadius: 6 }}>
                                                    Áp dụng phí tối thiểu
                                                </Tag>
                                            )}

                                            {/* TOTAL */}
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'center', padding: '12px 16px', marginTop: 12,
                                                background: 'linear-gradient(135deg, #f6ffed, #d9f7be)',
                                                borderRadius: 8, border: '1.5px solid #73d13d'
                                            }}>
                                                <span style={{ fontSize: 16, fontWeight: 700, color: '#237804', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <DollarOutlined />
                                                    TỔNG CỘNG
                                                </span>
                                                <span style={{ fontSize: 24, fontWeight: 800, color: '#237804' }}>
                                                    {(selectedTicketPricing.totalPrice || 0).toLocaleString()} ₫
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        <Empty description="Chưa có thông tin khảo sát" />
                    )}
                </Modal>
<Modal
    title="Chọn thời gian khảo sát"
    open={isSurveyTimeModalVisible}
    onCancel={() => setIsSurveyTimeModalVisible(false)}
    footer={null}
>
{selectedTicketForTime?.rescheduleReason && (
    <div
        style={{
            background: "#fff7e6",
            border: "1px solid #ffd591",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "15px"
        }}
    >
        <b>Lý do đề xuất lịch mới:</b> {selectedTicketForTime.rescheduleReason}
    </div>
)}
{selectedTicketForTime?.dispatcherId && (
    <div
        style={{
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "15px"
        }}
    >
        <b>Nhân viên khảo sát:</b>{" "}
        {selectedTicketForTime.dispatcherId.fullName} 
        {selectedTicketForTime.dispatcherId.phone && 
            ` - ${selectedTicketForTime.dispatcherId.phone}`}
    </div>
)}
    {selectedTicketForTime?.proposedSurveyTimes?.map((time, index) => (
        <div
            key={index}
            style={{
                border: "1px solid #ddd",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }}
        >
            <span>
                {new Date(time).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                })}
            </span>

            <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={async () => {
                    try {

                        await orderService.acceptSurveyTime(
                            selectedTicketForTime._id,
                            time
                        )

                        message.success("Đã chấp nhận lịch khảo sát")

                        setIsSurveyTimeModalVisible(false)

                       setTickets(prev =>
            prev.map(t =>
                t._id === selectedTicketForTime._id
                    ? { ...t, status: "WAITING_SURVEY", scheduledTime: time }
                    : t
            )
        )

                    } catch (err) {
                        message.error(err.response?.data?.message || err.message)
                    }
                }}
            >
                Chấp nhận
            </Button>

        </div>
    ))}

    {/* Reject toàn bộ */}
    {selectedTicketForTime?.proposedSurveyTimes?.length > 0 && (
        <div style={{ marginTop: 20, textAlign: "right" }}>
          <Button
    danger
    icon={<CloseCircleOutlined />}
    onClick={() => {

        confirm({
            title: "Bạn có chắc muốn hủy yêu cầu chuyển nhà?",
            content: "Yêu cầu này sẽ bị hủy và không thể khôi phục.",
            okText: "Xác nhận hủy",
            okType: "danger",
            cancelText: "Quay lại",

            onOk: async () => {
                try {

                    await orderService.cancelOrder(
                        selectedTicketForTime._id,
                        "Khách hàng từ chối lịch khảo sát"
                    );

                    message.success("Đã hủy yêu cầu chuyển nhà");

                    setIsSurveyTimeModalVisible(false);

                  setTickets(prev =>
    prev.map(t =>
        t._id === selectedTicketForTime._id
            ? { ...t, status: "CANCELLED" }
            : t
    )
);

                } catch (err) {
                    message.error(err.response?.data?.message || err.message);
                }
            }
        });

    }}
>
    Hủy yêu cầu
</Button>
        </div>
    )}

    {selectedTicketForTime?.proposedSurveyTimes?.length === 0 && (
        <Empty description="Chưa có lịch khảo sát" />
    )}

                {/* ITEMS GRID — Real data from selected survey */}
                {selectedSurvey && (
                    <section className="order-options-section">
                        <div style={{ marginBottom: 20, paddingLeft: 5 }}>
                            <h2 style={{ color: '#44624A', fontSize: 26, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <InboxOutlined style={{ color: '#44624A' }} />
                                Danh sách đồ đạc khảo sát
                            </h2>
                            <p style={{ color: '#666', margin: 0 }}>
                                Đơn <strong>#{selectedTicket?.code?.slice(-10).toUpperCase()}</strong> — {selectedSurvey.items?.length || 0} món đồ
                            </p>
                        </div>

                        <Row gutter={[16, 16]}>
                            {(selectedSurvey.items || []).map((item, idx) => {
                                const isCritical = item.name?.startsWith('⚠️') || item.name?.startsWith('[CRIT');
                                const isSec = item.name?.startsWith('[SEC:');
                                const displayName = isSec
                                    ? item.name.replace(/^\[SEC:[^\]]+\]\s*/, '')
                                    : item.name?.replace('⚠️ ', '') || item.name;
                                const conditionLabel = { GOOD: 'Tốt', FRAGILE: 'Dễ vỡ', DAMAGED: 'Hư hỏng' }[item.condition] || item.condition;
                                const conditionColor = { GOOD: '#52c41a', FRAGILE: '#ff4d4f', DAMAGED: '#fa8c16' }[item.condition] || '#aaa';
                                const cardBorder = isCritical ? '#ff4d4f' : isSec ? '#faad14' : '#d9d9d9';
                                const cardBg = isCritical ? '#fff1f0' : isSec ? '#fffbe6' : '#fafafa';

                                return (
                                    <Col xs={24} sm={12} md={8} lg={6} key={idx}>
                                        <div style={{
                                            border: `1.5px solid ${cardBorder}`, background: cardBg,
                                            borderRadius: 10, padding: '12px 14px',
                                            height: '100%', display: 'flex', flexDirection: 'column', gap: 5
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <span style={{ fontWeight: 600, fontSize: 13, color: isCritical ? '#cf1322' : '#222', flex: 1, marginRight: 4 }}>
                                                    {isCritical && <WarningOutlined style={{ marginRight: 4, color: '#ff4d4f' }} />}
                                                    {displayName}
                                                </span>
                                                {item.condition && (
                                                    <span style={{ fontSize: 11, color: conditionColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                        ● {conditionLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 10, color: '#777', fontSize: 12 }}>
                                                {item.actualWeight > 0 && <span><InfoCircleOutlined style={{ marginRight: 3 }} />{item.actualWeight} kg</span>}
                                                {item.actualVolume > 0 && <span>{item.actualVolume} m³</span>}
                                            </div>
                                            {item.notes && (
                                                <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>
                                                    {item.notes}
                                                </div>
                                            )}
                                        </div>
                                    </Col>
                                );
                            })}
                            {(!selectedSurvey.items || selectedSurvey.items.length === 0) && (
                                <Col span={24}>
                                    <Empty description="Chưa có danh sách đồ đạc từ khảo sát" />
                                </Col>
                            )}
                        </Row>
                    </section>
                )}
            </Content>

            <AppFooter />
        </Layout>
    );
};

export default ViewMovingOrder;
