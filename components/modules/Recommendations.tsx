import React, { useState } from 'react';
import { useStore } from '../../StoreContext';
import { Trip, Recommendation, RecType } from '../../types';
import { Plus, ExternalLink, Trash2, GripVertical, Search, Image as ImageIcon, X } from 'lucide-react';
import { generateId, fileToBase64, getIconComponent } from '../../utils';
import { Modal } from '../ui/Modal';

interface RecsProps {
  trip: Trip;
}

export const Recommendations: React.FC<RecsProps> = ({ trip }) => {
  const { state, dispatch } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<Recommendation | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const categories = state.settings.recCategories;

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<RecType | 'all'>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<RecType>(categories[0]?.id || 'spot');
  const [url, setUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Drag State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const recs = state.recommendations
    .filter(r => r.tripId === trip.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || r.type === filterType;
        return matchesSearch && matchesType;
    });

  const getCategory = (id: string) => categories.find(c => c.id === id) || { label: '未分類', color: 'bg-gray-100 text-gray-500', icon: 'tag' };

  const openCreateModal = () => {
      setShowDeleteConfirm(false);
      setEditingRec(null);
      setTitle('');
      setContent('');
      setType(categories[0]?.id || 'spot');
      setUrl('');
      setImages([]);
      setIsModalOpen(true);
  }

  const openEditModal = (rec: Recommendation) => {
      setShowDeleteConfirm(false);
      setEditingRec(rec);
      setTitle(rec.title);
      setContent(rec.content);
      setType(rec.type);
      setUrl(rec.url || '');
      setImages(rec.images || []);
      setIsModalOpen(true);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const remainingSlots = 5 - images.length;
      if (remainingSlots <= 0) {
          alert("最多只能上傳 5 張圖片");
          return;
      }

      const files = Array.from(e.target.files).slice(0, remainingSlots);
      if (e.target.files.length > remainingSlots) {
          alert(`只能再上傳 ${remainingSlots} 張圖片，已略過多餘圖片`);
      }

      const newImages: string[] = [];
      for (const file of files) {
          try {
              const base64 = await fileToBase64(file);
              newImages.push(base64);
          } catch (err) {
              console.error(err);
          }
      }
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Recommendation = {
      id: editingRec ? editingRec.id : generateId(),
      tripId: trip.id,
      title,
      content,
      type,
      url: url || undefined,
      images,
      order: editingRec ? editingRec.order : state.recommendations.filter(r => r.tripId === trip.id).length
    };
    
    if(editingRec) {
        dispatch({ type: 'UPDATE_REC', payload });
    } else {
        dispatch({ type: 'ADD_REC', payload });
        // Reset Search
        setSearchTerm('');
        setFilterType('all');
    }
    
    setIsModalOpen(false);
  };

  const executeDelete = () => {
    if (editingRec) {
        dispatch({ type: 'DELETE_REC', payload: editingRec.id });
        setIsModalOpen(false);
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
      setDraggedId(id);
      e.dataTransfer.effectAllowed = "move";
  }
  
  const handleDragOver = (e: React.DragEvent, id: string) => {
      e.preventDefault();
      if (draggedId === id) return;
      setDragOverId(id);
  }
  
  const handleDragEnd = () => {
      setDraggedId(null);
      setDragOverId(null);
  }
  
  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if(!draggedId || draggedId === targetId) {
          handleDragEnd();
          return;
      }
      
      const currentIndex = recs.findIndex(r => r.id === draggedId);
      const targetIndex = recs.findIndex(r => r.id === targetId);
      const isMovingDown = currentIndex < targetIndex;
      
      dispatch({ 
          type: 'REORDER_REC', 
          payload: { id: draggedId, direction: isMovingDown ? 'down' : 'up' } 
      });
      
      handleDragEnd();
  }

  return (
    <div className="h-full flex flex-col pb-24 bg-gray-50">
      
      {/* Search and Filter Bar */}
      <div className="bg-white p-4 border-b border-gray-100 sticky top-0 z-10 flex gap-2">
         <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input 
                type="text" 
                placeholder="搜尋推薦..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl text-sm border-none focus:ring-1 focus:ring-black text-gray-900"
            />
         </div>
         <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value as any)}
            className="bg-gray-50 rounded-xl px-3 text-sm font-medium text-gray-600 focus:ring-1 focus:ring-black border-none"
         >
             <option value="all">全部</option>
             {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
         </select>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto">
        {recs.map((rec, index) => {
          const cat = getCategory(rec.type);
          const CatIcon = getIconComponent(cat.icon);
          
          return (
          <div 
            key={rec.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, rec.id)}
            onDragOver={(e) => handleDragOver(e, rec.id)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, rec.id)}
            onClick={() => openEditModal(rec)}
            className={`bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between cursor-pointer active:scale-98 transition-all ${
                dragOverId === rec.id ? 'border-t-4 border-t-gray-400 mt-1' : 'border-gray-100'
            } ${draggedId === rec.id ? 'opacity-40' : 'opacity-100'}`}
          >
            <div className="flex items-center gap-3 flex-1">
                {/* Drag Handle */}
                <div 
                    className="text-gray-300 cursor-grab active:cursor-grabbing p-1 -ml-2"
                    onMouseDown={(e) => e.stopPropagation()} 
                >
                    <GripVertical size={20} />
                </div>

                <div className="flex flex-col items-start gap-1">
                    <span className={`flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${cat.color}`}>
                        <CatIcon size={10} />
                        {cat.label}
                    </span>
                    <h4 className="font-bold text-gray-900">{rec.title}</h4>
                </div>
            </div>
            
            {/* Icons: Image Left, Link Right */}
            <div className="flex items-center gap-2 pl-3">
                {rec.images && rec.images.length > 0 && (
                     <ImageIcon size={18} className="text-gray-400" />
                )}
                {rec.url && (
                    <a 
                        href={rec.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                    >
                        <ExternalLink size={18} className="text-blue-500" />
                    </a>
                )}
            </div>
          </div>
        )})}
        
        {recs.length === 0 && (
             <div className="text-center text-gray-400 mt-10">沒有符合的推薦</div>
        )}
      </div>

      <button 
        onClick={openCreateModal}
        className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
      >
        <Plus size={24} />
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRec ? "編輯推薦" : "新增推薦"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">標題</label>
            <input required type="text" placeholder="必吃拉麵..." value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">類型</label>
            <select value={type} onChange={e => setType(e.target.value as RecType)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black">
               {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">描述</label>
            <textarea rows={4} placeholder="為什麼推薦？" value={content} onChange={e => setContent(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">連結 (選填)</label>
            <input type="url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">圖片 (最多 5 張)</label>
            {/* Image Preview (Large Mode) */}
            <div className="space-y-4 mb-4">
                {images.map((img, i) => (
                    <div key={i} className="relative w-full rounded-xl overflow-hidden shadow-sm border border-gray-100">
                        <img src={img} alt={`attachment-${i}`} className="w-full h-auto max-h-[400px] object-contain bg-gray-50" />
                        <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
            {images.length < 5 && (
                <label className="w-full h-16 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 font-medium">
                     <ImageIcon size={20} />
                     <span>上傳圖片</span>
                  </div>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
          </div>
          
          <div className="pt-2 flex gap-3">
             {editingRec && (
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
            <button type="submit" className="flex-[2] p-3 bg-black text-white rounded-xl font-bold">
                儲存
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};