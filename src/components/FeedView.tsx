import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, doc, deleteDoc, ref, uploadBytes, getDownloadURL, getDoc } from '@/lib/firebase';
import { Heart, MessageCircle, Share2, Send, Image, Loader2, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Post, User as UserType } from '@/types';

interface FeedViewProps {
  openProfile: (userId: string) => void;
}

export default function FeedView({ openProfile }: FeedViewProps) {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserType>>({});

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const postList: Post[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        postList.push({
          id: docSnap.id,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          text: data.text,
          mediaUrl: data.mediaUrl,
          likes: data.likes || [],
          comments: data.comments || [],
          createdAt: data.createdAt?.toDate(),
        });
      });
      setPosts(postList);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadProfiles = async () => {
      const profiles: Record<string, UserType> = {};
      for (const post of posts) {
        if (!profiles[post.userId]) {
          const snap = await getDoc(doc(db, 'users', post.userId));
          if (snap.exists()) profiles[post.userId] = snap.data() as UserType;
        }
      }
      setUserProfiles(profiles);
    };
    loadProfiles();
  }, [posts]);

  const createPost = async (file?: File) => {
    if (!currentUser || !newPostText.trim()) return;
    setUploading(true);
    try {
      let mediaUrl = '';
      if (file) {
        const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        mediaUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'posts'), {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.username || 'User',
        userAvatar: currentUser.photoURL,
        text: newPostText.trim(),
        mediaUrl: mediaUrl || null,
        likes: [],
        comments: [],
        createdAt: serverTimestamp(),
      });

      toast.success('Post published!');
      setNewPostText('');
      setShowNewPost(false);
    } catch (err) {
      toast.error('Failed to create post');
    }
    setUploading(false);
  };

  const likePost = async (postId: string) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    const post = posts.find(p => p.id === postId);
    if (post?.likes.includes(currentUser.uid)) {
      await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
    }
  };

  const addComment = async (postId: string) => {
    if (!currentUser || !commentText.trim()) return;
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      comments: arrayUnion({
        id: Date.now().toString(),
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.username || 'User',
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
      }),
    });
    setCommentText('');
    setActiveCommentPost(null);
  };

  const deletePost = async (postId: string) => {
    await deleteDoc(doc(db, 'posts', postId));
    toast.success('Post deleted');
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="p-4 border-b border-[#262626] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Updates</h2>
        <Button onClick={() => setShowNewPost(true)} className="bg-[#6366F1] hover:bg-[#5558E0] text-white text-sm">
          <Share2 className="w-4 h-4 mr-2" /> Create Post
        </Button>
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Create Post</h3>
            <textarea
              value={newPostText}
              onChange={e => setNewPostText(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] resize-none mb-3"
            />
            <div className="flex items-center gap-2 mb-4">
              <label className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-neutral-400 hover:text-white cursor-pointer transition-colors">
                <Image className="w-4 h-4" /> Add Image
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && createPost(e.target.files[0])} />
              </label>
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-xs text-[#D4AF37] mb-3">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowNewPost(false)} className="text-neutral-400 hover:text-white">Cancel</Button>
              <Button onClick={() => createPost()} disabled={!newPostText.trim() || uploading} className="bg-[#D4AF37] hover:bg-[#C9A227] text-black">
                <Send className="w-4 h-4 mr-2" /> Post
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto scrollbar-dark p-4 max-w-2xl mx-auto w-full">
        {posts.map(post => {
          const isLiked = post.likes.includes(currentUser?.uid || '');
          const profile = userProfiles[post.userId];
          return (
            <div key={post.id} className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => openProfile(post.userId)} className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.userAvatar || profile?.photoURL || '/avatar-default-1.jpg'} />
                    <AvatarFallback className="bg-[#262626] text-[#D4AF37]">{post.userName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{post.userName}</h4>
                    <p className="text-xs text-neutral-500">
                      {post.createdAt?.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
                {post.userId === currentUser?.uid && (
                  <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)} className="text-neutral-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <p className="text-sm text-white mb-3 whitespace-pre-wrap">{post.text}</p>
              {post.mediaUrl && (
                <img src={post.mediaUrl} alt="" className="rounded-lg w-full max-h-96 object-cover mb-3" />
              )}

              <div className="flex items-center gap-4 pt-3 border-t border-[#262626]">
                <button onClick={() => likePost(post.id)} className={`flex items-center gap-1.5 text-sm transition-all ${isLiked ? 'text-red-500' : 'text-neutral-500 hover:text-red-400'}`}>
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''} ${isLiked ? 'scale-110' : ''} transition-transform`} />
                  {post.likes.length}
                </button>
                <button onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white">
                  <MessageCircle className="w-4 h-4" />
                  {post.comments.length}
                </button>
                <button className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white ml-auto">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Comments */}
              {post.comments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {post.comments.slice(0, activeCommentPost === post.id ? undefined : 2).map((comment, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#262626] flex items-center justify-center text-xs text-[#D4AF37]">
                        {comment.userName[0]}
                      </div>
                      <div className="bg-[#262626] rounded-lg px-3 py-1.5 flex-1">
                        <p className="text-xs font-medium text-white">{comment.userName}</p>
                        <p className="text-xs text-neutral-300">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  {post.comments.length > 2 && activeCommentPost !== post.id && (
                    <button onClick={() => setActiveCommentPost(post.id)} className="text-xs text-[#D4AF37] hover:underline">
                      View {post.comments.length - 2} more comments
                    </button>
                  )}
                </div>
              )}

              {/* Add Comment */}
              {activeCommentPost === post.id && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-2 bg-[#262626] border border-[#333] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
                    onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                  />
                  <Button size="sm" onClick={() => addComment(post.id)} disabled={!commentText.trim()} className="bg-[#D4AF37] hover:bg-[#C9A227] text-black">
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {posts.length === 0 && (
          <div className="text-center py-12 text-neutral-600">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No posts yet</p>
            <p className="text-xs mt-1">Be the first to share something!</p>
          </div>
        )}
      </div>
    </div>
  );
}
