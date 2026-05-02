import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, query, where, orderBy, onSnapshot, serverTimestamp } from '@/lib/firebase';
import { Search, MessageSquare, Compass, Settings, Zap, UserCircle, LogOut, ChevronRight, Pin, VolumeX, Plus, X, Sparkles } from 'lucide-react';
import { auth, signOut } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Chat, User as UserType } from '@/types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  selectedChatId: string | null;
  setSelectedChatId: (id: string | null) => void;
  openProfile: () => void;
  openAI: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, selectedChatId, setSelectedChatId, openProfile, openAI }: SidebarProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserType>>({});

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const chatList: Chat[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        chatList.push({
          id: docSnap.id,
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
      });
      setChats(chatList);
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      const userList: UserType[] = [];
      const profiles: Record<string, UserType> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserType;
        data.uid = docSnap.id;
        userList.push(data);
        profiles[docSnap.id] = data;
      });
      setUsers(userList);
      setUserProfiles(profiles);
    });
    return () => unsub();
  }, [currentUser]);

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;
    const otherId = chat.participants.find(id => id !== currentUser?.uid);
    return userProfiles[otherId || '']?.displayName || userProfiles[otherId || '']?.username || 'Unknown';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.avatar) return chat.avatar;
    const otherId = chat.participants.find(id => id !== currentUser?.uid);
    return userProfiles[otherId || '']?.photoURL || '/avatar-default-1.jpg';
  };

  const getOtherUserStatus = (chat: Chat) => {
    const otherId = chat.participants.find(id => id !== currentUser?.uid);
    return userProfiles[otherId || '']?.status || 'offline';
  };

  const filteredChats = chats.filter(chat => {
    if (chat.archivedBy?.includes(currentUser?.uid || '')) return false;
    if (!searchQuery) return true;
    const name = getChatName(chat).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  }).sort((a, b) => {
    const aPinned = a.pinnedBy?.includes(currentUser?.uid || '');
    const bPinned = b.pinnedBy?.includes(currentUser?.uid || '');
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0);
  });

  const filteredUsers = users.filter(u => 
    u.uid !== currentUser?.uid && 
    (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const startChat = async (userId: string) => {
    if (!currentUser) return;
    const existing = chats.find(c => c.type === 'private' && c.participants.includes(userId) && c.participants.includes(currentUser.uid));
    if (existing) {
      setSelectedChatId(existing.id);
      setActiveTab('messages');
      setShowNewChat(false);
      return;
    }
    const { addDoc } = await import('firebase/firestore');
    const newChat = await addDoc(collection(db, 'chats'), {
      type: 'private',
      participants: [currentUser.uid, userId],
      unreadCount: { [currentUser.uid]: 0, [userId]: 0 },
      pinnedBy: [],
      mutedBy: [],
      archivedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      typingUsers: [],
    });
    setSelectedChatId(newChat.id);
    setActiveTab('messages');
    setShowNewChat(false);
    setSearchQuery('');
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const unreadCount = (chat: Chat) => chat.unreadCount?.[currentUser?.uid || ''] || 0;

  return (
    <aside className="w-80 bg-[#121212] border-r border-[#262626] flex flex-col shrink-0">
      {/* User Profile Header */}
      <div className="p-4 border-b border-[#262626]">
        <div className="flex items-center gap-3">
          <button onClick={openProfile} className="relative">
            <Avatar className="w-10 h-10 border-2 border-[#262626] cursor-pointer hover:border-[#D4AF37] transition-colors">
              <AvatarImage src={currentUser?.photoURL || '/avatar-default-1.jpg'} />
              <AvatarFallback className="bg-[#1A1A1A] text-[#D4AF37]">{currentUser?.displayName?.[0] || 'N'}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-2 border-[#121212] rounded-full" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{currentUser?.displayName || currentUser?.username || 'User'}</h3>
            <p className="text-xs text-[#10B981]">Online</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={openAI} className="w-8 h-8 text-[#D4AF37] hover:bg-[#262626]">
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setActiveTab('settings')} className="w-8 h-8 text-neutral-500 hover:text-white hover:bg-[#262626]">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search messages, users..."
            className="w-full pl-9 pr-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-3 pb-2 flex gap-1">
        {[
          { key: 'messages', icon: MessageSquare, label: 'Chats' },
          { key: 'stories', icon: Zap, label: 'Stories' },
          { key: 'explore', icon: Compass, label: 'Explore' },
          { key: 'feed', icon: UserCircle, label: 'Feed' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key as any); setSelectedChatId(null); }}
            className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
              activeTab === tab.key
                ? 'text-[#D4AF37] bg-[rgba(212,175,55,0.1)] border-l-2 border-l-[#D4AF37]'
                : 'text-neutral-500 hover:text-white hover:bg-[#262626]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat List or User Search Results */}
      <div className="flex-1 overflow-y-auto scrollbar-dark">
        {activeTab === 'messages' && (
          <>
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Messages</span>
              <Button variant="ghost" size="icon" onClick={() => setShowNewChat(!showNewChat)} className="w-6 h-6 text-neutral-500 hover:text-[#D4AF37]">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {showNewChat && (
              <div className="mx-3 mb-2 p-3 bg-[#1A1A1A] rounded-lg border border-[#262626]">
                <p className="text-xs text-neutral-400 mb-2">Start a new conversation</p>
                {filteredUsers.slice(0, 5).map(user => (
                  <button
                    key={user.uid}
                    onClick={() => startChat(user.uid)}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[#262626] transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.photoURL || '/avatar-default-1.jpg'} />
                      <AvatarFallback className="bg-[#262626] text-[#D4AF37] text-xs">{user.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm text-white">{user.displayName || user.username}</p>
                      <p className="text-xs text-neutral-500">{user.status === 'online' ? 'Online' : 'Offline'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 ml-auto" />
                  </button>
                ))}
              </div>
            )}

            {filteredChats.map(chat => {
              const name = getChatName(chat);
              const avatar = getChatAvatar(chat);
              const status = getOtherUserStatus(chat);
              const isPinned = chat.pinnedBy?.includes(currentUser?.uid || '');
              const isMuted = chat.mutedBy?.includes(currentUser?.uid || '');
              const count = unreadCount(chat);

              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-[#262626] ${
                    selectedChatId === chat.id ? 'bg-[rgba(212,175,55,0.08)] border-l-2 border-l-[#D4AF37]' : ''
                  } ${isPinned ? 'bg-[rgba(212,175,55,0.04)]' : ''}`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={avatar} />
                      <AvatarFallback className="bg-[#262626] text-[#D4AF37]">{name[0]}</AvatarFallback>
                    </Avatar>
                    {status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-2 border-[#121212] rounded-full" />
                    )}
                    {status === 'away' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#F59E0B] border-2 border-[#121212] rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate ${count > 0 ? 'font-semibold text-white' : 'text-neutral-300'}`}>
                        {name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isPinned && <Pin className="w-3 h-3 text-[#D4AF37]" />}
                        {isMuted && <VolumeX className="w-3 h-3 text-neutral-600" />}
                        {chat.lastMessage && (
                          <span className="text-xs text-neutral-500">{
                            (chat.lastMessage.timestamp instanceof Date 
                              ? chat.lastMessage.timestamp 
                              : (chat.lastMessage.timestamp as any)?.toDate?.() || new Date()
                            ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-xs truncate ${count > 0 ? 'text-white' : 'text-neutral-500'}`}>
                        {chat.typingUsers?.length ? (
                          <span className="text-[#10B981]">typing...</span>
                        ) : (
                          chat.lastMessage?.text || 'No messages yet'
                        )}
                      </p>
                      {count > 0 && (
                        <span className="shrink-0 ml-2 bg-[#D4AF37] text-black text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredChats.length === 0 && (
              <div className="px-4 py-8 text-center text-neutral-600">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start chatting from Explore</p>
              </div>
            )}
          </>
        )}

        {activeTab !== 'messages' && (
          <div className="px-4 py-8 text-center text-neutral-600">
            <p className="text-sm">Switch to the {activeTab} tab to see content here</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#262626]">
        <Button variant="ghost" onClick={handleLogout} className="w-full text-neutral-500 hover:text-red-400 hover:bg-red-400/10 justify-start gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </aside>
  );
}