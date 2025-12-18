import React, { useState } from 'react';
import { StoreProvider, useStore } from './StoreContext';
import { AuthProvider, useAuth } from './AuthContext';
import { Login } from './Login';
import { Trip } from './types';
import { generateId, formatDateValue, generateShortId, copyToClipboard } from './utils';
import { Plus, Trash2, Calendar, DollarSign, Heart, FileText, ChevronLeft, Briefcase, Users, Calendar as CalendarIcon, Settings as SettingsIcon, Copy, Share2, Link, LogOut } from 'lucide-react';
import { Modal } from './components/ui/Modal';
import { Schedule } from './components/modules/Schedule';
import { Expenses } from './components/modules/Expenses';
import { Recommendations } from './components/modules/Recommendations';
import { Notes } from './components/modules/Notes';
import { SettingsModule } from './components/modules/Settings';

const TripCard: React.FC<{ trip: Trip; onClick: () => void; onDelete: (e: React.MouseEvent) => void }> = ({ trip, onClick, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(trip.shortId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/?join=${trip.shortId}`;
    if (navigator.share) {
      navigator.share({ title: trip.title, text: `加入我的旅程：${trip.shortId}`, url: shareUrl });
    } else {
      copyToClipboard(shareUrl).then(() => alert("分享連結已複製"));
    }
  };

  return (
    <div onClick={onClick} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer relative group">
      <div className="flex justify-between items-start mb-3">
        <div className="h-10 w-10 bg-black rounded-full flex items-center justify-center">
          <Briefcase className="text-white" size={20} />
        </div>
        <div className="flex gap-1 z-10">
          <button onClick={handleShare} className="text-gray-400 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition-colors"><Share2 size={16} /></button>
          <button onClick={handleCopy} className={`p-2 rounded-full transition-all ${copied ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}>
            <Copy size={16} />
          </button>

          {trip.role === 'OWNER' && (
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
          )}
        </div>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-[10px]">{trip.title}</h3>
      <div className="flex items-center text-gray-500 text-xs gap-3 font-medium">
        <span className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-gray-900 font-mono font-bold tracking-tighter">{trip.shortId}</span>
        <span className="flex items-center gap-1"><CalendarIcon size={12} /> {trip.days}天</span>
        <span className="flex items-center gap-1"><Users size={12} /> {trip.participants.length}人</span>
      </div>
    </div>
  );
};

const MainApp = () => {
  const { user, logout } = useAuth();
  const { state, dispatch, importTripById, isLoading } = useStore();
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [activeTab, setActiveTab] = useState<'schedule' | 'expenses' | 'recs' | 'notes' | 'settings'>('schedule');

  // Form State
  const [tripTitle, setTripTitle] = useState('');
  const [startDate, setStartDate] = useState(formatDateValue(new Date()));
  const [endDate, setEndDate] = useState(formatDateValue(new Date(new Date().setDate(new Date().getDate() + 3))));
  const [tripParticipants, setTripParticipants] = useState('');

  const activeTrip = state.trips.find(t => t.id === activeTripId);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    const success = await importTripById(joinId.trim().toUpperCase());
    if (success) {
      setIsJoinModalOpen(false);
      setJoinId('');
      alert("成功加入旅程！");
    } else {
      alert("找不到此旅程，請檢查 ID 是否正確。");
    }
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = tripParticipants.split(',').map(s => s.trim()).filter(Boolean);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    dispatch({ type: 'ADD_TRIP', payload: { id: generateId(), shortId: generateShortId(), title: tripTitle, days, startDate, endDate, participants: parts } });

    // Reset and Close
    setTripTitle('');
    setTripParticipants('');
    setIsNewTripModalOpen(false);
  };

  if (!activeTrip) {
    return (
      <div className="h-[100dvh] bg-gray-50 p-6 flex flex-col overflow-y-auto relative">
        {isLoading && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[100] flex items-center justify-center">
            <div className="bg-white px-6 py-4 rounded-2xl shadow-xl font-bold flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              載入中...
            </div>
          </div>
        )}
        <header className="mb-4 mt-4 shrink-0 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">我的旅程</h1>
            <p className="text-gray-500 mt-1">你好，{user?.name}</p>
          </div>
          <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50">
            <LogOut size={20} />
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 overflow-y-auto">
          {state.trips.map(trip => (
            <TripCard key={trip.id} trip={trip} onClick={() => setActiveTripId(trip.id)} onDelete={(e) => { e.stopPropagation(); if (confirm('確定要刪除嗎？這將會同步刪除所有成員的旅程。')) dispatch({ type: 'DELETE_TRIP', payload: trip.id }) }} />
          ))}

          <div className="flex gap-2 min-h-[140px]">
            <button onClick={() => { setTripTitle(''); setTripParticipants(''); setIsNewTripModalOpen(true); }} className="flex-1 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:bg-white hover:text-black hover:border-black transition-all">
              <Plus size={24} /> <span className="text-sm font-bold mt-1">建立新旅程</span>
            </button>
            <button onClick={() => setIsJoinModalOpen(true)} className="flex-1 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:bg-white hover:text-blue-600 hover:border-blue-600 transition-all">
              <Link size={24} /> <span className="text-sm font-bold mt-1">加入旅程</span>
            </button>
          </div>
        </div>

        <Modal isOpen={isNewTripModalOpen} onClose={() => setIsNewTripModalOpen(false)} title="建立新旅程">
          <form onSubmit={handleCreateTrip} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">旅程名稱</label>
              <input required type="text" placeholder="目的地" value={tripTitle} onChange={e => setTripTitle(e.target.value)} className="w-full p-4 bg-gray-100 rounded-xl text-gray-900 focus:ring-2 focus:ring-black outline-none border-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">開始日期</label>
                <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-4 bg-gray-100 rounded-xl text-gray-900 focus:ring-2 focus:ring-black outline-none border-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">結束日期</label>
                <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-4 bg-gray-100 rounded-xl text-gray-900 focus:ring-2 focus:ring-black outline-none border-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">參與人員</label>
              <input required type="text" placeholder="用逗號隔開" value={tripParticipants} onChange={e => setTripParticipants(e.target.value)} className="w-full p-4 bg-gray-100 rounded-xl text-gray-900 focus:ring-2 focus:ring-black outline-none border-none" />
            </div>
            <button type="submit" className="w-full p-4 bg-black text-white rounded-xl font-bold active:scale-95 transition-transform">立即建立</button>
          </form>
        </Modal>

        <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="加入現有旅程">
          <form onSubmit={handleJoin} className="space-y-5">
            <p className="text-sm text-gray-500 leading-relaxed text-center">請輸入 7 位代碼 (例如 AA-1234)</p>
            <input required type="text" placeholder="XX-XXXX" value={joinId} onChange={e => setJoinId(e.target.value.toUpperCase())} className="w-full p-5 bg-gray-100 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.2em] text-gray-900 focus:ring-2 focus:ring-black outline-none border-none" />
            <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold">載入資料</button>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden" style={{ height: '100dvh' }}>
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 shrink-0 z-50">
        <button onClick={() => setActiveTripId(null)} className="p-2 -ml-2 text-gray-600"><ChevronLeft size={24} /></button>
        <div className="flex-1 text-center truncate px-2">
          <h1 className="text-base font-bold text-gray-900 truncate">{activeTrip.title}</h1>
          <p className="text-[10px] text-gray-500 font-mono tracking-tighter">{activeTrip.startDate} - {activeTrip.endDate}</p>
        </div>
        <div className="flex justify-end min-w-[70px]">
          <span className="text-[10px] bg-white text-gray-900 border border-gray-200 px-2 py-1 rounded font-bold font-mono shadow-sm">{activeTrip.shortId}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative bg-white">
        {activeTab === 'schedule' && <Schedule trip={activeTrip} />}
        {activeTab === 'expenses' && <Expenses trip={activeTrip} />}
        {activeTab === 'recs' && <Recommendations trip={activeTrip} />}
        {activeTab === 'notes' && <Notes trip={activeTrip} />}
        {activeTab === 'settings' && <SettingsModule tripId={activeTrip.id} />}
      </main>

      <nav className="bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)] shrink-0 z-50 shadow-sm">
        <div className="flex justify-around items-center pt-2 h-16">
          <NavButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={<Calendar size={22} />} label="行程" />
          <NavButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<DollarSign size={22} />} label="分帳" />
          <NavButton active={activeTab === 'recs'} onClick={() => setActiveTab('recs')} icon={<Heart size={22} />} label="推薦" />
          <NavButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={<FileText size={22} />} label="筆記" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={22} />} label="設定" />
        </div>
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 w-16 transition-all ${active ? 'text-black' : 'text-gray-300'}`}>
    {icon} <span className="text-[10px] font-bold tracking-tight">{label}</span>
  </button>
);

const AppContent = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center">載入中...</div>;
  if (!user) return <Login />;
  return <StoreProvider><MainApp /></StoreProvider>;
}

const App = () => <AuthProvider><AppContent /></AuthProvider>;
export default App;