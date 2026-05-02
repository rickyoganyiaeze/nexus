export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  username?: string;
  bio?: string;
  status?: 'online' | 'away' | 'offline';
  lastSeen?: Date;
  phoneNumber?: string;
  isAdmin?: boolean;
  banned?: boolean;
  blockedUsers?: string[];
  contacts?: string[];
  createdAt?: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'system';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: string;
  replyToText?: string;
  reactions?: { [userId: string]: string };
  edited?: boolean;
  editedAt?: Date;
  readBy?: string[];
  deliveredTo?: string[];
  deletedFor?: string[];
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  participants: string[];
  name?: string;
  avatar?: string;
  lastMessage?: Message;
  unreadCount: { [userId: string]: number };
  pinnedBy?: string[];
  mutedBy?: string[];
  archivedBy?: string[];
  createdAt: Date;
  updatedAt: Date;
  typingUsers?: string[];
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  mediaUrl: string;
  type: 'image' | 'video';
  caption?: string;
  viewers: string[];
  reactions: { [userId: string]: string };
  createdAt: Date;
  expiresAt: Date;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  mediaUrl?: string;
  likes: string[];
  comments: Comment[];
  createdAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date;
}

export interface CallLog {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'voice' | 'video';
  status: 'missed' | 'accepted' | 'rejected';
  duration?: number;
  timestamp: Date;
}

export interface Settings {
  darkMode: boolean;
  notifications: boolean;
  soundEffects: boolean;
  messagePreview: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
  dataSaver: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  timestamp: Date;
}
