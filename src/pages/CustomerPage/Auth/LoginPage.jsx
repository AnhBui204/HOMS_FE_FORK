import AuthLayout from "../../../components/auth/authLayout";
import AuthFormWrapper from "../../../components/auth/AuthFormWrapper";
import LoginForm from "./LoginForm";

const LoginPage = () => {
  return (
    <AuthLayout>
      <AuthFormWrapper
        title="Đăng nhập"
        subtitle="Chưa có tài khoản?"
        linkText="Đăng ký ngay"
        linkTo="/register"
      >
        <LoginForm />
      </AuthFormWrapper>
    </AuthLayout>
  );
};

export default LoginPage;
