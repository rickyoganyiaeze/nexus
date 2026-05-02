import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, sendEmailVerification, setDoc, doc, serverTimestamp } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'setup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        username: user.email?.split('@')[0] || 'user',
        bio: '',
        status: 'online',
        lastSeen: serverTimestamp(),
        blockedUsers: [],
        contacts: [],
        createdAt: serverTimestamp(),
        isAdmin: user.email === 'ojd12dx@gmail.com',
      }, { merge: true });
      toast.success('Welcome to NEXUS!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed');
    }
    setLoading(false);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Sign in failed');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      await sendEmailVerification(result.user);
      setFirebaseUser(result.user);
      setMode('setup');
      toast.success('Account created! Set up your profile.');
    } catch (err: any) {
      toast.error(err.message || 'Sign up failed');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
      setMode('login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    }
    setLoading(false);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName,
        username: username.toLowerCase().replace(/\s/g, ''),
        bio: bio,
        status: 'online',
        lastSeen: serverTimestamp(),
        blockedUsers: [],
        contacts: [],
        createdAt: serverTimestamp(),
        isAdmin: firebaseUser.email === 'ojd12dx@gmail.com',
      });
      toast.success('Profile setup complete!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Setup failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="NEXUS" className="w-16 h-16 mx-auto mb-4 rounded-lg" />
          <h1 className="text-3xl font-bold text-[#D4AF37] tracking-wider">NEXUS</h1>
          <p className="text-neutral-500 mt-2 text-sm">Premium Communication Platform</p>
        </div>

        <div className="bg-[#121212] border border-[#262626] rounded-xl p-6">
          {mode === 'login' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Sign In</h2>
              <div>
                <Label className="text-neutral-400">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-[#1A1A1A] border-[#262626] text-white" placeholder="your@email.com" required />
                </div>
              </div>
              <div>
                <Label className="text-neutral-400">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 bg-[#1A1A1A] border-[#262626] text-white" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#D4AF37] hover:bg-[#C9A227] text-black font-semibold">
                {loading ? 'Signing in...' : 'Sign In'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#262626]" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-[#121212] px-2 text-neutral-500">or</span></div>
              </div>
              <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={loading} className="w-full border-[#262626] text-white hover:bg-[#262626]">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </Button>
              <div className="flex justify-between text-sm mt-4">
                <button type="button" onClick={() => setMode('forgot')} className="text-[#D4AF37] hover:underline">Forgot password?</button>
                <button type="button" onClick={() => setMode('signup')} className="text-[#D4AF37] hover:underline">Create account</button>
              </div>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Create Account</h2>
              <div>
                <Label className="text-neutral-400">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="pl-10 bg-[#1A1A1A] border-[#262626] text-white" placeholder="John Doe" required />
                </div>
              </div>
              <div>
                <Label className="text-neutral-400">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-[#1A1A1A] border-[#262626] text-white" placeholder="your@email.com" required />
                </div>
              </div>
              <div>
                <Label className="text-neutral-400">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 bg-[#1A1A1A] border-[#262626] text-white" placeholder="Min 6 characters" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#D4AF37] hover:bg-[#C9A227] text-black font-semibold">
                {loading ? 'Creating...' : 'Create Account'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#262626]" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-[#121212] px-2 text-neutral-500">or</span></div>
              </div>
              <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={loading} className="w-full border-[#262626] text-white hover:bg-[#262626]">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </Button>
              <p className="text-sm text-neutral-500 text-center mt-4">
                Already have an account? <button type="button" onClick={() => setMode('login')} className="text-[#D4AF37] hover:underline">Sign in</button>
              </p>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Reset Password</h2>
              <p className="text-sm text-neutral-400">Enter your email and we'll send you a reset link.</p>
              <div>
                <Label className="text-neutral-400">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-[#1A1A1A] border-[#262626] text-white" placeholder="your@email.com" required />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#D4AF37] hover:bg-[#C9A227] text-black font-semibold">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <p className="text-sm text-neutral-500 text-center mt-4">
                Remembered? <button type="button" onClick={() => setMode('login')} className="text-[#D4AF37] hover:underline">Sign in</button>
              </p>
            </form>
          )}

          {mode === 'setup' && (
            <form onSubmit={handleSetup} className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" /> Complete Profile
              </h2>
              <div>
                <Label className="text-neutral-400">Username</Label>
                <Input type="text" value={username} onChange={e => setUsername(e.target.value)} className="bg-[#1A1A1A] border-[#262626] text-white" placeholder="@username" required />
              </div>
              <div>
                <Label className="text-neutral-400">Bio</Label>
                <Input type="text" value={bio} onChange={e => setBio(e.target.value)} className="bg-[#1A1A1A] border-[#262626] text-white" placeholder="Tell us about yourself..." />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#D4AF37] hover:bg-[#C9A227] text-black font-semibold">
                {loading ? 'Saving...' : 'Get Started'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
