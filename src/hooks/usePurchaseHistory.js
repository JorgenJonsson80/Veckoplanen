// Hook för att hantera inköpshistorik i localStorage
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'veckoplanen_purchase_history';

export function usePurchaseHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Spara köpt vara: { varunamn: { lastBought, count, cat } }
  const recordPurchase = useCallback((itemName, category) => {
    setHistory(prev => {
      const existing = prev[itemName] || { count: 0 };
      const updated = {
        ...prev,
        [itemName]: {
          lastBought: new Date().toISOString(),
          count: existing.count + 1,
          cat: category,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Ta bort markering (ångra köp)
  const removePurchase = useCallback((itemName) => {
    setHistory(prev => {
      const existing = prev[itemName];
      if (!existing) return prev;
      const updated = {
        ...prev,
        [itemName]: {
          ...existing,
          count: Math.max(0, existing.count - 1),
          lastBought: existing.count <= 1 ? null : existing.lastBought,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Kolla om en vara troligen är slut hemma (hållbarhetstiden passerad)
  const isLikelyEmpty = useCallback((itemName, shelfLifeDays) => {
    const record = history[itemName];
    if (!record || !record.lastBought) return false;
    const daysSince = (Date.now() - new Date(record.lastBought).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > shelfLifeDays;
  }, [history]);

  return { history, recordPurchase, removePurchase, isLikelyEmpty };
}
