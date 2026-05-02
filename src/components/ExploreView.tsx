import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, query, onSnapshot, doc, getDoc, addDoc, serverTimestamp, arrayUnion, updateDoc, where } from '@/lib/firebase';
import { Search, MessageCircle, UserPlus, UserCheck, Ban, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { User as UserType } from '@/types';

interface ExploreViewProps {
  openChat: (id: string) => void;
  setActiveTab: (tab: any) => void;
  openProfile: (userId: string) => void;
}

export default function ExploreView({ openChat, setActiveTab, openProfile }: ExploreViewProps) {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online'>('all');
  const [contacts, setContacts] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      const userList: UserType[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id !== currentUser.uid) {
          const data = docSnap.data() as UserType;
          data.uid = docSnap.id;
          userList.push(data);
        }
      });
      setUsers(userList);
    });

    getDoc(doc(db, 'users', currentUser.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setContacts(data.contacts || []);
        setBlockedUsers(data.blockedUsers || []);
      }
    });

    return () => unsub();
  }, [currentUser]);

  const startChat = async (userId: string) => {
    if (!currentUser) return;
    // Check for existing chat
    const chatQuery = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(chatQuery, (snapshot) => {
      const existing = snapshot.docs.find(d => {
        const data = d.data();
        return data.type === 'private' && data.participants.includes(userId);
      });
      if (existing) {
        openChat(existing.id);
        setActiveTab('messages');
      } else {
        addDoc(collection(db, 'chats'), {
          type: 'private',
          participants: [currentUser.uid, userId],
          unreadCount: { [currentUser.uid]: 0, [userId]: 0 },
          pinnedBy: [],
          mutedBy: [],
          archivedBy: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          typingUsers: [],
        }).then((newDoc) => {
          openChat(newDoc.id);
          setActiveTab('messages');
        });
      }
      unsub();
    });
  };

  const addContact = async (userId: string) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      contacts: arrayUnion(userId),
    });
    setContacts(prev => [...prev, userId]);
    toast.success('Added to contacts');
  };

  const blockUser = async (userId: string) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      blockedUsers: arrayUnion(userId),
    });
    setBlockedUsers(prev => [...prev, userId]);
    toast.success('User blocked');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filter === 'all' || user.status === 'online';
    const notBlocked = !blockedUsers.includes(user.uid);
    return matchesSearch && matchesFilter && notBlocked;
  });

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="p-4 border-b border-[#262626]">
        <h2 className="text-lg font-semibold text-white mb-3">Explore</h2>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === 'all' ? 'bg-[#D4AF37] text-black' : 'bg-[#1A1A1A] text-neutral-400 hover:text-white'}`}
          >
            All Users
          </button>
          <button
            onClick={() => setFilter('online')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === 'online' ? 'bg-[#10B981] text-black' : 'bg-[#1A1A1A] text-neutral-400 hover:text-white'}`}
          >
            Online Now
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-dark p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.map(user => (
            <div
              key={user.uid}
              className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 hover:border-[rgba(212,175,55,0.3)] hover:-translate-y-1 transition-all group"
              style={{ boxShadow: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(212,175,55,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <div className="flex flex-col items-center text-center">
                <button onClick={() => openProfile(user.uid)} className="relative mb-3">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={user.photoURL || '/avatar-default-1.jpg'} />
                    <AvatarFallback className="bg-[#262626] text-[#D4AF37] text-lg">{user.displayName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  {user.status === 'online' && (
                    <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-[#10B981] border-2 border-[#1A1A1A] rounded-full" />
                  )}
                </button>
                <h3 className="text-sm font-semibold text-white">{user.displayName || user.username}</h3>
                <p className="text-xs text-neutral-500 mb-1">@{user.username || user.email?.split('@')[0]}</p>
                <p className="text-xs text-neutral-600 line-clamp-2 mb-3">{user.bio || 'No bio yet'}</p>

                <div className="flex gap-2 w-full">
                  <Button
                    size="sm"
                    onClick={() => startChat(user.uid)}
                    className="flex-1 bg-[#6366F1] hover:bg-[#5558E0] text-white text-xs h-8"
                  >
                    <MessageCircle className="w-3 h-3 mr-1" /> Message
                  </Button>
                  {contacts.includes(user.uid) ? (
                    <Button size="sm" variant="outline" className="h-8 border-[#10B981] text-[#10B981] text-xs px-2">
                      <UserCheck className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => addContact(user.uid)} className="h-8 border-[#262626] text-neutral-400 hover:text-white text-xs px-2">
                      <UserPlus className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <div className="flex gap-2 mt-2 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => blockUser(user.uid)} className="flex-1 flex items-center justify-center gap-1 text-xs text-red-400 hover:bg-red-400/10 py-1 rounded">
                    <Ban className="w-3 h-3" /> Block
                  </button>
                  <button onClick={() => openProfile(user.uid)} className="flex-1 flex items-center justify-center gap-1 text-xs text-neutral-400 hover:bg-[#262626] py-1 rounded">
                    <MoreHorizontal className="w-3 h-3" /> More
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-neutral-600">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
