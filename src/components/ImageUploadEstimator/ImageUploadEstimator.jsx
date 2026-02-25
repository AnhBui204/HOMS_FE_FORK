import React, { useState, useRef, useEffect } from 'react';
import { Upload, Button, Card, Tag, Spin, Alert, Progress } from 'antd';
import { ImagePlus, X, CheckCircle2, Loader2 } from 'lucide-react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import './ImageUploadEstimator.css';

const ImageUploadEstimator = ({ onItemsDetected, serviceType = 1 }) => {
    const [uploadedImages, setUploadedImages] = useState([]);
    const [detecting, setDetecting] = useState(false);
    const [model, setModel] = useState(null);
    const [loadingModel, setLoadingModel] = useState(false);
    const [detectedItems, setDetectedItems] = useState({});
    const [modelProgress, setModelProgress] = useState(0);
    const fileInputRef = useRef(null);

    // Mapping COCO-SSD detected objects to furniture/office items
    const itemMapping = {
        // Household furniture
        'bed': { key: 'bed', label: 'Giường', category: 'furniture' },
        'couch': { key: 'sofa', label: 'Sofa', category: 'furniture' },
        'chair': { key: 'chair', label: 'Ghế', category: 'furniture' },
        'dining table': { key: 'table', label: 'Bàn ăn', category: 'furniture' },
        'refrigerator': { key: 'fridge', label: 'Tủ lạnh', category: 'appliance' },
        'tv': { key: 'tv', label: 'TV', category: 'electronics' },
        'laptop': { key: 'laptop', label: 'Laptop', category: 'electronics' },
        'keyboard': { key: 'computer', label: 'Máy tính', category: 'electronics' },
        'mouse': { key: 'computer', label: 'Máy tính', category: 'electronics' },
        'microwave': { key: 'microwave', label: 'Lò vi sóng', category: 'appliance' },
        'oven': { key: 'oven', label: 'Lò nướng', category: 'appliance' },
        'sink': { key: 'sink', label: 'Bồn rửa', category: 'fixture' },
        'book': { key: 'books', label: 'Sách', category: 'items' },
        'clock': { key: 'clock', label: 'Đồng hồ', category: 'items' },
        'painting': { key: 'painting', label: 'Tranh ảnh', category: 'items' },
        'vase': { key: 'vase', label: 'Bình hoa', category: 'items' },
        'potted plant': { key: 'plant', label: 'Cây cảnh', category: 'items' },
        'bottle': { key: 'bottles', label: 'Chai lọ', category: 'items' },
        'cup': { key: 'cups', label: 'Cốc chén', category: 'items' },
        'bowl': { key: 'bowls', label: 'Bát đĩa', category: 'items' },
        'backpack': { key: 'bags', label: 'Túi xách', category: 'items' },
        'handbag': { key: 'bags', label: 'Túi xách', category: 'items' },
        'suitcase': { key: 'luggage', label: 'Vali', category: 'items' },
    };

    // Load COCO-SSD model on component mount
    useEffect(() => {
        loadModel();
    }, []);

    const loadModel = async () => {
        try {
            setLoadingModel(true);
            setModelProgress(10);

            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setModelProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 300);

            const loadedModel = await cocoSsd.load();

            clearInterval(progressInterval);
            setModelProgress(100);
            setModel(loadedModel);
            setLoadingModel(false);
        } catch (error) {
            console.error('Error loading AI model:', error);
            setLoadingModel(false);
        }
    };

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files || []);
        processFiles(files);
    };

    const processFiles = (files) => {
        const imageFiles = files.filter(file =>
            file.type.startsWith('image/') || file.type === 'image/jpeg' || file.type === 'image/png'
        );

        if (imageFiles.length === 0) {
            alert('Vui lòng chọn file hình ảnh (JPG, PNG)');
            return;
        }

        const newImages = imageFiles.map(file => ({
            id: Date.now() + Math.random(),
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            detected: false,
            items: []
        }));

        setUploadedImages(prev => [...prev, ...newImages]);

        // Auto-detect items in uploaded images
        newImages.forEach(img => detectItems(img));
    };

    const detectItems = async (image) => {
        if (!model) {
            console.log('Model not loaded yet');
            return;
        }

        setDetecting(true);

        try {
            // Create image element for detection
            const img = new Image();
            img.src = image.preview;

            await new Promise((resolve) => {
                img.onload = resolve;
            });

            // Detect objects
            const predictions = await model.detect(img);
            
            console.log(`Image "${image.name}": Found ${predictions.length} predictions`);
            predictions.forEach(pred => {
                console.log(`  - ${pred.class} (${(pred.score * 100).toFixed(1)}% confidence)`);
            });

            // Map detected objects to furniture items
            const confidenceThreshold = 0.4; // Lower threshold to detect more items
            const items = predictions
                .filter(pred => {
                    const passedThreshold = pred.score > confidenceThreshold;
                    if (!passedThreshold) {
                        console.log(`  ✗ Filtered out ${pred.class} (${(pred.score * 100).toFixed(1)}% < ${confidenceThreshold * 100}%)`);
                    }
                    return passedThreshold;
                })
                .map(pred => ({
                    class: pred.class,
                    confidence: pred.score,
                    mapped: itemMapping[pred.class]
                }))
                .filter(item => {
                    if (!item.mapped) {
                        console.log(`  ℹ️ Skipping ${item.class} (not in furniture/item mapping)`);
                    }
                    return item.mapped;
                }); // Only items we care about
            
            console.log(`  ✓ Mapped ${items.length} relevant items for counting`);

            // Update image with detected items
            setUploadedImages(prev =>
                prev.map(img =>
                    img.id === image.id
                        ? { ...img, detected: true, items }
                        : img
                )
            );

            // Note: Item counting happens automatically via useEffect when uploadedImages changes

        } catch (error) {
            console.error('Error detecting items:', error);
        } finally {
            setDetecting(false);
        }
    };

    const updateDetectedItemsCounts = () => {
        const itemCounts = {};

        uploadedImages.forEach(image => {
            if (image.items) {
                image.items.forEach(item => {
                    if (item.mapped) {
                        const key = item.mapped.key;
                        itemCounts[key] = (itemCounts[key] || 0) + 1;
                    }
                });
            }
        });
        
        console.log('📊 Total detected items across all images:', itemCounts);

        setDetectedItems(itemCounts);

        // Notify parent component
        if (onItemsDetected) {
            onItemsDetected(itemCounts);
        }
    };

    useEffect(() => {
        updateDetectedItemsCounts();
    }, [uploadedImages]);

    const removeImage = (imageId) => {
        setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // Calculate total detected items
    const totalItems = Object.values(detectedItems).reduce((sum, count) => sum + count, 0);

    return (
        <div className="image-upload-estimator">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {loadingModel && (
                <Alert
                    message="Đang tải AI model..."
                    description={
                        <div>
                            <Progress percent={modelProgress} status="active" />
                            <p style={{ marginTop: 8, fontSize: 12 }}>Vui lòng đợi trong giây lát...</p>
                        </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            {!loadingModel && model && uploadedImages.length === 0 && (
                <div className="upload-placeholder" onClick={handleUploadClick}>
                    <ImagePlus size={50} className="upload-icon" />
                    <h3>Chụp ảnh để AI ước tính nhanh chóng</h3>
                    <p>Chụp rõ từng món đồ hoặc toàn cảnh phòng để hệ thống tự động<br />ước tính khối lượng và công việc cần thiết.</p>
                    <Button type="primary" size="large" icon={<ImagePlus size={18} />}>
                        Tải ảnh lên
                    </Button>
                    <span className="file-hint">Hỗ trợ định dạng JPG, PNG tối đa 200MB</span>
                </div>
            )}

            {uploadedImages.length > 0 && (
                <div className="uploaded-images-section">
                    <div className="section-header">
                        <h3>
                            {detecting && <Loader2 size={18} className="spin-icon" />}
                            Ảnh đã tải lên ({uploadedImages.length})
                        </h3>
                        <Button onClick={handleUploadClick} disabled={detecting}>
                            <ImagePlus size={16} /> Thêm ảnh
                        </Button>
                    </div>

                    <div className="images-grid">
                        {uploadedImages.map(image => (
                            <Card
                                key={image.id}
                                className="image-card"
                                cover={
                                    <div className="image-preview-wrapper">
                                        <img src={image.preview} alt={image.name} />
                                        <button
                                            className="remove-btn"
                                            onClick={() => removeImage(image.id)}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                }
                            >
                                <div className="image-info">
                                    <div className="image-name">{image.name}</div>
                                    {image.detected && (
                                        <div className="detected-status">
                                            <CheckCircle2 size={14} className="check-icon" />
                                            <span>{image.items.length} đối tượng</span>
                                        </div>
                                    )}
                                    {!image.detected && detecting && (
                                        <div className="detecting-status">
                                            <Spin size="small" />
                                            <span>Đang phân tích...</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {totalItems > 0 && (
                        <div className="detected-items-summary">
                            <h4>📦 AI đã phát hiện {totalItems} món đồ:</h4>
                            <div className="items-tags">
                                {Object.entries(detectedItems).map(([key, count]) => {
                                    const mappedItem = Object.values(itemMapping).find(item => item.key === key);
                                    return (
                                        <Tag key={key} color="blue" className="item-tag">
                                            {mappedItem?.label || key}: {count}
                                        </Tag>
                                    );
                                })}
                            </div>
                            <p className="estimation-note">
                                ℹ️ Đây là ước tính tự động. Bạn có thể điều chỉnh chi tiết bên dưới.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageUploadEstimator;
