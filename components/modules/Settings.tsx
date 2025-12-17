import React, { useState } from 'react';
import { useStore } from '../../StoreContext';
import { AppSettings, Category } from '../../types';
import { generateId, ICON_MAP, getIconComponent } from '../../utils';
import { GripVertical, Trash2, Plus, ChevronDown } from 'lucide-react';

// Available color presets
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Helper to update specific category list
  const updateCategories = (key: keyof AppSettings, newCategories: Category[]) => {
    const newSettings = { ...state.settings, [key]: newCategories };
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  };

  const currentKey: keyof AppSettings = 
    activeTab === 'schedule' ? 'scheduleCategories' : 
    activeTab === 'recs' ? 'recCategories' : 'noteCategories';

  const categories = state.settings[currentKey];

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('index', index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const draggedIndexStr = e.dataTransfer.getData('index');
    if (!draggedIndexStr) return;
    const draggedIndex = parseInt(draggedIndexStr);
    
    if (isNaN(draggedIndex) || draggedIndex === targetIndex) return;

    const newCats = [...categories];
    const [removed] = newCats.splice(draggedIndex, 1);
    newCats.splice(targetIndex, 0, removed);
    updateCategories(currentKey, newCats);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleAdd = () => {
    const newCat: Category = {
      id: generateId(),
      label: '新分類',
      color: COLORS[5].class, // Default Gray
      icon: 'tag' // Default Icon
    };
    updateCategories(currentKey, [...categories, newCat]);
  };

  const handleDelete = (id: string) => {
      updateCategories(currentKey, categories.filter(c => c.id !== id));
      setDeleteConfirmId(null);
  };

  const handleUpdate = (id: string, updates: Partial<Category>) => {
    const newCats = categories.map(c => c.id === id ? { ...c, ...updates } : c);
    updateCategories(currentKey, newCats);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 pb-24">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 pt-2 sticky top-0 z-10">
        <div className="flex gap-4">
           <TabButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} label="行程分類" />
           <TabButton active={activeTab === 'recs'} onClick={() => setActiveTab('recs')} label="推薦分類" />
           <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} label="筆記分類" />
        </div>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {categories.map((cat, index) => (
           <CategoryItem 
              key={cat.id} 
              category={cat} 
              index={index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDeleteRequest={() => setDeleteConfirmId(cat.id)}
              onDeleteConfirm={() => handleDelete(cat.id)}
              onDeleteCancel={() => setDeleteConfirmId(null)}
              isConfirmingDelete={deleteConfirmId === cat.id}
              onUpdate={handleUpdate}
           />
        ))}

        <button 
            onClick={handleAdd}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-medium flex items-center justify-center hover:bg-white hover:border-gray-400 transition-colors"
        >
            <Plus size={18} className="mr-1" /> 新增分類
        </button>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label }: any) => (
    <button 
        onClick={onClick}
        className={`pb-3 text-sm font-bold border-b-2 transition-colors ${active ? 'text-black border-black' : 'text-gray-400 border-transparent'}`}
    >
        {label}
    </button>
);

const CategoryItem = ({ category, index, onDragStart, onDragOver, onDrop, onDeleteRequest, onDeleteConfirm, onDeleteCancel, isConfirmingDelete, onUpdate }: any) => {
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    
    const IconComponent = getIconComponent(category.icon);

    return (
        <div 
            draggable={!isConfirmingDelete}
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, index)}
            className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 relative transition-all"
        >
            {!isConfirmingDelete ? (
                <>
                    <div className="cursor-grab active:cursor-grabbing text-gray-300 p-1">
                        <GripVertical size={20} />
                    </div>

                    {/* Color Picker Trigger */}
                    <div className="relative">
                        <button 
                            onClick={() => { setIsColorPickerOpen(!isColorPickerOpen); setIsIconPickerOpen(false); }}
                            className={`w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${category.color.split(' ')[0]}`}
                        />
                        
                        {isColorPickerOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsColorPickerOpen(false)} />
                                <div className="absolute top-10 left-0 z-50 bg-white p-3 rounded-xl shadow-xl border border-gray-100 grid grid-cols-4 gap-2 w-48">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c.name}
                                            onClick={() => { onUpdate(category.id, { color: c.class }); setIsColorPickerOpen(false); }}
                                            className={`w-8 h-8 rounded-full border border-gray-100 ${c.bg} ${category.color === c.class ? 'ring-2 ring-black ring-offset-1' : ''}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Icon Picker Trigger */}
                    <div className="relative">
                        <button
                            onClick={() => { setIsIconPickerOpen(!isIconPickerOpen); setIsColorPickerOpen(false); }}
                            className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                        >
                            <IconComponent size={16} />
                        </button>

                        {isIconPickerOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsIconPickerOpen(false)} />
                                <div className="absolute top-10 left-0 z-50 bg-white p-3 rounded-xl shadow-xl border border-gray-100 grid grid-cols-5 gap-2 w-56">
                                    {Object.entries(ICON_MAP).map(([name, Icon]) => (
                                        <button 
                                            key={name}
                                            onClick={() => { onUpdate(category.id, { icon: name }); setIsIconPickerOpen(false); }}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 ${category.icon === name ? 'bg-black text-white hover:bg-black' : 'text-gray-600'}`}
                                        >
                                            <Icon size={16} />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <input 
                        type="text" 
                        value={category.label}
                        onChange={(e) => onUpdate(category.id, { label: e.target.value })}
                        className="flex-1 bg-transparent font-medium text-gray-900 border-none focus:ring-0 p-1"
                        placeholder="分類名稱"
                    />

                    <button 
                        type="button"
                        onClick={onDeleteRequest} 
                        className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </>
            ) : (
                <div className="flex items-center justify-between w-full animate-in fade-in zoom-in duration-200">
                    <span className="text-sm font-medium text-red-500 px-2">確定刪除此分類？</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={onDeleteCancel}
                            className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            取消
                        </button>
                        <button 
                            onClick={onDeleteConfirm}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600"
                        >
                            刪除
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};