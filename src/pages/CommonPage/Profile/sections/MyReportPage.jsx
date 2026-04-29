
import React, { useEffect, useState } from "react";
import { Table, Tag, Typography, Spin, message as antMessage, Alert } from "antd";
import { getMyReports } from "../../../../services/reportService";
import { useSelector } from "react-redux";
import { render } from "@testing-library/react";

const { Title } = Typography;

const MyReportsPage = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [messageApi, contextHolder] = antMessage.useMessage();
const { user, loading: userLoading } = useSelector((state) => state.auth);
    const [errorShown, setErrorShown] = useState(false);
    useEffect(() => {
        if (!userLoading && user) {
            fetchReports();
        }
    }, [userLoading, user]);

    const fetchReports = async () => {
        try {
            const res = await getMyReports();
            setReports(res.data);
            setErrorShown(false);
        } catch (err) {
            console.error(err);
            if (err.response?.status !== 401 && !errorShown) {
                messageApi.error("Failed to load reports.");
                setErrorShown(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: "Category",
            dataIndex: "type",
            key: "type",
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => {
                let color;
                switch (status) {
                    case "Pending":
                        color = "gold";
                        break;
                    case "Reviewed":
                        color = "blue";
                        break;
                    case "Approved":
                        color = "green";
                        break;
                    case "Rejected":
                        color = "red";
                        break;
                    default:
                        color = "gray";
                }
                return <Tag color={color}>{status}</Tag>;
            },
        },
        {
            title: "Content",
            dataIndex: "content",
            key: "content",
            render: (text) => text
        },

        {
            title: "Admin Feedback",
            dataIndex: "adminFeedback",
            key: "adminFeedback",
            render: (text) => text || <i>No feedback yet</i>,
        },
        {
            title: "Submitted At",
            dataIndex: "createAt",
            key: "createAt",
            render: (date) => new Date(date).toLocaleString(),
        },
    ];

    if (userLoading) {
        return (
            <div style={{ textAlign: "center", marginTop: 50 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ textAlign: "center", marginTop: 50 }}>
                <Title level={4}>Please log in to view your reports.</Title>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
            {contextHolder}
            <Title level={2}>My Reports</Title>

            <Alert
                type="info"
                showIcon
                message="All your submitted reports and admin responses are listed below."
                style={{ marginBottom: 24 }}
            />

            {loading ? (
                <Spin size="large" />
            ) : (
                <Table columns={columns} dataSource={reports} rowKey="_id" />
            )}
        </div>
    );
};

export default MyReportsPage;
