import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Spin, Space, Tooltip, Alert } from 'antd';
import { Sparkles, BarChart3, TrendingUp, RefreshCcw, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import adminAiService from '../../../services/adminAiService';

const { Title, Text } = Typography;

const AIBusinessSummary = () => {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);

  const fetchInsight = async () => {
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
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  return (
    <Card
      className="ai-insight-card"
      style={{
        borderRadius: '16px',
        border: '1px solid #e1e8e1',
        background: 'linear-gradient(135deg, #f0f7f0 0%, #ffffff 100%)',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(68, 98, 74, 0.05)'
      }}
      title={
        <Space>
          <div style={{
            background: '#44624A',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles color="white" size={18} />
          </div>
          <Title level={5} style={{ margin: 0, color: '#44624A' }}>Phân tích Quản trị AI</Title>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Tải lại phân tích mới nhất">
            <Button
              type="text"
              icon={<RefreshCcw size={16} color="#44624A" />}
              onClick={fetchInsight}
              loading={loading}
            />
          </Tooltip>
        </Space>
      }
    >
      <div style={{ minHeight: '120px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="Đang phân tích dữ liệu kinh doanh..." />
          </div>
        ) : error ? (
          <Alert message={error} type="error" showIcon />
        ) : insight ? (
          <div className="ai-insight-content" style={{ fontSize: '14px', lineHeight: '1.6', color: '#2c3e50' }}>
            <ReactMarkdown>
              {insight}
            </ReactMarkdown>

            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #edf2ed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Space size="large">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={16} color="#44624A" />
                  <Text type="secondary" style={{ fontSize: '12px' }}>Dữ liệu 30 ngày qua</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="#44624A" />
                  <Text type="secondary" style={{ fontSize: '12px' }}>Cập nhật theo thời gian thực</Text>
                </div>
              </Space>

              <Tooltip title="Bản tóm tắt này được tạo tự động bởi AI dựa trên doanh thu và đơn hàng thực tế của bạn.">
                <Info size={14} color="#bdc3c7" style={{ cursor: 'help' }} />
              </Tooltip>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Button onClick={fetchInsight}>Khởi tạo phân tích AI</Button>
          </div>
        )}
      </div>

      <style>{`
        .markdown-body b, .markdown-body strong { color: #44624A; font-weight: 700; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: #2d3e50; margin-top: 16px; margin-bottom: 8px; }
        .markdown-body ul { padding-left: 20px; }
        .markdown-body li { margin-bottom: 4px; }
      `}</style>
    </Card>
  );
};

export default AIBusinessSummary;
