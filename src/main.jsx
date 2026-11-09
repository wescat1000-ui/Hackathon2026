import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AudioLines, ChevronRight, Flag, Menu, Sparkles, Trophy } from 'lucide-react';
import './styles.css';
import SessionNotes from './SessionNotes';
import Leaderboard from './Leaderboard';
import { startTelemetry, trackView } from './telemetry';
import { apiRequest, browserAttendee, saveAttendee } from './api';

startTelemetry();

function App() {
  const [tab, setTab] = useState('Leaderboard');
  const [draft, setDraft] = useState({ talkId: '', notes: '', files: [] });
  const [mobile, setMobile] = useState(false);
  const [attendee, setAttendee] = useState(browserAttendee);
  const [talks, setTalks] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const rankVersion = useRef(0);
  useEffect(() => { saveAttendee(attendee); }, [attendee]);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function poll() {
      const version = ++rankVersion.current;
      try {
        const [schedule, rankings] = await Promise.all([apiRequest('/api/talks', {signal:controller.signal}), apiRequest('/api/leaderboard', {signal:controller.signal})]);
        if (!controller.signal.aborted && version === rankVersion.current) { setTalks(schedule.talks);setAttendees(rankings.attendees);setApiError('');setUpdatedAt(new Date()); }
      } catch (error) { if (!controller.signal.aborted && version === rankVersion.current) setApiError(error.message); }
      finally { if (!controller.signal.aborted) {setLoading(false);timer=setTimeout(poll,5000);} }
    }
    poll();
    return () => { controller.abort();clearTimeout(timer); };
  }, []);
  async function refreshRankings() {
    const version = ++rankVersion.current;
    try { const data=await apiRequest('/api/leaderboard');if(version!==rankVersion.current)return;setAttendees(data.attendees);setUpdatedAt(new Date());setApiError(''); }
    catch { setApiError('Score saved, but the leaderboard refresh failed. Retrying automatically.'); }
  }
  useEffect(() => { trackView(tab); }, [tab]);
  function navigate(value) { setTab(value); setMobile(false); }
  return <div className="app">
    <aside className={`sidebar ${mobile ? 'open' : ''}`}>
      <a className="brand" href="#" onClick={e => {e.preventDefault();navigate('Leaderboard')}}><span className="brand-mark"><Flag size={23} fill="currentColor" /></span>rally<span className="brand-dot">.</span></a>
      <div className="event-label">TURN UNDERSTANDING INTO POINTS</div>
      <nav aria-label="Main navigation">{[['Leaderboard',Trophy],['Sessions',AudioLines]].map(([name, Icon]) => <button key={name} aria-current={tab===name?'page':undefined} className={tab===name?'nav-item active':'nav-item'} onClick={()=>navigate(name)}><Icon size={19}/>{name}</button>)}</nav>
      <div className="sidebar-bottom"><div className="little-spark"><Sparkles size={20}/></div><h3>Let the ideas stick.</h3><p>Your notes. Your understanding.<br/>A little friendly competition.</p><span className="demo-label">DEMO EXPERIENCE</span></div>
      <div className="profile"><span className="avatar green">YO</span><div><strong>Your learning journey</strong><small>{attendee.name || 'Demo attendee'}</small></div></div>
    </aside>
    <div className="workspace"><header><button className="mobile-menu icon-button" aria-label="Toggle navigation" aria-expanded={mobile} onClick={()=>setMobile(!mobile)}><Menu/></button><span className="breadcrumb">Your event <ChevronRight size={14}/><strong>{tab}</strong></span><div className="header-right">Notes. Knowledge. Points.<span className="header-avatar">Y</span></div></header>
      <main>{apiError && <div className="backend-notice" role="status">{apiError}{updatedAt && " Showing the last successfully loaded rankings."}</div>}<div className="page-heading"><div><div className="eyebrow">A LITTLE CURIOSITY. A LOT OF POSSIBILITY.</div><h1>{tab==='Sessions'?'Big ideas start here.':'The curiosity club.'}</h1><p>{tab==='Sessions'?'Capture what clicked. Turn the things you learn into understanding.':'Your conference, ranked by what you take away.'}</p></div><span className="day-pill">LEARN <span className="pill-divider"/> CAPTURE <span className="pill-divider"/> CLIMB</span></div>
      {tab==='Leaderboard' ? <Leaderboard onCapture={()=>navigate('Sessions')} talks={talks} attendees={attendees} attendeeId={attendee.id} loading={loading} updatedAt={updatedAt} apiError={apiError}/> : <SessionNotes onLeaderboard={()=>navigate('Leaderboard')} draft={draft} setDraft={setDraft} talks={talks} attendee={attendee} setAttendee={setAttendee} onSave={refreshRankings}/>}
      <footer><span className="footer-brand">rally.</span><span>Make the ideas count.</span><span>Curiosity looks good on you <Sparkles size={13}/></span></footer>
      </main></div>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
