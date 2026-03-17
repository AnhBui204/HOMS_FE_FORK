import React from "react";
import { Modal, Tag, Divider, Image } from "antd";

const INCIDENT_STATUS_VI = {
  Open: { label: "Đã báo cáo", color: "orange" },
  Investigating: { label: "Đang xử lý", color: "processing" },
  Resolved: { label: "Đã giải quyết", color: "green" },
  Dismissed: { label: "Từ chối xử lý", color: "red" },
};

const INCIDENT_TYPE_VI = {
  Damage: "Hư hỏng",
  Delay: "Trễ lịch",
  Accident: "Tai nạn",
  Loss: "Thất lạc",
  Other: "Khác",
};

const ViewIncidentModal = ({ visible, onClose, incident }) => {
  if (!incident) return null;

  const status = INCIDENT_STATUS_VI[incident.status] || {
    label: incident.status,
    color: "default",
  };

  const typeLabel = INCIDENT_TYPE_VI[incident.type] || incident.type;

  return (
    <Modal
      title="⚠ Chi tiết sự cố"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
    >
      {/* INFO GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <p>
          <b>Loại sự cố:</b> {typeLabel}
        </p>

        <p>
          <b>Trạng thái:</b>{" "}
          <Tag color={status.color}>{status.label}</Tag>
        </p>
      </div>

      {/* DESCRIPTION */}
      <div
        style={{
          background: "#fafafa",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #f0f0f0",
        }}
      >
        <b>Mô tả:</b>
        <p style={{ marginTop: 6 }}>{incident.description}</p>
      </div>

      {/* MEDIA */}
      {incident.images?.length > 0 && (
        <>
          <Divider>Hình ảnh / Video</Divider>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))",
              gap: 10,
            }}
          >
            {incident.images.map((file, i) => {
              const isVideo = file.match(/\.(mp4|webm|ogg|mov)$/i);

              return (
                <div
                  key={i}
                  style={{
                    height: 90,
                    borderRadius: 6,
                    overflow: "hidden",
                    border: "1px solid #f0f0f0",
                    background: "#fafafa",
                    display:"flex"
                  }}
                >
                  {isVideo ? (
                    <video
                      controls
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    >
                      <source src={file} />
                    </video>
                  ) : (
                  <Image
  src={file}
  preview
  wrapperStyle={{
    width: "100%",
    height: "100%",
  }}
  imgStyle={{
    width: "100%",
    height: "100%",
    objectFit: "cover",
  }}
/>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* RESOLUTION */}
      {incident.status === "Resolved" && (
        <>
          <Divider>Kết quả xử lý</Divider>

          <p>
            <b>Phương án:</b> {incident.resolution?.action}
          </p>

          {incident.resolution?.compensationAmount > 0 && (
            <p>
              <b>Bồi thường:</b>{" "}
              {incident.resolution.compensationAmount.toLocaleString()} ₫
            </p>
          )}
          {incident.resolution?.note && (
            <p>
              <b>Ghi chú xử lý:</b>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{incident.resolution.note}</div>
            </p>
          )}
        </>
      )}
    </Modal>
  );
};

export default ViewIncidentModal;