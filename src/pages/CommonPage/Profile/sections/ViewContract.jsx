import { useEffect, useState } from "react";
import { Table, Button, Modal, Spin } from "antd";

export default function ViewContract() {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedContract, setSelectedContract] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const downloadPDF = async () => {
        const id = selectedContract._id;

        const res = await fetch(`${process.env.REACT_APP_API_URL}/contracts/export/${id}`, {
            method: "GET",
            headers: { "ngrok-skip-browser-warning": "69420" }
        });

        const blob = await res.blob(); // nhận file PDF dạng blob
        const url = window.URL.createObjectURL(blob);

        // Tạo link download ảo
        const a = document.createElement("a");
        a.href = url;
        a.download = `contract_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url);
    };

    useEffect(() => {
        fetch(`${process.env.REACT_APP_API_URL}/contracts`, {
            headers: { "ngrok-skip-browser-warning": "69420" }
        })
            .then(res => res.json())
            .then(data => {
                setContracts(data);
                setLoading(false);
            });
    }, []);

    const openModal = (contract) => {
        setSelectedContract(contract);
        setModalVisible(true);
    };

    const columns = [
        {
            title: "Người thuê",
            dataIndex: ["tenantId", "name"]
        },
        {
            title: "Phòng",
            dataIndex: ["roomId", "roomNumber"]
        },
        {
            title: "Nhà trọ",
            dataIndex: ["boardingHouseId", "name"]
        },
        {
            title: "Ngày ký",
            render: (_, r) => new Date(r.signedAt).toLocaleDateString()
        },
        {
            title: "Action",
            render: (_, contract) => (
                <Button onClick={() => openModal(contract)}>View</Button>
            )
        }
    ];


    if (loading) return <Spin />;

    return (
        <div className="container mt-4">
            <h2 className="mb-3">📄 Danh Sách Hợp Đồng Đã Ký</h2>

            <Table columns={columns} dataSource={contracts} rowKey="_id" />

            {/* Modal hiển thị từng hợp đồng */}
            <Modal
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                width={700}
                footer={null}
            >
                {selectedContract ? (
                    <div>
                        <h3>📄 Chi tiết hợp đồng</h3>

                        <p><strong>Người thuê:</strong> {selectedContract.tenantId?.name}</p>
                        <p><strong>Phòng:</strong> {selectedContract.roomId?.roomNumber}</p>
                        <p><strong>Nhà trọ:</strong> {selectedContract.boardingHouseId?.name}</p>
                        <p><strong>Ngày ký:</strong> {new Date(selectedContract.signedAt).toLocaleDateString()}</p>

                        <h4>Nội dung hợp đồng</h4>
                        <p>{selectedContract.contractContent}</p>

                        {/* 🔥 Thêm phần chữ ký */}
                        {/* 🔥 Phần chữ ký */}
                        <div
                            className="signature-section"
                            style={{
                                marginTop: 24,
                                display: 'flex',
                                justifyContent: 'space-around',
                                alignItems: 'flex-start', // căn trên cùng để thẳng hàng
                                gap: 40
                            }}
                        >
                            {/* Bên A */}
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <strong>BÊN A (Chủ trọ)</strong>
                                <div style={{ marginTop: 8 }}>
                                    {selectedContract.ownerSignature ? (
                                        <img
                                            src={`${process.env.REACT_APP_API_URL.replace('/api', '')}${selectedContract.ownerSignature}`}
                                            alt="signature-owner"
                                            style={{
                                                width: 200,
                                                height: 100,
                                                objectFit: 'contain',
                                                border: '1px solid #ddd',
                                                padding: 5,
                                                borderRadius: 4,
                                                backgroundColor: '#fff'
                                            }}
                                        />
                                    ) : (
                                        <p style={{ color: 'red', marginTop: 8 }}>Chưa tạo chữ ký</p>
                                    )}
                                </div>
                                <p style={{ marginTop: 8 }}>{selectedContract.ownerId?.name}</p>
                            </div>

                            {/* Bên B */}
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <strong>BÊN B (Người thuê)</strong>
                                <div style={{ marginTop: 8 }}>
                                    {selectedContract.signatureTenant ? (
                                        <img
                                            src={selectedContract.signatureTenant}
                                            alt="signature-tenant"
                                            style={{
                                                width: 200,
                                                height: 100,
                                                objectFit: 'contain',
                                                border: '1px solid #ddd',
                                                padding: 5,
                                                borderRadius: 4,
                                                backgroundColor: '#fff'
                                            }}
                                        />
                                    ) : (
                                        <p style={{ color: 'red', marginTop: 8 }}>Chưa ký</p>
                                    )}
                                </div>
                                <p style={{ marginTop: 8 }}>{selectedContract.tenantId?.name}</p>
                            </div>
                        </div>



                        {/* Nút Export PDF */}
                        <Button type="primary" onClick={downloadPDF}>
                            Export PDF
                        </Button>
                    </div>
                ) : null}
            </Modal>

        </div>
    );
}
