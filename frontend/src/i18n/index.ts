import { create } from "zustand";

export type Locale = "ru" | "en";

const translations = {
  ru: {
    nav_overview: "Обзор",
    nav_map: "Карта",
    nav_countries: "Государства",
    nav_economy: "Экономика",
    nav_orders: "Приказы",
    nav_diplomacy: "Дипломатия",
    nav_conflicts: "Конфликты",
    nav_news: "Новости",
    nav_history: "История",
    nav_gm: "Ведущий",
    role_gm: "Ведущий",
    role_admin: "Админ",
    role_player: "Игрок",
    turn: "Ход",
    notifications: "Уведомления",
    no_notifications: "Нет уведомлений",
    logout: "Выйти",
    profile: "Профиль",
  },
  en: {
    nav_overview: "Overview",
    nav_map: "Map",
    nav_countries: "Countries",
    nav_economy: "Economy",
    nav_orders: "Orders",
    nav_diplomacy: "Diplomacy",
    nav_conflicts: "Conflicts",
    nav_news: "News",
    nav_history: "History",
    nav_gm: "GM Panel",
    role_gm: "GM",
    role_admin: "Admin",
    role_player: "Player",
    turn: "Turn",
    notifications: "Notifications",
    no_notifications: "No notifications",
    logout: "Log out",
    profile: "Profile",
  },
} as const;

export type TranslationKey = keyof typeof translations.ru;

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const initialLocale: Locale =
  (typeof window !== "undefined" && (localStorage.getItem("rolypoly_locale") as Locale)) || "ru";

export const useI18n = create<I18nState>((set, get) => ({
  locale: initialLocale === "en" ? "en" : "ru",
  setLocale: (locale) => {
    localStorage.setItem("rolypoly_locale", locale);
    set({ locale });
  },
  t: (key) => translations[get().locale][key] || translations.ru[key],
}));
