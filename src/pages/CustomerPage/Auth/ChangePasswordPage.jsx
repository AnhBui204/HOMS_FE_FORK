import AuthLayout from "../../../components/auth/authLayout";
import AuthFormWrapper from "../../../components/auth/AuthFormWrapper";
import ChangePasswordForm from "./ChangePasswordForm";

const ChangePasswordPage = () => {
  return (
    <AuthLayout>
      <AuthFormWrapper
        title=""
        subtitle=""
        linkText=""
        linkTo=""
      >
        <ChangePasswordForm />
      </AuthFormWrapper>
    </AuthLayout>
  );
};

export default ChangePasswordPage;
