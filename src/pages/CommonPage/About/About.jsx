import React from "react";
import { Layout } from "antd";
import { FaTruckMoving, FaUsers, FaShieldAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";

import "./styling.css";

const { Content } = Layout;

const About = () => {
    const navigate = useNavigate();

    return (
        <Layout className="about-page">
            <AppHeader />

            <Content>

                {/* HERO */}
                <section className="about-hero">
                    <h1>Về Chúng Tôi</h1>
                </section>

                {/* INTRO */}
                <section className="about-intro">
                    <h2>HOMS Moving Service</h2>
                    <p>
                        HOMS là đơn vị cung cấp dịch vụ chuyển nhà chuyên nghiệp,
                        nhanh chóng và an toàn. Chúng tôi cam kết mang đến trải nghiệm
                        chuyển nhà thuận tiện, tiết kiệm và đáng tin cậy cho mọi khách hàng.
                    </p>
                </section>

                {/* VALUES */}
                <section className="about-values">
                    <div className="value-card">
                        <FaTruckMoving className="value-icon" />
                        <h3>Nhanh Chóng</h3>
                        <p>
                            Quy trình tối ưu giúp tiết kiệm thời gian và đảm bảo đúng tiến độ.
                        </p>
                    </div>

                    <div className="value-card">
                        <FaShieldAlt className="value-icon" />
                        <h3>An Toàn</h3>
                        <p>
                            Đội ngũ chuyên nghiệp đảm bảo tài sản của bạn được bảo vệ tối đa.
                        </p>
                    </div>

                    <div className="value-card">
                        <FaUsers className="value-icon" />
                        <h3>Tận Tâm</h3>
                        <p>
                            Luôn lắng nghe và hỗ trợ khách hàng trong suốt quá trình chuyển nhà.
                        </p>
                    </div>
                </section>

                {/* MISSION */}
                <section className="about-mission">
                    <h2>Sứ Mệnh Của Chúng Tôi</h2>
                    <p>
                        Chúng tôi hướng đến việc trở thành đơn vị dẫn đầu trong lĩnh vực
                        chuyển nhà thông minh tại Việt Nam, ứng dụng công nghệ để nâng cao
                        trải nghiệm khách hàng và tối ưu hóa quy trình vận hành.
                    </p>
                </section>

                {/* CTA */}
                <section className="about-cta">
                    <h2>Sẵn sàng chuyển nhà cùng HOMS?</h2>
                    <button className="about-btn" onClick={() => navigate('/customer/service-packages')}>
                        Chuyển Nhà Ngay
                    </button>
                </section>

            </Content>

            <AppFooter />
        </Layout>
    );
};

export default React.memo(About);
