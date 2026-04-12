import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';
import './NotFound.css';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="not-found-container">
            <Result
                status="404"
                title="404"
                subTitle="Xin lỗi, trang bạn đang tìm kiếm không tồn tại."
                extra={
                    <Button 
                        type="primary" 
                        size="large" 
                        onClick={() => navigate('/')}
                        className="home-button"
                    >
                        Quay lại trang chủ
                    </Button>
                }
            />
        </div>
    );
};

export default NotFound;
