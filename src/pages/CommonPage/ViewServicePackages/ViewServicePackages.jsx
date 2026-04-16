import React from 'react';
import { Layout, Steps, Card, Row, Col, Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import houseIcon from '../../../assets/images/icons/moving-truck.png'
import officeIcon from '../../../assets/images/icons/company.png';
import boxIcon from '../../../assets/images/icons/delivery.png';
import truckIcon from '../../../assets/images/icons/lorry.png';

import AppHeader from '../../../components/header/header';
import AppFooter from '../../../components/footer/footer';
import './style.css';

const { Content } = Layout;

const services = [
    {
        id: 1,
        icon: houseIcon,
        title: 'Chuyển Nhà Trọn Gói',
        description:
            'Khảo sát, đóng gói, tháo lắp nội thất, vận chuyển và sắp xếp tại nơi ở mới. Giải pháp tiết kiệm thời gian, công sức và đảm bảo an toàn cho đồ đạc.',
    },
    // {
    //     id: 2,
    //     icon: officeIcon,
    //     title: 'Chuyển Văn Phòng - Công Ty',
    //     description:
    //         'Hỗ trợ di dời văn phòng, công ty nhanh chóng và chuyên nghiệp. Cam kết đúng tiến độ, hạn chế gián đoạn công việc, bảo quản hồ sơ, thiết bị và tài sản doanh nghiệp.',
    // },
    {
        id: 3,
        icon: boxIcon,
        title: 'Chuyển Đồ Đạc',
        description:
            'Nhận vận chuyển đồ lẻ, đồ cồng kềnh, nội thất, thiết bị gia dụng theo yêu cầu. Linh hoạt theo quãng đường và số lượng, phù hợp cho cá nhân và hộ gia đình.',
    },
    {
        id: 4,
        icon: truckIcon,
        title: 'Thuê Xe Tải',
        description:
            'Cung cấp xe tải đa dạng tải trọng kèm tài xế kinh nghiệm. Phù hợp cho tự chuyển nhà, chuyển hàng hoặc vận chuyển ngắn – dài hạn với chi phí hợp lý.',
    },
];

const SelectServicePage = () => {
    const navigate = useNavigate();

    const handleServiceClick = (serviceId) => {
        if (serviceId === 4) {
            navigate('/customer/create-truck-rental', { state: { serviceId } });
        } else {
            navigate('/customer/create-order', { state: { serviceId } });
        }
    };

    return (
        <Layout className="select-service-page">
            <AppHeader />

            <Content>
                {/* HERO */}
                <section className="service-hero">
                    <h1>Bạn muốn chuyển gì hôm nay?</h1>
                </section>

                {/* STEPS */}
                <section className="service-steps-container">
                    <Card className="steps-card">
                        <Steps
                            current={0}
                            responsive
                            items={[
                                { title: 'Chọn dịch vụ' },
                                { title: 'Địa điểm & Thông tin đồ đạc' },
                                { title: 'Xác nhận' },
                                { title: 'Thỏa thuận' },
                                { title: 'Thanh toán' },
                            ]}
                        />
                    </Card>
                </section>

                {/* SERVICE LIST */}
                <section className="service-list">
                    <Row gutter={[24, 24]}>
                        {services.map((item) => (
                            <Col span={24} key={item.id}>
                                <Card
                                    hoverable
                                    className="service-card"
                                    onClick={() => handleServiceClick(item.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="service-card-content">
                                        <div className="service-icon">
                                            <img src={item.icon} alt={item.title} />
                                        </div>

                                        <div className="service-info">
                                            <h3>{item.title}</h3>
                                            <p>{item.description}</p>
                                        </div>

                                        <Button
                                            type="text"
                                            className="service-action"
                                            icon={<RightOutlined />}
                                        />
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </section>
            </Content>

            <AppFooter />
        </Layout>
    );
};

export default React.memo(SelectServicePage);
