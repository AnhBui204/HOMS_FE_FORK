import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import LandingPage from "./LandingPage";

const HomeRedirect = () => {
 const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) {
    return null; // Đợi load xong context
  }

  // Nếu đã đăng nhập, dựa vào Role để đẩy về đúng Dashboard
  if (isAuthenticated && user) {
    switch (user.role) {
      case "admin":
        return <Navigate to="/admin" replace />;
      case "dispatcher":
        return <Navigate to="/dispatcher" replace />;
      case "customer":
        return <LandingPage />;
      default:
        return <LandingPage />;
    }
  }

  // Mặc định trả về Landing Page khi chưa đăng nhập
  return <LandingPage />;
};

export default HomeRedirect;
