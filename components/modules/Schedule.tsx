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
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const categories = state.settings.scheduleCategories;

  // Form State
  const [formDayIndex, setFormDayIndex] = useState(0);
  const [formTime, setFormTime] = useState('09:00');
  const [formTitle, setFormTitle] = useState('');
  const [formLoc, setFormLoc] = useState('');
  const [formMapUrl, setFormMapUrl] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<ItemType>(categories[0]?.id || 'sightseeing');
  const [formUrl, setFormUrl] = useState('');

  // Drag State
  const [draggedDayIndex, setDraggedDayIndex] = useState<number | null>(null);
  const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null);

  const tripDates = useMemo(() => getTripDates(trip.startDate, trip.days), [trip.startDate, trip.days]);

  const currentItems = state.itinerary
    .filter(i => i.tripId === trip.id && i.dayIndex === selectedDayIndex)
    .sort((a, b) => a.time.localeCompare(b.time));

  const getCategory = (id: string) => categories.find(c => c.id === id) || { label: '未分類', color: 'bg-gray-100 text-gray-500', icon: 'tag' };

  /**
   * Helper to generate Google Maps Embed URL.
   * To avoid "Some custom on-map content could not be displayed" error:
   * We MUST NOT pass a full Google Maps URL as the 'q' parameter.
   * If the input is a URL, we try to extract the place name.
   */
  const getEmbedUrl = (mapUrl: string, loc: string) => {
    let query = '';
    
    if (mapUrl && mapUrl.trim()) {
      const trimmedMapUrl = mapUrl.trim();
      if (trimmedMapUrl.startsWith('http')) {
        // Regex to extract place name from /place/NAME/ in a Google Maps URL
        const placeMatch = trimmedMapUrl.match(/\/place\/([^\/|\?]+)/);
        if (placeMatch && placeMatch[1]) {
          // Found a place name in the URL, decode it for the query
          query = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        } else {
          // If it's a URL we can't parse easily, fallback to the location text (formLoc) 
          // to ensure the embed remains valid and doesn't break.
          query = loc;
        }
      } else {
        // If mapUrl field is just a plain string/address
        query = trimmedMapUrl;
      }
    } else {
      // If no mapUrl provided, use the location text
      query = loc;
    }

    if (!query || !query.trim()) return null;
    
    // Using the legacy but highly compatible embed URL format
    return `https://maps.google.com/maps?q=${encodeURIComponent(query.trim())}&output=embed&z=15`;
  };

  const handleOpenModal = (item?: ItineraryItem) => {
    setShowDeleteConfirm(false);
    if (item) {
      setEditingItem(item);
      setFormDayIndex(item.dayIndex);
      setFormTime(item.time);
      setFormTitle(item.title);
      setFormLoc(item.location);
      setFormMapUrl(item.mapUrl || '');
      setFormContent(item.content);
      setFormType(item.type);
      setFormUrl(item.url || '');
    } else {
      setEditingItem(null);
      setFormDayIndex(selectedDayIndex);
      setFormTime('09:00');
      setFormTitle('');
      setFormLoc('');
      setFormMapUrl('');
      setFormContent('');
      setFormType(categories[0]?.id || 'sightseeing');
      setFormUrl('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ItineraryItem = {
      id: editingItem ? editingItem.id : generateId(),
      tripId: trip.id,
      dayIndex: formDayIndex,
      time: formTime,
      title: formTitle,
      location: formLoc,
      mapUrl: formMapUrl,
      content: formContent,
      type: formType,
      url: formUrl
    };

    if (editingItem) dispatch({ type: 'UPDATE_ITEM', payload });
    else dispatch({ type: 'ADD_ITEM', payload });
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
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedDayIndex !== null && draggedDayIndex !== targetIndex) {
        dispatch({ type: 'SWAP_DAYS', payload: { tripId: trip.id, dayIndexA: draggedDayIndex, dayIndexB: targetIndex } });
    }
    setDraggedDayIndex(null);
    setDragOverDayIndex(null);
  };

  const mapEmbedUrl = getEmbedUrl(formMapUrl, formLoc);

  return (
    <div className="h-full flex flex-col bg-white">
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
                selectedDayIndex === index ? 'bg-black text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'
                }`}
            >
                {formatDateLabel(date)}
            </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {currentItems.length === 0 ? (
          <div className="text-center text-gray-400 mt-10"><p>此日目前沒有行程</p></div>
        ) : (
          <div className="relative border-l-2 border-gray-100 ml-4 space-y-8">
            {currentItems.map(item => {
              const cat = getCategory(item.type);
              const CatIcon = getIconComponent(cat.icon);
              const mapLink = item.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`;

              return (
                <div key={item.id} className="ml-6 relative">
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-black border-2 border-white shadow-sm z-10" />
                  <div onClick={() => handleOpenModal(item)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-98 transition-transform cursor-pointer relative">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${cat.color}`}><CatIcon size={10} /> {cat.label}</span>
                        <span className="text-sm font-bold text-gray-400 font-mono">{item.time}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 truncate">{item.title}</h3>
                          {item.location && <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 truncate"><MapPin size={12} /> {item.location}</p>}
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {/* Map Icon (Left) */}
                        <a 
                          href={mapLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors" 
                          onClick={e => e.stopPropagation()}
                        >
                          <MapPin size={18} className="text-gray-600" />
                        </a>
                        {/* Link Icon (Right) */}
                        {item.url && (
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors" 
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink size={18} className="text-blue-500"/>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button onClick={() => handleOpenModal()} className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center z-20"><Plus size={24} /></button>

      <Modal isOpen={isManageDaysOpen} onClose={() => setIsManageDaysOpen(false)} title="管理天數排序">
        <div className="space-y-3">
            <p className="text-xs text-gray-400 mb-2 font-medium">長按並拖曳可重新排序天數與內容</p>
            {tripDates.map((date, index) => {
                const dayItems = state.itinerary
                  .filter(i => i.tripId === trip.id && i.dayIndex === index)
                  .sort((a, b) => a.time.localeCompare(b.time));
                const firstItemTitle = dayItems.length > 0 ? dayItems[0].title : "尚未設定行程";
                const itemCountLabel = dayItems.length > 0 ? ` (+${dayItems.length} 個行程)` : "";

                return (
                    <div key={index} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => handleDragOver(e, index)} onDrop={(e) => handleDrop(e, index)}
                        className={`flex items-center gap-4 p-4 bg-white rounded-xl border transition-all ${dragOverDayIndex === index ? 'border-t-4 border-t-black mt-1' : 'border-gray-100'} ${draggedDayIndex === index ? 'opacity-50' : 'shadow-sm'}`}
                    >
                        <div className="text-gray-300 p-1 shrink-0"><GripVertical size={20} /></div>
                        <div className="flex-1 min-w-0">
                            <span className="block font-bold text-gray-900 text-base">{formatDateLabel(date)}</span>
                            <span className="block text-xs text-gray-400 truncate mt-0.5">{firstItemTitle}{itemCountLabel}</span>
                        </div>
                    </div>
                );
            })}
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? '編輯行程' : '新增行程'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">日期</label>
              <select value={formDayIndex} onChange={e => setFormDayIndex(parseInt(e.target.value))} className="w-full p-4 bg-gray-100 text-gray-900 rounded-xl border-none">
                  {tripDates.map((d, i) => <option key={i} value={i}>{formatDateLabel(d)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">時間</label>
              <input required type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="w-full p-4 bg-gray-100 text-gray-900 rounded-xl border-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">類型</label>
            <select value={formType} onChange={e => setFormType(e.target.value as ItemType)} className="w-full p-4 bg-gray-100 text-gray-900 rounded-xl border-none">
                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">標題</label>
            <input required type="text" placeholder="目的地名稱" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full p-4 bg-gray-100 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">地點 (顯示於卡片)</label>
              <input 
                type="text" 
                placeholder="例如: 東京鐵塔" 
                value={formLoc} 
                onChange={e => setFormLoc(e.target.value)} 
                className="w-full p-4 bg-gray-100 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">GOOGLE MAP 連結</label>
              <div className="relative flex items-center">
                  <input 
                    type="text" 
                    placeholder="帶入 Google Map URL" 
                    value={formMapUrl} 
                    onChange={e => setFormMapUrl(e.target.value)} 
                    className="w-full p-4 bg-gray-100 text-gray-900 rounded-xl border-none pr-12 focus:ring-2 focus:ring-black" 
                  />
                  <MapPin size={18} className="absolute right-4 text-gray-400" />
              </div>
            </div>
          </div>
          
          {/* Map Preview Frame */}
          {mapEmbedUrl && (
            <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50">
               <iframe
                 width="100%"
                 height="100%"
                 frameBorder="0"
                 style={{ border: 0 }}
                 src={mapEmbedUrl}
                 allowFullScreen
               ></iframe>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">內容說明</label>
            <textarea rows={3} placeholder="備註、確認碼等..." value={formContent} onChange={e => setFormContent(e.target.value)} className="w-full p-4 bg-gray-100 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black resize-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">相關連結 (選填)</label>
            <input 
              type="url" 
              placeholder="https://..." 
              value={formUrl} 
              onChange={e => setFormUrl(e.target.value)} 
              className="w-full p-4 bg-gray-100 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" 
            />
          </div>

          <div className="pt-4 flex gap-3">
            {editingItem && (
                !showDeleteConfirm ? (
                    <button type="button" onClick={() => setShowDeleteConfirm(true)} className="p-4 text-red-500 bg-red-50 rounded-xl flex-1 font-bold">刪除</button>
                ) : (
                    <button type="button" onClick={executeDelete} className="p-4 text-white bg-red-500 rounded-xl flex-1 font-bold">確認刪除</button>
                )
            )}
            <button type="submit" className="p-4 bg-black text-white rounded-xl flex-[2] font-bold">儲存</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};