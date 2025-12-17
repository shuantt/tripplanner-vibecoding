import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './StoreContext';
import { Trip } from './types';
import { generateId, formatDateValue } from './utils';
import { Plus, Trash2, Calendar, DollarSign, Heart, FileText, ChevronLeft, Briefcase, Users, Calendar as CalendarIcon, Settings as SettingsIcon } from 'lucide-react';
import { Modal } from './components/ui/Modal';
import { Schedule } from './components/modules/Schedule';
import { Expenses } from './components/modules/Expenses';
import { Recommendations } from './components/modules/Recommendations';
import { Notes } from './components/modules/Notes';
import { SettingsModule } from './components/modules/Settings';

const TripCard: React.FC<{ trip: Trip; onClick: () => void; onDelete: (e: React.MouseEvent) => void; onEdit: (e: React.MouseEvent) => void }> = ({ trip, onClick, onDelete, onEdit }) => {
    // Helper to calc end date for display if missing
    const getDisplayDateRange = () => {
        const start = trip.startDate.replace(/-/g, '/');
        let end = '';
        
        if (trip.endDate) {
            end = trip.endDate.replace(/-/g, '/');
        } else {
            // Calculate end date based on days
            const d = new Date(trip.startDate);
            d.setDate(d.getDate() + (trip.days - 1));
            end = formatDateValue(d).replace(/-/g, '/');
        }
        return `${start} - ${end}`;
    };

    return (
      <div onClick={onClick} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 active:scale-98 transition-transform cursor-pointer relative group">
        <div className="flex justify-between items-start mb-3">
          <div className="h-10 w-10 bg-black rounded-full flex items-center justify-center">
            <Briefcase className="text-white" size={20} />
          </div>
          <div className="flex gap-1 z-10">
            <button 
                onClick={onEdit} 
                className="text-gray-300 hover:text-black p-2 rounded-full hover:bg-gray-50 transition-colors"
            >
                <SettingsIcon size={18} />
            </button>
            <button 
                onClick={onDelete} 
                className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
            >
                <Trash2 size={18} />
            </button>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">{trip.title}</h3>
        <div className="flex items-center text-gray-500 text-sm gap-4 mt-2">
            <span className="flex items-center gap-1"><CalendarIcon size={14}/> {trip.days} 天</span>
            <span className="flex items-center gap-1"><Users size={14}/> {trip.participants.length} 人</span>
        </div>
        <div className="text-xs text-gray-400 mt-2 font-mono">
            {getDisplayDateRange()}
        </div>
      </div>
    );
};

const MainApp = () => {
  const { state, dispatch } = useStore();
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  
  // Modals State
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'expenses' | 'recs' | 'notes' | 'settings'>('schedule');

  // Form State
  const [tripTitle, setTripTitle] = useState('');
  const [startDate, setStartDate] = useState(formatDateValue(new Date()));
  const [endDate, setEndDate] = useState(formatDateValue(new Date(new Date().setDate(new Date().getDate() + 2))));
  const [tripParticipants, setTripParticipants] = useState('');

  const activeTrip = state.trips.find(t => t.id === activeTripId);

  const openCreateModal = () => {
    setEditingTrip(null);
    setTripTitle('');
    const today = new Date();
    setStartDate(formatDateValue(today));
    const nextDays = new Date(today);
    nextDays.setDate(today.getDate() + 2);
    setEndDate(formatDateValue(nextDays));
    setTripParticipants('');
    setIsNewTripModalOpen(true);
  }

  const openEditModal = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    setEditingTrip(trip);
    setTripTitle(trip.title);
    setStartDate(trip.startDate);
    
    if (trip.endDate) {
        setEndDate(trip.endDate);
    } else {
        // Fallback calculation
        const start = new Date(trip.startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + trip.days - 1);
        setEndDate(formatDateValue(end));
    }

    setTripParticipants(trip.participants.join(', '));
    setIsNewTripModalOpen(true);
  }

  const handleSaveTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = tripParticipants.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) {
      alert("請至少新增一位參與者");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
        alert("結束日期不能早於開始日期");
        return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (editingTrip) {
        const updatedTrip: Trip = {
            ...editingTrip,
            title: tripTitle,
            days: days,
            startDate,
            endDate,
            participants: parts
        };
        dispatch({ type: 'UPDATE_TRIP', payload: updatedTrip });
    } else {
        const newTrip: Trip = {
            id: generateId(),
            title: tripTitle,
            days: days,
            startDate,
            endDate,
            participants: parts,
        };
        dispatch({ type: 'ADD_TRIP', payload: newTrip });
    }
    
    setIsNewTripModalOpen(false);
  };

  const confirmDeleteTrip = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTripToDelete(id);
    setIsDeleteConfirmOpen(true);
  }

  const executeDeleteTrip = () => {
    if (tripToDelete) {
        dispatch({ type: 'DELETE_TRIP', payload: tripToDelete });
        setTripToDelete(null);
        setIsDeleteConfirmOpen(false);
    }
  }

  // Helper for Header Date Display
  const getHeaderDate = (trip: Trip) => {
      const start = trip.startDate.replace(/-/g, '/');
      let end = '';
      if (trip.endDate) {
          end = trip.endDate.replace(/-/g, '/');
      } else {
          const d = new Date(trip.startDate);
          d.setDate(d.getDate() + (trip.days - 1));
          end = formatDateValue(d).replace(/-/g, '/');
      }
      return `${start} - ${end}`;
  }

  // Dashboard View
  if (!activeTrip) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <header className="mb-8 mt-4">
          <h1 className="text-3xl font-extrabold text-gray-900">我的旅程</h1>
          <p className="text-gray-500 mt-2">開始規劃你的下一場冒險。</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.trips.map(trip => (
            <TripCard 
                key={trip.id} 
                trip={trip} 
                onClick={() => setActiveTripId(trip.id)} 
                onDelete={(e) => confirmDeleteTrip(e, trip.id)}
                onEdit={(e) => openEditModal(e, trip)}
            />
          ))}
          
          <button 
            onClick={openCreateModal}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-gray-400 transition-colors min-h-[160px]"
          >
            <Plus size={32} className="mb-2" />
            <span className="font-medium">建立新行程</span>
          </button>
        </div>

        {/* Create/Edit Modal */}
        <Modal isOpen={isNewTripModalOpen} onClose={() => setIsNewTripModalOpen(false)} title={editingTrip ? "編輯行程" : "新旅程"}>
          <form onSubmit={handleSaveTrip} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">目的地</label>
              <input required type="text" placeholder="例如：2024 東京" value={tripTitle} onChange={e => setTripTitle(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">開始日期</label>
                    <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">結束日期</label>
                    <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
                </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">參與者 (用逗號分隔)</label>
              <input required type="text" placeholder="小明, 小華, 美美" value={tripParticipants} onChange={e => setTripParticipants(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
            </div>
            <button type="submit" className="w-full p-3 bg-black text-white rounded-xl font-bold mt-2">{editingTrip ? "儲存更新" : "建立行程"}</button>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="確認刪除">
            <div className="space-y-4">
                <p className="text-gray-600">確定要刪除此行程嗎？此動作無法復原。</p>
                <div className="flex gap-3">
                    <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-xl font-medium">取消</button>
                    <button onClick={executeDeleteTrip} className="flex-1 p-3 bg-red-500 text-white rounded-xl font-bold">確認刪除</button>
                </div>
            </div>
        </Modal>
      </div>
    );
  }

  // Detail View
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <button onClick={() => setActiveTripId(null)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        
        <div className="flex flex-col items-center justify-center flex-1 min-w-0 mx-2">
            <h1 className="text-lg font-bold text-gray-900 leading-snug text-center truncate w-full">{activeTrip.title}</h1>
            <span className="text-[11px] text-gray-400 font-medium tracking-wide mt-0.5 font-mono">
                {getHeaderDate(activeTrip)}
            </span>
        </div>
        
        <div className="w-8" />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'schedule' && <Schedule trip={activeTrip} />}
        {activeTab === 'expenses' && <Expenses trip={activeTrip} />}
        {activeTab === 'recs' && <Recommendations trip={activeTrip} />}
        {activeTab === 'notes' && <Notes trip={activeTrip} />}
        {activeTab === 'settings' && <SettingsModule />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 pb-safe pt-2 px-4 flex justify-between items-center z-30">
        <NavButton 
            active={activeTab === 'schedule'} 
            onClick={() => setActiveTab('schedule')} 
            icon={<Calendar size={24} />} 
            label="行程" 
        />
        <NavButton 
            active={activeTab === 'expenses'} 
            onClick={() => setActiveTab('expenses')} 
            icon={<DollarSign size={24} />} 
            label="分帳" 
        />
        <NavButton 
            active={activeTab === 'recs'} 
            onClick={() => setActiveTab('recs')} 
            icon={<Heart size={24} />} 
            label="推薦" 
        />
        <NavButton 
            active={activeTab === 'notes'} 
            onClick={() => setActiveTab('notes')} 
            icon={<FileText size={24} />} 
            label="筆記" 
        />
         <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<SettingsIcon size={24} />} 
            label="設定" 
        />
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1 p-2 min-w-[50px] transition-colors duration-200 ${active ? 'text-black' : 'text-gray-300 hover:text-gray-500'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const App = () => (
  <StoreProvider>
    <MainApp />
  </StoreProvider>
);

export default App;