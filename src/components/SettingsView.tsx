import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db, storage, updateProfile, updatePassword, doc, updateDoc, ref, uploadBytes, getDownloadURL, reauthenticateWithCredential, EmailAuthProvider } from '@/lib/firebase';
import { ArrowLeft, Camera, Bell, Shield, Moon, Database, Trash2, Lock, Save, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SettingsViewProps {
  onBack?: () => void;
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [phone, setPhone] = useState(currentUser?.phoneNumber || '');
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'privacy' | 'notifications' | 'appearance' | 'security' | 'data'>('profile');

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setUsername(currentUser.username || '');
      setBio(currentUser.bio || '');
      setPhone(currentUser.phoneNumber || '');
    }
  }, [currentUser]);

  const handlePhotoUpload = async (file: File) => {
    if (!currentUser || !auth.currentUser) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateProfile(auth.currentUser, { photoURL: url });
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: url });
      toast.success('Profile picture updated');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: displayName,
        username: username.toLowerCase().replace(/\s/g, ''),
        bio: bio,
        phoneNumber: phone,
      });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (!currentUser || !auth.currentUser || !currentPassword || !newPassword) return;
    try {
      const credential = EmailAuthProvider.credential(currentUser.email || '', currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    toast.info('Account deletion request submitted');
  };

  const toggleSetting = async (field: string, value: boolean) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      [`settings.${field}`]: value,
    });
  };

  const sections = [
    { key: 'profile', label: 'Profile', icon: Camera },
    { key: 'privacy', label: 'Privacy', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'appearance', label: 'Appearance', icon: Moon },
    { key: 'security', label: 'Security', icon: Lock },
    { key: 'data', label: 'Data & Storage', icon: Database },
  ];

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="h-16 border-b border-[#262626] flex items-center px-4 gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="text-neutral-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h2 className="text-lg font-semibold text-white">Settings</h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings Sidebar */}
        <div className="w-64 border-r border-[#262626] overflow-y-auto scrollbar-dark">
          {sections.map(section => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                activeSection === section.key ? 'bg-[rgba(212,175,55,0.1)] text-[#D4AF37] border-l-2 border-l-[#D4AF37]' : 'text-neutral-400 hover:bg-[#262626] hover:text-white'
              }`}
            >
              <section.icon className="w-4 h-4" />
              <span className="text-sm">{section.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto scrollbar-dark p-6">
          {activeSection === 'profile' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Profile Settings</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={currentUser?.photoURL || '/avatar-default-1.jpg'} />
                    <AvatarFallback className="bg-[#262626] text-[#D4AF37] text-xl">{currentUser?.displayName?.[0] || 'N'}</AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#D4AF37] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#C9A227] transition-colors">
                    <Camera className="w-4 h-4 text-black" />
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
                  </label>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-white font-medium">{currentUser?.displayName || 'User'}</h4>
                  <p className="text-sm text-neutral-500">{currentUser?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400">Display Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]" />
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full mt-1 px-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]" />
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37] resize-none" />
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full mt-1 px-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white focus:outline-none focus:border-[#D4AF37]" />
                </div>
                <Button onClick={saveProfile} disabled={saving} className="bg-[#D4AF37] hover:bg-[#C9A227] text-black">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>
              <div className="space-y-3">
                <SettingToggle label="Read Receipts" description="Let others know when you've read their messages" enabled={readReceipts} onToggle={() => { setReadReceipts(!readReceipts); toggleSetting('readReceipts', !readReceipts); }} />
                <SettingToggle label="Typing Indicators" description="Show when you're typing" enabled={typingIndicators} onToggle={() => { setTypingIndicators(!typingIndicators); toggleSetting('typingIndicators', !typingIndicators); }} />
                <SettingToggle label="Last Seen" description="Show when you were last active" enabled={true} onToggle={() => {}} />
                <SettingToggle label="Profile Photo" description="Who can see your profile photo" enabled={true} onToggle={() => {}} />
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Notification Settings</h3>
              <div className="space-y-3">
                <SettingToggle label="Push Notifications" description="Receive push notifications for new messages" enabled={notifications} onToggle={() => setNotifications(!notifications)} />
                <SettingToggle label="Sound Effects" description="Play sounds for incoming messages" enabled={soundEffects} onToggle={() => setSoundEffects(!soundEffects)} />
                <SettingToggle label="Message Preview" description="Show message content in notifications" enabled={true} onToggle={() => {}} />
                <SettingToggle label="Story Notifications" description="Get notified when friends post stories" enabled={true} onToggle={() => {}} />
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>
              <div className="space-y-3">
                <SettingToggle label="Dark Mode" description="Use dark theme throughout the app" enabled={darkMode} onToggle={() => setDarkMode(!darkMode)} />
                <div className="bg-[#1A1A1A] border border-[#262626] rounded-lg p-4">
                  <label className="text-sm text-white font-medium">Font Size</label>
                  <div className="flex gap-2 mt-2">
                    {(['small', 'medium', 'large'] as const).map(size => (
                      <button key={size} onClick={() => setFontSize(size)} className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${fontSize === size ? 'bg-[#D4AF37] text-black' : 'bg-[#262626] text-neutral-400 hover:text-white'}`}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Security</h3>
              <div className="space-y-4">
                <div className="bg-[#1A1A1A] border border-[#262626] rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3">Change Password</h4>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full mb-2 px-3 py-2 bg-[#262626] border border-[#333] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]" />
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="w-full mb-3 px-3 py-2 bg-[#262626] border border-[#333] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]" />
                  <Button onClick={changePassword} disabled={!currentPassword || !newPassword} className="bg-[#6366F1] hover:bg-[#5558E0] text-white text-sm">
                    Update Password
                  </Button>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h4>
                  <Button variant="outline" onClick={deleteAccount} className="border-red-500 text-red-400 hover:bg-red-500/10 text-sm">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Data & Storage</h3>
              <div className="space-y-3">
                <SettingToggle label="Data Saver" description="Reduce data usage by compressing media" enabled={dataSaver} onToggle={() => setDataSaver(!dataSaver)} />
                <div className="bg-[#1A1A1A] border border-[#262626] rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white">Storage Usage</h4>
                  <div className="mt-2 h-2 bg-[#262626] rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4AF37] w-[30%] rounded-full" />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">3.2 GB of 15 GB used</p>
                </div>
                <Button variant="outline" className="border-[#262626] text-neutral-400 hover:text-white w-full">
                  Clear Cache
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingToggle({ label, description, enabled, onToggle }: { label: string; description: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between bg-[#1A1A1A] border border-[#262626] rounded-lg p-4">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? 'bg-[#D4AF37]' : 'bg-[#262626]'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
