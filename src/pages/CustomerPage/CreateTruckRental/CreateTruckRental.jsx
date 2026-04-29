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
  Select,
  Checkbox,
  ConfigProvider,
} from "antd";
import {
  EnvironmentOutlined,
  InfoCircleOutlined,
  DollarCircleOutlined,
  CheckCircleOutlined,
  CarOutlined
} from '@ant-design/icons';
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import LocationPicker from "../../../components/LocationPicker/LocationPicker";
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
  const serviceId = location.state?.serviceId || 4;

  const [pickupLocation, setPickupLocation] = useState(
    JSON.parse(sessionStorage.getItem("pickupLocation")) || null,
  );
  const [pickupDescription, setPickupDescription] = useState("");

  const [truckType, setTruckType] = useState("1TON");
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [rentalDurationHours, setRentalDurationHours] = useState(2);
  const [extraStaffCount, setExtraStaffCount] = useState(0);
  const [needsPacking, setNeedsPacking] = useState(false);
  const [needsAssembling, setNeedsAssembling] = useState(false);

  const [movingDate, setMovingDate] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [priceEstimate, setPriceEstimate] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const computeDistanceKm = (a, b) => {
    if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return 0;
    const toRad = (deg) => deg * (Math.PI / 180);
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const aHarv = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
    const d = R * c;
    return Math.round(d * 10) / 10;
  };

  useEffect(() => {
    const savedDate = sessionStorage.getItem("movingDate");
    if (savedDate) setMovingDate(dayjs(savedDate));
  }, []);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const data = await getVehicles();
        const available = data.filter(v => v.status === "Available");
        setVehicles(available);
        if (available && available.length > 0) {
          setSelectedVehicleId(available[0]._id);
          setTruckType(available[0].vehicleType || truckType);
        }
      } catch (err) {
        message.error("Không tải được danh sách xe");
      }
    };
    fetchVehicles();
  }, []);

  useEffect(() => {
    const limit = MAX_PORTERS[truckType] || 0;
    if (extraStaffCount > limit) {
      setExtraStaffCount(limit);
    }
  }, [truckType, extraStaffCount]);

  const handleLocationChange = (locationData) => {
    setPickupLocation(locationData);
    sessionStorage.setItem("pickupLocation", JSON.stringify(locationData));
    setErrors((prev) => ({ ...prev, pickupLocation: null }));
  };

  const handleNext = async () => {
    const newErrors = {};
    if (!pickupLocation || !pickupLocation.lat || !pickupLocation.lng || !pickupLocation.address) {
      newErrors.pickupLocation = "Vui lòng chọn địa điểm nhận xe hợp lệ từ bản đồ";
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
    if (selectedMovingDate.diff(now, 'hour', true) < 2) {
      setErrors(prev => ({ ...prev, movingDate: 'Thời gian nhận xe phải cách hiện tại ít nhất 2 tiếng' }));
      setIsSubmitting(false);
      return;
    }

    const orderData = {
      serviceId,
      serviceName: "Thuê Xe Tải",
      pickupLocation,
      dropoffLocation: pickupLocation,
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
      const res = await getPriceEstimate(orderData);
      setPriceEstimate(res.data || res);
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
      await createOrder({
        serviceId,
        serviceName: 'Thuê Xe Tải',
        pickupLocation,
        dropoffLocation: pickupLocation,
        pickupDescription,
        movingDate: movingDate.toISOString(),
        moveType: 'TRUCK_RENTAL',
        rentalDetails: {
          truckType,
          rentalDurationHours,
          extraStaffCount,
          needsPacking,
          needsAssembling,
          selectedVehicleId
        },
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
          <section className="moving-hero" style={{ position: "relative" }}>
            <h1>Thuê Xe Tải</h1>
          </section>

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
                      <div style={{ color: "#ff4d4f", marginBottom: 15, marginTop: -10, fontSize: 13 }}>
                        {errors.pickupLocation}
                      </div>
                    )}

                    <TextArea
                      placeholder="Ghi chú thêm về địa điểm..."
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
                          const t = String(type).toUpperCase();
                          return t.replace(/TON$/, ' TẤN');
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
                          if (v) sessionStorage.setItem("movingDate", v.toISOString());
                          else sessionStorage.removeItem("movingDate");
                          setErrors((prev) => ({ ...prev, movingDate: null }));
                        }}
                        disabledDate={(current) => current && current < dayjs().startOf("day")}
                        style={{ width: "100%", padding: "10px 14px" }}
                      />
                    </ConfigProvider>
                    {errors.movingDate && (
                      <div style={{ color: "#ff4d4f", marginTop: 5, fontSize: 13 }}>
                        {errors.movingDate}
                      </div>
                    )}

                    <div style={{ marginTop: 20 }}>
                      <h3>Dịch vụ bổ sung</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 14 }}>Số lượng nhân viên bốc xếp bổ sung:</span>
                          <Select
                            value={extraStaffCount}
                            onChange={v => setExtraStaffCount(v)}
                            style={{ width: 120 }}
                          >
                            {Array.from({ length: (MAX_PORTERS[truckType] || 0) + 1 }, (_, i) => i).map(n => (
                              <Option key={n} value={n}>{n === 0 ? "Không có" : `${n} người`}</Option>
                            ))}
                          </Select>
                        </div>
                        <Checkbox checked={needsPacking} onChange={e => setNeedsPacking(e.target.checked)}>
                          Dịch vụ đóng gói đồ đạc
                        </Checkbox>
                        <Checkbox checked={needsAssembling} onChange={e => setNeedsAssembling(e.target.checked)}>
                          Dịch vụ tháo lắp
                        </Checkbox>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col md={14} xs={24}>
                <div style={{ height: "700px" }}>
                  <LocationPicker
                    onLocationChange={handleLocationChange}
                    initialPosition={pickupLocation ? { lat: pickupLocation.lat, lng: pickupLocation.lng } : null}
                    currentLocationData={pickupLocation}
                    locationType="pickup"
                  />
                </div>
              </Col>
            </Row>
          </section>

          <div className="next-button">
            <Button type="primary" size="large" onClick={handleNext} loading={isSubmitting}>
              Tiếp tục đặt xe
            </Button>
          </div>

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
                <div style={{ marginBottom: 15, borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#595959' }}><CarOutlined /> Phí thuê xe ({priceEstimate.breakdown?.suggestedVehicles?.map(v => `${v.count}x${v.vehicleType}`).join(' + ') || priceEstimate.breakdown?.suggestedVehicle})</span>
                    <span style={{ fontWeight: 600 }}>{(priceEstimate.breakdown?.vehicleFee || 0).toLocaleString()} ₫</span>
                  </div>

                  {(priceEstimate.breakdown?.laborFee > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#595959' }}>Phí nhân công ({priceEstimate.breakdown?.suggestedStaffCount - 1} người)</span>
                      <span style={{ fontWeight: 600 }}>{(priceEstimate.breakdown.laborFee).toLocaleString()} ₫</span>
                    </div>
                  )}

                  {(priceEstimate.breakdown?.assemblingFee > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#595959' }}>Phí tháo lắp</span>
                      <span style={{ fontWeight: 600 }}>{(priceEstimate.breakdown.assemblingFee).toLocaleString()} ₫</span>
                    </div>
                  )}

                  {(priceEstimate.breakdown?.packingFee > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#595959' }}>Phí đóng gói</span>
                      <span style={{ fontWeight: 600 }}>{(priceEstimate.breakdown.packingFee).toLocaleString()} ₫</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#595959' }}>
                    <div>Tạm tính</div>
                    <div>{(priceEstimate.subtotal || 0).toLocaleString()} ₫</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#595959' }}>
                    <div>Thuế VAT (10%)</div>
                    <div>{(priceEstimate.tax || 0).toLocaleString()} ₫</div>
                  </div>
                  {priceEstimate.depositAmount ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8c8c8c', fontStyle: 'italic' }}>
                      <div>Tiền cọc dự kiến (30%)</div>
                      <div>{priceEstimate.depositAmount.toLocaleString()} ₫</div>
                    </div>
                  ) : null}
                </div>

                <div style={{ marginTop: 15, paddingTop: 10, borderTop: '2px solid #2D4F36', display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                  <div style={{ color: '#2D4F36' }}>TỔNG CỘNG</div>
                  <div style={{ color: '#2D4F36' }}>{(priceEstimate.totalPrice || 0).toLocaleString()} ₫</div>
                </div>

                <div style={{ marginTop: 12, padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, fontSize: 12, color: '#d46b08' }}>
                  <InfoCircleOutlined style={{ marginRight: 6 }} />
                  <span>Đây là giá tạm tính dựa trên thông tin bạn cung cấp. Dispatcher sẽ kiểm tra lại và gửi báo giá chính thức.</span>
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
