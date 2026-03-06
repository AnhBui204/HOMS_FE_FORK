import React from 'react';
import { Table, Button, Typography, Tag } from 'antd';
import { CarOutlined } from '@ant-design/icons';

const { Title } = Typography;

const ResourceAllocation = () => {
  const columns =[
    { title: 'Mã Ticket', dataIndex: 'code' },
    { title: 'Địa chỉ lấy', dataIndex: 'pickup' },
    { title: 'Địa chỉ giao', dataIndex: 'delivery' },
    { title: 'Trạng thái', dataIndex: 'status', render: () => <Tag color="blue">ACCEPTED</Tag> },
    {
      title: 'Thao tác',
      render: () => (
        <Button type="primary" style={{ background: '#52c41a' }} icon={<CarOutlined />}>
          Điều xe & Nhân sự
        </Button>
      )
    }
  ];

  const data =[
    { key: 1, code: 'REQ-005', pickup: 'Quận 1', delivery: 'Quận 7' }
  ];

  return (
    <div>
      <Title level={4}>Điều phối Xe & Đội ngũ bốc xếp</Title>
      <Table columns={columns} dataSource={data} />
    </div>
  );
};

export default ResourceAllocation;