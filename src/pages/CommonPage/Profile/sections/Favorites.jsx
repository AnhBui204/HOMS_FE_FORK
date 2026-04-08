// file: src/pages/Customer/Profile/Favorites.jsx
import React, { useEffect, useState } from "react";
import { Card, Spin, Row, Col, Pagination, Button, message as antMessage, Tag, Empty } from "antd";
import { Link } from 'react-router-dom';
import { getUserFavorites, removeFavorite } from "../../../../services/profileServices"; // Import service calls
import useUser from "../../../../contexts/UserContext";

const Favorites = () => {
  const { user, loading: userLoading } = useUser();
  const [favorites, setFavorites] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = antMessage.useMessage();
  const API_BASE = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/api$/, '')) || 'http://localhost:5000';
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    if (userLoading) return;
    if (!user?._id) {
      setError("Bạn phải đăng nhập để xem mục yêu thích.");
      return;
    }
    setLoading(true);
    getUserFavorites()
      .then((res) => {
        if (res && Array.isArray(res.favorites)) {
          setFavorites(res.favorites);
        } else {
          setFavorites([]); // Set empty array on invalid data
        }
      })
      .catch((err) => {
        console.error("❌ [Component] Fetch favorites error:", err);
        setError("Lỗi khi lấy danh sách yêu thích.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, userLoading]);

  const handleRemoveFavorite = async (boardingHouseId) => {
    try {
      // ✅ Gọi hàm service removeFavorite với boardingHouseId
      await removeFavorite(boardingHouseId);
      messageApi.success("Đã xóa khỏi danh sách yêu thích");
      setFavorites((prev) =>
        // Lọc dựa trên _id của nhà trọ trong boardingHouseId object
        prev.filter((fav) => fav.boardingHouseId?._id !== boardingHouseId)
      );
    } catch (err) {
      console.error("Remove favorite error:", err);
      messageApi.error("Xóa thất bại");
    }
  };

  if (userLoading || loading) return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
  if (error) return <p style={{ color: "red", textAlign: 'center', marginTop: 50 }}>{error}</p>;

  const startIndex = (currentPage - 1) * pageSize;
  const currentFavorites = favorites.slice(startIndex, startIndex + pageSize);

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: '0 auto' }}>
      {contextHolder}
      <h2 style={{ marginBottom: 24 }}>Danh sách Yêu thích</h2>

      {favorites.length === 0 ? (
        <Empty description="Bạn chưa có nhà trọ yêu thích nào." />
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {currentFavorites.map((fav) => {
              // fav.boardingHouseId bây giờ là object nhà trọ đầy đủ
              const house = fav.boardingHouseId;
              if (!house) return null;

              // ✅ SỬ DỤNG DỮ LIỆU TỪ AGGREGATION
              const priceRange = house.minPrice && house.maxPrice
                ? `${house.minPrice.toLocaleString('vi-VN')} - ${house.maxPrice.toLocaleString('vi-VN')} VNĐ/tháng`
                : house.minPrice
                  ? `${house.minPrice.toLocaleString('vi-VN')} VNĐ/tháng`
                  : 'Liên hệ';

              const availabilityTag = house.availableRoomsCount > 0
                ? <Tag color="green">{`Còn ${house.availableRoomsCount} phòng`}</Tag>
                : <Tag color="orange">Hết phòng</Tag>;

              return (
                <Col xs={24} sm={12} md={8} key={fav._id}>
                  <Card
                    hoverable
                    style={{ height: "100%", display: 'flex', flexDirection: 'column' }}
                    cover={
                      <Link to={`/customer/property/${house._id}`}>
                        <img
                          alt={house.name} // ✅ Sửa alt text
                          src={house.photos?.[0] ? `${API_BASE}${house.photos[0]}` : "/default-image.jpg"}
                          style={{ height: "200px", objectFit: "cover", width: '100%' }}
                        />
                      </Link>
                    }
                    actions={[
                      <Button
                        danger
                        type="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(house._id);
                        }}
                      >
                        Xóa
                      </Button>,
                      <Link to={`/customer/property/${house._id}`}>
                        <Button type="default">Xem chi tiết</Button>
                      </Link>
                    ]}
                  >
                    <Card.Meta
                      title={<Link to={`/customer/property/${house._id}`} style={{ color: 'inherit' }}>{house.name || "Chưa có tên"}</Link>}
                      description={`${house.location?.street || ''}, ${house.location?.district || ''}`}
                      style={{ marginBottom: 16 }}
                    />
                    <div style={{ marginTop: 'auto' }}>
                      <p>
                        <strong>Giá:</strong> {priceRange} {/* ✅ Hiển thị khoảng giá */}
                      </p>
                      <p>
                        <strong>Trạng thái:</strong>{" "}
                        {availabilityTag} {/* ✅ Hiển thị trạng thái phòng */}
                      </p>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {favorites.length > pageSize && (
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={favorites.length}
              onChange={setCurrentPage}
              style={{ marginTop: "32px", textAlign: "center" }}
              showSizeChanger={false}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Favorites;