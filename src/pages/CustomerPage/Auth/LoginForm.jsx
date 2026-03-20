import { Form, Input, Button, Divider, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  login,
  loginGoogle,
  saveAccessToken,
} from "../../../services/authService";
import useUser from "../../../contexts/UserContext";
import { GoogleLogin } from "@react-oauth/google";

const PRIMARY_COLOR = "#44624A";

const LoginForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { setUser, setIsAuthenticated } = useUser();
  const navigate = useNavigate();
  const handleLoginSuccess = (userData, accessToken, expiresInMs) => {
    saveAccessToken(accessToken, expiresInMs || 30 * 60 * 1000);
    setUser(userData);
    setIsAuthenticated(true);
    message.success("Đăng nhập thành công!");
    let redirectPath = "/";

    switch (userData.role) {
      case "dispatcher":
        redirectPath = "/dispatcher/surveys";
        break;
      case "customer":
        redirectPath = "/customer/order";
        break;
      case "admin":
        redirectPath = "/admin/dashboard";
        break;
      default:
        redirectPath = "/landing";
    }

    setTimeout(() => navigate(redirectPath), 800);
  };
  // ===== NORMAL LOGIN =====
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await login(values);
      const { user, accessToken, expiresInMs } = res.data.data;

      handleLoginSuccess(user, accessToken, expiresInMs);


    } catch (err) {
      message.error(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      requiredMark={false}
    >
      <Form.Item
        label="Email"
        name="email"
        rules={[
          { required: true, message: "Vui lòng nhập email" },
          { type: "email", message: "Email không hợp lệ" },
        ]}
      >
        <Input size="large" />
      </Form.Item>

      <Form.Item
        label="Mật khẩu"
        name="password"
        rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
      >
        <Input.Password
          size="large"
          iconRender={(v) => (v ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
        />
      </Form.Item>
      <Form.Item>
        <div style={{ textAlign: "right" }}>
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => navigate("/forgot-password")}
          >
            Quên mật khẩu?
          </Button>
        </div>
      </Form.Item>

      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        block
        size="large"
        style={{ background: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
      >
        Login
      </Button>

      <Divider>Hoặc</Divider>

      {/* ✅ GOOGLE LOGIN */}
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          try {
            const googleToken = credentialResponse.credential;

            const res = await loginGoogle(googleToken);
            const responseData = res.data.data || res.data;
            const { user, accessToken, expiresInMs } = responseData;
            handleLoginSuccess(user, accessToken, expiresInMs);
          } catch (err) {
            console.error(err);
            message.error("Đăng nhập Google thất bại");
          }
        }}
        onError={() => {
          message.error("Google login failed");
        }}
      />
    </Form>
  );
};

export default LoginForm;
