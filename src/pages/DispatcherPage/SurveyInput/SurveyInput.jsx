import React, { useState, useEffect } from 'react';
import {
  Table, Button, Typography, Modal, Form, Input, Checkbox,
  Row, Col, Space, message, Card, InputNumber,
  Select, Tag, Divider, Tooltip, Badge, Alert
} from 'antd';
import {
  EditOutlined, PlusOutlined, DeleteOutlined, SaveOutlined,
  WarningOutlined, LockOutlined, ExclamationCircleFilled, RobotOutlined,
  EyeOutlined, DollarCircleOutlined
} from '@ant-design/icons';
import {
  FaBed, FaTv, FaCouch, FaMotorcycle, FaSnowflake,
  FaBoxOpen, FaBook, FaGuitar, FaTshirt, FaWineGlass
} from 'react-icons/fa';
import {
  GiWashingMachine, GiCloakDagger, GiMirrorMirror,
  GiCookingPot, GiSofa, GiClosedDoors, GiHandheldFan,
  GiDirectorChair, GiWoodBeam, GiStrongbox
} from 'react-icons/gi';
import {
  MdComputer, MdAir, MdTv, MdChair, MdOutlineDiamond,
  MdLightbulbOutline, MdAccessTime, MdLocalFlorist,
  MdCurtains, MdToys, MdOutdoorGrill, MdSoap,
  MdOutlineTableRestaurant, MdBookmarks
} from 'react-icons/md';
import { TbFridge, TbArmchair, TbShoe } from 'react-icons/tb';
import { PiScrollDuotone } from 'react-icons/pi';
import './SurveyInput.css';

import dayjs from 'dayjs';
import { requestTicketService, surveyService } from '../../../services/surveysService';
import AIVisionAnalyzer from '../../../components/AIVisionAnalyzer/AIVisionAnalyzer';
import { normalizeAIItems, SECONDARY_KEY_RULES, matchSecondaryKey, normalizeCondition } from '../../../services/ai/catalogMappingService';

// ─── Icon badge helper ────────────────────────────────────────────────────────
const CatIcon = ({ icon: Icon, color = '#44624A', size = 18 }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: size + 10, height: size + 10, borderRadius: '50%',
    background: color + '22', flexShrink: 0
  }}>
    <Icon size={size} color={color} />
  </span>
);

// ─── PRIMARY FURNITURE CATALOG ───────────────────────────────────────────────
const PRIMARY_CATALOG = [
  {
    name: 'Giường', IconComp: FaBed, color: '#7c3aed',
    presets: [
      { label: '1m', volume: 0.35, weight: 25 },
      { label: '1.2m', volume: 0.45, weight: 30 },
      { label: '1.6m', volume: 0.6, weight: 40 },
      { label: '1.8m', volume: 0.7, weight: 50 },
      { label: '2m', volume: 0.8, weight: 60 },
    ]
  },
  {
    name: 'Tủ quần áo', IconComp: GiClosedDoors, color: '#b45309',
    presets: [
      { label: '2 cánh', volume: 0.9, weight: 60 },
      { label: '3 cánh', volume: 1.3, weight: 90 },
      { label: '4 cánh', volume: 1.8, weight: 120 },
    ]
  },
  {
    name: 'Sofa', IconComp: GiSofa, color: '#0369a1',
    presets: [
      { label: '1 chỗ', volume: 0.4, weight: 25 },
      { label: '2 chỗ', volume: 0.8, weight: 50 },
      { label: 'Góc L', volume: 1.5, weight: 90 },
      { label: 'Bộ 3+1+1', volume: 2.0, weight: 110 },
    ]
  },
  {
    name: 'Tủ lạnh', IconComp: TbFridge, color: '#0891b2',
    presets: [
      { label: '100–150L', volume: 0.3, weight: 40 },
      { label: '150–250L', volume: 0.45, weight: 55 },
      { label: '250–400L', volume: 0.65, weight: 70 },
      { label: 'Side-by-side', volume: 1.0, weight: 100 },
    ]
  },
  {
    name: 'Máy giặt', IconComp: GiWashingMachine, color: '#0284c7',
    presets: [
      { label: '6–8kg (cửa trước)', volume: 0.2, weight: 50 },
      { label: '8–10kg (cửa trước)', volume: 0.25, weight: 60 },
      { label: 'Cửa trên', volume: 0.18, weight: 35 },
    ]
  },
  {
    name: 'Tivi', IconComp: FaTv, color: '#1d4ed8',
    presets: [
      { label: '32 inch', volume: 0.12, weight: 6 },
      { label: '43 inch', volume: 0.18, weight: 9 },
      { label: '55 inch', volume: 0.28, weight: 14 },
      { label: '65 inch', volume: 0.38, weight: 20 },
      { label: '75+ inch', volume: 0.5, weight: 28 },
    ]
  },
  {
    name: 'Bàn ăn / bàn làm việc', IconComp: MdOutlineTableRestaurant, color: '#92400e',
    presets: [
      { label: 'Nhỏ (4 ghế)', volume: 0.6, weight: 30 },
      { label: 'Lớn (6–8 ghế)', volume: 1.1, weight: 55 },
    ]
  },
  {
    name: 'Kệ sách / tủ hồ sơ', IconComp: MdBookmarks, color: '#065f46',
    presets: [
      { label: 'Nhỏ', volume: 0.3, weight: 15 },
      { label: 'Trung', volume: 0.6, weight: 30 },
      { label: 'Lớn', volume: 1.0, weight: 50 },
    ]
  },
  {
    name: 'Máy tính để bàn', IconComp: MdComputer, color: '#374151',
    presets: [
      { label: 'Bộ (CPU + màn hình)', volume: 0.3, weight: 20 },
    ]
  },
  {
    name: 'Điều hòa', IconComp: MdAir, color: '#0369a1',
    presets: [
      { label: '1 HP', volume: 0.25, weight: 30 },
      { label: '1.5 HP', volume: 0.35, weight: 38 },
      { label: '2 HP', volume: 0.45, weight: 50 },
    ]
  },
  {
    name: 'Xe máy', IconComp: FaMotorcycle, color: '#b91c1c',
    presets: [
      { label: 'Xe số / tay ga', volume: 0.8, weight: 100 },
    ]
  },
];

// ─── SECONDARY / MISC CATALOG ─────────────────────────────────────────────────
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

// Quantity tiers for secondary items
const QTY_TIERS = [
  { label: '< 10', value: 5, volumeEach: 0.01, weightEach: 0.5 },
  { label: '~ 25', value: 25, volumeEach: 0.008, weightEach: 0.4 },
  { label: '~ 50', value: 50, volumeEach: 0.007, weightEach: 0.35 },
];

// ─── CRITICAL ITEMS ───────────────────────────────────────────────────────────
const CRITICAL_ITEMS = [
  { key: 'safe', IconComp: GiStrongbox, color: '#dc2626', label: 'Két sắt' },
  { key: 'artwork', IconComp: GiMirrorMirror, color: '#9333ea', label: 'Tranh / tác phẩm nghệ thuật' },
  { key: 'jewelry_safe', IconComp: MdOutlineDiamond, color: '#db2777', label: 'Tủ / hộp trang sức cao cấp' },
  { key: 'important_docs', IconComp: PiScrollDuotone, color: '#d97706', label: 'Tài liệu pháp lý / hộ chiếu' },
  { key: 'wine', IconComp: FaWineGlass, color: '#9f1239', label: 'Rượu / đồ uống cao cấp' },
  { key: 'instrument', IconComp: FaGuitar, color: '#b45309', label: 'Nhạc cụ' },
];

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Mirror backend _estimateHours logic
const computeEstimatedHours = ({ distanceKm = 0, floors = 0, suggestedStaffCount = 2 }) => {
  let hours = 2;
  hours += distanceKm * 0.1;
  hours += floors * 0.5;
  if (suggestedStaffCount <= 2) hours += 1;
  return Math.ceil(hours);
};

const SurveyInput = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [form] = Form.useForm();

  // AI Vision analyzer modal state
  const [isAIVisionModalOpen, setIsAIVisionModalOpen] = useState(false);

  // State để hiển thị/ẩn nhập giá trị khai báo khi chọn bảo hiểm
  const [isInsuranceChecked, setIsInsuranceChecked] = useState(false);

  // Secondary misc items added: [{ key, tierIdx }]
  const [secondaryItems, setSecondaryItems] = useState([]);
  // Critical items: Set of selected keys
  const [criticalItems, setCriticalItems] = useState(new Set());

  // 4A picker state
  const [primaryPickerCat, setPrimaryPickerCat] = useState(null);
  const [primaryPickerPreset, setPrimaryPickerPreset] = useState(null);
  // 4B picker state
  const [secPickerKey, setSecPickerKey] = useState(null);
  const [secPickerTier, setSecPickerTier] = useState(null);

  const [aiImages, setAiImages] = useState([]); // [{ index, name, url }]
  const [highlightConfig, setHighlightConfig] = useState(null); // { imageUrl, box, label }

  // Pricing preview state
  const [isPreviewPricingModalOpen, setIsPreviewPricingModalOpen] = useState(false);
  const [previewPricingData, setPreviewPricingData] = useState(null);
  const [isCalculatingPreview, setIsCalculatingPreview] = useState(false);

  // 1. Tải danh sách Ticket
  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Include WAITING_REVIEW (district dispatcher reviews AI data for SPECIFIC_ITEMS/TRUCK_RENTAL)
      const res = await requestTicketService.getTickets({ status: 'WAITING_REVIEW,WAITING_SURVEY,SURVEYED,QUOTED' });
      setTickets(res.data || []);
    } catch (error) {
      message.error('Lỗi tải danh sách yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const getRouteDistance = async (origin, destination) => {
    const getLat = (c) => (c && typeof c.lat !== 'undefined' ? c.lat : (Array.isArray(c) ? c[1] : null));
    const getLng = (c) => (c && typeof c.lng !== 'undefined' ? c.lng : (Array.isArray(c) ? c[0] : null));

    const olat = getLat(origin);
    const olng = getLng(origin);
    const dlat = getLat(destination);
    const dlng = getLng(destination);

    if (!olat || !olng || !dlat || !dlng) {
      console.warn('[Route] Invalid coordinates provided:', { origin, destination });
      return 0;
    }

    // ── 1. Goong (Vietnam-focused driving directions) ────────────────────────
    const GOONG_KEY = process.env.REACT_APP_GOONG_API_KEY;
    if (GOONG_KEY) {
      try {
        const url = `https://rsapi.goong.io/Direction?origin=${olat},${olng}&destination=${dlat},${dlng}&vehicle=car&api_key=${GOONG_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        const meters = data?.routes?.[0]?.legs?.[0]?.distance?.value;
        if (meters > 0) {
          console.log('[Route] Goong OK:', (meters / 1000).toFixed(1), 'km');
          return Math.round(meters / 100) / 10;
        }
      } catch (e) { console.warn('[Route] Goong failed:', e.message); }
    }

    // ── 2. Mapbox ────────────────────────────────────────────────────────────
    const MAPBOX_KEY = process.env.REACT_APP_MAPBOX_API_KEY || process.env.REACT_APP_MAPBOX_TOKEN;
    if (MAPBOX_KEY) {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${olng},${olat};${dlng},${dlat}?geometries=geojson&access_token=${MAPBOX_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        const meters = data?.routes?.[0]?.distance;
        if (meters > 0) {
          console.log('[Route] Mapbox OK:', (meters / 1000).toFixed(1), 'km');
          return Math.round(meters / 100) / 10;
        }
      } catch (e) { console.warn('[Route] Mapbox failed:', e.message); }
    }

    // ── 3. Geoapify Routing ──────────────────────────────────────────────────
    const GEOAPIFY_KEY = process.env.REACT_APP_GEOAPIFY_API_KEY;
    if (GEOAPIFY_KEY) {
      try {
        const url = `https://api.geoapify.com/v1/routing?waypoints=${olat},${olng}|${dlat},${dlng}&mode=drive&apiKey=${GEOAPIFY_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        const meters = data?.features?.[0]?.properties?.distance;
        if (meters > 0) {
          console.log('[Route] Geoapify OK:', (meters / 1000).toFixed(1), 'km');
          return Math.round(meters / 100) / 10;
        }
      } catch (e) { console.warn('[Route] Geoapify failed:', e.message); }
    }

    // ── 4. LocationIQ Routing ────────────────────────────────────────────────
    const LOCATIONIQ_KEY = process.env.REACT_APP_LOCATIONIQ_API_KEY;
    if (LOCATIONIQ_KEY) {
      try {
        const url = `https://us1.locationiq.com/v1/directions/driving/${olng},${olat};${dlng},${dlat}?key=${LOCATIONIQ_KEY}&overview=false`;
        const res = await fetch(url);
        const data = await res.json();
        const meters = data?.routes?.[0]?.distance;
        if (meters > 0) {
          console.log('[Route] LocationIQ OK:', (meters / 1000).toFixed(1), 'km');
          return Math.round(meters / 100) / 10;
        }
      } catch (e) { console.warn('[Route] LocationIQ failed:', e.message); }
    }

    // ── 5. OSRM (free, no key) ───────────────────────────────────────────────
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${olng},${olat};${dlng},${dlat}?overview=false`;
      const res = await fetch(url);
      const data = await res.json();
      const meters = data?.routes?.[0]?.distance;
      if (meters > 0) {
        console.log('[Route] OSRM OK:', (meters / 1000).toFixed(1), 'km');
        return Math.round(meters / 100) / 10;
      }
    } catch (e) { console.warn('[Route] OSRM failed:', e.message); }

    console.warn('[Route] All providers failed, returning 0');
    return 0;
  };

  // 2. Mở Modal & Fill dữ liệu cũ
  const openSurveyModal = async (ticket) => {
    console.log("DEBUG TICKET COORDS:", ticket);
    setSelectedTicket(ticket);
    form.resetFields();
    setIsInsuranceChecked(false);
    setSecondaryItems([]);
    setCriticalItems(new Set());
    setPrimaryPickerCat(null);
    setPrimaryPickerPreset(null);
    setSecPickerKey(null);
    setSecPickerTier(null);
    setAiImages([]);
    setHighlightConfig(null);

    // TRUCK_RENTAL bypasses regular survey fetch since it has no survey.
    if (ticket.moveType === 'TRUCK_RENTAL') {
      const rental = ticket.rentalDetails || {};
      setTimeout(() => {
        form.setFieldsValue({
          distanceKm: 0,
          floors: 0,
          carryMeter: 0,
          hasElevator: false,
          needsAssembling: false,
          needsPacking: false,
          insuranceRequired: false,
          declaredValue: 0,
          suggestedVehicle: rental.truckType || ticket.truckType || '1TON',
          suggestedStaffCount: rental.withDriver ? 2 : 1,
          estimatedHours: rental.rentalDurationHours || 2,
          items: [],
          notes: `Thông tin thuê xe: Xe ${rental.truckType || '1TON'}, Thời gian thuê: ${rental.rentalDurationHours || 2} giờ, Có tài xế: ${rental.withDriver ? 'Có' : 'Không'}.`
        });
      }, 50);
      setIsModalOpen(true);
      return;
    }

    try {
      const res = await surveyService.getSurveyByTicket(ticket._id);
      console.log("DEBUG: LẤY ĐƯỢC SURVEY TỪ BE:", res);

      const surveyData = res.data?.data || res.data;

      // ── Helper: parse items into 3 buckets (primary / secondary / critical) ─
      const parseItemsToBuckets = (items = []) => {
        const primary = [];
        const secondary = [];
        const critical = new Set();
        items.forEach(item => {
          const name = item.name || '';
          if (name.startsWith('⚠️ [ĐỒ QUAN TRỌNG]')) {
            const match = CRITICAL_ITEMS.find(c => name.includes(c.label));
            if (match) critical.add(match.key);
          } else if (name.startsWith('[SEC:') || SECONDARY_CATALOG.some(c => name.includes(c.label))) {
            let key;
            if (name.startsWith('[SEC:')) {
              key = name.match(/^\[SEC:([^\]]+)\]/)?.[1];
            } else {
              key = SECONDARY_CATALOG.find(c => name.includes(c.label))?.key;
            }
            if (key) {
              const tierIdx = QTY_TIERS.findIndex(t => name.includes(`(${t.label})`));
              secondary.push({ key, tierIdx: tierIdx >= 0 ? tierIdx : 0 });
            } else {
              primary.push(item);
            }
          } else {
            primary.push(item);
          }
        });
        return { primary, secondary, critical };
      };

      // ── CASE 1: Real SurveyData from DB ─────────────────────────
      if (surveyData && surveyData._id) {
        console.log('DEBUG: FILLING FORM WITH SURVEY DATA:', surveyData);
        if (ticket.moveType === 'SPECIFIC_ITEMS' || ticket.moveType === 'TRUCK_RENTAL') {
          message.info('Đã tải danh sách đồ đạc từ phân tích AI của khách hàng. Vui lòng kiểm tra và điều chỉnh.');
        }

        setIsInsuranceChecked(surveyData.insuranceRequired);
        const { primary, secondary, critical } = parseItemsToBuckets(surveyData.items);
        setCriticalItems(critical);
        setSecondaryItems(secondary);

        let estimatedKm = surveyData.distanceKm || 0;
        if (!estimatedKm && ticket.pickup?.coordinates && ticket.delivery?.coordinates) {
          estimatedKm = await getRouteDistance(ticket.pickup.coordinates, ticket.delivery.coordinates);
          estimatedKm = Math.round(estimatedKm * 10) / 10;
          if (estimatedKm > 0) message.success(`Đã tự động tính toán khoảng cách: ${estimatedKm} km`);
        }
        const staffCount = surveyData.suggestedStaffCount || 2;
        const floors = surveyData.floors || 0;

        setTimeout(() => {
          form.setFieldsValue({
            floors,
            carryMeter: surveyData.carryMeter || 0,
            distanceKm: estimatedKm,
            hasElevator: surveyData.hasElevator || false,
            needsAssembling: surveyData.needsAssembling || false,
            needsPacking: surveyData.needsPacking || false,
            insuranceRequired: surveyData.insuranceRequired || false,
            declaredValue: surveyData.declaredValue || 0,
            suggestedVehicles: surveyData.suggestedVehicles?.length > 0
              ? surveyData.suggestedVehicles
              : [{ vehicleType: surveyData.suggestedVehicle || '1TON', count: 1 }],
            suggestedStaffCount: staffCount,
            estimatedHours: surveyData.estimatedHours || computeEstimatedHours({ distanceKm: estimatedKm, floors, suggestedStaffCount: staffCount }),
            notes: surveyData.notes,
            items: primary.length > 0 ? primary : [{}]
          });
        }, 50);

        // ── CASE 3: No data at all — fresh empty form ────────────────────────────
      } else {
        let estimatedKm = 0;
        if (ticket.pickup?.coordinates && ticket.delivery?.coordinates) {
          estimatedKm = await getRouteDistance(ticket.pickup.coordinates, ticket.delivery.coordinates);
          estimatedKm = Math.round(estimatedKm * 10) / 10;
          if (estimatedKm > 0) message.success(`Đã tự động tính toán khoảng cách: ${estimatedKm} km`);
        }
        setTimeout(() => {
          const defaultStaff = 2;
          form.setFieldsValue({
            floors: 0, carryMeter: 0, distanceKm: estimatedKm,
            items: [{}], suggestedStaffCount: defaultStaff,
            estimatedHours: computeEstimatedHours({ distanceKm: estimatedKm, floors: 0, suggestedStaffCount: defaultStaff })
          });
        }, 50);
      }
    } catch (error) {
      // 404 = no survey yet and not a WAITING_REVIEW ticket — fresh form
      let estimatedKm = 0;
      if (ticket.pickup?.coordinates && ticket.delivery?.coordinates) {
        estimatedKm = await getRouteDistance(ticket.pickup.coordinates, ticket.delivery.coordinates);
        estimatedKm = Math.round(estimatedKm * 10) / 10;
        if (estimatedKm > 0) message.success(`Đã tự động tính toán khoảng cách: ${estimatedKm} km`);
      }
      setTimeout(() => {
        const defaultStaff = 2;
        form.setFieldsValue({
          floors: 0, carryMeter: 0, distanceKm: estimatedKm,
          items: [{}], suggestedStaffCount: defaultStaff,
          estimatedHours: computeEstimatedHours({ distanceKm: estimatedKm, floors: 0, suggestedStaffCount: defaultStaff })
        });
      }, 50);
    }

    setIsModalOpen(true);
  };



  // 2A. Xử lý sau khi AI phân tích xong
  const handleAIAnalyzeComplete = (result) => {
    const currentItems = form.getFieldsValue().items || [];
    const validItems = currentItems.filter(item => item && item.name);

    // Persist AI image thumbnails for later item-location viewing
    setAiImages(Array.isArray(result._images) ? result._images : []);

    // ── Mapping Layer: normalize AI items into business catalog format ────────
    const { mappedPrimary, unmatchedPrimary, newSecondary } = normalizeAIItems(
      result.items,
      PRIMARY_CATALOG,
      SECONDARY_CATALOG,
      SECONDARY_KEY_RULES,
      matchSecondaryKey,
    );

    // Merge new secondary keys (skip duplicates already in state)
    const deduped = newSecondary.filter(
      ns => !secondaryItems.some(s => s.key === ns.key)
    ).map(ns => ({ ...ns, tierIdx: 0 }));

    // All primary items for the form: catalog-mapped first, then unmatched fallbacks
    const allPrimaryItems = [...mappedPrimary, ...unmatchedPrimary];

    form.setFieldsValue({ items: [...validItems, ...allPrimaryItems] });
    if (deduped.length > 0) setSecondaryItems(prev => [...prev, ...deduped]);

    // Only override logistics if dispatcher explicitly toggled them in the modal
    const overrides = {};
    if (result._applyVehicle && result.suggestedVehicle) {
      overrides.suggestedVehicle = result.suggestedVehicle;
    }
    if (result._applyStaff && result.suggestedStaffCount) {
      overrides.suggestedStaffCount = result.suggestedStaffCount;
    }
    if (Object.keys(overrides).length > 0) {
      form.setFieldsValue(overrides);
    }

    const overrideNote = Object.keys(overrides).length > 0
      ? ' Điều phối viên đã chọn áp dụng gợi ý logistics từ AI.'
      : ' — kiểm tra lại trong mục Đề xuất Tài nguyên.';

    const mappedCount = mappedPrimary.length;
    const unmatchedCount = unmatchedPrimary.length;
    const detail = mappedCount > 0
      ? ` (${mappedCount} đồ đạc đã khớp danh mục${unmatchedCount > 0 ? `, ${unmatchedCount} chưa khớp` : ''}).`
      : '';

    message.warning({
      content: `Đã áp dụng danh sách đồ đạc từ AI!${detail}${overrideNote} Vui lòng kiểm tra lại số liệu thực tế.`,
      duration: 7,
    });
  };

  // 3. Xử lý Lưu (Gọi API Complete)
  const handleSaveSurvey = async (values) => {
    try {
      // Map catalog item display names → backend itemType enum
      const ITEM_TYPE_MAP = {
        'Tivi': 'TV',
        'Tủ lạnh': 'FRIDGE',
        'Giường': 'BED',
        'Sofa': 'SOFA',
        'Tủ quần áo': 'WARDROBE',
        'Điều hòa': 'AC',
        'Máy giặt': 'WASHING_MACHINE',
      };
      const getItemType = (name = '') => {
        for (const [key, type] of Object.entries(ITEM_TYPE_MAP)) {
          if (name.startsWith(key)) return type;
        }
        return 'OTHER';
      };

      // Build secondary items from added selections
      const secondaryItemsPayload = secondaryItems.map(({ key, tierIdx }) => {
        const catalog = SECONDARY_CATALOG.find(c => c.key === key);
        const tier = QTY_TIERS[tierIdx];
        return {
          name: `[SEC:${key}] ${catalog?.label || key} (${tier.label})`,
          itemType: 'OTHER',
          actualVolume: Math.round(tier.value * tier.volumeEach * 100) / 100,
          actualWeight: Math.round(tier.value * tier.weightEach * 10) / 10,
          condition: 'GOOD',
          notes: `Số lượng ước tính: ${tier.label}`
        };
      });

      // Add critical item flags as special items
      const criticalItemsPayload = [...criticalItems].map(key => {
        const item = CRITICAL_ITEMS.find(c => c.key === key);
        return {
          name: `⚠️ [ĐỒ QUAN TRỌNG] ${item?.label || key}`,
          itemType: 'OTHER',
          actualVolume: 0.1,
          actualWeight: 20,
          condition: 'FRAGILE',
          notes: 'Đồ vật quan trọng — cần xử lý đặc biệt'
        };
      });

      // Chuẩn hóa Payload khớp 100% với Schema SurveyData của Backend
      const payload = {
        // Các trường bắt buộc theo Controller
        suggestedVehicles: values.suggestedVehicles,
        suggestedStaffCount: values.suggestedStaffCount,
        distanceKm: values.distanceKm,

        // Ước tính số giờ (dùng cho tính phí nhân công)
        estimatedHours: values.estimatedHours || computeEstimatedHours({ distanceKm: values.distanceKm, floors: values.floors, suggestedStaffCount: values.suggestedStaffCount }),

        // Các trường tùy chọn
        carryMeter: values.carryMeter || 0,
        floors: values.floors || 0,
        hasElevator: values.hasElevator || false,
        needsAssembling: values.needsAssembling || false,
        needsPacking: values.needsPacking || false,
        insuranceRequired: values.insuranceRequired || false,
        declaredValue: values.insuranceRequired ? (values.declaredValue || 0) : 0,
        notes: values.notes,

        // Danh sách đồ đạc: primary + secondary + critical
        items: [
          ...(values.items?.map(item => ({
            name: item.name,
            itemType: getItemType(item.name),   // ← map to BE enum
            actualVolume: item.actualVolume || 0,
            actualWeight: item.actualWeight || 0,
            condition: normalizeCondition(item.condition),
            notes: item.notes || ''
          })) || []),
          ...secondaryItemsPayload,
          ...criticalItemsPayload
        ],
        images: aiImages || []
      };

      // console.log('\n--- DEBUG FE [handleSaveSurvey] ---');
      // console.log('payload.suggestedStaffCount:', payload.suggestedStaffCount, 'type:', typeof payload.suggestedStaffCount);
      // console.log('payload to send:', payload);
      // console.log('------------------------------------\n');

      // Gọi PUT /api/surveys/:ticketId/complete
      await surveyService.completeSurvey(selectedTicket._id, payload);

      message.success('Đã lưu khảo sát & Tính giá thành công!');
      setIsModalOpen(false);
      fetchTickets(); // Reload lại bảng
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Lỗi khi lưu kết quả!';
      message.error(errorMsg);
    }
  };

  const handlePreviewPricing = async () => {
    try {
      const values = await form.validateFields();

      // Map catalog item display names → backend itemType enum
      const ITEM_TYPE_MAP = {
        'Tivi': 'TV', 'Tủ lạnh': 'FRIDGE', 'Giường': 'BED', 'Sofa': 'SOFA',
        'Tủ quần áo': 'WARDROBE', 'Điều hòa': 'AC', 'Máy giặt': 'WASHING_MACHINE',
      };
      const getItemType = (name = '') => {
        for (const [key, type] of Object.entries(ITEM_TYPE_MAP)) {
          if (name.startsWith(key)) return type;
        }
        return 'OTHER';
      };

      const payload = {
        suggestedVehicles: values.suggestedVehicles,
        suggestedStaffCount: values.suggestedStaffCount,
        distanceKm: values.distanceKm,
        estimatedHours: values.estimatedHours || computeEstimatedHours({
          distanceKm: values.distanceKm, floors: values.floors, suggestedStaffCount: values.suggestedStaffCount
        }),
        carryMeter: values.carryMeter || 0,
        floors: values.floors || 0,
        hasElevator: values.hasElevator || false,
        needsAssembling: values.needsAssembling || false,
        needsPacking: values.needsPacking || false,
        insuranceRequired: values.insuranceRequired || false,
        declaredValue: values.insuranceRequired ? (values.declaredValue || 0) : 0,
        items: [
          ...(values.items?.map(item => ({
            name: item.name,
            itemType: getItemType(item.name),
            actualVolume: item.actualVolume || 0,
            actualWeight: item.actualWeight || 0,
            condition: normalizeCondition(item.condition),
            notes: item.notes || ''
          })) || []),
          ...secondaryItems.map(({ key, tierIdx }) => {
            const catalog = SECONDARY_CATALOG.find(c => c.key === key);
            const tier = QTY_TIERS[tierIdx];
            return {
              name: `[SEC:${key}] ${catalog?.label || key} (${tier.label})`,
              itemType: 'OTHER',
              actualVolume: Math.round(tier.value * tier.volumeEach * 100) / 100,
              actualWeight: Math.round(tier.value * tier.weightEach * 10) / 10,
              condition: 'GOOD'
            };
          }),
          ...([...criticalItems].map(key => ({
            name: `⚠️ [ĐỒ QUAN TRỌNG] ${CRITICAL_ITEMS.find(c => c.key === key)?.label || key}`,
            itemType: 'OTHER',
            actualVolume: 0.1, actualWeight: 20, condition: 'FRAGILE'
          })))
        ]
      };

      // console.log('\n--- DEBUG FE [handlePreviewPricing] ---');
      // console.log('payload.suggestedStaffCount:', payload.suggestedStaffCount, 'type:', typeof payload.suggestedStaffCount);
      // console.log('values:', values);
      // console.log('payload to send:', payload);
      // console.log('---------------------------------------\n');

      setIsCalculatingPreview(true);
      const res = await surveyService.previewPricing(selectedTicket._id, payload);
      setPreviewPricingData(res.data);
      setIsPreviewPricingModalOpen(true);
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || 'Vui lòng điền đủ thông tin để tính giá!');
    } finally {
      setIsCalculatingPreview(false);
    }
  };

  const handleConfirmQuote = () => {
    form.submit();
    setIsPreviewPricingModalOpen(false);
  };

  const handleEstimate = async () => {
    try {
      // Validate các trường cần thiết trước khi ước tính
      const values = await form.validateFields(['items', 'distanceKm', 'floors', 'hasElevator']);

      const payload = {
        distanceKm: values.distanceKm,
        floors: values.floors || 0,
        hasElevator: values.hasElevator || false,
        items: values.items?.map(item => ({
          actualVolume: item.actualVolume || 0,
          actualWeight: item.actualWeight || 0
        })) || []
      };

      setLoading(true);
      const res = await surveyService.estimateResources(payload);
      if (res?.data) {
        form.setFieldsValue({
          suggestedVehicles: res.data.suggestedVehicles || [{ vehicleType: res.data.suggestedVehicle || '1TON', count: 1 }],
          suggestedStaffCount: res.data.suggestedStaffCount
        });
        if (res.data.routeWarnings && res.data.routeWarnings.length > 0) {
          message.warning(res.data.routeWarnings.join(' '));
        } else {
          message.success('Đã tự động tính toán loại xe và nhân sự!');
        }
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tính toán: Vui lòng kiểm tra đã nhập đủ Quãng đường và Đồ đạc!');
    } finally {
      setLoading(false);
    }
  };

  // Cấu hình bảng
  const columns = [
    {
      title: 'Loại dịch vụ',
      dataIndex: 'moveType',
      render: (moveType) => {
        const map = {
          FULL_HOUSE: { label: 'Chuyển nhà', color: '#44624a' },
          SPECIFIC_ITEMS: { label: 'Đồ vật lẻ', color: '#8ba888' },
          TRUCK_RENTAL: { label: 'Thuê xe', color: '#c0cfb2', textColor: '#44624a' },
        };
        const cfg = map[moveType] || { label: moveType, color: '#ccc' };
        return (
          <span style={{
            display: 'inline-block', background: cfg.color,
            color: cfg.textColor || '#fff', borderRadius: 12,
            padding: '1px 10px', fontSize: 12, fontWeight: 700
          }}>
            {cfg.label}
          </span>
        );
      }
    },
    {
      title: 'Mã Ticket',
      dataIndex: 'code',
      fontWeight: 'bold',
      render: (text, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <div style={{ display: 'flex', gap: 4 }}>
            {r.isHighValue && (
              <Tag color="#d4b106" style={{ fontSize: '10px', margin: 0, padding: '0 4px', border: 'none', fontWeight: 700 }}>
                💎 GIÁ TRỊ CAO
              </Tag>
            )}
            {r.insurance?.isInsured && (
              <Tag color="#10b981" style={{ fontSize: '10px', margin: 0, padding: '0 4px', border: 'none', fontWeight: 700 }}>
                🛡️ BẢO HIỂM
              </Tag>
            )}
          </div>
        </Space>
      )
    },
    {
      title: 'Khách hàng',
      render: (_, r) => r.customerId?.fullName || 'N/A'
    },
    {
      title: 'Báo giá (VNĐ)',
      render: (_, r) => {
        if (r.pricing?.totalPrice) {
          return <Text type="success" strong>{r.pricing.totalPrice.toLocaleString()}</Text>;
        }
        return <Text type="secondary">Chưa có</Text>;
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => {
        const statusMap = {
          WAITING_REVIEW: { color: 'gold', label: 'Chờ xem xét' },
          WAITING_SURVEY: { color: 'blue', label: 'Chờ khảo sát' },
          SURVEYED: { color: 'cyan', label: 'Đã khảo sát' },
          QUOTED: { color: 'green', label: 'Đã báo giá' },
          ACCEPTED: { color: 'geekblue', label: 'Đã chốt đơn' },
          CONVERTED: { color: 'purple', label: 'Đã tạo HĐ' },
        };
        const cfg = statusMap[status] || { color: 'default', label: status };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      width: 100,
      render: (_, record) => {
        const isReadOnly = ['QUOTED', 'ACCEPTED', 'CONVERTED'].includes(record.status);
        const isReview = record.status === 'WAITING_REVIEW';
        
        let icon = <EditOutlined />;
        let title = 'Nhập Khảo Sát';
        
        if (isReadOnly) {
          icon = <EyeOutlined />;
          title = 'Xem Kết Quả';
        } else if (isReview) {
          icon = <DollarCircleOutlined />;
          title = 'Xem xét & Báo giá';
        }

        return (
          <Tooltip title={title}>
            <Button
              type={isReadOnly ? 'default' : 'primary'}
              shape="circle"
              style={isReadOnly ? {} : { background: '#44624A', borderColor: '#44624A' }}
              icon={icon}
              onClick={() => openSurveyModal(record)}
            />
          </Tooltip>
        );
      }
    }
  ];

  const isReadOnly = selectedTicket && ['QUOTED', 'ACCEPTED', 'CONVERTED'].includes(selectedTicket.status);
  const isReviewMode = selectedTicket?.status === 'WAITING_REVIEW';

  const isTruckRental = selectedTicket?.moveType === 'TRUCK_RENTAL';

  // Open a small modal that shows the item's location on the AI image
  const handleShowItemOnImage = (itemVal) => {
    if (!itemVal || !itemVal._aiRaw || !Array.isArray(itemVal._aiRaw.imageIndices) || aiImages.length === 0) {
      message.info('Không tìm thấy vị trí hình ảnh cho mục này.');
      return;
    }

    // pick first image index that we actually have a thumbnail for
    const availableImage = aiImages.find(img => itemVal._aiRaw.imageIndices.includes(img.index));
    if (!availableImage) {
      message.info('Mục này thuộc về media không phải hình ảnh nên không thể hiển thị vị trí.');
      return;
    }

    const boxes = Array.isArray(itemVal._aiRaw.boundingBoxes) ? itemVal._aiRaw.boundingBoxes : [];
    const boxForImage = boxes.find(b => b.imageIndex === availableImage.index) || boxes[0] || null;

    if (!boxForImage) {
      message.info('AI chưa cung cấp toạ độ chi tiết cho mục này.');
      return;
    }

    setHighlightConfig({
      imageUrl: availableImage.url,
      box: boxForImage,
      label: itemVal.name,
    });
  };

  return (
    <Card bordered={false} className="shadow-sm">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ color: '#44624A', margin: 0 }}>Quản Lý Khảo Sát</Title>
        <Button onClick={fetchTickets}>Làm mới</Button>
      </div>

      <Table columns={columns} dataSource={tickets} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={1500}
        footer={null}
        centered
        forceRender
        className="survey-modal"
        title={
          <Title level={3} style={{ textAlign: 'center', color: '#44624A', margin: 0 }}>
            {isReviewMode ? 'XEM XÉT & BÁO GIÁ' : 'PHIẾU KHẢO SÁT'}: {selectedTicket?.code}
            {isReviewMode && !isTruckRental && (
              <Tag color="gold" style={{ marginLeft: 12, fontSize: 12, verticalAlign: 'middle' }}>Xem xét dữ liệu AI</Tag>
            )}
            {isTruckRental && (
              <Tag color="blue" style={{ marginLeft: 12, fontSize: 12, verticalAlign: 'middle' }}>Thuê Xe Tải</Tag>
            )}
          </Title>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSaveSurvey} style={{ marginTop: 20 }} disabled={isReadOnly}>
          {(selectedTicket?.isHighValue || selectedTicket?.insurance?.isInsured) && (
            <Alert
              message={
                <Space>
                  <ExclamationCircleFilled style={{ color: '#d4b106' }} />
                  <Text strong style={{ color: '#44624A' }}>ĐƠN HÀNG ĐẶC BIỆT CẦN LƯU Ý</Text>
                </Space>
              }
              description={
                <div style={{ marginTop: 8 }}>
                  {selectedTicket?.isHighValue && (
                    <div style={{ marginBottom: 4 }}>
                      <Tag color="#d4b106">💎 HÀNG GIÁ TRỊ CAO</Tag>
                      <Text>Giá trị khai báo: </Text>
                      <Text strong>{(selectedTicket.highValueDetails?.declaredValue || 0).toLocaleString()} ₫</Text>
                      <br />
                      <Text italic type="secondary">{selectedTicket.highValueDetails?.description}</Text>
                    </div>
                  )}
                  {selectedTicket?.insurance?.isInsured && (
                    <div>
                      <Tag color="#10b981">🛡️ ĐÃ CÓ BẢO HIỂM</Tag>
                      <Text>Gói: </Text><Tag color="cyan">{selectedTicket.insurance.packageId}</Tag>
                      <Text>Mức bồi thường tối đa: </Text>
                      <Text strong>{(selectedTicket.insurance.coverageAmount || 0).toLocaleString()} ₫</Text>
                    </div>
                  )}
                </div>
              }
              type="warning"
              showIcon={false}
              style={{ marginBottom: 20, borderRadius: 12, border: '1px solid #d4b106', background: '#fffef0' }}
            />
          )}
          <Row gutter={24}>

            {/* --- CỘT TRÁI: THÔNG TIN CHI TIẾT --- */}
            <Col span={isTruckRental ? 24 : 7} style={{ maxHeight: '78vh', overflowY: 'auto', paddingRight: '12px' }}>

              {!isTruckRental && (
                <>
                  {/* 1. Địa hình & Vận chuyển */}
                  <Card size="small" title="1. Địa hình & Vận chuyển" className="dispatcher-card mb-3" bordered={false}>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="floors" label="Số tầng lầu">
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="hasElevator" valuePropName="checked" label="&nbsp;">
                          <Checkbox>Có thang máy</Checkbox>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="carryMeter" label="Bê bộ (m)">
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="distanceKm"
                          label="Quãng đường (Km)"
                          rules={[{ required: true, message: 'Bắt buộc nhập' }]}
                        >
                          <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>

                  <Card size="small" title="2. Dịch vụ" className="dispatcher-card" style={{ marginTop: 16 }} bordered={false}>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item name="needsAssembling" valuePropName="checked" style={{ marginBottom: 8 }}>
                          <Checkbox style={{ whiteSpace: 'nowrap' }}>Cần tháo/lắp</Checkbox>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="needsPacking" valuePropName="checked" style={{ marginBottom: 8 }}>
                          <Checkbox style={{ whiteSpace: 'nowrap' }}>Cần đóng gói</Checkbox>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                </>
              )}

              {/* 3. Đề xuất tài nguyên (Quan trọng cho tính giá) */}
              <Card
                size="small"
                title={isTruckRental ? "Thông tin thuê xe (Tài nguyên & Tính giá)" : "3. Đề xuất Tài nguyên"}
                className="dispatcher-card"
                bordered={false}
                extra={!isReadOnly && !isTruckRental && <Button type="dashed" size="small" style={{ color: '#1890ff', borderColor: '#1890ff' }} onClick={handleEstimate}>Tự động tính</Button>}
                style={{ marginTop: 16, background: '#f6ffed' }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>
                    <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>Đội xe tải đề xuất
                  </div>
                  <Form.List name="suggestedVehicles" initialValue={[{ vehicleType: '1TON', count: 1 }]}>
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                            <Form.Item
                              {...restField}
                              name={[name, 'vehicleType']}
                              rules={[{ required: true, message: 'Chọn xe' }]}
                              style={{ margin: 0, width: 140 }}
                            >
                              <Select placeholder="Loại xe">
                                <Option value="500KG">Xe 500 KG</Option>
                                <Option value="1TON">Xe 1 Tấn</Option>
                                <Option value="1.5TON">Xe 1.5 Tấn</Option>
                                <Option value="2TON">Xe 2 Tấn</Option>
                              </Select>
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, 'count']}
                              rules={[{ required: true, message: 'Nhập SL' }]}
                              style={{ margin: 0, width: 100 }}
                            >
                              <InputNumber min={1} max={10} prefix="SL:" style={{ width: '100%' }} />
                            </Form.Item>
                            {fields.length > 1 && !isReadOnly ? (
                              <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', marginLeft: 8 }} />
                            ) : null}
                          </Space>
                        ))}
                        {!isReadOnly && (
                          <Button type="dashed" onClick={() => add({ vehicleType: '1TON', count: 1 })} block icon={<PlusOutlined />}>
                            Thêm dòng xe
                          </Button>
                        )}
                      </>
                    )}
                  </Form.List>
                </div>
                <Form.Item
                  name="suggestedStaffCount"
                  label="Số lượng nhân viên"
                  rules={[{ required: true, message: 'Nhập số nhân viên' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name="estimatedHours"
                  label="Ước tính số giờ thực hiện"
                  tooltip="Dùng để tính phí nhân công: nhân viên × giờ/giờ × số giờ"
                  rules={[{ required: true, message: 'Nhập số giờ ước tính' }]}
                >
                  <InputNumber min={1} max={24} step={0.5} style={{ width: '100%' }} addonAfter="giờ" />
                </Form.Item>
              </Card>

              <Form.Item name="notes" label="Ghi chú thêm" style={{ marginTop: 16 }}>
                <TextArea rows={5} placeholder="Ghi chú về lộ trình, khách hàng..." />
              </Form.Item>
            </Col>

            {/* --- CỘT PHẢI: DANH MỤC ĐỒ ĐẠC (2 PHẦN) --- */}
            {!isTruckRental && (
              <Col span={17} style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '20px', maxHeight: '78vh', overflowY: 'auto' }}>

                {/* ── 4A. ĐỒ ĐẠC CHÍNH ──────────────────────────────────── */}
                <div className="survey-section-container">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Title level={5} style={{ margin: 0 }}>4A. Đồ đạc chính</Title>
                    <Space>
                      {!isReadOnly && (
                        <Button
                          type="primary"
                          className="survey-primary-btn"
                          icon={<RobotOutlined />}
                          onClick={() => setIsAIVisionModalOpen(true)}
                        >
                          AI phân tính hình ảnh & video
                        </Button>
                      )}
                      <Tag color="blue">Chọn từ danh mục hoặc tự nhập</Tag>
                    </Space>
                  </div>

                  {/* Quick-add picker: category → preset → add */}
                  {!isReadOnly && (
                    <div className="survey-secondary-picker" style={{ background: '#f8fdf8', borderColor: '#d9f7be' }}>
                      <Select
                        placeholder="Ðồ vật..."
                        style={{ flex: '1 1 150px', minWidth: 150 }}
                        value={primaryPickerCat}
                        onChange={v => { setPrimaryPickerCat(v); setPrimaryPickerPreset(null); }}
                        showSearch
                        optionFilterProp="children"
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
                        placeholder="Kích thước / loại"
                        style={{ flex: '1 1 140px', minWidth: 140 }}
                        value={primaryPickerPreset}
                        onChange={v => setPrimaryPickerPreset(v)}
                        disabled={!primaryPickerCat}
                      >
                        {PRIMARY_CATALOG.find(c => c.name === primaryPickerCat)?.presets.map((p, i) => (
                          <Option key={i} value={i}>{p.label} ({p.volume}m³ / {p.weight}kg)</Option>
                        ))}
                      </Select>
                      <Form.List name="items">
                        {(_, { add }) => (
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            disabled={!primaryPickerCat || primaryPickerPreset === null}
                            onClick={() => {
                              const cat = PRIMARY_CATALOG.find(c => c.name === primaryPickerCat);
                              const preset = cat.presets[primaryPickerPreset];
                              add({ name: `${cat.name} (${preset.label})`, actualVolume: preset.volume, actualWeight: preset.weight, condition: 'GOOD' });
                              setPrimaryPickerCat(null);
                              setPrimaryPickerPreset(null);
                            }}
                            className="survey-primary-btn"
                          >
                            Thêm
                          </Button>
                        )}
                      </Form.List>
                    </div>
                  )}

                  {/* Primary items list */}
                  <div className="survey-items-container">
                    <div className="survey-items-header">
                      <Row gutter={6}>
                        <Col span={8}>Tên đồ đạc</Col>
                        <Col span={4} style={{ textAlign: 'center' }}>Loại / kích cỡ</Col>
                        <Col span={3} style={{ textAlign: 'center' }}>Thể tích (m³)</Col>
                        <Col span={3} style={{ textAlign: 'center' }}>Khối lượng (kg)</Col>
                        <Col span={3} style={{ textAlign: 'center' }}>Tình trạng</Col>
                        <Col span={3} style={{ textAlign: 'center' }}>Thao tác</Col>
                      </Row>
                    </div>
                    <div className="survey-items-scrollable">
                      <Form.List name="items">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Form.Item
                                key={key}
                                noStyle
                                shouldUpdate
                              >
                                {() => {
                                  const itemVal = form.getFieldValue(['items', name]) || {};
                                  const isAIMapped = itemVal._source === 'AI_MAPPED';
                                  const confidence = itemVal._confidence;
                                  const catalogName = itemVal._catalogName;
                                  const presetIndex = itemVal._presetIndex;
                                  const catalogEntry = isAIMapped
                                    ? PRIMARY_CATALOG.find(c => c.name === catalogName)
                                    : null;

                                  return (
                                    <Row
                                      gutter={6}
                                      align="middle"
                                      className={`survey-list-item${isAIMapped ? ' survey-list-item--ai' : ''}`}
                                    >
                                      <Col span={8}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: 'Nhập tên đồ' }]} style={{ marginBottom: 0, flex: 1 }}>
                                            <Input
                                              size="small"
                                              placeholder="Tên đồ vật"
                                              suffix={isAIMapped && typeof confidence === 'number' && (
                                                <Tooltip title={`AI tự động nhận diện (${Math.round(confidence * 100)}% phù hợp)`}>
                                                  <span className={`ai-confidence-input-suffix ${confidence < 0.75 ? 'ai-confidence-input-suffix--low' : ''}`}>
                                                    <RobotOutlined style={{ fontSize: 11 }} />
                                                    <span>{Math.round(confidence * 100)}%</span>
                                                  </span>
                                                </Tooltip>
                                              )}
                                            />
                                          </Form.Item>
                                        </div>
                                      </Col>
                                      <Col span={4}>
                                        {isAIMapped && catalogEntry ? (
                                          <Select
                                            size="small"
                                            style={{ width: '100%' }}
                                            value={presetIndex}
                                            onChange={(idx) => {
                                              const preset = catalogEntry.presets[idx];
                                              const items = form.getFieldValue('items');
                                              items[name] = {
                                                ...items[name],
                                                name: `${catalogName} (${preset.label})`,
                                                actualVolume: preset.volume,
                                                actualWeight: preset.weight,
                                                _presetIndex: idx,
                                              };
                                              form.setFieldsValue({ items: [...items] });
                                            }}
                                            disabled={isReadOnly}
                                          >
                                            {catalogEntry.presets.map((p, i) => (
                                              <Option key={i} value={i}>{p.label}</Option>
                                            ))}
                                          </Select>
                                        ) : (
                                          <span style={{ fontSize: 11, color: '#aaa', paddingLeft: 4 }}>—</span>
                                        )}
                                      </Col>
                                      <Col span={3}>
                                        <Form.Item {...restField} name={[name, 'actualVolume']} style={{ marginBottom: 0 }}>
                                          <InputNumber size="small" min={0} step={0.1} style={{ width: '100%' }} placeholder="m³" />
                                        </Form.Item>
                                      </Col>
                                      <Col span={3}>
                                        <Form.Item {...restField} name={[name, 'actualWeight']} style={{ marginBottom: 0 }}>
                                          <InputNumber size="small" min={0} style={{ width: '100%' }} placeholder="kg" />
                                        </Form.Item>
                                      </Col>
                                      <Col span={3}>
                                        <Form.Item {...restField} name={[name, 'condition']} style={{ marginBottom: 0 }}>
                                          <Select size="small" defaultValue="GOOD">
                                            <Option value="GOOD">Tốt</Option>
                                            <Option value="FRAGILE">Dễ vỡ</Option>
                                            <Option value="DAMAGED">Hư hỏng</Option>
                                          </Select>
                                        </Form.Item>
                                      </Col>
                                      <Col span={3} style={{ textAlign: 'center' }}>
                                        {!isReadOnly && (
                                          <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 14 }} onClick={() => remove(name)} />
                                        )}
                                        {itemVal._aiRaw && Array.isArray(itemVal._aiRaw.imageIndices) && itemVal._aiRaw.imageIndices.length > 0 && aiImages.length > 0 && (
                                          <Tooltip title="Xem vị trí trong ảnh AI">
                                            <Button
                                              type="text"
                                              size="small"
                                              icon={<EyeOutlined />}
                                              onClick={() => handleShowItemOnImage(itemVal)}
                                            />
                                          </Tooltip>
                                        )}
                                      </Col>
                                    </Row>
                                  );
                                }}
                              </Form.Item>
                            ))}

                            {/* {!isReadOnly && (
                          <Button size="small" type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: 4 }}>
                            Thêm thủ công
                          </Button>
                        )} */}
                          </>
                        )}
                      </Form.List>
                    </div>
                  </div>

                </div>
                <div className="survey-section-container">
                  <Title level={5} style={{ margin: '0 0 12px' }}>4B. Ðồ đạc phụ</Title>

                  {/* Picker row */}
                  {!isReadOnly && (
                    <div className="survey-secondary-picker">
                      <Select
                        showSearch
                        placeholder="Loại đồ phụ..."
                        style={{ flex: '1 1 180px', minWidth: 180 }}
                        value={secPickerKey}
                        onChange={v => setSecPickerKey(v)}
                        optionFilterProp="children"
                      >
                        {SECONDARY_CATALOG.map(item => (
                          <Option key={item.key} value={item.key}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CatIcon icon={item.IconComp} color={item.color} size={13} />
                              {item.label}
                            </span>
                          </Option>
                        ))}
                      </Select>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {QTY_TIERS.map((tier, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSecPickerTier(secPickerTier === idx ? null : idx)}
                            style={{
                              padding: '3px 10px',
                              borderRadius: 4,
                              border: `1.5px solid ${secPickerTier === idx ? '#faad14' : '#d9d9d9'}`,
                              background: secPickerTier === idx ? '#faad14' : '#fff',
                              color: secPickerTier === idx ? '#fff' : '#555',
                              cursor: 'pointer',
                              fontSize: 12
                            }}
                          >
                            {tier.label}
                          </button>
                        ))}
                      </div>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        disabled={!secPickerKey || secPickerTier === null}
                        onClick={() => {
                          // Remove existing entry for same key if any, then add new one
                          setSecondaryItems(prev => [
                            ...prev.filter(x => x.key !== secPickerKey),
                            { key: secPickerKey, tierIdx: secPickerTier }
                          ]);
                          setSecPickerKey(null);
                          setSecPickerTier(null);
                        }}
                        className="survey-primary-btn"
                      >
                        Thêm
                      </Button>
                    </div>
                  )}

                  {/* Selected secondary items chips */}
                  <div className="survey-items-container" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 32 }}>
                    {secondaryItems.length === 0 && (
                      <Text type="secondary" style={{ fontSize: 12, padding: '4px 0' }}>Chưa chọn đồ đạc phụ nào</Text>
                    )}
                    {secondaryItems.map(({ key, tierIdx }) => {
                      const cat = SECONDARY_CATALOG.find(c => c.key === key);
                      const tier = QTY_TIERS[tierIdx];
                      return (
                        <Tag
                          key={key}
                          closable={!isReadOnly}
                          onClose={() => setSecondaryItems(prev => prev.filter(x => x.key !== key))}
                          color="orange"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '2px 8px' }}
                        >
                          {cat && <CatIcon icon={cat.IconComp} color="#92400e" size={11} />}
                          {cat?.label} <strong>({tier?.label})</strong>
                        </Tag>
                      );
                    })}
                  </div>
                </div>

                {/* ── 4C. ĐỒ VẬT QUAN TRỌNG ──────────────────────────────── */}
                <div className="survey-section-container" style={{ borderColor: '#ffd591', background: '#fffcf5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <WarningOutlined style={{ color: '#faad14', fontSize: 16 }} />
                    <Title level={5} style={{ margin: 0, color: '#d4380d' }}>4C. Đồ vật quan trọng / đặc biệt</Title>
                  </div>
                  <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, padding: '10px 12px' }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                      ⚠️ Đánh dấu các đồ vật cần xử lý đặc biệt. Sẽ được ghi chú vào hồ sơ vận chuyển.
                    </Text>
                    <Row gutter={[8, 6]}>
                      {CRITICAL_ITEMS.map(item => (
                        <Col span={12} key={item.key}>
                          <div
                            onClick={() => {
                              if (isReadOnly) return;
                              setCriticalItems(prev => {
                                const next = new Set(prev);
                                next.has(item.key) ? next.delete(item.key) : next.add(item.key);
                                return next;
                              });
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: `1.5px solid ${criticalItems.has(item.key) ? '#ff4d4f' : '#ffd591'}`,
                              background: criticalItems.has(item.key) ? '#fff1f0' : '#fffbe6',
                              cursor: isReadOnly ? 'default' : 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            <CatIcon icon={item.IconComp} color={criticalItems.has(item.key) ? '#dc2626' : item.color} size={16} />
                            <span style={{ fontSize: 12, fontWeight: criticalItems.has(item.key) ? 600 : 400, color: criticalItems.has(item.key) ? '#cf1322' : '#555' }}>
                              {item.label}
                            </span>
                            {criticalItems.has(item.key) && <LockOutlined style={{ marginLeft: 'auto', color: '#cf1322', fontSize: 12 }} />}
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </div>
              </Col>
            )}
          </Row>

          <div className="survey-footer-actions">
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Đóng</Button>
              {!isReadOnly && (
                <Space>
                  <Button
                    size="large"
                    icon={<DollarCircleOutlined />}
                    onClick={handlePreviewPricing}
                    loading={isCalculatingPreview}
                    style={{ color: '#44624A', borderColor: '#44624A' }}
                  >
                    Tính giá & Xem trước
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    loading={loading}
                    style={{ background: '#44624a', borderColor: '#44624a', minWidth: '150px' }}
                    icon={<SaveOutlined />}
                  >
                    Xác Nhận & Báo Giá
                  </Button>
                </Space>
              )}
            </Space>
          </div>
        </Form>
      </Modal>

      <AIVisionAnalyzer
        open={isAIVisionModalOpen}
        onCancel={() => setIsAIVisionModalOpen(false)}
        onAnalyzeComplete={handleAIAnalyzeComplete}
        currentVehicle={form.getFieldValue('suggestedVehicles')}
        currentStaffCount={form.getFieldValue('suggestedStaffCount')}
        primaryCatalog={PRIMARY_CATALOG}
      />

      {/* Modal hiển thị vị trí đồ vật trong ảnh AI */}
      <Modal
        open={!!highlightConfig}
        onCancel={() => setHighlightConfig(null)}
        footer={null}
        width={720}
        centered
        title={highlightConfig?.label ? `Vị trí: ${highlightConfig.label}` : 'Vị trí trong ảnh AI'}
      >
        {highlightConfig && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                maxWidth: '100%',
              }}
            >
              <img
                src={highlightConfig.imageUrl}
                alt={highlightConfig.label || 'AI snapshot'}
                style={{ maxWidth: '100%', borderRadius: 8 }}
              />
              {(() => {
                const { centerX, centerY, width, height } = highlightConfig.box;
                if (
                  typeof centerX !== 'number' || typeof centerY !== 'number' ||
                  typeof width !== 'number' || typeof height !== 'number'
                ) {
                  return null;
                }

                const left = Math.max(0, (centerX - width / 2) * 100);
                const top = Math.max(0, (centerY - height / 2) * 100);
                const w = Math.min(100, width * 100);
                const h = Math.min(100, height * 100);

                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${w}%`,
                      height: `${h}%`,
                      borderRadius: '50%',
                      border: '3px solid #ff4d4f',
                      boxShadow: '0 0 0 2px rgba(255,77,79,0.4)',
                      pointerEvents: 'none',
                    }}
                  />
                );
              })()}
            </div>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Vòng tròn đỏ thể hiện vị trí ước lượng của món đồ trong ảnh được AI xác định.
              </Text>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── PRICING PREVIEW MODAL ──────────────────────────────────────────────── */}
      <Modal
        title={<Title level={4} style={{ margin: 0, color: '#44624A' }}>Chi tiết tính giá đơn hàng</Title>}
        open={isPreviewPricingModalOpen}
        onCancel={() => setIsPreviewPricingModalOpen(false)}
        footer={[
          <Button key="back" onClick={() => setIsPreviewPricingModalOpen(false)}>Quay lại</Button>,
          <Button
            key="submit"
            type="primary"
            style={{ background: '#44624A', borderColor: '#44624A' }}
            onClick={handleConfirmQuote}
          >
            Gửi báo giá cho khách hàng
          </Button>
        ]}
        width={600}
      >
        {previewPricingData && (
          <div style={{ padding: '10px 0' }}>
            <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text>Phí thuê xe ({previewPricingData.breakdown?.suggestedVehicles?.map(v => `${v.count}x${v.vehicleType}`).join(' + ') || previewPricingData.breakdown?.suggestedVehicle || '—'}):</Text>
                <Text strong>{(previewPricingData.breakdown?.vehicleFee || 0).toLocaleString()} ₫</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text>Phí nhân công ({previewPricingData.breakdown?.suggestedStaffCount || 0} người):</Text>
                <Text strong>{(previewPricingData.breakdown?.laborFee || 0).toLocaleString()} ₫</Text>
              </div>
              {previewPricingData.breakdown?.floorFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text>Phụ phí tầng lầu:</Text>
                  <Text strong>{previewPricingData.breakdown.floorFee.toLocaleString()} ₫</Text>
                </div>
              )}
              {previewPricingData.breakdown?.carryFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text>Phí khênh bộ:</Text>
                  <Text strong>{previewPricingData.breakdown.carryFee.toLocaleString()} ₫</Text>
                </div>
              )}
              {previewPricingData.breakdown?.assemblingFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text>Phí tháo lắp:</Text>
                  <Text strong>{previewPricingData.breakdown.assemblingFee.toLocaleString()} ₫</Text>
                </div>
              )}
              {previewPricingData.breakdown?.packingFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text>Phí đóng gói:</Text>
                  <Text strong>{previewPricingData.breakdown.packingFee.toLocaleString()} ₫</Text>
                </div>
              )}
              {previewPricingData.breakdown?.insuranceFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text>Phí bảo hiểm:</Text>
                  <Text strong>{previewPricingData.breakdown.insuranceFee.toLocaleString()} ₫</Text>
                </div>
              )}
              {previewPricingData.minimumChargeApplied && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: '#d4b106' }}>Phụ phí dịch vụ tối thiểu:</Text>
                  <Text strong style={{ color: '#d4b106' }}>
                    {((previewPricingData.subtotal || 0) - (
                       (previewPricingData.breakdown?.baseTransportFee || 0) +
                       (previewPricingData.breakdown?.vehicleFee || 0) +
                       (previewPricingData.breakdown?.laborFee || 0) +
                       (previewPricingData.breakdown?.itemServiceFee || 0) +
                       (previewPricingData.breakdown?.carryFee || 0) +
                       (previewPricingData.breakdown?.floorFee || 0) +
                       (previewPricingData.breakdown?.distanceFee || 0) +
                       (previewPricingData.breakdown?.assemblingFee || 0) +
                       (previewPricingData.breakdown?.packingFee || 0) +
                       (previewPricingData.breakdown?.insuranceFee || 0) +
                       (previewPricingData.breakdown?.managementFee || 0)
                    )).toLocaleString()} ₫
                  </Text>
                </div>
              )}
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Title level={4} style={{ margin: 0 }}>TỔNG CỘNG:</Title>
                <Title level={4} style={{ margin: 0, color: '#44624A' }}>
                  {(previewPricingData.totalPrice || 0).toLocaleString()} ₫
                </Title>
              </div>
            </div>

            <Alert
              message="Lưu ý"
              description="Sau khi gửi báo giá, trạng thái đơn hàng sẽ chuyển thành QUOTED. Khách hàng sẽ nhận được thông báo để vào xem và chấp nhận báo giá."
              type="info"
              showIcon
            />
          </div>
        )}
      </Modal>

    </Card>
  );
};

export default SurveyInput;