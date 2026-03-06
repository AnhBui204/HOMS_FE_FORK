import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useUser from "../../contexts/UserContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useUser();
  const location = useLocation();

  // Đang gọi API check token thì hiện loading
  if (loading) {
    return <div>Loading...</div>; // Bạn có thể thay bằng component Spinner của Antd
  }

  // 1. Chưa đăng nhập -> Đá về trang Login
  if (!isAuthenticated || !user) {
    // Lưu lại vị trí cũ để sau khi login xong có thể redirect ngược lại
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Đã đăng nhập nhưng KHÔNG CÓ QUYỀN -> Đá về trang chủ hoặc trang báo lỗi
  // Lưu ý: Sửa 'user.role' cho đúng với cấu trúc data trả về từ API của bạn 
  // (ví dụ: user.role, user.role.name, user.roleId...)
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // 3. Hợp lệ -> Cho phép truy cập vào component con
  return children;
};

export default ProtectedRoute;