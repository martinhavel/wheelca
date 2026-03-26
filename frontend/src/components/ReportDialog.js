'use client';

import { useState } from 'react';
import { BARRIER_TYPES } from '../lib/constants';

export default function ReportDialog({ position, onSubmit, onClose }) {
  const [type, setType] = useState('steps');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState(2);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nahlásit bariéru</h3>
          <button className="btn-icon" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p className="text-muted text-sm">
          Pozice: {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </p>
        <label className="form-label">Typ bariéry</label>
        <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
          {BARRIER_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
        <label className="form-label">Popis</label>
        <textarea className="form-input" placeholder="Volitelný popis..." value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
        <label className="form-label">Závažnost: {['Mírná', 'Střední', 'Blokující'][severity - 1]}</label>
        <input type="range" min={1} max={3} value={severity} onChange={e => setSeverity(+e.target.value)} />
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => onSubmit({ barrier_type: type, description: desc, severity })}>
            Odeslat
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Zrušit</button>
        </div>
      </div>
    </div>
  );
}
