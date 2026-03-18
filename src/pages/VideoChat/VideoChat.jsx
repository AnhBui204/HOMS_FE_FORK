import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useSearchParams } from 'react-router-dom';
import useUser from '../../contexts/UserContext';
import { getValidAccessToken } from '../../services/authService';
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

function VideoChat() {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const initialRoomId = searchParams.get('room') || 'test-room';
  
  const [socket, setSocket] = useState(null);
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState(initialRoomId);
  // Default to full name or email
  const userName = user?.fullName || user?.email || 'User';
  
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
  
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  
  // Ref to queue ICE candidates received before the remote description is fully set
  const pendingCandidatesRef = useRef([]);

  // Setup Socket connection with authentication
  useEffect(() => {
    let newSocket;
    const initializeSocket = async () => {
      try {
        const token = await getValidAccessToken();
        const BASE_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
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

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;
    
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
                <span className="material-icons">call_end</span>
              </button>
              <button className="btn-control success" onClick={answerCall} title="Accept">
                <span className="material-icons">call</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="workspace-container">
        
        {/* Chat Area */}
        <div className={isInCall ? "panel chat-section split-hidden-mobile" : "panel chat-section"} id="mobile-chat-toggle">
          <div className="chat-header">
            <div>
              Video Interface <span className="room-badge">{roomId}</span>
            </div>
            {!isInCall && (
              <button className="btn-control primary-outline" style={{ width: '36px', height: '36px' }} onClick={initiateCall} title="Start Video Call">
                <span className="material-icons" style={{ fontSize: '1.2rem' }}>video_call</span>
              </button>
            )}
          </div>
          
          <div className="chat-messages">
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
            <button type="submit" className="btn-send">Send</button>
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
                <span className="material-icons">{isAudioEnabled ? 'mic' : 'mic_off'}</span>
              </button>
              <button className="btn-control" onClick={toggleVideo} title="Toggle Video">
                <span className="material-icons">{isVideoEnabled ? 'videocam' : 'videocam_off'}</span>
              </button>
              <button className="btn-control danger" onClick={endCall} title="End Call">
                <span className="material-icons">call_end</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoChat;
