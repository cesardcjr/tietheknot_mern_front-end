export function fmt(n) {
  return Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function parseTime(t) {
  if (!t) return 0;
  const [time, mer] = t.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

export function isOverdue(dueDate, status) {
  if (!dueDate || status === 'Completed' || status === 'Cancelled') return false;
  return dueDate < today();
}

export function to12h(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const mer = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${mer}`;
}

export function circleProgressSVG(pct, size = 120, stroke = 10, color = '#226b45') {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return {
    size, r, circ, offset, color,
    pctLabel: Math.round(pct) + '%',
  };
}
