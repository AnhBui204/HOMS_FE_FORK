import React, { useState, useRef, useEffect } from "react";
import { MessageOutlined, CloseOutlined, SendOutlined } from "@ant-design/icons";
import { Input, Button, Space, Typography } from "antd";
import ReactMarkdown from "react-markdown";
import "./AIAssistant.css";

const { Text } = Typography;

const SUGGESTED_QUESTIONS = [
  "Dịch vụ chuyển nhà bao gồm những gì?",
  "Làm sao để đặt lịch dịch vụ?",
  "Bảng giá dịch vụ như thế nào?",
  "Quy trình khảo sát trước không?"
];

function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Xin chào 👋! Tôi là trợ lý ảo AI của HOMS. Tôi có thể giúp gì cho bạn hôm nay?", completed: true }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend = input) => {
    if (!textToSend.trim()) return;

    const userMessage = textToSend;
    setMessages((prev) => [...prev, { from: "user", text: userMessage }]);
    if (textToSend === input) setInput("");
    setLoading(true);

    // Thêm message bot kiểu "Đang suy nghĩ..."
    setMessages((prev) => [...prev, { from: "bot", text: "Đang suy nghĩ...", completed: false }]);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/ai/chat`, {
        method: "POST",
        body: JSON.stringify({ message: userMessage }),
        headers: { "Content-Type": "application/json" },
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partial = "";

      // Thêm message mới cho typing, để không ghi đè "Đang suy nghĩ..."
      setMessages((prev) => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = { from: "bot", text: "", completed: false };
        return newArr;
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partial += decoder.decode(value, { stream: true });

        const newText = partial; // Lưu giá trị riêng
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, text: newText, completed: false };
          return updated;
        });
      }

      // Khi xong stream, đánh dấu completed
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = { ...last, completed: true };
        return updated;
      });

    } catch (err) {
      setMessages((prev) => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = { from: "bot", text: "Xin lỗi, đã có lỗi xảy ra khi kết nối. Vui lòng thử lại sau.", completed: true };
        return newArr;
      });
    }

    setLoading(false);
  };

  return (
    <>
      <Button
        type="primary"
        shape="circle"
        size="large"
        className="ai-assistant-btn"
        icon={isOpen ? <CloseOutlined /> : <MessageOutlined />}
        onClick={() => setIsOpen(!isOpen)}
      />
      <div className={`ai-chat-window ${isOpen ? "open" : "closed"}`}>
        <div className="ai-chat-header">
          <div>
            <h3 className="ai-chat-header-title">
              🤖 Trợ lý ảo AI
            </h3>
            <Text className="ai-chat-header-subtitle">Luôn sẵn sàng hỗ trợ bạn 24/7</Text>
          </div>
          <Button type="text" icon={<CloseOutlined style={{ color: "white", fontSize: "16px" }} />} onClick={() => setIsOpen(false)} />
        </div>

        <div className="ai-chat-body">
          {messages.map((msg, idx) => (
            <div key={idx} className={`ai-message-row ${msg.from}`}>
              <div className={`ai-message-bubble ${msg.from}`}>
                {msg.from === "bot" ? (
                  <div className="markdown-body" style={{ margin: 0, padding: 0, fontSize: "14px" }}>
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p style={{ margin: "0 0 8px 0" }} {...props} />,
                        ul: ({ node, ...props }) => <ul style={{ marginTop: 0, marginBottom: "8px", paddingLeft: "16px" }} {...props} />,
                        li: ({ node, ...props }) => <li style={{ margin: 0 }} {...props} />,
                        strong: ({ node, ...props }) => <strong style={{ color: "#2D4F36" }} {...props} />,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}

          {messages.length === 1 && (
            <div className="ai-suggested-questions-container">
              <Text type="secondary" style={{ fontSize: "13px", marginBottom: "12px", display: "block" }}>
                Gợi ý câu hỏi:
              </Text>
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <Button
                    key={idx}
                    block
                    className="ai-suggestion-btn"
                    onClick={() => handleSend(q)}
                    disabled={loading}
                    hoverable="true"
                  >
                    {q}
                  </Button>
                ))}
              </Space>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-chat-input-area">
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhấn Enter để gửi..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            bordered={false}
            className="ai-chat-input"
            onPressEnter={(e) => {
              if (!e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            onClick={() => handleSend()}
            className="ai-chat-send-btn"
            loading={loading}
          />
        </div>
      </div>
    </>
  );
}

export default AIAssistant;
