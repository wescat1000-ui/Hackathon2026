import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, File, Image, Upload, X, AudioLines, Sparkles } from 'lucide-react';

import { apiRequest } from './api';

import { trackEvent } from './telemetry';

const MAX_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 10;
function Attachment({ attachment, remove }) {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!attachment.type.startsWith('image/') || attachment.type === 'image/svg+xml') return;
    const url = URL.createObjectURL(attachment);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);
  return <li className="attachment">{preview ? <img src={preview} alt={`Preview of ${attachment.name}`} /> : <span className="attachment-icon"><File size={22}/></span>}<div><strong>{attachment.name}</strong><small>{(attachment.size / 1024 / 1024).toFixed(2)} MB · {attachment.type.startsWith('image/') ? 'Image notes' : 'Attached file'}</small></div><button type="button" className="icon-button" aria-label={`Remove ${attachment.name}`} onClick={remove}><X size={17}/></button></li>;
}
export default function SessionNotes({ onSave, draft, setDraft, onLeaderboard, talks, attendee, setAttendee }) {
  const { talkId, notes, files } = draft;
  const selectedTalk = talks.find(item => item.id === talkId);
  const talk = selectedTalk?.title || '';
  const speaker = selectedTalk?.speaker || '';
  const [errors, setErrors] = useState([]);
  const [step, setStep] = useState('edit');
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
  const request = useRef(null);
  const submitting = useRef(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  useEffect(() => () => request.current?.abort(), []);
  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    const controller = new AbortController();request.current = controller;
    setSubmitError('');setStep('processing');
    try {
      const response = await apiRequest('/api/notes', { signal: controller.signal, body: { attendee_id:attendee.id, attendee_name:attendee.name.trim(), talk_id:talkId, notes:notes.trim() } });
      if (!controller.signal.aborted) {setResult(response);setStep('result');await onSave();}
    } catch (error) { if (!controller.signal.aborted) {setSubmitError(error.message);setStep('review');} }
    finally {submitting.current=false;}
  }
  function update(field, value) { setDraft(previous => ({ ...previous, [field]: value })); }
  function addFiles(incoming) {
    const next = [...files];
    const messages = [];
    for (const file of Array.from(incoming)) {
      if (next.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) continue;
      if (file.size === 0) { messages.push(`${file.name} is empty. Choose a file with content.`); continue; }
      if (file.size > MAX_SIZE) { messages.push(`${file.name} exceeds the 20 MB limit.`); continue; }
      if (next.length >= MAX_FILES) { messages.push('You can attach up to 10 files. Remove one before adding another.'); break; }
      next.push(file);
    }
    update('files', next);
    setErrors(messages);
    trackEvent('rally.notes.files_selected', { file_count: next.length, rejected_count: messages.length });
  }
  const ready = !!selectedTalk && !!attendee.name.trim() && !!notes.trim() && files.length === 0;
  if (step === 'processing') return <section className="scoring-screen"><div className="scoring-state" role="status" aria-live="polite" aria-busy="true"><span className="score-state-icon"><AudioLines size={30}/></span><span className="eyebrow">SCORING YOUR NOTES</span><h2>Finding where the ideas connect.</h2><p>The backend is comparing your notes with the transcript. The first submission can take longer while the language model loads.</p><div className="scoring-wait-track"><span/></div><p>Points appear only after your score has been saved. Keep this screen open while it finishes.</p></div></section>;
  if (step === 'result' && result) return <section className="scoring-screen"><div className="scoring-result"><span className="eyebrow">SCORE SAVED TO THE LEADERBOARD</span><h2>Your notes made their mark.</h2><p className="result-talk">{talk} · {speaker}</p><div className="result-metrics"><div className="result-points"><span>LEARNING POINTS</span><strong>{result.points.toLocaleString()}</strong><p>Saved for {attendee.name}.<br/>Replaces any previous score for this talk.</p></div><div><span className="eyebrow">ADJUSTED SIMILARITY</span><h3>{result.score.toFixed(4)}</h3><p className="notes-intro">Calculated by the backend.<br/>This is a similarity score, not a percentage.</p></div></div><div className="scoring-actions"><button className="dark-button" onClick={onLeaderboard}>View updated leaderboard <ArrowRight size={16}/></button><button className="browse-button" onClick={()=>setStep('edit')}>Back to my notes</button></div></div></section>;
  return <div className="notes-layout"><section className="notes-panel"><div className="section-heading"><div><span className="eyebrow">YOUR IDEAS, IN YOUR FORMAT</span><h2>{step === 'review' ? 'One last look.' : 'Capture a session'}</h2></div><span className="subtle-tag">{step === 'review' ? '02 / REVIEW' : '01 / ADD NOTES'}</span></div><p className="notes-intro">{step === 'review' ? 'Check the talk and attachments before sending your notes for scoring.' : 'Choose the speech and type your notes to get a real score. File attachments are a preview and cannot be scored yet.'}</p>
  {step === 'edit' ? <form onSubmit={e=>{e.preventDefault(); if (ready) { trackEvent('rally.notes.reviewed', { file_count: files.length, has_typed_notes: !!notes.trim() }); setStep('review'); }}}><label className="field-label" htmlFor="attendee-name">Your attendee name <span>Required · demo identity, no login</span></label><input className="attendee-name-input" id="attendee-name" value={attendee.name} maxLength={60} placeholder="Name shown on the leaderboard" onChange={e=>setAttendee(previous=>({...previous,name:e.target.value}))} required/><p className="talk-schedule-note">Your browser keeps a demo attendee ID. The same name in a different browser is a separate attendee.</p><div className="talk-picker"><label className="field-label" htmlFor="session-talk">Choose your talk <span>Required</span></label><select id="session-talk" value={talkId || ''} onChange={e=>update('talkId',e.target.value)} required aria-describedby="talk-schedule-note"><option value="" disabled>{talks.length ? 'Select a conference talk' : 'Waiting for the backend schedule…'}</option>{talks.map(item=><option key={item.id} value={item.id}>{item.time ? `${item.time} · ` : ''}{item.title} — {item.speaker}</option>)}</select><p id="talk-schedule-note" className="talk-schedule-note">Connected schedule · Only talks supported by the backend appear here.</p>{selectedTalk && <div className="selected-talk" aria-live="polite"><span className="selected-talk-icon"><AudioLines size={22}/></span><div><span className="eyebrow">YOUR SELECTED SESSION</span><h3>{talk}</h3><p>{speaker}{selectedTalk.time && <> <span>·</span> {selectedTalk.time}</>}</p><p>{selectedTalk.topic}</p>{selectedTalk.source_url && <a className="talk-source" href={selectedTalk.source_url} target="_blank" rel="noreferrer">Watch the talk on TED ↗</a>}</div></div>}</div>
    <label className="field-label" htmlFor="note-files">Attach your notes</label><div className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files)}}><span className="upload-icon"><Upload size={25}/></span><strong>Drop your notes here</strong><p>File extraction is not connected yet; use typed notes to score</p><button className="browse-button" type="button" onClick={()=>input.current.click()}>Choose files <ArrowRight size={14}/></button><small>Up to 10 files · 20 MB per file</small><input id="note-files" className="file-input" type="file" multiple ref={input} onChange={e=>{addFiles(e.target.files);e.target.value='';}}/></div>
    {errors.length>0 && <div className="upload-errors" role="alert">{errors.map((error,i)=><p key={i}>{error}</p>)}</div>}
    {files.length>0 && <><div className="attachment-count" aria-live="polite">{files.length} / 10 files attached</div><ul className="attachments">{files.map((file,i)=><Attachment key={`${file.name}-${file.lastModified}-${file.size}`} attachment={file} remove={()=>update('files', files.filter((_,index)=>index!==i))}/>)}</ul></>}
    <label className="field-label" htmlFor="session-notes">Your takeaways <span>Required for live scoring</span></label><textarea id="session-notes" value={notes} onChange={e=>update('notes',e.target.value)} placeholder="What was the main idea? What clicked for you? What would you explain to someone who missed the talk?" rows={7}/><div className="notes-form-footer"><span>Choose a talk, add your name, and type notes. Remove attachments to score.</span><button className="dark-button" disabled={!ready}>Review notes <ArrowRight size={16}/></button></div></form> : <div className="notes-review"><span className="eyebrow">SESSION</span><h3>{talk}</h3>{speaker && <p>{speaker}{selectedTalk.time && ` · ${selectedTalk.time}`}</p>}{notes.trim() && <><h4>Your takeaways</h4><p className="review-text">{notes}</p></>}{files.length>0 && <><h4>Attachments · {files.length}</h4><ul className="attachments">{files.map(file=><li className="attachment" key={`${file.name}-${file.lastModified}-${file.size}`}><File size={21}/><div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></div></li>)}</ul></>}<div className="review-notice">Your typed notes will be sent to the scoring backend. The saved result replaces your previous score for this talk and refreshes the leaderboard. File extraction is not connected yet.</div><p className="talk-schedule-note">Submitting as <strong>{attendee.name}</strong> · Demo browser identity</p>{submitError && <div className="upload-errors" role="alert">{submitError} Your notes are still in this draft.</div>}<div className="review-actions"><button className="browse-button" onClick={()=>setStep('edit')}>Edit notes</button><button className="dark-button" disabled={!ready} onClick={submit}>{submitError ? 'Try scoring again' : 'Submit notes for scoring'} <ArrowRight size={16}/></button></div></div>}
  </section><aside className="notes-guide"><span className="little-spark"><AudioLines size={23}/></span><h3>Understanding comes first.</h3><p>Your notes will be compared with the speaker’s transcript to identify the ideas you understood.</p><ol><li><strong>Capture your perspective</strong><span>Use your own words. It’s about the ideas, not copying the transcript.</span></li><li><strong>Bring your notes</strong><span>Typed, handwritten, or exported from your favorite app.</span></li><li><strong>See what clicked</strong><span>Planned: key idea feedback, a session score, and learning points.</span></li></ol><div className="file-support"><Image size={19}/><div><strong>A photo works, too.</strong><p>Use good lighting and keep the whole page in frame.</p></div></div><p className="integration-note">Live scoring currently accepts typed notes only. Attaching a file disables scoring until it is removed. Photo and document extraction can be connected later.</p></aside></div>;
}
