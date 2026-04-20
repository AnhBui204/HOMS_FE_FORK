import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, message, Typography, Space } from 'antd';
import { CheckCircleOutlined, CopyOutlined, UserAddOutlined } from '@ant-design/icons';
import adminUserService from '../../../../services/adminUserService';

const { Option } = Select;

const DANANG_DISTRICTS = [
    'Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang'
];

const UserModal = ({ visible, onClose, onSuccess, user }) => {
    const [form] = Form.useForm();
    const role = Form.useWatch('role', form);

    useEffect(() => {
        // Initialize form when modal opens. When editing a user, prefill fields.
        // When creating a new user, reset fields and set the default password display.
        if (visible) {
            if (user) {
                form.setFieldsValue({
                    fullName: user.fullName,
                    email: user.email,
                    phoneNumber: user.phone || user.phoneNumber,
                    role: user.role,
                    status: user.status,
                    workingAreas: user.dispatcherProfile?.workingAreas || []
                });
            } else {
                // reset first, then set default non-editable password
                form.resetFields();
                form.setFieldsValue({ password: 'User123@' });
            }
        }
    }, [visible, user, form]);

    // Ensure the confirmation modal is closed whenever the main modal is closed
    // to avoid stacking / z-index issues when opening the create modal repeatedly.
    useEffect(() => {
        if (!visible) {
            setConfirmVisible(false);
            setConfirmHover(false);
            setCreateHover(false);
            // also reset the form when fully closed to avoid stale values
            form.resetFields();
        }
    }, [visible, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = { ...values };

            // Map workingAreas to dispatcherProfile for the backend
            if (payload.role === 'dispatcher') {
                payload.dispatcherProfile = {
                    workingAreas: payload.workingAreas || []
                };
                delete payload.workingAreas;
            }

            if (user) {
                // Edit existing user
                await adminUserService.updateUser(user._id, payload);
                message.success('User updated successfully');
            } else {
                // Create new user
                await adminUserService.createUser(payload);
                message.success('User created successfully');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving user:', error);
            if (error.response?.data?.message) {
                message.error(error.response.data.message);
            } else {
                message.error('Failed to save user. Please check your inputs.');
            }
        }
    };

    const [confirmVisible, setConfirmVisible] = React.useState(false);
    const [confirmHover, setConfirmHover] = React.useState(false);
    const [createHover, setCreateHover] = useState(false);

    const handleConfirmSubmit = () => {
        setConfirmVisible(false);
        handleSubmit();
    };

    const attemptSubmit = async () => {
        try {
            await form.validateFields();
            setConfirmVisible(true);
        } catch (error) {
            // Validation failed, do nothing, form shows errors natively
        }
    };

    return (
        <>
            <Modal
                title={null}
                open={visible}
                onCancel={onClose}
                footer={null}
                centered
                width={640}
                bodyStyle={{ padding: 24 }}
                destroyOnClose
                zIndex={1000}
                getContainer={() => document.body}
            >

                {/* Header */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(45,79,54,0.08), rgba(68,98,74,0.03))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <UserAddOutlined style={{ fontSize: 24, color: '#2D4F36' }} />
                    </div>
                    <div>
                        <Typography.Title level={4} style={{ margin: 0 }}>{user ? 'Edit User' : 'Create New Staff Account'}</Typography.Title>
                        <Typography.Text type="secondary">{user ? 'Cập nhật thông tin người dùng' : 'Tạo tài khoản nhân viên mới với mật khẩu mặc định'}</Typography.Text>
                    </div>
                </div>

                <Form form={form} layout="vertical">
                    <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: 'Please enter full name' }]}>
                        <Input placeholder="Enter full name" />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
                        <Input placeholder="Enter email" disabled={!!user} />
                    </Form.Item>
                    {!user && (
                        <Form.Item name="password" label="Password">
                            {/* show default password but don't allow editing */}
                            <Input.Password placeholder="User123@" disabled />
                        </Form.Item>
                    )}

                    <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true, message: 'Please enter phone number' }]}>
                        <Input placeholder="Enter phone number" />
                    </Form.Item>

                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                        <Select placeholder="Select role" disabled={!!user && user.role === 'admin'}>
                            <Option value="dispatcher">Dispatcher</Option>
                            <Option value="driver">Driver</Option>
                            <Option value="staff">Staff</Option>
                        </Select>
                    </Form.Item>

                    {role === 'dispatcher' && (
                        <Form.Item name="workingAreas" label="Working Areas (Da Nang Districts)" rules={[{ required: true, message: 'Please select at least one area' }]}>
                            <Select mode="multiple" placeholder="Select districts">
                                {DANANG_DISTRICTS.map(d => (
                                    <Option key={d} value={d}>{d}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    {user && (
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                            <Select placeholder="Select status">
                                <Option value="active">Active</Option>
                                <Option value="inactive">Inactive</Option>
                            </Select>
                        </Form.Item>
                    )}
                </Form>

                {/* Footer actions (custom) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                    <Button onClick={onClose} style={{ borderRadius: 8 }}>
                        Cancel
                    </Button>
                    <Button
                        onMouseEnter={() => setCreateHover(true)}
                        onMouseLeave={() => setCreateHover(false)}
                        onClick={attemptSubmit}
                        style={{
                            borderRadius: 8,
                            minWidth: 140,
                            background: createHover ? '#2D4F36' : '#fff',
                            borderColor: '#2D4F36',
                            color: createHover ? '#ffffff' : '#2D4F36',
                            boxShadow: createHover ? '0 6px 18px rgba(45,79,54,0.12)' : 'none'
                        }}
                    >
                        {user ? 'Save Changes' : 'Create'}
                    </Button>
                </div>
            </Modal>

            <Modal
                title={null}
                open={confirmVisible}
                onCancel={() => setConfirmVisible(false)}
                footer={null}
                closable={true}
                centered
                width={420}
                bodyStyle={{ padding: 24 }}
                zIndex={1500}
                getContainer={() => document.body}
            >
                {/* Polished confirmation card */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                    <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        background: 'linear-gradient(135deg, rgba(45,79,54,0.12), rgba(68,98,74,0.06))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <CheckCircleOutlined style={{ fontSize: 36, color: '#2D4F36' }} />
                    </div>

                    <Typography.Title level={4} style={{ margin: 0 }}>
                        {user ? 'Xác nhận lưu thay đổi' : 'Xác nhận tạo tài khoản'}
                    </Typography.Title>

                    <Typography.Text type="secondary" style={{ textAlign: 'center' }}>
                        {user ? 'Bạn sắp lưu các thay đổi cho người dùng. Vui lòng kiểm tra thông tin trước khi xác nhận.' : 'Bạn sắp tạo một tài khoản mới cho hệ thống. Vui lòng kiểm tra thông tin sau trước khi xác nhận.'}
                    </Typography.Text>

                    <div style={{ width: '100%', marginTop: 6 }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {(() => {
                                const vals = form.getFieldsValue();
                                const displayName = vals.fullName || '';
                                const displayRole = vals.role || '';
                                const displayPhone = vals.phoneNumber || vals.phone || '';
                                const displayPassword = user ? null : 'User123@';
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography.Text strong>Full name</Typography.Text>
                                            <Typography.Text>{displayName}</Typography.Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography.Text strong>Role</Typography.Text>
                                            <Typography.Text>{displayRole}</Typography.Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography.Text strong>Phone</Typography.Text>
                                            <Typography.Text>{displayPhone}</Typography.Text>
                                        </div>
                                        { !user && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <Typography.Text strong>Password</Typography.Text>
                                                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>Mật khẩu mặc định</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Typography.Text style={{ fontFamily: 'monospace', background: '#f5f7fb', padding: '6px 10px', borderRadius: 6 }}>{displayPassword}</Typography.Text>
                                                    <Button icon={<CopyOutlined />} onClick={async () => {
                                                        try {
                                                            await navigator.clipboard.writeText(displayPassword);
                                                            message.success('Mật khẩu mặc định đã được copy');
                                                        } catch (err) {
                                                            message.error('Không thể copy mật khẩu');
                                                        }
                                                    }} type="text" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </Space>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <Button onClick={() => setConfirmVisible(false)} style={{ borderRadius: 8 }}>
                            Hủy
                        </Button>
                        <Button
                            onMouseEnter={() => setConfirmHover(true)}
                            onMouseLeave={() => setConfirmHover(false)}
                            onClick={handleConfirmSubmit}
                            style={{
                                borderRadius: 8,
                                minWidth: 160,
                                background: confirmHover ? '#2D4F36' : '#fff',
                                borderColor: '#2D4F36',
                                color: confirmHover ? '#ffffff' : '#2D4F36',
                                boxShadow: confirmHover ? '0 4px 12px rgba(45,79,54,0.12)' : 'none'
                            }}
                        >
                            {user ? 'Xác nhận & Lưu' : 'Xác nhận & Tạo'}
                        </Button>
                    </div>

                    <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 6 }}>
                        Lưu ý: Người dùng nên đổi mật khẩu khi đăng nhập lần đầu.
                    </Typography.Text>
                </div>
            </Modal>
        </>
    );
};

export default UserModal;
