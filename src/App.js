import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useState,useEffect } from "react";
import { Provider } from 'react-redux';
import { store } from './store/index';
import LandingPage from "./pages/CommonPage/LandingPage/LandingPage";
import HomeRedirect from "./pages/CommonPage/LandingPage/HomeRedirect";
import About from "./pages/CommonPage/About/About";
import LoginPage from "./pages/CustomerPage/Auth/LoginPage";
import RegisterPage from "./pages/CustomerPage/Auth/RegisterPage";
import { UserProvider } from "./contexts/UserContext";
import ForgotPasswordPage from "./pages/CustomerPage/Auth/ForgotPasswordPage";
import ChangePasswordPage from "./pages/CustomerPage/Auth/ChangePasswordPage";
import VerifyOTPPage from "./pages/CustomerPage/Auth/VerifyOTPPage";
import ResetPasswordPage from "./pages/CustomerPage/Auth/ResetPasswordPage";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentCancel from "./pages/payment/PaymentCancel";
import RoutesCus from "./routes/CustomerRoutes/RoutesCus";
import RoutesAdmin from "./routes/AdminRoutes/RoutesAdmin";
import RoutesDispatcher from './routes/DispatcherRoutes/DispatcherRoutes';
import RoutesStaff from "./routes/StaffRoutes/RoutesStaff";
import NotFound from "./pages/CommonPage/NotFound/NotFound";
import { initCsrfToken } from './services/api';
import ScrollToTop from "./components/common/ScrollToTop";
import MagicLogin from "./pages/CustomerPage/Auth/MagicLogin";

function App() {
   const [csrfReady, setCsrfReady] = useState(false);

  useEffect(() => {
    initCsrfToken().finally(() => setCsrfReady(true));
  }, []);

  if (!csrfReady) return null; 
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <ScrollToTop />
         <Provider store={store}>
        <UserProvider>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/landing" element={<HomeRedirect />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/magic"element={<MagicLogin/>}/>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/customer/*" element={<RoutesCus />} />
            <Route path="/admin/*" element={<RoutesAdmin />} />
            <Route path="/dispatcher/*" element={<RoutesDispatcher />} />
            <Route path="/staff/*" element={<RoutesStaff />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </UserProvider>
        </Provider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
