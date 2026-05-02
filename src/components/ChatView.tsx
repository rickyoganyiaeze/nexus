import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage, collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, getDownloadURL, ref, uploadBytes, getDoc, writeBatch } from '@/lib/firebase';
import { ArrowLeft, Phone, Video, Search, MoreVertical, Send, Paperclip, Smile, Reply, Forward, Trash2, Check, CheckCheck, FileText, X, Heart, ThumbsUp, Laugh, Frown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Message, Chat, User as UserType } from '@/types';

interface ChatViewProps {
  chatId: string;
  onBack: () => void;
  openProfile: (userId: string) => void;
  startCall: (type: 'voice' | 'video', userId: string) => void;
}

export default function ChatView({ chatId, onBack, openProfile, startCall }: ChatViewProps) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatData, setChatData] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<UserType | null>(null);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!chatId) return;
    const chatRef = doc(db, 'chats', chatId);
    const unsubChat = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setChatData({
          id: snap.id,
          type: data.type,
          participants: data.participants,
          name: data.name,
          avatar: data.avatar,
          lastMessage: data.lastMessage,
          unreadCount: data.unreadCount || {},
          pinnedBy: data.pinnedBy || [],
          mutedBy: data.mutedBy || [],
          archivedBy: data.archivedBy || [],
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          typingUsers: data.typingUsers || [],
        });
        setTypingUsers(data.typingUsers?.filter((id: string) => id !== currentUser?.uid) || []);
      }
    });

    const msgsQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubMsgs = onSnapshot(msgsQuery, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({
          id: docSnap.id,
          chatId,
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp?.toDate(),
          type: data.type || 'text',
          mediaUrl: data.mediaUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          replyTo: data.replyTo,
          replyToText: data.replyToText,
          reactions: data.reactions || {},
          edited: data.edited || false,
          editedAt: data.editedAt?.toDate(),
          readBy: data.readBy || [],
          deliveredTo: data.deliveredTo || [],
          deletedFor: data.deletedFor || [],
        });
      });
      setMessages(msgs);
    });

    return () => { unsubChat(); unsubMsgs(); };
  }, [chatId, currentUser?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chatId || !currentUser) return;
    const otherId = chatData?.participants?.find(id => id !== currentUser.uid);
    if (!otherId) return;
    getDoc(doc(db, 'users', otherId)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserType;
        data.uid = snap.id;
        setOtherUser(data);
      }
    });
  }, [chatData, currentUser]);

  useEffect(() => {
    if (!chatId || !currentUser) return;
    // Mark messages as read
    const batch = writeBatch(db);
    messages.forEach(msg => {
      if (msg.senderId !== currentUser.uid && !msg.readBy?.includes(currentUser.uid)) {
        const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
        batch.update(msgRef, { readBy: arrayUnion(currentUser.uid) });
      }
    });
    batch.update(doc(db, 'chats', chatId), {
      [`unreadCount.${currentUser.uid}`]: 0,
    });
    batch.commit().catch(() => {});
  }, [messages, chatId, currentUser]);

  const handleTyping = async () => {
    if (!chatId || !currentUser) return;
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      typingUsers: arrayUnion(currentUser.uid),
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await updateDoc(chatRef, {
        typingUsers: arrayRemove(currentUser.uid),
      });
    }, 3000);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !chatId || !currentUser) return;
    const text = inputText.trim();
    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);

    const msgData: any = {
      senderId: currentUser.uid,
      text,
      timestamp: serverTimestamp(),
      type: 'text',
      readBy: [currentUser.uid],
      deliveredTo: [currentUser.uid],
      reactions: {},
      deletedFor: [],
    };

    if (replyingTo) {
      msgData.replyTo = replyingTo.id;
      msgData.replyToText = replyingTo.text;
    }

    const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), msgData);
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: { id: msgRef.id, text, timestamp: serverTimestamp(), senderId: currentUser.uid, type: 'text' },
      updatedAt: serverTimestamp(),
      [`unreadCount.${otherUser?.uid}`]: (chatData?.unreadCount?.[otherUser?.uid || ''] || 0) + 1,
      typingUsers: arrayRemove(currentUser.uid),
    });
  };

  const sendFile = async (file: File) => {
    if (!chatId || !currentUser) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `chats/${chatId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';

      const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUser.uid,
        text: '',
        timestamp: serverTimestamp(),
        type,
        mediaUrl: url,
        fileName: file.name,
        fileSize: file.size,
        readBy: [currentUser.uid],
        deliveredTo: [currentUser.uid],
        reactions: {},
        deletedFor: [],
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: { id: msgRef.id, text: type === 'image' ? '📷 Photo' : type === 'video' ? '🎥 Video' : `📎 ${file.name}`, timestamp: serverTimestamp(), senderId: currentUser.uid, type },
        updatedAt: serverTimestamp(),
        [`unreadCount.${otherUser?.uid}`]: (chatData?.unreadCount?.[otherUser?.uid || ''] || 0) + 1,
      });
      toast.success('File sent');
    } catch (err) {
      toast.error('Failed to send file');
    }
    setUploading(false);
  };

  const handleReaction = async (messageId: string, reaction: string) => {
    if (!chatId || !currentUser) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    const msg = messages.find(m => m.id === messageId);
    const currentReactions = msg?.reactions || {};
    if (currentReactions[currentUser.uid] === reaction) {
      const newReactions = { ...currentReactions };
      delete newReactions[currentUser.uid];
      await updateDoc(msgRef, { reactions: newReactions });
    } else {
      await updateDoc(msgRef, { [`reactions.${currentUser.uid}`]: reaction });
    }
    setSelectedMessage(null);
  };

  const deleteMessage = async (messageId: string, forEveryone: boolean) => {
    if (!chatId || !currentUser) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    if (forEveryone) {
      await deleteDoc(msgRef);
    } else {
      await updateDoc(msgRef, { deletedFor: arrayUnion(currentUser.uid) });
    }
    setSelectedMessage(null);
  };

  const forwardMessage = async (_msg: Message) => {
    // In a real app, this would open a dialog to select destination
    toast.info('Forward feature: Select a chat to forward to');
    setSelectedMessage(null);
  };

  const filteredMessages = searchQuery 
    ? messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const chatName = chatData?.name || otherUser?.displayName || otherUser?.username || 'Chat';
  const chatAvatar = chatData?.avatar || otherUser?.photoURL || '/avatar-default-1.jpg';

  const reactionEmojis = [
    { icon: Heart, label: 'love', color: 'text-red-500' },
    { icon: ThumbsUp, label: 'like', color: 'text-blue-500' },
    { icon: Laugh, label: 'laugh', color: 'text-yellow-500' },
    { icon: Frown, label: 'sad', color: 'text-amber-500' },
  ];

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="h-16 border-b border-[#262626] flex items-center px-4 gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden text-neutral-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <button onClick={() => otherUser && openProfile(otherUser.uid)} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src={chatAvatar} />
            <AvatarFallback className="bg-[#262626] text-[#D4AF37]">{chatName[0]}</AvatarFallback>
          </Avatar>
          <div className="text-left min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{chatName}</h3>
            <p className="text-xs text-neutral-500">
              {typingUsers.length > 0 ? (
                <span className="text-[#10B981]">typing...</span>
              ) : otherUser?.status === 'online' ? (
                <span className="text-[#10B981]">Online</span>
              ) : otherUser?.lastSeen ? (
                `Last seen ${otherUser.lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => startCall('voice', otherUser?.uid || '')} className="text-neutral-400 hover:text-white hover:bg-[#262626]">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => startCall('video', otherUser?.uid || '')} className="text-neutral-400 hover:text-white hover:bg-[#262626]">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)} className="text-neutral-400 hover:text-white hover:bg-[#262626]">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-[#262626]">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-[#262626] bg-[#121212]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="w-full pl-9 pr-8 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
              autoFocus
            />
            <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-dark p-4 space-y-1">
        {filteredMessages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser?.uid;
          const isDeletedForMe = msg.deletedFor?.includes(currentUser?.uid || '');
          if (isDeletedForMe) return null;

          const showDateDivider = idx === 0 || (
            msg.timestamp && filteredMessages[idx - 1]?.timestamp &&
            msg.timestamp.toDateString() !== filteredMessages[idx - 1].timestamp!.toDateString()
          );

          const reactionCount = Object.entries(msg.reactions || {}).reduce((acc, [_, emoji]) => {
            acc[emoji] = (acc[emoji] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return (
            <div key={msg.id}>
              {showDateDivider && msg.timestamp && (
                <div className="flex justify-center my-4">
                  <span className="text-xs text-neutral-600 bg-[#1A1A1A] px-3 py-1 rounded-full">
                    {msg.timestamp.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                <div className={`max-w-[70%] relative ${isMe ? 'items-end' : 'items-start'}`}>
                  {msg.replyTo && (
                    <div className={`text-xs text-neutral-500 mb-1 px-3 py-1 rounded-t-lg ${isMe ? 'bg-[#262626]' : 'bg-[#1A1A1A]'}`}>
                      <Reply className="w-3 h-3 inline mr-1" />
                      {msg.replyToText?.substring(0, 50) || 'Replied message'}
                    </div>
                  )}
                  <div
                    className={`px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      isMe 
                        ? 'bg-[#6366F1] text-white rounded-br-sm' 
                        : 'bg-[#1A1A1A] text-white rounded-bl-sm'
                    } ${selectedMessage === msg.id ? 'ring-1 ring-[#D4AF37]' : ''}`}
                    onClick={() => setSelectedMessage(selectedMessage === msg.id ? null : msg.id)}
                  >
                    {msg.type === 'image' && msg.mediaUrl && (
                      <img src={msg.mediaUrl} alt="" className="rounded-lg max-w-full mb-1 cursor-pointer" onClick={() => window.open(msg.mediaUrl, '_blank')} />
                    )}
                    {msg.type === 'video' && msg.mediaUrl && (
                      <video src={msg.mediaUrl} controls className="rounded-lg max-w-full mb-1" />
                    )}
                    {msg.type === 'file' && (
                      <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline">
                        <FileText className="w-4 h-4" /> {msg.fileName}
                      </a>
                    )}
                    {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] opacity-60">
                        {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span className="text-[10px]">
                          {msg.readBy?.length && msg.readBy.length > 1 ? (
                            <CheckCheck className="w-3 h-3 text-[#10B981]" />
                          ) : msg.deliveredTo?.length && msg.deliveredTo.length > 1 ? (
                            <CheckCheck className="w-3 h-3 text-neutral-400" />
                          ) : (
                            <Check className="w-3 h-3 text-neutral-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reactions */}
                  {Object.keys(reactionCount).length > 0 && (
                    <div className={`flex gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(reactionCount).map(([emoji, count]) => (
                        <span key={emoji} className="text-xs bg-[#262626] px-1.5 py-0.5 rounded-full">
                          {emoji === 'love' ? '❤️' : emoji === 'like' ? '👍' : emoji === 'laugh' ? '😂' : emoji === 'sad' ? '😢' : emoji} {count}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Menu */}
                  {selectedMessage === msg.id && (
                    <div className={`absolute ${isMe ? 'right-0' : 'left-0'} top-full mt-1 z-20 bg-[#1A1A1A] border border-[#262626] rounded-lg shadow-xl p-1 min-w-[160px]`}>
                      <div className="flex gap-1 px-2 py-1 border-b border-[#262626]">
                        {reactionEmojis.map(({ icon: Icon, label, color }) => (
                          <button key={label} onClick={() => handleReaction(msg.id, label)} className={`p-1 rounded hover:bg-[#262626] ${color}`}>
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                      <button onClick={() => { setReplyingTo(msg); setSelectedMessage(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-[#262626] rounded">
                        <Reply className="w-4 h-4" /> Reply
                      </button>
                      <button onClick={() => forwardMessage(msg)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-[#262626] rounded">
                        <Forward className="w-4 h-4" /> Forward
                      </button>
                      <button onClick={() => deleteMessage(msg.id, false)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-[#262626] rounded">
                        <Trash2 className="w-4 h-4" /> Delete for me
                      </button>
                      {isMe && (
                        <button onClick={() => deleteMessage(msg.id, true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded">
                          <Trash2 className="w-4 h-4" /> Delete for everyone
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[#1A1A1A] border-t border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Reply className="w-4 h-4 text-[#D4AF37]" />
            <span className="truncate max-w-md">{replyingTo.text.substring(0, 60)}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-neutral-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-[#262626] bg-[#121212]">
        {uploading && (
          <div className="flex items-center gap-2 text-xs text-[#D4AF37] mb-2">
            <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            Uploading file...
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0 text-neutral-500 hover:text-white hover:bg-[#262626]">
            <Paperclip className="w-5 h-5" />
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && sendFile(e.target.files[0])} />

          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={e => { setInputText(e.target.value); handleTyping(); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-3 py-2.5 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] resize-none max-h-32"
              style={{ minHeight: '40px' }}
            />
          </div>

          <Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="shrink-0 text-neutral-500 hover:text-white hover:bg-[#262626]">
            <Smile className="w-5 h-5" />
          </Button>

          {showEmojiPicker && (
            <div className="absolute bottom-20 right-4 bg-[#1A1A1A] border border-[#262626] rounded-lg p-2 grid grid-cols-8 gap-1 shadow-xl z-30">
              {['😀','😂','❤️','👍','🔥','🎉','😢','😡','👏','🙏','💯','✨','🤔','😍','🥳','😴','🤮','💩','👀','🫡','🤝','💪','🎂','🎁','🚀','💎','🌟','⚡','🌈','☀️','🌙','⭐'].map(emoji => (
                <button key={emoji} onClick={() => { setInputText(inputText + emoji); }} className="text-lg hover:bg-[#262626] rounded p-1">
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <Button
            onClick={sendMessage}
            disabled={!inputText.trim() || uploading}
            className="shrink-0 bg-[#D4AF37] hover:bg-[#C9A227] text-black disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}