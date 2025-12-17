import React, { useState, useMemo } from 'react';
import { useStore } from '../../StoreContext';
import { Trip, ItineraryItem, ItemType } from '../../types';
import { Plus, MapPin, Settings, GripVertical, ExternalLink } from 'lucide-react';
import { generateId, getTripDates, formatDateLabel, getIconComponent } from '../../utils';
import { Modal } from '../ui/Modal';

interface ScheduleProps {
  trip: Trip;
}

export const Schedule: React.FC<ScheduleProps> = ({ trip }) => {
  const { state, dispatch } = useStore();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageDaysOpen, setIsManageDaysOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  
  // UI State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const categories = state.settings.scheduleCategories;

  // Form State
  const [formDayIndex, setFormDayIndex] = useState(0);
  const [formTime, setFormTime] = useState('09:00');
  const [formTitle, setFormTitle] = useState('');
  const [formLoc, setFormLoc] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<ItemType>(categories[0]?.id || 'sightseeing');
  const [formUrl, setFormUrl] = useState('');

  // Drag State
  const [draggedDayIndex, setDraggedDayIndex] = useState<number | null>(null);
  const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null);

  // Generate Date Objects for the trip
  const tripDates = useMemo(() => getTripDates(trip.startDate, trip.days), [trip.startDate, trip.days]);

  const currentItems = state.itinerary
    .filter(i => i.tripId === trip.id && i.dayIndex === selectedDayIndex)
    .sort((a, b) => a.time.localeCompare(b.time));

  const getCategory = (id: string) => categories.find(c => c.id === id) || { label: '未分類', color: 'bg-gray-100 text-gray-500', icon: 'tag' };

  const handleOpenModal = (item?: ItineraryItem) => {
    setShowDeleteConfirm(false); // Reset confirm state
    if (item) {
      setEditingItem(item);
      setFormDayIndex(item.dayIndex);
      setFormTime(item.time);
      setFormTitle(item.title);
      setFormLoc(item.location);
      setFormContent(item.content);
      setFormType(item.type);
      setFormUrl(item.url || '');
    } else {
      setEditingItem(null);
      setFormDayIndex(selectedDayIndex);
      setFormTime('09:00');
      setFormTitle('');
      setFormLoc('');
      setFormContent('');
      setFormType(categories[0]?.id || 'sightseeing');
      setFormUrl('');
    }
    setIsModalOpen(true);
  };

  const handleLocationClick = () => {
    if(formLoc) {
        const query = encodeURIComponent(formLoc);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ItineraryItem = {
      id: editingItem ? editingItem.id : generateId(),
      tripId: trip.id,
      dayIndex: formDayIndex,
      time: formTime,
      title: formTitle,
      location: formLoc,
      content: formContent,
      type: formType,
      url: formUrl
    };

    if (editingItem) {
      dispatch({ type: 'UPDATE_ITEM', payload });
    } else {
      dispatch({ type: 'ADD_ITEM', payload });
    }
    setIsModalOpen(false);
  };

  const executeDelete = () => {
    if (editingItem) {
      dispatch({ type: 'DELETE_ITEM', payload: editingItem.id });
      setIsModalOpen(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedDayIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedDayIndex === null || draggedDayIndex === index) return;
    setDragOverDayIndex(index);
  };

  const handleDragEnd = () => {
      setDraggedDayIndex(null);
      setDragOverDayIndex(null);
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedDayIndex !== null && draggedDayIndex !== targetIndex) {
        dispatch({ 
            type: 'SWAP_DAYS', 
            payload: { tripId: trip.id, dayIndexA: draggedDayIndex, dayIndexB: targetIndex }
        });
    }
    handleDragEnd();
  };

  const getDaySummary = (dayIndex: number) => {
    const items = state.itinerary
        .filter(i => i.tripId === trip.id && i.dayIndex === dayIndex)
        .sort((a, b) => a.time.localeCompare(b.time));
    
    if (items.length === 0) return "無行程";
    const firstItem = items[0];
    const count = items.length;
    return `${firstItem.title} ${count > 1 ? `(+${count - 1} 個行程)` : ''}`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center px-4 py-2 border-b border-gray-50">
           <span className="font-bold text-xs text-gray-500 uppercase tracking-wider flex-1">行程規劃</span>
           <button onClick={() => setIsManageDaysOpen(true)} className="text-xs font-medium text-black flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors">
              <Settings size={12}/> 管理天數
           </button>
        </div>
        <div className="flex overflow-x-auto gap-2 p-3 no-scrollbar">
            {tripDates.map((date, index) => (
            <button
                key={index}
                onClick={() => setSelectedDayIndex(index)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-colors ${
                selectedDayIndex === index 
                    ? 'bg-black text-white shadow-md' 
                    : 'bg-white text-gray-500 border border-gray-200'
                }`}
            >
                {formatDateLabel(date)}
            </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 bg-white">
        {currentItems.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <p>此日目前沒有行程</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-100 ml-4 space-y-8">
            {currentItems.map(item => {
              const cat = getCategory(item.type);
              const CatIcon = getIconComponent(cat.icon);
              return (
                <div key={item.id} className="ml-6 relative">
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-black border-2 border-white shadow-sm z-10" />
                  
                  <div onClick={() => handleOpenModal(item)} className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 active:scale-98 transition-transform cursor-pointer relative">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${cat.color}`}>
                            <CatIcon size={10} />
                            {cat.label}
                          </span>
                          <span className="text-sm font-bold text-gray-400 font-mono">
                            {item.time}
                          </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                          <h3 className="text-lg font-bold text-gray-900 leading-snug">{item.title}</h3>
                          {item.location && (
                              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin size={12} /> {item.location}
                              </p>
                          )}
                      </div>
                      {item.url && (
                          <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                          >
                              <ExternalLink size={18} className="text-blue-500"/>
                          </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button 
        onClick={() => handleOpenModal()}
        className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
      >
        <Plus size={24} />
      </button>

      <Modal isOpen={isManageDaysOpen} onClose={() => setIsManageDaysOpen(false)} title="管理天數排序">
        <div className="space-y-3">
            <p className="text-xs text-gray-400 mb-2">長按並拖曳可重新排序天數與內容</p>
            {tripDates.map((date, index) => (
                <div 
                    key={index} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-center gap-3 p-3 bg-white rounded-xl border transition-all ${
                        dragOverDayIndex === index ? 'border-t-4 border-t-black mt-1' : 'border-gray-100'
                    } ${draggedDayIndex === index ? 'opacity-50' : 'opacity-100'}`}
                >
                    <div className="text-gray-300 cursor-grab active:cursor-grabbing p-1">
                        <GripVertical size={20} />
                    </div>
                    <div className="flex-1">
                        <span className="block font-bold text-gray-900 text-sm">{formatDateLabel(date)}</span>
                        <span className="block text-xs text-gray-500 truncate mt-0.5">{getDaySummary(index)}</span>
                    </div>
                </div>
            ))}
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? '編輯行程' : '新增行程'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">日期</label>
              <select 
                value={formDayIndex} 
                onChange={e => setFormDayIndex(parseInt(e.target.value))} 
                className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black"
              >
                  {tripDates.map((d, i) => (
                      <option key={i} value={i}>{formatDateLabel(d)}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">時間</label>
              <input 
                required 
                type="time" 
                value={formTime} 
                onChange={e => setFormTime(e.target.value)} 
                className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black appearance-none" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">類型</label>
            <select value={formType} onChange={e => setFormType(e.target.value as ItemType)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black">
                {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">標題</label>
            <input required type="text" placeholder="我們要去哪裡？" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 cursor-pointer" onClick={handleLocationClick}>地點</label>
            <div className="relative">
                <input type="text" placeholder="地址或地標名稱" value={formLoc} onChange={e => setFormLoc(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
                <MapPin size={16} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">相關連結 (選填)</label>
            <input type="url" placeholder="https://..." value={formUrl} onChange={e => setFormUrl(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">內容</label>
            <textarea rows={3} placeholder="詳細資訊、訂位代號等..." value={formContent} onChange={e => setFormContent(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
          </div>
          
          {formLoc && (
              <div className="rounded-xl overflow-hidden h-40 w-full bg-gray-100 border border-gray-200 mt-2">
                 <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(formLoc)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    aria-hidden="false"
                    title="Map Preview"
                 />
              </div>
          )}

          <div className="pt-4 flex gap-3">
            {editingItem && (
                !showDeleteConfirm ? (
                    <button 
                        type="button" 
                        onClick={() => setShowDeleteConfirm(true)} 
                        className="p-3 text-red-500 bg-red-50 rounded-xl flex-1 font-medium hover:bg-red-100 transition-colors"
                    >
                        刪除
                    </button>
                ) : (
                    <div className="flex flex-1 gap-2 animate-in fade-in zoom-in duration-200">
                        <button 
                            type="button" 
                            onClick={() => setShowDeleteConfirm(false)} 
                            className="p-3 text-gray-500 bg-gray-100 rounded-xl flex-1 font-medium hover:bg-gray-200 transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            type="button" 
                            onClick={executeDelete} 
                            className="p-3 text-white bg-red-500 rounded-xl flex-[2] font-bold hover:bg-red-600 transition-colors"
                        >
                            確認刪除
                        </button>
                    </div>
                )
            )}
            <button type="submit" className="p-3 bg-black text-white rounded-xl flex-[2] font-medium hover:bg-gray-900 transition-colors">
              儲存
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};