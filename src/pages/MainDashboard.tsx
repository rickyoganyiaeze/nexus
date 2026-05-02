import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import ChatView from '@/components/ChatView';
import StoriesView from '@/components/StoriesView';
import ExploreView from '@/components/ExploreView';
import FeedView from '@/components/FeedView';
import SettingsView from '@/components/SettingsView';
import CallScreen from '@/components/CallScreen';
import ProfileModal from '@/components/ProfileModal';
import AIChat from '@/components/AIChat';

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState<'messages' | 'stories' | 'explore' | 'feed' | 'settings'>('messages');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [callState, setCallState] = useState<{ active: boolean; type: 'voice' | 'video'; userId?: string; incoming?: boolean } | null>(null);
  const [showAI, setShowAI] = useState(false);

  const openProfile = (userId: string) => {
    setProfileUserId(userId);
    setShowProfile(true);
  };

  return (
    <div className="h-screen w-screen bg-black flex overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedChatId={selectedChatId}
        setSelectedChatId={setSelectedChatId}
        openProfile={() => openProfile(useAuth().currentUser?.uid || '')}
        openAI={() => setShowAI(true)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {activeTab === 'messages' && selectedChatId && (
          <ChatView
            chatId={selectedChatId}
            onBack={() => setSelectedChatId(null)}
            openProfile={openProfile}
            startCall={(type, userId) => setCallState({ active: true, type, userId })}
          />
        )}
        {activeTab === 'messages' && !selectedChatId && (
          <div className="flex-1 flex items-center justify-center text-neutral-600">
            <div className="text-center">
              <img src="/logo.png" alt="NEXUS" className="w-20 h-20 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Select a chat to start messaging</p>
              <p className="text-sm mt-2">Or explore the community in the sidebar</p>
            </div>
          </div>
        )}
        {activeTab === 'stories' && <StoriesView openProfile={openProfile} />}
        {activeTab === 'explore' && <ExploreView openChat={setSelectedChatId} setActiveTab={setActiveTab} openProfile={openProfile} />}
        {activeTab === 'feed' && <FeedView openProfile={openProfile} />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {showProfile && profileUserId && (
        <ProfileModal userId={profileUserId} onClose={() => setShowProfile(false)} openChat={(chatId) => { setSelectedChatId(chatId); setActiveTab('messages'); setShowProfile(false); }} />
      )}

      {callState?.active && (
        <CallScreen
          type={callState.type}
          userId={callState.userId || ''}
          incoming={callState.incoming || false}
          onEnd={() => setCallState(null)}
        />
      )}

      {showAI && (
        <AIChat onClose={() => setShowAI(false)} />
      )}
    </div>
  );
}
