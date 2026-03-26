import React, { useEffect, useState } from 'react';
import { Modal, Row, Col, Typography, Divider, Table, Spin, Alert, Avatar, Tag, Button } from 'antd';
import adminInvoiceService from '../../../services/adminInvoiceService';

const { Title, Text } = Typography;
const primaryColor = '#44624A';

const hexToRgba = (hex, alpha = 1) => {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const EinvoiceModal = ({ visible, invoiceId, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    // download button temporarily removed

    useEffect(() => {
        if (visible && invoiceId) {
            fetchData(invoiceId);
        } else {
            setData(null);
            setError(null);
        }
    }, [visible, invoiceId]);

    const fetchData = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const resp = await adminInvoiceService.getEinvoice(id);
            setData(resp && resp.data ? resp.data : resp);
        } catch (err) {
            console.error('Failed to fetch einvoice', err);
            setError(err.response?.data?.message || err.message || 'Lỗi tải hoá đơn');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Mục', dataIndex: 'description', key: 'description' },
        { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' },
        { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', width: 140, align: 'right', render: v => formatCurrency(v) },
        { title: 'Thành tiền', dataIndex: 'total', key: 'total', width: 160, align: 'right', render: v => formatCurrency(v) }
    ];

    const formatCurrency = (v) => v != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v)) : '—';

    return (
        <Modal
            visible={visible}
            width={860}
            centered
            title={data ? `Hóa đơn ${data.invoice?.code || ''}` : 'Hóa đơn điện tử'}
            onCancel={onClose}
            // footer: Download functionality temporarily disabled per request
            footer={[
                <Button key="close" onClick={onClose}>Đóng</Button>
            ]}
        >
            {loading ? <div style={{ textAlign: 'center' }}><Spin /></div> : null}
            {error ? <Alert type="error" message={error} /> : null}

            {data && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {data.company?.logo ? (
                                <img src={data.company.logo} alt="logo" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 6, background: '#fff' }} />
                            ) : (
                                <Avatar size={72} style={{ background: primaryColor, verticalAlign: 'middle', fontSize: 28 }}>{(data.company?.name || 'HOMS').slice(0,1)}</Avatar>
                            )}
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>{data.company?.name || 'HOMS'}</div>
                                {/* show address if provided and not the placeholder; otherwise show email in the address slot */}
                                {(() => {
                                    const companyEmail = data.company?.email || 'homsmovinghouse@gmail.com';
                                    const companyAddress = data.company?.address;
                                    const hasAddress = companyAddress && companyAddress !== 'Your company address';
                                    return (
                                        <>
                                            <div style={{ marginTop: 6, color: '#444' }}>{hasAddress ? companyAddress : companyEmail}</div>
                                            <div style={{ marginTop: 4, color: '#666' }}>{data.company?.phone ? `${data.company.phone}` : (hasAddress ? (data.company?.email ? `• ${data.company.email}` : '') : '')}{hasAddress && data.company?.email ? ` • ${data.company.email}` : ''}</div>
                                        </>
                                    );
                                })()}
                                {data.company?.taxNumber ? <div style={{ marginTop: 6, color: '#666' }}>MST: {data.company.taxNumber}</div> : null}
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', minWidth: 220 }}>
                            <div style={{ background: hexToRgba(primaryColor, 0.06), padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: primaryColor }}>HÓA ĐƠN</div>
                                <div style={{ marginTop: 8 }}>Mã: <Text strong>{data.invoice?.code}</Text></div>
                                <div>Ngày: <Text>{data.invoice?.date ? new Date(data.invoice.date).toLocaleString() : '—'}</Text></div>
                                {data.invoice?.status ? <div style={{ marginTop: 8 }}><Tag color="blue">{data.invoice.status}</Tag></div> : null}
                            </div>
                        </div>
                    </div>

                    <Divider />

                    <Row gutter={16} style={{ marginBottom: 8 }}>
                        <Col span={12}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>Thông tin khách hàng</div>
                            <div style={{ marginTop: 6, fontWeight: 700 }}>{data.customer?.fullName || '—'}</div>
                            <div style={{ color: '#666', marginTop: 4 }}>{data.customer?.phone || ''} {data.customer?.email ? `• ${data.customer.email}` : ''}</div>
                            {data.customer?.taxNumber ? <div style={{ marginTop: 6, color: '#666' }}>MST: {data.customer.taxNumber}</div> : null}
                        </Col>
                        <Col span={12}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>Địa chỉ</div>
                            <div style={{ marginTop: 6 }}><div><strong>Nhận:</strong> {data.delivery?.address || '—'}</div><div style={{ marginTop: 6 }}><strong>Lấy:</strong> {data.pickup?.address || '—'}</div></div>
                        </Col>
                    </Row>

                    <Table
                        columns={columns}
                        dataSource={(Array.isArray(data.items) ? data.items : []).map((it, idx) => ({ ...it, key: it.id || idx }))}
                        rowKey={r => r.id || r.key}
                        pagination={false}
                        bordered
                        style={{ marginTop: 12 }}
                        size="small"
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            {data.invoice?.notes ? (
                                <div style={{ fontSize: 13, color: '#444' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Ghi chú</div>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{data.invoice.notes}</div>
                                </div>
                            ) : null}
                        </div>

                        <div style={{ width: 340 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div>Tạm tính</div>
                                <div>{formatCurrency(data.totals?.subtotal)}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div>Giảm giá</div>
                                <div>{formatCurrency(data.totals?.discount)}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div>Thuế (VAT)</div>
                                <div>{formatCurrency(data.totals?.tax)}</div>
                            </div>
                            <Divider style={{ margin: '8px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
                                <div>Tổng cộng</div>
                                <div>{formatCurrency(data.totals?.total)}</div>
                            </div>
                            {/* Show payment status instead of literal "Đã thanh toán" label + amount */}
                            {(() => {
                                const payStatus = data.invoice?.paymentStatus || data.paymentStatus || (data.totals?.paidAmount ? 'PAID' : 'UNPAID');
                                const map = { PAID: ['green', 'Đã thanh toán'], PARTIAL: ['orange', 'Thanh toán một phần'], UNPAID: ['default', 'Chưa thanh toán'] };
                                const info = map[payStatus] || ['default', String(payStatus)];
                                return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                        <div>Trạng thái thanh toán</div>
                                        <div>{info[0] === 'default' ? <Tag>{info[1]}</Tag> : <Tag color={info[0]}>{info[1]}</Tag>}</div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    <Divider />

                </div>
            )}
        </Modal>
    );
};

export default EinvoiceModal;
