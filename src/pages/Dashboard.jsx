import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import CircleProgress from "../components/CircleProgress";
import Swal from "sweetalert2";
import { fmt, parseTime } from "../utils/helpers";
import * as api from "../api";

export default function Dashboard({ onNavigate }) {
  const { eventData, setEventData } = useApp();
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", targetDate: "" });
  const [savingEvent, setSavingEvent] = useState(false);

  if (!eventData)
    return (
      <div className="page-loading">
        <i className="fa fa-spinner fa-spin" /> Loading…
      </div>
    );

  const {
    guestSettings,
    guests = [],
    seatingSettings,
    seating = {},
    presidentialSettings,
    presidentialSeating = {},
    expenseSettings,
    expenses = [],
    tasks = [],
    checklist = [],
    program = [],
    suppliers = [],
    event = null,
  } = eventData;

  // Calculate countdown
  const calculateCountdown = (targetDate) => {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    const weeks = Math.floor(daysLeft / 7);
    const months = Math.floor(daysLeft / 30);
    const remainingDays = daysLeft % 7;

    return { daysLeft: Math.max(0, daysLeft), weeks, months, remainingDays };
  };

  const patchData = (key, val) =>
    setEventData((prev) => ({ ...prev, [key]: val }));

  const saveEvent = async () => {
    if (!eventForm.title.trim()) {
      return Swal.fire({
        icon: "warning",
        title: "Event Title Required",
        confirmButtonColor: "#226b45",
      });
    }
    if (!eventForm.targetDate) {
      return Swal.fire({
        icon: "warning",
        title: "Target Date Required",
        confirmButtonColor: "#226b45",
      });
    }

    setSavingEvent(true);
    try {
      const res = event
        ? await api.updateEvent(eventForm)
        : await api.addEvent(eventForm);
      patchData("event", res.data);
      setEventForm({ title: "", targetDate: "" });
      setShowEventModal(false);
      Swal.fire({
        icon: "success",
        title: event ? "Event Updated!" : "Event Created!",
        text: `"${eventForm.title}" has been ${event ? "updated" : "created"}.`,
        timer: 1200,
        showConfirmButton: false,
        confirmButtonColor: "#226b45",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to save event.",
        confirmButtonColor: "#226b45",
      });
    }
    setSavingEvent(false);
  };

  const deleteEvent = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Event?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#226b45",
      cancelButtonColor: "#d63c3c",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;

    try {
      await api.deleteEvent();
      patchData("event", null);
      Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1000,
        showConfirmButton: false,
        confirmButtonColor: "#226b45",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete event.",
        confirmButtonColor: "#226b45",
      });
    }
  };

  const expectedGuests = guestSettings?.expectedGuests || 0;
  const guestPct =
    expectedGuests > 0
      ? Math.min(100, (guests.length / expectedGuests) * 100)
      : 0;

  const totalTables = seatingSettings?.tableCount || 0;
  const presTableCount = presidentialSettings?.tableCount || 0;
  const tablesUsed = Object.keys(seating).filter(
    (t) => seating[t]?.length > 0,
  ).length;
  const presUsed = Object.keys(presidentialSeating).filter(
    (t) => presidentialSeating[t]?.length > 0,
  ).length;
  const allTables = totalTables + presTableCount;
  const allUsed = tablesUsed + presUsed;
  const seatingPct =
    allTables > 0 ? Math.min(100, (allUsed / allTables) * 100) : 0;

  const budget = expenseSettings?.budget || 0;
  const totalExp = expenses.reduce((a, e) => a + Number(e.cost || 0), 0);
  const expPct = budget > 0 ? Math.min(100, (totalExp / budget) * 100) : 0;

  const activeTasks = tasks.filter((t) => t.status !== "Cancelled");
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const taskPct =
    activeTasks.length > 0 ? (completedTasks / activeTasks.length) * 100 : 0;

  const checkedItems = checklist.filter((c) => c.checked).length;
  const checklistPct =
    checklist.length > 0 ? (checkedItems / checklist.length) * 100 : 0;

  const cards = [
    {
      page: "guests",
      icon: "fa-users",
      label: "Guests",
      value: `${guests.length} / ${expectedGuests}`,
      pct: guestPct,
      color: "#226b45",
      ring: true,
    },
    {
      page: "seating",
      icon: "fa-chair",
      label: "Seating",
      value: `${allUsed} / ${allTables} tables`,
      pct: seatingPct,
      color: "#2d8c5a",
      ring: true,
    },
    {
      page: "expenses",
      icon: "fa-peso-sign",
      label: "Budget",
      value: `₱${fmt(totalExp)} / ₱${fmt(budget)}`,
      pct: expPct,
      color: "#c47d0a",
      ring: true,
    },
    {
      page: "tasks",
      icon: "fa-list-check",
      label: "Tasks",
      value: `${completedTasks} / ${activeTasks.length} active`,
      pct: taskPct,
      color: "#2b6cb0",
      ring: true,
    },
    {
      page: "checklist",
      icon: "fa-clipboard-check",
      label: "Checklist",
      value: `${checkedItems} / ${checklist.length} items`,
      pct: checklistPct,
      color: "#6b46c1",
      ring: true,
    },
    {
      page: "program",
      icon: "fa-calendar-days",
      label: "Program",
      value: `${program.length} activities`,
      pct: 0,
      color: "#226b45",
      ring: false,
    },
    {
      page: "suppliers",
      icon: "fa-handshake",
      label: "Suppliers",
      value: `${suppliers.length} listed`,
      pct: 0,
      color: "#226b45",
      ring: false,
    },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <h2 className="page-title">Planning Overview</h2>
        <p className="page-subtitle">Track every detail of your perfect day</p>
      </div>

      {/* Event Section */}
      {event ? (
        <div className="event-section">
          {(() => {
            const { daysLeft, weeks, months, remainingDays } =
              calculateCountdown(event.targetDate);
            return (
              <div className="event-countdown-card-single">
                <div className="event-card-header">
                  <div>
                    <h4>{event.title}</h4>
                    <small>
                      {new Date(event.targetDate).toLocaleDateString()}
                    </small>
                  </div>
                  <div className="event-actions">
                    <button
                      className="btn-outline"
                      onClick={() => {
                        setEventForm(event);
                        setShowEventModal(true);
                      }}
                      style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
                    >
                      <i className="fa fa-edit" /> Edit
                    </button>
                    <button
                      className="btn-icon"
                      onClick={deleteEvent}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#d63c3c",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                      }}
                    >
                      <i className="fa fa-trash" />
                    </button>
                  </div>
                </div>
                <div className="event-countdown">
                  <div className="countdown-number">{daysLeft}</div>
                  <div className="countdown-label">Days Left</div>
                </div>
                <div className="event-conversion">
                  {months > 0 && (
                    <span>
                      {months} month{months !== 1 ? "s" : ""}
                    </span>
                  )}
                  {weeks > 0 && (
                    <span>
                      {weeks} week{weeks !== 1 ? "s" : ""}
                    </span>
                  )}
                  {remainingDays > 0 && (
                    <span>
                      {remainingDays} day{remainingDays !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="event-section">
          <div className="no-events">
            <i
              className="fa fa-calendar-plus"
              style={{
                fontSize: "2rem",
                color: "#226b45",
                marginBottom: "0.5rem",
              }}
            />
            <p>No event yet</p>
            <button
              className="btn-primary"
              onClick={() => {
                setEventForm({ title: "", targetDate: "" });
                setShowEventModal(true);
              }}
              style={{ marginTop: "0.5rem" }}
            >
              Create Your Event
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {cards.map((c) => (
          <div
            key={c.page}
            className="dash-card"
            onClick={() => onNavigate(c.page)}
            style={{ color: c.color, cursor: "pointer" }}
          >
            <div className="dash-card-icon" style={{ color: c.color }}>
              <i className={`fa ${c.icon}`} />
            </div>
            <div className="dash-card-info">
              <div className="dash-card-label">{c.label}</div>
              <div className="dash-card-value">{c.value}</div>
            </div>
            {c.ring ? (
              <div className="dash-card-ring">
                <CircleProgress
                  pct={c.pct}
                  size={72}
                  stroke={7}
                  color={c.color}
                />
              </div>
            ) : (
              <div className="dash-card-logo">
                <i
                  className={`fa ${c.icon}`}
                  style={{ fontSize: "2rem", opacity: 0.18, color: c.color }}
                />
              </div>
            )}
            <div className="dash-card-arrow">
              <i className="fa fa-arrow-right" />
            </div>
          </div>
        ))}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Your Event</h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="modal-close"
              >
                <i className="fa fa-times" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Event Title</label>
                <input
                  type="text"
                  placeholder="e.g., Wedding Day, Birthday, Baptism"
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Target Date</label>
                <input
                  type="date"
                  value={eventForm.targetDate}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, targetDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowEventModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={saveEvent}
                className="btn-primary"
                disabled={savingEvent}
              >
                {savingEvent ? (
                  <>
                    <i className="fa fa-spinner fa-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <i className="fa fa-check" /> Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
