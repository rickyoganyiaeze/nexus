import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, orderBy } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, AlertTriangle, Ban, Trash2, BarChart3, Activity, MessageSquare, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { User as UserType, Report } from '@/types';

export default function AdminDashboard() {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'reports' | 'analytics'>('overview');
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: UserType[] = [];
      let online = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserType;
        data.uid = docSnap.id;
        users.push(data);
        if (data.status === 'online') online++;
      });
      setAllUsers(users);
      setOnlineUsers(online);
    });

    const reportsUnsub = onSnapshot(query(collection(db, 'reports'), orderBy('timestamp', 'desc')), (snapshot) => {
      const reps: Report[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        reps.push({
          id: docSnap.id,
          reporterId: data.reporterId,
          reportedUserId: data.reportedUserId,
          reason: data.reason,
          details: data.details,
          status: data.status || 'pending',
          timestamp: data.timestamp?.toDate(),
        });
      });
      setReports(reps);
    });

    getDocs(collection(db, 'chats')).then(snap => {
      setTotalChats(snap.size);
      let messages = 0;
      snap.forEach(chatDoc => {
        getDocs(collection(db, 'chats', chatDoc.id, 'messages')).then(msgSnap => {
          messages += msgSnap.size;
          setTotalMessages(messages);
        });
      });
    });

    return () => { usersUnsub(); reportsUnsub(); };
  }, [isAdmin, navigate]);

  const banUser = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { banned: true, status: 'offline' });
    toast.success('User banned');
  };

  const unbanUser = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { banned: false });
    toast.success('User unbanned');
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    await deleteDoc(doc(db, 'users', userId));
    toast.success('User deleted');
  };

  const resolveReport = async (reportId: string) => {
    await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
    toast.success('Report resolved');
  };

  const dismissReport = async (reportId: string) => {
    await updateDoc(doc(db, 'reports', reportId), { status: 'dismissed' });
    toast.success('Report dismissed');
  };

  const filteredUsers = allUsers.filter(u =>
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: 'Total Users', value: allUsers.length, icon: Users, color: 'text-[#6366F1]' },
    { label: 'Online Now', value: onlineUsers, icon: Activity, color: 'text-[#10B981]' },
    { label: 'Total Chats', value: totalChats, icon: MessageSquare, color: 'text-[#D4AF37]' },
    { label: 'Messages', value: totalMessages, icon: BarChart3, color: 'text-[#F59E0B]' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="h-16 border-b border-[#262626] flex items-center px-6 gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-neutral-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Shield className="w-5 h-5 text-[#D4AF37]" />
        <h1 className="text-lg font-semibold">NEXUS Admin Dashboard</h1>
        <span className="ml-auto text-xs text-neutral-500">Admin: {currentUser?.email}</span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-[#262626] min-h-[calc(100vh-64px)]">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'users', label: 'User Management', icon: Users },
            { key: 'reports', label: 'Reports', icon: AlertTriangle },
            { key: 'analytics', label: 'Analytics', icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                activeTab === tab.key ? 'bg-[rgba(212,175,55,0.1)] text-[#D4AF37] border-l-2 border-l-[#D4AF37]' : 'text-neutral-400 hover:bg-[#262626] hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
              {tab.key === 'reports' && reports.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {reports.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {stats.map(stat => (
                  <div key={stat.label} className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      <TrendingUp className="w-4 h-4 text-neutral-600" />
                    </div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-neutral-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
                  <div className="space-y-2">
                    {allUsers.slice(0, 5).map(user => (
                      <div key={user.uid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#262626]">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.photoURL || '/avatar-default-1.jpg'} />
                          <AvatarFallback className="bg-[#262626] text-[#D4AF37] text-xs">{user.displayName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm text-white">{user.displayName || user.username}</p>
                          <p className="text-xs text-neutral-500">{user.status === 'online' ? 'Active now' : `Last seen ${user.lastSeen?.toLocaleDateString() || 'unknown'}`}</p>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-[#10B981]' : 'bg-neutral-600'}`} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Pending Reports</h3>
                  <div className="space-y-2">
                    {reports.filter(r => r.status === 'pending').slice(0, 5).map(report => (
                      <div key={report.id} className="p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-red-400">{report.reason}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">{report.timestamp?.toLocaleDateString()}</p>
                      </div>
                    ))}
                    {reports.filter(r => r.status === 'pending').length === 0 && (
                      <p className="text-sm text-neutral-600">No pending reports</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">User Management</h2>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="px-3 py-2 bg-[#1A1A1A] border border-[#262626] rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#262626]">
                      <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3">User</th>
                      <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3">Joined</th>
                      <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.uid} className="border-b border-[#262626] hover:bg-[#262626]/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.photoURL || '/avatar-default-1.jpg'} />
                              <AvatarFallback className="bg-[#262626] text-[#D4AF37] text-xs">{user.displayName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm text-white">{user.displayName || user.username}</p>
                              <p className="text-xs text-neutral-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                            user.status === 'online' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-neutral-800 text-neutral-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'online' ? 'bg-[#10B981]' : 'bg-neutral-500'}`} />
                            {user.status || 'offline'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-400">
                          {user.createdAt?.toLocaleDateString() || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {user.banned ? (
                              <Button size="sm" variant="ghost" onClick={() => unbanUser(user.uid)} className="text-[#10B981] hover:bg-[#10B981]/10 h-7 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" /> Unban
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => banUser(user.uid)} className="text-red-400 hover:bg-red-400/10 h-7 text-xs">
                                <Ban className="w-3 h-3 mr-1" /> Ban
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => deleteUser(user.uid)} className="text-red-400 hover:bg-red-400/10 h-7 text-xs">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">User Reports</h2>
              <div className="space-y-3">
                {reports.map(report => (
                  <div key={report.id} className={`bg-[#1A1A1A] border rounded-xl p-4 ${
                    report.status === 'pending' ? 'border-red-500/20' : report.status === 'resolved' ? 'border-[#10B981]/20' : 'border-[#262626]'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          report.status === 'pending' ? 'bg-red-500/10' : report.status === 'resolved' ? 'bg-[#10B981]/10' : 'bg-neutral-800'
                        }`}>
                          <AlertTriangle className={`w-5 h-5 ${
                            report.status === 'pending' ? 'text-red-400' : report.status === 'resolved' ? 'text-[#10B981]' : 'text-neutral-500'
                          }`} />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-white">{report.reason}</h4>
                          <p className="text-xs text-neutral-500 mt-0.5">{report.details}</p>
                          <p className="text-xs text-neutral-600 mt-1">
                            Reporter: {report.reporterId?.slice(0, 8)}... · Reported: {report.reportedUserId?.slice(0, 8)}... · {report.timestamp?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => resolveReport(report.id)} className="bg-[#10B981] hover:bg-emerald-600 text-white h-7 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => dismissReport(report.id)} className="text-neutral-500 hover:text-white h-7 text-xs">
                              <XCircle className="w-3 h-3 mr-1" /> Dismiss
                            </Button>
                          </>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          report.status === 'pending' ? 'bg-red-500/10 text-red-400' :
                          report.status === 'resolved' ? 'bg-[#10B981]/10 text-[#10B981]' :
                          'bg-neutral-800 text-neutral-500'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <p className="text-center text-neutral-600 py-8">No reports found</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Analytics</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">User Growth</h3>
                  <div className="h-48 flex items-end gap-2">
                    {[30, 45, 35, 55, 40, 60, 50, 70, 65, 80, 75, allUsers.length].map((val, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gradient-to-t from-[#D4AF37] to-[#D4AF37]/50 rounded-t" style={{ height: `${Math.min(val * 2, 160)}px` }} />
                        <span className="text-[10px] text-neutral-600">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Platform Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-400">Active Today</span>
                      <span className="text-sm text-white font-medium">{onlineUsers}</span>
                    </div>
                    <div className="h-1 bg-[#262626] rounded-full">
                      <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${(onlineUsers / Math.max(allUsers.length, 1)) * 100}%` }} />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-neutral-400">Messages Today</span>
                      <span className="text-sm text-white font-medium">{totalMessages}</span>
                    </div>
                    <div className="h-1 bg-[#262626] rounded-full">
                      <div className="h-full bg-[#6366F1] rounded-full" style={{ width: `${Math.min((totalMessages / 1000) * 100, 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-neutral-400">Active Chats</span>
                      <span className="text-sm text-white font-medium">{totalChats}</span>
                    </div>
                    <div className="h-1 bg-[#262626] rounded-full">
                      <div className="h-full bg-[#D4AF37] rounded-full" style={{ width: `${Math.min((totalChats / 100) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
