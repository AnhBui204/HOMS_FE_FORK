import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Layout, Badge, Image, Progress, Dropdown, Menu } from 'antd';
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
  PaperClipOutlined,
  FileImageOutlined,
  EyeOutlined,
  DownloadOutlined,
  MoreOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  FileDoneOutlined
} from '@ant-design/icons';
import AppHeader from '../../components/header/header';
import AppFooter from '../../components/footer/footer';
import { useSelector } from 'react-redux';
import { getValidAccessToken } from '../../services/authService';
import api from '../../services/api';
import './VideoChat.css';

// STUN + TURN servers — TURN is required when peers are behind symmetric NAT
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '98c57974889108f36474ce71',
      credential: 'PMVbUKy2rpWEKy/H',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: '98c57974889108f36474ce71',
      credential: 'PMVbUKy2rpWEKy/H',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '98c57974889108f36474ce71',
      credential: 'PMVbUKy2rpWEKy/H',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: '98c57974889108f36474ce71',
      credential: 'PMVbUKy2rpWEKy/H',
    }
  ],
};


const STATUS_MAP = {
  CREATED: { label: 'Mới tạo', color: '#6b7280' },
  WAITING_SURVEY: { label: 'Chờ khảo sát', color: '#f59e0b' },
  SURVEYED: { label: 'Đã khảo sát', color: '#3b82f6' },
  QUOTED: { label: 'Đã báo giá', color: '#8b5cf6' },
  ACCEPTED: { label: 'Đã chấp nhận', color: '#10b981' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: '#f97316' },
  COMPLETED: { label: 'Hoàn thành', color: '#22c55e' },
  CANCELLED: { label: 'Đã hủy', color: '#ef4444' },
  WAITING_REVIEW: { label: 'Chờ xem xét', color: '#a855f7' },
};

const getStatus = (status) => STATUS_MAP[status] || { label: status, color: '#6b7280' };

const { Content } = Layout;

function VideoChat() {
   const { user } = useSelector((state) => state.auth);
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
  const fileInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(null);

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

    const fetchMessages = async () => {
      if (!roomId) return;
      try {
        const { default: api } = await import('../../services/api');
        const res = await api.get(`/messages/ticket/${roomId}?page=1&limit=50`);
        if (res.data?.success) {
          const formatted = res.data.data.map(msg => ({
            _id: msg._id,
            message: msg.content,
            type: msg.type,
            attachments: msg.attachments,
            senderName: msg.senderName,
            senderId: msg.senderId,
            time: new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.error('[VideoChat] Error fetching message history via API:', err);
      }
    };

    fetchMessages();
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

    const handleReceiveMessage = (data) => setMessages((prev) => [...prev, data]);
    const handleUserJoined = ({ userId }) => console.log('Người dùng tham gia phòng:', userId);
    const handleOffer = async ({ caller, offer, callerName }) => {
      console.log(`[WebRTC] Nhận offer từ ${callerName} (${caller})`);
      pendingCandidatesRef.current = []; // Clear buffer for new incoming call
      setIncomingCallFrom({ callerId: caller, callerName, offer });
    };
    const handleAnswer = async ({ answer }) => {
      console.log('[WebRTC] Nhận answer, thiết lập remote description...');
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[WebRTC] Thiết lập remote description thành công.');
        await processPendingCandidates();
      } catch (err) {
        console.error('Lỗi xử lý phản hồi cuộc gọi:', err);
      }
    };
    const handleIceCandidate = async (data) => {
      const { candidate } = data;
      console.log(`[WebRTC] Nhận ICE candidate từ socket target:`, data.target || 'unknown');
      try {
        if (peerConnectionRef.current) {
          if (peerConnectionRef.current.remoteDescription) {
            console.log('[WebRTC] Đang thêm ICE candidate trực tiếp...');
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            console.log('[WebRTC] Đang đệm ICE candidate (remoteDescription chưa sẵn sàng)...');
            pendingCandidatesRef.current.push(candidate);
          }
        } else {
          console.log('[WebRTC] Đang đệm ICE candidate (chưa có PeerConnection)...');
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (err) {
        console.warn('Lỗi ICE candidate (có thể bỏ qua):', err);
      }
    };
    const handleUserDisconnected = ({ userId }) => {
      console.log(`[VideoChat] Socket đối phương (${userId}) bị ngắt. WebRTC vẫn sẽ tiếp tục nếu đường truyền P2P ổn định.`);
      // Không gọi endCall() ở đây để tránh làm rớt cuộc gọi khi người dùng chuyển tab làm WebSocket bị sleep.
    };
    const handleCallEnded = () => endCall();

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('user_disconnected', handleUserDisconnected);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('user_disconnected', handleUserDisconnected);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket]);

  const processPendingCandidates = async () => {
    if (peerConnectionRef.current?.remoteDescription) {
      console.log(`[WebRTC] Đang xử lý ${pendingCandidatesRef.current.length} ICE candidates đệm...`);
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Lỗi thêm ICE candidate từ đệm:', e);
        }
      }
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
    peerConnectionRef.current = new RTCPeerConnection(iceServers);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] Đang gửi ICE candidate tới target: ${targetUserId}`);
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
      if (remoteVideoRef.current) {
        if (event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        } else {
          let stream = remoteVideoRef.current.srcObject;
          if (!stream) {
            stream = new MediaStream();
            remoteVideoRef.current.srcObject = stream;
          }
          stream.addTrack(event.track);
        }
        setIsCalling(false); // Stop showing "Calling..." when remote stream is received
      }
    };
  };

  const initiateCall = async () => {
    pendingCandidatesRef.current = []; // Clear buffer for new outgoing call
    const stream = await startMediaStream();
    if (!stream) return;
    setIsInCall(true);
    setIsCalling(true);
    createPeerConnection(roomId);
    try {
      console.log('[WebRTC] Tạo offer...');
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      console.log(`[WebRTC] Gửi offer tới target: ${roomId}, callerId: ${socket.id}`);
      socket.emit('offer', { target: roomId, caller: socket.id, callerName: userName, offer });
    } catch (err) {
      console.error('Lỗi tạo offer:', err);
      setIsCalling(false);
    }
  };

  const answerCall = async () => {
    if (!incomingCallFrom) return;
    const stream = await startMediaStream();
    if (!stream) { setIncomingCallFrom(null); return; }
    setIsInCall(true);
    console.log(`[WebRTC] Khởi tạo answerCall với callerId: ${incomingCallFrom.callerId}`);
    createPeerConnection(incomingCallFrom.callerId);
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(incomingCallFrom.offer));
      processPendingCandidates();
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      console.log(`[WebRTC] Gửi answer tới target: ${incomingCallFrom.callerId}`);
      socket.emit('answer', { target: incomingCallFrom.callerId, answer });
      setIncomingCallFrom(null);
    } catch (err) {
      console.error('Lỗi chấp nhận cuộc gọi:', err);
    }
  };

  const declineCall = () => setIncomingCallFrom(null);

  const endCall = () => {
    setIsInCall(false);
    setIsCalling(false);
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
    if (e) e.preventDefault();
    if (!messageInput.trim() || !socket) return;
    const data = {
      roomId,
      message: messageInput,
      type: 'Text',
      sender: userName,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    socket.emit('send_message', data);
    setMessageInput('');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !socket) return;

    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const res = await api.post('/uploads/chat-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (res.data?.success) {
        const uploadedMedia = res.data.data;
        const attachments = uploadedMedia.map(item => ({
          url: item.url,
          type: item.resourceType === 'image' ? 'Image' : (item.resourceType === 'video' ? 'Video' : 'File')
        }));

        const data = {
          roomId,
          message: '',
          type: 'Media',
          attachments,
          sender: userName,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };
        socket.emit('send_message', data);
      }
    } catch (err) {
      console.error('Lỗi tải file:', err);
      alert('Không thể tải file. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper for downloading media
  const downloadMedia = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'HOMS-Media';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        {/* Video Preview Modal */}
        {previewVideo && (
          <div className="vc-video-preview-overlay" onClick={() => setPreviewVideo(null)}>
            <div className="vc-video-preview-modal" onClick={e => e.stopPropagation()}>
              <button className="vc-video-preview-close" onClick={() => setPreviewVideo(null)}>×</button>
              <video 
                src={previewVideo} 
                className="vc-video-preview-player" 
                controls 
                autoPlay
                playsInline
              />
            </div>
          </div>
        )}

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
                // if (msg.type === 'System') {
                //   return (
                //     <div key={msg._id || idx} className="vc-system-message-wrapper">
                //       <div className="vc-system-bubble">
                //         <span className="vc-system-text">{msg.message}</span>
                //         <span className="vc-system-time">{msg.time}</span>
                //       </div>
                //     </div>
                //   );
                // }

                const myUserId = user?.id || user?.userId || user?._id;
                const isMine = msg.senderId ? String(msg.senderId) === String(myUserId) : msg.sender === userName;
                const isMediaOnly = msg.type === 'Media' && !msg.message;

                return (
                  <div 
                    key={msg._id || idx}
                    className={`vc-message ${isMine ? 'vc-message--mine' : 'vc-message--other'} ${isMediaOnly ? 'vc-message--media-only' : ''}`}
                  >
                    {!isMine && <div className="vc-message-sender">{msg.senderName || msg.sender}</div>}
                    <div className="vc-message-bubble">
                      {msg.type === 'Media' && msg.attachments && (() => {
                        const images = msg.attachments.filter(a => a.type === 'Image');
                        const videos = msg.attachments.filter(a => a.type === 'Video');
                        const files = msg.attachments.filter(a => a.type === 'File' || (!['Image', 'Video'].includes(a.type)));

                        const renderSectionBurger = (items, label) => (
                          <div className="vc-attachment-section-header">
                            <span className="vc-attachment-section-title">{label} ({items.length})</span>
                            <Dropdown
                              overlay={
                                <Menu>
                                  <Menu.Item 
                                    key="download-all" 
                                    icon={<DownloadOutlined />} 
                                    onClick={() => items.forEach((att, idx) => setTimeout(() => downloadMedia(att.url), idx * 300))}
                                  >
                                    Tải xuống tất cả
                                  </Menu.Item>
                                  <Menu.Item 
                                    key="details" 
                                    icon={<InfoCircleOutlined />}
                                    onClick={() => alert(`Thông tin: Section này chứa ${items.length} ${label.toLowerCase()}.`)}
                                  >
                                    Xem chi tiết
                                  </Menu.Item>
                                </Menu>
                              }
                              trigger={['click']}
                              placement="bottomRight"
                            >
                              <div className="vc-section-burger">
                                <MoreOutlined />
                              </div>
                            </Dropdown>
                          </div>
                        );

                        return (
                          <div className="vc-attachments-container">
                            {images.length > 0 && (
                              <div className="vc-attachment-group">
                                {renderSectionBurger(images, "Hình ảnh")}
                                <Image.PreviewGroup>
                                  <div className={`vc-message-attachments ${images.length >= 3 ? 'vc-message-attachments--grid' : ''}`}>
                                    {images.map((att, attIdx) => (
                                      <div key={attIdx} className="vc-attachment-item">
                                        <div className="vc-media-options">
                                          <Dropdown
                                            overlay={
                                              <Menu>
                                                <Menu.Item icon={<DownloadOutlined />} onClick={() => downloadMedia(att.url)}>Tải xuống</Menu.Item>
                                              </Menu>
                                            }
                                            trigger={['click']}
                                          >
                                            <div className="vc-media-burger"><MoreOutlined /></div>
                                          </Dropdown>
                                        </div>
                                        <Image 
                                          src={att.url} 
                                          className="vc-chat-image"
                                          placeholder={<div className="vc-image-placeholder"><LoadingOutlined /></div>}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </Image.PreviewGroup>
                              </div>
                            )}
                            
                            {videos.length > 0 && (
                              <div className="vc-attachment-group">
                                {renderSectionBurger(videos, "Video")}
                                <div className={`vc-message-attachments ${videos.length >= 3 ? 'vc-message-attachments--grid' : ''}`}>
                                  {videos.map((att, attIdx) => (
                                    <div key={attIdx} className="vc-attachment-item">
                                      <div className="vc-media-options">
                                        <Dropdown
                                          overlay={
                                            <Menu>
                                              <Menu.Item icon={<DownloadOutlined />} onClick={() => downloadMedia(att.url)}>Tải xuống</Menu.Item>
                                              <Menu.Item icon={<EyeOutlined />} onClick={() => setPreviewVideo(att.url)}>Xem chi tiết</Menu.Item>
                                            </Menu>
                                          }
                                          trigger={['click']}
                                        >
                                          <div className="vc-media-burger"><MoreOutlined /></div>
                                        </Dropdown>
                                      </div>
                                      <div className="vc-video-container" onClick={() => setPreviewVideo(att.url)} style={{ cursor: 'pointer' }}>
                                        <video 
                                          src={att.url} 
                                          className="vc-chat-video" 
                                          playsInline
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {files.length > 0 && (
                              <div className="vc-attachment-group">
                                {renderSectionBurger(files, "Tài liệu")}
                                <div className="vc-message-attachments vc-message-attachments--files">
                                  {files.map((att, attIdx) => (
                                    <div key={attIdx} className="vc-file-attachment-item" onClick={() => downloadMedia(att.url)}>
                                      <div className="vc-file-icon">
                                        <FileTextOutlined />
                                      </div>
                                      <div className="vc-file-info">
                                        <div className="vc-file-name">{att.url.split('/').pop().split('?')[0] || 'Document'}</div>
                                        <div className="vc-file-size">Nhấn để tải xuống</div>
                                      </div>
                                      <DownloadOutlined className="vc-file-download-icon" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {msg.message && <div className="vc-message-text">{msg.message}</div>}
                    </div>
                    <div className="vc-message-time">{msg.time}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {isUploading && (
              <div className="vc-upload-progress-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Đang tải lên tài liệu khảo sát...</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{uploadProgress}%</span>
                </div>
                <Progress percent={uploadProgress} size="small" showInfo={false} strokeColor="#44624a" />
              </div>
            )}

            <form className="vc-chat-input" onSubmit={handleSendMessage}>
              <input
                type="file"
                multiple
                hidden
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              />
              <button
                type="button"
                className="vc-btn-attach"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <LoadingOutlined /> : <PaperClipOutlined />}
              </button>
              <input
                className="vc-input"
                placeholder="Nhập tin nhắn..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={isUploading}
              />
              <button type="submit" className="vc-btn-send" disabled={isUploading || !messageInput.trim()}>
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
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="vc-video vc-video--remote" 
                    style={{ display: isCalling ? 'none' : 'block' }}
                  />
                  {isCalling && (
                    <div className="vc-video-placeholder">
                      <div className="vc-calling-animation">
                        <LoadingOutlined />
                      </div>
                      <p>Đang kết nối với {receiverName}...</p>
                    </div>
                  )}
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
