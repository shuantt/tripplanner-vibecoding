import { Expense, Debt, Trip } from './types';
import { 
  MapPin, Utensils, Train, Bed, Info, 
  ShoppingBag, Camera, Music, Ticket, Coffee,
  Landmark, Bus, Plane, Star, Tag
} from 'lucide-react';
import React from 'react';

// --- Icon Mapping ---
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
  'tag': Tag
};

export const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || Tag;
};

// --- Existing Utils ---

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const calculateDebts = (expenses: Expense[], participants: string[]): Debt[] => {
  const balances: { [key: string]: number } = {};
  
  // Initialize balances
  participants.forEach(p => balances[p] = 0);

  expenses.forEach(expense => {
    const payer = expense.payer;
    const amount = expense.amount;

    // Credit the payer
    balances[payer] = (balances[payer] || 0) + amount;

    if (expense.splitType === 'even') {
      const splitAmount = amount / participants.length;
      participants.forEach(p => {
        balances[p] = (balances[p] || 0) - splitAmount;
      });
    } else {
      // Custom split
      Object.entries(expense.customSplits).forEach(([person, owedAmount]) => {
        balances[person] = (balances[person] || 0) - owedAmount;
      });
    }
  });

  // Separate into debtors (negative balance) and creditors (positive balance)
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([name, amount]) => {
    // Round to 2 decimals to avoid floating point errors
    const val = Math.round(amount * 100) / 100;
    if (val < -0.01) debtors.push({ name, amount: val });
    if (val > 0.01) creditors.push({ name, amount: val });
  });

  // Sort by magnitude to minimize transactions (simple greedy approach)
  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts: Debt[] = [];
  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // The amount to settle is the minimum of what debtor owes and creditor is owed
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    debts.push({
      from: debtor.name,
      to: creditor.name,
      amount: Math.round(amount * 100) / 100
    });

    // Adjust balances
    debtor.amount += amount;
    creditor.amount -= amount;

    // Move indices if settled
    if (Math.abs(debtor.amount) < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return debts;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const getTripDates = (startDate: string, days: number): Date[] => {
  const dates: Date[] = [];
  const start = new Date(startDate);
  // Reset time to avoid timezone issues affecting date calculation
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
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day} (${dayOfWeek.replace('週', '')})`;
};

export const formatDateValue = (date: Date): string => {
    return date.toISOString().split('T')[0];
};