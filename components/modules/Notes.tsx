import React, { useState } from 'react';
import { useStore } from '../../StoreContext';
import { Trip, Note, NoteType } from '../../types';
import { Plus, Image as ImageIcon, Trash2, X, Link, GripVertical, Search, ExternalLink } from 'lucide-react';
import { generateId, fileToBase64, getIconComponent } from '../../utils';
import { Modal } from '../ui/Modal';

interface NotesProps {
  trip: Trip;
}

export const Notes: React.FC<NotesProps> = ({ trip }) => {
  const { state, dispatch } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const categories = state.settings.noteCategories;

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<NoteType | 'all'>('all');
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoteType>(categories[0]?.id || 'general');
  const [url, setUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Drag State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const notes = state.notes
    .filter(n => n.tripId === trip.id)
    .sort((a, b) => a.order - b.order)
    .filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || n.type === filterType;
        return matchesSearch && matchesType;
    });

  const getCategory = (id: string) => categories.find(c => c.id === id) || { label: '未分類', color: 'bg-gray-100 text-gray-500', icon: 'tag' };

  const handleOpenCreate = () => {
    setShowDeleteConfirm(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
    setType(categories[0]?.id || 'general');
    setUrl('');
    setImages([]);
    setIsModalOpen(true);
  }

  const handleOpenDetail = (note: Note) => {
    setShowDeleteConfirm(false);
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setType(note.type);
    setUrl(note.url || '');
    setImages(note.images);
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
    const payload: Note = {
      id: editingNote ? editingNote.id : generateId(),
      tripId: trip.id,
      title,
      content,
      type,
      url: url || undefined,
      images,
      order: editingNote ? editingNote.order : state.notes.length
    };

    if (editingNote) {
        dispatch({ type: 'UPDATE_NOTE', payload });
    } else {
        dispatch({ type: 'ADD_NOTE', payload });
        // Reset Search
        setSearchTerm('');
        setFilterType('all');
    }
    setIsModalOpen(false);
  };

  const executeDelete = () => {
    if (editingNote) {
        dispatch({ type: 'DELETE_NOTE', payload: editingNote.id });
        setIsModalOpen(false);
    }
  }

  const handleReorder = (id: string, direction: 'up' | 'down') => {
    dispatch({ type: 'REORDER_NOTE', payload: { id, direction } });
  };
  
  // Basic DnD
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
      const isMovingDown = notes.findIndex(n => n.id === draggedId) < notes.findIndex(n => n.id === targetId);
      handleReorder(draggedId, isMovingDown ? 'down' : 'up');
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
                placeholder="搜尋筆記..." 
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

      <div className="p-4 space-y-2 overflow-y-auto">
        {notes.map((note, index) => {
          const cat = getCategory(note.type);
          const CatIcon = getIconComponent(cat.icon);
          return (
          <div 
            key={note.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, note.id)}
            onDragOver={(e) => handleDragOver(e, note.id)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, note.id)}
            onClick={() => handleOpenDetail(note)}
            className={`bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between cursor-pointer active:scale-98 transition-all ${
                dragOverId === note.id ? 'border-t-4 border-t-gray-400 mt-1' : 'border-gray-100'
            } ${draggedId === note.id ? 'opacity-40' : 'opacity-100'}`}
          >
            <div className="flex items-center gap-3">
                <div 
                    className="text-gray-300 cursor-grab active:cursor-grabbing p-1 -ml-2"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <GripVertical size={20} />
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ${cat.color}`}>
                    <CatIcon size={10} />
                    {cat.label}
                </span>
                <h4 className="font-bold text-gray-900">{note.title}</h4>
            </div>
            
            <div className="flex items-center gap-2 pl-3">
                {note.images && note.images.length > 0 && (
                     <ImageIcon size={18} className="text-gray-400" />
                )}
                {note.url && (
                    <a 
                        href={note.url} 
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
        
        {notes.length === 0 && <div className="text-center text-gray-400 mt-10">尚無筆記</div>}
      </div>

      <button 
        onClick={handleOpenCreate}
        className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
      >
        <Plus size={24} />
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingNote ? "編輯筆記" : "新增筆記"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">標題</label>
            <input required type="text" placeholder="例如：WiFi 密碼" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
          </div>

          <div>
             <label className="block text-xs font-medium text-gray-500 mb-1">分類</label>
             <select value={type} onChange={e => setType(e.target.value as NoteType)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black">
                 {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
             </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">連結 (選填)</label>
            <input type="url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">內容</label>
            <textarea rows={6} value={content} onChange={e => setContent(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
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
             {editingNote && (
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