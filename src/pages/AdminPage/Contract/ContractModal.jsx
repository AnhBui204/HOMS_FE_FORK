import React, { useEffect, useState } from 'react';
import { Modal, Form, Descriptions, Card, Divider, Typography, Spin } from 'antd';
import adminContractService from '../../../services/adminContractService';
import dayjs from 'dayjs';
import './ContractModal.css';

const { Title, Text } = Typography;

const ContractModal = ({ open, contractId, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [contract, setContract] = useState(null);

    useEffect(() => {
        if (!open) return;
        if (!contractId) return;

        let mounted = true;
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await adminContractService.getContractById(contractId);
                const data = res && res.success ? res.data : res;
                if (mounted) {
                    setContract(data);
                    // helpful debug: show signature payloads so we can inspect server format
                    console.debug('contract detail (modal):', data);
                }
            } catch (err) {
                console.error('Error fetching contract detail in modal', err);
                if (mounted) setContract(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetch();
        return () => { mounted = false; };
    }, [open, contractId]);

    // Helper to normalize signature image src. Back-end may store either a full URL, a data URI, or raw base64 string.
    const getImageSrc = (img) => {
        if (!img) return null;
        // If it's an object (e.g., { type: 'Buffer', data: [...] } or { data: [...] })
        if (typeof img === 'object') {
            const maybeData = img.data || img.buffer || img.content || img.base64;
            // If data is an array of bytes (Buffer serialized), convert to base64
            if (Array.isArray(maybeData) && maybeData.length) {
                try {
                    const u8 = new Uint8Array(maybeData);
                    let binary = '';
                    const chunkSize = 0x8000;
                    for (let i = 0; i < u8.length; i += chunkSize) {
                        binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunkSize));
                    }
                    const b64 = typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(u8).toString('base64');
                    return `data:image/png;base64,${b64}`;
                } catch (e) {
                    console.warn('Failed to convert signature byte array to base64', e);
                }
            }
            // If object has a base64 string
            if (typeof maybeData === 'string' && maybeData.trim()) {
                const s = maybeData.trim();
                if (s.startsWith('data:')) return s;
                // assume base64
                return `data:image/png;base64,${s}`;
            }
            return null;
        }

        // string handling
        if (typeof img !== 'string') return null;
        const trimmed = img.trim();
        // If already a data URI or a URL, return as-is
        if (/^data:\w+\/(png|jpeg|jpg|gif);base64,/.test(trimmed) || /^https?:\/\//.test(trimmed)) return trimmed;
        // If it looks like base64 (contains only base64 chars and reasonably long), prefix with png data URI
        const base64Like = /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed) && trimmed.length > 100;
        if (base64Like) return `data:image/png;base64,${trimmed}`;
        // Fallback: return original string
        return trimmed;
    };

    return (
        <Modal
            title={contract ? `Chi tiết hợp đồng: ${contract.contractNumber || contract._id}` : 'Chi tiết hợp đồng'}
            open={open}
            onCancel={onClose}
            footer={null}
            width={800}
            centered
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : contract ? (
                <div>
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Mã hợp đồng">{contract.contractNumber || contract._id}</Descriptions.Item>
                        <Descriptions.Item label="Khách hàng">{contract.customerId?.fullName || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Mẫu hợp đồng">{contract.templateId?.title || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Ngày tạo">{contract.createdAt ? dayjs(contract.createdAt).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">{contract.status || 'N/A'}</Descriptions.Item>
                    </Descriptions>

                    <Divider />

                    <Title level={5}>Nội dung hợp đồng</Title>
                    <Card size="small" style={{ marginTop: 12 }}>
                        {contract.content ? (
                            <div className="contract-content">
                                <div className="contract-box">
                                    {/* Optional short summary extracted by BE or displayed here */}
                                    <div className="contract-summary">
                                        <strong>{contract.contractNumber || ''}</strong>
                                        {contract.customerId?.fullName ? ` — Khách hàng: ${contract.customerId.fullName}` : ''}
                                    </div>
                                    <div className="contract-body" dangerouslySetInnerHTML={{ __html: contract.content }} />
                                </div>
                            </div>
                        ) : (
                            <Text type="secondary">Không có nội dung hợp đồng để hiển thị.</Text>
                        )}
                    </Card>

                    <Divider />

                    <Title level={5}>Chữ ký</Title>
                    <div className="contract-signatures">
                        <Card size="small" title="Chữ ký khách hàng">
                            {contract.customerSignature?.signatureImage ? (
                                <div>
                                    <div className="sig-box">
                                        <img
                                            src={getImageSrc(contract.customerSignature.signatureImage)}
                                            alt="customer-sign"
                                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'pointer' }}
                                            onClick={() => {
                                                const s = getImageSrc(contract.customerSignature.signatureImage);
                                                if (s) window.open(s, '_blank');
                                            }}
                                        />
                                    </div>
                                    <div className="sig-meta">
                                        {contract.customerSignature.signedAt ? (
                                            <Text type="secondary">Đã ký: {dayjs(contract.customerSignature.signedAt).format('DD/MM/YYYY')}</Text>
                                        ) : (
                                            <Text type="secondary">Ngày ký: N/A</Text>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <Text type="secondary">Đang chờ</Text>
                            )}
                        </Card>
                        <Card size="small" title="Chữ ký quản trị">
                            {contract.adminSignature?.signatureImage ? (
                                <div>
                                    <div className="sig-box">
                                        <img
                                            src={getImageSrc(contract.adminSignature.signatureImage)}
                                            alt="admin-sign"
                                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'pointer' }}
                                            onClick={() => {
                                                const s = getImageSrc(contract.adminSignature.signatureImage);
                                                if (s) window.open(s, '_blank');
                                            }}
                                        />
                                    </div>
                                    <div className="sig-meta">
                                        {contract.adminSignature.signedAt ? (
                                            <Text type="secondary">Đã ký: {dayjs(contract.adminSignature.signedAt).format('DD/MM/YYYY')}</Text>
                                        ) : (
                                            <Text type="secondary">Ngày ký: N/A</Text>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <Text type="secondary">Đang chờ</Text>
                            )}
                        </Card>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: 20 }}>
                    <Text type="secondary">Không tìm thấy chi tiết hợp đồng.</Text>
                </div>
            )}
        </Modal>
    );
};

export default ContractModal;
