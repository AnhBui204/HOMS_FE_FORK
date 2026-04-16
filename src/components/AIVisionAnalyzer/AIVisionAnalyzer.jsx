import React, { useState } from 'react';
import { Modal, Upload, Button, message, Typography, Spin, Row, Col, Space, Switch, Tag, Tooltip } from 'antd';
import { InboxOutlined, CheckCircleOutlined, SyncOutlined, RobotOutlined, WarningOutlined, SwapOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { analyzeMedia } from '../../services/ai/geminiVisionService';
import { buildPreviewItems } from '../../services/ai/catalogMappingService';
import './AIVisionAnalyzer.css';

const VEHICLE_LABELS = {
  '500KG': 'Xe 500 KG',
  '1TON': 'Xe 1 Tấn',
  '1.5TON': 'Xe 1.5 Tấn',
  '2TON': 'Xe 2 Tấn',
};

// ─── Vietnamese translation dictionaries ─────────────────────────────────────
const CONDITION_VI = {
  GOOD: 'Tốt',
  FRAGILE: 'Dễ vỡ',
  DAMAGED: 'Hư hỏng',
  USED: 'Đã dùng',
  NEW: 'Mới',
  FAIR: 'Bình thường',
  POOR: 'Kém',
  good: 'Tốt',
  fragile: 'Dễ vỡ',
  damaged: 'Hư hỏng',
  used: 'Đã dùng',
  new: 'Mới',
  fair: 'Bình thường',
  poor: 'Kém',
};

// Common furniture / item name translations (English keywords → Vietnamese)
const ITEM_NAME_DICT = [
  // Bedroom
  [/\bsingle bed\b/i, 'Giường nhỏ (1m)'],
  [/\bdouble bed\b/i, 'Giường đôi'],
  [/\bqueen(?: bed| size)?\b/i, 'Giường queen'],
  [/\bking(?: bed| size)?\b/i, 'Giường king'],
  [/\bbed frame\b/i, 'Khung giường'],
  [/\bbed\b/i, 'Giường'],
  [/\bwardrobe\b/i, 'Tủ quần áo'],
  [/\bcloset\b/i, 'Tủ quần áo'],
  [/\bdresser\b/i, 'Bàn phấn'],
  [/\bnightstand\b/i, 'Tủ đầu giường'],
  [/\bbedside table\b/i, 'Bàn đầu giường'],
  [/\bmattress\b/i, 'Đệm'],
  // Living room
  [/\bl\-shaped sofa\b/i, 'Sofa góc L'],
  [/\bsofa\b/i, 'Sofa'],
  [/\bcouch\b/i, 'Sofa'],
  [/\barmchair\b/i, 'Ghế bắnh'],
  [/\bcoffee table\b/i, 'Bàn trà'],
  [/\btv stand\b/i, 'Kệ TV'],
  [/\btv cabinet\b/i, 'Tủ TV'],
  [/\btelevision\b/i, 'Tívi'],
  [/\bTV\b/, 'Tívi'],
  [/\bbookshelf\b/i, 'Kệ sách'],
  [/\bbookcase\b/i, 'Tủ sách'],
  // Kitchen & dining
  [/\bdining table\b/i, 'Bàn ăn'],
  [/\bdining chair\b/i, 'Ghế ăn'],
  [/\bchair\b/i, 'Ghế'],
  [/\brefrigerator\b/i, 'Tủ lạnh'],
  [/\bfridge\b/i, 'Tủ lạnh'],
  [/\bwashing machine\b/i, 'Máy giặt'],
  [/\bdishwasher\b/i, 'Máy rửa bát'],
  [/\bmicrowave\b/i, 'Lò vi sóng'],
  [/\boven\b/i, 'Lò nướng'],
  // Office
  [/\bdesk\b/i, 'Bàn làm việc'],
  [/\boffice chair\b/i, 'Ghế văn phòng'],
  [/\bcomputer\b/i, 'Máy tính'],
  [/\blaptop\b/i, 'Laptop'],
  [/\bmonitor\b/i, 'Màn hình máy tính'],
  [/\bprinter\b/i, 'Máy in'],
  // Appliances
  [/\bair conditioner\b/i, 'Điều hòa'],
  [/\bAC unit\b/i, 'Điều hòa'],
  [/\bfan\b/i, 'Quạt điện'],
  [/\bwater heater\b/i, 'Nóng lạnh'],
  // Other
  [/\bbicycle\b/i, 'Xe đạp'],
  [/\bmotorcycle\b/i, 'Xe máy'],
  [/\bpiano\b/i, 'Đàn piano'],
  [/\bguitar\b/i, 'Đàn guitar'],
  [/\bplant\b/i, 'Cây cảnh'],
  [/\bmirror\b/i, 'Gương'],
  [/\bcarpet\b/i, 'Thảm'],
  [/\brug\b/i, 'Thảm'],
  [/\bcurtain\b/i, 'Rèm cửa'],
  [/\bbox\b/i, 'Thùng hàng'],
];

/** Try to translate an English item name to Vietnamese. Falls back to original if no match. */
const translateItemName = (name = '') => {
  if (!name) return name;
  // If the name already contains Vietnamese characters, return as-is
  if (/[\u00C0-\u024F\u1E00-\u1EFF]/.test(name)) return name;
  for (const [pattern, vi] of ITEM_NAME_DICT) {
    if (pattern.test(name)) return vi;
  }
  return name; // keep original if no rule matches
};

/** Translate condition code to Vietnamese label */
const translateCondition = (cond = '') => CONDITION_VI[cond] || CONDITION_VI[cond?.toLowerCase()] || cond;

const AIVisionAnalyzer = ({ open, onCancel, onAnalyzeComplete, currentVehicle, currentStaffCount, primaryCatalog = [] }) => {
  const [fileList, setFileList] = useState([]);
  const [thumbUrls, setThumbUrls] = useState([]);     // object URLs for image thumbnails
  const [activeImageFilter, setActiveImageFilter] = useState(null); // null = show all
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  // Override toggles: false = keep current (BE default), true = use AI suggestion
  const [overrideVehicle, setOverrideVehicle] = useState(false);
  const [overrideStaff, setOverrideStaff] = useState(false);

  const handleBeforeUpload = (file) => {
    const isAccepted = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || file.type === 'video/mp4' || file.type === 'video/webm' || file.type === 'video/quicktime';

    if (!isAccepted) {
      message.error(`${file.name} không đúng định dạng hợp lệ!`);
      return Upload.LIST_IGNORE;
    }

    const isUnderLimit = file.size / 1024 / 1024 <= 50;
    if (!isUnderLimit) {
      message.error(`${file.name} quá lớn! (Tối đa 50MB)`);
      return Upload.LIST_IGNORE;
    }

    // Update file list (dedup by uid or name)
    setFileList((prevList) => {
      if (prevList.some(f => f.uid === file.uid || f.name === file.name)) return prevList;
      return [...prevList, file];
    });

    // Update thumbUrls OUTSIDE the fileList updater —
    // React Strict Mode calls updater fns twice to detect side effects,
    // so setThumbUrls / URL.createObjectURL must NOT be inside a setter.
    setThumbUrls((prev) => {
      if (prev.some(t => t.uid === file.uid)) return prev; // already added
      const url = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      return [...prev, { uid: file.uid, url }];
    });

    return false;
  };


  const handleRemove = () => {
    // Revoke object URLs to avoid memory leaks
    thumbUrls.forEach(t => { if (t.url) URL.revokeObjectURL(t.url); });
    setFileList([]);
    setThumbUrls([]);
    setActiveImageFilter(null);
    setResult(null);
  };


  const processFile = async () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn hình ảnh hoặc video trước!');
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setActiveImageFilter(null);
    setOverrideVehicle(false);
    setOverrideStaff(false);


    try {
      const rawResponse = await analyzeMedia(fileList);

      // ── Robust JSON sanitizer ────────────────────────────────────────────────
      // With responseMimeType: 'application/json' the model should return clean
      // JSON, but we still sanitize defensively for older/fallback responses.
      const sanitizeJSON = (raw) => {
        // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
        let s = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

        // 2. Extract the first complete JSON object from the string
        const firstBrace = s.indexOf('{');
        const lastBrace = s.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          s = s.slice(firstBrace, lastBrace + 1);
        }

        // 3. Remove single-line JavaScript comments ( // ... )
        s = s.replace(/\/\/[^\n]*/g, '');

        // 4. Remove multi-line comments ( /* ... */ )
        s = s.replace(/\/\*[\s\S]*?\*\//g, '');

        // 5. Remove trailing commas before } or ]
        s = s.replace(/,\s*([}\]])/g, '$1');

        // 6. Strip BOM or other non-printable leading characters
        s = s.replace(/^\uFEFF/, '');

        return s;
      };

      const cleanData = sanitizeJSON(rawResponse);

      let parsedData;
      try {
        parsedData = JSON.parse(cleanData);
      } catch (parseErr) {
        console.error('[AI] Raw response causing parse error:', rawResponse);
        console.error('[AI] After sanitization:', cleanData);
        throw new Error(`Phản hồi AI không đúng định dạng JSON. Chi tiết: ${parseErr.message}`);
      }

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
      // Build a lightweight, image-indexed list of thumbnails we can pass
      // back to the survey screen so it can later highlight item locations.
      const images = fileList
        .map((file, index) => {
          if (!file.type.startsWith('image/')) return null;
          const thumb = thumbUrls.find(t => t.uid === file.uid);
          return thumb?.url
            ? { index, name: file.name, url: thumb.url }
            : null;
        })
        .filter(Boolean);

      // Translate item names to Vietnamese before passing back to the survey form
      const translatedResult = {
        ...result,
        items: (result.items || []).map(item => ({
          ...item,
          name: translateItemName(item.name),
          condition: item.condition || 'GOOD',
        })),
        _applyVehicle: overrideVehicle,
        _applyStaff: overrideStaff,
        _images: images,
      };
      onAnalyzeComplete(translatedResult);
      closeModal();
    }
  };

  const closeModal = () => {
    setFileList([]);
    setIsProcessing(false);
    setResult(null);
    setOverrideVehicle(false);
    setOverrideStaff(false);
    onCancel();
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <RobotOutlined style={{ color: '#8ba888', fontSize: 24 }} />
          <span style={{ color: '#44624a' }}>Thị giác Máy tính AI HOMS</span>
        </Space>
      }
      onCancel={closeModal}
      footer={null}
      width={960}
      centered
      className="ai-vision-modal"
      destroyOnClose
    >
      <div className="ai-vision-container">
        {/* State 1: Upload or Loading */}
        {!result && (
          <div className="upload-section">
            <Spin spinning={isProcessing} tip="AI đang phân tích ..." size="large">
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
              <Col span={12}>
                <div className="metric-card">
                  <span className="metric-label">Tổng Khối Lượng (AI)</span>
                  <span className="metric-value">{result.totalActualWeight || 0}<small>kg</small></span>
                </div>
              </Col>
              <Col span={12}>
                <div className="metric-card">
                  <span className="metric-label">Tổng Thể Tích (AI)</span>
                  <span className="metric-value">{result.totalActualVolume || 0}<small>m³</small></span>
                </div>
              </Col>
            </Row>

            {/* Logistics comparison panel */}
            <div className="logistics-compare-panel">
              <div className="logistics-compare-header">
                <SwapOutlined style={{ color: '#faad14', marginRight: 6 }} />
                <Typography.Text strong style={{ color: '#8c5e00' }}>Gợi ý Logistics từ AI — Kiểm tra trước khi áp dụng</Typography.Text>
                <Tooltip title="AI ước tính dựa trên hình ảnh, có thể sai sót. Giá trị hiện tại do hệ thống tính theo khảo sát thực tế. Chỉ override khi bạn chắc chắn.">
                  <InfoCircleOutlined style={{ color: '#8c8c8c', marginLeft: 6, cursor: 'pointer' }} />
                </Tooltip>
              </div>

              {/* Vehicle row */}
              <div className="logistics-compare-row">
                <div className="compare-field-label">Loại xe</div>
                <div className="compare-values">
                  <Tag color="green" className="compare-tag current-tag">
                    ✅ Hiện tại: {VEHICLE_LABELS[currentVehicle] || currentVehicle || 'Chưa chọn'}
                  </Tag>
                  <SwapOutlined style={{ color: '#d9d9d9', margin: '0 8px' }} />
                  <Tag color={overrideVehicle ? 'orange' : 'default'} className="compare-tag ai-tag">
                    🤖 AI: {VEHICLE_LABELS[result.suggestedVehicle] || result.suggestedVehicle || 'Không rõ'}
                  </Tag>
                </div>
                <div className="compare-override">
                  <Switch
                    size="small"
                    checked={overrideVehicle}
                    onChange={setOverrideVehicle}
                    disabled={!result.suggestedVehicle || result.suggestedVehicle === currentVehicle}
                    checkedChildren="Dùng AI"
                    unCheckedChildren="Giữ nguyên"
                  />
                </div>
              </div>

              {/* Staff row */}
              <div className="logistics-compare-row">
                <div className="compare-field-label">Nhân viên</div>
                <div className="compare-values">
                  <Tag color="green" className="compare-tag current-tag">
                    ✅ Hiện tại: {currentStaffCount != null ? `${currentStaffCount} người` : 'Chưa xác định'}
                  </Tag>
                  <SwapOutlined style={{ color: '#d9d9d9', margin: '0 8px' }} />
                  <Tag color={overrideStaff ? 'orange' : 'default'} className="compare-tag ai-tag">
                    🤖 AI: {result.suggestedStaffCount != null ? `${result.suggestedStaffCount} người` : 'Không rõ'}
                  </Tag>
                </div>
                <div className="compare-override">
                  <Switch
                    size="small"
                    checked={overrideStaff}
                    onChange={setOverrideStaff}
                    disabled={result.suggestedStaffCount == null || result.suggestedStaffCount === currentStaffCount}
                    checkedChildren="Dùng AI"
                    unCheckedChildren="Giữ nguyên"
                  />
                </div>
              </div>
            </div>

            <div className="items-list-preview">
              <div className="items-pane-header">
                <Typography.Text strong style={{ color: '#44624a' }}>Chi tiết danh sách đồ đạc</Typography.Text>
                {fileList.length > 1 && (
                  <span className="image-filter-hint">
                    Click ảnh để lọc / highlight đồ đạc
                  </span>
                )}
              </div>

              <div className={`items-dual-pane ${fileList.length > 1 ? 'has-image-strip' : ''}`}>

                {/* ── LEFT: image thumbnail strip (only when multiple images) ─ */}
                {fileList.length > 1 && (
                  <div className="image-strip">
                    <button
                      className={`image-thumb-btn ${activeImageFilter === null ? 'active' : ''}`}
                      onClick={() => setActiveImageFilter(null)}
                    >
                      <span className="thumb-label">🔍 Tất cả</span>
                    </button>
                    {thumbUrls.map((t, i) => (
                      <button
                        key={t.uid}
                        className={`image-thumb-btn ${activeImageFilter === i ? 'active' : ''}`}
                        onClick={() => setActiveImageFilter(activeImageFilter === i ? null : i)}
                        title={`Ảnh ${i + 1}`}
                      >
                        {t.url
                          ? <img src={t.url} alt={`Ảnh ${i + 1}`} className="thumb-img" />
                          : <span className="thumb-video-icon">🎬</span>
                        }
                        <span className="thumb-label">Ảnh {i + 1}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── RIGHT: global item list with highlight/fade ────────────── */}
                <ul className="extracted-list">
                  {buildPreviewItems(result.items || [], primaryCatalog).map((item, idx) => {
                    const indices = Array.isArray(item.imageIndices) ? item.imageIndices : [];
                    const isHighlighted = activeImageFilter === null || indices.includes(activeImageFilter);
                    const appearsInCount = indices.length;

                    return (
                      <li
                        key={idx}
                        className={`extracted-item ${isHighlighted ? '' : 'item-faded'}`}
                      >
                        <div className="item-main">
                          <span className="item-name">{translateItemName(item.name)}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            {/* Image source badges */}
                            {fileList.length > 1 && appearsInCount > 0 && indices.map(i => (
                              <span key={i} className="item-img-badge">Ảnh {i + 1}</span>
                            ))}
                            {fileList.length > 1 && appearsInCount > 1 && (
                              <span className="item-multi-badge">{appearsInCount} ảnh</span>
                            )}
                            <span className={`condition-badge ${(item.condition || 'good').toLowerCase()}`}>
                              {translateCondition(item.condition)}
                            </span>
                          </div>
                        </div>
                        {item._match ? (
                          /* Primary catalog match */
                          <div className="item-meta item-meta--mapped">
                            <span className="item-meta-arrow">→</span>
                            <span className="item-catalog-tag">
                              {item._match.catalogName} &middot; {item._match.preset.label}
                            </span>
                            <span className={`item-confidence ${item._match.confidence >= 0.6 ? 'high' : 'low'}`}>
                              {Math.round(item._match.confidence * 100)}% phù hợp
                              {item._match.confidence < 0.6 && ' ⚠️'}
                            </span>
                          </div>
                        ) : item._secondaryLabel ? (
                          /* Secondary catalog match */
                          <div className="item-meta item-meta--mapped">
                            <span className="item-meta-arrow">→</span>
                            <span className="item-catalog-tag item-catalog-tag--secondary">
                              {item._secondaryLabel}
                            </span>
                            <span className="item-confidence high">đồ phụ</span>
                          </div>
                        ) : (
                          /* No match — show raw data */
                          <div className="item-meta">
                            {item.actualWeight}kg | {item.actualVolume}m³
                            {item.actualDimensions && ` (${item.actualDimensions.length}×${item.actualDimensions.width}×${item.actualDimensions.height} cm)`}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
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
