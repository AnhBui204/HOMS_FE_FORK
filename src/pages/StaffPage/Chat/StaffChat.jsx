import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input, Avatar, Badge, Button, Tooltip } from 'antd';
import {
    SearchOutlined, SendOutlined, PhoneOutlined,
    UserOutlined, SmileOutlined, PaperClipOutlined,
} from '@ant-design/icons';
import './StaffChat.css';

/* ══════════════════════════════════════════════════════════
   MOCK DATA
   TODO: Remove these and replace with real socket/API data
   - Conversations from  GET /api/messages/conversations
   - Messages from       GET /api/messages/:userId
   - Send via            socket.emit('send-message', payload)
══════════════════════════════════════════════════════════ */
const MOCK_CONVERSATIONS = [
    {
        id: 'conv-1',
        name: 'Nguyen Van A',
        role: 'Customer',
        avatar: null,
        online: true,
        lastMessage: 'Has my shipment been delivered yet?',
        lastTime: '10:42 AM',
        unread: 2,
    },
    {
        id: 'conv-2',
        name: 'System Admin',
        role: 'Admin',
        avatar: null,
        online: true,
        lastMessage: 'Please update the status for incident INC-2024-001.',
        lastTime: 'Yesterday',
        unread: 0,
    },
];

const MOCK_MESSAGES = {
    'conv-1': [
        { id: 'm1', senderId: 'conv-1', text: 'Hello, I would like to inquire about shipment HOMS-2024-00123.', time: '10:30 AM', isMe: false },
        { id: 'm2', senderId: 'me',     text: 'Hi there! Let me check on that for you, one moment please.', time: '10:31 AM', isMe: true },
        { id: 'm3', senderId: 'conv-1', text: 'Has my shipment been delivered yet?', time: '10:42 AM', isMe: false },
    ],
    'conv-2': [
        { id: 'm4', senderId: 'conv-2', text: 'Please update the status for incident INC-2024-001.', time: 'Yesterday', isMe: false },
        { id: 'm5', senderId: 'me',     text: 'Sure, I will update it right away.', time: 'Yesterday', isMe: true },
    ],
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
const StaffChat = () => {
    const [search, setSearch]               = useState('');
    const [activeId, setActiveId]           = useState('conv-1');
    const [allMessages, setAllMessages]     = useState(MOCK_MESSAGES);
    const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
    const [inputText, setInputText]         = useState('');
    const messagesEndRef = useRef(null);

    const activeConv  = conversations.find(c => c.id === activeId);
    const messages    = useMemo(() => allMessages[activeId] || [], [allMessages, activeId]);

    const filteredConvs = conversations.filter(c =>
        !search || c.name.toLowerCase().includes(search.toLowerCase())
    );

    /* ── scroll to bottom when messages change ─────────── */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /* ── mark conversation as read on open ─────────────── */
    useEffect(() => {
        setConversations(prev =>
            prev.map(c => c.id === activeId ? { ...c, unread: 0 } : c)
        );
    }, [activeId]);

    /* ── send message ───────────────────────────────────── */
    const handleSend = () => {
        const text = inputText.trim();
        if (!text) return;

        const newMsg = {
            id: `m-${Date.now()}`,
            senderId: 'me',
            text,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            isMe: true,
        };

        // TODO: replace with socket.emit('send-message', { to: activeId, text })
        setAllMessages(prev => ({
            ...prev,
            [activeId]: [...(prev[activeId] || []), newMsg],
        }));
        setConversations(prev =>
            prev.map(c => c.id === activeId ? { ...c, lastMessage: text, lastTime: 'Vừa xong' } : c)
        );
        setInputText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    /* ── render ─────────────────────────────────────────── */
    return (
        <div className="staff-chat">
            {/* ══ LEFT — CONVERSATION LIST ════════════════ */}
            <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                    <span className="chat-sidebar-title">Tin nhắn</span>
                </div>

                <div className="chat-search-wrap">
                    <Input
                        placeholder="Tìm kiếm..."
                        prefix={<SearchOutlined style={{ color: '#aaa' }} />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="chat-search-input"
                        allowClear
                    />
                </div>

                <div className="conv-list">
                    {filteredConvs.map(conv => (
                        <div
                            key={conv.id}
                            className={`conv-item ${activeId === conv.id ? 'active' : ''}`}
                            onClick={() => setActiveId(conv.id)}
                        >
                            <Badge dot={conv.online} color="#52c41a" offset={[-4, 36]}>
                                <Avatar
                                    size={44}
                                    icon={<UserOutlined />}
                                    style={{ background: conv.role === 'Admin' ? '#44624A' : '#1890ff', flexShrink: 0 }}
                                />
                            </Badge>
                            <div className="conv-info">
                                <div className="conv-top-row">
                                    <span className="conv-name">{conv.name}</span>
                                    <span className="conv-time">{conv.lastTime}</span>
                                </div>
                                <div className="conv-bottom-row">
                                    <span className="conv-last-msg">{conv.lastMessage}</span>
                                    {conv.unread > 0 && (
                                        <span className="conv-unread-badge">{conv.unread}</span>
                                    )}
                                </div>
                                <span className="conv-role-tag">{conv.role}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══ RIGHT — MESSAGE AREA ══════════════════════ */}
            <div className="chat-main">
                {/* Header */}
                <div className="chat-main-header">
                    <div className="chat-header-info">
                        <Badge dot={activeConv?.online} color="#52c41a" offset={[-4, 36]}>
                            <Avatar
                                size={40}
                                icon={<UserOutlined />}
                                style={{ background: activeConv?.role === 'Admin' ? '#44624A' : '#1890ff' }}
                            />
                        </Badge>
                        <div style={{ marginLeft: 12 }}>
                            <div className="chat-header-name">{activeConv?.name}</div>
                            <div className="chat-header-status">
                                {activeConv?.online ? (
                                    <span style={{ color: '#52c41a', fontSize: 12 }}>● Online</span>
                                ) : (
                                    <span style={{ color: '#aaa', fontSize: 12 }}>○ Offline</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="chat-header-actions">
                        <Tooltip title="Gọi điện">
                            <Button shape="circle" icon={<PhoneOutlined />} style={{ borderColor: '#44624A', color: '#44624A' }} />
                        </Tooltip>
                    </div>
                </div>

                {/* Messages */}
                <div className="messages-area">
                    {messages.map(msg => (
                        <div key={msg.id} className={`message-row ${msg.isMe ? 'me' : 'them'}`}>
                            {!msg.isMe && (
                                <Avatar size={32} icon={<UserOutlined />}
                                    style={{ background: activeConv?.role === 'Admin' ? '#44624A' : '#1890ff', flexShrink: 0, alignSelf: 'flex-end' }} />
                            )}
                            <div className={`message-bubble ${msg.isMe ? 'bubble-me' : 'bubble-them'}`}>
                                <span className="bubble-text">{msg.text}</span>
                                <span className="bubble-time">{msg.time}</span>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input bar */}
                <div className="chat-input-bar">
                    <Tooltip title="Đính kèm file">
                        <Button type="text" icon={<PaperClipOutlined />} className="input-action-btn" />
                    </Tooltip>
                    <Tooltip title="Emoji">
                        <Button type="text" icon={<SmileOutlined />} className="input-action-btn" />
                    </Tooltip>
                    <Input
                        className="chat-text-input"
                        placeholder="Nhập tin nhắn..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        className="send-btn"
                        onClick={handleSend}
                        disabled={!inputText.trim()}
                        style={{ background: '#44624A', borderColor: '#44624A' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default StaffChat;
