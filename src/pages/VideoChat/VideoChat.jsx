import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import { 
  VideoCameraOutlined, 
  CloseOutlined, 
  SendOutlined, 
  PhoneOutlined, 
  AudioMutedOutlined, 
  AudioOutlined, 
  VideoCameraAddOutlined 
} from '@ant-design/icons';
import AppHeader from '../../components/header/header';
import AppFooter from '../../components/footer/footer';
import useUser from '../../contexts/UserContext';
import { getValidAccessToken } from '../../services/authService';
import api from '../../services/api';
import './VideoChat.css';

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

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
  // Default to full name or email
  const userName = user?.fullName || user?.email || 'User';

  const activeTicket = dispatcherTickets.find(t => t.code === roomId);
  const receiverName = isCustomer 
    ? 'Hỗ trợ' 
    : (activeTicket?.customerId?.fullName || activeTicket?.customer?.fullName || 'Khách hàng');
  
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  
  // Call State
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
  
  // Ref to queue ICE candidates received before the remote description is fully set
  const pendingCandidatesRef = useRef([]);

  // Setup Socket connection with authentication
  useEffect(() => {
    let newSocket;
    const initializeSocket = async () => {
      if (!roomId) return;
      try {
        const token = await getValidAccessToken();
        const BASE_URL = process.env.REACT_APP_SOCKET_URL || (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/api$/, '')) || 'http://localhost:5000';
        // Connect to the specialized /video-chat namespace
        newSocket = io(`${BASE_URL}/video-chat`, {
          auth: { token },
          transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
          console.log('[VideoChat] Connected to socket server');
          setSocket(newSocket);
          // Auto join room
          newSocket.emit('join_room', roomId);
          setJoined(true);
        });

        newSocket.on('connect_error', (err) => {
          console.error('[VideoChat] Socket connection error:', err.message);
        });
      } catch (err) {
        console.error('[VideoChat] Error connecting socket', err);
      }
    };
    
    initializeSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [roomId]);

  // Fetch tickets for dispatcher sidebar
  useEffect(() => {
    if (!isCustomer && user) {
      const fetchTickets = async () => {
        try {
          // Specify dispatcherId to ensure we only get tickets assigned uniquely to them
          const dId = user.userId || user.id || user._id;
          const res = await api.get(`/request-tickets?dispatcherId=${dId}`);
          if (res.data?.success) {
            setDispatcherTickets(res.data.data);
          }
        } catch (err) {
          console.error("Failed to fetch dispatcher tickets:", err);
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
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(formattedHistory);
    };
    
    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };
    const handleUserJoined = ({ userId, user: joinedUser }) => {
      console.log('User joined room', userId, joinedUser);
    };
    const handleOffer = async ({ caller, offer, callerName }) => {
      console.log('Received offer from', caller);
      setIncomingCallFrom({ callerId: caller, callerName, offer });
    };
    const handleAnswer = async ({ answer }) => {
      console.log('Received answer');
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        processPendingCandidates();
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    };
    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peerConnectionRef.current) {
          if (peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            console.log('Queueing ICE candidate (remote description not set yet)');
            pendingCandidatesRef.current.push(candidate);
          }
        }
      } catch (err) {
        console.warn('ICE candidate error (often safely ignored if it arrived early):', err);
      }
    };
    const handleUserDisconnected = () => {
      console.log('Remote user disconnected');
      endCall();
    };
    const handleCallEnded = () => {
       endCall();
    };

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
    if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
      pendingCandidatesRef.current.forEach(async (candidate) => {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding queued candidate", e);
        }
      });
      pendingCandidatesRef.current = []; // Clear queue
    }
  };

  const startMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      alert('Could not access camera/microphone. Please allow permissions.');
      return null;
    }
  };

  const createPeerConnection = (targetUserId) => {
    pendingCandidatesRef.current = []; // Reset queue for new connection
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
      console.error('Error creating offer:', err);
    }
  };

  const answerCall = async () => {
    if (!incomingCallFrom) return;
    
    const stream = await startMediaStream();
    if (!stream) {
      setIncomingCallFrom(null); 
      return; 
    }

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
      console.error('Error handling offer:', err);
    }
  };

  const declineCall = () => {
    setIncomingCallFrom(null);
  };

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
    
    if (socket) {
        socket.emit('call_ended', { roomId });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket) return;

    const data = {
      roomId,
      message: messageInput,
      sender: userName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socket.emit('send_message', data);
    setMessageInput('');
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
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
        <div className="app-container">
          <div className="panel login-container" style={{ textAlign: 'center', padding: '40px' }}>
              <h3>Select a conversation to start</h3>
              <p>Please choose a ticket from the sidebar to view the chat and video call interface.</p>
          </div>
        </div>
      );
    }

    if (!joined || !socket) {
      return (
        <div className="app-container">
          <div className="panel login-container">
              <h3>Connecting to secure room...</h3>
          </div>
        </div>
      );
    }

    return (
      <div className="app-container">
      
      {incomingCallFrom && !isInCall && (
        <div className="incoming-call-modal">
          <div className="panel modal-content">
            <h3>Incoming Video Call</h3>
            <p>{incomingCallFrom.callerName || 'Someone'} is calling you...</p>
            <div className="modal-actions">
              <button className="btn-control danger" onClick={declineCall} title="Decline">
                <CloseOutlined style={{ fontSize: '20px' }} />
              </button>
              <button className="btn-control success" onClick={answerCall} title="Accept">
                <PhoneOutlined style={{ fontSize: '20px' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`workspace-container ${isCustomer ? 'customer-workspace' : 'dispatcher-workspace'}`}>
        
        {/* Chat Area */}
        <div className={isInCall ? "panel chat-section split-hidden-mobile" : "panel chat-section"} id="mobile-chat-toggle">
          <div className="chat-header">
            <div>
              {receiverName} <span className="room-badge">{roomId}</span>
            </div>
            {!isInCall && (
              <button className="btn-control primary-outline" style={{ width: '36px', height: '36px' }} onClick={initiateCall} title="Start Video Call">
                <VideoCameraAddOutlined style={{ fontSize: '1.2rem' }} />
              </button>
            )}
          </div>
          
          <div className="chat-messages" ref={chatContainerRef}>
            {messages.map((msg, idx) => {
              const isMine = msg.sender === userName;
              return (
                <div key={idx} className={`message ${isMine ? 'message-mine' : 'message-other'}`}>
                  {!isMine && <div className="message-sender">{msg.sender} • {msg.time}</div>}
                  {isMine && <div className="message-sender" style={{textAlign: 'right'}}>{msg.time}</div>}
                  <div>{msg.message}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input 
              className="standard-input" 
              placeholder="Type a message..." 
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-send" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '0 16px' }}>
              <SendOutlined style={{ fontSize: '18px' }} />
            </button>
          </form>
        </div>

        {/* Video Area */}
        {isInCall && (
          <div className="panel video-section">
            <div className="header-bar">
              <div className="header-title">Live Call <span className="room-badge">{roomId}</span></div>
            </div>
            
            <div className="video-grid">
              <div className="video-wrapper">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="video-element"
                />
                <div className="video-label">{userName} (You)</div>
              </div>
              <div className="video-wrapper">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="video-element remote-video"
                />
                <div className="video-label">Remote User</div>
              </div>
            </div>

            <div className="controls-bar">
              <button className="btn-control" onClick={toggleAudio} title="Toggle Audio">
                {isAudioEnabled ? <AudioOutlined style={{ fontSize: '20px' }} /> : <AudioMutedOutlined style={{ fontSize: '20px', color: '#ff4d4f' }} />}
              </button>
              <button className="btn-control" onClick={toggleVideo} title="Toggle Video">
                <VideoCameraOutlined style={{ fontSize: '20px', color: isVideoEnabled ? 'inherit' : '#ff4d4f' }} />
              </button>
              <button className="btn-control danger" onClick={endCall} title="End Call">
                <CloseOutlined style={{ fontSize: '20px' }} />
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
      <div className="chat-sidebar" style={{ width: 300, borderRight: '1px solid #e0e0e0', background: '#f1ebe1', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #c0cfb2', background: '#8ba888', color: '#fff' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 16 }}>Đơn hàng quản lý</h3>
          <div style={{ fontSize: 12, color: '#f1ebe1', marginTop: 4 }}>Chọn đơn để vào phòng chat</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {dispatcherTickets.map(ticket => {
            const isActive = roomId === ticket.code;
            return (
              <div 
                key={ticket._id}
                onClick={() => {
                   if (roomId !== ticket.code) {
                     setMessages([]); // prevent flashing old history
                     setRoomId(ticket.code);
                     setSearchParams({ room: ticket.code });
                   }
                }}
                style={{ 
                  padding: '12px 16px', 
                  borderBottom: '1px solid #c0cfb2', 
                  cursor: 'pointer',
                  background: isActive ? '#c0cfb2' : 'transparent',
                  borderLeft: isActive ? '3px solid #44624a' : '3px solid transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ fontWeight: 600, color: isActive ? '#44624a' : '#333' }}>#{ticket.code?.slice(-10)}</div>
                <div style={{ fontSize: 13, color: '#44624a', marginTop: 4 }}>{ticket.customerId?.fullName || ticket.customer?.fullName || 'Khách hàng'}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                   Trạng thái: <strong style={{ color: '#44624a' }}>{ticket.status}</strong>
                </div>
              </div>
            );
          })}
          {dispatcherTickets.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8ba888' }}>Không có đơn hàng nào</div>
          )}
        </div>
      </div>
    );
  };

  if (isCustomer) {
    return (
      <Layout className="video-chat-customer-layout">
        <AppHeader />
        <Content style={{ minHeight: '80vh', padding: 0, background: '#f5f5f5' }}>
          {renderContent()}
        </Content>
        <AppFooter />
      </Layout>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
      {renderSidebar()}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f9f9f9' }}>
        {renderContent()}
      </div>
    </div>
  );
}

export default VideoChat;
