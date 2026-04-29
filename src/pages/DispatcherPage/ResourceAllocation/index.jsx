import React from 'react';
import { Table, Button, Typography, Tag, Modal, Form, Space, Row, Col, Spin as AntdSpin, message } from 'antd';
import { CarOutlined, ReloadOutlined } from '@ant-design/icons';

import { useResourceAllocation } from './useResourceAllocation';
import OrderSummaryCard from './OrderSummaryCard';
import PersonnelFormCard from './PersonnelFormCard';
import DispatchPlanCard from './DispatchPlanCard';
import InsufficientResourcesModal from './InsufficientResourcesModal';
import ResourceMap from '../../../components/ResourceMap/ResourceMap';
import './ResourceAllocation.css';

const { Title, Text } = Typography;

const ResourceAllocation = () => {
    const {
        invoices, loading,
        isModalVisible, selectedInvoice, submitting,
        isResolutionModalVisible, insufficientResourcesData,
        form, vehicleType, dispatchTime, currentLeaderId, currentDriverIds, currentStaffIds,
        totalHours, missingStaffCount, originalHours, penaltyHours,
        drivers, staff, vehicleStats,
        allAdminRoutes, mapCoords,
        setReloadTrigger,
        showDispatchModal,
        handleCancel,
        handleSubmit,
        handleForceProceed,
        handleExternalStaffProceed,
        handleAutoRebuildTeam,
        handlePickAlternativeTime,
        handleAutoFill,
        setIsResolutionModalVisible,
    } = useResourceAllocation();

    const columns = [
        { title: 'Mã Hóa Đơn', dataIndex: 'code', key: 'code', render: (text) => <Text strong>{text}</Text> },
        { title: 'Mã Yêu Cầu', dataIndex: ['requestTicketId', 'code'], key: 'ticketCode' },
        { title: 'Khách hàng', dataIndex: ['customerId', 'fullName'], key: 'customerName' },
        { title: 'Địa chỉ lấy', dataIndex: ['requestTicketId', 'pickup', 'address'], key: 'pickup', ellipsis: true },
        { title: 'Địa chỉ giao', dataIndex: ['requestTicketId', 'delivery', 'address'], key: 'delivery', ellipsis: true },
        {
            title: 'Trạng thái', dataIndex: 'status', key: 'status',
            render: (status) => <Tag color="blue">{status === 'CONFIRMED' ? 'Đã xác nhận' : status}</Tag>
        },
        {
            title: 'Thao tác', key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    style={{ background: '#44624a' }}
                    icon={<CarOutlined />}
                    onClick={() => showDispatchModal(record)}
                >
                    Điều phối
                </Button>
            )
        }
    ];

    return (
        <div className="ra-page">
            {/* Page header */}
            <div className="ra-page-header">
                <Title level={4} style={{ margin: 0 }}>Điều phối Xe & Đội ngũ bốc xếp</Title>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                        setReloadTrigger(prev => prev + 1);
                        message.success('Đã làm mới dữ liệu tổng quan!');
                    }}
                >
                    Làm mới
                </Button>
            </div>

            <Table columns={columns} dataSource={invoices} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />

            {/* ── Dispatch Modal ───────────────────────────────────────── */}
            <Modal
                title={
                    <Space>
                        <CarOutlined style={{ color: '#44624a' }} />
                        <span>Điều phối tài nguyên Vận chuyển</span>
                        <Tag color="#44624a">{selectedInvoice?.code}</Tag>
                    </Space>
                }
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={1500}
                centered
                style={{ paddingBottom: 0 }}
                styles={{ body: { maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' } }}
                destroyOnClose={true}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={(values) => handleSubmit(values, false)}
                    initialValues={{ vehicleCount: 1 }}
                >
                    <Row gutter={[24, 0]} align="top">
                        {/* ── Left panel: order summary + personnel config ── */}
                        <Col span={10}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                <OrderSummaryCard selectedInvoice={selectedInvoice} />

                                <PersonnelFormCard
                                    selectedInvoice={selectedInvoice}
                                    drivers={drivers}
                                    staff={staff}
                                    currentLeaderId={currentLeaderId}
                                    currentDriverIds={currentDriverIds}
                                    currentStaffIds={currentStaffIds}
                                    totalHours={totalHours}
                                    missingStaffCount={missingStaffCount}
                                    originalHours={originalHours}
                                    penaltyHours={penaltyHours}
                                    handleAutoFill={handleAutoFill}
                                    setReloadTrigger={setReloadTrigger}
                                />
                            </div>
                        </Col>

                        {/* ── Right panel: map + dispatch plan ── */}
                        <Col span={14}>
                            <div className="ra-map-container">
                                {isModalVisible && mapCoords.pickup && mapCoords.delivery ? (
                                    <ResourceMap
                                        pickup={mapCoords.pickup}
                                        delivery={mapCoords.delivery}
                                        allRoutes={allAdminRoutes}
                                        vehicleType={vehicleType}
                                        dispatchTime={dispatchTime}
                                    />
                                ) : (
                                    <div className="ra-map-loading">
                                        <AntdSpin size="large" />
                                        <span style={{ color: '#8c8c8c', marginTop: 12 }}>Đang chuẩn bị bản đồ địa hình...</span>
                                    </div>
                                )}
                            </div>

                            <DispatchPlanCard
                                vehicleStats={vehicleStats}
                                submitting={submitting}
                                handleCancel={handleCancel}
                                form={form}
                                totalHours={totalHours}
                            />
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* ── Insufficient Resources Modal ─────────────────────────── */}
            <InsufficientResourcesModal
                open={isResolutionModalVisible}
                onClose={() => setIsResolutionModalVisible(false)}
                data={insufficientResourcesData}
                submitting={submitting}
                onRebuildTeam={handleAutoRebuildTeam}
                onPickAlternativeTime={handlePickAlternativeTime}
                onForceProceed={handleForceProceed}
                onExternalStaff={handleExternalStaffProceed}
            />
        </div>
    );
};

export default ResourceAllocation;
