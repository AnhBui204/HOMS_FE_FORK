import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Layout, Badge } from 'antd';
import { 
  VideoCameraOutlined, 
  CloseOutlined, 
  SendOutlined, 
  PhoneOutlined, 
  AudioMutedOutlined, 
  AudioOutlined, 
  VideoCameraAddOutlined,
  MessageOutlined,
  TeamOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import AppHeader from '../../components/header/header';
import AppFooter from '../../components/footer/footer';
import useUser from '../../contexts/UserContext';
import { getValidAccessToken } from '../../services/authService';
import api from '../../services/api';
import './VideoChat.css';

// STUN + TURN servers — TURN is required in production so media can be
// relayed when peers are behind symmetric NAT (common on Render/cloud).
const iceServers = {
  iceServers: [
    // STUN — discover public IP
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN — relay fallback (Open Relay, free)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turns:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};


const STATUS_MAP = {
  CREATED:         { label: 'Mới tạo',            color: '#6b7280' },
  WAITING_SURVEY:  { label: 'Chờ khảo sát',        color: '#f59e0b' },
  SURVEYED:        { label: 'Đã khảo sát',          color: '#3b82f6' },
  QUOTED:          { label: 'Đã báo giá',           color: '#8b5cf6' },
  ACCEPTED:        { label: 'Đã chấp nhận',         color: '#10b981' },
  IN_PROGRESS:     { label: 'Đang thực hiện',       color: '#f97316' },
  COMPLETED:       { label: 'Hoàn thành',           color: '#22c55e' },
  CANCELLED:       { label: 'Đã hủy',              color: '#ef4444' },
  WAITING_REVIEW:  { label: 'Chờ xem xét',          color: '#a855f7' },
};

const getStatus = (status) => STATUS_MAP[status] || { label: status, color: '#6b7280' };

const { Content } = Layout;

function VideoChat() {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isCustomer = location.pathname.startsWith('/customer');
  const initialRoomId = searchParams.get('room') || (isCustomer ? 'test-room' : null);
  
  const [dispatcherTickets, setDispatcherTickets] = useState([]);
  const [socket, setSocket] = useState(null);
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState(initialRoomId);
  const userName = user?.fullName || user?.email || 'Người dùng';

  const activeTicket = dispatcherTickets.find(t => t.code === roomId);
  const receiverName = isCustomer 
    ? 'Nhân viên hỗ trợ' 
    : (activeTicket?.customerId?.fullName || activeTicket?.customer?.fullName || 'Khách hàng');
  
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  
  const [isInCall, setIsInCall] = useState(false);
  const [incomingCallFrom, setIncomingCallFrom] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // Setup Socket connection with authentication
  useEffect(() => {
    let newSocket;
    const initializeSocket = async () => {
      if (!roomId) return;
      try {
        const token = await getValidAccessToken();
        const BASE_URL = process.env.REACT_APP_SOCKET_URL || (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/api$/, '')) || 'http://localhost:5000';
        newSocket = io(`${BASE_URL}/video-chat`, {
          auth: { token },
          transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
          setSocket(newSocket);
          newSocket.emit('join_room', roomId);
          setJoined(true);
        });

        newSocket.on('connect_error', (err) => {
          console.error('[VideoChat] Lỗi kết nối socket:', err.message);
        });
      } catch (err) {
        console.error('[VideoChat] Lỗi khởi tạo socket', err);
      }
    };
    
    initializeSocket();
    return () => { if (newSocket) newSocket.disconnect(); };
  }, [roomId]);

  // Fetch tickets for dispatcher sidebar
  useEffect(() => {
    if (!isCustomer && user) {
      const fetchTickets = async () => {
        try {
          const dId = user.userId || user.id || user._id;
          const res = await api.get(`/request-tickets?dispatcherId=${dId}`);
          if (res.data?.success) setDispatcherTickets(res.data.data);
        } catch (err) {
          console.error('Không thể tải danh sách đơn hàng:', err);
        }
      };
      fetchTickets();
    }
  }, [isCustomer, user]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;
    
    const handleChatHistory = (history) => {
      const formattedHistory = history.map(msg => ({
        message: msg.content,
        sender: msg.senderName,
        time: new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(formattedHistory);
    };
    
    const handleReceiveMessage = (data) => setMessages((prev) => [...prev, data]);
    const handleUserJoined = ({ userId }) => console.log('Người dùng tham gia phòng:', userId);
    const handleOffer = async ({ caller, offer, callerName }) => {
      setIncomingCallFrom({ callerId: caller, callerName, offer });
    };
    const handleAnswer = async ({ answer }) => {
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        processPendingCandidates();
      } catch (err) {
        console.error('Lỗi xử lý phản hồi cuộc gọi:', err);
      }
    };
    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peerConnectionRef.current) {
          if (peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        }
      } catch (err) {
        console.warn('Lỗi ICE candidate (có thể bỏ qua):', err);
      }
    };
    const handleUserDisconnected = () => endCall();
    const handleCallEnded = () => endCall();

    socket.on('chat_history', handleChatHistory);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('user_disconnected', handleUserDisconnected);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('chat_history', handleChatHistory);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('user_disconnected', handleUserDisconnected);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket]);

  const processPendingCandidates = () => {
    if (peerConnectionRef.current?.remoteDescription) {
      pendingCandidatesRef.current.forEach(async (candidate) => {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Lỗi thêm ICE candidate:', e);
        }
      });
      pendingCandidatesRef.current = [];
    }
  };

  const startMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('Không thể truy cập camera/microphone:', err);
      alert('Không thể truy cập camera hoặc microphone. Vui lòng cấp quyền và thử lại.');
      return null;
    }
  };

  const createPeerConnection = (targetUserId) => {
    pendingCandidatesRef.current = [];
    peerConnectionRef.current = new RTCPeerConnection(iceServers);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { target: targetUserId, candidate: event.candidate });
      }
    };

    // Log ICE gathering & connection state for debugging
    peerConnectionRef.current.oniceconnectionstatechange = () => {
      const state = peerConnectionRef.current?.iceConnectionState;
      console.log('[WebRTC] ICE connection state:', state);
      if (state === 'failed') {
        console.warn('[WebRTC] ICE failed — trying ICE restart');
        peerConnectionRef.current.restartIce();
      }
    };

    peerConnectionRef.current.onconnectionstatechange = () => {
      const state = peerConnectionRef.current?.connectionState;
      console.log('[WebRTC] Peer connection state:', state);
    };

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
  };


  const initiateCall = async () => {
    const stream = await startMediaStream();
    if (!stream) return;
    setIsInCall(true);
    createPeerConnection(roomId);
    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socket.emit('offer', { target: roomId, caller: socket.id, callerName: userName, offer });
    } catch (err) {
      console.error('Lỗi tạo offer:', err);
    }
  };

  const answerCall = async () => {
    if (!incomingCallFrom) return;
    const stream = await startMediaStream();
    if (!stream) { setIncomingCallFrom(null); return; }
    setIsInCall(true);
    createPeerConnection(incomingCallFrom.callerId);
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(incomingCallFrom.offer));
      processPendingCandidates();
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socket.emit('answer', { target: incomingCallFrom.callerId, answer });
      setIncomingCallFrom(null);
    } catch (err) {
      console.error('Lỗi chấp nhận cuộc gọi:', err);
    }
  };

  const declineCall = () => setIncomingCallFrom(null);

  const endCall = () => {
    setIsInCall(false);
    setIncomingCallFrom(null);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socket) socket.emit('call_ended', { roomId });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket) return;
    const data = {
      roomId,
      message: messageInput,
      sender: userName,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    socket.emit('send_message', data);
    setMessageInput('');
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setIsVideoEnabled(videoTrack.enabled); }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsAudioEnabled(audioTrack.enabled); }
    }
  };

  useEffect(() => {
    if (isInCall && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isInCall]);

  const renderContent = () => {
    if (!roomId) {
      return (
        <div className="vc-app-container">
          <div className="vc-empty-state">
            <div className="vc-empty-icon"><MessageOutlined /></div>
            <h3>Chọn một cuộc trò chuyện</h3>
            <p>Vui lòng chọn đơn hàng từ danh sách bên trái để bắt đầu chat.</p>
          </div>
        </div>
      );
    }

    if (!joined || !socket) {
      return (
        <div className="vc-app-container">
          <div className="vc-empty-state">
            <div className="vc-empty-icon vc-loading"><LoadingOutlined /></div>
            <h3>Đang kết nối phòng bảo mật...</h3>
            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="vc-app-container">

        {/* Incoming Call Modal */}
        {incomingCallFrom && !isInCall && (
          <div className="vc-incoming-overlay">
            <div className="vc-incoming-modal">
              <div className="vc-incoming-pulse">
                <PhoneOutlined className="vc-incoming-phone-icon" />
              </div>
              <h3>Cuộc gọi video đến</h3>
              <p><strong>{incomingCallFrom.callerName || 'Ai đó'}</strong> đang gọi cho bạn...</p>
              <div className="vc-incoming-actions">
                <button className="vc-btn-decline" onClick={declineCall} title="Từ chối">
                  <CloseOutlined />
                  <span>Từ chối</span>
                </button>
                <button className="vc-btn-accept" onClick={answerCall} title="Chấp nhận">
                  <PhoneOutlined />
                  <span>Chấp nhận</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`vc-workspace ${isCustomer ? 'vc-workspace--customer' : 'vc-workspace--dispatcher'}`}>
          
          {/* Chat Panel */}
          <div className={`vc-panel vc-chat-panel ${isInCall ? 'vc-chat-panel--split' : ''}`}>
            <div className="vc-chat-header">
              <div className="vc-chat-header-info">
                <div className="vc-avatar">{receiverName.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="vc-chat-header-name">{receiverName}</div>
                  <div className="vc-room-badge">
                    <span className="vc-room-dot" />
                    {roomId}
                  </div>
                </div>
              </div>
              {!isInCall && (
                <button
                  className="vc-btn-video-start"
                  onClick={initiateCall}
                  title="Bắt đầu cuộc gọi video"
                >
                  <VideoCameraAddOutlined />
                </button>
              )}
            </div>
            
            <div className="vc-messages" ref={chatContainerRef}>
              {messages.length === 0 && (
                <div className="vc-messages-empty">
                  <MessageOutlined style={{ fontSize: 28, opacity: 0.3 }} />
                  <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMine = msg.sender === userName;
                return (
                  <div key={idx} className={`vc-message ${isMine ? 'vc-message--mine' : 'vc-message--other'}`}>
                    {!isMine && <div className="vc-message-sender">{msg.sender}</div>}
                    <div className="vc-message-bubble">{msg.message}</div>
                    <div className="vc-message-time">{msg.time}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form className="vc-chat-input" onSubmit={handleSendMessage}>
              <input
                className="vc-input"
                placeholder="Nhập tin nhắn..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
              <button type="submit" className="vc-btn-send">
                <SendOutlined />
              </button>
            </form>
          </div>

          {/* Video Panel */}
          {isInCall && (
            <div className="vc-panel vc-video-panel">
              <div className="vc-video-header">
                <div className="vc-video-header-title">
                  <span className="vc-live-dot" />
                  Đang gọi trực tiếp
                </div>
                <span className="vc-room-badge vc-room-badge--dark">{roomId}</span>
              </div>
              
              <div className="vc-video-grid">
                <div className="vc-video-wrapper">
                  <video ref={localVideoRef} autoPlay playsInline muted className="vc-video" />
                  <div className="vc-video-label">{userName} (Bạn)</div>
                </div>
                <div className="vc-video-wrapper">
                  <video ref={remoteVideoRef} autoPlay playsInline className="vc-video vc-video--remote" />
                  <div className="vc-video-label">{receiverName}</div>
                </div>
              </div>

              <div className="vc-controls">
                <button
                  className={`vc-ctrl-btn ${!isAudioEnabled ? 'vc-ctrl-btn--off' : ''}`}
                  onClick={toggleAudio}
                  title={isAudioEnabled ? 'Tắt micro' : 'Bật micro'}
                >
                  {isAudioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
                  <span>{isAudioEnabled ? 'Micro' : 'Đã tắt'}</span>
                </button>
                <button
                  className="vc-ctrl-btn vc-ctrl-btn--end"
                  onClick={endCall}
                  title="Kết thúc cuộc gọi"
                >
                  <PhoneOutlined style={{ transform: 'rotate(135deg)' }} />
                  <span>Kết thúc</span>
                </button>
                <button
                  className={`vc-ctrl-btn ${!isVideoEnabled ? 'vc-ctrl-btn--off' : ''}`}
                  onClick={toggleVideo}
                  title={isVideoEnabled ? 'Tắt camera' : 'Bật camera'}
                >
                  <VideoCameraOutlined />
                  <span>{isVideoEnabled ? 'Camera' : 'Đã tắt'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSidebar = () => {
    if (isCustomer) return null;
    return (
      <div className="vc-sidebar">
        <div className="vc-sidebar-header">
          <TeamOutlined className="vc-sidebar-header-icon" />
          <div>
            <div className="vc-sidebar-title">Đơn hàng quản lý</div>
            <div className="vc-sidebar-subtitle">Chọn đơn để vào phòng chat</div>
          </div>
        </div>
        <div className="vc-sidebar-list">
          {dispatcherTickets.map(ticket => {
            const isActive = roomId === ticket.code;
            const statusInfo = getStatus(ticket.status);
            const customerName = ticket.customerId?.fullName || ticket.customer?.fullName || 'Khách hàng';
            return (
              <div
                key={ticket._id}
                className={`vc-sidebar-item ${isActive ? 'vc-sidebar-item--active' : ''}`}
                onClick={() => {
                  if (roomId !== ticket.code) {
                    setMessages([]);
                    setRoomId(ticket.code);
                    setSearchParams({ room: ticket.code });
                  }
                }}
              >
                <div className="vc-sidebar-item-avatar">{customerName.charAt(0).toUpperCase()}</div>
                <div className="vc-sidebar-item-info">
                  <div className="vc-sidebar-item-name">{customerName}</div>
                  <div className="vc-sidebar-item-code">#{ticket.code?.slice(-10)}</div>
                  <div className="vc-sidebar-item-status">
                    <span
                      className="vc-status-dot"
                      style={{ background: statusInfo.color }}
                    />
                    <span style={{ color: statusInfo.color, fontWeight: 600 }}>{statusInfo.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {dispatcherTickets.length === 0 && (
            <div className="vc-sidebar-empty">
              <TeamOutlined style={{ fontSize: 28, opacity: 0.3 }} />
              <p>Không có đơn hàng nào</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isCustomer) {
    return (
      <Layout className="vc-layout">
        <AppHeader />
        <Content className="vc-layout-content">
          {renderContent()}
        </Content>
        <AppFooter />
      </Layout>
    );
  }

  return (
    <div className="vc-dispatcher-root">
      {renderSidebar()}
      <div className="vc-dispatcher-main">
        {renderContent()}
      </div>
    </div>
  );
}

export default VideoChat;
