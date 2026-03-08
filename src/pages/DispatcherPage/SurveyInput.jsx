import React, { useState, useEffect } from 'react';
import {
  Table, Button, Typography, Modal, Form, Input, Checkbox,
  Row, Col, Space, message, Card, InputNumber,
  Select, Tag, Divider, Tooltip, Badge
} from 'antd';
import {
  EditOutlined, PlusOutlined, DeleteOutlined, SaveOutlined,
  WarningOutlined, LockOutlined, ExclamationCircleFilled
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
import dayjs from 'dayjs';
import { requestTicketService, surveyService } from '../../services/surveysService';

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
  { key: 'bowl', IconComp: GiCookingPot, color: '#d97706', label: 'Chén bát / đũa' },
  { key: 'lamp', IconComp: MdLightbulbOutline, color: '#ca8a04', label: 'Đèn bàn / đèn ngủ' },
  { key: 'clock', IconComp: MdAccessTime, color: '#0369a1', label: 'Đồng hồ' },
  { key: 'plant', IconComp: MdLocalFlorist, color: '#16a34a', label: 'Cây cảnh / chậu hoa' },
  { key: 'fan', IconComp: GiHandheldFan, color: '#0891b2', label: 'Quạt điện' },
  { key: 'book', IconComp: FaBook, color: '#7c3aed', label: 'Sách vở / tài liệu' },
  { key: 'mirror', IconComp: GiMirrorMirror, color: '#6b7280', label: 'Gương' },
  { key: 'curtain', IconComp: MdCurtains, color: '#9d174d', label: 'Rèm cửa' },
  { key: 'toy', IconComp: MdToys, color: '#f59e0b', label: 'Đồ chơi trẻ em' },
  { key: 'shoes', IconComp: TbShoe, color: '#78350f', label: 'Giày dép / hộp' },
  { key: 'clothes', IconComp: FaTshirt, color: '#4f46e5', label: 'Quần áo (túi / thùng)' },
  { key: 'kitchen', IconComp: MdOutdoorGrill, color: '#dc2626', label: 'Dụng cụ bếp' },
  { key: 'toiletry', IconComp: MdSoap, color: '#0ea5e9', label: 'Đồ vệ sinh / mỹ phẩm' },
  { key: 'electronics', IconComp: MdComputer, color: '#374151', label: 'Thiết bị điện nhỏ' },
  { key: 'box', IconComp: FaBoxOpen, color: '#92400e', label: 'Thùng carton chung' },
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

const SurveyInput = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [form] = Form.useForm();

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

  // 1. Tải danh sách Ticket
  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Backend: Lấy các ticket cần khảo sát hoặc đã khảo sát xong
      const res = await requestTicketService.getTickets({ status: 'WAITING_SURVEY,SURVEYED,QUOTED' });
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
    const olat = origin.lat, olng = origin.lng;
    const dlat = destination.lat, dlng = destination.lng;

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

    try {
      const res = await surveyService.getSurveyByTicket(ticket._id);
      console.log("DEBUG: LẤY ĐƯỢC SURVEY TỪ BE:", res);

      const surveyData = res.data?.data || res.data; // Phòng hờ BE trả về { success, data } hoặc nội dung trực tiếp

      if (surveyData && surveyData._id) {
        console.log("DEBUG: FILLING FORM WITH DATA:", surveyData);
        setIsInsuranceChecked(surveyData.insuranceRequired);

        // ── Parse items back into the 3 buckets ──────────────────────────────
        const restoredPrimary = [];
        const restoredSecondary = [];
        const restoredCritical = new Set();

        (surveyData.items || []).forEach(item => {
          const name = item.name || '';
          // Critical items: "⚠️ [ĐỒ QUAN TRỌNG] <label>"
          if (name.startsWith('⚠️ [ĐỒ QUAN TRỌNG]')) {
            const match = CRITICAL_ITEMS.find(c => name.includes(c.label));
            if (match) restoredCritical.add(match.key);
          }
          // Secondary items: "[SEC:key] label (tier)" — machine-readable prefix OR backward compat (includes label)
          else if (name.startsWith('[SEC:') || SECONDARY_CATALOG.some(c => name.includes(c.label))) {
            let key;
            if (name.startsWith('[SEC:')) {
              key = name.match(/^\[SEC:([^\]]+)\]/)?.[1];
            } else {
              key = SECONDARY_CATALOG.find(c => name.includes(c.label))?.key;
            }

            if (key) {
              const tierIdx = QTY_TIERS.findIndex(t => name.includes(`(${t.label})`));
              restoredSecondary.push({ key, tierIdx: tierIdx >= 0 ? tierIdx : 0 });
            } else {
              restoredPrimary.push(item);
            }
          }
          else {
            // Everything else is a primary item
            restoredPrimary.push(item);
          }
        });

        setCriticalItems(restoredCritical);
        setSecondaryItems(restoredSecondary);
        // ─────────────────────────────────────────────────────────────────────

        form.setFieldsValue({
          floors: surveyData.floors,
          carryMeter: surveyData.carryMeter,
          distanceKm: surveyData.distanceKm,
          hasElevator: surveyData.hasElevator,
          needsAssembling: surveyData.needsAssembling,
          needsPacking: surveyData.needsPacking,
          insuranceRequired: surveyData.insuranceRequired,
          declaredValue: surveyData.declaredValue,
          suggestedVehicle: surveyData.suggestedVehicle,
          suggestedStaffCount: surveyData.suggestedStaffCount,
          notes: surveyData.notes,
          items: restoredPrimary.length > 0 ? restoredPrimary : [{}]
        });
      } else {
        // Tính distanceKm tự động từ toạ độ
        let estimatedKm = 0;
        if (ticket.pickup?.coordinates && ticket.delivery?.coordinates) {
          estimatedKm = await getRouteDistance(ticket.pickup.coordinates, ticket.delivery.coordinates);
          estimatedKm = Math.round(estimatedKm * 10) / 10; // Làm tròn 1 chữ số thập phân
        }

        // Giá trị mặc định cho form mới
        form.setFieldsValue({
          floors: 0,
          carryMeter: 0,
          distanceKm: estimatedKm,
          items: [{}],
          suggestedStaffCount: 2
        });
      }
    } catch (error) {
      // Chưa có survey nào được tạo (lỗi 404 từ API getSurveyByTicket là bình thường với ticket mới)
      let estimatedKm = 0;
      if (ticket.pickup?.coordinates && ticket.delivery?.coordinates) {
        estimatedKm = await getRouteDistance(ticket.pickup.coordinates, ticket.delivery.coordinates);
        estimatedKm = Math.round(estimatedKm * 10) / 10;
      }

      form.setFieldsValue({
        floors: 0,
        carryMeter: 0,
        distanceKm: estimatedKm,
        items: [{}]
      });
    }

    setIsModalOpen(true);
  };

  // 3. Xử lý Lưu (Gọi API Complete)
  const handleSaveSurvey = async (values) => {
    try {
      // Build secondary items from added selections
      const secondaryItemsPayload = secondaryItems.map(({ key, tierIdx }) => {
        const catalog = SECONDARY_CATALOG.find(c => c.key === key);
        const tier = QTY_TIERS[tierIdx];
        return {
          // Use a stable machine-readable prefix so restore can reliably identify secondary items
          name: `[SEC:${key}] ${catalog?.label || key} (${tier.label})`,
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
          actualVolume: 0.1,
          actualWeight: 20,
          condition: 'FRAGILE',
          notes: 'Đồ vật quan trọng — cần xử lý đặc biệt'
        };
      });

      // Chuẩn hóa Payload khớp 100% với Schema SurveyData của Backend
      const payload = {
        // Các trường bắt buộc theo Controller
        suggestedVehicle: values.suggestedVehicle,
        suggestedStaffCount: values.suggestedStaffCount,
        distanceKm: values.distanceKm,

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
            actualVolume: item.actualVolume || 0,
            actualWeight: item.actualWeight || 0,
            condition: item.condition || 'GOOD',
            notes: item.notes || ''
          })) || []),
          ...secondaryItemsPayload,
          ...criticalItemsPayload
        ]
      };

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
          suggestedVehicle: res.data.suggestedVehicle,
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
      title: 'Mã Ticket',
      dataIndex: 'code',
      fontWeight: 'bold',
      render: (text) => <Text strong>{text}</Text>
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
        let color = 'blue';
        let label = 'Chờ khảo sát';
        if (status === 'SURVEYED') { color = 'cyan'; label = 'Đã khảo sát'; }
        if (status === 'QUOTED') { color = 'green'; label = 'Đã báo giá'; }
        if (status === 'ACCEPTED') { color = 'geekblue'; label = 'Đã chốt đơn'; }
        if (status === 'CONVERTED') { color = 'purple'; label = 'Đã tạo HĐ'; }
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      render: (_, record) => {
        const isReadOnly = ['QUOTED', 'ACCEPTED', 'CONVERTED'].includes(record.status);
        return (
          <Button
            type={isReadOnly ? "default" : "primary"}
            style={isReadOnly ? {} : { background: '#44624A', borderColor: '#44624A' }}
            icon={isReadOnly ? <EditOutlined /> : <EditOutlined />} // Cần đổi icon sang con mắt nếu xem
            onClick={() => openSurveyModal(record)}
          >
            {isReadOnly ? 'Xem Khảo Sát' : 'Nhập Khảo Sát'}
          </Button>
        );
      }
    }
  ];

  const isReadOnly = selectedTicket && ['QUOTED', 'ACCEPTED', 'CONVERTED'].includes(selectedTicket.status);

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
        width={1100}
        footer={null}
        centered
        title={<Title level={3} style={{ textAlign: 'center', color: '#44624A', margin: 0 }}>PHIẾU KHẢO SÁT: {selectedTicket?.code}</Title>}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveSurvey} style={{ marginTop: 20 }} disabled={isReadOnly}>
          <Row gutter={24}>

            {/* --- CỘT TRÁI: THÔNG TIN CHI TIẾT --- */}
            <Col span={9}>
              {/* 1. Địa hình & Vận chuyển */}
              <Card size="small" title="1. Địa hình & Vận chuyển" className="mb-3">
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

              {/* 2. Dịch vụ & Bảo hiểm */}
              <Card size="small" title="2. Dịch vụ & Bảo hiểm" style={{ marginTop: 16 }}>
                <Row>
                  <Col span={12}>
                    <Form.Item name="needsAssembling" valuePropName="checked" style={{ marginBottom: 5 }}>
                      <Checkbox>Cần tháo lắp</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="needsPacking" valuePropName="checked" style={{ marginBottom: 5 }}>
                      <Checkbox>Cần đóng gói</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
                <Divider style={{ margin: '10px 0' }} />
                <Form.Item name="insuranceRequired" valuePropName="checked" style={{ marginBottom: 10 }}>
                  <Checkbox onChange={(e) => setIsInsuranceChecked(e.target.checked)}>Mua bảo hiểm vận chuyển</Checkbox>
                </Form.Item>

                {isInsuranceChecked && (
                  <Form.Item
                    name="declaredValue"
                    label="Giá trị khai báo (VNĐ)"
                    rules={[{ required: true, message: 'Nhập giá trị hàng hóa' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                )}
              </Card>

              {/* 3. Đề xuất tài nguyên (Quan trọng cho tính giá) */}
              <Card
                size="small"
                title="3. Đề xuất Tài nguyên"
                extra={!isReadOnly && <Button type="dashed" size="small" style={{ color: '#1890ff', borderColor: '#1890ff' }} onClick={handleEstimate}>Tự động tính</Button>}
                style={{ marginTop: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}
              >
                <Form.Item
                  name="suggestedVehicle"
                  label="Loại xe tải đề xuất"
                  rules={[{ required: true, message: 'Vui lòng chọn xe' }]}
                >
                  <Select placeholder="Chọn loại xe">
                    <Option value="500KG">Xe 500 KG</Option>
                    <Option value="1TON">Xe 1 Tấn</Option>
                    <Option value="1.5TON">Xe 1.5 Tấn</Option>
                    <Option value="2TON">Xe 2 Tấn</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="suggestedStaffCount"
                  label="Số lượng nhân viên"
                  rules={[{ required: true, message: 'Nhập số nhân viên' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Card>

              <Form.Item name="notes" label="Ghi chú thêm" style={{ marginTop: 16 }}>
                <TextArea rows={3} placeholder="Ghi chú về địa hình, giờ giấc..." />
              </Form.Item>
            </Col>

            {/* --- CỘT PHẢI: DANH MỤC ĐỒ ĐẠC (2 PHẦN) --- */}
            <Col span={15} style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '24px', maxHeight: '72vh', overflowY: 'auto' }}>

              {/* ── 4A. ĐỒ ĐẠC CHÍNH ──────────────────────────────────── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Title level={5} style={{ margin: 0 }}>4A. Đồ đạc chính</Title>
                <Tag color="blue">Chọn từ danh mục hoặc tự nhập</Tag>
              </div>

              {/* Quick-add picker: category → preset → add */}
              {!isReadOnly && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#f8fdf8', border: '1px solid #d9f7be', borderRadius: 8, padding: '8px 10px', marginBottom: 10, flexWrap: 'wrap' }}>
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
                        style={{ background: '#52c41a', borderColor: '#52c41a' }}
                      >
                        Thêm
                      </Button>
                    )}
                  </Form.List>
                </div>
              )}

              {/* Primary items list */}
              <div style={{ background: '#fafafa', padding: '8px 10px', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                <Row gutter={6} style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 6, color: '#555' }}>
                  <Col span={9}>Tên đồ đạc</Col>
                  <Col span={4} style={{ textAlign: 'center' }}>ÐT (m³)</Col>
                  <Col span={4} style={{ textAlign: 'center' }}>KL (kg)</Col>
                  <Col span={5} style={{ textAlign: 'center' }}>Tình trạng</Col>
                  <Col span={2} />
                </Row>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  <Form.List name="items">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Row gutter={6} key={key} align="middle" style={{ marginBottom: 7 }}>
                            <Col span={9}>
                              <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: 'Nhập tên đồ' }]} style={{ marginBottom: 0 }}>
                                <Input size="small" placeholder="Tên đồ vật" />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item {...restField} name={[name, 'actualVolume']} style={{ marginBottom: 0 }}>
                                <InputNumber size="small" min={0} step={0.1} style={{ width: '100%' }} placeholder="m³" />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item {...restField} name={[name, 'actualWeight']} style={{ marginBottom: 0 }}>
                                <InputNumber size="small" min={0} style={{ width: '100%' }} placeholder="kg" />
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item {...restField} name={[name, 'condition']} style={{ marginBottom: 0 }}>
                                <Select size="small" defaultValue="GOOD">
                                  <Option value="GOOD">Tốt</Option>
                                  <Option value="FRAGILE">Dễ vỡ</Option>
                                  <Option value="DAMAGED">Hư hỏng</Option>
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col span={2} style={{ textAlign: 'center' }}>
                              {!isReadOnly && (
                                <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 14 }} onClick={() => remove(name)} />
                              )}
                            </Col>
                          </Row>
                        ))}
                        {!isReadOnly && (
                          <Button size="small" type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: 4 }}>
                            Thêm thủ công
                          </Button>
                        )}
                      </>
                    )}
                  </Form.List>
                </div>
              </div>

              {/* ── 4B. ĐỒ ĐẠC PHỤ ─────────────────────────── */}
              <Divider style={{ margin: '14px 0 10px' }} />
              <Title level={5} style={{ margin: '0 0 8px' }}>4B. Ðồ đạc phụ</Title>

              {/* Picker row */}
              {!isReadOnly && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '8px 10px', marginBottom: 10, flexWrap: 'wrap' }}>
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
                    style={{ background: '#faad14', borderColor: '#faad14' }}
                  >
                    Thêm
                  </Button>
                </div>
              )}

              {/* Selected secondary items chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 32 }}>
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

              {/* ── 4C. ĐỒ VẬT QUAN TRỌNG ──────────────────────────────── */}
              <Divider style={{ margin: '14px 0 10px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
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

            </Col>
          </Row>

          {/* FOOTER ACTIONS */}
          <div style={{ textAlign: 'right', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Đóng</Button>
              {!isReadOnly && (
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{ background: '#2D4F36', borderColor: '#2D4F36', minWidth: '150px' }}
                  icon={<SaveOutlined />}
                >
                  Hoàn Tất & Tính Giá
                </Button>
              )}
            </Space>
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default SurveyInput;