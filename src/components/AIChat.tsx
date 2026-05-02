import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2, Wand2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIChatProps {
  onClose: () => void;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const AI_RESPONSES: Record<string, string> = {
  'hello': 'Hello! I\'m NEXUS AI, your intelligent assistant. How can I help you today?',
  'hi': 'Hi there! Ready to help you with anything you need.',
  'help': 'I can help you with:\n• Smart message suggestions\n• Conversation summaries\n• General questions\n• Writing assistance\n• Code snippets\nJust ask me anything!',
  'features': 'NEXUS offers:\n• Real-time messaging\n• Stories & status updates\n• Voice & video calls\n• Group chats\n• AI smart replies\n• Premium dark theme',
  'weather': 'I don\'t have real-time weather data, but I can help you find weather APIs or write code to fetch weather information!',
  'joke': 'Why do programmers prefer dark mode? Because light attracts bugs! 🐛',
  'code': 'I can help with code! Just tell me what language and what you need.',
  'thanks': 'You\'re welcome! I\'m always here to help. ✨',
  'bye': 'Goodbye! Have a great day. Come back anytime you need assistance!',
};

function generateAIResponse(input: string): string {
  const lower = input.toLowerCase().trim();
  
  // Check exact matches
  for (const [key, response] of Object.entries(AI_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  
  // Smart reply suggestions
  if (lower.includes('reply') || lower.includes('respond')) {
    return 'Here are some smart reply suggestions:\n• "That sounds great!"\n• "I\'ll get back to you on that"\n• "Thanks for letting me know"\n• "Can we discuss this further?"\n• "I appreciate your message"';
  }
  
  // Message help
  if (lower.includes('message') || lower.includes('chat')) {
    return 'To send a message, navigate to the Messages tab, select a conversation, and type in the input field at the bottom. You can also attach files, images, and voice notes!';
  }
  
  // Story help
  if (lower.includes('story') || lower.includes('status')) {
    return 'To post a story, go to the Stories tab and click "Add Story". You can upload images or videos that disappear after 24 hours!';
  }
  
  // General fallback
  const fallbacks = [
    'That\'s an interesting question! I\'m constantly learning to better assist you.',
    'I\'m not sure I understand completely, but I\'m here to help! Could you rephrase?',
    'Great question! As your AI assistant, I\'m designed to make your NEXUS experience better.',
    'I appreciate you reaching out! Is there something specific about NEXUS I can help with?',
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export default function AIChat({ onClose }: AIChatProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I\'m NEXUS AI, your intelligent assistant. I can help with smart replies, answering questions, and making your messaging experience better. How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const response = generateAIResponse(userMsg.text);
      const aiMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
    }, 800 + Math.random() * 1000);
  };

  const quickActions = [
    { label: 'Smart Replies', icon: Wand2 },
    { label: 'Help', icon: Lightbulb },
    { label: 'Features', icon: Sparkles },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="h-14 border-b border-[#262626] flex items-center px-4 gap-3 bg-gradient-to-r from-[rgba(212,175,55,0.1)] to-transparent">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#6366F1] flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">NEXUS AI</h3>
            <p className="text-xs text-[#10B981]">Online • Ready to help</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-dark p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'assistant' ? 'bg-gradient-to-br from-[#D4AF37] to-[#6366F1]' : 'bg-[#6366F1]'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-3 h-3 text-white" /> : <User className="w-3 h-3 text-white" />}
                </div>
                <div className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-[#6366F1] text-white' : 'bg-[#1A1A1A] text-neutral-300'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#6366F1] flex items-center justify-center">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="px-3 py-2 rounded-lg bg-[#1A1A1A] flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {quickActions.map(action => (
            <button
              key={action.label}
              onClick={() => { setInput(action.label); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] border border-[#262626] rounded-full text-xs text-neutral-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors shrink-0"
            >
              <action.icon className="w-3 h-3" /> {action.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-[#262626]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask NEXUS AI anything..."
              className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
            />
            <Button onClick={sendMessage} disabled={!input.trim() || loading} className="bg-[#D4AF37] hover:bg-[#C9A227] text-black disabled:opacity-30">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
