import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, AudioLines, Check, CircleAlert, LoaderCircle, Trophy, Zap } from 'lucide-react';
import { previewScoring } from './scoring-preview';

export default function ScoringPreview({ talk, onBack, onLeaderboard }) {
  const [state, setState] = useState('choose');
  const [result, setResult] = useState(null);
  const controller = useRef(null);
  const heading = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { heading.current?.focus(); }, [state]);
  async function run(outcome) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState('processing');
    try {
      const next = await previewScoring({ outcome, signal: request.signal });
      if (!request.signal.aborted) { setResult(next); setState('success'); }
    } catch (error) {
      if (error.name !== 'AbortError' && !request.signal.aborted) setState('error');
    }
  }
  function cancel() { controller.current?.abort(); setState('choose'); }
  return <section className="scoring-screen"><div className="scoring-demo-banner"><span className="demo-label">DESIGN PREVIEW</span><p>Sample results only. Nothing is analyzed, uploaded, or added to the leaderboard.</p></div>
    {state==='choose' && <div className="scoring-state"><span className="score-state-icon"><AudioLines size={28}/></span><span className="eyebrow">THE NEXT PART OF YOUR JOURNEY</span><h2 tabIndex={-1} ref={heading}>From notes to a little recognition.</h2><p>Try the scoring experience while the backend is being connected. Both options use a short simulated wait.</p><div className="scoring-actions"><button className="dark-button" onClick={()=>run('success')}>Preview a result <ArrowUpRight size={17}/></button><button className="browse-button" onClick={()=>run('error')}>Preview an error</button></div></div>}
    {state==='processing' && <div className="scoring-state" role="status" aria-live="polite" aria-busy="true"><span className="score-state-icon"><LoaderCircle className="score-spinner" size={30}/></span><span className="eyebrow">SIMULATED PROCESSING</span><h2 tabIndex={-1} ref={heading}>Good ideas deserve a closer look.</h2><p>This previews the wait while a future scoring service compares notes with a talk. Your notes are staying in this tab.</p><div className="scoring-wait-track"><span/></div><button className="browse-button" onClick={cancel}>Cancel preview</button></div>}
    {state==='error' && <div className="scoring-state"><span className="score-state-icon error-icon"><CircleAlert size={30}/></span><span className="eyebrow">SIMULATED ERROR</span><h2 tabIndex={-1} ref={heading}>Let’s give that another try.</h2><p role="alert">This is an intentional preview of a scoring failure. Your draft is still here, and no points were awarded.</p><div className="scoring-actions"><button className="dark-button" onClick={()=>run('success')}>Try again <ArrowUpRight size={17}/></button><button className="browse-button" onClick={onBack}>Back to my notes</button></div></div>}
    {state==='success' && result && <div className="scoring-result"><div className="result-heading"><span className="eyebrow">SAMPLE SESSION RESULT</span><h2 tabIndex={-1} ref={heading}>That’s a takeaway worth keeping.</h2><p className="result-talk">Your draft: <strong>{talk}</strong></p><p>The numbers below are a fixed design example, independent of your notes.</p></div><div className="result-metrics"><div className="understanding-gauge" style={{'--score-angle':`${result.score*3.6}deg`}}><div><strong>{result.score}<small>/100</small></strong><span>Sample score</span></div></div><div className="result-points"><span><Zap size={19}/> LEARNING POINTS</span><strong>+{result.points}</strong><p>Illustrative points for this session.<br/>Not added to your total.</p></div></div><div className="result-summary"><span className="success-icon"><Check size={18}/></span><div><h3>{result.covered} of {result.totalIdeas} key ideas covered</h3><p>Example feedback: the main concepts came through clearly. Revisit a concrete example to make the remaining idea stick.</p></div></div><div className="result-next"><Trophy size={22}/><div><strong>Your next stop: the leaderboard.</strong><p>Compare learning points across talks and attendees.</p></div><button className="dark-button" onClick={onLeaderboard}>View leaderboard <ArrowUpRight size={16}/></button></div><div className="scoring-actions"><button className="browse-button" onClick={onBack}><ArrowLeft size={15}/> Back to my notes</button><button className="text-button preview-reset" onClick={()=>setState('choose')}>Try another preview</button></div></div>}
    {state==='choose' && <button className="preview-back" onClick={onBack}><ArrowLeft size={14}/> Back to my notes</button>}
  </section>;
}
