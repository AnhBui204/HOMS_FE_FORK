import React, { useState } from "react";
import { Modal, Form, Select, Input, Upload, Alert, message, Image } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import api from "../../services/api";

const ReportIncidentModal = ({ visible, onClose, ticket, onSuccess }) => {
    const [reportForm] = Form.useForm();
    const[isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [fileList, setFileList] = useState([]);

    const handleClose = () => {
        reportForm.resetFields();
        setFileList([]);
        onClose();
    };

    const beforeUpload = (file) => {
        const isValidType = file.type.startsWith("image/") || file.type.startsWith("video/");
        if (!isValidType) {
            message.error("Chỉ chấp nhận file ảnh hoặc video");
            return Upload.LIST_IGNORE;
        }
        const isLt20MB = file.size / 1024 / 1024 < 20;
        if (!isLt20MB) {
            message.error("File phải nhỏ hơn 20MB");
            return Upload.LIST_IGNORE;
        }
        return true;
    };

    const handleCustomUpload = ({ onSuccess }) => {
        setTimeout(() => onSuccess("pending"), 0);
    };

    const handleFileChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

    const handleSubmit = () => {
        reportForm.validateFields().then(async (values) => {
            try {
                setIsSubmittingReport(true);

                const formData = new FormData();
                formData.append("ticketId", ticket._id);
                if (ticket?.invoice?._id) {
                    formData.append("invoiceId", ticket.invoice._id);
                }

                formData.append("type", values.type);
                formData.append("description", values.description);

                fileList.forEach((f) => {
                    if (f.originFileObj) {
                        formData.append("file", f.originFileObj);
                    }
                });

                const res = await api.post("/incidents", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                message.success("Báo cáo đã được gửi tới bộ phận hỗ trợ.");
                onSuccess(res.data.data); // Trả dữ liệu incident về component cha
                handleClose();
            } catch (err) {
                message.error("Gửi báo cáo thất bại: " + (err.response?.data?.message || err.message));
            } finally {
                setIsSubmittingReport(false);
            }
        });
    };

    return (
        <Modal
            title="Báo cáo sự cố đơn hàng"
            open={visible}
            onCancel={handleClose}
            confirmLoading={isSubmittingReport}
            okText="Gửi báo cáo"
            cancelText="Hủy"
            onOk={handleSubmit}
        >
            <Form form={reportForm} layout="vertical">
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message="Hướng dẫn gửi báo cáo"
                    description={
                        <ul style={{ paddingLeft: 18, margin: 0 }}>
                            <li>Tối đa <b>5 file</b></li>
                            <li>Chỉ chấp nhận <b>ảnh hoặc video</b></li>
                            <li>Dung lượng mỗi file tối đa <b>20MB</b></li>
                            <li>Video nên dưới <b>30 giây</b> để tải nhanh</li>
                            <li>Mô tả sự cố tối thiểu <b>10 ký tự</b></li>
                        </ul>
                    }
                />
                <Form.Item name="type" label="Loại sự cố" rules={[{ required: true, message: 'Vui lòng chọn loại sự cố' }]}>
                    <Select placeholder="Chọn loại sự cố">
                        <Select.Option value="DAMAGE">Hư hỏng đồ đạc</Select.Option>
                        <Select.Option value="LOSS">Mất mát tài sản</Select.Option>
                        <Select.Option value="STAFF">Thái độ nhân viên</Select.Option>
                        <Select.Option value="OTHER">Khác</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="description" label="Mô tả chi tiết" rules={[{ required: true, message: 'Vui lòng mô tả chi tiết' }]}>
                    <Input.TextArea rows={4} placeholder="Vui lòng mô tả chi tiết sự cố..." />
                </Form.Item>
                <Form.Item label="Hình ảnh / Video minh chứng">
                    <Upload
                        customRequest={handleCustomUpload}
                        fileList={fileList}
                        onChange={handleFileChange}
                        beforeUpload={beforeUpload}
                        listType="picture-card"
                        accept="image/*,video/*"
                        multiple
                        maxCount={5}
                        itemRender={(originNode, file) => {
                            const isVideo = file.originFileObj?.type?.startsWith("video/") || file.type?.startsWith("video/");
                            const url = file.url || file.thumbUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : "");

                            if (isVideo) {
                                return (
                                    <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} muted />
                                );
                            }
                            return originNode;
                        }}
                        onPreview={(file) => {
                            const isVideo = file.originFileObj?.type?.startsWith("video/") || file.type?.startsWith("video/");
                            const url = file.url || file.thumbUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : "");
                            Modal.info({
                                title: file.name,
                                width: 600,
                                content: isVideo ? (
                                    <video controls style={{ width: "100%" }}>
                                        <source src={url} />
                                    </video>
                                ) : (
                                    <Image src={file.thumbUrl || file.url} />
                                ),
                                afterClose: () => {
                                    if (file.originFileObj) URL.revokeObjectURL(url);
                                }
                            });
                        }}
                    >
                        {fileList.length >= 5 ? null : (
                            <div>
                                <PlusOutlined />
                                <div style={{ marginTop: 8 }}>Tải lên</div>
                            </div>
                        )}
                    </Upload>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ReportIncidentModal;