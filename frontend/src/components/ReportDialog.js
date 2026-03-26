'use client';

import { useState } from 'react';
import { BARRIER_TYPE_VALUES } from '../lib/constants';
import { t, getBarrierTypeLabel, getSeverityLabel } from '../lib/i18n';

export default function ReportDialog({ position, onSubmit, onClose, lang }) {
  const [type, setType] = useState('steps');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState(2);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('reportTitle', lang)}</h3>
          <button className="btn-icon" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p className="text-muted text-sm">
          {t('reportPosition', lang)} {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </p>
        <label className="form-label">{t('reportBarrierType', lang)}</label>
        <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
          {BARRIER_TYPE_VALUES.map(v => <option key={v} value={v}>{getBarrierTypeLabel(v, lang)}</option>)}
        </select>
        <label className="form-label">{t('reportDescription', lang)}</label>
        <textarea className="form-input" placeholder={t('reportDescPlaceholder', lang)} value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
        <label className="form-label">{t('reportSeverity', lang)} {getSeverityLabel(severity, lang)}</label>
        <input type="range" min={1} max={3} value={severity} onChange={e => setSeverity(+e.target.value)} />
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => onSubmit({ barrier_type: type, description: desc, severity })}>
            {t('reportSubmit', lang)}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>{t('cancel', lang)}</button>
        </div>
      </div>
    </div>
  );
}
