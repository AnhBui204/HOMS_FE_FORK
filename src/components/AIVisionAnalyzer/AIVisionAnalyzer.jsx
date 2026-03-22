import React, { useState } from 'react';
import { Modal, Upload, Button, message, Typography, Spin, Badge, Row, Col, Space } from 'antd';
import { InboxOutlined, CheckCircleOutlined, SyncOutlined, RobotOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { analyzeMedia } from '../../services/ai/geminiVisionService';
import './AIVisionAnalyzer.css';

const AIVisionAnalyzer = ({ open, onCancel, onAnalyzeComplete }) => {
  const [fileList, setFileList] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleBeforeUpload = (file) => {
    // Check file type
    const isAccepted = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || file.type === 'video/mp4' || file.type === 'video/webm' || file.type === 'video/quicktime';
    
    if (!isAccepted) {
      message.error(`${file.name} không đúng định dạng hợp lệ!`);
      return Upload.LIST_IGNORE;
    }
    
    // Check file size (max 50MB limits for prompt)
    const isUnderLimit = file.size / 1024 / 1024 <= 50;
    if (!isUnderLimit) {
      message.error(`${file.name} quá lớn! (Tối đa 50MB)`);
      return Upload.LIST_IGNORE;
    }
    
    setFileList((prevList) => {
       const exists = prevList.some(f => f.uid === file.uid || f.name === file.name);
       if (!exists) return [...prevList, file];
       return prevList;
    });
    return false; // Prevent automatic upload behavior
  };

  const handleRemove = () => {
    setFileList([]);
    setResult(null);
  };

  const processFile = async () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn hình ảnh hoặc video trước!');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const rawResponse = await analyzeMedia(fileList);
      
      // Clean and parse the markdown JSON wrap often returned by Gemini
      const cleanData = rawResponse.replace(/\`\`\`json\n?|\`\`\`/g, '').trim();
      const parsedData = JSON.parse(cleanData);
      
      setResult(parsedData);
      message.success('AI đã phân tích xong cấu trúc đồ đạc!');
      
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi phân tích bằng AI: ' + (error.message || 'Lý do không xác định.'));
      setFileList([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyResults = () => {
    if (result) {
      onAnalyzeComplete(result);
      closeModal();
    }
  };

  const closeModal = () => {
    setFileList([]);
    setIsProcessing(false);
    setResult(null);
    onCancel();
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <RobotOutlined style={{ color: '#8ba888', fontSize: 24 }} />
          <span style={{ color: '#44624a' }}>HOMS AI Vision</span>
        </Space>
      }
      onCancel={closeModal}
      footer={null}
      width={700}
      centered
      className="ai-vision-modal"
      destroyOnClose
    >
      <div className="ai-vision-container">
        {/* State 1: Upload or Loading */}
        {!result && (
          <div className="upload-section">
            <Spin spinning={isProcessing} tip="AI đang bóc tách hình ảnh cực kỳ chi tiết..." size="large">
              <Upload.Dragger
                name="file"
                multiple={true}
                fileList={fileList}
                beforeUpload={handleBeforeUpload}
                onRemove={handleRemove}
                disabled={isProcessing}
                className="ai-dragger"
              >
                <div style={{ padding: '20px 0' }}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: '#8ba888' }} />
                  </p>
                  <Typography.Title level={4} style={{ color: '#44624a', marginTop: 16 }}>Nhấn hoặc kéo thả file vào đây</Typography.Title>
                  <Typography.Text type="secondary" style={{ color: '#8ebf95' }}>
                    Hệ thống AI sẽ quét toàn bộ phòng để bóc tách danh sách đồ đạc, trọng lượng và thể tích tự động.
                  </Typography.Text>
                  <p style={{ color: '#c0cfb2', marginTop: '10px', fontSize: '13px' }}>
                    Hỗ trợ: JPG, PNG, WEBP, MP4, MOV (Tối đa 50MB)
                  </p>
                </div>
              </Upload.Dragger>
            </Spin>

            {fileList.length > 0 && !isProcessing && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<SyncOutlined />} 
                  onClick={processFile}
                  className="analyze-btn"
                >
                  Bắt Đầu Phân Tích
                </Button>
              </div>
            )}
          </div>
        )}

        {/* State 2: Results Review */}
        {result && (
          <div className="result-section">
            <div className="result-header">
              <CheckCircleOutlined className="success-icon" />
              <Typography.Title level={4}>Hoàn tất nhận diện!</Typography.Title>
              <Typography.Text>Đã tìm thấy <strong style={{ color: '#44624a' }}>{result.totalActualItems || result.items?.length || 0}</strong> món đồ trong Media.</Typography.Text>
            </div>

            <Row gutter={16} className="metric-cards">
              <Col span={8}>
                <div className="metric-card">
                  <span className="metric-label">Tổng Khối Lượng</span>
                  <span className="metric-value">{result.totalActualWeight || 0}<small>kg</small></span>
                </div>
              </Col>
              <Col span={8}>
                <div className="metric-card">
                  <span className="metric-label">Tổng Thể Tích</span>
                  <span className="metric-value">{result.totalActualVolume || 0}<small>m³</small></span>
                </div>
              </Col>
              <Col span={8}>
                <div className="metric-card logistics-card">
                  <span className="metric-label">Đề Xuất Logistics</span>
                  <div className="badge-group">
                    <Badge count={result.suggestedVehicle} style={{ backgroundColor: '#44624a' }} />
                    <Badge count={`${result.suggestedStaffCount || 2} Người`} style={{ backgroundColor: '#8ba888' }} />
                  </div>
                </div>
              </Col>
            </Row>

            <div className="items-list-preview">
              <Typography.Text strong style={{ color: '#44624a', display: 'block', marginBottom: 10 }}>Chi tiết danh sách bóc tách:</Typography.Text>
              <ul className="extracted-list">
                {(result.items || []).map((item, idx) => (
                  <li key={idx} className="extracted-item">
                    <div className="item-main">
                      <span className="item-name">{item.name}</span>
                      <span className={`condition-badge ${item.condition?.toLowerCase()}`}>{item.condition}</span>
                    </div>
                    <div className="item-meta">
                      {item.actualWeight}kg | {item.actualVolume}m³ 
                      {item.actualDimensions && ` (${item.actualDimensions.length}x${item.actualDimensions.width}x${item.actualDimensions.height} cm)`}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="warning-note">
              <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
              <Typography.Text strong style={{ color: '#d48806' }}>Lưu ý dung sai AI:</Typography.Text>
              <Typography.Paragraph style={{ margin: 0, fontSize: '13px', color: '#8c8c8c' }}>
                Hệ thống AI đóng vai trò làm trợ lý bóc tách ban đầu. Số liệu trọng lượng/thể tích được ước tính qua phân tích độ sâu (depth-mapping). Điều phối viên có trách nhiệm kiểm tra, hiệu đính lại với khách hàng nếu phát hiện thiết sót trước khi LƯU phiếu khảo sát.
              </Typography.Paragraph>
            </div>

            <div className="action-footer">
              <Button onClick={() => setResult(null)}>
                Phân tích lại file khác
              </Button>
              <Button type="primary" className="apply-btn" onClick={applyResults} icon={<RobotOutlined />}>
                Áp Dụng Kết Quả Này
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AIVisionAnalyzer;
