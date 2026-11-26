import { create } from "zustand";
import type { Game, Country, Territory, Order, Transaction, GameTurn, Notification } from "@/types";

interface GameState {
  currentGame: Game | null;
  countries: Country[];
  territories: Territory[];
  orders: Order[];
  transactions: Transaction[];
  turns: GameTurn[];
  notifications: Notification[];
  selectedTerritory: Territory | null;
  selectedCountry: Country | null;
  setCurrentGame: (game: Game | null) => void;
  setCountries: (countries: Country[]) => void;
  setTerritories: (territories: Territory[]) => void;
  setOrders: (orders: Order[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setTurns: (turns: GameTurn[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setSelectedTerritory: (t: Territory | null) => void;
  setSelectedCountry: (c: Country | null) => void;
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentGame: null,
  countries: [],
  territories: [],
  orders: [],
  transactions: [],
  turns: [],
  notifications: [],
  selectedTerritory: null,
  selectedCountry: null,
  setCurrentGame: (g) => set({ currentGame: g }),
  setCountries: (c) => set({ countries: c }),
  setTerritories: (t) => set({ territories: t }),
  setOrders: (o) => set({ orders: o }),
  setTransactions: (t) => set({ transactions: t }),
  setTurns: (t) => set({ turns: t }),
  setNotifications: (n) => set({ notifications: n }),
  setSelectedTerritory: (t) => set({ selectedTerritory: t }),
  setSelectedCountry: (c) => set({ selectedCountry: c }),
  addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications] })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
    })),
}));
