import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Result, Button } from "antd";

const PaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const ticketId = searchParams.get("ticketId");
const type = searchParams.get("type");
const getMessage = () => {
  if (type === "MOVING_REMAINING") {
    return "Đơn hàng vẫn chưa được thanh toán đầy đủ.";
  }
  return "Đơn hàng vẫn đang chờ đặt cọc.";
};
  return (
    <Result
      status="warning"
      title="Bạn đã hủy thanh toán"
    subTitle={`Đơn hàng ${ticketId}. ${getMessage()}`}
      extra={[
        <Button key="home" onClick={() => navigate("/")}>
          Trang chủ
        </Button>,
      ]}
    />
  );
};

export default PaymentCancel;