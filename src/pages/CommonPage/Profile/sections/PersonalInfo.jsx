import React, { useEffect, useState } from 'react';
import {
  Typography,
  Card,
  Button,
  Input,
  Avatar,
  Upload,
  Modal,
  Divider,
  message as antMessage
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  updateUserInfo,
  changePassword
} from '../../../../services/profileServices';
import { useSelector, useDispatch } from 'react-redux';
import { setCredentials } from '../../../../store/authSlice';
import { getUserInfo } from '../../../../services/userService';
import './PersonalInfo.css';
const capitalize = (str) => str && typeof str === 'string'
  ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  : '';
const { Title, Text } = Typography;

const PersonalInfo = () => {
    const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [editingField, setEditingField] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [messageApi, contextHolder] = antMessage.useMessage();
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
 const refreshUserData = async () => {
    try {
      const userData = await getUserInfo();
      dispatch(setCredentials({ user: userData }));
    } catch (error) {
      console.error("Lỗi cập nhật Redux:", error);
    }
  };
  useEffect(() => {

    if (user) {
      setFieldValues({
        name: user.name,
        phone: user.phone,
      });
      console.log('User avatar after update:', user?.avatar);
      setAvatarPreview(user.avatar);
    }
  }, [user]);

  const handleEdit = (field) => setEditingField(field);

  const handleChange = (field, value) => {
    setFieldValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (field) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append(field, fieldValues[field]);
      await updateUserInfo(formData);
        await refreshUserData();
      messageApi.success("Cập nhật thành công");
      setEditingField('');
    } catch (err) {
      console.error(err);
      const res = err.response;
      if (res?.status === 400 && Array.isArray(res.data?.errors)) {
        res.data.errors.forEach((e) => {
          messageApi.error(` ${e.msg}`);
        });
      } else {
        messageApi.error("Cập nhật thất bại");
      }
    } finally {
      setLoading(false);
    }
  };


  const handleAvatarChange = async ({ file }) => {
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await updateUserInfo(formData);
     await refreshUserData();
      messageApi.success("Cập nhật ảnh đại diện thành công");
    } catch {
      messageApi.error("Không thể cập nhật ảnh đại diện");
    }
  };

  const handleAvatarClick = () => setIsModalVisible(true);
  const handleModalClose = () => setIsModalVisible(false);

  const handlePasswordChange = (field, value) => {
    setPasswords((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitPassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      return messageApi.error("Vui lòng nhập đầy đủ thông tin");
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return messageApi.error("Mật khẩu xác nhận không khớp");
    }
    const currentPassword = passwords.currentPassword
    const newPassword = passwords.newPassword
    const confirmPassword = passwords.confirmPassword
    const data = {
      currentPassword,
      newPassword,
      confirmPassword,
    };

    setLoading(true);
    try {
      await changePassword(data);
      messageApi.success("Đổi mật khẩu thành công");
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (err) {
      console.error(err);
      messageApi.error(err.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (error) return <p style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</p>;
  if (!user) return <p style={{ textAlign: 'center', marginTop: 40 }}>Loading...</p>;

  return (
    <div className="personal-info-container">
      {contextHolder}
      <Card className="personal-info-card" bodyStyle={{ padding: 0 }}>
        {/* Avatar */}
        <div className="avatar-container">
          <Avatar
            size={120}
            src={user?.avatar || null}
            onClick={handleAvatarClick}
            className="avatar-style"
            style={{
              fontSize: 28,
              color: 'white',
              background: user?.avatar ? 'transparent' : 'linear-gradient(to right, #064749, #c4f7d8)',
              border: user?.avatar ? '2px solid #eee' : '2px solid white',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
            }}
          >
            {!user?.avatar && user.name?.charAt(0)}
          </Avatar>
          <Upload
            showUploadList={false}
            accept="image/*"
            maxCount={1}
            customRequest={({ file, onSuccess }) => {
              handleAvatarChange({ file });
              setTimeout(() => onSuccess('ok'), 0);
            }}
          >
            <Button size="small" icon={<UploadOutlined />}>Đổi ảnh</Button>
          </Upload>
        </div>

        <Title level={3} style={{ textAlign: 'center', marginBottom: 16 }}>{user.name}</Title>
        <Divider style={{ margin: '16px 0' }} />

        {/* Email */}
        <div className="flex-row">
          <Text className="label-style">Email:</Text>
          <div className="flex-content">
            <Text>{user.email}</Text>
          </div>
        </div>
        <Divider style={{ margin: '12px 0' }} />

        <div className="flex-row">
          <Text className="label-style">Mật khẩu:</Text>
          <div className="flex-content-inline">
            {!isChangingPassword ? (
              <>
                <Text>********</Text>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => setIsChangingPassword(true)}
                  size="small"
                  style={{ marginLeft: 8, padding: 0 }}
                >
                  Đổi mật khẩu
                </Button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Input.Password
                  placeholder="Mật khẩu hiện tại"
                  size="small"
                  value={passwords.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                />
                <Input.Password
                  placeholder="Mật khẩu mới"
                  size="small"
                  value={passwords.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                />
                <Input.Password
                  placeholder="Xác nhận mật khẩu mới"
                  size="small"
                  value={passwords.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    size="small"
                    onClick={handleSubmitPassword}
                    loading={loading}
                  >
                    Lưu
                  </Button>
                  <Button
                    onClick={() => setIsChangingPassword(false)}
                    size="small"
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <Divider style={{ margin: '12px 0' }} />

        {/* Phone */}
        <div className="flex-row">
          <Text className="label-style">Số điện thoại:</Text>
          <div className="flex-content-inline">
            {editingField === 'phone' ? (
              <>
                <Input
                  value={fieldValues.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  style={{ width: 200, marginRight: 8 }}
                  size="small"
                />
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => handleSave('phone')}
                  loading={loading}
                  size="small"
                >
                  Lưu
                </Button>
              </>
            ) : (
              <>
                <Text>{user.phone}</Text>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit('phone')}
                  size="small"
                  style={{ marginLeft: 8, padding: 0 }}
                >
                  Chỉnh sửa
                </Button>
              </>
            )}
          </div>
        </div>
        <Divider style={{ margin: '12px 0' }} />

        {/* Name */}
        <div className="flex-row">
          <Text className="label-style">Họ và tên:</Text>
          <div className="flex-content-inline">
            {editingField === 'name' ? (
              <>
                <Input
                  value={fieldValues.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  style={{ width: 200, marginRight: 8 }}
                  size="small"
                />
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => handleSave('name')}
                  loading={loading}
                  size="small"
                >
                  Lưu
                </Button>
              </>
            ) : (
              <>
                <Text>{user.name}</Text>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit('name')}
                  size="small"
                  style={{ marginLeft: 8, padding: 0 }}
                >
                  Chỉnh sửa
                </Button>
              </>
            )}
          </div>
        </div>
        <Divider style={{ margin: '12px 0' }} />

        {/* Gender */}
        <div className="flex-row">
          <Text className="label-style">Gender:</Text>
          <div className="flex-content">
            <Text>{capitalize(user.gender)}</Text>
          </div>
        </div>
        <Divider style={{ margin: '12px 0' }} />

        {/* Role */}
        <div className="flex-row">
          <Text className="label-style">Quyền:</Text>
          <div className="flex-content">
            <Text>{capitalize(user.role)}</Text>
          </div>
        </div>
      </Card>

      {/* Modal avatar */}
      <Modal
        open={isModalVisible}
        footer={null}
        onCancel={handleModalClose}
        centered
      >
        <img
          src={avatarPreview}
          alt="Avatar Preview"
          style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
        />
      </Modal>
    </div>
  );
};

export default PersonalInfo;