import React, { useState } from 'react';
import { Button, Typography, Spin, Space, Alert, Modal } from 'antd';
import { Sparkles, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import adminAiService from '../../../services/adminAiService';

const { Title, Text } = Typography;

const AIPromotionAdvisor = () => {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = async () => {
    setIsModalOpen(true);
    if (!advice) {

      setLoading(true);
      setError(null);
      try {
        const resp = await adminAiService.getPromotionAdvice();
        if (resp.success) {
          setAdvice(resp.data);
        }
      } catch (err) {
        console.error('Failed to fetch AI promotion advice:', err);
        setError('Không thể lấy gợi ý khuyến mãi từ AI. Vui lòng thử lại sau.');
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
          background: 'linear-gradient(135deg, #fff9f0 0%, #ffffff 100%)',
          border: '1px solid #ffe9cc',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(250, 140, 22, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)', 
            borderRadius: '10px', 
            padding: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(250, 140, 22, 0.2)'
          }}>
            <Sparkles color="white" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>
              Tối đa hóa doanh thu thời gian trống
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Trí tuệ nhân tạo sẽ quét các lịch trình và hỗ trợ bạn tạo khuyến mãi hoàn hảo để kích cầu.
            </div>
          </div>
        </div>
        <Button 
          type="primary" 
          shape="round"
          size="large"
          style={{ background: '#fa8c16', borderColor: '#fa8c16', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
        >
          Nhận bí quyết AI <ArrowRight size={16} />
        </Button>
      </div>

      <Modal
        title={
          <Space>
            <Sparkles color="#fa8c16" size={18} />
            <Title level={5} style={{ margin: 0, color: '#fa8c16' }}>Chiến lược Khuyến mãi AI</Title>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={750}
        centered
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div style={{ minHeight: '100px', padding: '10px 0' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Admin only • Added for admin diagnostics</div>
          {loading ? (
             <div style={{ textAlign: 'center', padding: '60px 0' }}>
               <Spin tip="AI đang phân tích hiệu suất xe tải và nhu cầu đơn hàng của hệ thống..." size="large" />
             </div>
          ) : error ? (
             <Alert message={error} type="error" showIcon />
          ) : advice ? (
             <div className="ai-advice-content" style={{ fontSize: '15px', lineHeight: '1.8' }}>
               <ReactMarkdown>{advice}</ReactMarkdown>
               <div style={{
                 marginTop: '32px',
                 paddingTop: '16px',
                 borderTop: '1px solid #ffd591',
                 textAlign: 'center'
               }}>
                 <Text type="secondary" style={{ fontSize: '13px' }}>
                   *Lịch trình thời gian trống và gợi ý mức giá dựa trên thuật toán AI tự xây dựng.
                 </Text>
               </div>
             </div>
          ) : null}
        </div>
      </Modal>

      <style>{`
        .ai-advice-content b, .ai-advice-content strong { color: #d46b08; font-weight: 700; }
        .ai-advice-content h1, .ai-advice-content h2, .ai-advice-content h3 { color: #d46b08; margin-top: 20px; margin-bottom: 12px; }
        .ai-advice-content ul { padding-left: 20px; margin-bottom: 16px; }
        .ai-advice-content li { margin-bottom: 8px; }
      `}</style>
    </>
  );
};

export default AIPromotionAdvisor;
