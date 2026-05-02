import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, arrayUnion, doc, getDoc, deleteDoc, Timestamp, ref, uploadBytes, getDownloadURL } from '@/lib/firebase';
import { Plus, X, Heart, Eye, ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type { Story, User as UserType } from '@/types';

interface StoriesViewProps {
  openProfile: (userId: string) => void;
}

export default function StoriesView({ openProfile }: StoriesViewProps) {
  const { currentUser } = useAuth();
  const [, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userStories, setUserStories] = useState<Record<string, Story[]>>({});
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState(0);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserType>>({});

  useEffect(() => {
    if (!currentUser) return;
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', Timestamp.fromDate(cutoff)),
      orderBy('expiresAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const allStories: Story[] = [];
      const byUser: Record<string, Story[]> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const story: Story = {
          id: docSnap.id,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          mediaUrl: data.mediaUrl,
          type: data.type,
          caption: data.caption,
          viewers: data.viewers || [],
          reactions: data.reactions || {},
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
        };
        allStories.push(story);
        if (!byUser[data.userId]) byUser[data.userId] = [];
        byUser[data.userId].push(story);
      });
      setStories(allStories);
      setUserStories(byUser);
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    const loadProfiles = async () => {
      const profiles: Record<string, UserType> = {};
      for (const uid of Object.keys(userStories)) {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) profiles[uid] = snap.data() as UserType;
      }
      setUserProfiles(profiles);
    };
    loadProfiles();
  }, [userStories]);

  const handleFileUpload = async (file: File) => {
    if (!currentUser) return;
    setUploading(true);
    setProgress(0);
    try {
      const storageRef = ref(storage, `stories/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await addDoc(collection(db, 'stories'), {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.username || 'User',
        userAvatar: currentUser.photoURL,
        mediaUrl: url,
        type,
        caption: caption,
        viewers: [],
        reactions: {},
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
      });
      toast.success('Story posted!');
      setShowUpload(false);
      setCaption('');
    } catch (err) {
      toast.error('Failed to upload story');
    }
    setUploading(false);
    setProgress(0);
  };

  const viewStory = async (story: Story, index: number) => {
    setActiveStory(story);
    setActiveIndex(index);
    if (currentUser && !story.viewers?.includes(currentUser.uid)) {
      await updateDoc(doc(db, 'stories', story.id), {
        viewers: arrayUnion(currentUser.uid),
      });
    }
  };

  const nextStory = () => {
    const userList = Object.values(userStories).flat();
    const next = activeIndex + 1;
    if (next < userList.length) {
      setActiveStory(userList[next]);
      setActiveIndex(next);
    } else {
      setActiveStory(null);
    }
  };

  const prevStory = () => {
    const userList = Object.values(userStories).flat();
    const prev = activeIndex - 1;
    if (prev >= 0) {
      setActiveStory(userList[prev]);
      setActiveIndex(prev);
    }
  };

  const reactToStory = async (reaction: string) => {
    if (!activeStory || !currentUser) return;
    await updateDoc(doc(db, 'stories', activeStory.id), {
      [`reactions.${currentUser.uid}`]: reaction,
    });
  };

  const deleteMyStory = async (storyId: string) => {
    await deleteDoc(doc(db, 'stories', storyId));
    toast.success('Story deleted');
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Story Reel */}
      <div className="p-4 border-b border-[#262626]">
        <h2 className="text-lg font-semibold text-white mb-3">Stories</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-dark pb-2">
          {/* Add Story Button */}
          <button onClick={() => setShowUpload(true)} className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#D4AF37] flex items-center justify-center hover:bg-[rgba(212,175,55,0.1)] transition-colors">
              <Plus className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <span className="text-xs text-neutral-400">Add Story</span>
          </button>

          {/* User Stories */}
          {Object.entries(userStories).map(([userId, userStoryList]) => {
            const user = userProfiles[userId];
            const hasUnseen = userStoryList.some(s => !s.viewers?.includes(currentUser?.uid || ''));
            return (
              <button
                key={userId}
                onClick={() => viewStory(userStoryList[0], 0)}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <div className={`w-16 h-16 rounded-full p-[3px] ${hasUnseen ? 'story-ring' : 'border-2 border-[#262626]'}`}>
                  <Avatar className="w-full h-full">
                    <AvatarImage src={user?.photoURL || userStoryList[0].userAvatar || '/avatar-default-1.jpg'} />
                    <AvatarFallback className="bg-[#262626] text-[#D4AF37]">{userStoryList[0].userName[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs text-neutral-400 truncate max-w-[64px]">{userStoryList[0].userName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* My Stories Management */}
      <div className="flex-1 overflow-y-auto scrollbar-dark p-4">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">My Stories</h3>
        {userStories[currentUser?.uid || '']?.map(story => (
          <div key={story.id} className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg mb-2">
            <img src={story.mediaUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1">
              <p className="text-sm text-white">{story.caption || 'Story'}</p>
              <p className="text-xs text-neutral-500">
                <Eye className="w-3 h-3 inline mr-1" /> {story.viewers?.length || 0} views
                {' · '}
                Expires {story.expiresAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteMyStory(story.id)} className="text-red-400 hover:bg-red-400/10">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )) || (
          <p className="text-neutral-600 text-sm">No active stories. Add your first story above!</p>
        )}
      </div>

      {/* Story Viewer Modal */}
      {activeStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Progress Bar */}
          <div className="absolute top-4 left-4 right-4 h-1 bg-[#262626] rounded-full overflow-hidden">
            <div className="h-full bg-[#D4AF37] animate-[width_10s_linear_forwards]" style={{ width: '100%' }} />
          </div>

          {/* Header */}
          <div className="absolute top-8 left-4 right-4 flex items-center justify-between">
            <button onClick={() => openProfile(activeStory.userId)} className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={activeStory.userAvatar || '/avatar-default-1.jpg'} />
                <AvatarFallback className="bg-[#262626] text-[#D4AF37]">{activeStory.userName[0]}</AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-medium">{activeStory.userName}</span>
            </button>
            <button onClick={() => setActiveStory(null)} className="text-white hover:text-[#D4AF37]">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <button onClick={prevStory} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-10">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button onClick={nextStory} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-10">
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Media */}
          <div className="max-w-md max-h-[80vh] rounded-xl overflow-hidden">
            {activeStory.type === 'video' ? (
              <video src={activeStory.mediaUrl} controls autoPlay className="max-w-full max-h-[80vh]" />
            ) : (
              <img src={activeStory.mediaUrl} alt="" className="max-w-full max-h-[80vh] object-contain" />
            )}
          </div>

          {/* Caption */}
          {activeStory.caption && (
            <div className="absolute bottom-20 left-4 right-4 text-center">
              <p className="text-white text-sm bg-black/50 px-3 py-1 rounded-lg inline-block">{activeStory.caption}</p>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
            <div className="flex gap-2">
              <button onClick={() => reactToStory('love')} className="p-2 bg-[#1A1A1A] rounded-full hover:bg-[#262626] transition-colors">
                <Heart className="w-5 h-5 text-red-500" />
              </button>
              <button onClick={() => reactToStory('like')} className="p-2 bg-[#1A1A1A] rounded-full hover:bg-[#262626] transition-colors">
                <span className="text-lg">👍</span>
              </button>
              <button onClick={() => reactToStory('laugh')} className="p-2 bg-[#1A1A1A] rounded-full hover:bg-[#262626] transition-colors">
                <span className="text-lg">😂</span>
              </button>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-[#1A1A1A] rounded-full px-3 py-2">
              <input type="text" placeholder="Reply to story..." className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none" />
              <Send className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-xs text-neutral-500">
              <Eye className="w-3 h-3 inline mr-1" />
              {activeStory.viewers?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Add Story</h3>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="w-full mb-3 text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#D4AF37] file:text-black hover:file:bg-[#C9A227]"
            />
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] mb-3"
            />
            {uploading && (
              <div className="mb-3">
                <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
                  <div className="h-full bg-[#D4AF37] transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowUpload(false)} className="text-neutral-400 hover:text-white">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
