import React, { useEffect, useState } from "react";
import { Layout, Table, Typography, Tag, Button, Space, Card, Badge } from "antd";
import { getNotifications, markNotificationRead } from "../../../services/notificationService";
import useUser from "../../../contexts/UserContext";

const { Title, Text } = Typography;
const { Content } = Layout;

const NotificationPage = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const handleMarkAsRead = async (record) => {
    if (record.isRead) return;
    try {
      await markNotificationRead(record._id);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === record._id ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      title: "Trạng thái",
      dataIndex: "isRead",
      key: "isRead",
      width: 100,
      render: (isRead) => (
        <Badge status={isRead ? "default" : "processing"} text={isRead ? "Đã đọc" : "Chức đọc"} />
      ),
    },
    {
      title: "Loại thông báo",
      dataIndex: "type",
      key: "type",
      width: 150,
      render: (type) => {
        let color = "blue";
        if (type === "Payment") color = "green";
        if (type === "System") color = "volcano";
        return <Tag color={color}>{type || "Chung"}</Tag>;
      },
    },
    {
      title: "Nội dung",
      key: "content",
      render: (_, record) => (
        <div>
          <Text strong={!record.isRead} style={{ display: "block", fontSize: "15px" }}>
            {record.title}
          </Text>
          <Text type="secondary">{record.message}</Text>
        </div>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: "Hành động",
      key: "action",
      width: 120,
      render: (_, record) => (
        <Button 
          type="link" 
          disabled={record.isRead} 
          onClick={() => handleMarkAsRead(record)}
        >
          Đánh dấu đã đọc
        </Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <Content style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <Card>
          <Title level={2} style={{ color: "#2D4F36", marginBottom: "24px" }}>
            Lịch sử thông báo
          </Title>
          <Table
            columns={columns}
            dataSource={notifications}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 15 }}
            rowClassName={(record) => (!record.isRead ? "unread-row" : "")}
          />
        </Card>
      </Content>
    </Layout>
  );
};

export default NotificationPage;
