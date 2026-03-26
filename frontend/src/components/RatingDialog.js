'use client';

import { useState } from 'react';
import { t } from '../lib/i18n';

export default function RatingDialog({ poi, onSubmit, onClose, lang }) {
  const [rating, setRating] = useState(poi.properties?.wheelchair || 'yes');
  const [comment, setComment] = useState('');

  const RATING_OPTIONS = [
    { value: 'yes', label: t('rateYes', lang), color: '#22c55e', desc: t('rateYesDesc', lang) },
    { value: 'limited', label: t('rateLimited', lang), color: '#eab308', desc: t('rateLimitedDesc', lang) },
    { value: 'no', label: t('rateNo', lang), color: '#ef4444', desc: t('rateNoDesc', lang) },
  ];

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-dialog" onClick={e => e.stopPropagation()}>
        <h3>{t('rateTitle', lang)}</h3>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '8px 0' }}>
          {poi.properties?.name || t('noName', lang)}
        </p>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
          {poi.properties?.category || ''}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' }}>
          {RATING_OPTIONS.map(opt => (
            <label key={opt.value} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              background: rating === opt.value ? opt.color + '15' : 'var(--bg-secondary, #f5f5f5)',
              border: '2px solid ' + (rating === opt.value ? opt.color : 'var(--border, #e0e0e0)'),
              borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s'
            }}>
              <input type="radio" name="rating" value={opt.value}
                checked={rating === opt.value}
                onChange={() => setRating(opt.value)}
                style={{ width: 'auto', margin: 0 }} />
              <div>
                <div style={{ color: opt.color, fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <textarea
          placeholder={t('rateCommentPlaceholder', lang)}
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
        />

        <div className="report-actions">
          <button className="btn btn-primary" onClick={() => onSubmit({
            poi_id: poi.id,
            wheelchair_rating: rating,
            comment: comment || null,
          })}>
            {t('rateSubmit', lang)}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>{t('cancel', lang)}</button>
        </div>
      </div>
    </div>
  );
}
