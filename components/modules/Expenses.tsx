import React, { useState, useMemo } from 'react';
import { useStore } from '../../StoreContext';
import { Trip, Expense, SplitType } from '../../types';
import { Plus, DollarSign, User, Search, Trash2, ArrowRight, Filter } from 'lucide-react';
import { calculateDebts, generateId } from '../../utils';
import { Modal } from '../ui/Modal';

interface ExpensesProps {
  trip: Trip;
}

export const Expenses: React.FC<ExpensesProps> = ({ trip }) => {
  const { state, dispatch } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [payerFilter, setPayerFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // UI State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState(trip.participants[0]);
  const [splitType, setSplitType] = useState<SplitType>('even');
  const [customSplits, setCustomSplits] = useState<{ [key: string]: number }>({});

  const tripExpenses = state.expenses
    .filter(e => e.tripId === trip.id)
    .sort((a, b) => b.date - a.date);

  const debts = useMemo(() => calculateDebts(tripExpenses, trip.participants), [tripExpenses, trip.participants]);

  const filteredExpenses = tripExpenses.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPayer = payerFilter === 'all' || e.payer === payerFilter;
      return matchesSearch && matchesPayer;
  });

  const handleCustomSplitChange = (person: string, val: string) => {
    setCustomSplits(prev => ({ ...prev, [person]: parseFloat(val) || 0 }));
  };

  const openCreateModal = () => {
      setShowDeleteConfirm(false);
      setEditingExpense(null);
      setTitle('');
      setAmount('');
      setPayer(trip.participants[0]);
      setSplitType('even');
      setCustomSplits({});
      setIsModalOpen(true);
  }

  const openEditModal = (e: Expense) => {
      setShowDeleteConfirm(false);
      setEditingExpense(e);
      setTitle(e.title);
      setAmount(e.amount.toString());
      setPayer(e.payer);
      setSplitType(e.splitType);
      setCustomSplits(e.customSplits);
      setIsModalOpen(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(amount);
    
    // Validation for custom split
    if (splitType === 'custom') {
      const totalSplit = (Object.values(customSplits) as number[]).reduce((a, b) => a + b, 0);
      if (Math.abs(totalSplit - cost) > 0.1) {
        alert(`分帳總額 (${totalSplit}) 必須等於總支出 (${cost})`);
        return;
      }
    }

    const payload: Expense = {
      id: editingExpense ? editingExpense.id : generateId(),
      tripId: trip.id,
      title,
      amount: cost,
      payer,
      splitType,
      customSplits: splitType === 'custom' ? customSplits : {},
      date: editingExpense ? editingExpense.date : Date.now()
    };

    if (editingExpense) {
        dispatch({ type: 'UPDATE_EXPENSE', payload });
    } else {
        dispatch({ type: 'ADD_EXPENSE', payload });
        // Reset Search
        setSearchTerm('');
        setPayerFilter('all');
    }
    
    setIsModalOpen(false);
  };

  const executeDelete = () => {
    if (editingExpense) {
        dispatch({ type: 'DELETE_EXPENSE', payload: editingExpense.id });
        setIsModalOpen(false);
    }
  }

  return (
    <div className="h-full flex flex-col pb-24">
      {/* Debts Summary Dashboard */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
          <DollarSign size={14} /> 結算建議
        </h3>
        
        {debts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-green-600 bg-green-50 rounded-xl">
                <span className="font-bold">🎉 帳款已結清！</span>
                <span className="text-xs opacity-70 mt-1">目前沒有人欠錢</span>
            </div>
        ) : (
            <div className="space-y-3">
              {debts.map((d, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-md">{d.from}</div>
                    <ArrowRight size={14} className="text-gray-400" />
                    <div className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-md">{d.to}</div>
                  </div>
                  <span className="font-mono font-bold text-gray-900">${d.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="px-4 mb-4 mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜尋帳款..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-black transition-colors"
          />
        </div>
        <select 
            value={payerFilter}
            onChange={e => setPayerFilter(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 rounded-xl px-3 text-sm focus:border-black focus:ring-0"
        >
            <option value="all">所有人</option>
            {trip.participants.map(p => (
                <option key={p} value={p}>{p}</option>
            ))}
        </select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {filteredExpenses.map(expense => (
          <div key={expense.id} onClick={() => openEditModal(expense)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group cursor-pointer active:scale-98 transition-transform">
            <div>
              <h4 className="font-bold text-gray-900">{expense.title}</h4>
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-medium text-gray-700">{expense.payer}</span> 支付
                <span className="mx-1">•</span>
                {expense.splitType === 'even' ? '平均分攤' : '自訂分攤'}
              </p>
            </div>
            <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-lg text-gray-900">${expense.amount.toFixed(2)}</span>
            </div>
          </div>
        ))}
        {filteredExpenses.length === 0 && (
            <div className="text-center text-gray-400 mt-8">找不到帳款紀錄</div>
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={openCreateModal}
        className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
      >
        <Plus size={24} />
      </button>

      {/* Add Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? "編輯帳款" : "新增帳款"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">項目名稱</label>
            <input required type="text" placeholder="晚餐、計程車費..." value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">金額</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-7 p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">付款人</label>
              <select value={payer} onChange={e => setPayer(e.target.value)} className="w-full p-3 bg-gray-50 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-black">
                {trip.participants.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">分帳方式</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button type="button" onClick={() => setSplitType('even')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${splitType === 'even' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>平分</button>
              <button type="button" onClick={() => setSplitType('custom')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${splitType === 'custom' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>自訂</button>
            </div>
          </div>

          {splitType === 'custom' && (
            <div className="space-y-2 bg-gray-50 p-3 rounded-xl">
              <p className="text-xs text-gray-500 mb-2">誰應該付多少？ (總和必須等於總金額)</p>
              {trip.participants.map(p => (
                <div key={p} className="flex items-center gap-2">
                  <span className="text-sm w-20 truncate text-gray-700">{p}</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={customSplits[p] || ''}
                    onChange={e => handleCustomSplitChange(p, e.target.value)}
                    className="flex-1 p-2 bg-white text-gray-900 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex gap-3">
             {editingExpense && (
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