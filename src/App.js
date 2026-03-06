import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from "@react-oauth/google";
import LandingPage from './pages/CommonPage/LandingPage/LandingPage';
import About from './pages/CommonPage/About/About';
import LoginPage from './pages/CustomerPage/Auth/LoginPage';
import RegisterPage from './pages/CustomerPage/Auth/RegisterPage'
import { UserProvider } from './contexts/UserContext';
import ForgotPasswordPage from './pages/CustomerPage/Auth/ForgotPasswordPage'
import ChangePasswordPage from './pages/CustomerPage/Auth/ChangePasswordPage';
import VerifyOTPPage from './pages/CustomerPage/Auth/VerifyOTPPage';
import ResetPasswordPage from './pages/CustomerPage/Auth/ResetPasswordPage';

import RoutesCus from './routes/CustomerRoutes/RoutesCus';
import RoutesDispatcher from './routes/DispatcherRoutes/DispatcherRoutes';
function App() {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  return (
    <GoogleOAuthProvider clientId={googleClientId}>

      <BrowserRouter>
        <UserProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="/customer/*" element={<RoutesCus />} />
             <Route path="/dispatcher/*" element={<RoutesDispatcher />} />
          </Routes>
        </UserProvider>
      </BrowserRouter>

    </GoogleOAuthProvider>
  );
}

export default App;