import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, onSnapshot, collection, query, where, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from '@/lib/firebase';
import { X, MessageCircle, UserPlus, UserCheck, Ban, Shield, Calendar, AtSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { User as UserType, Chat } from '@/types';

interface ProfileModalProps {
  userId: string;
  onClose: () => void;
  openChat: (chatId: string) => void;
}

export default function ProfileModal({ userId, onClose, openChat }: ProfileModalProps) {
  const { currentUser } = useAuth();
  const [user, setUser] = useState<UserType | null>(null);
  const [mutualChats, setMutualChats] = useState<Chat[]>([]);
  const [isContact, setIsContact] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserType;
        data.uid = snap.id;
        setUser(data);
      }
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const chats: Chat[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.participants.includes(userId)) {
          chats.push({
            id: docSnap.id,
            type: data.type,
            participants: data.participants,
            name: data.name,
            avatar: data.avatar,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Chat);
        }
      });
      setMutualChats(chats);
    });

    getDoc(doc(db, 'users', currentUser.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsContact(data.contacts?.includes(userId) || false);
        setIsBlocked(data.blockedUsers?.includes(userId) || false);
      }
    });

    return () => unsub();
  }, [userId, currentUser]);

  const handleMessage = async () => {
    if (!currentUser) return;
    if (mutualChats.length > 0) {
      openChat(mutualChats[0].id);
    } else {
      const chatRef = doc(collection(db, 'chats'));
      await setDoc(chatRef, {
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
      openChat(chatRef.id);
    }
    onClose();
  };

  const toggleContact = async () => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    if (isContact) {
      await updateDoc(userRef, { contacts: arrayRemove(userId) });
      setIsContact(false);
      toast.success('Removed from contacts');
    } else {
      await updateDoc(userRef, { contacts: arrayUnion(userId) });
      setIsContact(true);
      toast.success('Added to contacts');
    }
  };

  const toggleBlock = async () => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    if (isBlocked) {
      await updateDoc(userRef, { blockedUsers: arrayRemove(userId) });
      setIsBlocked(false);
      toast.success('User unblocked');
    } else {
      await updateDoc(userRef, { blockedUsers: arrayUnion(userId) });
      setIsBlocked(true);
      toast.success('User blocked');
    }
  };

  const isSelf = currentUser?.uid === userId;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-md overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-[#D4AF37]/20 to-[#6366F1]/20 relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6 -mt-12">
          <Avatar className="w-24 h-24 border-4 border-[#121212]">
            <AvatarImage src={user?.photoURL || '/avatar-default-1.jpg'} />
            <AvatarFallback className="bg-[#262626] text-[#D4AF37] text-2xl">{user?.displayName?.[0] || 'U'}</AvatarFallback>
          </Avatar>

          <div className="mt-3">
            <h2 className="text-xl font-semibold text-white">{user?.displayName || user?.username || 'User'}</h2>
            <p className="text-sm text-neutral-500 flex items-center gap-1">
              <AtSign className="w-3 h-3" /> {user?.username || user?.email?.split('@')[0]}
            </p>
          </div>

          {user?.bio && (
            <p className="text-sm text-neutral-400 mt-2">{user.bio}</p>
          )}

          <div className="flex items-center gap-3 mt-3 text-xs text-neutral-500">
            {user?.status === 'online' && <span className="text-[#10B981] flex items-center gap-1"><span className="w-2 h-2 bg-[#10B981] rounded-full" /> Online</span>}
            {user?.lastSeen && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Last seen {user.lastSeen.toLocaleDateString()}</span>}
          </div>

          {!isSelf && (
            <div className="flex gap-2 mt-4">
              <Button onClick={handleMessage} className="flex-1 bg-[#6366F1] hover:bg-[#5558E0] text-white">
                <MessageCircle className="w-4 h-4 mr-2" /> Message
              </Button>
              <Button variant="outline" onClick={toggleContact} className="border-[#262626] text-neutral-400 hover:text-white hover:bg-[#262626]">
                {isContact ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              </Button>
              <Button variant="outline" onClick={toggleBlock} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                <Ban className="w-4 h-4" />
              </Button>
            </div>
          )}

          {user?.isAdmin && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#D4AF37]">
              <Shield className="w-3 h-3" /> Administrator
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
