import { useEffect, useState } from "react";
import api from "@/api/api";
import { useGameStore } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Users, Plus, Lock, Check, X, Mail, Send } from "lucide-react";

interface Treaty {
  id: number;
  game_id: number;
  title: string;
  type: string;
  country_a_id: number;
  country_b_id: number;
  status: string;
  is_secret: boolean;
  terms?: string;
  created_at: string;
}

interface DiplomaticRelation {
  id: number;
  game_id: number;
  country_a_id: number;
  country_b_id: number;
  relation_score: number;
  status: string;
}

interface DiplomaticMessage {
  id: number;
  game_id: number;
  sender_user_id: number;
  recipient_user_id?: number;
  recipient_country_id?: number;
  subject?: string;
  body: string;
  is_secret: boolean;
  is_read: boolean;
  created_at: string;
}

export default function DiplomacyPage() {
  const { currentGame, countries, setCountries } = useGameStore();
  const { user } = useAuthStore();
  const isGM = user?.role === "gm" || user?.role === "admin";

  const [treaties, setTreaties] = useState<Treaty[]>([]);
  const [relations, setRelations] = useState<DiplomaticRelation[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("alliance");
  const [countryA, setCountryA] = useState<number>(0);
  const [countryB, setCountryB] = useState<number>(0);
  const [isSecret, setIsSecret] = useState(false);
  const [terms, setTerms] = useState("");
  const [error, setError] = useState("");

  const [relA, setRelA] = useState<number>(0);
  const [relB, setRelB] = useState<number>(0);
  const [relScore, setRelScore] = useState<number>(0);
  const [relStatus, setRelStatus] = useState("neutral");

  const [messages, setMessages] = useState<DiplomaticMessage[]>([]);
  const [msgCountryId, setMsgCountryId] = useState<number>(0);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgSecret, setMsgSecret] = useState(true);

  const loadData = async () => {
    if (!currentGame) return;
    setLoading(true);
    try {
      const [tRes, rRes, cRes, mRes] = await Promise.all([
        api.get(`/diplomacy/games/${currentGame.id}/treaties`),
        api.get(`/diplomacy/games/${currentGame.id}/relations`),
        countries.length === 0 ? api.get(`/countries/games/${currentGame.id}`) : Promise.resolve({ data: countries }),
        api.get(`/messages/games/${currentGame.id}`).catch(() => ({ data: [] })),
      ]);
      setTreaties(tRes.data);
      setRelations(rRes.data);
      setMessages(mRes.data || []);
      if (countries.length === 0) setCountries(cRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentGame?.id]);

  useEffect(() => {
    if (countries.length >= 2 && countryA === 0 && countryB === 0) {
      setCountryA(countries[0].id);
      setCountryB(countries[1].id);
      setRelA(countries[0].id);
      setRelB(countries[1].id);
      setMsgCountryId((prev) => prev || countries[0].id);
    }
  }, [countries]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGame || !msgBody.trim()) return;
    setError("");
    try {
      await api.post("/messages/", {
        game_id: currentGame.id,
        recipient_country_id: msgCountryId || undefined,
        subject: msgSubject.trim() || undefined,
        body: msgBody.trim(),
        is_secret: msgSecret,
      });
      setMsgSubject("");
      setMsgBody("");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось отправить сообщение");
    }
  };

  const countryName = (id: number) => countries.find((c) => c.id === id)?.name || `#${id}`;

  const handleCreateTreaty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGame) return;
    setError("");
    try {
      await api.post("/diplomacy/treaties", {
        game_id: currentGame.id,
        title,
        type,
        country_a_id: countryA,
        country_b_id: countryB,
        is_secret: isSecret,
        terms,
      });
      setTitle("");
      setTerms("");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось создать договор");
    }
  };

  const handleTreatyStatus = async (treatyId: number, status: string) => {
    try {
      await api.post(`/diplomacy/treaties/${treatyId}/status`, { status });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось обновить статус");
    }
  };

  const handleUpsertRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGame) return;
    try {
      await api.put("/diplomacy/relations", {
        game_id: currentGame.id,
        country_a_id: relA,
        country_b_id: relB,
        relation_score: relScore,
        status: relStatus,
      });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Не удалось обновить отношения");
    }
  };

  if (!currentGame) {
    return <div className="text-text-main/50 text-sm">Выберите или откройте игровую сессию.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-accent" />
        <h1 className="text-2xl font-bold text-text-main">Дипломатия</h1>
      </div>

      {error && (
        <div className="p-3 rounded bg-error/10 border border-error/30 text-error text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-5 space-y-4">
          <h2 className="text-sm font-semibold text-accent">Новый договор</h2>
          <form onSubmit={handleCreateTreaty} className="space-y-3">
            <input
              className="input"
              placeholder="Название договора"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <div className="grid grid-cols-3 gap-2">
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="alliance">Союз</option>
                <option value="trade">Торговля</option>
                <option value="non_aggression">Ненападение</option>
                <option value="peace">Мирный договор</option>
              </select>
              <select className="input" value={countryA} onChange={(e) => setCountryA(Number(e.target.value))}>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select className="input" value={countryB} onChange={(e) => setCountryB(Number(e.target.value))}>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <textarea
              className="input min-h-[70px]"
              placeholder="Условия договора..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-text-main/70">
              <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} />
              Секретный договор (виден только участникам и ведущему)
            </label>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Предложить договор
            </button>
          </form>
        </div>

        <div className="panel p-5 space-y-4">
          <h2 className="text-sm font-semibold text-accent">Отношения между государствами</h2>
          {isGM && (
            <form onSubmit={handleUpsertRelation} className="space-y-3 pb-3 border-b border-[#2a3b52]">
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={relA} onChange={(e) => setRelA(Number(e.target.value))}>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select className="input" value={relB} onChange={(e) => setRelB(Number(e.target.value))}>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={-100}
                  max={100}
                  className="input"
                  value={relScore}
                  onChange={(e) => setRelScore(Number(e.target.value))}
                  placeholder="Уровень (-100..100)"
                />
                <select className="input" value={relStatus} onChange={(e) => setRelStatus(e.target.value)}>
                  <option value="ally">Союзники</option>
                  <option value="friendly">Дружественные</option>
                  <option value="neutral">Нейтральные</option>
                  <option value="tense">Напряжённые</option>
                  <option value="war">Война</option>
                </select>
              </div>
              <button type="submit" className="btn-ghost text-xs">Сохранить отношения</button>
            </form>
          )}
          <div className="space-y-2">
            {relations.map((r) => (
              <div key={r.id} className="panel-2 p-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{countryName(r.country_a_id)}</span>
                  <span className="text-text-main/40 mx-2">↔</span>
                  <span className="font-medium">{countryName(r.country_b_id)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={r.relation_score >= 0 ? "text-success" : "text-error"}>
                    {r.relation_score > 0 ? `+${r.relation_score}` : r.relation_score}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-panel border border-[#2a3b52]">{r.status}</span>
                </div>
              </div>
            ))}
            {relations.length === 0 && (
              <div className="text-xs text-text-main/50">Записей об отношениях пока нет.</div>
            )}
          </div>
        </div>
      </div>

      <div className="panel p-5 space-y-3">
        <h2 className="text-sm font-semibold text-accent">Договоры ({treaties.length})</h2>
        {loading && <div className="text-xs text-text-main/50">Загрузка...</div>}
        <div className="space-y-3">
          {treaties.map((t) => (
            <div key={t.id} className="panel-2 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-main">{t.title}</span>
                  {t.is_secret && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-warning/15 text-warning flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Секретно
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded border border-[#2a3b52] text-text-main/70">
                    {t.status}
                  </span>
                </div>
                <div className="text-xs text-text-main/60 mt-1">
                  {countryName(t.country_a_id)} — {countryName(t.country_b_id)} • {t.type}
                </div>
                {t.terms && <div className="text-xs text-text-main/70 mt-1">{t.terms}</div>}
              </div>
              <div className="flex items-center gap-2">
                {t.status === "proposed" && (
                  <>
                    <button
                      onClick={() => handleTreatyStatus(t.id, "active")}
                      className="btn-ghost text-xs text-success flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Принять
                    </button>
                    <button
                      onClick={() => handleTreatyStatus(t.id, "rejected")}
                      className="btn-ghost text-xs text-error flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Отклонить
                    </button>
                  </>
                )}
                {t.status === "active" && (
                  <button
                    onClick={() => handleTreatyStatus(t.id, "terminated")}
                    className="btn-ghost text-xs text-warning"
                  >
                    Расторгнуть
                  </button>
                )}
              </div>
            </div>
          ))}
          {treaties.length === 0 && (
            <div className="text-xs text-text-main/50">Договоров пока нет.</div>
          )}
        </div>
      </div>

      {/* Дипломатические сообщения */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-5 space-y-3">
          <h2 className="text-sm font-semibold text-accent flex items-center gap-2">
            <Mail className="w-4 h-4" /> Отправить дипломатическое сообщение
          </h2>
          <form onSubmit={handleSendMessage} className="space-y-3">
            <select
              className="input text-xs"
              value={msgCountryId}
              onChange={(e) => setMsgCountryId(Number(e.target.value))}
            >
              <option value={0}>Всем участникам (открытая нота)</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>Кому: {c.name}</option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Тема сообщения"
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
            />
            <textarea
              className="input min-h-[80px]"
              placeholder="Текст дипломатической ноты..."
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              required
            />
            <label className="flex items-center gap-2 text-xs text-text-main/70">
              <input type="checkbox" checked={msgSecret} onChange={(e) => setMsgSecret(e.target.checked)} />
              Конфиденциальное сообщение (только получателю и ведущему)
            </label>
            <button type="submit" className="btn-primary flex items-center gap-2 text-xs">
              <Send className="w-3.5 h-3.5" /> Отправить
            </button>
          </form>
        </div>

        <div className="panel p-5 space-y-3">
          <h2 className="text-sm font-semibold text-accent">Дипломатическая почта ({messages.length})</h2>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className="panel-2 p-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-main">
                    {m.subject || "Без темы"}
                  </span>
                  <div className="flex items-center gap-2">
                    {m.is_secret && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Личное
                      </span>
                    )}
                    <span className="text-text-main/40">
                      {new Date(m.created_at).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-text-main/60">
                  {m.recipient_country_id ? `Адресат: ${countryName(m.recipient_country_id)}` : "Открытая нота"}
                </div>
                <div className="text-xs text-text-main/85 whitespace-pre-line">{m.body}</div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-xs text-text-main/50">Сообщений пока нет.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
