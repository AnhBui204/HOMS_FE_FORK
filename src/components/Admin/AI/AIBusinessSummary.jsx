import React, { useState } from 'react';
import { Button, Typography, Spin, Space, Alert, Modal } from 'antd';
import { Sparkles, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import adminAiService from '../../../services/adminAiService';

const { Title, Text } = Typography;

const AIBusinessSummary = () => {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = async () => {
    setIsModalOpen(true);
    if (!insight) {

      setLoading(true);
      setError(null);
      try {
        const resp = await adminAiService.getBusinessInsight();
        if (resp.success) {
          setInsight(resp.data);
        }
      } catch (err) {
        console.error('Failed to fetch AI insight:', err);
        setError('Không thể kết nối với trí tuệ nhân tạo. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <div
        onClick={handleOpen}
        style={{
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #f6fffa 0%, #ffffff 100%)',
          border: '1px solid #e1eee7',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(68, 98, 74, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #44624A 0%, #2c3e30 100%)',
            borderRadius: '10px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(68, 98, 74, 0.2)'
          }}>
            <Sparkles color="white" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>
              Quản trị không giới hạn chuyên sâu
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Trí tuệ nhân tạo sẽ tự động phân tích và đề xuất chiến lược tối ưu lợi nhuận cho bạn.
            </div>
          </div>
        </div>
        <Button
          type="primary"
          shape="round"
          size="large"
          style={{ background: '#44624A', borderColor: '#44624A', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
        >
          Khám phá ngay <ArrowRight size={16} />
        </Button>
      </div>

      <Modal
        title={
          <Space>
            <Sparkles color="#44624A" size={18} />
            <Title level={5} style={{ margin: 0, color: '#44624A' }}>Tư vấn Chiến lược AI</Title>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={750}
        centered
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div style={{ minHeight: '120px', padding: '10px 0' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Admin only • Quick audit note</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin tip="AI đang xử lý hàng triệu điểm dữ liệu kinh doanh của bạn..." size="large" />
            </div>
          ) : error ? (
            <Alert message={error} type="error" showIcon />
          ) : insight ? (
            <div className="ai-insight-content" style={{ fontSize: '15px', lineHeight: '1.8', color: '#2c3e50' }}>
              <ReactMarkdown>{insight}</ReactMarkdown>
              <div style={{
                marginTop: '32px',
                paddingTop: '16px',
                borderTop: '1px solid #edf2ed',
                textAlign: 'center'
              }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  *Báo cáo được biên soạn tự động phân tích lượng dữ liệu khổng lồ trong 30 ngày qua bằng Trí tuệ nhân tạo.
                </Text>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <style>{`
        .ai-insight-content b, .ai-insight-content strong { color: #44624A; font-weight: 700; }
        .ai-insight-content h1, .ai-insight-content h2, .ai-insight-content h3 { color: #44624A; margin-top: 20px; margin-bottom: 12px; }
        .ai-insight-content ul { padding-left: 20px; margin-bottom: 16px; }
        .ai-insight-content li { margin-bottom: 8px; }
      `}</style>
    </>
  );
};

export default AIBusinessSummary;
