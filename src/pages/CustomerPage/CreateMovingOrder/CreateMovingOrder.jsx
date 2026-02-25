import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Steps, Card, Row, Col, Input, Button, DatePicker, message, Spin } from "antd";
import { BedDouble, Sofa, Armchair, Refrigerator, Tv, WashingMachine, Package, Plus, Minus, Home, ImagePlus, HelpCircle, Building2, Monitor, Printer, FileText, Server, Laptop } from "lucide-react";
import { EnvironmentOutlined, CalendarOutlined } from "@ant-design/icons";

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import LocationPicker from "../../../components/LocationPicker/LocationPicker";
import ImageUploadEstimator from "../../../components/ImageUploadEstimator";
import { createOrder } from "../../../services/orderService";

import "./style.css";

const { Content } = Layout;
const { TextArea } = Input;

// Service mapping for development
const serviceDetails = {
    1: {
        title: 'Chuyển Nhà Trọn Gói',
        description: 'Khảo sát, đóng gói, tháo lắp nội thất, vận chuyển và sắp xếp tại nơi ở mới.'
    },
    2: {
        title: 'Chuyển Văn Phòng - Công Ty',
        description: 'Hỗ trợ di dời văn phòng, công ty nhanh chóng và chuyên nghiệp.'
    },
    3: {
        title: 'Chuyển Đồ Đạc',
        description: 'Hỗ trợ di dời đồ đạc trong nhà, văn phòng nhanh chóng và chuyên nghiệp.'
    },
    4: {
        title: 'Thuê Xe Tải',
        description: 'Hỗ trợ di dời đồ đạc, văn phòng nhanh chóng và chuyên nghiệp.'
    }
};

// Service-specific content configurations
const serviceContent = {
    1: { // Chuyển Nhà Trọn Gói
        sizeLabel: 'Kích thước nhà',
        sizeOptions: [
            { icon: Home, label: '2 Phòng ngủ\n1 Bếp' },
            { icon: Home, label: '3 Phòng ngủ\n1 Bếp' },
            { icon: Home, label: '4 Phòng ngủ\n1 Bếp' }
        ],
        itemsLabel: 'Đồ nội thất',
        items: [
            { icon: BedDouble, label: 'Giường', className: 'bed' },
            { icon: Sofa, label: 'Sofa', className: 'sofa' },
            { icon: Armchair, label: 'Ghế', className: 'chair' },
            { icon: Package, label: 'Tủ quần áo', className: 'wardrobe' },
            { icon: Refrigerator, label: 'Tủ lạnh', className: 'fridge' },
            { icon: Tv, label: 'TV', className: 'tv' },
            { icon: WashingMachine, label: 'Máy giặt', className: 'washing' }
        ],
        notePlaceholder: 'Két sắt, server, piano...',
        uploadTooltip: [
            'Chụp ảnh rõ nét để AI có thể nhận diện chính xác các món đồ của bạn.',
            'Chụp riêng các đồ cồng kềnh (tủ, giường, máy giặt…)',
            'Tránh ảnh mờ, thiếu sáng. Có thể chụp nhiều góc cho cùng một món đồ'
        ]
    },
    2: { // Chuyển Văn Phòng - Công Ty
        sizeLabel: 'Quy mô văn phòng',
        sizeOptions: [
            { icon: Building2, label: '< 50m²\n10-15 nhân viên' },
            { icon: Building2, label: '50-100m²\n15-30 nhân viên' },
            { icon: Building2, label: '> 100m²\n30+ nhân viên' }
        ],
        itemsLabel: 'Thiết bị văn phòng',
        items: [
            { icon: Armchair, label: 'Bàn làm việc', className: 'desk' },
            { icon: Armchair, label: 'Ghế văn phòng', className: 'office-chair' },
            { icon: Monitor, label: 'Máy tính', className: 'computer' },
            { icon: Printer, label: 'Máy in', className: 'printer' },
            { icon: FileText, label: 'Tủ hồ sơ', className: 'filing' },
            { icon: Server, label: 'Server', className: 'server' },
            { icon: Laptop, label: 'Laptop', className: 'laptop' }
        ],
        notePlaceholder: 'Thiết bị chuyên dụng, tủ server, két sắt, bảng điện tử...',
        uploadTooltip: [
            'Chụp ảnh toàn cảnh văn phòng và từng khu vực làm việc.',
            'Chụp rõ các thiết bị cần di chuyển (máy tính, máy in, tủ tài liệu, server…)',
            'Tránh ảnh mờ, thiếu sáng. Có thể chụp nhiều góc để AI ước tính chính xác hơn'
        ]
    }
};

const MovingInformationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get serviceId from navigation state, default to 1 if not provided
    const serviceId = location.state?.serviceId || 1;
    const selectedService = serviceDetails[serviceId] || serviceDetails[1];
    const content = serviceContent[serviceId] || serviceContent[1];

    // Location state management
    const [activeLocation, setActiveLocation] = useState('pickup'); // 'pickup' or 'dropoff'
    const [pickupLocation, setPickupLocation] = useState(null);
    const [dropoffLocation, setDropoffLocation] = useState(null);
    const [pickupDescription, setPickupDescription] = useState('');
    const [dropoffDescription, setDropoffDescription] = useState('');
    const [movingDate, setMovingDate] = useState(null);
    
    // AI detected items from images
    const [aiDetectedItems, setAiDetectedItems] = useState({});
    
    // Manual item selection
    const [selectedHouseSize, setSelectedHouseSize] = useState(0); // Index of selected house size
    const [manualItems, setManualItems] = useState({}); // { itemClassName: quantity }
    const [packedBoxes, setPackedBoxes] = useState(0);
    const [additionalNotes, setAdditionalNotes] = useState('');
    
    // Loading and error states
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle location changes from map
    const handleLocationChange = (locationData) => {
        if (activeLocation === 'pickup') {
            setPickupLocation(locationData);
        } else {
            setDropoffLocation(locationData);
        }
    };
    
    // Handle AI detected items from images
    const handleItemsDetected = (detectedItems) => {
        setAiDetectedItems(detectedItems);
        console.log('AI detected items:', detectedItems);
    };
    
    // Handle manual item selection
    const handleItemClick = (itemClassName) => {
        setManualItems(prev => {
            const currentCount = prev[itemClassName] || 0;
            if (currentCount === 0) {
                return { ...prev, [itemClassName]: 1 };
            }
            return prev;
        });
    };
    
    const incrementItem = (itemClassName, e) => {
        e.stopPropagation();
        setManualItems(prev => ({
            ...prev,
            [itemClassName]: (prev[itemClassName] || 0) + 1
        }));
    };
    
    const decrementItem = (itemClassName, e) => {
        e.stopPropagation();
        setManualItems(prev => {
            const newCount = (prev[itemClassName] || 0) - 1;
            if (newCount <= 0) {
                const { [itemClassName]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [itemClassName]: newCount };
        });
    };
    
    // Calculate total selected items
    const totalManualItems = Object.values(manualItems).reduce((sum, count) => sum + count, 0);

    const handleNext = async () => {
        // Validate required fields
        if (!pickupLocation) {
            message.error('Vui lòng chọn địa điểm chuyển đi');
            return;
        }
        
        if (!dropoffLocation) {
            message.error('Vui lòng chọn địa điểm chuyển đến');
            return;
        }
        
        if (!movingDate) {
            message.error('Vui lòng chọn thời gian chuyển');
            return;
        }
        
        // Check if at least some items are specified
        if (totalManualItems === 0 && packedBoxes === 0 && Object.keys(aiDetectedItems).length === 0) {
            message.warning('Vui lòng chọn đồ đạc cần chuyển hoặc tải ảnh lên để AI ước tính');
            return;
        }
        
        // Prepare data to send to backend
        const orderData = {
            serviceId,
            pickupLocation,
            dropoffLocation,
            pickupDescription,
            dropoffDescription,
            movingDate: movingDate.toISOString(),
            aiDetectedItems,
            manualItems,
            houseSize: content.sizeOptions[selectedHouseSize]?.label || null,
            packedBoxes,
            additionalNotes
        };
        
        console.log('📦 Submitting order data:', orderData);
        
        try {
            setIsSubmitting(true);
            
            // Submit to backend
            const response = await createOrder(orderData);
            
            console.log('✅ Order created successfully:', response);
            
            message.success(response.message || 'Yêu cầu dịch vụ đã được tạo thành công!');
            
            // Navigate to confirmation page with ticket info
            navigate('/customer/confirm-order', { 
                state: { 
                    orderData,
                    ticketInfo: response.data
                } 
            });
            
        } catch (error) {
            console.error('❌ Error creating order:', error);
            
            const errorMessage = error.message || error.error || 'Có lỗi xảy ra khi tạo yêu cầu. Vui lòng thử lại.';
            message.error(errorMessage);
            
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout className="moving-info-page">
            <AppHeader />

            <Content>

                {/* HERO */}
                <section className="moving-hero">
                    <h1>{selectedService.title}</h1>
                </section>

                {/* STEPS */}
                <section className="service-steps-container">
                    <Card className="steps-card">
                        <Steps
                            current={1}
                            responsive
                            items={[
                                { title: 'Chọn dịch vụ' },
                                { title: 'Địa điểm & Thông tin đồ đạc' },
                                { title: 'Xác nhận' },
                                { title: 'Đặt cọc' },
                            ]}
                        />
                    </Card>
                </section>

                {/* LOCATION SECTION */}
                <section className="moving-location">
                    <h1>Chúng Tôi Cần Biết Bạn Chuyển Từ Đâu Đến Đâu</h1>

                    <Row gutter={40}>
                        <Col md={10} xs={24}>
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

                                <DatePicker
                                    placeholder="Chọn thời gian"
                                    onChange={(date) => setMovingDate(date)}
                                    showTime
                                    format="DD/MM/YYYY HH:mm"
                                    className="custom-input"
                                    style={{ width: '100%' }}
                                />

                                <TextArea
                                    rows={3}
                                    placeholder="Mô tả sơ bộ (tầng, thang máy, đường vào...)"
                                    className="custom-input"
                                    value={activeLocation === 'pickup' ? pickupDescription : dropoffDescription}
                                    onChange={(e) => activeLocation === 'pickup' 
                                        ? setPickupDescription(e.target.value) 
                                        : setDropoffDescription(e.target.value)
                                    }
                                />

                                <div className="location-switch">
                                    <Button 
                                        type={activeLocation === 'pickup' ? 'primary' : 'default'}
                                        onClick={() => setActiveLocation('pickup')}
                                    >
                                        Nơi chuyển đi
                                    </Button>
                                    <Button 
                                        type={activeLocation === 'dropoff' ? 'primary' : 'default'}
                                        onClick={() => setActiveLocation('dropoff')}
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
                        </Col>

                        <Col md={14} xs={24}>
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
                        </Col>
                    </Row>
                </section>

                {/* ITEMS SECTION */}
                <section className="moving-items">
                    <h1>Cho Chúng Tôi Biết Bạn Cần Chuyển Những Gì</h1>

                    <ImageUploadEstimator 
                        onItemsDetected={handleItemsDetected}
                        serviceType={serviceId}
                    />

                    <div className="manual-section">
                        <h2> Hoặc nhập thủ công nếu bạn cần kiểm soát chi tiết </h2>

                        <Row gutter={60}>
                            {/* LEFT SIDE */}
                            <Col md={12} xs={24}>
                                <div className="house-size">
                                    <h4>{content.sizeLabel}</h4>

                                    <div className="house-options">
                                        {content.sizeOptions.map((option, index) => {
                                            const IconComponent = option.icon;
                                            return (
                                                <div 
                                                    key={index} 
                                                    className={`house-card ${selectedHouseSize === index ? 'active' : ''}`}
                                                    onClick={() => setSelectedHouseSize(index)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <IconComponent size={40} />
                                                    <span>{option.label}</span>
                                                </div>
                                            );
                                        })}

                                        <div className="house-card add" style={{ cursor: 'pointer' }}>
                                            <Plus size={40} />
                                            <span>Thêm</span>
                                        </div>
                                    </div>
                                </div>
                            </Col>

                            {/* RIGHT SIDE */}
                            <Col md={12} xs={24}>
                                <div className="furniture-section">
                                    <div className="furniture-header">
                                        <h4>{content.itemsLabel}</h4>
                                        {totalManualItems > 0 && (
                                            <div className="selected-badge">
                                                {totalManualItems} Đồ vật ×
                                            </div>
                                        )}
                                    </div>

                                    <div className="furniture-grid">
                                        {content.items.map((item, index) => {
                                            const IconComponent = item.icon;
                                            const itemCount = manualItems[item.className] || 0;
                                            const isSelected = itemCount > 0;
                                            
                                            return (
                                                <div 
                                                    key={index} 
                                                    className={`furniture-item ${item.className} ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => handleItemClick(item.className)}
                                                    style={{ cursor: 'pointer', position: 'relative' }}
                                                >
                                                    <IconComponent size={28} />
                                                    <span>{item.label}</span>
                                                    {isSelected && (
                                                        <div className="item-counter">
                                                            <button 
                                                                className="counter-btn minus"
                                                                onClick={(e) => decrementItem(item.className, e)}
                                                            >
                                                                <Minus size={14} />
                                                            </button>
                                                            <span className="count">{itemCount}</span>
                                                            <button 
                                                                className="counter-btn plus"
                                                                onClick={(e) => incrementItem(item.className, e)}
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        <div className="furniture-item add" style={{ cursor: 'pointer' }}>
                                            <Plus size={28} />
                                            <span>Thêm</span>
                                        </div>
                                    </div>

                                    {/* Counter */}
                                    <div className="counter-section">
                                        <span>Các thùng đã đóng gói</span>
                                        <div className="counter">
                                            <button onClick={() => setPackedBoxes(Math.max(0, packedBoxes - 1))}>
                                                <Minus size={18} />
                                            </button>
                                            <span>{packedBoxes}</span>
                                            <button onClick={() => setPackedBoxes(packedBoxes + 1)}>
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        {/* NOTE SECTION */}
                        <div className="note-section">
                            <TextArea
                                rows={6}
                                placeholder={content.notePlaceholder}
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="next-button">
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
                </section>

            </Content>

            <AppFooter />
        </Layout>
    );
};

export default React.memo(MovingInformationPage);
