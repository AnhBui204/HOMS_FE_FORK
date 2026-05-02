import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Layout, Steps, Card, Row, Col, Button,
    Upload, message, Checkbox, Alert, Typography,
    InputNumber, Select, Form, Input, Tag, Divider, Spin, Space, Tooltip
} from "antd";
import {
    InboxOutlined, DeleteOutlined, PlusOutlined,
    RobotOutlined, WarningOutlined, CheckCircleOutlined,
    EditOutlined, ReloadOutlined, ArrowLeftOutlined
} from "@ant-design/icons";

import { FaBed, FaTv, FaMotorcycle, FaBoxOpen, FaBook, FaGuitar, FaTshirt, FaWineGlass } from 'react-icons/fa';
import { GiWashingMachine, GiMirrorMirror, GiCookingPot, GiSofa, GiClosedDoors, GiHandheldFan, GiStrongbox } from 'react-icons/gi';
import {
    MdComputer, MdAir, MdLocalFlorist, MdCurtains, MdToys, MdOutdoorGrill, MdSoap,
    MdOutlineTableRestaurant, MdBookmarks, MdOutlineDiamond, MdLightbulbOutline, MdAccessTime
} from 'react-icons/md';
import { TbFridge, TbShoe } from 'react-icons/tb';
import { PiScrollDuotone } from 'react-icons/pi';

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import { useSelector } from "react-redux";
import { analyzeMedia } from "../../../services/ai/geminiVisionService";
import { createOrder } from "../../../services/orderService";
import { normalizeAIItems } from '../../../services/ai/catalogMappingService';
import { uploadSurveyMedia } from "../../../services/uploadService";

import "./style.css";

const { Content } = Layout;
const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

// ─── Icon wrapper ─────────────────────────────────────────────────────────────
const CatIcon = ({ icon: Icon, color = '#44624A', size = 22 }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size + 12, height: size + 12, borderRadius: '50%',
        background: color + '22', flexShrink: 0,
    }}>
        <Icon size={size} color={color} />
    </span>
);

// ─── Catalogs ─────────────────────────────────────────────────────────────────
const PRIMARY_CATALOG = [
    { name: 'Giường', IconComp: FaBed, color: '#7c3aed', presets: [{ label: '1m', volume: 0.35, weight: 25 }, { label: '1.2m', volume: 0.45, weight: 30 }, { label: '1.6m', volume: 0.6, weight: 40 }, { label: '1.8m', volume: 0.7, weight: 50 }, { label: '2m', volume: 0.8, weight: 60 }] },
    { name: 'Tủ quần áo', IconComp: GiClosedDoors, color: '#b45309', presets: [{ label: '2 cánh', volume: 0.9, weight: 60 }, { label: '3 cánh', volume: 1.3, weight: 90 }, { label: '4 cánh', volume: 1.8, weight: 120 }] },
    { name: 'Sofa', IconComp: GiSofa, color: '#0369a1', presets: [{ label: '1 chỗ', volume: 0.4, weight: 25 }, { label: '2 chỗ', volume: 0.8, weight: 50 }, { label: 'Góc L', volume: 1.5, weight: 90 }, { label: 'Bộ 3+1+1', volume: 2.0, weight: 110 }] },
    { name: 'Tủ lạnh', IconComp: TbFridge, color: '#0891b2', presets: [{ label: '100–150L', volume: 0.3, weight: 40 }, { label: '150–250L', volume: 0.45, weight: 55 }, { label: '250–400L', volume: 0.65, weight: 70 }, { label: 'Side-by-side', volume: 1.0, weight: 100 }] },
    { name: 'Máy giặt', IconComp: GiWashingMachine, color: '#0284c7', presets: [{ label: '6–8kg', volume: 0.2, weight: 50 }, { label: '8–10kg', volume: 0.25, weight: 60 }, { label: 'Cửa trên', volume: 0.18, weight: 35 }] },
    { name: 'Tivi', IconComp: FaTv, color: '#1d4ed8', presets: [{ label: '32 inch', volume: 0.12, weight: 6 }, { label: '43 inch', volume: 0.18, weight: 9 }, { label: '55 inch', volume: 0.28, weight: 14 }, { label: '65 inch', volume: 0.38, weight: 20 }, { label: '75+ inch', volume: 0.5, weight: 28 }] },
    { name: 'Bàn ăn / làm việc', IconComp: MdOutlineTableRestaurant, color: '#92400e', presets: [{ label: 'Nhỏ (4 ghế)', volume: 0.6, weight: 30 }, { label: 'Lớn (6–8 ghế)', volume: 1.1, weight: 55 }] },
    { name: 'Kệ sách / tủ hồ sơ', IconComp: MdBookmarks, color: '#065f46', presets: [{ label: 'Nhỏ', volume: 0.3, weight: 15 }, { label: 'Trung', volume: 0.6, weight: 30 }, { label: 'Lớn', volume: 1.0, weight: 50 }] },
    { name: 'Máy tính để bàn', IconComp: MdComputer, color: '#374151', presets: [{ label: 'Bộ (CPU + màn hình)', volume: 0.3, weight: 20 }] },
    { name: 'Điều hòa', IconComp: MdAir, color: '#0369a1', presets: [{ label: '1 HP', volume: 0.25, weight: 30 }, { label: '1.5 HP', volume: 0.35, weight: 38 }, { label: '2 HP', volume: 0.45, weight: 50 }] },
    { name: 'Xe máy', IconComp: FaMotorcycle, color: '#b91c1c', presets: [{ label: 'Xe số / tay ga', volume: 0.8, weight: 100 }] },
];

const SECONDARY_CATALOG = [
    { key: 'bowl', IconComp: GiCookingPot, color: '#d97706', label: 'Chén bát / Ly tách' },
    { key: 'lamp', IconComp: MdLightbulbOutline, color: '#ca8a04', label: 'Đèn bàn / đèn ngủ' },
    { key: 'clock', IconComp: MdAccessTime, color: '#0369a1', label: 'Đồng hồ' },
    { key: 'plant', IconComp: MdLocalFlorist, color: '#16a34a', label: 'Cây cảnh / chậu hoa' },
    { key: 'fan', IconComp: GiHandheldFan, color: '#0891b2', label: 'Quạt điện' },
    { key: 'book', IconComp: FaBook, color: '#7c3aed', label: 'Sách vở / tài liệu' },
    { key: 'mirror', IconComp: GiMirrorMirror, color: '#6b7280', label: 'Gương / Tranh ảnh' },
    { key: 'curtain', IconComp: MdCurtains, color: '#9d174d', label: 'Rèm cửa' },
    { key: 'toy', IconComp: MdToys, color: '#f59e0b', label: 'Đồ chơi trẻ em' },
    { key: 'shoes', IconComp: TbShoe, color: '#78350f', label: 'Giày dép / hộp' },
    { key: 'clothes', IconComp: FaTshirt, color: '#4f46e5', label: 'Quần áo' },
    { key: 'kitchen', IconComp: MdOutdoorGrill, color: '#dc2626', label: 'Dụng cụ bếp' },
    { key: 'toiletry', IconComp: MdSoap, color: '#0ea5e9', label: 'Đồ vệ sinh / mỹ phẩm' },
    { key: 'electronics', IconComp: MdComputer, color: '#374151', label: 'Thiết bị điện nhỏ' },
    { key: 'box', IconComp: FaBoxOpen, color: '#92400e', label: 'Thùng / Vali / Túi' },
];

const QTY_TIERS = [
    { label: '< 10', value: 5, volumeEach: 0.01, weightEach: 0.5 },
    { label: '~ 25', value: 25, volumeEach: 0.008, weightEach: 0.4 },
    { label: '~ 50', value: 50, volumeEach: 0.007, weightEach: 0.35 },
];

// ─── Item list panel (shared between AI & Manual modes) ───────────────────────
const ItemListPanel = ({ form, primaryPickerCat, setPrimaryPickerCat, primaryPickerPreset, setPrimaryPickerPreset, secondaryItems, setSecondaryItems, secPickerKey, setSecPickerKey, secPickerTier, setSecPickerTier, onRecalculate }) => (
    <div className="ima-item-panel">
        {/* Quick-add picker */}
        <div className="ima-picker-bar">
            <Select
                placeholder="Chọn đồ vật..."
                style={{ flex: '1 1 200px', minWidth: 160 }}
                value={primaryPickerCat}
                onChange={v => { setPrimaryPickerCat(v); setPrimaryPickerPreset(null); }}
                showSearch optionFilterProp="children"
            >
                {PRIMARY_CATALOG.map(cat => (
                    <Option key={cat.name} value={cat.name}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CatIcon icon={cat.IconComp} color={cat.color} size={14} />
                            {cat.name}
                        </span>
                    </Option>
                ))}
            </Select>

            <Select
                placeholder="Kích thước"
                style={{ flex: '1 1 160px', minWidth: 140 }}
                value={primaryPickerPreset}
                onChange={v => setPrimaryPickerPreset(v)}
                disabled={!primaryPickerCat}
            >
                {PRIMARY_CATALOG.find(c => c.name === primaryPickerCat)?.presets.map((p, i) => (
                    <Option key={i} value={i}>{p.label} ({p.volume}m³)</Option>
                ))}
            </Select>

            <Form.List name="items">
                {(_, { add }) => (
                    <Button
                        type="primary" icon={<PlusOutlined />}
                        disabled={!primaryPickerCat || primaryPickerPreset === null}
                        onClick={() => {
                            const cat = PRIMARY_CATALOG.find(c => c.name === primaryPickerCat);
                            const preset = cat.presets[primaryPickerPreset];
                            add({ name: `${cat.name} (${preset.label})`, actualVolume: preset.volume, actualWeight: preset.weight });
                            setPrimaryPickerCat(null); setPrimaryPickerPreset(null);
                            onRecalculate();
                        }}
                        className="ima-btn-primary"
                    >
                        Thêm
                    </Button>
                )}
            </Form.List>

            <Form.List name="items">
                {(_, { add }) => (
                    <Button
                        type="dashed" icon={<PlusOutlined />}
                        onClick={() => { add({ name: 'Đồ vật tự nhập...', actualVolume: 0.1, actualWeight: 5, _isCustom: true }); onRecalculate(); }}
                    >
                        Tùy chỉnh
                    </Button>
                )}
            </Form.List>
        </div>

        {/* Table header */}
        <div className="ima-table">
            <div className="ima-table-header">
                <Row gutter={4}>
                    <Col span={7}>Tên đồ đạc</Col>
                    <Col span={4} style={{ textAlign: 'center' }}>Kích cỡ</Col>
                    <Col span={3} style={{ textAlign: 'center' }}>m³</Col>
                    <Col span={3} style={{ textAlign: 'center' }}>kg</Col>
                    <Col span={3} style={{ textAlign: 'center' }}>Đặc biệt?</Col>
                    <Col span={2} style={{ textAlign: 'center' }}>Tình trạng</Col>
                    <Col span={2} style={{ textAlign: 'center' }}>Xóa</Col>
                </Row>
            </div>

            <div className="ima-table-body">
                <Form.List name="items">
                    {(fields, { remove }) => (
                        <>
                            {fields.length === 0 && (
                                <div className="ima-empty">
                                    <RobotOutlined style={{ fontSize: 28, color: '#c0cfb2' }} />
                                    <span>Chưa có đồ vật nào</span>
                                </div>
                            )}
                            {fields.map(({ key, name, ...restField }) => {
                                const itemVal = form.getFieldValue(['items', name]) || {};
                                const isAIMapped = itemVal._source === 'AI_MAPPED';
                                const catalogEntry = isAIMapped ? PRIMARY_CATALOG.find(c => c.name === itemVal._catalogName) : null;

                                return (
                                    <Row key={key} gutter={4} align="middle"
                                        className={`ima-table-row${isAIMapped ? ' ima-table-row--ai' : ''}`}>
                                        <Col span={7}>
                                            <Form.Item {...restField} name={[name, 'name']} style={{ marginBottom: 0 }}>
                                                <Input
                                                    placeholder="Tên đồ vật"
                                                    readOnly={!itemVal._isCustom && !itemVal._source?.includes('RAW')}
                                                    suffix={isAIMapped && typeof itemVal._confidence === 'number' && (
                                                        <Tooltip title={`AI nhận diện (${Math.round(itemVal._confidence * 100)}% phù hợp)`}>
                                                            <span style={{ fontSize: 11, color: itemVal._confidence < 0.75 ? '#faad14' : '#8ba888', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                                                <RobotOutlined style={{ fontSize: 12 }} /> {Math.round(itemVal._confidence * 100)}%
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={4}>
                                            {isAIMapped && catalogEntry ? (
                                                <Select style={{ width: '100%' }} value={itemVal._presetIndex}
                                                    onChange={idx => {
                                                        const preset = catalogEntry.presets[idx];
                                                        const items = form.getFieldValue('items');
                                                        items[name] = { ...items[name], name: `${itemVal._catalogName} (${preset.label})`, actualVolume: preset.volume, actualWeight: preset.weight, _presetIndex: idx };
                                                        form.setFieldsValue({ items: [...items] });
                                                        onRecalculate();
                                                    }}>
                                                    {catalogEntry.presets.map((p, i) => <Option key={i} value={i}>{p.label}</Option>)}
                                                </Select>
                                            ) : <span style={{ fontSize: 13, color: '#c0cfb2', paddingLeft: 4 }}>—</span>}
                                        </Col>
                                        <Col span={3}>
                                            <Form.Item {...restField} name={[name, 'actualVolume']} style={{ marginBottom: 0 }}>
                                                <InputNumber min={0} step={0.1} style={{ width: '100%' }} onChange={onRecalculate} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={3}>
                                            <Form.Item {...restField} name={[name, 'actualWeight']} style={{ marginBottom: 0 }}>
                                                <InputNumber min={0} style={{ width: '100%' }} onChange={onRecalculate} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={3} style={{ textAlign: 'center' }}>
                                            <Form.Item {...restField} name={[name, 'isSpecial']} valuePropName="checked" style={{ marginBottom: 0 }}>
                                                <Checkbox onChange={onRecalculate} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={2}>
                                            <Form.Item {...restField} name={[name, 'condition']} style={{ marginBottom: 0 }}>
                                                <Select defaultValue="GOOD" style={{ width: '100%' }}>
                                                    <Option value="GOOD">Tốt</Option>
                                                    <Option value="FRAGILE">Dễ vỡ</Option>
                                                    <Option value="DAMAGED">Hư hỏng</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={2} style={{ textAlign: 'center' }}>
                                            <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 16 }} onClick={() => { remove(name); onRecalculate(); }} />
                                        </Col>
                                    </Row>
                                );
                            })}
                        </>
                    )}
                </Form.List>
            </div>
        </div>

        {/* Secondary + Critical (compact) */}
        <div className="ima-extras">
            {/* Secondary */}
            <div className="ima-extras-row">
                <Text style={{ fontSize: 14, color: '#44624a', fontWeight: 600, whiteSpace: 'nowrap' }}>Đồ nhỏ lẻ:</Text>
                <Select showSearch placeholder="Loại..." style={{ width: 200 }} value={secPickerKey} onChange={v => setSecPickerKey(v)} optionFilterProp="children">
                    {SECONDARY_CATALOG.map(item => (
                        <Option key={item.key} value={item.key}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CatIcon icon={item.IconComp} color={item.color} size={14} />{item.label}
                            </span>
                        </Option>
                    ))}
                </Select>
                <div style={{ display: 'flex', gap: 4 }}>
                    {QTY_TIERS.map((tier, idx) => (
                        <button key={idx} type="button" onClick={() => setSecPickerTier(secPickerTier === idx ? null : idx)}
                            style={{ padding: '4px 12px', borderRadius: 6, border: `1.5px solid ${secPickerTier === idx ? '#44624a' : '#c0cfb2'}`, background: secPickerTier === idx ? '#44624a' : '#fff', color: secPickerTier === idx ? '#fff' : '#666', cursor: 'pointer', fontSize: 13 }}>
                            {tier.label}
                        </button>
                    ))}
                </div>
                <Button type="primary" icon={<PlusOutlined />}
                    disabled={!secPickerKey || secPickerTier === null}
                    onClick={() => { setSecondaryItems(prev => [...prev.filter(x => x.key !== secPickerKey), { key: secPickerKey, tierIdx: secPickerTier }]); setSecPickerKey(null); setSecPickerTier(null); onRecalculate(); }}
                    className="ima-btn-primary">
                    Thêm
                </Button>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {secondaryItems.map(({ key, tierIdx }) => {
                        const cat = SECONDARY_CATALOG.find(c => c.key === key);
                        return (
                            <Tag key={key} closable onClose={() => { setSecondaryItems(prev => prev.filter(x => x.key !== key)); onRecalculate(); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, padding: '2px 8px', background: '#f8fafc', borderColor: '#c0cfb2', color: '#44624a' }}>
                                {cat && <CatIcon icon={cat.IconComp} color="#8ba888" size={12} />}
                                {cat?.label} <strong>({QTY_TIERS[tierIdx]?.label})</strong>
                            </Tag>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
);

// ─── Summary Bar (Reusable) ──────────────────────────────────────────────────
const SummaryBar = ({ totalVolume, totalWeight, totalPrice }) => (
    <div className="ima-summary-bar">
        <div className="ima-summary-stats">
            <div className="ima-stat">
                <span className="ima-stat-label">Thể tích</span>
                <span className="ima-stat-value">{totalVolume} m³</span>
            </div>
            <div className="ima-stat">
                <span className="ima-stat-label">Cân nặng</span>
                <span className="ima-stat-value">{totalWeight} kg</span>
            </div>
        </div>
        <div className="ima-summary-price">
            <span className="ima-price-label">Chi phí ước tính</span>
            <span className="ima-price-value">{totalPrice.toLocaleString()} VNĐ</span>
            <span className="ima-price-note">Giá cuối sẽ được quyết định bởi chuyên viên sau khi xem xét</span>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ItemMovingAnalysis = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useSelector((state) => state.auth);
    const [form] = Form.useForm();
    const orderData = location.state?.orderData;

    // "upload" = initial, "ai-result" = after AI, "manual" = manual entry, "confirm" = step 3
    const [mode, setMode] = useState('upload');
    const [fileList, setFileList] = useState([]);
    const [mediaThumbs, setMediaThumbs] = useState([]); // { uid, url, name }
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiContext, setAiContext] = useState(null);

    // Pickers
    const [primaryPickerCat, setPrimaryPickerCat] = useState(null);
    const [primaryPickerPreset, setPrimaryPickerPreset] = useState(null);
    const [secondaryItems, setSecondaryItems] = useState([]);
    const [secPickerKey, setSecPickerKey] = useState(null);
    const [secPickerTier, setSecPickerTier] = useState(null);

    // Totals
    const [totalVolume, setTotalVolume] = useState(0);
    const [totalWeight, setTotalWeight] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        if (!orderData) {
            message.error("Không tìm thấy thông tin đơn hàng.");
            navigate('/customer/create-moving-order');
        }
    }, [orderData, navigate]);

    const recalculate = () => {
        const primary = form.getFieldValue("items") || [];
        let vol = 0, wgt = 0;
        let specialItemsCount = 0;
        primary.forEach(item => { if (item) { vol += Number(item.actualVolume) || 0; wgt += Number(item.actualWeight) || 0; if (item.isSpecial) specialItemsCount++; } });
        secondaryItems.forEach(({ tierIdx }) => { const t = QTY_TIERS[tierIdx]; if (t) { vol += t.value * t.volumeEach; wgt += t.value * t.weightEach; } });
        setTotalVolume(Number(vol.toFixed(2)));
        setTotalWeight(Number(wgt.toFixed(2)));
        const d = orderData?.distanceKm || 0;
        let p = d <= 5 ? 500000 : d <= 10 ? 700000 : d <= 20 ? 1000000 : 1000000 + (d - 20) * 20000;
        p += wgt * 2000 + specialItemsCount * 300000;
        setTotalPrice(p);
    };

    useEffect(() => { recalculate(); }, [secondaryItems]);

    const handleBeforeUpload = (file) => {
        setFileList(prev => {
            if (prev.some(f => f.uid === file.uid)) return prev;
            return [...prev, file];
        });
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setMediaThumbs(prev => [...prev, { uid: file.uid, url, name: file.name }]);
        } else {
            setMediaThumbs(prev => [...prev, { uid: file.uid, url: null, name: file.name }]);
        }
        return false;
    };

    const runAnalysis = async () => {
        if (fileList.length === 0) { message.warning("Vui lòng tải lên ít nhất 1 hình ảnh."); return; }
        setIsAnalyzing(true);
        message.loading({ content: 'AI đang phân tích hình ảnh...', key: 'ai' });
        try {
            const raw = await analyzeMedia(fileList);
            const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
            if (Array.isArray(parsed.items)) {
                const { mappedPrimary, unmatchedPrimary, newSecondary } = normalizeAIItems(parsed.items, PRIMARY_CATALOG, null, null, null);
                form.setFieldsValue({ items: [...(form.getFieldValue("items") || []), ...mappedPrimary, ...unmatchedPrimary] });
                const deduped = newSecondary.filter(ns => !secondaryItems.some(s => s.key === ns.key)).map(ns => ({ ...ns, tierIdx: 0 }));
                if (deduped.length) setSecondaryItems(prev => [...prev, ...deduped]);
            }
            
            // BE Logic Replication for Vehicle and Staff
            const itemsToCalc = parsed.items || [];
            let calcVol = 0, calcWgt = 0;
            itemsToCalc.forEach(item => {
                calcVol += Number(item.actualVolume) || 0;
                calcWgt += Number(item.actualWeight) || 0;
            });
            
            let suggestedVehicle = '500KG';
            if (calcWgt > 1000 || calcVol > 5) {
                suggestedVehicle = '1.5TON';
            } else if (calcWgt > 500 || calcVol > 2.5) {
                suggestedVehicle = '1TON';
            }
            if (calcWgt > 1500 || calcVol > 8) {
                suggestedVehicle = '2TON';
            }
            
            let suggestedStaffCount = 2;
            if (calcVol > 5 || calcWgt > 500) suggestedStaffCount += 1;
            // Floor/elevator not known here, so leave at base calculation

            let suggestedVehicles = [{ vehicleType: suggestedVehicle, count: 1 }];

            setAiContext({ suggestedVehicle, suggestedVehicles, suggestedStaffCount });
            setMode('ai-result');
            recalculate();
            message.success({ content: 'Phân tích hoàn tất!', key: 'ai', duration: 3 });
        } catch (err) {
            console.error(err);
            message.error({ content: 'Lỗi phân tích AI: ' + err.message, key: 'ai', duration: 4 });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = async () => {
        const primary = form.getFieldValue("items") || [];
        if (primary.length === 0 && secondaryItems.length === 0) {
            message.warning("Vui lòng thêm ít nhất 1 đồ vật."); return;
        }
        if (!agreed) { message.warning("Vui lòng đồng ý với điều khoản dịch vụ."); return; }
        if (!isAuthenticated) { navigate('/login'); return; }
        try {
            message.loading({ content: 'Đang gửi yêu cầu...', key: 'submit' });

            let uploadedImages = [];
            if (fileList.length > 0) {
                message.loading({ content: 'Đang tải hình ảnh lên hệ thống...', key: 'submit' });
                const validFiles = fileList.filter(f => f instanceof File);
                if (validFiles.length > 0) {
                    uploadedImages = await uploadSurveyMedia(validFiles);
                }
                message.loading({ content: 'Đang tạo yêu cầu với hình ảnh...', key: 'submit' });
            }

            const itemsRich = [
                ...primary.map(i => ({
                    name: i.name,
                    quantity: 1,
                    actualVolume: i.actualVolume || 0,
                    actualWeight: i.actualWeight || 0,
                    condition: i.condition || 'GOOD',
                    notes: i.notes || '',
                    isSpecialItem: !!i.isSpecial,
                    requiresManualHandling: !!i.isSpecial, // special items need manual handling
                })),
                ...secondaryItems.map(({ key, tierIdx }) => {
                    const cat = SECONDARY_CATALOG.find(c => c.key === key);
                    const t = QTY_TIERS[tierIdx];
                    return {
                        name: `[SEC] ${cat?.label}`,
                        quantity: t.value,
                        actualVolume: +(t.value * t.volumeEach).toFixed(2),
                        actualWeight: +(t.value * t.weightEach).toFixed(1),
                        condition: 'GOOD',
                        notes: t.label,
                        isSpecialItem: false,
                        requiresManualHandling: false,
                    };
                }),
            ];

            // Pass AI logistics estimate as aiEstimate so dispatcher review form is pre-filled
            const aiEstimate = aiContext ? {
                suggestedVehicle:    aiContext.suggestedVehicle || null,
                suggestedVehicles:   aiContext.suggestedVehicles || null,
                suggestedStaffCount: aiContext.suggestedStaffCount || 2,
                totalActualVolume:   totalVolume,
                totalActualWeight:   totalWeight,
                distanceKm:          orderData?.distanceKm || 0,
            } : undefined;

            await createOrder({ ...orderData, itemsRich, images: uploadedImages, aiEstimate });

            // Clear cached form data from MovingInformationPage
            sessionStorage.removeItem('homs_activeLocation');
            sessionStorage.removeItem('homs_pickupDescription');
            sessionStorage.removeItem('homs_dropoffDescription');
            sessionStorage.removeItem('homs_pickupLocation');
            sessionStorage.removeItem('homs_dropoffLocation');
            sessionStorage.removeItem('homs_movingDate');

            message.success({ content: 'Tạo yêu cầu thành công!', key: 'submit', duration: 2 });
            navigate('/customer/order');
        } catch (err) {
            message.error({ content: 'Lỗi: ' + err.message, key: 'submit' });
        }
    };

    const sharedListProps = { form, primaryPickerCat, setPrimaryPickerCat, primaryPickerPreset, setPrimaryPickerPreset, secondaryItems, setSecondaryItems, secPickerKey, setSecPickerKey, secPickerTier, setSecPickerTier, onRecalculate: recalculate };

    if (!orderData) return null;

    return (
        <Layout className="ima-page">
            <AppHeader />
            <Content>

                {/* ── Hero (reuses moving-hero banner) ─────────────────── */}
                <section className="moving-hero">
                    <h1>Chuyển Đồ Vật Lẻ</h1>
                </section>

                {/* ── Steps ────────────────────────────────────────────── */}
                <section className="service-steps-container">
                    <Card className="steps-card">
                        <Steps
                            current={mode === 'upload' ? 0 : mode === 'confirm' ? 2 : 1}
                            responsive
                            items={[
                                { title: 'Chọn dịch vụ' },
                                { title: 'Thông tin đồ đạc' },
                                { title: 'Thỏa thuận' },
                            ]}
                        />
                    </Card>
                </section>

                <div className="ima-body">

                    {/* ══════════════════════════════════════════════════════
                        MODE: upload — Initial media upload screen
                    ══════════════════════════════════════════════════════ */}
                    {mode === 'upload' && (
                        <div className="ima-upload-screen">
                            <div className="ima-upload-card">
                                <div className="ima-upload-header">
                                    <RobotOutlined className="ima-upload-icon" />
                                    <Title level={3} style={{ margin: 0, color: '#44624a' }}>Phân tích đồ đạc bằng AI</Title>
                                    <Text style={{ color: '#8ba888', fontSize: 15 }}>
                                        Tải lên hình ảnh hoặc video — AI sẽ tự động nhận diện và lên danh sách đồ đạc cho bạn
                                    </Text>
                                </div>

                                <Spin spinning={isAnalyzing} tip="AI đang nhận diện đồ đạc..." size="large">
                                    <Dragger
                                        multiple
                                        fileList={fileList}
                                        beforeUpload={handleBeforeUpload}
                                        onRemove={file => {
                                            setFileList(prev => prev.filter(f => f.uid !== file.uid));
                                            setMediaThumbs(prev => { const t = prev.find(t => t.uid === file.uid); if (t?.url) URL.revokeObjectURL(t.url); return prev.filter(t => t.uid !== file.uid); });
                                        }}
                                        accept="image/*,video/*"
                                        className="ima-dragger"
                                        showUploadList={{ showPreviewIcon: false }}
                                    >
                                        <div className="ima-dragger-content">
                                            <InboxOutlined className="ima-dragger-icon" />
                                            <p className="ima-dragger-text">Kéo thả hoặc nhấp để tải lên</p>
                                            <p className="ima-dragger-hint">Hỗ trợ ảnh & video — AI sẽ tự phân tích nội dung</p>
                                        </div>
                                    </Dragger>
                                </Spin>

                                <div className="ima-upload-actions">
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<RobotOutlined />}
                                        onClick={runAnalysis}
                                        disabled={fileList.length === 0}
                                        loading={isAnalyzing}
                                        className="ima-ai-btn"
                                    >
                                        Bắt đầu phân tích AI
                                    </Button>

                                    <div className="ima-divider-or">
                                        <span>hoặc</span>
                                    </div>

                                    <Button
                                        size="large"
                                        icon={<EditOutlined />}
                                        onClick={() => { setMode('manual'); }}
                                        className="ima-manual-btn"
                                    >
                                        Tự thêm đồ vật thủ công
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        MODE: ai-result — Two-panel: media left, table right
                    ══════════════════════════════════════════════════════ */}
                    {mode === 'ai-result' && (
                        <Form form={form} layout="vertical" onValuesChange={recalculate}>
                            <SummaryBar totalVolume={totalVolume} totalWeight={totalWeight} totalPrice={totalPrice} />

                            <div className="ima-result-topbar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                                    <Text strong style={{ color: '#44624a', fontSize: 15 }}>AI đã phân tích xong</Text>
                                    {aiContext && <Tag color="blue">{aiContext.suggestedVehicles?.map(v => `${v.count}x${v.vehicleType}`).join(' + ') || aiContext.suggestedVehicle} · {aiContext.suggestedStaffCount} nhân sự</Tag>}
                                </div>
                                <Space>
                                    <Button icon={<ReloadOutlined />} size="small" onClick={() => { setMode('upload'); setFileList([]); setMediaThumbs([]); form.setFieldsValue({ items: [] }); setSecondaryItems([]); setAiContext(null); }}>
                                        Phân tích lại
                                    </Button>
                                </Space>
                            </div>

                            <div className="ima-result-layout">
                                {/* LEFT: media thumbnails */}
                                <div className="ima-media-panel">
                                    <Text style={{ fontSize: 12, color: '#8ba888', fontWeight: 600, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Media đã tải lên
                                    </Text>
                                    <div className="ima-media-grid">
                                        {mediaThumbs.map((t, i) => (
                                            <div key={t.uid} className="ima-media-thumb">
                                                {t.url
                                                    ? <img src={t.url} alt={t.name} />
                                                    : <div className="ima-media-video">🎬 Video {i + 1}</div>
                                                }
                                                <span className="ima-media-label">{t.name.length > 18 ? t.name.slice(0, 16) + '…' : t.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {aiContext && (
                                        <div className="ima-ai-suggestion">
                                            <Text style={{ fontSize: 11, color: '#8ba888', display: 'block', marginBottom: 4 }}>Gợi ý từ AI</Text>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <div className="ima-suggestion-chip">Xe đề xuất: <strong>{aiContext.suggestedVehicles?.map(v => `${v.count}x${v.vehicleType}`).join(' + ') || aiContext.suggestedVehicle}</strong></div>
                                                <div className="ima-suggestion-chip">Nhân sự: <strong>{aiContext.suggestedStaffCount} người</strong></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: item list */}
                                <div className="ima-table-panel">
                                    <Text style={{ fontSize: 12, color: '#8ba888', fontWeight: 600, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Danh sách đồ đạc — kiểm tra & chỉnh sửa trước khi xác nhận
                                    </Text>
                                    <ItemListPanel {...sharedListProps} />
                                </div>
                            </div>

                            {/* Next step button */}
                            <div style={{ textAlign: 'right', marginTop: 16 }}>
                                <Button type="primary" size="large" icon={<CheckCircleOutlined />}
                                    onClick={() => setMode('confirm')}
                                    className="ima-btn-primary"
                                    style={{ borderRadius: 24, padding: '0 32px', height: 48, fontSize: 15, fontWeight: 700 }}
                                >
                                    Tiếp theo
                                </Button>
                            </div>
                        </Form>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        MODE: manual — Full-width table entry
                    ══════════════════════════════════════════════════════ */}
                    {mode === 'manual' && (
                        <Form form={form} layout="vertical" onValuesChange={recalculate}>
                            <SummaryBar totalVolume={totalVolume} totalWeight={totalWeight} totalPrice={totalPrice} />

                            <div className="ima-result-topbar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <EditOutlined style={{ color: '#44624a', fontSize: 16 }} />
                                    <Text strong style={{ color: '#44624a', fontSize: 15 }}>Nhập danh sách đồ đạc thủ công</Text>
                                </div>
                                <Button
                                    icon={<RobotOutlined />} size="small"
                                    onClick={() => setMode('upload')}
                                    className="ima-btn-primary"
                                    style={{ padding: '0 14px' }}
                                >
                                    Dùng AI phân tích ảnh thay thế
                                </Button>
                            </div>

                            <div className="ima-manual-layout">
                                <ItemListPanel {...sharedListProps} />
                            </div>

                            {/* Next step button */}
                            <div style={{ textAlign: 'right', marginTop: 16 }}>
                                <Button type="primary" size="large" icon={<CheckCircleOutlined />}
                                    onClick={() => setMode('confirm')}
                                    className="ima-btn-primary"
                                    style={{ borderRadius: 24, padding: '0 32px', height: 48, fontSize: 15, fontWeight: 700 }}
                                >
                                    Tiếp theo
                                </Button>
                            </div>
                        </Form>
                    )}

                    {/* =====================================================
                        MODE: confirm — Step 3: Summary & Agreement
                    ===================================================== */}
                    {mode === 'confirm' && (
                        <div>
                            <div className="ima-result-topbar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <CheckCircleOutlined style={{ color: '#44624a', fontSize: 16 }} />
                                    <Text strong style={{ color: '#44624a', fontSize: 15 }}>Xác nhận đơn hàng</Text>
                                </div>
                                <Button
                                    icon={<ArrowLeftOutlined />} size="small"
                                    onClick={() => setMode(mediaThumbs.length > 0 ? 'ai-result' : 'manual')}
                                >
                                    Quay lại
                                </Button>
                            </div>
                            {renderSummaryAndAgreement()}
                        </div>
                    )}

                </div>
            </Content>
            <AppFooter />
        </Layout>
    );

    function renderSummaryAndAgreement() {
        return (
            <>
                <SummaryBar totalVolume={totalVolume} totalWeight={totalWeight} totalPrice={totalPrice} />

                {/* Agreement */}
                <div className="ima-agreement-card">
                    <div className="ima-agreement-text">
                        <Title level={5} style={{ color: '#44624a', marginBottom: 16 }}>ĐIỀU KHOẢN DỊCH VỤ VẬN CHUYỂN ĐỒ VẬT LẺ</Title>

                        <div className="ima-agreement-section">
                            <p><strong>1. Khai báo tài sản</strong></p>
                            <ul>
                                <li>Khách hàng có trách nhiệm khai báo đầy đủ, chính xác các vật dụng vận chuyển, đặc biệt là tài sản có giá trị cao, dễ vỡ, dễ hư hỏng.</li>
                                <li>
                                    Trường hợp phát sinh vật phẩm ngoài danh sách đã khai báo, đơn vị vận chuyển có quyền:
                                    <ul>
                                        <li>Từ chối vận chuyển, hoặc</li>
                                        <li>Áp dụng phụ phí tương ứng.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        <div className="ima-agreement-section">
                            <p><strong>2. Hàng hóa không nhận vận chuyển</strong></p>
                            <ul>
                                <li>Không nhận vận chuyển các mặt hàng thuộc danh mục cấm theo quy định pháp luật (vũ khí, chất cấm, hàng lậu, chất dễ cháy nổ…).</li>
                                <li>Không chịu trách nhiệm với hàng hóa bị thu giữ do vi phạm pháp luật từ phía khách hàng.</li>
                            </ul>
                        </div>

                        <div className="ima-agreement-section">
                            <p><strong>3. Giá dịch vụ và thanh toán</strong></p>
                            <ul>
                                <li>Chi phí hiển thị trên hệ thống chỉ mang tính ước tính, có thể thay đổi dựa trên thực tế (khối lượng, khoảng cách, điều kiện vận chuyển…).</li>
                                <li>Giá chính thức sẽ được xác nhận bởi nhân viên/điều phối trước khi thực hiện dịch vụ. Khách hàng có trách nhiệm thanh toán đầy đủ theo giá đã được xác nhận.</li>
                            </ul>
                        </div>

                        <div className="ima-agreement-section">
                            <p><strong>4. Thời gian và tiến độ</strong></p>
                            <ul>
                                <li>Thời gian vận chuyển là dự kiến và có thể thay đổi do yếu tố khách quan (thời tiết, giao thông, sự cố kỹ thuật…).</li>
                                <li>Đơn vị vận chuyển không chịu trách nhiệm đối với các chậm trễ ngoài tầm kiểm soát.</li>
                            </ul>
                        </div>

                        <div className="ima-agreement-section">
                            <p><strong>5. Đóng gói và bảo quản</strong></p>
                            <ul>
                                <li>HomS cam kết thực hiện bọc lót, đóng gói theo quy trình tiêu chuẩn.</li>
                                <li>Đối với các vật phẩm đặc biệt (đồ điện tử cao cấp, đồ cổ, hàng siêu dễ vỡ…), khách hàng cần yêu cầu dịch vụ đóng gói chuyên biệt (có thể phát sinh phí).</li>
                            </ul>
                        </div>

                        <div className="ima-agreement-section">
                            <p><strong>6. Trách nhiệm và bồi thường</strong></p>
                            <ul>
                                <li>Đơn vị vận chuyển chịu trách nhiệm với thiệt hại trực tiếp xảy ra trong quá trình vận chuyển do lỗi của mình.</li>
                                <li>Mức bồi thường tối đa:
                                    <ul>
                                        <li>Dựa trên giá trị khai báo, hoặc</li>
                                        <li>Theo mức trần quy định của công ty nếu không có khai báo trước.</li>
                                    </ul>
                                </li>
                                <li>Không chịu trách nhiệm đối với:
                                    <ul>
                                        <li>Hư hỏng nội tại của hàng hóa</li>
                                        <li>Hao mòn tự nhiên</li>
                                        <li>Thiệt hại do đóng gói không đạt yêu cầu từ phía khách hàng</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        <div className="ima-agreement-section">
                            <p><strong>7. Xác nhận giao nhận</strong></p>
                            <ul>
                                <li>Khách hàng (hoặc người được ủy quyền) cần kiểm tra và xác nhận tình trạng hàng hóa tại thời điểm giao nhận.</li>
                                <li>Sau khi ký xác nhận hoàn tất, mọi khiếu nại phát sinh sau đó có thể không được giải quyết.</li>
                            </ul>
                        </div>

                        <div className="ima-agreement-section">
                            <p><strong>8. Hủy và thay đổi dịch vụ</strong></p>
                            <ul>
                                <li>Việc hủy dịch vụ cần thực hiện trước thời gian đã đặt tối thiểu 24 giờ.</li>
                                <li>Trường hợp hủy muộn hoặc thay đổi đột xuất, có thể phát sinh phí.</li>
                            </ul>
                        </div>

                        <div className="ima-agreement-section">
                            <p><strong>9. Quyền từ chối phục vụ</strong></p>
                            <ul>
                                <li>HomS có quyền từ chối cung cấp dịch vụ trong các trường hợp:</li>
                                <ul>
                                    <li>Thông tin khách hàng không minh bạch</li>
                                    <li>Hàng hóa thuộc danh mục cấm</li>
                                    <li>Điều kiện vận chuyển không đảm bảo an toàn</li>
                                </ul>
                            </ul>
                        </div>

                        <div className="ima-agreement-section">
                            <p><strong>10. Giải quyết tranh chấp</strong></p>
                            <ul>
                                <li>Mọi tranh chấp sẽ được ưu tiên giải quyết qua thương lượng.</li>
                                <li>Trường hợp không đạt thỏa thuận sẽ xử lý theo quy định pháp luật hiện hành.</li>
                            </ul>
                        </div>
                    </div>
                    <Checkbox checked={agreed} onChange={e => setAgreed(e.target.checked)} className="ima-agree-check">
                        Tôi đã đọc và đồng ý với các Điều khoản & Thỏa thuận dịch vụ
                    </Checkbox>
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <Button
                            type="primary" size="large"
                            onClick={handleSubmit}
                            disabled={!agreed}
                            className={`ima-submit-btn${agreed ? ' ima-submit-btn--active' : ''}`}
                        >
                            GỬI YÊU CẦU
                        </Button>
                    </div>
                </div>
            </>
        );
    }
};

export default React.memo(ItemMovingAnalysis);
