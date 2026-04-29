import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setupInterceptors } from "../services/api";
import { initializeUserThunk, logoutStore } from "../store/authSlice";

export const AuthWrapper = ({ children }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  useEffect(() => {

    setupInterceptors(() => {
      dispatch(logoutStore());
    });


    dispatch(initializeUserThunk());
  }, [dispatch]);


  useEffect(() => {
    const syncLogoutAcrossTabs = (event) => {
      if (event.key === "hasSession" && event.newValue === null) {
        console.log("🔄 Phát hiện đăng xuất từ Tab khác. Đang đồng bộ...");
        dispatch(logoutStore());
        window.location.href = '/login'; 
      }
    };

    window.addEventListener("storage", syncLogoutAcrossTabs);
    return () => {
      window.removeEventListener("storage", syncLogoutAcrossTabs);
    };
  }, [dispatch]);


  if (loading) {

    return <div>Loading...</div>; 
  }

  return children;
};