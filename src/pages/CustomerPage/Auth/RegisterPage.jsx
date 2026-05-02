import AuthLayout from "../../../components/auth/authLayout";
import AuthFormWrapper from "../../../components/auth/AuthFormWrapper";
import RegisterForm from "./RegisterForm";

const RegisterPage = () => {
  return (
    <AuthLayout>
      <AuthFormWrapper
        title="Đăng Ký"
        subtitle="Đã có tài khoản?"
        linkText="Đăng nhập"
        linkTo="/login"
      >
        <RegisterForm />
      </AuthFormWrapper>
    </AuthLayout>
  );
};

export default RegisterPage;
