import React, { useState } from 'react';
import { useStore } from '../../StoreContext';
import { AppSettings, Category } from '../../types';
import { generateId, ICON_MAP, getIconComponent } from '../../utils';
import { Trash2, Plus, GripVertical } from 'lucide-react';

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

export const SettingsModule: React.FC = () => {
  const { state, dispatch } = useStore();
  const [activeTab, setActiveTab] = useState<'schedule' | 'recs' | 'notes'>('schedule');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const currentKey: keyof AppSettings = 
    activeTab === 'schedule' ? 'scheduleCategories' : 
    activeTab === 'recs' ? 'recCategories' : 'noteCategories';

  const categories = state.settings[currentKey];

  const updateCategories = (newCategories: Category[]) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { ...state.settings, [currentKey]: newCategories } });
  };

  const handleAdd = () => {
    const newCat: Category = { id: generateId(), label: '新分類', color: COLORS[5].class, icon: 'tag' };
    updateCategories([...categories, newCat]);
  };

  const handleUpdate = (id: string, updates: Partial<Category>) => {
    updateCategories(categories.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === id) return;
    setDragOverId(id);
  };
  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const idx = categories.findIndex(c => c.id === draggedId);
    const tIdx = categories.findIndex(c => c.id === targetId);
    const newCats = [...categories];
    const [removed] = newCats.splice(idx, 1);
    newCats.splice(tIdx, 0, removed);
    updateCategories(newCats);
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-2 sticky top-0 z-10 flex gap-4 shrink-0 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} label="行程分類" />
        <TabButton active={activeTab === 'recs'} onClick={() => setActiveTab('recs')} label="推薦分類" />
        <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} label="筆記分類" />
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {categories.map((cat) => (
           <CategoryItem 
              key={cat.id} 
              category={cat} 
              onUpdate={handleUpdate}
              onDelete={() => updateCategories(categories.filter(c => c.id !== cat.id))}
              onDragStart={() => handleDragStart(cat.id)}
              onDragOver={(e) => handleDragOver(e, cat.id)}
              onDrop={() => handleDrop(cat.id)}
              isDragging={draggedId === cat.id}
              isDragOver={dragOverId === cat.id}
           />
        ))}
        <button onClick={handleAdd} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold flex items-center justify-center hover:bg-white hover:text-black hover:border-black transition-all">
            <Plus size={18} className="mr-1" /> 新增分類
        </button>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label }: any) => (
    <button onClick={onClick} className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${active ? 'text-black border-black' : 'text-gray-400 border-transparent'}`}>{label}</button>
);

const CategoryItem = ({ category, onUpdate, onDelete, onDragStart, onDragOver, onDrop, isDragging, isDragOver }: any) => {
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const IconComp = getIconComponent(category.icon);

    return (
        <div 
            draggable 
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={`bg-white p-3 rounded-2xl border flex items-center gap-3 transition-all relative ${isDragOver ? 'border-t-4 border-t-black mt-2' : 'border-gray-100'} ${isDragging ? 'opacity-40' : 'shadow-sm'}`}
        >
            <div className="text-gray-300 cursor-grab active:cursor-grabbing p-1 -ml-1 shrink-0"><GripVertical size={20}/></div>
            
            {/* Color Picker Container */}
            <div className="relative shrink-0">
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsColorPickerOpen(!isColorPickerOpen); 
                    setIsIconPickerOpen(false); 
                  }} 
                  className={`w-8 h-8 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100 ${category.color.split(' ')[0]}`} 
                />
                {isColorPickerOpen && (
                    <div className="absolute top-10 left-0 z-[100]">
                        <div className="fixed inset-0 bg-transparent" onClick={(e) => { e.stopPropagation(); setIsColorPickerOpen(false); }} />
                        <div className="relative bg-white p-3 rounded-xl shadow-2xl border border-gray-100 grid grid-cols-4 gap-2 w-44 animate-in fade-in zoom-in duration-100">
                            {COLORS.map(c => (
                              <button 
                                key={c.name} 
                                type="button"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onUpdate(category.id, { color: c.class }); 
                                    setIsColorPickerOpen(false); 
                                }} 
                                className={`w-8 h-8 rounded-full ${c.bg} ${category.color === c.class ? 'ring-2 ring-black ring-offset-1' : 'hover:scale-110'}`} 
                              />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Icon Picker Container */}
            <div className="relative shrink-0">
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsIconPickerOpen(!isIconPickerOpen); 
                    setIsColorPickerOpen(false); 
                  }} 
                  className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <IconComp size={16}/>
                </button>
                {isIconPickerOpen && (
                    <div className="absolute top-10 left-0 z-[100]">
                        <div className="fixed inset-0 bg-transparent" onClick={(e) => { e.stopPropagation(); setIsIconPickerOpen(false); }} />
                        <div className="relative bg-white p-3 rounded-xl shadow-2xl border border-gray-100 grid grid-cols-5 gap-2 w-56 animate-in fade-in zoom-in duration-100">
                            {Object.entries(ICON_MAP).map(([name, Icon]) => (
                              <button 
                                key={name} 
                                type="button"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onUpdate(category.id, { icon: name }); 
                                    setIsIconPickerOpen(false); 
                                }} 
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${category.icon === name ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}
                              >
                                <Icon size={16}/>
                              </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <input 
                type="text" 
                value={category.label} 
                onChange={(e) => onUpdate(category.id, { label: e.target.value })} 
                className="flex-1 min-w-0 bg-transparent font-bold text-gray-900 border-none focus:ring-0 p-0 text-sm" 
            />

            {!confirmDelete ? (
                <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} className="text-gray-300 hover:text-red-500 p-2 shrink-0 transition-colors"><Trash2 size={18}/></button>
            ) : (
                <div className="flex gap-1 shrink-0 animate-in fade-in slide-in-from-right-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }} className="text-[10px] bg-gray-100 px-2.5 py-1 rounded-lg font-bold text-gray-500">取消</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[10px] bg-red-500 text-white px-2.5 py-1 rounded-lg font-bold shadow-sm">刪除</button>
                </div>
            )}
        </div>
    );
};