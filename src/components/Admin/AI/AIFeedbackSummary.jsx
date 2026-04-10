import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Spin, Space, Tooltip, Alert, Tag } from 'antd';
import { BrainCircuit, MessageSquareText, ThumbsUp, ThumbsDown, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import adminAiService from '../../../services/adminAiService';

const { Title, Text } = Typography;

const AIFeedbackSummary = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await adminAiService.getFeedbackSummary();
      if (resp.success) {
        setSummary(resp.data);
      }
    } catch (err) {
      console.error('Failed to fetch AI feedback summary:', err);
      setError('Không thể phân tích phản hồi ngay lúc này. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <Card 
      className="ai-feedback-card"
      style={{ 
        borderRadius: '16px', 
        border: '1px solid #ffe8e8',
        background: 'linear-gradient(135deg, #fffafa 0%, #ffffff 100%)',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
      }}
      title={
        <Space>
          <div style={{ 
            background: '#ff4d4f', 
            borderRadius: '8px', 
            padding: '6px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <BrainCircuit color="white" size={18} />
          </div>
          <Title level={5} style={{ margin: 0, color: '#ff4d4f' }}>Phân tích Sắc thái Phản hồi AI</Title>
          <Tag color="error" style={{ borderRadius: '4px' }}>Beta</Tag>
        </Space>
      }
      extra={
        <Button 
          type="text" 
          icon={<RefreshCcw size={16} color="#ff4d4f" />} 
          onClick={fetchSummary} 
          loading={loading}
        />
      }
    >
      <div style={{ minHeight: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Spin tip="Đang lắng nghe tiếng nói khách hàng..." />
          </div>
        ) : error ? (
          <Alert message={error} type="error" showIcon />
        ) : summary ? (
          <div className="ai-feedback-content" style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <ReactMarkdown>
              {summary}
            </ReactMarkdown>
            
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '12px', 
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ThumbsUp size={14} color="#52c41a" />
                <Text type="secondary" style={{ fontSize: '12px' }}>Khen ngợi</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ThumbsDown size={14} color="#ff4d4f" />
                <Text type="secondary" style={{ fontSize: '12px' }}>Góp ý</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquareText size={14} color="#1890ff" />
                <Text type="secondary" style={{ fontSize: '12px' }}>Phân tích từ 50 review gần nhất</Text>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Button onClick={fetchSummary}>Phân tích đánh giá bằng AI</Button>
          </div>
        )}
      </div>

      <style>{`
        .ai-feedback-content b, .ai-feedback-content strong { color: #ff4d4f; }
        .ai-feedback-content ul { padding-left: 18px; margin-bottom: 8px; }
        .ai-feedback-content li { margin-bottom: 4px; }
      `}</style>
    </Card>
  );
};

export default AIFeedbackSummary;
