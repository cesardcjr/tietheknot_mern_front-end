import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import Swal from 'sweetalert2';
import * as api from '../api';

const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 700;
const CATEGORIES = ['Principal', 'Secondary', 'Family', 'Friends', 'VIP', 'Others'];
const newId = () => globalThis.crypto?.randomUUID?.() || `element-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function defaultTablePosition(index, kind) {
  const width = kind === 'presidential' ? 280 : kind === 'free' ? 190 : 150;
  const height = kind === 'presidential' ? 105 : kind === 'free' ? 130 : 150;
  return { x: 55 + (index % 5) * 220, y: 55 + (Math.floor(index / 5) % 4) * 170, width, height };
}

function migrateLegacyPlan(eventData) {
  const elements = [];
  const regularCount = Number(eventData?.seatingSettings?.tableCount || 0);
  const presidentialCount = Number(eventData?.presidentialSettings?.tableCount || 0);
  for (let number = 1; number <= regularCount; number += 1) {
    elements.push({ id: newId(), type: 'table', tableKind: 'round', tableType: 'regular', tableNumber: number, label: `Table ${number}`, seatCount: Number(eventData.seatingSettings?.maxPerTable || 10), rotation: 0, ...defaultTablePosition(elements.length, 'round') });
  }
  for (let number = 1; number <= presidentialCount; number += 1) {
    elements.push({ id: newId(), type: 'table', tableKind: 'presidential', tableType: 'presidential', tableNumber: number, label: `Presidential ${number}`, seatCount: Math.min(24, Number(eventData.presidentialSettings?.maxPerTable || 12)), rotation: 0, ...defaultTablePosition(elements.length, 'presidential') });
  }
  return {
    paperSize: eventData?.seatingFloorPlan?.paperSize || 'A4',
    canvasWidth: Number(eventData?.seatingFloorPlan?.canvasWidth || DEFAULT_CANVAS_WIDTH),
    canvasHeight: Number(eventData?.seatingFloorPlan?.canvasHeight || DEFAULT_CANVAS_HEIGHT),
    elements,
  };
}

function ChairRing({ count, kind }) {
  const chairs = Array.from({ length: Math.min(Number(count) || 0, 50) });
  if (kind === 'presidential') {
    return <>{chairs.map((_, index) => {
      const top = index < Math.ceil(chairs.length / 2);
      const rowCount = top ? Math.ceil(chairs.length / 2) : Math.floor(chairs.length / 2);
      const rowIndex = top ? index : index - Math.ceil(chairs.length / 2);
      return <span key={index} className="floor-chair floor-chair-long" style={{ left: `${((rowIndex + 1) / (rowCount + 1)) * 100}%`, top: top ? '0' : '100%' }} />;
    })}</>;
  }
  return <>{chairs.map((_, index) => {
    const angle = ((index / chairs.length) * Math.PI * 2) - (Math.PI / 2);
    return <span key={index} className="floor-chair" style={{ left: `${50 + Math.cos(angle) * 57}%`, top: `${50 + Math.sin(angle) * 57}%` }} />;
  })}</>;
}

export default function Seating() {
  const { eventData, setEventData } = useApp();
  const [plan, setPlan] = useState({ paperSize: 'A4', canvasWidth: DEFAULT_CANVAS_WIDTH, canvasHeight: DEFAULT_CANVAS_HEIGHT, elements: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [tableModal, setTableModal] = useState(null);
  const [guestSearch, setGuestSearch] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestDraft, setGuestDraft] = useState({ name: '', pax: 1, category: 'Family' });
  const [editingGuest, setEditingGuest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(0.75);
  const [printModal, setPrintModal] = useState(false);
  const [canvasDraft, setCanvasDraft] = useState({ width: String(DEFAULT_CANVAS_WIDTH), height: String(DEFAULT_CANVAS_HEIGHT) });
  const planRef = useRef(plan);
  const hydratedRef = useRef(false);
  const movedRef = useRef(false);

  useEffect(() => { planRef.current = plan; }, [plan]);
  useEffect(() => {
    setCanvasDraft({ width: String(Math.round(plan.canvasWidth || DEFAULT_CANVAS_WIDTH)), height: String(Math.round(plan.canvasHeight || DEFAULT_CANVAS_HEIGHT)) });
  }, [plan.canvasWidth, plan.canvasHeight]);
  useEffect(() => {
    if (!eventData || hydratedRef.current) return;
    hydratedRef.current = true;
    const stored = eventData.seatingFloorPlan;
    const next = stored?.elements?.length ? stored : migrateLegacyPlan(eventData);
    setPlan(next);
    planRef.current = next;
    if (!stored?.elements?.length && next.elements.length) {
      api.updateSeatingFloorPlan(next).then((res) => setEventData((prev) => ({ ...prev, seatingFloorPlan: res.data }))).catch(() => {});
    }
  }, [eventData, setEventData]);

  const guests = eventData?.guests || [];
  const seating = eventData?.seating || {};
  const presidentialSeating = eventData?.presidentialSeating || {};
  const tableElements = plan.elements.filter((element) => element.type === 'table');
  const canvasWidth = Number(plan.canvasWidth || DEFAULT_CANVAS_WIDTH);
  const canvasHeight = Number(plan.canvasHeight || DEFAULT_CANVAS_HEIGHT);
  const selected = plan.elements.find((element) => element.id === selectedId);
  const guestFor = (reference) => guests.find((guest) => String(guest._id) === String(reference) || guest.name === reference);
  const guestsFor = (references = []) => references.map(guestFor).filter(Boolean);
  const guestPax = (guest) => guest?.rsvpStatus === 'Accepted' ? Number(guest.attendingPax || guest.pax || 1) : Number(guest?.pax || 1);
  const tableGuests = (element) => guestsFor((element?.tableType === 'presidential' ? presidentialSeating[element?.tableNumber] : seating[element?.tableNumber]) || []);
  const occupiedPax = (element) => tableGuests(element).reduce((total, guest) => total + guestPax(guest), 0);
  const stats = useMemo(() => {
    const totalSeats = tableElements.reduce((sum, table) => sum + Number(table.seatCount || 0), 0);
    const seated = guests.filter((guest) => guest.status === 'Seated').reduce((sum, guest) => sum + guestPax(guest), 0);
    return { tables: tableElements.length, seats: totalSeats, seated, available: Math.max(0, totalSeats - seated) };
  }, [tableElements, guests]);

  if (!eventData) return <div className="page-loading"><i className="fa fa-spinner fa-spin" /> Loading…</div>;

  const patchData = (updates) => setEventData((prev) => ({ ...prev, ...updates }));
  const applySeatingResponse = (data) => patchData({ seating: data.seating, presidentialSeating: data.presidentialSeating, seatingSettings: data.seatingSettings, presidentialSettings: data.presidentialSettings, seatingFloorPlan: data.seatingFloorPlan || planRef.current, guests: data.guests });

  const persistPlan = async (next, quiet = true) => {
    const normalized = {
      paperSize: next.paperSize || 'A4',
      canvasWidth: Number(next.canvasWidth || DEFAULT_CANVAS_WIDTH),
      canvasHeight: Number(next.canvasHeight || DEFAULT_CANVAS_HEIGHT),
      elements: next.elements,
    };
    planRef.current = normalized;
    setPlan(normalized);
    setSaving(true);
    try {
      const res = await api.updateSeatingFloorPlan(normalized);
      planRef.current = res.data;
      setPlan(res.data);
      patchData({ seatingFloorPlan: res.data });
      if (!quiet) Swal.fire({ icon: 'success', title: 'Floor plan saved', timer: 1000, showConfirmButton: false });
      return res.data;
    } catch (error) {
      Swal.fire({ icon: 'warning', title: 'Unable to save layout', text: error.response?.data?.message || 'Please try again.', confirmButtonColor: '#226b45' });
      return null;
    } finally { setSaving(false); }
  };

  const setElement = (id, updates) => {
    const next = { ...planRef.current, elements: planRef.current.elements.map((item) => item.id === id ? { ...item, ...updates } : item) };
    planRef.current = next;
    setPlan(next);
  };

  const addTable = async (kind) => {
    const isPresidential = kind === 'presidential';
    const result = await Swal.fire({
      title: kind === 'round' ? 'Add Round Table' : isPresidential ? 'Add Presidential Table' : 'Add Free Shape Table',
      html: `<label class="floor-swal-label">Seat count</label><input id="floorSeats" class="swal2-input" type="number" min="1" max="${isPresidential ? 24 : 50}" value="${isPresidential ? 12 : 8}">${kind === 'free' ? '<label class="floor-swal-label">Label</label><input id="floorLabel" class="swal2-input" maxlength="80" value="Custom Table">' : ''}`,
      showCancelButton: true, confirmButtonText: 'Add to floor plan', confirmButtonColor: '#226b45',
      preConfirm: () => {
        const seatCount = Number(document.getElementById('floorSeats')?.value);
        const label = document.getElementById('floorLabel')?.value?.trim();
        if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > (isPresidential ? 24 : 50)) { Swal.showValidationMessage(`Enter 1–${isPresidential ? 24 : 50} seats`); return false; }
        return { seatCount, label };
      },
    });
    if (!result.isConfirmed) return;
    try {
      const tableType = isPresidential ? 'presidential' : 'regular';
      const settingsKey = isPresidential ? 'presidentialSettings' : 'seatingSettings';
      const currentSettings = eventData[settingsKey] || {};
      const tableNumber = Number(currentSettings.tableCount || 0) + 1;
      const settings = { ...currentSettings, tableCount: tableNumber, maxPerTable: Math.max(Number(currentSettings.maxPerTable || 1), result.value.seatCount) };
      if (!isPresidential) settings.initialized = true;
      if (isPresidential) await api.updatePresidentialSettings(settings); else await api.updateSeatingSettings(settings);
      patchData({ [settingsKey]: settings });
      const element = { id: newId(), type: 'table', tableKind: kind, tableType, tableNumber, label: result.value.label || (isPresidential ? `Presidential ${tableNumber}` : `Table ${tableNumber}`), seatCount: result.value.seatCount, rotation: 0, ...defaultTablePosition(tableElements.length, kind) };
      await persistPlan({ ...planRef.current, elements: [...planRef.current.elements, element] });
      setSelectedId(element.id);
    } catch (error) { Swal.fire({ icon: 'error', title: 'Unable to add table', text: error.response?.data?.message || 'Please try again.' }); }
  };

  const addShape = async (shapeKind) => {
    let label = shapeKind === 'stage' ? 'STAGE' : shapeKind === 'dance-floor' ? 'DANCE FLOOR' : 'VENUE MARKER';
    if (shapeKind === 'custom') {
      const result = await Swal.fire({ title: 'Add Custom Shape', input: 'text', inputLabel: 'Label or marker text', inputValue: label, inputAttributes: { maxlength: '80' }, showCancelButton: true, confirmButtonColor: '#226b45' });
      if (!result.isConfirmed) return;
      label = result.value?.trim() || label;
    }
    const element = { id: newId(), type: 'shape', shapeKind, label, x: 110, y: 90, width: shapeKind === 'stage' ? 460 : 260, height: shapeKind === 'stage' ? 80 : 150, rotation: 0, seatCount: 0 };
    await persistPlan({ ...planRef.current, elements: [...planRef.current.elements, element] });
    setSelectedId(element.id);
  };

  const addChair = async () => {
    const element = { id: newId(), type: 'chair', label: 'Chair', x: 80, y: 80, width: 44, height: 44, rotation: 0, seatCount: 0 };
    await persistPlan({ ...planRef.current, elements: [...planRef.current.elements, element] });
    setSelectedId(element.id);
  };

  const deleteElement = async (element) => {
    const result = await Swal.fire({ icon: 'warning', title: element.type === 'table' ? `Delete ${element.label}?` : 'Delete shape?', text: element.type === 'table' ? 'Assigned guests will return to Not Seated.' : 'This venue element will be removed.', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#c0392b' });
    if (!result.isConfirmed) return;
    if (element.type === 'table') {
      const res = await api.deleteSeatingTable(element.tableType, element.tableNumber);
      applySeatingResponse(res.data);
      const serverPlan = res.data.seatingFloorPlan || { ...planRef.current, elements: planRef.current.elements.filter((item) => item.id !== element.id) };
      planRef.current = serverPlan;
      setPlan(serverPlan);
    } else await persistPlan({ ...planRef.current, elements: planRef.current.elements.filter((item) => item.id !== element.id) });
    setSelectedId(null);
    setTableModal(null);
  };

  const startMove = (event, element, mode = 'move') => {
    event.stopPropagation(); setSelectedId(element.id); movedRef.current = false;
    const bounds = event.currentTarget.closest('.floor-canvas').getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY, element: { ...element } };
    const onMove = (moveEvent) => {
      const dx = ((moveEvent.clientX - start.x) / bounds.width) * canvasWidth;
      const dy = ((moveEvent.clientY - start.y) / bounds.height) * canvasHeight;
      if (Math.abs(dx) + Math.abs(dy) > 2) movedRef.current = true;
      if (mode === 'resize') setElement(element.id, { width: clamp(start.element.width + dx, 40, canvasWidth - start.element.x), height: clamp(start.element.height + dy, 40, canvasHeight - start.element.y) });
      else setElement(element.id, { x: clamp(start.element.x + dx, 0, canvasWidth - start.element.width), y: clamp(start.element.y + dy, 0, canvasHeight - start.element.height) });
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); if (movedRef.current) persistPlan(planRef.current); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const resizeCanvas = (width, height, persist = false) => {
    const requiredWidth = Math.max(400, ...planRef.current.elements.map((element) => Math.ceil(element.x + element.width)));
    const requiredHeight = Math.max(300, ...planRef.current.elements.map((element) => Math.ceil(element.y + element.height)));
    const next = {
      ...planRef.current,
      canvasWidth: clamp(Number(width) || DEFAULT_CANVAS_WIDTH, requiredWidth, 3000),
      canvasHeight: clamp(Number(height) || DEFAULT_CANVAS_HEIGHT, requiredHeight, 2000),
    };
    planRef.current = next;
    setPlan(next);
    setCanvasDraft({ width: String(Math.round(next.canvasWidth)), height: String(Math.round(next.canvasHeight)) });
    if (persist) persistPlan(next);
  };

  const startCanvasResize = (event) => {
    event.preventDefault(); event.stopPropagation();
    const start = { x: event.clientX, y: event.clientY, width: canvasWidth, height: canvasHeight };
    const onMove = (moveEvent) => resizeCanvas(start.width + ((moveEvent.clientX - start.x) / zoom), start.height + ((moveEvent.clientY - start.y) / zoom));
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); persistPlan(planRef.current); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const openTable = (element) => {
    movedRef.current = false;
    setTableModal({ id: element.id, tableType: element.tableType, tableNumber: element.tableNumber });
    setGuestSearch(''); setAddingGuest(false); setEditingGuest(null);
  };
  const modalTable = tableModal ? plan.elements.find((element) => element.id === tableModal.id) : null;
  const modalGuests = modalTable ? tableGuests(modalTable) : [];
  const modalOccupied = modalTable ? occupiedPax(modalTable) : 0;
  const availableGuests = modalTable ? guests.filter((guest) => guest.status !== 'Seated' && (!guestSearch || guest.name.toLowerCase().includes(guestSearch.toLowerCase()))).slice(0, 10) : [];

  const assignGuest = async (guest) => {
    try { const res = await api.assignSeat({ type: modalTable.tableType, tableNumber: modalTable.tableNumber, guestId: guest._id }); applySeatingResponse(res.data); setGuestSearch(''); }
    catch (error) { Swal.fire({ icon: 'warning', title: 'Unable to seat guest', text: error.response?.data?.message || 'Please try again.', confirmButtonColor: '#226b45' }); }
  };
  const unassignGuest = async (guest) => { const res = await api.removeSeat({ guestId: guest._id }); applySeatingResponse(res.data); };
  const createAndAssignGuest = async (event) => {
    event.preventDefault();
    const name = guestDraft.name.trim(); const pax = Number(guestDraft.pax);
    if (!name || !Number.isInteger(pax) || pax < 1) return;
    if (modalOccupied + pax > modalTable.seatCount) return Swal.fire({ icon: 'warning', title: 'Not enough seats', text: `${modalTable.label} has ${modalTable.seatCount - modalOccupied} available seats.` });
    try {
      const created = await api.addGuest({ name, pax, category: guestDraft.category });
      patchData({ guests: [...guests, created.data] });
      await assignGuest(created.data);
      setGuestDraft({ name: '', pax: 1, category: 'Family' }); setAddingGuest(false);
    } catch (error) { Swal.fire({ icon: 'warning', title: 'Unable to add guest', text: error.response?.data?.message || 'Please try again.' }); }
  };
  const saveGuestEdit = async (event) => {
    event.preventDefault();
    const pax = Number(editingGuest.pax);
    const otherPax = modalOccupied - guestPax(guestFor(editingGuest._id));
    if (!editingGuest.name.trim() || pax < 1 || otherPax + pax > modalTable.seatCount) return Swal.fire({ icon: 'warning', title: 'Check guest details', text: 'A name is required and the updated pax must fit at this table.' });
    const res = await api.updateGuest(editingGuest._id, { name: editingGuest.name.trim(), pax, category: editingGuest.category });
    patchData({ guests: guests.map((guest) => String(guest._id) === String(res.data._id) ? res.data : guest) }); setEditingGuest(null);
  };
  const canvasRatio = canvasWidth / canvasHeight;
  const printSetup = canvasRatio >= 1.65
    ? { paper: 'legal', label: 'Legal', orientation: 'landscape' }
    : canvasRatio >= 1
      ? { paper: 'A4', label: 'A4', orientation: 'landscape' }
      : { paper: 'A4', label: 'A4', orientation: 'portrait' };
  const printFloorPlan = () => {
    const style = document.createElement('style'); style.id = 'seating-print-page-size';
    style.textContent = `@page { size: ${printSetup.paper} ${printSetup.orientation}; margin: 10mm; }`;
    document.getElementById(style.id)?.remove(); document.head.appendChild(style);
    setPrintModal(false);
    window.setTimeout(() => window.print(), 80);
  };
  const resetFloorPlan = async () => {
    const result = await Swal.fire({ icon: 'warning', title: 'Reset seating plan?', text: 'All tables, venue shapes, and assignments will be cleared.', showCancelButton: true, confirmButtonText: 'Reset everything', confirmButtonColor: '#c0392b' });
    if (!result.isConfirmed) return;
    const res = await api.resetSeatingPlan(); applySeatingResponse(res.data);
    const empty = res.data.seatingFloorPlan || { paperSize: 'A4', canvasWidth, canvasHeight, elements: [] }; planRef.current = empty; setPlan(empty); setSelectedId(null);
  };

  return (
    <div className="floor-plan-page">
      <div className="page-header-row floor-page-header">
        <div><h2 className="page-title">Seating Plan</h2><p className="page-subtitle">Build your venue layout and seat guests visually.</p></div>
        <div className="page-header-actions no-print"><span className={`floor-save-state ${saving ? 'saving' : ''}`}><i className={`fa ${saving ? 'fa-spinner fa-spin' : 'fa-cloud-check'}`} /> {saving ? 'Saving…' : 'Saved'}</span><button className="btn-outline" onClick={() => setPrintModal(true)}><i className="fa fa-print" /> Print to PDF</button><button className="btn-outline btn-danger-outline" onClick={resetFloorPlan}><i className="fa fa-rotate-left" /> Reset</button></div>
      </div>
      <div className="floor-stats" aria-label="Seating statistics">
        <div><i className="fa fa-table-cells-large" /><span><strong>{stats.tables}</strong>Total tables</span></div><div><i className="fa fa-chair" /><span><strong>{stats.seats}</strong>Total seats</span></div><div><i className="fa fa-user-check" /><span><strong>{stats.seated}</strong>Seated guests</span></div><div><i className="fa fa-user-plus" /><span><strong>{stats.available}</strong>Available seats</span></div>
      </div>
      <div className="floor-toolbar no-print" aria-label="Floor plan tools">
        <div className="floor-tool-group"><span>Tables</span><button onClick={() => addTable('round')}><i className="fa fa-circle" /> Round</button><button onClick={() => addTable('presidential')}><i className="fa fa-crown" /> Presidential</button><button onClick={() => addTable('free')}><i className="fa fa-vector-square" /> Free shape</button></div>
        <div className="floor-tool-divider" /><div className="floor-tool-group"><span>Venue elements</span><button onClick={addChair}><i className="fa fa-chair" /> Chair</button><button onClick={() => addShape('stage')}><i className="fa fa-microphone" /> Stage</button><button onClick={() => addShape('dance-floor')}><i className="fa fa-music" /> Dance floor</button><button onClick={() => addShape('custom')}><i className="fa fa-shapes" /> Marker</button></div>
        <div className="floor-tool-divider" /><div className="floor-tool-group floor-canvas-tools"><span>Canvas</span><label>W <input aria-label="Canvas width" type="number" min="400" max="3000" value={canvasDraft.width} onChange={(event) => setCanvasDraft((draft) => ({ ...draft, width: event.target.value }))} onBlur={() => resizeCanvas(canvasDraft.width, canvasDraft.height, true)} /></label><label>H <input aria-label="Canvas height" type="number" min="300" max="2000" value={canvasDraft.height} onChange={(event) => setCanvasDraft((draft) => ({ ...draft, height: event.target.value }))} onBlur={() => resizeCanvas(canvasDraft.width, canvasDraft.height, true)} /></label><button aria-label="Zoom out" onClick={() => setZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.35, 1.5))}><i className="fa fa-magnifying-glass-minus" /></button><output>{Math.round(zoom * 100)}%</output><button aria-label="Zoom in" onClick={() => setZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.35, 1.5))}><i className="fa fa-magnifying-glass-plus" /></button></div>
      </div>
      <div className="floor-workspace">
        <div className="floor-canvas-wrap"><div id="seating-floor-print" className="floor-canvas" style={{ width: `${canvasWidth * zoom}px`, height: `${canvasHeight * zoom}px`, '--canvas-ratio': `${canvasWidth} / ${canvasHeight}` }} onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <div className="floor-print-heading"><strong>Venue Seating Plan</strong><span>{stats.tables} tables · {stats.seats} seats · {stats.seated} guests seated</span></div>
          {plan.elements.map((element) => {
            const isTable = element.type === 'table'; const assigned = isTable ? tableGuests(element) : []; const used = isTable ? occupiedPax(element) : 0;
            return <div key={element.id} className={`floor-element floor-${element.type === 'chair' ? 'single-chair' : element.type} floor-${element.tableKind || element.shapeKind || 'chair-item'}${selectedId === element.id ? ' selected' : ''}`} style={{ left: `${(element.x / canvasWidth) * 100}%`, top: `${(element.y / canvasHeight) * 100}%`, width: `${(element.width / canvasWidth) * 100}%`, height: `${(element.height / canvasHeight) * 100}%`, transform: `rotate(${element.rotation || 0}deg)` }} onPointerDown={(event) => startMove(event, element)} onClick={() => setSelectedId(element.id)} title={assigned.length ? assigned.map((guest) => guest.name).join(', ') : element.label} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(element.id); }}>
              {isTable && <ChairRing count={element.seatCount} kind={element.tableKind} />}{element.type === 'chair' && <i className="fa fa-chair floor-single-chair-icon" aria-hidden="true" />}<div className="floor-element-body">{isTable && <span className="floor-table-number">{element.tableKind === 'presidential' ? <i className="fa fa-crown" /> : element.tableNumber}</span>}{element.type !== 'chair' && <strong>{element.label}</strong>}{isTable && <small>{used}/{element.seatCount} seats</small>}</div>{selectedId === element.id && <button type="button" aria-label="Resize element" className="floor-resize-handle no-print" onPointerDown={(event) => startMove(event, element, 'resize')} />}
            </div>;
          })}
          {!plan.elements.length && <div className="floor-empty"><i className="fa fa-table-cells-large" /><strong>Your venue is ready to design</strong><span>Add a table, stage, or dance floor from the toolbar.</span></div>}
          <button type="button" className="floor-canvas-resize no-print" aria-label="Resize canvas" title="Drag to resize canvas" onPointerDown={startCanvasResize}><i className="fa fa-up-right-and-down-left-from-center" /></button>
        </div></div>
        <aside className="floor-properties no-print"><div className="floor-properties-title"><i className="fa fa-sliders" /> Properties</div>
          {!selected && <div className="floor-properties-empty"><i className="fa fa-arrow-pointer" /><span>Select an element to customize it.</span></div>}
          {selected && <><div className="floor-selected-type">{selected.type === 'table' ? `${selected.tableKind} table` : selected.type === 'chair' ? 'individual chair' : selected.shapeKind}</div><div className="form-group"><label>Label</label><input value={selected.label} maxLength="80" onChange={(event) => setElement(selected.id, { label: event.target.value })} onBlur={() => persistPlan(planRef.current)} /></div>
            {selected.type === 'table' && <div className="form-group"><label>Seats {selected.tableKind === 'presidential' && <span>(max 24)</span>}</label><input type="number" min={Math.max(1, occupiedPax(selected))} max={selected.tableKind === 'presidential' ? 24 : 50} value={selected.seatCount} onChange={(event) => setElement(selected.id, { seatCount: clamp(Number(event.target.value), Math.max(1, occupiedPax(selected)), selected.tableKind === 'presidential' ? 24 : 50) })} onBlur={() => persistPlan(planRef.current)} /></div>}
            <div className="floor-property-grid"><div className="form-group"><label>Width</label><input key={`${selected.id}-width-${Math.round(selected.width)}`} type="number" min="40" max={canvasWidth - selected.x} defaultValue={Math.round(selected.width)} onBlur={(event) => { setElement(selected.id, { width: clamp(Number(event.target.value) || selected.width, 40, canvasWidth - selected.x) }); window.setTimeout(() => persistPlan(planRef.current), 0); }} /></div><div className="form-group"><label>Height</label><input key={`${selected.id}-height-${Math.round(selected.height)}`} type="number" min="40" max={canvasHeight - selected.y} defaultValue={Math.round(selected.height)} onBlur={(event) => { setElement(selected.id, { height: clamp(Number(event.target.value) || selected.height, 40, canvasHeight - selected.y) }); window.setTimeout(() => persistPlan(planRef.current), 0); }} /></div></div>
            <div className="form-group"><label>Rotation</label><input type="range" min="-180" max="180" value={selected.rotation || 0} onChange={(event) => setElement(selected.id, { rotation: Number(event.target.value) })} onPointerUp={() => persistPlan(planRef.current)} /><span className="floor-range-value">{selected.rotation || 0}°</span></div>
            {selected.type === 'table' && <button className="btn-primary floor-manage-btn" onClick={() => openTable(selected)}><i className="fa fa-users" /> Manage guests</button>}<button className="btn-outline btn-danger-outline floor-delete-btn" onClick={() => deleteElement(selected)}><i className="fa fa-trash" /> Delete element</button></>}
        </aside>
      </div>
      {modalTable && <Modal title={`${modalTable.label} — Guest Assignment`} onClose={() => setTableModal(null)}>
        <div className="seat-modal-summary"><span><strong>{modalOccupied}</strong> seated pax</span><span><strong>{modalTable.seatCount - modalOccupied}</strong> available</span><span><strong>{modalTable.seatCount}</strong> total seats</span></div>
        <div className="seat-modal-section"><div className="seat-modal-section-head"><label>Assign from Guest List</label><button type="button" className="btn-link" onClick={() => setAddingGuest((value) => !value)}><i className="fa fa-user-plus" /> Add new guest</button></div><div className="seat-guest-search"><i className="fa fa-search" /><input placeholder="Search unseated guests…" value={guestSearch} onChange={(event) => setGuestSearch(event.target.value)} /></div>
          {guestSearch && <div className="seat-search-results">{availableGuests.map((guest) => <button key={guest._id} onClick={() => assignGuest(guest)}><span><strong>{guest.name}</strong><small>{guest.category} · {guestPax(guest)} pax</small></span><i className="fa fa-plus" /></button>)}{!availableGuests.length && <p>No available guests match your search.</p>}</div>}
          {addingGuest && <form className="seat-inline-form" onSubmit={createAndAssignGuest}><input aria-label="Guest name" placeholder="Guest name" value={guestDraft.name} onChange={(event) => setGuestDraft({ ...guestDraft, name: event.target.value })} required /><input aria-label="Guest pax" type="number" min="1" max="50" value={guestDraft.pax} onChange={(event) => setGuestDraft({ ...guestDraft, pax: event.target.value })} required /><select aria-label="Guest category" value={guestDraft.category} onChange={(event) => setGuestDraft({ ...guestDraft, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><button className="btn-primary" type="submit">Add & seat</button></form>}
        </div>
        <div className="seat-modal-section"><label>Guests at this table</label><div className="seat-assigned-list">{modalGuests.map((guest) => editingGuest?._id === guest._id ? <form key={guest._id} className="seat-edit-row" onSubmit={saveGuestEdit}><input value={editingGuest.name} onChange={(event) => setEditingGuest({ ...editingGuest, name: event.target.value })} /><input aria-label="Pax" type="number" min="1" max="50" value={editingGuest.pax} onChange={(event) => setEditingGuest({ ...editingGuest, pax: event.target.value })} /><select value={editingGuest.category} onChange={(event) => setEditingGuest({ ...editingGuest, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><button className="btn-icon-sm" type="submit" aria-label="Save guest"><i className="fa fa-check" /></button><button className="btn-icon-sm" type="button" aria-label="Cancel edit" onClick={() => setEditingGuest(null)}><i className="fa fa-times" /></button></form> : <div key={guest._id} className="seat-assigned-row"><span className="seat-avatar">{guest.name.charAt(0).toUpperCase()}</span><span><strong>{guest.name}</strong><small>{guest.category} · {guestPax(guest)} pax</small></span><button className="btn-icon-sm" aria-label={`Edit ${guest.name}`} onClick={() => setEditingGuest({ _id: guest._id, name: guest.name, pax: guest.pax || 1, category: guest.category })}><i className="fa fa-pen" /></button><button className="btn-icon-sm danger" aria-label={`Unassign ${guest.name}`} onClick={() => unassignGuest(guest)}><i className="fa fa-user-minus" /></button></div>)}{!modalGuests.length && <div className="seat-empty-guests"><i className="fa fa-chair" /> No guests assigned yet.</div>}</div></div>
        <div className="modal-footer"><button className="btn-outline" onClick={() => setTableModal(null)}>Done</button></div>
      </Modal>}
      {printModal && <Modal title="Print to PDF" onClose={() => setPrintModal(false)}>
        <div className="print-pdf-summary"><i className="fa fa-file-pdf" /><div><strong>Your complete canvas will be fitted automatically</strong><p>The {Math.round(canvasWidth)} × {Math.round(canvasHeight)} canvas will print on {printSetup.label} in {printSetup.orientation} orientation. Tables, chairs, labels, and venue shapes stay within one page.</p></div></div>
        <div className="print-pdf-steps"><span>1</span><p>Select <strong>Save as PDF</strong> as the printer.</p><span>2</span><p>Keep the automatically selected orientation and enable background graphics.</p></div>
        <div className="modal-footer"><button className="btn-outline" onClick={() => setPrintModal(false)}>Cancel</button><button className="btn-primary" onClick={printFloorPlan}><i className="fa fa-print" /> Open Print to PDF</button></div>
      </Modal>}
    </div>
  );
}
