import { Expense, Debt, Trip } from './types';
import { 
  MapPin, Utensils, Train, Bed, Info, 
  ShoppingBag, Camera, Music, Ticket, Coffee,
  Landmark, Bus, Plane, Star, Tag, Copy, Share2, GripVertical, ExternalLink, X, Image as ImageIcon
} from 'lucide-react';
import React from 'react';

export const ICON_MAP: Record<string, React.ElementType> = {
  'map-pin': MapPin,
  'utensils': Utensils,
  'train': Train,
  'bed': Bed,
  'info': Info,
  'shopping-bag': ShoppingBag,
  'camera': Camera,
  'music': Music,
  'ticket': Ticket,
  'coffee': Coffee,
  'landmark': Landmark,
  'bus': Bus,
  'plane': Plane,
  'star': Star,
  'tag': Tag,
  'copy': Copy,
  'share': Share2,
  'grip': GripVertical,
  'link': ExternalLink,
  'x': X,
  'image': ImageIcon
};

export const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || Tag;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

// 規則：雙大寫英文-大寫英數混合四碼 (AA-XXXX)
export const generateShortId = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const alphanum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const prefix = Array.from({length: 2}, () => letters.charAt(Math.floor(Math.random() * letters.length))).join('');
    const suffix = Array.from({length: 4}, () => alphanum.charAt(Math.floor(Math.random() * alphanum.length))).join('');
    return `${prefix}-${suffix}`;
};

export const copyToClipboard = async (text: string) => {
    if (!navigator.clipboard) return false;
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        return false;
    }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const calculateDebts = (expenses: Expense[], participants: string[]): Debt[] => {
  const balances: { [key: string]: number } = {};
  participants.forEach(p => balances[p] = 0);

  expenses.forEach(expense => {
    const payer = expense.payer;
    const amount = expense.amount;
    balances[payer] = (balances[payer] || 0) + amount;

    if (expense.splitType === 'even') {
      const splitAmount = amount / participants.length;
      participants.forEach(p => {
        balances[p] = (balances[p] || 0) - splitAmount;
      });
    } else {
      Object.entries(expense.customSplits).forEach(([person, owedAmount]) => {
        balances[person] = (balances[person] || 0) - owedAmount;
      });
    }
  });

  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([name, amount]) => {
    const val = Math.round(amount * 100) / 100;
    if (val < -0.01) debtors.push({ name, amount: val });
    if (val > 0.01) creditors.push({ name, amount: val });
  });

  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts: Debt[] = [];
  let i = 0; let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
    debts.push({ from: debtor.name, to: creditor.name, amount: Math.round(amount * 100) / 100 });
    debtor.amount += amount;
    creditor.amount -= amount;
    if (Math.abs(debtor.amount) < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  return debts;
};

export const getTripDates = (startDate: string, days: number): Date[] => {
  const dates: Date[] = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
};

export const formatDateLabel = (date: Date): string => {
  const dayOfWeek = date.toLocaleDateString('zh-TW', { weekday: 'short' });
  return `${date.getMonth() + 1}/${date.getDate()} (${dayOfWeek.replace('週', '')})`;
};

export const formatDateValue = (date: Date): string => date.toISOString().split('T')[0];