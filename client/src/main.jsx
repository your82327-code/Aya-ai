
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Sparkles, Image as ImageIcon, Film, Images, Settings2,
  WandSparkles, Clock3, ArrowUpLeft, CircleHelp,
  LoaderCircle, CheckCircle2, AlertCircle, Menu, X
} from "lucide-react";
import "./style.css";

function App() {
  const [tab, setTab] = useState("image");
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState("5");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [configured, setConfigured] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  async function refresh() {
    try {
      const [h, hist] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/history")
      ]);
      const health = await h.json();
      setConfigured(health.configured);
      setHistory(await hist.json());
    } catch {
      setConfigured(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function generate() {
    setError("");
    setNotice("");
    if (!prompt.trim()) {
      setError("اكتبي وصف الصورة أو الفيديو الأول.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: tab, prompt, aspectRatio: ratio, duration
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "حدث خطأ أثناء التوليد.");
      setNotice(data.message || "تم إرسال طلب التوليد.");
      setPrompt("");
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const nav = [
    { id: "image", label: "إنشاء صورة", icon: ImageIcon },
    { id: "video", label: "إنشاء فيديو", icon: Film },
    { id: "gallery", label: "معرض أعمالي", icon: Images }
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "show" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={22}/></div>
          <div><b>Aya AI</b><small>STUDIO</small></div>
          <button className="close-menu" onClick={() => setMobileMenu(false)}><X/></button>
        </div>
        <div className="side-label">مساحة الإبداع</div>
        {nav.map(item => (
          <button key={item.id}
            className={`nav-item ${tab === item.id ? "active" : ""}`}
            onClick={() => {
              setTab(item.id);
              setMobileMenu(false);
              setError("");
              setNotice("");
            }}>
            <item.icon size={19}/>
            <span>{item.label}</span>
            {tab === item.id && <ArrowUpLeft size={15}/>}
          </button>
        ))}
        <div className="side-bottom">
          <div className="help-card">
            <CircleHelp size={18}/>
            <b>ابدئي خيالك</b>
            <p>اكتبي فكرتك وسيحوّلها Aya AI إلى محتوى إبداعي.</p>
          </div>
          <div className="profile">
            <div className="avatar">A</div>
            <div><b>مساحة Aya</b><small>الحساب الشخصي</small></div>
            <Settings2 size={18}/>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMobileMenu(true)}><Menu/></button>
          <div className="crumb">
            استوديو الذكاء الاصطناعي <span>/</span> {nav.find(n => n.id === tab)?.label}
          </div>
          <div className={`api-state ${configured ? "online" : "offline"}`}>
            <i/>{configured ? "محرك التوليد متصل" : "بانتظار مفتاح API"}
          </div>
        </header>

        {tab === "gallery" ? (
          <section className="content">
            <div className="heading">
              <div>
                <span className="eyebrow">YOUR CREATIVE SPACE</span>
                <h1>معرض أعمالي</h1>
                <p>كل إبداعاتك السابقة في مكان واحد.</p>
              </div>
              <button className="secondary" onClick={refresh}>
                <Clock3 size={16}/> تحديث المعرض
              </button>
            </div>
            {history.length ? (
              <div className="history-grid">
                {history.map(item => (
                  <div className="history-card" key={item.id}>
                    <div className="history-preview">
                      {item.output_url ? (
                        item.kind === "video"
                          ? <video src={item.output_url} controls/>
                          : <img src={item.output_url}/>
                      ) : (
                        <div className="placeholder">
                          <Film size={26}/>
                          <span>{item.status === "failed" ? "فشل التوليد" : "جاري المعالجة"}</span>
                        </div>
                      )}
                    </div>
                    <div className="history-info">
                      <b>{item.kind === "image" ? "صورة" : "فيديو"} #{item.id}</b>
                      <small>{item.prompt}</small>
                      <span className="status">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">
                <Images size={42}/>
                <h3>لسه مفيش أعمال</h3>
                <p>ابدئي بإنشاء أول صورة أو فيديو ليظهر هنا.</p>
                <button className="primary small" onClick={() => setTab("image")}>
                  ابدئي الآن <ArrowUpLeft size={16}/>
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="content">
            <div className="hero">
              <div className="hero-copy">
                <span className="eyebrow">CREATE WITHOUT LIMITS</span>
                <h1>خيالك... <em>بقى حقيقة</em></h1>
                <p>حوّلي أفكارك إلى صور واقعية ومشاهد سينمائية بالذكاء الاصطناعي.</p>
              </div>
              <div className="hero-orb">
                <div className="orb-inner"><Sparkles size={35}/></div>
              </div>
            </div>

            <div className="workspace">
              <div className="work-head">
                <div>
                  <span className="eyebrow">AI GENERATOR</span>
                  <h2>{tab === "image" ? "إنشاء صورة جديدة" : "إنشاء فيديو جديد"}</h2>
                </div>
                <span className="quality"><Sparkles size={14}/> جودة إبداعية</span>
              </div>

              <div className="mode-switch">
                <button className={tab === "image" ? "selected" : ""}
                  onClick={() => setTab("image")}>
                  <ImageIcon size={17}/> توليد الصور
                </button>
                <button className={tab === "video" ? "selected" : ""}
                  onClick={() => setTab("video")}>
                  <Film size={17}/> توليد الفيديو
                </button>
              </div>

              <label className="field-label">وصف الفكرة</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder={tab === "image"
                  ? "مثال: بورتريه واقعي بإضاءة سينمائية دافئة..."
                  : "مثال: لقطة سينمائية لشارع هادئ وقت الغروب..."}/>
              <div className="prompt-tip">
                <WandSparkles size={15}/> سيتم تحسين وصفك تلقائياً لإضافة تفاصيل فنية وإضاءة احترافية.
              </div>

              <div className="options">
                <div className="option">
                  <label>الأبعاد</label>
                  <select value={ratio} onChange={e => setRatio(e.target.value)}>
                    <option value="9:16">طولي 9:16</option>
                    <option value="1:1">مربع 1:1</option>
                    <option value="16:9">عرضي 16:9</option>
                    <option value="4:5">بورتريه 4:5</option>
                  </select>
                </div>
                {tab === "video" && (
                  <div className="option">
                    <label>مدة الفيديو</label>
                    <select value={duration} onChange={e => setDuration(e.target.value)}>
                      <option value="5">5 ثوانٍ</option>
                      <option value="10">10 ثوانٍ</option>
                    </select>
                  </div>
                )}
              </div>

              {error && <div className="alert error"><AlertCircle size={17}/>{error}</div>}
              {notice && <div className="alert success"><CheckCircle2 size={17}/>{notice}</div>}

              <button className="primary generate" onClick={generate} disabled={busy}>
                {busy
                  ? <><LoaderCircle className="spin" size={18}/> جاري إرسال الطلب...</>
                  : <><Sparkles size={18}/> {tab === "image" ? "ابدئي إنشاء الصورة" : "ابدئي إنشاء الفيديو"}</>}
              </button>

              {!configured && (
                <p className="setup-note">
                  التصميم جاهز. لتفعيل التوليد الحقيقي، أضيفي مفتاح Replicate API في ملف البيئة على الخادم.
                </p>
              )}
            </div>
            <div className="bottom-note">
              <span><Settings2 size={16}/></span>
              <p>مفتاح API محفوظ على الخادم ولا يتم إرساله إلى واجهة المستخدم.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App/>);
