import React, { useState, useEffect } from 'react';
import { useStore } from '../../StoreContext';
import { AppSettings, Category, Trip } from '../../types';
import { generateId, ICON_MAP, getIconComponent } from '../../utils';
import { Trash2, Plus, GripVertical, Calendar, Users, Type, Save } from 'lucide-react';

const COLORS = [
  { name: 'Blue', class: 'bg-blue-100 text-blue-700', bg: 'bg-blue-100' },
  { name: 'Green', class: 'bg-green-100 text-green-700', bg: 'bg-green-100' },
  { name: 'Red', class: 'bg-red-100 text-red-700', bg: 'bg-red-100' },
  { name: 'Orange', class: 'bg-orange-100 text-orange-700', bg: 'bg-orange-100' },
  { name: 'Purple', class: 'bg-purple-100 text-purple-700', bg: 'bg-purple-100' },
  { name: 'Gray', class: 'bg-gray-100 text-gray-700', bg: 'bg-gray-100' },
  { name: 'Stone', class: 'bg-stone-100 text-stone-800', bg: 'bg-stone-100' },
  { name: 'Indigo', class: 'bg-indigo-100 text-indigo-700', bg: 'bg-indigo-100' },
];

export const SettingsModule: React.FC<{ tripId: string }> = ({ tripId }) => {
  const { state, dispatch, renameParticipant } = useStore();
  const trip = state.trips.find(t => t.id === tripId);

  const [activeTab, setActiveTab] = useState<'trip' | 'schedule' | 'recs' | 'notes'>('trip');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Trip Form State
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [editingPartIndex, setEditingPartIndex] = useState<number | null>(null);
  const [editPartName, setEditPartName] = useState('');

  useEffect(() => {
    if (trip) {
      setTitle(trip.title);
      setStartDate(trip.startDate || '');
      setEndDate(trip.endDate || '');
      setParticipants(trip.participants || []);
    }
  }, [trip]);

  if (!trip) return null;
  const isOwner = trip.role === 'OWNER';

  // --- Category Logic ---
  const currentKey: keyof AppSettings | null =
    activeTab === 'schedule' ? 'scheduleCategories' :
      activeTab === 'recs' ? 'recCategories' :
        activeTab === 'notes' ? 'noteCategories' : null;

  const categories = currentKey ? state.settings[currentKey] : [];

  const updateCategories = (newCategories: Category[]) => {
    if (currentKey) dispatch({ type: 'UPDATE_SETTINGS', payload: { ...state.settings, [currentKey]: newCategories } });
  };

  const handleAddCategory = () => {
    const newCat: Category = { id: generateId(), label: '新分類', color: COLORS[5].class, icon: 'tag' };
    updateCategories([...categories, newCat]);
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
    updateCategories(categories.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // --- Trip Logic ---
  const handleSaveTrip = () => {
    if (!isOwner) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    dispatch({
      type: 'UPDATE_TRIP',
      payload: { ...trip, title, startDate, endDate, days, participants }
    });
    alert("儲存成功！");
  };

  const startRename = (index: number) => {
    setEditingPartIndex(index);
    setEditPartName(participants[index]);
  };

  const saveRename = (index: number) => {
    if (editPartName.trim() && editPartName !== participants[index]) {
      renameParticipant(tripId, participants[index], editPartName.trim());
      // Update local state is handled by store update via useEffect, but for optimistic UI:
      const newP = [...participants];
      newP[index] = editPartName.trim();
      setParticipants(newP);
    }
    setEditingPartIndex(null);
  };

  const addParticipant = () => {
    const name = prompt("輸入新成員名稱");
    if (name && !participants.includes(name)) {
      const newP = [...participants, name];
      dispatch({ type: 'UPDATE_TRIP', payload: { ...trip, participants: newP } });
    }
  };

  const removeParticipant = (name: string) => {
    if (confirm(`移除 ${name}？(相關分帳將保留但可能找不到人)`)) {
      const newP = participants.filter(p => p !== name);
      dispatch({ type: 'UPDATE_TRIP', payload: { ...trip, participants: newP } });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-2 sticky top-0 z-10 flex gap-4 shrink-0 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'trip'} onClick={() => setActiveTab('trip')} label="旅程設定" />
        <TabButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} label="行程分類" />
        <TabButton active={activeTab === 'recs'} onClick={() => setActiveTab('recs')} label="推薦分類" />
        <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} label="筆記分類" />
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {activeTab === 'trip' ? (
          <div className="space-y-6">
            {!isOwner && (
              <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-sm font-bold flex items-center gap-2">
                <Users size={16} /> 僅擁有者 (Owner) 可修改旅程設定
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Type size={14} /> 旅程名稱</label>
              <input
                disabled={!isOwner}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none disabled:opacity-60"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Calendar size={14} /> 開始日期</label>
                <input
                  disabled={!isOwner}
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Calendar size={14} /> 結束日期</label>
                <input
                  disabled={!isOwner}
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none disabled:opacity-60"
                />
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Users size={14} /> 參與成員 (點擊更名)</label>
                {isOwner && <button onClick={addParticipant} className="text-blue-600 text-xs font-bold hover:underline">+ 新增</button>}
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {participants.map((p, idx) => (
                  <div key={idx} className="p-3 border-b border-gray-100 last:border-0 flex items-center justify-between group">
                    {editingPartIndex === idx ? (
                      <input
                        autoFocus
                        type="text"
                        value={editPartName}
                        onChange={e => setEditPartName(e.target.value)}
                        onBlur={() => saveRename(idx)}
                        onKeyDown={e => e.key === 'Enter' && saveRename(idx)}
                        className="flex-1 bg-gray-50 p-1 rounded font-bold outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => isOwner && startRename(idx)}
                        className={`font-bold flex-1 ${isOwner ? 'cursor-pointer hover:text-blue-600' : ''}`}
                      >
                        {p}
                      </span>
                    )}
                    {isOwner && editingPartIndex !== idx && (
                      <button onClick={() => removeParticipant(p)} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {participants.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">無成員</div>}
              </div>
            </div>

            {isOwner && (
              <button onClick={handleSaveTrip} className="w-full py-4 bg-black text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                <Save size={18} /> 儲存變更
              </button>
            )}
          </div>
        ) : (
          <>
            {categories.map((cat) => (
              <CategoryItem
                key={cat.id}
                category={cat}
                onUpdate={handleUpdateCategory}
                onDelete={() => updateCategories(categories.filter(c => c.id !== cat.id))}
              // Drag handlers would go here if we kept logic in parent, but simplified for brevity
              />
            ))}
            <button onClick={handleAddCategory} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold flex items-center justify-center hover:bg-white hover:text-black hover:border-black transition-all">
              <Plus size={18} className="mr-1" /> 新增分類
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label }: any) => (
  <button onClick={onClick} className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${active ? 'text-black border-black' : 'text-gray-400 border-transparent'}`}>{label}</button>
);

const CategoryItem = ({ category, onUpdate, onDelete }: any) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const IconComp = getIconComponent(category.icon);

  return (
    <div className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-3 transition-all shadow-sm">
      <div className="text-gray-300 cursor-grab p-1 -ml-1 shrink-0"><GripVertical size={20} /></div>

      {/* Color Picker */}
      <div className="relative shrink-0">
        <button type="button" onClick={() => setIsColorPickerOpen(!isColorPickerOpen)} className={`w-8 h-8 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100 ${category.color.split(' ')[0]}`} />
        {isColorPickerOpen && (
          <div className="absolute top-10 left-0 z-[100] bg-white p-3 rounded-xl shadow-2xl border border-gray-100 grid grid-cols-4 gap-2 w-44">
            <div className="fixed inset-0 -z-10" onClick={() => setIsColorPickerOpen(false)} />
            {COLORS.map(c => (
              <button key={c.name} onClick={() => { onUpdate(category.id, { color: c.class }); setIsColorPickerOpen(false); }} className={`w-8 h-8 rounded-full ${c.bg} ${category.color === c.class ? 'ring-2 ring-black' : ''}`} />
            ))}
          </div>
        )}
      </div>

      {/* Icon Picker */}
      <div className="relative shrink-0">
        <button type="button" onClick={() => setIsIconPickerOpen(!isIconPickerOpen)} className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100 hover:bg-gray-100">
          <IconComp size={16} />
        </button>
        {isIconPickerOpen && (
          <div className="absolute top-10 left-0 z-[100] bg-white p-3 rounded-xl shadow-2xl border border-gray-100 grid grid-cols-5 gap-2 w-56">
            <div className="fixed inset-0 -z-10" onClick={() => setIsIconPickerOpen(false)} />
            {Object.entries(ICON_MAP).map(([name, Icon]) => (
              <button key={name} onClick={() => { onUpdate(category.id, { icon: name }); setIsIconPickerOpen(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center ${category.icon === name ? 'bg-black text-white' : 'text-gray-400 hover:bg-gray-100'}`}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        )}
      </div>

      <input type="text" value={category.label} onChange={(e) => onUpdate(category.id, { label: e.target.value })} className="flex-1 min-w-0 bg-transparent font-bold text-gray-900 border-none focus:ring-0 p-0 text-sm" />

      {!confirmDelete ? (
        <button type="button" onClick={() => setConfirmDelete(true)} className="text-gray-300 hover:text-red-500 p-2 shrink-0"><Trash2 size={18} /></button>
      ) : (
        <div className="flex gap-1 shrink-0 animate-in fade-in slide-in-from-right-2">
          <button type="button" onClick={() => setConfirmDelete(false)} className="text-[10px] bg-gray-100 px-2.5 py-1 rounded-lg font-bold text-gray-500">取消</button>
          <button type="button" onClick={() => onDelete()} className="text-[10px] bg-red-500 text-white px-2.5 py-1 rounded-lg font-bold shadow-sm">刪除</button>
        </div>
      )}
    </div>
  );
};
