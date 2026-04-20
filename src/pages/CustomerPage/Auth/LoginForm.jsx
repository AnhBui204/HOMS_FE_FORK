import { Form, Input, Button, Divider, message, Space } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone, FacebookFilled } from "@ant-design/icons";
import { FcGoogle } from "react-icons/fc";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  login,
  loginGoogle,
  loginFacebook,
  saveAccessToken,
} from "../../../services/authService";
import useUser from "../../../contexts/UserContext";
import { GoogleLogin } from "@react-oauth/google";
import FacebookLogin from "@greatsumini/react-facebook-login";
import { resetCsrfToken } from "../../../services/api";

const PRIMARY_COLOR = "#44624A";

const LoginForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fbReady, setFbReady] = useState(false);
  const [fbError, setFbError] = useState(false);
  const { setUser, setIsAuthenticated } = useUser();
  const navigate = useNavigate();

  const appId = process.env.REACT_APP_FACEBOOK_APP_ID;
  const isAppIdValid = appId && appId !== "NHAP_APP_ID";

  useEffect(() => {
    if (!isAppIdValid) {
      console.warn("Facebook App ID is missing or invalid. Please check your .env file.");
      return;
    }

    // 1. Kiểm tra xem FB đã có sẵn chưa
    if (window.FB) {
      setFbReady(true);
      setFbError(false);
      return;
    }

    // 2. Tự tay chèn script Facebook (Manual Injection) để đảm bảo script được gọi
    const id = 'facebook-jssdk';
    if (!document.getElementById(id)) {
      const fjs = document.getElementsByTagName('script')[0];
      const js = document.createElement('script');
      js.id = id;
      js.src = "https://connect.facebook.net/vi_VN/sdk.js";
      js.async = true;
      js.defer = true;
      js.crossOrigin = "anonymous";
      js.onload = () => {
        console.log("Facebook Script đã được nạp vào DOM.");
      };
      js.onerror = () => {
        console.error("Script Facebook bị chặn hoặc không thể tải.");
        setFbError(true);
      };
      if (fjs && fjs.parentNode) {
        fjs.parentNode.insertBefore(js, fjs);
      } else {
        document.head.appendChild(js);
      }
    }

    // 3. Đợi library init hoặc timeout
    const timer = setTimeout(() => {
      if (!fbReady && !window.FB) {
        setFbError(true);
        console.error("Facebook SDK load timeout. Vui lòng kiểm tra AdBlock hoặc VPN.");
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [fbReady, isAppIdValid]);

  const handleLoginSuccess = (userData, accessToken, expiresInMs) => {
    saveAccessToken(accessToken, expiresInMs || 30 * 60 * 1000);
    setUser(userData);
    setIsAuthenticated(true);
    resetCsrfToken();
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
      const errorMsg = err.response?.data?.message || "Đăng nhập thất bại";
      if (errorMsg.toLowerCase().includes("mật khẩu") || errorMsg.toLowerCase().includes("password")) {
        form.setFields([{ name: "password", errors: [errorMsg] }]);
      } else if (errorMsg.toLowerCase().includes("email") || errorMsg.toLowerCase().includes("tài khoản") || errorMsg.toLowerCase().includes("người dùng") || errorMsg.toLowerCase().includes("không tồn tại")) {
        form.setFields([{ name: "email", errors: [errorMsg] }]);
      } else {
        message.error(errorMsg);
      }
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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* GOOGLE */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%" }}>
            <GoogleLogin
              width="100%"
              onSuccess={async (credentialResponse) => {
                try {
                  const googleToken = credentialResponse.credential;
                  const res = await loginGoogle(googleToken);
                  const responseData = res.data.data || res.data;
                  const { user, accessToken, expiresInMs } = responseData;
                  handleLoginSuccess(user, accessToken, expiresInMs);
                } catch (err) {
                  message.error("Đăng nhập Google thất bại");
                }
              }}
              onError={() => {
                message.error("Google login failed");
              }}
            />
          </div>
        </div>

        {/* DIVIDER DỌC */}
        <Divider type="vertical" style={{ height: 40 }} />

        {/* FACEBOOK */}
        <div style={{ flex: 1 }}>
          <FacebookLogin
            appId={appId || "NHAP_APP_ID"}
            onInit={() => {
              console.log("FB SDK Initialized");
              setFbReady(true);
              setFbError(false);
            }}
            onSuccess={async (response) => {
              console.log("FB Response:", response);
              try {

                const res = await loginFacebook(response.accessToken);
                const responseData = res.data.data || res.data;
                const { user, accessToken, expiresInMs } = responseData;
                handleLoginSuccess(user, accessToken, expiresInMs);
              } catch (err) {
                console.error("LỖI CHI TIẾT:", err.response?.data);
                message.error(err.response?.data?.message || "Đăng nhập Facebook thất bại");
              }
            }}
            onFail={(error) => {
              console.error('Facebook Login Fail:', error);
              setFbError(true);
            }}
            render={({ onClick }) => (
              <Button
                size="large"
                block
                loading={!fbReady && !fbError && isAppIdValid}
                onClick={() => {
                  if (fbError) {
                    window.location.reload(); // Thử lại bằng cách reload
                  } else {
                    onClick();
                  }
                }}
                disabled={!fbReady && !fbError}
                icon={<FacebookFilled style={{ color: fbReady ? '#1877F2' : (fbError ? '#ff4d4f' : '#ccc'), fontSize: 18 }} />}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 40,
                  borderRadius: 2,
                  fontWeight: 400,
                  fontSize: 14,
                  padding: '0 12px'
                }}
              >
                {!isAppIdValid ? "Thiếu Facebook App ID" : (fbError ? "Lỗi tải (Nhấn để thử lại)" : (fbReady ? "Đăng nhập bằng Facebook" : "Đang tải Facebook..."))}
              </Button>
            )}
          />
        </div>
      </div>
    </Form>
  );

};

export default LoginForm;
