# NEXUS

A premium full-stack messaging and social communication platform built with React, Firebase, and Tailwind CSS.

## Features

- **Real-time Messaging**: 1:1 and group chats with typing indicators, read receipts, reactions, replies, and forwarding
- **Stories**: Ephemeral image/video stories with viewer lists and reactions (24-hour auto-delete)
- **Social Feed**: Community posts with likes, comments, and media sharing
- **User Discovery**: Explore all users with search, contact management, and blocking
- **Voice & Video Calls**: Full call UI with WebRTC integration structure
- **AI Assistant**: Built-in AI chat assistant for smart replies and help
- **Admin Dashboard**: User management, reports moderation, analytics (admin: ojd12dx@gmail.com)
- **Settings**: Profile, privacy, notifications, appearance, security, and data management
- **PWA Support**: Installable progressive web app with offline caching
- **Premium UI**: Dark theme with gold accents, glassmorphism, smooth animations

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Authentication, Firestore, Storage, Cloud Messaging)
- **State**: Zustand + React Context
- **Routing**: React Router v7
- **Icons**: Lucide React

## Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password, Google Sign-In)
3. Create a Firestore database
4. Enable Firebase Storage
5. Register for Firebase Cloud Messaging
6. Copy your Firebase config to `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        resource.data.participants.hasAny([request.auth.uid]);
    }
    match /chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/chats/$(chatId)).data.participants.hasAny([request.auth.uid]);
    }
    match /stories/{storyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /reports/{reportId} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow create: if request.auth != null;
    }
  }
}
```

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Deployment (Vercel)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables from `.env`
4. Deploy!

## Admin Access

Default admin email: `ojd12dx@gmail.com`

Users with this email automatically get admin privileges and can access `/admin` for:
- User management (ban/unban/delete)
- Report moderation
- Analytics dashboard

## License

MIT
