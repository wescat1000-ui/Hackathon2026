import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, File, Image, Upload, X, AudioLines, Sparkles } from 'lucide-react';

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
export default function SessionNotes({ onSave, draft, setDraft }) {
  const { talk, speaker, notes, files } = draft;
  const [errors, setErrors] = useState([]);
  const [step, setStep] = useState('edit');
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
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
  const ready = talk.trim() && (notes.trim() || files.length);
  if (step === 'saved') return <section className="notes-success" aria-live="polite"><span className="success-icon"><Check size={30}/></span><span className="eyebrow">DEMO SUBMISSION SAVED</span><h2>Your ideas are ready for the next step.</h2><p><strong>{talk}</strong>{speaker && ` · ${speaker}`}<br/>{files.length} attachment{files.length !== 1 ? 's' : ''}{notes.trim() && ' + typed notes'}</p><div className="pending-score"><Sparkles size={19}/><div><strong>Understanding score: pending integration</strong><p>No files have been uploaded or analyzed. Your notes and files stay in memory in this tab and reset on refresh.</p></div></div><button className="dark-button" onClick={()=>setStep('edit')}>Back to my notes <ArrowRight size={16}/></button></section>;
  return <div className="notes-layout"><section className="notes-panel"><div className="section-heading"><div><span className="eyebrow">YOUR IDEAS, IN YOUR FORMAT</span><h2>{step === 'review' ? 'One last look.' : 'Capture a session'}</h2></div><span className="subtle-tag">{step === 'review' ? '02 / REVIEW' : '01 / ADD NOTES'}</span></div><p className="notes-intro">{step === 'review' ? 'Check the talk and attachments before saving your demo submission.' : 'Upload a photo of your notebook, attach a document, or write your takeaways right here.'}</p>
  {step === 'edit' ? <form onSubmit={e=>{e.preventDefault(); if (ready) { trackEvent('rally.notes.reviewed', { file_count: files.length, has_typed_notes: !!notes.trim() }); setStep('review'); }}}><div className="session-fields"><label>Talk title <span>Required</span><input value={talk} onChange={e=>update('talk',e.target.value)} placeholder="Which talk did you attend?" required maxLength={200}/></label><label>Speaker <span>Optional</span><input value={speaker} onChange={e=>update('speaker',e.target.value)} placeholder="Who was speaking?" maxLength={120}/></label></div>
    <label className="field-label" htmlFor="note-files">Attach your notes</label><div className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files)}}><span className="upload-icon"><Upload size={25}/></span><strong>Drop your notes here</strong><p>Photos, PDFs, documents, or any other file type</p><button className="browse-button" type="button" onClick={()=>input.current.click()}>Choose files <ArrowRight size={14}/></button><small>Up to 10 files · 20 MB per file</small><input id="note-files" className="file-input" type="file" multiple ref={input} onChange={e=>{addFiles(e.target.files);e.target.value='';}}/></div>
    {errors.length>0 && <div className="upload-errors" role="alert">{errors.map((error,i)=><p key={i}>{error}</p>)}</div>}
    {files.length>0 && <><div className="attachment-count" aria-live="polite">{files.length} / 10 files attached</div><ul className="attachments">{files.map((file,i)=><Attachment key={`${file.name}-${file.lastModified}-${file.size}`} attachment={file} remove={()=>update('files', files.filter((_,index)=>index!==i))}/>)}</ul></>}
    <label className="field-label" htmlFor="session-notes">Your takeaways <span>Optional if you attach a file</span></label><textarea id="session-notes" value={notes} onChange={e=>update('notes',e.target.value)} placeholder="What was the main idea? What clicked for you? What would you explain to someone who missed the talk?" rows={7}/><div className="notes-form-footer"><span>Add a talk title and notes or a file to continue.</span><button className="dark-button" disabled={!ready}>Review notes <ArrowRight size={16}/></button></div></form> : <div className="notes-review"><span className="eyebrow">SESSION</span><h3>{talk}</h3>{speaker && <p>{speaker}</p>}{notes.trim() && <><h4>Your takeaways</h4><p className="review-text">{notes}</p></>}{files.length>0 && <><h4>Attachments · {files.length}</h4><ul className="attachments">{files.map(file=><li className="attachment" key={`${file.name}-${file.lastModified}-${file.size}`}><File size={21}/><div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></div></li>)}</ul></>}<div className="review-notice">Demo only: saving keeps this draft in memory. File extraction, understanding scores, and leaderboard points are not connected yet.</div><div className="review-actions"><button className="browse-button" onClick={()=>setStep('edit')}>Edit notes</button><button className="dark-button" onClick={()=>{trackEvent('rally.notes.demo_saved', { file_count: files.length, has_typed_notes: !!notes.trim() });onSave();setStep('saved');}}>Save demo submission <Check size={16}/></button></div></div>}
  </section><aside className="notes-guide"><span className="little-spark"><AudioLines size={23}/></span><h3>Understanding comes first.</h3><p>Your notes will be compared with the speaker’s transcript to identify the ideas you understood.</p><ol><li><strong>Capture your perspective</strong><span>Use your own words. It’s about the ideas, not copying the transcript.</span></li><li><strong>Bring your notes</strong><span>Typed, handwritten, or exported from your favorite app.</span></li><li><strong>See what clicked</strong><span>Planned: key idea feedback, a session score, and learning points.</span></li></ol><div className="file-support"><Image size={19}/><div><strong>A photo works, too.</strong><p>Use good lighting and keep the whole page in frame.</p></div></div><p className="integration-note">All file types can be attached in this demo. Extracting text—including handwriting—depends on backend format support. Unsupported files should receive a clear error when that service is connected.</p></aside></div>;
}
