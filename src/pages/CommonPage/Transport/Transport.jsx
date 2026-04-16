import React from 'react';
import { Row, Col, Card, Button, Space, Typography, Avatar, Tag } from 'antd';
import { CarOutlined, TeamOutlined, SettingOutlined, EnvironmentOutlined } from '@ant-design/icons';
import AppHeader from '../../../components/header/header';
import AppFooter from '../../../components/footer/footer';
import './Transport.css';

const { Title, Paragraph, Text } = Typography;

const fleet = [
  { id: 'van_15', name: 'Xe tải nhẹ 1.5T', desc: 'Linh hoạt cho chuyển nhà nhỏ và vận chuyển nhanh.', spec: '1.5 tấn • 2.8m x 1.6m x 1.7m' },
  { id: 'truck_35', name: 'Xe tải 3.5T', desc: 'Lựa chọn phổ biến cho căn hộ từ 2-3 phòng.', spec: '3.5 tấn • 4.2m x 2.0m x 2.0m' },
  { id: 'truck_7', name: 'Xe tải 7.5T', desc: 'Dùng cho nhà lớn, văn phòng và hàng số lượng lớn.', spec: '7.5 tấn • 6.0m x 2.3m x 2.4m' },
  { id: 'pickup', name: 'Xe pickup', desc: 'Gọn nhẹ, tối ưu cho giao hàng và đồ nhỏ.', spec: '0.7 tấn • 2.0m x 1.5m x 1.2m' },
];

const Hero = () => (
  <section className="transport-hero">
    <h1>Phương Tiện Vận Chuyển</h1>
  </section>
);

const VehicleCard = ({ v }) => (
  <Card hoverable className="vehicle-card">
    <div className="vehicle-top">
      <div className="vehicle-icon">
        <Avatar size={56} shape="square" style={{ background: '#fff', color: 'var(--primary)' }} icon={<CarOutlined style={{ fontSize: 24 }} />} />
      </div>

      <div className="vehicle-meta">
        <Title level={4} style={{ margin: 0 }}>{v.name}</Title>
        <div className="vehicle-spec">{v.spec}</div>
      </div>
    </div>

    <Paragraph className="vehicle-desc">{v.desc}</Paragraph>

    <div className="vehicle-actions">
      <div className="vehicle-badges">
        <Tag color="#44624A">An toàn</Tag>
        <Tag color="#44624A">Bảo trì định kỳ</Tag>
      </div>
    </div>
  </Card>
);

const Transport = () => {
  return (
    <div className="transport-page">
      <AppHeader />

      <Hero />
      
      <main className="transport-container">

        <section className="transport-intro">
          <h2>Đội xe hiện đại & đa dạng</h2>
          <p>
            Chúng tôi sở hữu đội xe hiện đại, đa dạng từ xe pickup, xe tải nhẹ tới xe tải lớn, phục vụ cho nhu cầu chuyển nhà, chuyển văn phòng
            và giao nhận hàng hóa. Mỗi phương tiện được bảo trì định kỳ và vận hành bởi đội ngũ lái xe chuyên nghiệp.
          </p>
        </section>

        <section className="transport-values">
            <div className="value-card">
              <CarOutlined className="value-icon" />
              <h3>Đa dạng phương tiện</h3>
              <p>Từ pickup đến tải lớn, đáp ứng mọi nhu cầu.</p>
            </div>
            <div className="value-card">
              <TeamOutlined className="value-icon" />
              <h3>Đội lái chuyên nghiệp</h3>
              <p>Được đào tạo bài bản & giàu kinh nghiệm vận hành.</p>
            </div>
            <div className="value-card">
              <SettingOutlined className="value-icon" />
              <h3>Bảo trì định kỳ</h3>
              <p>Đảm bảo an toàn tuyệt đối và hiệu suất vận hành cao.</p>
            </div>
        </section>

        <section className="transport-section info-section">
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card bordered={false} className="transport-panel">
                <Title level={4}>Đội xe của chúng tôi</Title>
                <Paragraph type="secondary">Từng loại xe được lựa chọn để đáp ứng các tiêu chí về an toàn, khả năng chuyên chở và hiệu quả vận hành.</Paragraph>
                <Row gutter={[16, 16]}>
                  {fleet.map(v => (
                    <Col key={v.id} xs={24} sm={12} md={12} lg={12}>
                      <VehicleCard v={v} />
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card bordered={false} className="transport-side-card">
                <Title level={5}>Về đội xe</Title>
                <Paragraph>Hệ thống quản lý đội xe hiện đại: theo dõi bảo trì, kiểm tra định kỳ, và cập nhật hồ sơ phương tiện.</Paragraph>
                <ul className="info-list">
                  <li><strong>Bảo trì:</strong> Lịch bảo trì hàng tháng cho từng phương tiện.</li>
                  <li><strong>An toàn:</strong> Trang bị dụng cụ cố định, chằng buộc và bọc lót tiêu chuẩn.</li>
                  <li><strong>Bảo hiểm:</strong> Mọi chuyến đi đều được bảo hiểm tùy theo gói dịch vụ.</li>
                </ul>
                <div style={{ marginTop: 16 }}>
                  <Button block type="primary">Liên hệ tư vấn</Button>
                </div>
              </Card>
            </Col>
          </Row>
        </section>

        <section className="transport-cta info-cta">
          <Card bordered={false} className="transport-cta-card">
            <Row align="middle">
              <Col span={18}>
                <Title level={3} style={{ margin: 0 }}>Cam kết chất lượng đội xe</Title>
                <Paragraph type="secondary">Chúng tôi cam kết vận hành phương tiện an toàn, đúng giờ và chuyên nghiệp cho từng khách hàng.</Paragraph>
              </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                <Button size="large" type="default" className="outline-primary">Tìm hiểu thêm</Button>
              </Col>
            </Row>
          </Card>
        </section>
      </main>
      <AppFooter />
    </div>
  );
};

export default Transport;
