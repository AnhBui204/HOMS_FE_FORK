import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Spin, Space, Tooltip, Alert } from 'antd';
import { Lightbulb, TrendingUp, Calendar, RefreshCcw, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import adminAiService from '../../../services/adminAiService';

const { Title, Text } = Typography;

const AIPromotionAdvisor = () => {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [error, setError] = useState(null);

  const fetchAdvice = async () => {
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
  };

  useEffect(() => {
    fetchAdvice();
  }, []);

  return (
    <Card 
      className="ai-promotion-card"
      style={{ 
        borderRadius: '16px', 
        border: '1px solid #fff2e8',
        background: 'linear-gradient(135deg, #fff7e6 0%, #ffffff 100%)',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(250, 173, 20, 0.05)'
      }}
      title={
        <Space>
          <div style={{ 
            background: '#fa8c16', 
            borderRadius: '8px', 
            padding: '6px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Lightbulb color="white" size={18} />
          </div>
          <Title level={5} style={{ margin: 0, color: '#fa8c16' }}>Tư vấn Khuyến mãi Thông minh AI</Title>
        </Space>
      }
      extra={
        <Button 
          type="text" 
          icon={<RefreshCcw size={16} color="#fa8c16" />} 
          onClick={fetchAdvice} 
          loading={loading}
        />
      }
    >
      <div style={{ minHeight: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Spin tip="AI đang phân tích hiệu suất xe tải và nhu cầu đơn hàng..." />
          </div>
        ) : error ? (
          <Alert message={error} type="error" showIcon />
        ) : advice ? (
          <div className="ai-advice-content" style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <ReactMarkdown>
              {advice}
            </ReactMarkdown>
            
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '12px', 
              borderTop: '1px solid #ffd591',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Space size="large">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={14} color="#fa8c16" />
                  <Text type="secondary" style={{ fontSize: '12px' }}>Tăng hiệu suất 20%</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="#fa8c16" />
                  <Text type="secondary" style={{ fontSize: '12px' }}>Dựa trên dữ liệu 7 ngày</Text>
                </div>
              </Space>
              
              <Tooltip title="AI gợi ý dựa trên các ngày có lượng đơn hàng thấp để tối ưu chi phí vận hành.">
                <Info size={14} color="#d9d9d9" style={{ cursor: 'help' }} />
              </Tooltip>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Button onClick={fetchAdvice}>Nhận đề xuất khuyến mãi thông minh</Button>
          </div>
        )}
      </div>

      <style>{`
        .ai-advice-content b, .ai-advice-content strong { color: #d46b08; }
        .ai-advice-content ul { padding-left: 18px; margin-bottom: 8px; }
        .ai-advice-content li { margin-bottom: 4px; }
      `}</style>
    </Card>
  );
};

export default AIPromotionAdvisor;
