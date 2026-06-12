import { useState, useEffect } from "react";

const ADMIN_PASSWORD = "이영철1234";
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// ── Supabase Auth 헬퍼
const auth = {
  async signUp(email, password, nickname) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.message || "회원가입 실패");
    // 프로필(닉네임) 저장
    if (data.user?.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${data.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: data.user.id, nickname })
      });
    }
    return data;
  },
  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.error_description || "로그인 실패");
    return data;
  },
  async getProfile(userId, token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    return data[0] || null;
  }
};

// ── Supabase DB 헬퍼
const api = {
  async getAllQuestions() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/questions?order=created_at.asc`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch(e) { return []; }
  },
  async addQuestion(subject, partName, chapterName, text, answer, type) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/questions`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json", "Prefer": "return=representation"
      },
      body: JSON.stringify({ subject, part_name: partName, chapter_name: chapterName, question_text: text, answer, question_type: type })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },
  async deleteQuestion(id) {
    await fetch(`${SUPABASE_URL}/rest/v1/questions?id=eq.${id}`, {
      method: "DELETE",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
  },
  async getWrongAnswers(userId, token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/wrong_answers?user_id=eq.${userId}&select=question_id`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(r => Number(r.question_id));
  },
  async addWrongAnswer(userId, questionId, token) {
    await fetch(`${SUPABASE_URL}/rest/v1/wrong_answers`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json", "Prefer": "resolution=ignore-duplicates"
      },
      body: JSON.stringify({ user_id: userId, question_id: questionId })
    });
  },
  async removeWrongAnswer(userId, questionId, token) {
    await fetch(`${SUPABASE_URL}/rest/v1/wrong_answers?user_id=eq.${userId}&question_id=eq.${questionId}`, {
      method: "DELETE",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
    });
  }
};

const partsBySubject = {
  "소방학": [
    {
      name: "Part 1. 연소론 및 화재론", total: 0, done: 0, weak: 0,
      chapters: [
        "Chapter 1. 연소 관련 기초이론","Chapter 2. 연소개론","Chapter 3. 연소의 과정과 특성",
        "Chapter 4. 연소의 형태","Chapter 5. 자연발화","Chapter 6. 폭발",
        "Chapter 7. 유류저장탱크 화재 시 이상 현상","Chapter 8. 연소생성물","Chapter 9. 화재론",
        "Chapter 10. 화재소화","Chapter 11. 건축물 화재의 성상","Chapter 12. 기타연소","Chapter 13. 건축방화계획",
      ]
    },
    { name: "Part 2. 소화약제", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 소화약제의 개설",
      "Chapter 2. 물소화약제",
      "Chapter 3. 강화액소화약제",
      "Chapter 4. 산 알칼리소화약제",
      "Chapter 5. 포소화약제",
      "Chapter 6. 이산화탄소소화약제",
      "Chapter 7. 할론소화약제",
      "Chapter 8. 할로겐화합물 및 불활성기체 소화약제",
      "Chapter 9. 분말소화약제",
    ] },
    { name: "Part 3. 위험물의 종류별 특성과 소화방법", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 제1류 위험물(산화성 고체)",
      "Chapter 2. 제2류 위험물(가연성 고체)",
      "Chapter 3. 제3류 위험물(금수성 및 자연발화성 물질)",
      "Chapter 4. 제4류 위험물(인화성 액체)",
      "Chapter 5. 제5류 위험물(자기반응성 물질)",
      "Chapter 6. 제6류 위험물(산화성 액체)",
    ] },
    { name: "Part 4. 화재조사", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 화재조사의 개설",
      "Chapter 2. 소방의 화재조사에 관한 법률",
      "Chapter 3. 화재조사 및 보고규정상의 화재조사",
    ] },
    { name: "Part 5. 재난 및 안전관리 기본법", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 재난관리 이론",
      "Chapter 2. 재난 및 안전관리 기본법의 개설",
      "Chapter 3. 안전관리기구 및 기능",
      "Chapter 4. 안전관리계획",
      "Chapter 5. 재난의 예방",
      "Chapter 6. 재난의 대비",
      "Chapter 7. 재난의 대응",
      "Chapter 8. 재난의 복구",
      "Chapter 9. 안전문화 진흥",
      "Chapter 10. 보칙",
      "Chapter 11. 벌칙",
    ] },
    { name: "Part 6. 소방시설", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 소방시설의 개설",
      "Chapter 2. 소화설비",
      "Chapter 3. 경보설비",
      "Chapter 4. 피난구조설비",
      "Chapter 5. 소화활동설비",
      "Chapter 6. 소화용수설비",
    ] },
    { name: "Part 7. 소방조직 및 역사", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 한국소방의 역사 및 소방조직",
      "Chapter 2. 국가공무원법",
      "Chapter 3. 소방공무원법",
    ] },
    { name: "Part 8. 구조 및 구급", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 119구조 구급에 관한 법률",
      "Chapter 2. 응급의료에 관한 법률",
    ] },
  ],
  "관계법규": [
    { name: "Part 1. 소방기본법", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 총칙",
      "Chapter 2. 소방장비 및 소방용수시설등",
      "Chapter 3. 화재의 예방과 경계",
      "Chapter 4. 소방활동 등",
      "Chapter 5. 화재의 조사",
      "Chapter 6. 구조 및 구급",
      "Chapter 7. 의용소방대",
      "Chapter 7-2. 소방산업의 육성 진흥 및 지원 등",
      "Chapter 8. 한국소방안전원",
      "Chapter 9. 보칙",
      "Chapter 10. 벌칙",
    ] },
    { name: "Part 2. 소방시설 설치 및 관리에 관한 법률", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 총칙",
      "Chapter 2. 소방시설등의 설치 관리 및 방염 (1절: 건축허가등의 동의 등)",
      "Chapter 2. 소방시설등의 설치 관리 및 방염 (2절: 특정소방대상물에 설치하는 소방시설의 관리 등)",
      "Chapter 3. 소방시설등의 자체점검",
      "Chapter 4. 소방시설관리사 및 소방시설관리업 (1절: 소방시설관리사)",
      "Chapter 4. 소방시설관리사 및 소방시설관리업 (2절: 소방시설관리업)",
      "Chapter 5. 소방용품의 품질관리",
      "Chapter 6. 보칙",
      "Chapter 7. 벌칙",
    ] },
    { name: "Part 3. 화재의 예방 및 안전관리에 관한 법률", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 총칙",
      "Chapter 2. 화재의 예방 및 안전관리 기본계획의 수립 시행",
      "Chapter 3. 화재안전조사",
      "Chapter 4. 화재의 예방조치 등",
      "Chapter 5. 소방대상물의 소방안전관리",
      "Chapter 6. 특별관리시설물의 소방안전관리",
      "Chapter 7. 보칙",
      "Chapter 8. 벌칙",
    ] },
    { name: "Part 4. 소방시설공사업법", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 총칙",
      "Chapter 2. 소방시설업",
      "Chapter 3. 소방시설공사 등 (1절: 설계)",
      "Chapter 3. 소방시설공사 등 (2절: 시공)",
      "Chapter 3. 소방시설공사 등 (3절: 감리)",
      "Chapter 3. 소방시설공사 등 (3절의2: 방염)",
      "Chapter 3. 소방시설공사 등 (4절: 도급)",
      "Chapter 4. 소방기술자",
      "Chapter 5. 소방시설업자협회",
      "Chapter 6. 보칙",
      "Chapter 7. 벌칙",
    ] },
    { name: "Part 5. 위험물안전관리법", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 총칙",
      "Chapter 2. 위험물시설의 설치 및 변경",
      "Chapter 3. 위험물시설의 안전관리",
      "Chapter 4. 위험물 운반 등",
      "Chapter 5. 감독 및 조치명령",
      "Chapter 6. 보칙",
      "Chapter 7. 벌칙",
      "Chapter 8. 시행규칙 별표 4 ~ 별표 25",
    ] },
    { name: "Part 6. 소방의 화재조사에 관한 법률", total: 0, done: 0, weak: 0, chapters: [
      "Chapter 1. 목적",
      "Chapter 2. 화재조사의 실시 등",
      "Chapter 3. 화재조사 결과의 공표 등",
      "Chapter 4. 화재조사 기반구축",
      "Chapter 5. 벌칙",
    ] },
  ],
};

const leaderboard = [
  { rank: 1, name: "박수진", progress: 94, badge: "🥇" },
  { rank: 2, name: "김태호", progress: 87, badge: "🥈" },
  { rank: 3, name: "이민정", progress: 81, badge: "🥉" },
];

const typeColors = { "기출": "#FF4444", "기본서": "#FF8C00", "시그니처": "#CC0022" };

export default function App() {
  // 로그인 상태
  const [session, setSession] = useState(null); // { access_token, user }
  const [nickname, setNickname] = useState("");
  const [authScreen, setAuthScreen] = useState("login"); // "login" | "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authNickname, setAuthNickname] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [subject, setSubject] = useState(null);
  const [tab, setTab] = useState("home");
  const [expandedPart, setExpandedPart] = useState(null);
  const [showLeader, setShowLeader] = useState(true);
  const [wrongAnswerIds, setWrongAnswerIds] = useState([]); // 개인 오답 id 목록

  // 챕터 퀴즈 상태
  const [quizScreen, setQuizScreen] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });

  // 관리자 상태
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState("");
  const [adminError, setAdminError] = useState("");

  // 문제 입력 상태 (관리자)
  const [adminScreen, setAdminScreen] = useState(null);
  const [newQText, setNewQText] = useState("");
  const [newQAnswer, setNewQAnswer] = useState(true);
  const [newQType, setNewQType] = useState("기출");
  const [allQuestions, setAllQuestions] = useState({});
  const [loadingQ, setLoadingQ] = useState(false);
  const [saving, setSaving] = useState(false);

  // Supabase에서 전체 문제 불러오기
  useEffect(() => {
    async function loadAll() {
      setLoadingQ(true);
      const rows = await api.getAllQuestions();
      const grouped = {};
      for (const r of rows) {
        const k = `${r.subject}|${r.part_name}|${r.chapter_name}`;
        if (!grouped[k]) grouped[k] = [];
        grouped[k].push({
          id: r.id,
          text: r.question_text,
          answer: r.answer,
          type: r.question_type,
        });
      }
      setAllQuestions(grouped);
      setLoadingQ(false);
    }
    loadAll();
  }, []);

  function getQuestions(subject, partName, chapterName) {
    const k = `${subject}|${partName}|${chapterName}`;
    return allQuestions[k] || [];
  }

  async function saveQuestion() {
    if (!newQText.trim()) return;
    setSaving(true);
    try {
      const rows = await api.addQuestion(
        subject, adminScreen.partName, adminScreen.chapterName,
        newQText.trim(), newQAnswer, newQType
      );
      const newQ = { id: rows[0].id, text: rows[0].question_text, answer: rows[0].answer, type: rows[0].question_type };
      const k = `${subject}|${adminScreen.partName}|${adminScreen.chapterName}`;
      setAllQuestions(prev => ({ ...prev, [k]: [...(prev[k] || []), newQ] }));
      setNewQText("");
      setNewQAnswer(true);
      setNewQType("기출");
    } catch(e) {
      alert("저장 실패: " + e.message);
    }
    setSaving(false);
  }

  async function deleteQuestion(qId) {
    await api.deleteQuestion(qId);
    const k = `${subject}|${adminScreen.partName}|${adminScreen.chapterName}`;
    setAllQuestions(prev => ({ ...prev, [k]: (prev[k] || []).filter(q => q.id !== qId) }));
  }

  // 로그인 세션 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hakyuk_session");
      if (saved) {
        const s = JSON.parse(saved);
        if (s && s.user && s.user.id && s.access_token) {
          setSession(s);
          setNickname(s.nickname || "");
          api.getWrongAnswers(s.user.id, s.access_token).then(ids => setWrongAnswerIds(ids));
        } else {
          localStorage.removeItem("hakyuk_session");
        }
      }
    } catch(e) {
      localStorage.removeItem("hakyuk_session");
    }
  }, []);

  async function handleSignUp() {
    if (!authEmail || !authPassword || !authNickname) { setAuthError("모든 항목을 입력해주세요"); return; }
    if (authPassword.length < 6) { setAuthError("비밀번호는 6자 이상이어야 해요"); return; }
    setAuthLoading(true); setAuthError("");
    try {
      const data = await auth.signUp(authEmail, authPassword, authNickname);
      const s = { ...data, nickname: authNickname };
      localStorage.setItem("hakyuk_session", JSON.stringify(s));
      setSession(s); setNickname(authNickname);
    } catch(e) { setAuthError(e.message); }
    setAuthLoading(false);
  }

  async function handleSignIn() {
    if (!authEmail || !authPassword) { setAuthError("이메일과 비밀번호를 입력해주세요"); return; }
    setAuthLoading(true); setAuthError("");
    try {
      const data = await auth.signIn(authEmail, authPassword);
      const profile = await auth.getProfile(data.user.id, data.access_token);
      const s = { ...data, nickname: profile?.nickname || "수험생" };
      localStorage.setItem("hakyuk_session", JSON.stringify(s));
      setSession(s); setNickname(s.nickname);
      const ids = await api.getWrongAnswers(data.user.id, data.access_token);
      setWrongAnswerIds(ids);
    } catch(e) { setAuthError(e.message); }
    setAuthLoading(false);
  }

  function handleSignOut() {
    localStorage.removeItem("hakyuk_session");
    setSession(null); setNickname(""); setSubject(null);
    setWrongAnswerIds([]); setIsAdmin(false);
  }

  async function toggleWeak(questionId) {
    if (!session) return;
    const id = Number(questionId);
    if (wrongAnswerIds.includes(id)) {
      await api.removeWrongAnswer(session.user.id, id, session.access_token);
      setWrongAnswerIds(prev => prev.filter(x => x !== id));
    } else {
      await api.addWrongAnswer(session.user.id, id, session.access_token);
      setWrongAnswerIds(prev => [...prev, id]);
    }
  }

  function startChapterQuiz(partName, chapterName) {
    const qs = getQuestions(subject, partName, chapterName);
    if (qs.length === 0) { alert("아직 등록된 문제가 없어요!"); return; }
    setQuizScreen({ partName, chapterName, questions: qs });
    setQIndex(0); setUserAnswer(null); setShowResult(false);
    setScore({ correct: 0, wrong: 0 });
  }

  function handleAnswer(ans) {
    setUserAnswer(ans);
    setShowResult(true);
    const q = quizScreen.questions[qIndex];
    if (ans === q.answer) setScore(s => ({ ...s, correct: s.correct + 1 }));
    else setScore(s => ({ ...s, wrong: s.wrong + 1 }));
  }

  function nextQ() {
    if (qIndex + 1 >= quizScreen.questions.length) {
      setQuizScreen(prev => ({ ...prev, finished: true }));
      return;
    }
    setQIndex(i => i + 1);
    setUserAnswer(null);
    setShowResult(false);
  }

  function tryAdminLogin() {
    if (adminPwInput === ADMIN_PASSWORD) {
      setIsAdmin(true); setShowAdminLogin(false); setAdminError(""); setAdminPwInput("");
    } else {
      setAdminError("비밀번호가 틀렸습니다");
    }
  }

  const parts = partsBySubject[subject] || partsBySubject["소방학"];
  const accentColor = subject === "관계법규" ? "#0077CC" : "#CC0022";
  const accentLight = subject === "관계법규" ? "#66AAFF" : "#FF4444";

  // ── 로그인/회원가입 화면
  if (!session) return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0",
      fontFamily: "'Noto Sans KR', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", maxWidth: 420, margin: "0 auto", padding: "0 24px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&display=swap" rel="stylesheet" />
      {/* 로고 */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{
          width: 68, height: 68, borderRadius: 18, margin: "0 auto 14px",
          background: "linear-gradient(135deg, #CC0022, #FF4444)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 34, boxShadow: "0 8px 30px rgba(204,0,34,0.4)"
        }}>🔥</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>합격은 이영철</div>
        <div style={{ fontSize: 11, color: "#FF6666", marginTop: 5, letterSpacing: 1 }}>소방공무원 시험 O·X 집중훈련</div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", width: "100%", marginBottom: 24, background: "#111", borderRadius: 12, padding: 4 }}>
        {["login", "signup"].map(t => (
          <button key={t} onClick={() => { setAuthScreen(t); setAuthError(""); }} style={{
            flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer",
            background: authScreen === t ? "linear-gradient(135deg, #CC0022, #FF4444)" : "none",
            color: authScreen === t ? "#fff" : "#666",
            fontSize: 13, fontWeight: 700
          }}>{t === "login" ? "로그인" : "회원가입"}</button>
        ))}
      </div>

      {/* 입력 폼 */}
      <div style={{ width: "100%" }}>
        {authScreen === "signup" && (
          <input placeholder="닉네임 (예: 소방왕김철수)" value={authNickname}
            onChange={e => setAuthNickname(e.target.value)}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #222",
              background: "#111", color: "#fff", fontSize: 14, marginBottom: 10,
              outline: "none", boxSizing: "border-box" }} />
        )}
        <input placeholder="이메일" value={authEmail} type="email"
          onChange={e => setAuthEmail(e.target.value)}
          style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #222",
            background: "#111", color: "#fff", fontSize: 14, marginBottom: 10,
            outline: "none", boxSizing: "border-box" }} />
        <input placeholder="비밀번호 (6자 이상)" value={authPassword} type="password"
          onChange={e => setAuthPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (authScreen === "login" ? handleSignIn() : handleSignUp())}
          style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #222",
            background: "#111", color: "#fff", fontSize: 14, marginBottom: 14,
            outline: "none", boxSizing: "border-box" }} />
        {authError && <div style={{ color: "#FF4444", fontSize: 12, marginBottom: 10, textAlign: "center" }}>{authError}</div>}
        <button onClick={authScreen === "login" ? handleSignIn : handleSignUp}
          disabled={authLoading}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: authLoading ? "#333" : "linear-gradient(135deg, #CC0022, #FF4444)",
            color: "#fff", fontSize: 15, fontWeight: 900, cursor: authLoading ? "default" : "pointer" }}>
          {authLoading ? "처리 중..." : authScreen === "login" ? "로그인" : "회원가입"}
        </button>
      </div>

      <button onClick={() => setShowAdminLogin(true)} style={{
        marginTop: 32, background: "none", border: "none", color: "#333", fontSize: 11, cursor: "pointer"
      }}>⚙ 관리자</button>
    </div>
  );

  // ── 관리자 로그인 팝업
  if (showAdminLogin) return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0",
      fontFamily: "'Noto Sans KR', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", maxWidth: 420, margin: "0 auto", padding: "0 28px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 6 }}>관리자 로그인</div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 28 }}>문제 입력 권한이 필요합니다</div>
      <input
        type="password"
        placeholder="비밀번호 입력"
        value={adminPwInput}
        onChange={e => setAdminPwInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && tryAdminLogin()}
        style={{
          width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #333",
          background: "#111", color: "#fff", fontSize: 15, marginBottom: 10,
          outline: "none", boxSizing: "border-box"
        }}
      />
      {adminError && <div style={{ color: "#FF4444", fontSize: 12, marginBottom: 10 }}>{adminError}</div>}
      <button onClick={tryAdminLogin} style={{
        width: "100%", padding: "14px", borderRadius: 12, border: "none",
        background: "linear-gradient(135deg, #CC0022, #FF4444)",
        color: "#fff", fontSize: 15, fontWeight: 900, cursor: "pointer", marginBottom: 12
      }}>확인</button>
      <button onClick={() => { setShowAdminLogin(false); setAdminPwInput(""); setAdminError(""); }} style={{
        background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer"
      }}>취소</button>
    </div>
  );

  // ── 관리자 문제 입력 화면
  if (adminScreen) {
    const k = `${subject}|${adminScreen.partName}|${adminScreen.chapterName}`;
    const qList = allQuestions[k] || [];
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0",
        fontFamily: "'Noto Sans KR', sans-serif",
        maxWidth: 420, margin: "0 auto",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&display=swap" rel="stylesheet" />
        {/* 헤더 */}
        <div style={{
          background: "linear-gradient(135deg, #0a0a1a, #101030)",
          borderBottom: "2px solid #5555FF",
          padding: "16px 20px 12px", position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <button onClick={() => setAdminScreen(null)} style={{
            background: "rgba(255,255,255,0.08)", border: "none",
            borderRadius: 8, width: 32, height: 32, cursor: "pointer",
            color: "#aaa", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center"
          }}>‹</button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>📝 문제 입력</div>
            <div style={{ fontSize: 10, color: "#8888FF" }}>{adminScreen.chapterName}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 10, color: "#5555FF",
            background: "rgba(85,85,255,0.15)", padding: "4px 10px", borderRadius: 20, border: "1px solid #5555FF55"
          }}>관리자 모드</div>
        </div>

        <div style={{ padding: 16, paddingBottom: 32 }}>
          {/* 문제 입력 폼 */}
          <div style={{
            background: "#111", border: "1px solid #333", borderRadius: 14, padding: 16, marginBottom: 20
          }}>
            <div style={{ fontSize: 12, color: "#8888FF", fontWeight: 700, marginBottom: 12 }}>새 문제 추가</div>
            <textarea
              placeholder="문제를 입력하세요..."
              value={newQText}
              onChange={e => setNewQText(e.target.value)}
              rows={3}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "1px solid #2a2a2a",
                background: "#0d0d0d", color: "#f0f0f0", fontSize: 13, lineHeight: 1.6,
                resize: "none", outline: "none", marginBottom: 12, boxSizing: "border-box"
              }}
            />
            {/* 지문 종류 */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {["기출", "기본서", "시그니처"].map(t => (
                <button key={t} onClick={() => setNewQType(t)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: newQType === t ? typeColors[t] + "33" : "#1a1a1a",
                  border: `1px solid ${newQType === t ? typeColors[t] : "#2a2a2a"}`,
                  color: newQType === t ? typeColors[t] : "#666",
                }}>{t}</button>
              ))}
            </div>
            {/* 정답 선택 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button onClick={() => setNewQAnswer(true)} style={{
                flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", fontSize: 18, fontWeight: 900,
                background: newQAnswer ? "rgba(0,204,102,0.15)" : "#1a1a1a",
                border: `2px solid ${newQAnswer ? "#00CC66" : "#2a2a2a"}`,
                color: newQAnswer ? "#00CC66" : "#555",
              }}>O</button>
              <button onClick={() => setNewQAnswer(false)} style={{
                flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", fontSize: 18, fontWeight: 900,
                background: !newQAnswer ? "rgba(255,68,68,0.15)" : "#1a1a1a",
                border: `2px solid ${!newQAnswer ? "#CC0022" : "#2a2a2a"}`,
                color: !newQAnswer ? "#FF4444" : "#555",
              }}>X</button>
            </div>
            <button onClick={saveQuestion} style={{
              width: "100%", padding: "13px", borderRadius: 10, border: "none",
              background: newQText.trim() && !saving ? "linear-gradient(135deg, #5555FF, #8888FF)" : "#1a1a1a",
              color: newQText.trim() && !saving ? "#fff" : "#444",
              fontSize: 14, fontWeight: 900, cursor: newQText.trim() && !saving ? "pointer" : "default"
            }}>{saving ? "저장 중..." : "+ 문제 저장"}</button>
          </div>

          {/* 등록된 문제 목록 */}
          <div style={{ fontSize: 12, color: "#888", fontWeight: 700, marginBottom: 10 }}>
            등록된 문제 ({qList.length}개)
          </div>
          {qList.length === 0 && (
            <div style={{ textAlign: "center", color: "#444", fontSize: 13, padding: 24 }}>
              아직 등록된 문제가 없어요
            </div>
          )}
          {qList.map((q, i) => (
            <div key={q.id} style={{
              background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 14, marginBottom: 8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#666" }}>#{i + 1}</span>
                  <span style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 20,
                    background: typeColors[q.type] + "22", color: typeColors[q.type], fontWeight: 700
                  }}>{q.type}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 900,
                    color: q.answer ? "#00CC66" : "#FF4444"
                  }}>정답: {q.answer ? "O" : "X"}</span>
                </div>
                <button onClick={() => deleteQuestion(q.id)} style={{
                  background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
                  borderRadius: 6, padding: "3px 8px", color: "#FF4444", fontSize: 11, cursor: "pointer"
                }}>삭제</button>
              </div>
              <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>{q.text}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── 챕터 퀴즈 화면
  if (quizScreen) {
    if (quizScreen.finished) {
      const total = quizScreen.questions.length;
      const pct = Math.round((score.correct / total) * 100);
      return (
        <div style={{
          minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0",
          fontFamily: "'Noto Sans KR', sans-serif",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", maxWidth: 420, margin: "0 auto", padding: "0 24px"
        }}>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&display=swap" rel="stylesheet" />
          <div style={{ fontSize: 48, marginBottom: 12 }}>{pct >= 80 ? "🎉" : pct >= 60 ? "💪" : "📚"}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6 }}>결과</div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>{quizScreen.chapterName}</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
            <div style={{ textAlign: "center", background: "rgba(0,204,102,0.1)", border: "1px solid rgba(0,204,102,0.3)", borderRadius: 12, padding: "16px 24px" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#00CC66" }}>{score.correct}</div>
              <div style={{ fontSize: 11, color: "#888" }}>정답</div>
            </div>
            <div style={{ textAlign: "center", background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: 12, padding: "16px 24px" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#FF4444" }}>{score.wrong}</div>
              <div style={{ fontSize: 11, color: "#888" }}>오답</div>
            </div>
            <div style={{ textAlign: "center", background: "#111", border: "1px solid #222", borderRadius: 12, padding: "16px 24px" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: accentLight }}>{pct}%</div>
              <div style={{ fontSize: 11, color: "#888" }}>정답률</div>
            </div>
          </div>
          <button onClick={() => setQuizScreen(null)} style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${accentColor}, ${accentLight})`,
            color: "#fff", fontSize: 15, fontWeight: 900, cursor: "pointer"
          }}>← 챕터 목록으로</button>
        </div>
      );
    }

    const q = quizScreen.questions[qIndex];
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0",
        fontFamily: "'Noto Sans KR', sans-serif",
        maxWidth: 420, margin: "0 auto",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&display=swap" rel="stylesheet" />
        {/* 헤더 */}
        <div style={{
          background: subject === "관계법규"
            ? "linear-gradient(135deg, #00101a, #001a2d)"
            : "linear-gradient(135deg, #1a0000, #2d0000)",
          borderBottom: `2px solid ${accentColor}`,
          padding: "14px 20px", position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <button onClick={() => setQuizScreen(null)} style={{
            background: "rgba(255,255,255,0.08)", border: "none",
            borderRadius: 8, width: 32, height: 32, cursor: "pointer",
            color: "#aaa", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center"
          }}>‹</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>{quizScreen.chapterName}</div>
            <div style={{ fontSize: 10, color: "#777", marginTop: 1 }}>{quizScreen.partName}</div>
          </div>
          <div style={{ fontSize: 12, color: accentLight, fontWeight: 700 }}>
            {qIndex + 1} / {quizScreen.questions.length}
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {/* 점수 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, background: "rgba(0,204,102,0.1)", border: "1px solid rgba(0,204,102,0.3)", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#00CC66" }}>{score.correct}</div>
              <div style={{ fontSize: 10, color: "#888" }}>정답</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#FF4444" }}>{score.wrong}</div>
              <div style={{ fontSize: 10, color: "#888" }}>오답</div>
            </div>
            {/* 진행 바 */}
            <div style={{ flex: 2, background: "#111", border: "1px solid #222", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
              <div style={{ background: "#1a1a1a", borderRadius: 4, height: 6 }}>
                <div style={{
                  height: "100%", width: `${((qIndex + 1) / quizScreen.questions.length) * 100}%`,
                  background: accentColor, borderRadius: 4, transition: "width 0.3s"
                }} />
              </div>
              <div style={{ fontSize: 10, color: "#666", textAlign: "center" }}>
                {qIndex + 1}/{quizScreen.questions.length} 문제
              </div>
            </div>
          </div>

          {/* 문제 카드 */}
          <div style={{
            background: subject === "관계법규"
              ? "linear-gradient(135deg, #00101a, #001428)"
              : "linear-gradient(135deg, #120000, #1a0000)",
            border: `1px solid ${accentColor}66`,
            borderRadius: 16, padding: 20, marginBottom: 16,
            boxShadow: `0 8px 30px ${accentColor}20`
          }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <span style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 20,
                background: typeColors[q.type] + "22",
                border: `1px solid ${typeColors[q.type]}55`,
                color: typeColors[q.type], fontWeight: 700
              }}>{q.type}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.8, color: "#f0f0f0" }}>
              {q.text}
            </div>
          </div>

          {/* 버튼 */}
          {!showResult ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => handleAnswer(true)} style={{
                background: "linear-gradient(135deg, #003320, #004428)", border: "2px solid #00CC66",
                borderRadius: 14, padding: "20px", fontSize: 28, fontWeight: 900, color: "#00CC66", cursor: "pointer"
              }}>O</button>
              <button onClick={() => handleAnswer(false)} style={{
                background: "linear-gradient(135deg, #330000, #440000)", border: "2px solid #CC0022",
                borderRadius: 14, padding: "20px", fontSize: 28, fontWeight: 900, color: "#FF4444", cursor: "pointer"
              }}>X</button>
            </div>
          ) : (
            <div>
              <div style={{
                borderRadius: 14, padding: 16, marginBottom: 12,
                background: userAnswer === q.answer ? "linear-gradient(135deg, #001a0d, #003320)" : "linear-gradient(135deg, #1a0000, #330000)",
                border: `2px solid ${userAnswer === q.answer ? "#00CC66" : "#CC0022"}`,
                textAlign: "center"
              }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{userAnswer === q.answer ? "✅" : "❌"}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: userAnswer === q.answer ? "#00CC66" : "#FF4444" }}>
                  {userAnswer === q.answer ? "정답!" : "오답!"}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  정답: <span style={{ color: "#fff", fontWeight: 700 }}>{q.answer ? "O" : "X"}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => toggleWeak(q.id)} style={{
                  flex: 1, padding: "12px",
                  background: wrongAnswerIds.includes(q.id) ? "rgba(255,140,0,0.2)" : "#111",
                  border: `1px solid ${wrongAnswerIds.includes(q.id) ? "#FF8C00" : "#333"}`,
                  borderRadius: 10, color: wrongAnswerIds.includes(q.id) ? "#FF8C00" : "#888",
                  fontSize: 12, fontWeight: 700, cursor: "pointer"
                }}>{wrongAnswerIds.includes(q.id) ? "📌 저장됨" : "📌 오답저장"}</button>
                <button onClick={nextQ} style={{
                  flex: 2, padding: "12px",
                  background: `linear-gradient(135deg, ${accentColor}, ${accentLight})`,
                  border: "none", borderRadius: 10,
                  color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer"
                }}>{qIndex + 1 >= quizScreen.questions.length ? "결과 보기 →" : "다음 문제 →"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 과목 선택 화면
  if (!subject) return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0",
      fontFamily: "'Noto Sans KR', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", maxWidth: 420, margin: "0 auto", padding: "0 24px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&display=swap" rel="stylesheet" />
      {/* 닉네임 + 로그아웃 */}
      <div style={{ position: "absolute", top: 16, right: 24, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#FF6666", fontWeight: 700 }}>👤 {nickname}</span>
        <button onClick={handleSignOut} style={{
          background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
          borderRadius: 8, padding: "4px 10px", color: "#FF4444", fontSize: 11, cursor: "pointer"
        }}>로그아웃</button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: "0 auto 16px",
          background: "linear-gradient(135deg, #CC0022, #FF4444)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, boxShadow: "0 8px 30px rgba(204,0,34,0.4)"
        }}>🔥</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>합격은 이영철</div>
        <div style={{ fontSize: 12, color: "#FF6666", marginTop: 6, letterSpacing: 1 }}>소방공무원 시험 O·X 집중훈련</div>
      </div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 20, textAlign: "center" }}>학습할 과목을 선택하세요</div>
      <button onClick={() => setSubject("소방학")} style={{
        width: "100%", padding: "22px 20px", marginBottom: 14,
        background: "linear-gradient(135deg, #1a0000, #2d0000)",
        border: "2px solid #CC0022", borderRadius: 18, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 16,
        boxShadow: "0 4px 20px rgba(204,0,34,0.2)"
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg, #CC0022, #FF4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🚒</div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>소방학</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 20, color: "#CC0022" }}>›</div>
      </button>
      <button onClick={() => setSubject("관계법규")} style={{
        width: "100%", padding: "22px 20px",
        background: "linear-gradient(135deg, #00101a, #001a2d)",
        border: "2px solid #0077CC", borderRadius: 18, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 16,
        boxShadow: "0 4px 20px rgba(0,119,204,0.2)"
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg, #0055AA, #0077CC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📋</div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>소방 관계법규</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 20, color: "#0077CC" }}>›</div>
      </button>
      {/* 관리자 버튼 */}
      <button onClick={() => setShowAdminLogin(true)} style={{
        marginTop: 28, background: "none", border: "none",
        color: "#333", fontSize: 11, cursor: "pointer", letterSpacing: 1
      }}>⚙ 관리자</button>
      <div style={{ fontSize: 10, color: "#333", marginTop: 8, textAlign: "center" }}>이영철 교수님 O·X 심화교재 기반</div>
    </div>
  );

  // ── 메인 앱
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0",
      fontFamily: "'Noto Sans KR', sans-serif",
      display: "flex", flexDirection: "column", maxWidth: 420, margin: "0 auto",
      position: "relative"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&display=swap" rel="stylesheet" />

      {/* 헤더 */}
      <div style={{
        background: subject === "관계법규"
          ? "linear-gradient(135deg, #00101a, #001a2d)"
          : "linear-gradient(135deg, #1a0000, #2d0000)",
        borderBottom: `2px solid ${accentColor}`,
        padding: "14px 20px", position: "sticky", top: 0, zIndex: 100,
        boxShadow: `0 4px 20px ${accentColor}44`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { setSubject(null); setTab("home"); setExpandedPart(null); }} style={{
            background: "rgba(255,255,255,0.08)", border: "none",
            borderRadius: 8, width: 32, height: 32, cursor: "pointer",
            color: "#aaa", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center"
          }}>‹</button>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: subject === "관계법규" ? "linear-gradient(135deg, #0055AA, #0077CC)" : "linear-gradient(135deg, #CC0022, #FF4444)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
          }}>{subject === "관계법규" ? "📋" : "🚒"}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>합격은 이영철</div>
            <div style={{ fontSize: 10, color: accentLight === "#66AAFF" ? "#66AAFF" : "#FF6666", letterSpacing: 1 }}>
              {subject} O·X 집중훈련
            </div>
          </div>
          {isAdmin && (
            <div style={{
              marginLeft: "auto", fontSize: 10, color: "#8888FF",
              background: "rgba(85,85,255,0.15)", padding: "3px 8px",
              borderRadius: 20, border: "1px solid #5555FF55"
            }}>관리자</div>
          )}
        </div>
      </div>

      {/* 리더보드 배너 */}
      {showLeader && tab === "home" && (
        <div style={{
          background: "linear-gradient(90deg, #1a0a00, #2d1400)",
          borderBottom: "1px solid #FF8C00", padding: "10px 16px", position: "relative"
        }}>
          <div style={{ fontSize: 11, color: "#FF8C00", fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>🏆 이번 주 TOP 3</div>
          <div style={{ display: "flex", gap: 8 }}>
            {leaderboard.map(l => (
              <div key={l.rank} style={{
                flex: 1, background: "rgba(255,140,0,0.08)", border: "1px solid rgba(255,140,0,0.25)",
                borderRadius: 8, padding: "6px 8px", textAlign: "center"
              }}>
                <div style={{ fontSize: 14 }}>{l.badge}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{l.name}</div>
                <div style={{ fontSize: 10, color: "#FF8C00" }}>{l.progress}%</div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowLeader(false)} style={{
            position: "absolute", top: 8, right: 10,
            background: "none", border: "none", color: "#666", fontSize: 14, cursor: "pointer"
          }}>✕</button>
        </div>
      )}

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
        {tab === "home" && (
          <div style={{ padding: 16 }}>
            {/* 파트별 진도 */}
            <div style={{ fontSize: 12, color: accentLight, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
              파트별 진도
            </div>
            {parts.map((p, i) => {
              const qs = p.chapters.reduce((acc, ch) => acc + getQuestions(subject, p.name, ch).length, 0);
              const isOpen = expandedPart === i;
              return (
                <div key={p.name} style={{ marginBottom: 8 }}>
                  <div onClick={() => setExpandedPart(isOpen ? null : i)} style={{
                    background: "#111", border: `1px solid ${isOpen ? accentColor + "66" : "#222"}`,
                    borderRadius: isOpen ? "10px 10px 0 0" : 10, padding: "12px 14px", cursor: "pointer"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isOpen ? "#fff" : "#ddd", flex: 1, marginRight: 8 }}>{p.name}</span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: "#555" }}>{qs}문제</span>
                        <span style={{ fontSize: 12, color: "#555" }}>{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{
                      background: "#0d0d0d", border: `1px solid ${accentColor + "44"}`,
                      borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden"
                    }}>
                      {p.chapters.length === 0 ? (
                        <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#444" }}>챕터 준비 중입니다</div>
                      ) : p.chapters.map((ch, ci) => {
                        const chQs = getQuestions(subject, p.name, ch);
                        return (
                          <div key={ci} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                            borderBottom: ci < p.chapters.length - 1 ? "1px solid #1a1a1a" : "none",
                          }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                              background: `${accentColor}22`, border: `1px solid ${accentColor}44`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, fontWeight: 700, color: accentLight
                            }}>{ci + 1}</div>
                            <span style={{ fontSize: 12, color: "#bbb", flex: 1 }}>{ch}</span>
                            <span style={{ fontSize: 10, color: "#555", marginRight: 4 }}>{chQs.length}문제</span>
                            {/* 관리자: 문제 입력 버튼 */}
                            {isAdmin && (
                              <button onClick={() => setAdminScreen({ partName: p.name, chapterName: ch })} style={{
                                background: "rgba(85,85,255,0.15)", border: "1px solid #5555FF55",
                                borderRadius: 6, padding: "3px 8px", color: "#8888FF",
                                fontSize: 10, cursor: "pointer", marginRight: 4
                              }}>+ 입력</button>
                            )}
                            {/* 풀기 버튼 */}
                            <button onClick={() => startChapterQuiz(p.name, ch)} style={{
                              background: chQs.length > 0 ? `${accentColor}22` : "#1a1a1a",
                              border: `1px solid ${chQs.length > 0 ? accentColor + "66" : "#2a2a2a"}`,
                              borderRadius: 6, padding: "3px 10px",
                              color: chQs.length > 0 ? accentLight : "#444",
                              fontSize: 10, cursor: chQs.length > 0 ? "pointer" : "default"
                            }}>풀기</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 빠른 접근 */}
            <div style={{ fontSize: 12, color: accentLight, fontWeight: 700, letterSpacing: 1, margin: "20px 0 10px" }}>빠른 접근</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { icon: "📌", label: "오답노트", sub: `${wrongAnswerIds.length}개 저장됨`, action: () => setTab("weak") },
                { icon: "📸", label: "소방시설 사진", sub: "기구 정리", action: () => setTab("photo") },
                { icon: "▶️", label: "유튜브 강의", sub: "이해 영상", action: () => setTab("video") },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{
                  background: "#111", border: "1px solid #222", borderRadius: 12, padding: "14px 12px",
                  display: "flex", flexDirection: "column", gap: 4, textAlign: "left", cursor: "pointer"
                }}>
                  <div style={{ fontSize: 22 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>{item.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 오답노트 */}
        {tab === "weak" && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "#FF8C00", fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
              📌 {nickname}의 오답노트 ({wrongAnswerIds.length}개)
            </div>
            {wrongAnswerIds.length === 0 ? (
              <div style={{ background: "#111", borderRadius: 12, padding: 30, textAlign: "center", color: "#555" }}>
                저장된 오답이 없어요<br />
                <span style={{ fontSize: 12, color: "#444" }}>문제 풀이 후 오답을 저장해보세요</span>
              </div>
            ) : (
              Object.values(allQuestions).flat()
                .filter(q => wrongAnswerIds.includes(q.id))
                .map((q, i) => (
                  <div key={q.id} style={{
                    background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 14, marginBottom: 8
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#666" }}>#{i + 1}</span>
                        <span style={{
                          fontSize: 10, padding: "2px 7px", borderRadius: 20,
                          background: typeColors[q.type] + "22", color: typeColors[q.type], fontWeight: 700
                        }}>{q.type}</span>
                      </div>
                      <button onClick={() => toggleWeak(q.id)} style={{
                        background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
                        borderRadius: 6, padding: "3px 8px", color: "#FF4444", fontSize: 11, cursor: "pointer"
                      }}>✕ 삭제</button>
                    </div>
                    <div style={{ fontSize: 13, color: "#ddd", lineHeight: 1.6, marginBottom: 6 }}>{q.text}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: q.answer ? "#00CC66" : "#FF4444" }}>
                      정답: {q.answer ? "O" : "X"}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* 사진 */}
        {tab === "photo" && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "#FF4444", fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>📸 소방시설 기구 정리</div>
            {["스프링클러 헤드", "옥내소화전함", "감지기 종류", "유도등"].map(item => (
              <div key={item} style={{
                background: "#111", border: "1px solid #1e1e1e",
                borderRadius: 12, marginBottom: 10,
                display: "flex", alignItems: "center", gap: 12, padding: 12
              }}>
                <div style={{ width: 60, height: 60, borderRadius: 8, background: "linear-gradient(135deg, #1a0000, #2a0000)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔧</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{item}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>사진 준비 중</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: 18, color: "#333" }}>›</div>
              </div>
            ))}
          </div>
        )}

        {/* 영상 */}
        {tab === "video" && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "#FF4444", fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>▶️ 이해 보충 영상</div>
            {[
              { title: "연소론 핵심 정리", part: "소방학 Part 1", duration: "23:14" },
              { title: "소화약제 한방 정리", part: "소방학 Part 2", duration: "18:40" },
              { title: "소방기본법 요약", part: "관계법규 Part 1", duration: "15:22" },
            ].map(v => (
              <div key={v.title} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ background: "linear-gradient(135deg, #1a0000, #2d0000)", height: 80, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <div style={{ width: 36, height: 36, background: "rgba(255,68,68,0.9)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>▶</div>
                  <div style={{ position: "absolute", bottom: 6, right: 8, background: "rgba(0,0,0,0.7)", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "#fff" }}>{v.duration}</div>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{v.part}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 네비 */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 420, background: "#0d0d0d",
        borderTop: "1px solid #1e1e1e", display: "flex",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.5)"
      }}>
        {[
          { id: "home", icon: "🏠", label: "홈" },
          { id: "weak", icon: "📌", label: "오답노트" },
          { id: "photo", icon: "📸", label: "시설사진" },
          { id: "video", icon: "▶️", label: "강의영상" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 0 8px", background: "none", border: "none",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer"
          }}>
            <div style={{ fontSize: 18 }}>{t.icon}</div>
            <div style={{ fontSize: 9, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? accentLight : "#555" }}>{t.label}</div>
            {tab === t.id && <div style={{ width: 16, height: 2, background: accentColor, borderRadius: 2, marginTop: 1 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
