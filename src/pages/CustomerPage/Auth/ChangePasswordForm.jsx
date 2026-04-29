import { Form, Input, Button, Divider, message, Typography } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone, InfoCircleOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
// THÊM REDUX
import { useSelector, useDispatch } from "react-redux";
import { updateUser } from "../../../store/authSlice";
import { changePassword } from "../../../services/userService";

const { Title, Text } = Typography;
const PRIMARY_COLOR = "#44624A";

const ChangePasswordForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Lấy thông tin user từ Redux và setup dispatch
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  // Kiểm tra xem user đã có mật khẩu (provider local) chưa
  const hasLocalAccount = user?.provider?.includes('local');

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await changePassword({
        // Nếu không có tài khoản local, gửi currentPassword là chuỗi rỗng
        currentPassword: hasLocalAccount ? values.currentPassword : "",
        newPassword: values.newPassword
      });
      
      message.success(hasLocalAccount ? "Đổi mật khẩu thành công!" : "Tạo mật khẩu thành công!");
      
      // QUAN TRỌNG: Cập nhật lại thông tin user vào Redux (để mảng provider được cập nhật thêm 'local')
      const updatedUser = res.data?.data || res.data?.user;
      if (updatedUser) {
        dispatch(updateUser(updatedUser));
      }

      // Chuyển về trang profile
      setTimeout(() => {
        navigate("/customer/profile");
      }, 1000);
    } catch (err) {
      message.error(err.response?.data?.message || "Thao tác thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Tiêu đề linh hoạt */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ color: PRIMARY_COLOR, margin: 0 }}>
          {hasLocalAccount ? "Đổi mật khẩu" : "Tạo mật khẩu đăng nhập"}
        </Title>
        {!hasLocalAccount && (
          <div style={{ marginTop: 8, color: '#666', backgroundColor: '#eaf3ea', padding: '10px', borderRadius: '8px' }}>
            <InfoCircleOutlined style={{ color: PRIMARY_COLOR, marginRight: 5 }} />
            Bạn đang đăng nhập bằng tài khoản mạng xã hội. Hãy tạo mật khẩu để có thể đăng nhập bằng Email ở lần sau.
          </div>
        )}
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
      >
        {/* CHỈ HIỂN THỊ Ô NÀY NẾU ĐÃ CÓ MẬT KHẨU */}
        {hasLocalAccount && (
          <Form.Item
            label="Mật khẩu hiện tại"
            name="currentPassword"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu hiện tại" },
            ]}
          >
            <Input.Password
              size="large"
              placeholder="Nhập mật khẩu hiện tại"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        )}

        <Form.Item
          label="Mật khẩu mới"
          name="newPassword"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu mới" },
            { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
          ]}
        >
          <Input.Password
            size="large"
            placeholder="Nhập mật khẩu mới"
            iconRender={(visible) =>
              visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
            }
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu mới"
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Mật khẩu xác nhận không khớp"));
              },
            }),
          ]}
        >
          <Input.Password
            size="large"
            placeholder="Nhập lại mật khẩu mới"
            iconRender={(visible) =>
              visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
            }
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            style={{
              backgroundColor: PRIMARY_COLOR,
              borderColor: PRIMARY_COLOR,
              height: 48,
              fontSize: 16,
              borderRadius: 24,
              marginTop: 16,
            }}
          >
            {hasLocalAccount ? "Cập nhật mật khẩu" : "Tạo mật khẩu"}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default ChangePasswordForm;