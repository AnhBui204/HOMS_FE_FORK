import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Layout,
  Steps,
  Card,
  Row,
  Col,
  Input,
  Button,
  Modal,
  DatePicker,
  message,
  Alert,
  Select,
  Checkbox,
  ConfigProvider,
} from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import { InfoCircleOutlined, DollarCircleOutlined, CheckCircleOutlined, CarOutlined } from '@ant-design/icons';
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import LocationPicker from "../../../components/LocationPicker/LocationPicker";
import api from "../../../services/api";
import { createOrder, getVehicles, getPriceEstimate } from "../../../services/orderService";

import "./style.css";

const { Content } = Layout;
const { TextArea } = Input;
const { Option } = Select;
const MAX_PORTERS = {
  "500KG": 1,
  "1TON": 2,
  "1.5TON": 3,
  "2TON": 4,
};

const CreateTruckRental = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [vehicles, setVehicles] = useState([]);
  // From navigation state ideally
  const serviceId = location.state?.serviceId || 4;

  // Pick-up location state
  const [pickupLocation, setPickupLocation] = useState(
    JSON.parse(sessionStorage.getItem("pickupLocation")) || null,
  );
  const [pickupDescription, setPickupDescription] = useState("");

  // Rental details
  const [truckType, setTruckType] = useState("1TON");
  // track selected vehicle by id so options with same vehicleType don't appear selected together
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [rentalDurationHours, setRentalDurationHours] = useState(2);
  const [extraStaffCount, setExtraStaffCount] = useState(0);
  const [needsPacking, setNeedsPacking] = useState(false);
  const [needsAssembling, setNeedsAssembling] = useState(false);

  // Schedule state
  const [movingDate, setMovingDate] = useState(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [priceEstimate, setPriceEstimate] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // compute distance (km) between two coords using Haversine formula
  const computeDistanceKm = (a, b) => {
    if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return 0;
    const toRad = (deg) => deg * (Math.PI / 180);
    const R = 6371; // earth km
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const aHarv = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
    const d = R * c;
    return Math.round(d * 10) / 10; // 1 decimal km
  };

  useEffect(() => {
    // Restore moving date if cached
    const savedDate = sessionStorage.getItem("movingDate");
    if (savedDate) setMovingDate(dayjs(savedDate));
  }, []);
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const data = await getVehicles();

        // chỉ lấy xe AVAILABLE
        const available = data.filter(v => v.status === "Available");

      setVehicles(available);
      // set default selected vehicle to first available
      if (available && available.length > 0) {
        setSelectedVehicleId(available[0]._id);
        setTruckType(available[0].vehicleType || truckType);
      }
    } catch (err) {
      message.error("Không tải được danh sách xe");
    }
  }, [truckType]);

  const handleLocationChange = (locationData) => {
    setPickupLocation(locationData);
    sessionStorage.setItem("pickupLocation", JSON.stringify(locationData));
    setErrors((prev) => ({ ...prev, pickupLocation: null }));
  };

  const handleNext = async () => {
    const newErrors = {};

    if (
      !pickupLocation ||
      !pickupLocation.lat ||
      !pickupLocation.lng ||
      !pickupLocation.address
    ) {
      newErrors.pickupLocation =
        "Vui lòng chọn địa điểm nhận xe hợp lệ từ bản đồ";
    }

    if (!movingDate) {
      newErrors.movingDate = "Vui lòng chọn ngày giờ nhận xe";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      message.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const now = dayjs();
    const selectedMovingDate = dayjs(movingDate);


    const hoursUntilMoving = selectedMovingDate.diff(now, 'hour', true);
    if (hoursUntilMoving < 2) {
      setErrors(prev => ({
        ...prev,
        movingDate: 'Thời gian nhận xe phải cách hiện tại ít nhất 2 tiếng'
      }));
      setIsSubmitting(false);
      return;
    }

    // Important: for ConfirmMovingOrder, we want dropoffLocation to be pickupLocation or null. Setting identical.
    const orderData = {
      serviceId,
      serviceName: "Thuê Xe Tải",
      pickupLocation,
      dropoffLocation: pickupLocation, // Both needed
      pickupDescription,
      movingDate: movingDate.toISOString(),
      moveType: "TRUCK_RENTAL",
      rentalDetails: {
        truckType,
        rentalDurationHours,
        extraStaffCount,
        needsPacking,
        needsAssembling,
      },
    };

    try {
      // compute distanceKm between pickup and dropoff (if dropoff provided)
      const dropoff = orderData.dropoffLocation || orderData.delivery || orderData.pickupLocation;
      const distanceKm = computeDistanceKm(orderData.pickupLocation, dropoff || orderData.pickupLocation);
      const payloadForEstimate = { ...orderData, distanceKm };

      // First request a price estimate
      const res = await getPriceEstimate(payloadForEstimate);
      const data = res?.data || res;
      setPriceEstimate(data);
      setConfirmVisible(true);
    } catch (error) {
      message.error(error?.message || 'Không thể tính báo giá. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!priceEstimate) return;
    setIsSubmitting(true);
    try {
      const response = await createOrder({
        serviceId,
        serviceName: 'Thuê Xe Tải',
        pickupLocation,
        dropoffLocation: pickupLocation,
        pickupDescription,
        movingDate: movingDate.toISOString(),
        moveType: 'TRUCK_RENTAL',
        rentalDetails: { truckType, rentalDurationHours, withDriver, selectedVehicleId: selectedVehicleId },
        distanceKm: computeDistanceKm(pickupLocation, pickupLocation),
        // include the price snapshot (subtotal/tax/totalPrice/depositAmount/breakdown)
        pricing: {
          subtotal: priceEstimate.subtotal,
          tax: priceEstimate.tax,
          totalPrice: priceEstimate.totalPrice,
          depositAmount: priceEstimate.depositAmount,
          breakdown: priceEstimate.breakdown
        }
      });
      message.success('Tạo đơn thuê xe thành công!');
      setConfirmVisible(false);
      navigate('/customer/order');
    } catch (err) {
      message.error(err?.message || 'Có lỗi khi tạo đơn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout className="create-order-layout">
      <AppHeader />
      <Content className="create-order-content">
        <main className="main-container">
          {/* HERO */}
          <section className="moving-hero" style={{ position: "relative" }}>
            <h1>Thuê Xe Tải</h1>
          </section>

          {/* STEPS */}
          <section className="service-steps-container">
            <Card className="steps-card">
              <Steps
                current={0}
                responsive
                items={[{ title: "Chọn Ngày & Xe" }, { title: "Xác nhận Đơn" }]}
              />
            </Card>
          </section>

          <section className="moving-location">
            <h1>Bạn Mong Muốn Nhận Xe Ở Đâu?</h1>
            <Row gutter={40}>
              <Col md={10} xs={24}>
                <Card className="location-card" bordered={false}>
                  <div className="location-form">
                    <h3>Địa điểm nhận xe</h3>
                    <Input
                      placeholder="Địa chỉ tự động từ bản đồ"
                      value={pickupLocation?.address}
                      prefix={<EnvironmentOutlined />}
                      readOnly
                      style={{ marginBottom: 15 }}
                    />
                    {errors.pickupLocation && (
                      <div
                        style={{
                          color: "#ff4d4f",
                          marginBottom: 15,
                          marginTop: -10,
                          fontSize: 13,
                        }}
                      >
                        {errors.pickupLocation}
                      </div>
                    )}

                    <TextArea
                      placeholder="Ghi chú thêm về địa điểm (vd: Xe có thể đậu trước hẻm)..."
                      value={pickupDescription}
                      onChange={(e) => setPickupDescription(e.target.value)}
                      rows={2}
                      style={{ marginBottom: 15 }}
                    />

               <h3>Loại xe</h3>
<Row gutter={10} style={{ marginBottom: 15 }}>
  {vehicles.map((v) => {
    const formatVehicleType = (type) => {
      if (!type) return '';
      // Normalize common codes like '1TON', '1.5TON', '2TON' to Vietnamese labels
      const t = String(type).toUpperCase();
      // replace 'TON' with ' TẤN'
      const human = t.replace(/TON$/, ' TẤN').replace(/\./g, '.');
      return human;
    };

    const label = `${formatVehicleType(v.vehicleType)} (${v.loadCapacity || "?"} kg)`;

    return (
      <Col span={12} key={v._id}>
        <Button
          type={selectedVehicleId === v._id ? "primary" : "default"}
          block
          onClick={() => {
            setSelectedVehicleId(v._id);
            setTruckType(v.vehicleType);
          }}
          style={{ height: 50 }}
        >
          {label}
        </Button>
      </Col>
    );
  })}
</Row>
<h3>Thời gian thuê</h3>
<Row gutter={10} style={{ marginBottom: 15 }}>
  {[2, 4, 8, 24].map((hour) => (
    <Col span={12} key={hour}>
      <Button
        type={rentalDurationHours === hour ? "primary" : "default"}
        block
        onClick={() => setRentalDurationHours(hour)}
        style={{ height: 45 }}
      >
        {hour === 24 ? "1 ngày" : `${hour} tiếng`}
      </Button>
    </Col>
  ))}
</Row>

<h3>Ngày giờ nhận xe</h3>
<ConfigProvider locale={viVN}>
  <DatePicker
    placeholder="Chọn ngày giờ"
    showTime={{ format: "HH:mm", minuteStep: 15 }}
    format="DD/MM/YYYY HH:mm"
    value={movingDate}
    onChange={(v) => {
      setMovingDate(v);
      if (v)
        sessionStorage.setItem("movingDate", v.toISOString());
      else sessionStorage.removeItem("movingDate");

      setErrors((prev) => ({
        ...prev,
        movingDate: null,
      }));
    }}
    disabledDate={(current) =>
      current && current < dayjs().startOf("day")
    }
    style={{ width: "100%", padding: "10px 14px" }}
  />
</ConfigProvider>

{errors.movingDate && (
  <div style={{ color: "#ff4d4f", marginTop: 5, fontSize: 13 }}>
    {errors.movingDate}
  </div>
)}

                  </div>
                </Card>
              </Col>

              <Col md={14} xs={24}>
                <div style={{ height: "700px" }}>
                  <LocationPicker
                    onLocationChange={handleLocationChange}
                    initialPosition={
                      pickupLocation
                        ? { lat: pickupLocation.lat, lng: pickupLocation.lng }
                        : null
                    }
                    currentLocationData={pickupLocation}
                    locationType="pickup"
                  />
                </div>
              </Col>
            </Row>
          </section>

          <div className="next-button">
            <Button
              type="primary"
              size="large"
              onClick={handleNext}
              loading={isSubmitting}
            >
              Tiếp tục đặt xe
            </Button>
          </div>
          {/* Confirm price modal */}
          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CarOutlined style={{ fontSize: 20, color: '#2D4F36' }} />
                <span>Xác nhận báo giá</span>
              </div>
            }
            open={confirmVisible}
            onCancel={() => setConfirmVisible(false)}
            centered
            footer={null}
            bodyStyle={{ padding: 20 }}
            className="price-modal"
          >
            {priceEstimate ? (
              <div className="price-modal-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <DollarCircleOutlined style={{ fontSize: 28, color: '#2D4F36' }} />
                  <div>
                    <div style={{ fontSize: 14, color: '#8c8c8c' }}>Phí thuê xe</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>{(priceEstimate.breakdown?.vehicleFee || priceEstimate.subtotal || 0).toLocaleString()} VNĐ</div>
                  </div>
                </div>

                {/* VAT and deposit rows */}
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#595959' }}>
                    <div>Thuế VAT</div>
                    <div>{(priceEstimate.tax || 0).toLocaleString()} VNĐ</div>
                  </div>

                  {priceEstimate.depositAmount ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#595959' }}>
                      <div>Cọc (30%)</div>
                      <div>{priceEstimate.depositAmount.toLocaleString()} VNĐ</div>
                    </div>
                  ) : null}
                </div>

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                  <div>Tổng</div>
                  <div>{(priceEstimate.totalPrice || 0).toLocaleString()} VNĐ</div>
                </div>

                <div style={{ marginTop: 12, color: '#595959' }}>
                  <InfoCircleOutlined style={{ color: '#8c8c8c', marginRight: 6 }} />
                  <span>Giá hiển thị hiện chỉ bao gồm phí xe và VAT. Các khoản phụ phí khác (nếu có) sẽ được thông báo.</span>
                </div>

                <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button onClick={() => setConfirmVisible(false)}>Hủy</Button>
                  <Button type="primary" onClick={handleConfirmCreate} loading={isSubmitting} style={{ background: '#2D4F36', borderColor: '#2D4F36' }}>
                    <CheckCircleOutlined />&nbsp;Xác nhận & Tạo đơn
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>Đang tải báo giá...</div>
            )}
          </Modal>
        </main>
      </Content>
      <AppFooter />
    </Layout>
  );
};

export default CreateTruckRental;
