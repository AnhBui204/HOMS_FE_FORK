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
import api, { resetCsrfToken } from "../../../services/api";

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
    if (!isAppIdValid) return;

    // 1. Định nghĩa hàm khởi tạo thủ công cho Facebook SDK
    window.fbAsyncInit = function() {
      if (window.FB) {
        window.FB.init({
          appId      : appId,
          cookie     : true,
          xfbml      : true,
          version    : 'v18.0'
        });
        console.log("Facebook SDK đã khởi tạo thủ công thành công.");
        setFbReady(true);
        setFbError(false);
      }
    };

    // 2. Kiểm tra nếu FB đã tồn tại từ trước
    if (window.FB) {
      window.fbAsyncInit();
      return;
    }

    // 3. Tự tay chèn script vào DOM
    const id = 'facebook-jssdk';
    if (!document.getElementById(id)) {
      const js = document.createElement('script');
      js.id = id;
      js.src = "https://connect.facebook.net/vi_VN/sdk.js";
      js.async = true;
      js.defer = true;
      js.crossOrigin = "anonymous";
      js.onload = () => {
        if (!window.FB) {
          console.error("Script đã nạp nhưng window.FB vẫn undefined.");
        }
      };
      document.head.appendChild(js);
    }
  }, [appId, isAppIdValid]);

  useEffect(() => {
    if (!isAppIdValid || fbReady || fbError) return;

    console.log("Đồng hồ 8 giây bắt đầu đếm ngược...");
    const timer = setTimeout(() => {
      if (!window.FB) {
        setFbError(true);
        console.error("TIMEOUT: Không thể tải Facebook SDK.");
      } else {
        // Nếu thực tế FB đã có nhưng state chưa cập nhật
        setFbReady(true);
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [isAppIdValid]); // Chỉ chạy lại nếu App ID thay đổi

  const handleLoginSuccess = (userData, accessToken, expiresInMs) => {
    // 1. Lưu token và nạp ngay vào Header API
    saveAccessToken(accessToken, expiresInMs || 30 * 60 * 1000);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    // 2. Cập nhật Context
    setUser(userData);
    setIsAuthenticated(true);
    resetCsrfToken();
    
    message.success("Đăng nhập thành công!");
    
    let redirectPath = "/";
    const searchParams = new URLSearchParams(window.location.search);
    const returnUrl = searchParams.get("returnUrl");
    
    if (returnUrl) {
      redirectPath = returnUrl;
    } else {
      // Khôi phục các path chuẩn của dự án bạn
      switch (userData.role) {
        case "dispatcher": redirectPath = "/dispatcher/surveys"; break;
        case "customer":   redirectPath = "/customer/order"; break;
        case "admin":      redirectPath = "/admin/dashboard"; break;
        case "staff":      redirectPath = "/staff/dashboard"; break;
        default:           redirectPath = "/";
      }
    }

    // 3. Một chút delay (500ms) để React Context và các Service kịp đồng bộ hoàn toàn
    setTimeout(() => {
      navigate(redirectPath);
    }, 500);
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
