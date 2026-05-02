import { useState, useEffect } from 'react';
import { db, doc, getDoc } from '@/lib/firebase';
import { Phone, PhoneOff, Video, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User as UserType } from '@/types';

interface CallScreenProps {
  type: 'voice' | 'video';
  userId: string;
  incoming: boolean;
  onEnd: () => void;
}

export default function CallScreen({ type, userId, incoming, onEnd }: CallScreenProps) {
  const [otherUser, setOtherUser] = useState<UserType | null>(null);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    getDoc(doc(db, 'users', userId)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserType;
        data.uid = snap.id;
        setOtherUser(data);
      }
    });

    const timer = setTimeout(() => setCallStatus('connected'), 2000);
    return () => clearTimeout(timer);
  }, [userId]);

  useEffect(() => {
    if (callStatus === 'connected') {
      const interval = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A] via-black to-black" />

      {type === 'video' && videoEnabled && (
        <div className="absolute inset-x-4 top-20 bottom-40 rounded-2xl overflow-hidden bg-[#1A1A1A] border border-[#262626]">
          <div className="h-full flex items-center justify-center">
            <p className="text-neutral-500 text-sm">Video preview</p>
          </div>
        </div>
      )}

      <div className={`relative z-10 flex flex-col items-center ${type === 'video' ? 'mt-auto mb-32' : ''}`}>
        <Avatar className="w-24 h-24 mb-4 border-2 border-[#D4AF37]">
          <AvatarImage src={otherUser?.photoURL || '/avatar-default-1.jpg'} />
          <AvatarFallback className="bg-[#262626] text-[#D4AF37] text-2xl">{otherUser?.displayName?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-semibold text-white">{otherUser?.displayName || otherUser?.username || 'User'}</h2>
        <p className="text-sm text-neutral-500 mt-1">
          {callStatus === 'connecting' ? (incoming ? 'Incoming call...' : 'Calling...') : formatDuration(duration)}
        </p>
      </div>

      {/* Call Controls */}
      <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-6 z-10">
        {incoming && callStatus === 'connecting' ? (
          <>
            <button onClick={onEnd} className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
            <button onClick={() => setCallStatus('connected')} className="w-14 h-14 rounded-full bg-[#10B981] flex items-center justify-center hover:bg-emerald-600 transition-colors">
              <Phone className="w-6 h-6 text-white" />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setMuted(!muted)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-red-500/20 text-red-400' : 'bg-[#262626] text-white hover:bg-[#333]'}`}>
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            {type === 'video' && (
              <button onClick={() => setVideoEnabled(!videoEnabled)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${!videoEnabled ? 'bg-red-500/20 text-red-400' : 'bg-[#262626] text-white hover:bg-[#333]'}`}>
                <Video className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => setSpeakerOn(!speakerOn)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${!speakerOn ? 'bg-red-500/20 text-red-400' : 'bg-[#262626] text-white hover:bg-[#333]'}`}>
              {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button onClick={onEnd} className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
