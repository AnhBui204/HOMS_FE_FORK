import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Steps, Card, Row, Col, Input, Button, DatePicker, message, Alert, Tour, ConfigProvider, Popover } from "antd";
import { QuestionCircleOutlined, EnvironmentOutlined, StarOutlined, HourglassOutlined, BulbOutlined } from "@ant-design/icons";
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import LocationPicker from "../../../components/LocationPicker/LocationPicker";
import api from "../../../services/api";

import "./style.css";

const { Content } = Layout;
const { TextArea } = Input;

// Rough distance calculation between two coordinates (Haversine formula)
const calculateDistanceKm = (fromLocation, toLocation) => {
    if (!fromLocation?.lat || !fromLocation?.lng || !toLocation?.lat || !toLocation?.lng) return null;

    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius in km

    const lat1 = toRad(fromLocation.lat);
    const lat2 = toRad(toLocation.lat);
    const dLat = toRad(toLocation.lat - fromLocation.lat);
    const dLng = toRad(toLocation.lng - fromLocation.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    if (!Number.isFinite(distance) || distance <= 0) return null;
    return distance;
};

// Service mapping for development
const serviceDetails = {
    1: {
        title: 'Chuyển Nhà Trọn Gói',
        description: 'Khảo sát, đóng gói, tháo lắp nội thất, vận chuyển và sắp xếp tại nơi ở mới.'
    },
    // 2: {
    //     title: 'Chuyển Văn Phòng - Công Ty',
    //     description: 'Hỗ trợ di dời văn phòng, công ty nhanh chóng và chuyên nghiệp.'
    // },
    3: {
        title: 'Chuyển Đồ Đạc',
        description: 'Hỗ trợ di dời đồ đạc trong nhà, văn phòng nhanh chóng và chuyên nghiệp.'
    },
    3: {
        title: 'Thuê Xe Tải',
        description: 'Hỗ trợ di dời đồ đạc, văn phòng nhanh chóng và chuyên nghiệp.'
    }
};

const MovingInformationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get serviceId from navigation state, default to 1 if not provided
    const serviceId = location.state?.serviceId || 1;
    const selectedService = serviceDetails[serviceId] || serviceDetails[1];
    // Location state management with Session Storage caching
    const [activeLocation, setActiveLocation] = useState(() => {
        return sessionStorage.getItem('homs_activeLocation') || 'pickup';
    });
    const [pickupLocation, setPickupLocation] = useState(() => {
        const cached = sessionStorage.getItem('homs_pickupLocation');
        return cached ? JSON.parse(cached) : null;
    });
    const [dropoffLocation, setDropoffLocation] = useState(() => {
        const cached = sessionStorage.getItem('homs_dropoffLocation');
        return cached ? JSON.parse(cached) : null;
    });
    const [pickupDescription, setPickupDescription] = useState(() => {
        return sessionStorage.getItem('homs_pickupDescription') || '';
    });
    const [dropoffDescription, setDropoffDescription] = useState(() => {
        return sessionStorage.getItem('homs_dropoffDescription') || '';
    });
    const [movingDate, setMovingDate] = useState(() => {
        const cached = sessionStorage.getItem('homs_movingDate');
        return cached ? dayjs(cached) : null;
    });

    // AI "Best moving day" suggestion state
    const [bestSlot, setBestSlot] = useState(null);
    const [alternativeSlots, setAlternativeSlots] = useState([]);
    const [isRecommending, setIsRecommending] = useState(false);
    const [recommendError, setRecommendError] = useState(null);
    const [experimentGroup, setExperimentGroup] = useState(null);

    // Save state changes to Session Storage
    React.useEffect(() => {
        sessionStorage.setItem('homs_activeLocation', activeLocation);
        sessionStorage.setItem('homs_pickupDescription', pickupDescription);
        sessionStorage.setItem('homs_dropoffDescription', dropoffDescription);
        if (pickupLocation) sessionStorage.setItem('homs_pickupLocation', JSON.stringify(pickupLocation));
        if (dropoffLocation) sessionStorage.setItem('homs_dropoffLocation', JSON.stringify(dropoffLocation));
        if (movingDate) sessionStorage.setItem('homs_movingDate', movingDate.toISOString());
    }, [activeLocation, pickupLocation, dropoffLocation, pickupDescription, dropoffDescription, movingDate]);

    // AI "Best moving day" suggestion: trigger when user has time + both locations
    React.useEffect(() => {
        if (!pickupLocation || !dropoffLocation || !movingDate) {
            setBestSlot(null);
            setAlternativeSlots([]);
            setRecommendError(null);
            return;
        }

        const distanceKm = calculateDistanceKm(pickupLocation, dropoffLocation);
        if (!distanceKm) {
            setBestSlot(null);
            setAlternativeSlots([]);
            return;
        }

        let canceled = false;

        const fetchRecommendation = async () => {
            setIsRecommending(true);
            setRecommendError(null);
            try {
                const payload = {
                    scheduledDate: movingDate.toISOString(),
                    pickupAddress: pickupLocation.address,
                    distanceKm: Math.max(1, Number(distanceKm.toFixed(1)))
                };

                const res = await api.post('/public/best-moving-time', payload);
                if (!canceled && res.data?.success) {
                    const data = res.data.data || {};
                    setBestSlot(data.recommendedSlot || null);
                    setAlternativeSlots(data.alternatives || []);
                    setExperimentGroup(data.experimentGroup || null);
                }
            } catch (err) {
                console.error('Error fetching best moving time recommendation', err);
                if (!canceled) {
                    setRecommendError('Hiện không thể gợi ý thời gian chuyển tối ưu. Bạn vẫn có thể tiếp tục đặt lịch như bình thường.');
                }
            } finally {
                if (!canceled) {
                    setIsRecommending(false);
                }
            }
        };

        fetchRecommendation();

        return () => {
            canceled = true;
        };
    }, [pickupLocation, dropoffLocation, movingDate]);

    // Loading and error states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Handle location changes from map
    const handleLocationChange = (locationData) => {
        if (activeLocation === 'pickup') {
            setPickupLocation(locationData);
        } else {
            setDropoffLocation(locationData);
        }
    };

    // Product Tour Setup
    const refSteps = React.useRef(null);
    const refLocationToggle = React.useRef(null);
    const refDatePicker = React.useRef(null);
    const refMap = React.useRef(null);
    const refNextBtn = React.useRef(null);
    const [tourOpen, setTourOpen] = useState(false);

    React.useEffect(() => {
        if (!localStorage.getItem('hasSeenBookingTour')) {
            setTimeout(() => setTourOpen(true), 800);
            localStorage.setItem('hasSeenBookingTour', 'true');
        }
    }, []);

    const tourSteps = [
        {
            title: 'Tiến độ Đặt Lịch',
            description: 'Các bước bạn cần thực hiện để hoàn thành việc đặt dịch vụ.',
            target: () => refSteps.current,
        },
        {
            title: 'Bản Đồ Trực Quan',
            description: 'Bạn có thể tìm kiếm và ghim trực tiếp địa điểm bằng bản đồ tương tác này.',
            target: () => refMap.current,
        },
        {
            title: 'Chuyển Đổi Địa Điểm',
            description: 'Nhấp vào đây để luân phiên nhập thông tin giữa "Nơi chuyển đi" và "Nơi chuyển đến".',
            target: () => refLocationToggle.current,
        },
        {
            title: 'Thời Gian Chuyển',
            description: 'Lựa chọn ngày và giờ cụ thể bạn muốn chúng tôi thực hiện dịch vụ.',
            target: () => refDatePicker.current,
        },
        {
            title: 'Hoàn Tất & Xem Ước Tính',
            description: 'Sau khi đã kiểm tra kỹ thông tin, hãy nhấn "Tiếp theo" để tiếp tục.',
            target: () => refNextBtn.current,
        },
    ];

    const handleNext = async () => {
        let newErrors = {};

        // Validate required fields
        if (!pickupLocation || !pickupLocation.lat || !pickupLocation.lng || !pickupLocation.address) {
            newErrors.pickupLocation = 'Vui lòng chọn địa điểm chuyển đi hợp lệ từ bản đồ';
        }

        if (!dropoffLocation || !dropoffLocation.lat || !dropoffLocation.lng || !dropoffLocation.address) {
            newErrors.dropoffLocation = 'Vui lòng chọn địa điểm chuyển đến hợp lệ từ bản đồ';
        }

        // Check if pickup and dropoff are the same
        if (pickupLocation && dropoffLocation && pickupLocation.lat === dropoffLocation.lat && pickupLocation.lng === dropoffLocation.lng) {
            newErrors.locationMatch = 'Địa điểm chuyển đi và chuyển đến không thể giống nhau';
        }

        if (!movingDate) {
            newErrors.movingDate = 'Vui lòng chọn thời gian chuyển';
        } else {
            // Validate moving date is in the future
            const now = dayjs();
            const selectedMovingDate = dayjs(movingDate);

            if (selectedMovingDate.isBefore(now) || selectedMovingDate.isSame(now, 'minute')) {
                newErrors.movingDate = 'Thời gian chuyển phải sau thời điểm hiện tại';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            if (newErrors.pickupLocation && !newErrors.dropoffLocation && activeLocation === 'dropoff') {
                setActiveLocation('pickup');
            } else if (newErrors.dropoffLocation && !newErrors.pickupLocation && activeLocation === 'pickup') {
                setActiveLocation('dropoff');
            }
            return;
        }

        setErrors({});

        const now = dayjs();
        const selectedMovingDate = dayjs(movingDate);

        // Check if moving date is at least 2 hours from now (reasonable minimum)
        const hoursUntilMoving = selectedMovingDate.diff(now, 'hour', true);
        if (hoursUntilMoving < 2) {
            message.warning('Thời gian chuyển nên cách thời điểm hiện tại ít nhất 2 giờ để chúng tôi có thể chuẩn bị');
        }

        // Prepare order data to pass to next step
        const orderData = {
            serviceId,
            serviceName: selectedService.title,
            pickupLocation,
            dropoffLocation,
            pickupDescription,
            dropoffDescription,
            movingDate: movingDate.toISOString()
        };

        console.log('📦 Passing order data to confirmation/analysis:', orderData);

        // Navigate based on service type
        if (orderData.serviceId === 3) {
            navigate('/customer/item-moving-analysis', { state: { orderData } });
        } else {
            navigate('/customer/confirm-order', { state: { orderData } });
        }
    };

    return (
        <Layout className="moving-info-page">
            <AppHeader />

            <Content>

                {/* HERO */}
                <section className="moving-hero" style={{ position: 'relative' }}>
                    <h1>{selectedService.title}</h1>
                    <Button
                        type="primary"
                        icon={<QuestionCircleOutlined />}
                        onClick={() => setTourOpen(true)}
                        style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', borderColor: 'white', color: 'white' }}
                    >
                        Hướng dẫn đặt lịch
                    </Button>
                </section>

                {/* STEPS */}
                <section className="service-steps-container" ref={refSteps}>
                    <Card className="steps-card">
                        <Steps
                            current={1}
                            responsive
                            items={[
                                { title: 'Chọn dịch vụ' },
                                { title: 'Địa điểm & Thông tin đồ đạc' },
                                { title: 'Xác nhận lịch khảo sát' },
                                { title: 'Thỏa thuận' },
                            ]}
                        />
                    </Card>
                </section>

                {/* LOCATION SECTION */}
                <section className="moving-location">
                    <h1>Chúng Tôi Cần Biết Bạn Chuyển Từ Đâu Đến Đâu</h1>

                    <Row gutter={40}>
                        <Col md={10} xs={24}>
                            <Card className="location-card" bordered={false}>
                                <div className="location-form">
                                    <h3>
                                        {activeLocation === 'pickup' ? 'Địa điểm chuyển đi' : 'Địa điểm chuyển đến'}
                                    </h3>

                                    <Input
                                        placeholder="Địa chỉ tự động từ bản đồ"
                                        value={activeLocation === 'pickup' ? pickupLocation?.address : dropoffLocation?.address}
                                        prefix={<EnvironmentOutlined />}
                                        className="custom-input"
                                        readOnly
                                    />

                                    {activeLocation === 'pickup' && errors.pickupLocation && (
                                        <div style={{ color: '#ff4d4f', marginBottom: 15, marginTop: -10, fontSize: 13 }}>{errors.pickupLocation}</div>
                                    )}
                                    {activeLocation === 'dropoff' && errors.dropoffLocation && (
                                        <div style={{ color: '#ff4d4f', marginBottom: 15, marginTop: -10, fontSize: 13 }}>{errors.dropoffLocation}</div>
                                    )}
                                    {errors.locationMatch && (
                                        <div style={{ color: '#ff4d4f', marginBottom: 15, marginTop: -10, fontSize: 13 }}>{errors.locationMatch}</div>
                                    )}

                                    <div ref={refDatePicker} style={{ width: '100%', marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <DatePicker
                                                placeholder="Chọn thời gian"
                                                onChange={(date) => { setMovingDate(date); setErrors(prev => ({...prev, movingDate: null})); }}
                                                showTime
                                                status={errors.movingDate ? 'error' : ''}
                                                format="DD/MM/YYYY HH:mm"
                                                className="custom-input"
                                                style={{ width: '100%', marginBottom: 0 }}
                                                disabledDate={(current) => current && current.isBefore(dayjs().add(2, 'day').startOf('day'))}
                                                disabledTime={(current) => {
                                                    return {
                                                        disabledHours: () => {
                                                            const hours = [0, 1, 2, 3, 4, 5, 21, 22, 23]; // Only allow 6:00 to 20:00
                                                            const now = dayjs();
                                                            if (current && dayjs(current).isSame(now, 'day')) {
                                                                for (let i = 6; i < now.hour(); i++) {
                                                                    if (!hours.includes(i)) hours.push(i);
                                                                }
                                                            }
                                                            return hours;
                                                        },
                                                        disabledMinutes: (selectedHour) => {
                                                            const now = dayjs();
                                                            if (current && dayjs(current).isSame(now, 'day') && selectedHour === now.hour()) {
                                                                return [...Array(now.minute() + 1).keys()];
                                                            }
                                                            return [];
                                                        }
                                                    };
                                                }}
                                            />
                                            {errors.movingDate && (
                                                <div style={{ color: '#ff4d4f', marginTop: 5, fontSize: 13 }}>{errors.movingDate}</div>
                                            )}
                                        </div>

                                        {/* AI Floating Suggestion Badge & Popover */}
                                        {movingDate && (() => {
                                            const getAiLabelConfig = (label) => {
                                                switch(label) {
                                                    case 'BEST': return { color: '#44624a', bgText: '#6a8d71', text: 'TỐI ƯU', bg: '#f1f5f2', border: '#baccbe' };
                                                    case 'GOOD': return { color: '#096dd9', bgText: '#1890ff', text: 'KHÁ TỐT', bg: '#e6f7ff', border: '#91d5ff' };
                                                    case 'BAD': return { color: '#cf1322', bgText: '#ff4d4f', text: 'RỦI RO', bg: '#fff1f0', border: '#ffa39e' };
                                                    default: return { color: '#d48806', bgText: '#faad14', text: '? ĐANG TÍNH', bg: '#fffbe6', border: '#ffe58f' };
                                                }
                                            };
                                            const slotConfig = bestSlot ? getAiLabelConfig(bestSlot.label) : getAiLabelConfig('DEFAULT');

                                            const popoverContent = (
                                                <div style={{ width: '320px', maxWidth: '100%' }}>
                                                    {isRecommending && !bestSlot && (
                                                        <div style={{ fontSize: 13, color: '#888', padding: '10px 0' }}>
                                                            <HourglassOutlined /> Đang phân tích dữ liệu đa nguồn để tính toán điểm tối ưu...
                                                        </div>
                                                    )}

                                                    {recommendError && (
                                                        <Alert type="info" message={recommendError} showIcon style={{ marginBottom: 8 }} />
                                                    )}

                                                    {bestSlot && (
                                                        <div className="ai-suggestion-content">
                                                            <div style={{ marginBottom: 12, padding: '12px', background: '#fcfcfc', borderRadius: 6, border: `1px solid ${slotConfig.border}`, borderLeft: `5px solid ${slotConfig.color}` }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                                                    <div>
                                                                        <div style={{ fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 2 }}>Khung giờ: {dayjs(movingDate).format('HH:mm')}</div>
                                                                        <div style={{ fontSize: 16, fontWeight: 'bold', color: slotConfig.color }}>
                                                                            Mức độ: {slotConfig.text}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                {bestSlot.reasons && bestSlot.reasons.length > 0 && (
                                                                    <div style={{ background: slotConfig.bg, padding: '8px 12px', borderRadius: 4, marginBottom: 4 }}>
                                                                        <ul style={{ margin: '0 0 0 14px', padding: 0, fontSize: 13, color: '#333' }}>
                                                                            {bestSlot.reasons.map((r, i) => (
                                                                                <li key={i} style={{ marginBottom: 4 }}>{r}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {alternativeSlots && alternativeSlots.length > 0 && (
                                                                <div style={{ marginTop: 12 }}>
                                                                    <div style={{ fontSize: 13, color: '#555', marginBottom: 10, fontWeight: 500 }}>
                                                                        <BulbOutlined style={{ color: '#faad14' }} /> Đề xuất thay thế tốt hơn:
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                                        {alternativeSlots.map((slot, idx) => {
                                                                            const slotMoment = slot.date && slot.time ? dayjs(`${slot.date}T${slot.time}`) : null;
                                                                            const isSelected = slotMoment && movingDate && slotMoment.isSame(movingDate, 'minute');
                                                                            const altConfig = getAiLabelConfig(slot.label);
                                                                            return (
                                                                                <Button
                                                                                    key={idx}
                                                                                    size="middle"
                                                                                    onClick={() => {
                                                                                        if (!slotMoment) return;
                                                                                        setMovingDate(slotMoment);
                                                                                        setErrors(prev => ({ ...prev, movingDate: null }));
                                                                                    }}
                                                                                    style={{ 
                                                                                        flex: '1 1 auto',
                                                                                        height: 'auto',
                                                                                        padding: '6px',
                                                                                        borderRadius: 6, 
                                                                                        borderColor: isSelected ? altConfig.color : altConfig.border,
                                                                                        background: isSelected ? altConfig.color : '#fff',
                                                                                        color: isSelected ? '#fff' : altConfig.color,
                                                                                        transition: 'all 0.3s'
                                                                                    }}
                                                                                >
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
                                                                                        <span style={{ fontSize: 14, fontWeight: 600 }}>{slotMoment ? slotMoment.format('HH:mm') : '—'}</span>
                                                                                        <span style={{ fontSize: 11, opacity: isSelected ? 0.9 : 0.7 }}>{slotMoment ? slotMoment.format('DD/MM') : ''}</span>
                                                                                    </div>
                                                                                </Button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );

                                            return (
                                                <Popover
                                                    content={popoverContent}
                                                    title={<span style={{ color: bestSlot ? slotConfig.color : '#333', fontWeight: 600 }}><StarOutlined /> Đánh giá từ hệ thống</span>}
                                                    trigger="click"
                                                    placement="rightTop"
                                                >
                                                    <div style={{ 
                                                        cursor: 'pointer', 
                                                        padding: '6px 12px', 
                                                        background: slotConfig.bg, 
                                                        border: `1px solid ${slotConfig.border}`,
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        minWidth: '90px',
                                                        height: '45px', // matches DatePicker height generally
                                                        transition: 'all 0.3s'
                                                    }}>
                                                        <span style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>Đánh giá thời gian</span>
                                                        <span style={{ fontSize: 13, fontWeight: 'bold', color: slotConfig.color }}>
                                                            {isRecommending ? 'ĐANG TÍNH...' : slotConfig.text}
                                                        </span>
                                                    </div>
                                                </Popover>
                                            );
                                        })()}
                                    </div>

                                    <Alert
                                        message="Lưu ý đặt lịch"
                                        description="Để đảm bảo chất lượng phục vụ tốt nhất, thời gian chuyển nhà cần được đặt cách thời điểm hiện tại ít nhất 2 ngày. Lịch khảo sát bắt buộc phải diễn ra trước ngày chuyển nhà tối thiểu 1 ngày (24 giờ) để chúng tôi chuẩn bị phương tiện và nhân sự."
                                        type="info"
                                        showIcon
                                        style={{ marginBottom: '15px', borderRadius: '8px' }}
                                    />

                                    <TextArea
                                        rows={3}
                                        placeholder="Mô tả sơ bộ (tầng, thang máy, đường dẫn vào nơi chuyển...)"
                                        className="custom-input"
                                        value={activeLocation === 'pickup' ? pickupDescription : dropoffDescription}
                                        onChange={(e) => activeLocation === 'pickup'
                                            ? setPickupDescription(e.target.value)
                                            : setDropoffDescription(e.target.value)
                                        }
                                    />

                                    <div className="location-switch-group" ref={refLocationToggle}>
                                        <Button
                                            type={activeLocation === 'pickup' ? 'primary' : 'default'}
                                            onClick={() => setActiveLocation('pickup')}
                                            className={activeLocation === 'pickup' ? 'segment-btn active' : 'segment-btn'}
                                        >
                                            Nơi chuyển đi
                                        </Button>
                                        <Button
                                            type={activeLocation === 'dropoff' ? 'primary' : 'default'}
                                            onClick={() => setActiveLocation('dropoff')}
                                            className={activeLocation === 'dropoff' ? 'segment-btn active' : 'segment-btn'}
                                        >
                                            Nơi chuyển đến
                                        </Button>
                                    </div>

                                    {pickupLocation && dropoffLocation && (
                                        <div className="location-summary">
                                            <p><strong>Từ:</strong> {pickupLocation.address?.substring(0, 150)}</p>
                                            <p><strong>Đến:</strong> {dropoffLocation.address?.substring(0, 150)}</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </Col>

                        <Col md={14} xs={24}>
                            <div ref={refMap} style={{ height: '100%' }}>
                                <LocationPicker
                                    onLocationChange={handleLocationChange}
                                    initialPosition={
                                        activeLocation === 'pickup'
                                            ? (pickupLocation ? { lat: pickupLocation.lat, lng: pickupLocation.lng } : null)
                                            : (dropoffLocation ? { lat: dropoffLocation.lat, lng: dropoffLocation.lng } : null)
                                    }
                                    currentLocationData={
                                        activeLocation === 'pickup' ? pickupLocation : dropoffLocation
                                    }
                                    otherLocation={
                                        activeLocation === 'pickup' ? dropoffLocation : pickupLocation
                                    }
                                    locationType={activeLocation}
                                />
                            </div>
                        </Col>
                    </Row>
                </section>

                {/* ITEMS SECTION TEMPORARILY DISABLED: item details will be collected by survey staff after onsite survey */}

                <div className="next-button" ref={refNextBtn}>
                    <Button
                        type="primary"
                        size="large"
                        onClick={handleNext}
                        loading={isSubmitting}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Đang xử lý...' : 'Tiếp theo'}
                    </Button>
                </div>

            </Content>

            <ConfigProvider locale={viVN}>
                <Tour open={tourOpen} onClose={() => setTourOpen(false)} steps={tourSteps} />
            </ConfigProvider>

            <AppFooter />
        </Layout>
    );
};

export default React.memo(MovingInformationPage);
