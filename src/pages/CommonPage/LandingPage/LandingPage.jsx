import React, { useState } from 'react';
import { Layout, Row, Col, Button, Form, Input, Select, Card, Rate, Space, Menu, Drawer, App, Avatar, Modal, InputNumber, message } from 'antd';
import {
    PhoneOutlined,
    MailOutlined,
    EnvironmentOutlined,
    FacebookOutlined,
    InstagramOutlined,
    LinkedinOutlined,
    TwitterOutlined,
    ArrowRightOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    SafetyOutlined,
    TeamOutlined,
    HomeOutlined,
    ShoppingOutlined,
    ShoppingCartOutlined,
    MenuOutlined,
    CloseOutlined,
    UserOutlined,
    TruckOutlined
} from '@ant-design/icons';
import './LandingPage.css';
import AppHeader from '../../../components/header/header';
import AppFooter from '../../../components/footer/footer';
import api from '../../../services/api'; // Dùng helper API call có sẵn
import AIAssistant from '../../../components/AIAssistant/AIAssistant';

const { Header, Content, Footer } = Layout;
const { TextArea } = Input;
const { Option } = Select;

const LandingPage = () => {
    const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

    const handleContactClick = () => {
        document.getElementById('contact-section').scrollIntoView({ behavior: 'smooth' });
    };

    const handleGetStarted = () => {
        document.getElementById('hero-form').scrollIntoView({ behavior: 'smooth' });
    };

    // States for Quick Estimate
    const [estimateModalVisible, setEstimateModalVisible] = useState(false);
    const [estimateLoading, setEstimateLoading] = useState(false);
    const [estimateData, setEstimateData] = useState(null);
    const [estDistance, setEstDistance] = useState(null);
    const [estVehicle, setEstVehicle] = useState('500KG');

    const handleQuickEstimate = async () => {
        if (!estDistance || estDistance <= 0) {
            message.warning("Vui lòng nhập khoảng cách (Km) hợp lệ!");
            return;
        }

        setEstimateLoading(true);
        try {
            const res = await api.post('/public/estimate-price', {
                distanceKm: Number(estDistance),
                vehicleType: estVehicle
            });

            if (res.data && res.data.success) {
                setEstimateData(res.data.data);
                setEstimateModalVisible(true);
            }
        } catch (err) {
            console.error(err);
            message.error("Lỗi hệ thống khi dự tính giá. Vui lòng thử lại sau!");
        } finally {
            setEstimateLoading(false);
        }
    };

    const menuItems = [
        { label: 'Trang Chủ', key: 'home', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
        { label: 'Dịch Vụ', key: 'services', onClick: () => document.getElementById('services-section').scrollIntoView({ behavior: 'smooth' }) },
        { label: 'Quy Trình', key: 'process', onClick: () => document.getElementById('process-section').scrollIntoView({ behavior: 'smooth' }) },
        { label: 'Đánh Giá', key: 'testimonials', onClick: () => document.getElementById('testimonials-section').scrollIntoView({ behavior: 'smooth' }) },
    ];

    const testimonialsData = [
        {
            id: 1,
            name: 'Nguyễn Văn A',
            text: 'Dịch vụ chuyên nhân, giá cả hợp lý. Đội ngũ rất tận tâm và chu đáo trong suốt quá trình chuyển.',
            rating: 5,
            service: 'Chuyển nhà trọn gói',
            avatar: 'https://xsgames.co/randomusers/avatar.php?g=male' // Ảnh mẫu
        },
        {
            id: 2,
            name: 'Trần Thị B',
            text: 'Nhanh chóng, an toàn và đúng giờ. Đồ đạc được vận chuyển không hề hư hỏng.',
            rating: 5,
            service: 'Chuyển văn phòng',
            avatar: 'https://xsgames.co/randomusers/avatar.php?g=male' // Ảnh mẫu
        },
        {
            id: 3,
            name: 'Phạm Minh C',
            text: 'Giá cả rất cạnh tranh, dịch vụ tuyệt vời. Tôi sẽ giới thiệu cho bạn bè và gia đình.',
            rating: 5,
            service: 'Chuyển đồ đạc',
            avatar: 'https://xsgames.co/randomusers/avatar.php?g=male' // Ảnh mẫu
        },
    ];

    const servicesData = [
        {
            id: 1,
            icon: <HomeOutlined />,
            title: 'Chuyển nhà trọn gói',
            description: 'Dịch vụ chuyển nhà toàn diện với đội ngũ chuyên nghiệp'
        },
        {
            id: 2,
            icon: <ShoppingOutlined />,
            title: 'Chuyển văn phòng',
            description: 'Chuyển văn phòng an toàn, nhanh chóng, không ảnh hưởng kinh doanh'
        },
        {
            id: 3,
            icon: <ShoppingCartOutlined />,
            title: 'Chuyển đồ đạc',
            description: 'Vận chuyển đồ đạc riêng lẻ với bảo hiểm toàn diện'
        },
        {
            id: 4,
            icon: <ShoppingOutlined />,
            title: 'Thuê xe tải',
            description: 'Dịch vụ thuê xe tải linh hoạt theo nhu cầu của bạn'
        },
    ];

    const whyChooseUsData = [
        {
            id: 1,
            icon: <SafetyOutlined />,
            title: 'Bảo hiểm đồ đạc',
            description: 'Toàn bộ hàng hoá được bảo hiểm 100%'
        },
        {
            id: 2,
            icon: <CheckCircleOutlined />,
            title: 'Giá đảm bảo',
            description: 'Giá cố định, không phí ẩn'
        },
        {
            id: 3,
            icon: <ClockCircleOutlined />,
            title: 'Đúng giờ',
            description: 'Cam kết hoàn thành đúng thời hạn'
        },
        {
            id: 4,
            icon: <TeamOutlined />,
            title: 'Đội ngũ chuyên nghiệp',
            description: 'Nhân viên được đào tạo chuyên sâu'
        },
    ];

    const processData = [
        {
            id: 1,
            number: '1',
            title: 'Tiếp nhận',
            description: 'Gọi hoặc đặt lịch trực tuyến'
        },
        {
            id: 2,
            number: '2',
            title: 'Khảo sát',
            description: 'Đánh giá khối lượng và khoảng cách'
        },
        {
            id: 3,
            number: '3',
            title: 'Nghiệm thu',
            description: 'Kiểm tra tài sản trước chuyển'
        },
        {
            id: 4,
            number: '4',
            title: 'Triển khai',
            description: 'Chuyển an toàn đến địa điểm mới'
        },
    ];

    return (
        <Layout className="landing-page">
            {/* Header */}
            <AppHeader className="landing-header" />

            <Content className="landing-content">
                {/* Modal Giá Mẫu */}
                <Modal
                    title="Báo Giá Ước Tính"
                    visible={estimateModalVisible}
                    onCancel={() => setEstimateModalVisible(false)}
                    footer={[
                        <Button key="close" type="primary" onClick={() => setEstimateModalVisible(false)} style={{ background: '#2D4F36' }}>
                            Đã hiểu
                        </Button>
                    ]}
                    centered
                >
                    {estimateData ? (
                        <div style={{ padding: '10px 0' }}>
                            <p><strong>Khoảng cách:</strong> {estimateData.distanceKm} Km</p>
                            <p><strong>Loại xe đề xuất:</strong> {estimateData.vehicleType}</p>
                            <hr style={{ margin: '15px 0', borderColor: '#eee', borderStyle: 'solid' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>Phí di chuyển:</span>
                                <span>{estimateData.breakdown?.distanceCost?.toLocaleString('vi-VN')} đ</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>Phí thuê xe:</span>
                                <span>{estimateData.breakdown?.vehicleCost?.toLocaleString('vi-VN')} đ</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>Cộng trước Thuế (Subtotal):</span>
                                <span>{estimateData.breakdown?.subtotal?.toLocaleString('vi-VN')} đ</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Thuế VAT (10%):</span>
                                <span>{estimateData.breakdown?.tax?.toLocaleString('vi-VN')} đ</span>
                            </div>
                            <hr style={{ margin: '15px 0', borderColor: '#eee', borderStyle: 'solid' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '16px' }}>Tổng Cộng Tham Khảo:</strong>
                                <strong style={{ fontSize: '20px', color: '#2D4F36' }}>{estimateData.estimatedTotal?.toLocaleString('vi-VN')} đ</strong>
                            </div>
                            <p style={{ marginTop: '20px', color: '#888', fontStyle: 'italic', fontSize: '13px' }}>* Lưu ý: Đây là mức giá ước tính dựa trên thuật toán tính khoảng cách vận chuyển. Mức giá thực tế sau khi khảo sát và đàm phán có thể thay đổi để tối ưu nhất cho quý khách.</p>
                        </div>
                    ) : (
                        <p>Không có dữ liệu báo giá...</p>
                    )}
                </Modal>

                {/* Hero Section */}
                <section id="hero-section" className="hero-section">
                    <div className="hero-overlay"></div>

                    <div className="container" style={{ position: 'relative', zIndex: 2, height: '100%' }}>
                        <Row align="middle" style={{ height: '100%' }}>
                            <Col xs={24} md={22} lg={22} className="hero-text">

                                <div className="hero-text-content">
                                    <h1 className="hero-title">HOMS</h1>
                                    <h2 className="hero-subtitle">
                                        Chuyển nhà tận tâm,<br />
                                        An tâm trọn vẹn.
                                    </h2>
                                    <p className="hero-description">
                                        Dịch vụ chuyển nhà chuyên nghiệp với đội ngũ tận tâm, giá cạnh tranh và bảo hiểm toàn diện.
                                    </p>
                                </div>

                                <div className="quick-quote-bar">
                                    {/* Form báo giá nhanh UI */}
                                    <Row gutter={[10, 10]} align="middle">

                                        <Col xs={24} sm={7}>
                                            <div className="input-group green-theme">
                                                <div className="label-row">
                                                    <EnvironmentOutlined className="label-icon" />
                                                    <span className="input-label">Khoảng cách (Km)</span>
                                                </div>
                                                <InputNumber
                                                    placeholder="VD: 5"
                                                    min={1}
                                                    style={{ width: '100%', height: '40px', borderRadius: '8px' }}
                                                    value={estDistance}
                                                    onChange={(val) => setEstDistance(val ? Number(val) : null)}
                                                    className="custom-input-field"
                                                />
                                            </div>
                                        </Col>

                                        <Col xs={0} sm={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <div className="arrow-wrapper">
                                                <ArrowRightOutlined />
                                            </div>
                                        </Col>

                                        <Col xs={24} sm={7}>
                                            <div className="input-group green-theme">
                                                <div className="label-row">
                                                    <TruckOutlined className="label-icon" />
                                                    <span className="input-label">Loại xe tải đề xuất</span>
                                                </div>
                                                <Select
                                                    value={estVehicle}
                                                    onChange={(val) => setEstVehicle(val)}
                                                    style={{ width: '100%', height: '40px' }}
                                                    className="custom-select-field"
                                                >
                                                    <Option value="500KG">Xe 500 KG</Option>
                                                    <Option value="1TON">Xe 1 Tấn</Option>
                                                    <Option value="1.5TON">Xe 1.5 Tấn</Option>
                                                    <Option value="2TON">Xe 2 Tấn</Option>
                                                </Select>
                                            </div>
                                        </Col>

                                        <Col xs={24} sm={8} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <Button
                                                type="primary"
                                                className="quote-btn-small"
                                                onClick={handleQuickEstimate}
                                                loading={estimateLoading}
                                                style={{ width: '100%', maxWidth: '200px' }}
                                            >
                                                Xem giá dự kiến
                                            </Button>
                                        </Col>
                                    </Row>
                                </div>
                                <p className="price-disclaimer">
                                    * Giá chỉ mang tính tham khảo, vui lòng liên hệ tư vấn!
                                </p>
                            </Col>
                        </Row>
                    </div>
                </section>

                {/* Services Section */}
                <section id="services-section" className="services-section">
                    <div className="section-container">
                        <div className="section-heading-group">
                            <span className="section-badge">Dịch Vụ</span>
                            <h2 className="section-title">Giải Pháp Chuyển Nhà Thông Minh</h2>
                            <div className="section-divider"></div>
                            <p className="section-subtitle">Đội ngũ chuyên nghiệp, giá cạnh tranh và bảo hiểm toàn diện cho mọi nhu cầu vận chuyển của bạn.</p>
                        </div>

                        <Row gutter={[24, 24]}>
                            {servicesData.map((service) => (
                                <Col key={service.id} xs={24} sm={12} md={12} lg={12}>
                                    <Card
                                        className="service-card"
                                        hoverable
                                        bodyStyle={{ padding: '32px 28px', textAlign: 'center' }}
                                    >
                                        <div className="service-icon-wrapper">
                                            {service.icon}
                                        </div>
                                        <h3>{service.title}</h3>
                                        <p>{service.description}</p>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                </section>

                {/* Why Choose Us Section */}
                <section className="why-choose-us-section">
                    <div className="section-container">
                        <div className="section-heading-group">
                            <span className="section-badge">Cam Kết</span>
                            <h2 className="section-title">Tại Sao Chọn Chúng Tôi?</h2>
                            <div className="section-divider"></div>
                        </div>

                        <Row gutter={[24, 24]}>
                            {whyChooseUsData.map((item) => (
                                <Col key={item.id} xs={24} sm={12} md={6}>
                                    <Card
                                        className="why-card"
                                        hoverable
                                        bodyStyle={{ padding: '32px 24px', textAlign: 'center' }}
                                    >
                                        <div className="why-icon-wrapper">
                                            {item.icon}
                                        </div>
                                        <h3>{item.title}</h3>
                                        <p>{item.description}</p>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                </section>

                {/* Process Section */}
                <section id="process-section" className="process-section">
                    <div className="section-container">
                        <div className="section-heading-group">
                            <span className="section-badge">Quy Trình</span>
                            <h2 className="section-title">Các Bước Vận Chuyển</h2>
                            <div className="section-divider"></div>
                        </div>

                        {/* Mảng màu nền cho 4 bước */}
                        <div className="process-steps-container">
                            {processData.map((step, index) => (
                                <div key={step.id} className="process-step-item">
                                    <div className="process-card-modern">
                                        <div className="process-icon-badge">
                                            {step.number}
                                        </div>
                                        <div className="process-text-content">
                                            <h3>{step.title}</h3>
                                            <p>{step.description}</p>
                                        </div>
                                    </div>
                                    {index < processData.length - 1 && <div className="process-connector"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Testimonials Section */}
                <section id="testimonials-section" className="testimonials-section">
                    <div className="section-container">
                        <div className="section-heading-group" style={{ marginBottom: '48px' }}>
                            <span className="section-badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}>Khách Hàng Nói Gì</span>
                            <h2 className="section-title section-title--white">Đánh Giá Từ Khách Hàng</h2>
                            <div className="section-divider" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.9))' }}></div>
                        </div>

                        <Row gutter={[24, 24]}>
                            {testimonialsData.map((testimonial) => (
                                <Col key={testimonial.id} xs={24} sm={12} md={8}>
                                    <Card
                                        className="testimonial-card"
                                        bodyStyle={{ padding: 0 }}
                                    >
                                        {/* Review content */}
                                        <div style={{ padding: '24px 24px 16px', marginBottom: '4px' }}>
                                            <div style={{ fontSize: '2.2rem', color: '#C0CFB2', lineHeight: 1, marginBottom: '8px', fontFamily: 'Georgia, serif' }}>“</div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <Rate disabled value={testimonial.rating} style={{ color: '#F7C948', fontSize: '14px' }} />
                                            </div>
                                            <p style={{ color: '#555', fontSize: '14px', fontStyle: 'italic', lineHeight: '1.65', minHeight: '60px', margin: 0 }}>
                                                {testimonial.text}
                                            </p>
                                        </div>

                                        {/* Gradient footer */}
                                        <div className="testimonial-footer">
                                            <Avatar
                                                size={48}
                                                src={testimonial.avatar}
                                                icon={<UserOutlined />}
                                                style={{ border: '2px solid rgba(255,255,255,0.8)', flexShrink: 0 }}
                                            />
                                            <div>
                                                <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>{testimonial.name}</p>
                                                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: 0 }}>{testimonial.service}</p>
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                </section>

                {/* Contact & Map Section */}
                <section id="contact-section" className="contact-section">
                    <div className="section-container">
                        {/* Wrapper tạo khung bo tròn chung */}
                        <div className="contact-box-wrapper">
                            <Row gutter={0} style={{ display: 'flex', flexWrap: 'wrap' }}>

                                {/* --- CỘT TRÁI (FORM): Sửa thành 12 (50%) --- */}
                                <Col xs={24} md={12} lg={12} className="contact-left">
                                    <div className="contact-form-content">
                                        {/* ... Nội dung Form giữ nguyên ... */}
                                        <h2 style={{ color: '#2D4F36', marginBottom: '10px', fontSize: '28px', fontWeight: 'bold' }}>
                                            Liên Hệ Với Chúng Tôi
                                        </h2>
                                        <p style={{ color: '#666', marginBottom: '30px' }}>
                                            Để lại thông tin để được tư vấn gói dịch vụ phù hợp nhất.
                                        </p>

                                        <Form layout="vertical" size="large">
                                            {/* ... Các trường Input giữ nguyên ... */}
                                            <Row gutter={20}>
                                                <Col xs={24} sm={12}>
                                                    <Form.Item label="Họ tên">
                                                        <Input placeholder="Nhập họ tên của bạn" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12}>
                                                    <Form.Item label="Số điện thoại">
                                                        <Input placeholder="Nhập số điện thoại" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>

                                            <Form.Item label="Email">
                                                <Input type="email" placeholder="Nhập email của bạn" />
                                            </Form.Item>

                                            <Form.Item label="Vì sao bạn tìm đến chúng tôi?">
                                                <Select placeholder="Chọn lý do...">
                                                    <Option value="google">Tìm thấy trên Google</Option>
                                                    <Option value="facebook">Biết qua Facebook/Tiktok</Option>
                                                    <Option value="friend">Được bạn bè giới thiệu</Option>
                                                    <Option value="ads">Thấy quảng cáo</Option>
                                                    <Option value="other">Khác</Option>
                                                </Select>
                                            </Form.Item>

                                            <Form.Item>
                                                <Button
                                                    type="primary"
                                                    block
                                                    style={{
                                                        background: '#2D4F36',
                                                        borderColor: '#2D4F36',
                                                        borderRadius: '8px',
                                                        height: '45px',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Gửi Thông Tin
                                                </Button>
                                            </Form.Item>
                                        </Form>

                                        {/* ... Phần thông tin công ty giữ nguyên ... */}
                                        <div className="company-contact-info">
                                            <h4 style={{ color: '#2D4F36', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                                Thông Tin Liên Hệ Trực Tiếp
                                            </h4>
                                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                                <div className="info-item">
                                                    <PhoneOutlined style={{ color: '#2D4F36', fontSize: '18px', marginRight: '10px' }} />
                                                    <span style={{ color: '#555', fontWeight: '500' }}>Hotline: 1900 8888</span>
                                                </div>
                                                <div className="info-item">
                                                    <MailOutlined style={{ color: '#2D4F36', fontSize: '18px', marginRight: '10px' }} />
                                                    <span style={{ color: '#555', fontWeight: '500' }}>Email: contact@homs.vn</span>
                                                </div>
                                                <div className="info-item">
                                                    <EnvironmentOutlined style={{ color: '#2D4F36', fontSize: '18px', marginRight: '10px' }} />
                                                    <span style={{ color: '#555', fontWeight: '500' }}>Văn phòng: FPT University, Đà Nẵng</span>
                                                </div>
                                            </Space>
                                        </div>
                                    </div>
                                </Col>

                                {/* --- CỘT PHẢI (MAP): Sửa thành 12 (50%) --- */}
                                <Col xs={24} md={12} lg={12} className="contact-right">
                                    <div className="map-container">
                                        <iframe
                                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3835.6!2d108.2598!3d15.9751!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31420edf9f123abc%3A0xabcdef1234567890!2sFPT%20University%20Da%20Nang!5e0!3m2!1svi!2s!4v1700000000001!5m2!1svi!2s"
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0 }}
                                            allowFullScreen=""
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                            title="FPT University Danang Map"
                                        ></iframe>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    </div>
                </section>
            </Content>

            <AppFooter className="landing-footer" />
            <AIAssistant />
        </Layout>
    );
};

export default React.memo(LandingPage);
