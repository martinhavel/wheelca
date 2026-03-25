'use client';

import { useState } from 'react';
import { BARRIER_TYPES } from '../lib/constants';
import { t } from '../lib/i18n';

function getBarrierTypes(lang) {
  return [
    { value: 'steps', label: t('barrierSteps', lang) },
    { value: 'high_kerb', label: t('barrierKerb', lang) },
    { value: 'narrow_passage', label: t('barrierNarrow', lang) },
    { value: 'steep_slope', label: t('barrierSlope', lang) },
    { value: 'bad_surface', label: t('barrierSurface', lang) },
    { value: 'construction', label: t('barrierConstruction', lang) },
    { value: 'no_ramp', label: t('barrierNoRamp', lang) },
    { value: 'other', label: t('barrierOther', lang) }
  ];
}

export default function ReportDialog({ position, onSubmit, onClose, isOffline, lang }) {
  const [type, setType] = useState('steps');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState(2);
  const barrierTypes = getBarrierTypes(lang);
  const severityLevels = t('reportSeverityLevels', lang);

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
        {isOffline && (
          <div style={{ background: '#fef9c3', border: '1px solid #ca8a04', borderRadius: 6, padding: '6px 10px', margin: '8px 0', color: '#a16207', fontSize: 12 }}>
            {t('reportOfflineNote', lang)}
          </div>
        )}
        <p className="text-muted text-sm">
          {t('reportPosition', lang)} {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </p>
        <label className="form-label">{t('reportSeverityLabel', lang)}</label>
        <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
          {barrierTypes.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
        <label className="form-label">{t('reportDescLabel', lang)}</label>
        <textarea className="form-input" placeholder={t('reportDescOptional', lang)} value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
        <label className="form-label">{t('reportSeverity', lang)} {Array.isArray(severityLevels) ? severityLevels[severity - 1] : severity}</label>
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
