import React from "react";
import { Modal, Tag, Divider, Image } from "antd";

const ViewIncidentModal = ({ visible, onClose, incident }) => {
    if (!incident) return null;

    return (
        <Modal
            title="Chi tiết sự cố"
            open={visible}
            onCancel={onClose}
            footer={null}
        >
            <p><b>Loại:</b> {incident.type}</p>
            <p><b>Mô tả:</b> {incident.description}</p>
            <p>
                <b>Trạng thái:</b>{" "}
                <Tag color="orange">{incident.status}</Tag>
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
                {incident.images?.map((file, i) => {
                    const isVideo = file.match(/\.(mp4|webm|ogg|mov)$/i);
                    return (
                        <div key={i} style={{ width: 140, height: 100, borderRadius: 8, overflow: "hidden", border: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa" }}>
                            {isVideo ? (
                                <video controls style={{ width: "100%", height: "100%", objectFit: "cover" }}>
                                    <source src={file} />
                                </video>
                            ) : (
                                <Image src={file} preview style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {incident.status === "Resolved" && (
                <>
                    <Divider />
                    <p><b>Kết quả xử lý:</b> {incident.resolution?.action}</p>
                    {incident.resolution?.compensationAmount > 0 && (
                        <p>Bồi thường: {incident.resolution.compensationAmount.toLocaleString()} ₫</p>
                    )}
                </>
            )}
        </Modal>
    );
};

export default ViewIncidentModal;