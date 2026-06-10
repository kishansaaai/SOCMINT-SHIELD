// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, User, Bot, Loader2 } from 'lucide-react';
import { API_BASE, formatApiError, getHeaders } from '../config';

export default function AiChat({ profileData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I am NEXUS. How can I assist your investigation?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/ai-chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          question: userMessage,
          profile_data: profileData
        })
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '[ERROR] Communication with NEXUS neural core failed. Check backend connection.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`nexus-chat-fab fixed bottom-6 right-6 p-4 rounded-full text-white transition-all transform hover:scale-110 z-[10000] ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      <div 
        className={`nexus-chat-panel fixed bottom-6 right-6 w-96 h-[500px] flex flex-col z-[10001] transition-all duration-300 transform origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="nexus-chat-header flex items-center justify-between p-4 rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-[#63cab7] animate-pulse"></div>
            <h3 className="font-mono text-[#63cab7] font-bold tracking-widest text-sm">NEXUS AI ASSISTANT</h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-[#4a8a7a] hover:text-[#63cab7] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="nexus-chat-messages flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-[#0c4a6e] ml-2' : 'bg-[#0a192f] border border-[#1e4d6b] mr-2'}`}>
                  {msg.role === 'user' ? <User size={14} className="text-[#a5f3fc]" /> : <Bot size={16} className="text-[#63cab7]" />}
                </div>

                <div className={`p-3 rounded-lg text-sm font-mono leading-relaxed ${
                  msg.role === 'user' 
                    ? 'nexus-chat-bubble-user' 
                    : 'nexus-chat-bubble-assistant'
                }`}>
                  {msg.content}
                </div>

              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex flex-row max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a192f] border border-[#1e4d6b] mr-2 flex items-center justify-center">
                  <Bot size={16} className="text-[#63cab7]" />
                </div>
                <div className="nexus-chat-bubble-assistant p-3 rounded-lg flex items-center space-x-2">
                  <Loader2 size={14} className="text-[#63cab7] animate-spin" />
                  <span className="text-[#7eb8a8] text-xs font-mono">Analyzing data streams...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="nexus-chat-input-area p-4 rounded-b-2xl">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about aliases, breaches, news, locations..."
              className="nexus-chat-input flex-1 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="nexus-chat-send p-2 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
