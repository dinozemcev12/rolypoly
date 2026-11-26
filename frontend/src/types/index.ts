export type Role = "admin" | "gm" | "player";

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: Role;
  is_active: boolean;
  is_superuser?: boolean;
  created_at?: string;
}

export interface Game {
  id: number;
  title: string;
  description?: string;
  cover_image_url?: string;
  game_period: string;
  start_year: number;
  max_players: number;
  status: string;
  current_month?: string;
  current_turn_number: number;
  created_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface GameMember {
  id: number;
  game_id: number;
  user_id: number;
  username: string;
  email: string;
  role_in_game: string;
  is_active: boolean;
  joined_at: string;
}

export interface Country {
  id: number;
  game_id: number;
  name: string;
  flag_url?: string;
  color: string;
  capital_territory_id?: number;
  owner_user_id?: number;
  population: number;
  treasury: number;
  gdp: number;
  income: number;
  expenses: number;
  debt: number;
  inflation: number;
  resources?: Record<string, any>;
  political_info?: string;
  history?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Territory {
  id: number;
  game_id: number;
  name: string;
  country_id?: number;
  geometry?: GeoJSON.Geometry | null;
  bounds_normalized?: any;
  population: number;
  resources?: Record<string, any>;
  economic_indicators?: Record<string, any>;
  additional_info?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  game_id: number;
  country_id: number;
  sender_user_id: number;
  title: string;
  category: string;
  description: string;
  target?: string;
  parameters?: Record<string, any>;
  status: string;
  sent_at?: string;
  gm_comment?: string;
  gm_decision_at?: string;
  decided_by_user_id?: number;
  result?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  game_id: number;
  country_id: number;
  amount: number;
  type: "income" | "expense" | "adjustment";
  reason: string;
  date: string;
  status: string;
  created_by_user_id: number;
  confirmed_by_user_id?: number;
  confirmed_at?: string;
  created_at: string;
}

export interface GameTurn {
  id: number;
  game_id: number;
  turn_number: number;
  month_start: string;
  status: string;
  started_at?: string;
  completed_at?: string;
}

export interface HistoryLog {
  id: number;
  game_id: number;
  user_id?: number;
  action_type: string;
  description: string;
  related_object_type?: string;
  related_object_id?: number;
  turn_number?: number;
  log_metadata?: Record<string, any>;
  created_at: string;
}

export interface Event {
  id: number;
  game_id: number;
  title: string;
  text: string;
  event_date: string;
  category: string;
  visibility: string;
  related_country_ids?: number[];
  related_territory_ids?: number[];
  image_url?: string;
  created_by_user_id: number;
  created_at: string;
}

export interface Notification {
  id: number;
  game_id: number;
  user_id: number;
  title: string;
  text: string;
  type: string;
  is_read: boolean;
  read_at?: string;
  link_url?: string;
  created_at: string;
}
