import React, { useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import CircleProgress from "../components/CircleProgress";
import Modal from "../components/Modal";
import Swal from "sweetalert2";
import * as api from "../api";

const CATEGORIES = [
  "Principal",
  "Secondary",
  "Family",
  "Friends",
  "VIP",
  "Others",
];

const EMPTY_FILTERS = {
  category: "",
  listedBy: "",
  status: "",
  tableNum: "",
  rsvpStatus: "",
  confirmation: "",
};

const SPONSORS_PER_PAGE = 5;

function SponsorList({ label, guests }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(guests.length / SPONSORS_PER_PAGE));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * SPONSORS_PER_PAGE;
  const visibleGuests = guests.slice(start, start + SPONSORS_PER_PAGE);

  return (
    <section className={"sponsor-block sponsor-block-" + label.toLowerCase()} aria-label={label + " Sponsors"}>
      <div className="sponsor-header">
        <h4>{label} Sponsors <span className="sponsor-count">{guests.length}</span></h4>
      </div>
      <div className={"sponsor-list-compact" + (pages > 1 ? " sponsor-list-paged" : "")}>
        {visibleGuests.map((guest, index) => (
          <div key={guest._id} className="sponsor-person">
            <span className="sponsor-order">{String(start + index + 1).padStart(2, "0")}</span>
            <span className="sponsor-name">{guest.name}</span>
            <span className="sponsor-pax">{guest.pax || 1} pax</span>
          </div>
        ))}
        {!guests.length && <div className="empty-row">No {label.toLowerCase()} sponsors yet.</div>}
      </div>
      {pages > 1 && (
        <div className="pagination sponsor-pagination">
          <button type="button" aria-label={"Previous " + label + " sponsors"} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
            <i className="fa fa-chevron-left" aria-hidden="true" />
          </button>
          <span aria-live="polite">{start + 1}–{start + visibleGuests.length} of {guests.length}</span>
          <button type="button" aria-label={"Next " + label + " sponsors"} disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>
            <i className="fa fa-chevron-right" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

const companionsFor = (guests, main) => {
  const listed = main.remarks?.startsWith("Companions: ")
    ? main.remarks.slice("Companions: ".length).split(", ").map((name) => name.toLowerCase())
    : [];
  return guests.filter((guest) => guest._id !== main._id && (
    guest.companionOf === main._id ||
    (!guest.companionOf && listed.includes(guest.name.toLowerCase()) && guest.remarks === `Companion of ${main.name}`)
  ));
};

export default function Guests() {
  const { eventData, setEventData } = useApp();
  const [modal, setModal] = useState(null); // null | {mode: 'add'|'edit', guest?: obj}
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("default"); // 'default', 'ascending', or 'listedBy'
  const [filter, setFilter] = useState({ search: "", ...EMPTY_FILTERS });
  const [draftFilters, setDraftFilters] = useState(null);
  const tableRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    pax: 1,
    category: "Family",
    confirmed: false,
    remarks: "",
    listedBy: "",
  });
  const [saving, setSaving] = useState(false);
  const [companions, setCompanions] = useState([]);
  const companionNames = companions.map((entry) => entry.name.trim()).filter(Boolean);
  const companionRemarks = companionNames.length ? `Companions: ${companionNames.join(", ")}` : "";
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [nominateInput, setNominateInput] = useState("");

  if (!eventData)
    return (
      <div className="page-loading">
        <i className="fa fa-spinner fa-spin" /> Loading…
      </div>
    );

  const { guestSettings = {}, guests = [], nominatedGuests = [] } = eventData;
  const expected = guestSettings.expectedGuests || 0;
  const totalPax = guests.reduce((total, guest) => total + Number(guest.pax || 1), 0);
  const pct =
    expected > 0 ? Math.min(100, (totalPax / expected) * 100) : 0;
  const paxFor = (predicate) => guests.filter(predicate).reduce((total, guest) => total + Number(guest.pax || 1), 0);
  const confirmedCount = paxFor((g) => g.confirmed);
  const seatedCount = paxFor((g) => g.status === "Seated");
  const unseatedCount = paxFor((g) => g.status === "Not Seated");
  const unconfirmedCount = paxFor((g) => !g.confirmed);
  const tableNums = [
    ...new Set(guests.map((g) => g.tableNumber).filter(Boolean)),
  ].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true }),
  );
  const principalGuests = guests.filter((g) => g.category === "Principal");
  const secondaryGuests = guests.filter((g) => g.category === "Secondary");

  const patchData = (key, val) =>
    setEventData((prev) => ({ ...prev, [key]: val }));

  // ── Setup ──────────────────────────────────────────────────
  const saveGuestSettings = async () => {
    const val = parseInt(document.getElementById("expectedGuestInput")?.value);
    if (!val || val < 1)
      return Swal.fire({
        icon: "warning",
        title: "Invalid",
        text: "Enter a valid number.",
        confirmButtonColor: "#226b45",
      });
    const settings = { expectedGuests: val, initialized: true };
    await api.updateGuestSettings(settings);
    patchData("guestSettings", settings);
  };

  const editExpectedCount = async () => {
    const result = await Swal.fire({
      title: "Adjust Expected Guest Count",
      input: "number",
      inputValue: expected,
      inputAttributes: { min: 1 },
      showCancelButton: true,
      confirmButtonColor: "#226b45",
      confirmButtonText: "Update",
      preConfirm: (v) => {
        if (!v || v < 1) {
          Swal.showValidationMessage("Enter a valid number");
          return false;
        }
        return parseInt(v);
      },
    });
    if (result.isConfirmed) {
      const settings = { expectedGuests: result.value, initialized: true };
      await api.updateGuestSettings(settings);
      patchData("guestSettings", settings);
    }
  };

  if (!guestSettings.initialized)
    return (
      <div className="setup-card">
        <i className="fa fa-users setup-icon" />
        <h3>Set Expected Guest Count</h3>
        <p>How many guests are you expecting for your event?</p>
        <div className="setup-input-row">
          <input
            type="number"
            id="expectedGuestInput"
            min="1"
            className="setup-input"
          />
          <button className="btn-primary" onClick={saveGuestSettings}>
            Confirm
          </button>
        </div>
      </div>
    );

  // ── Filter & Paginate ──────────────────────────────────────
  const listedByOptions = [...nominatedGuests].sort((a, b) => a.localeCompare(b));

  const activeFilterCount = Object.keys(EMPTY_FILTERS).filter((key) => filter[key]).length;
  const updateFilters = (selections, search = filter.search) => {
    setFilter({ search, ...selections });
    setPage(1);
  };
  const showKpiGuests = (selections) => {
    updateFilters({ ...EMPTY_FILTERS, ...selections }, "");
    tableRef.current?.scrollIntoView({ block: "start" });
  };
  const kpis = [
    { label: "Total Pax", count: totalPax, action: () => showKpiGuests({}) },
    { label: "Expected", count: expected, action: editExpectedCount },
    { label: "Confirmed", count: confirmedCount, action: () => showKpiGuests({ confirmation: "confirmed" }) },
    { label: "Seated", count: seatedCount, action: () => showKpiGuests({ status: "Seated" }) },
    { label: "Not Seated", count: unseatedCount, tone: "unseated", action: () => showKpiGuests({ status: "Not Seated" }) },
    { label: "Unconfirmed", count: unconfirmedCount, tone: "unconfirmed", action: () => showKpiGuests({ confirmation: "unconfirmed" }) },
  ];
  const filterFields = [
    { key: "category", label: "Category", options: CATEGORIES },
    { key: "listedBy", label: "Listed by", options: nominatedGuests },
    { key: "status", label: "Seating status", options: ["Not Seated", "Seated"] },
    { key: "tableNum", label: "Table", options: tableNums.map(String) },
    { key: "rsvpStatus", label: "RSVP status", options: ["Pending", "Accepted", "Declined"] },
    { key: "confirmation", label: "Guest confirmation", options: ["confirmed", "unconfirmed"] },
  ];

  let filtered = [...guests];
  if (filter.confirmation)
    filtered = filtered.filter((guest) => Boolean(guest.confirmed) === (filter.confirmation === "confirmed"));
  if (filter.search)
    filtered = filtered.filter((g) =>
      g.name.toLowerCase().includes(filter.search.toLowerCase()),
    );
  if (filter.category)
    filtered = filtered.filter((g) => g.category === filter.category);
  if (filter.rsvpStatus) {
    filtered = filtered.filter((g) => {
      const status = g.rsvpStatus === "Pending" && g.confirmed
        ? "Accepted"
        : (g.rsvpStatus || (g.confirmed ? "Accepted" : "Pending"));
      return status === filter.rsvpStatus;
    });
  }
  if (filter.status)
    filtered = filtered.filter((g) => g.status === filter.status);
  if (filter.tableNum)
    filtered = filtered.filter(
      (g) => String(g.tableNumber) === filter.tableNum,
    );
  if (filter.listedBy)
    filtered = filtered.filter((g) => g.listedBy === filter.listedBy);

  // Apply sorting
  if (sortOrder === "ascending") {
    filtered = filtered.slice().sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered = filtered.slice().reverse();
  }

  const totalPages = Math.ceil(filtered.length / 10) || 1;
  const paged = filtered.slice((page - 1) * 10, page * 10);

  // ── Modal Handlers ─────────────────────────────────────────
  const openAdd = () => {
    setCompanions([]);
    setForm({
      name: "",
      pax: 1,
      category: "Family",
      confirmed: false,
      remarks: "",
      listedBy: "",
    });
    setModal({ mode: "add" });
  };
  const openEdit = (g) => {
    const parent = guests.find((main) => companionsFor(guests, main).some((child) => child._id === g._id));
    const linked = parent ? [] : companionsFor(guests, g);
    const partyPax = Number(g.pax || 1) + linked.length;
    setCompanions(Array.from({ length: partyPax - 1 }, (_, index) =>
      linked[index] ? { id: linked[index]._id, name: linked[index].name } : { id: "", name: "" },
    ));
    setForm({
      name: g.name,
      pax: parent ? 1 : partyPax,
      category: g.category,
      confirmed: g.confirmed,
      remarks: g.remarks || "",
      listedBy: g.listedBy || "",
    });
    setModal({ mode: "edit", guest: g, parent, originalCompanions: linked });
  };

  const saveGuest = async () => {
    if (saving) return;
    if (!form.name.trim())
      return Swal.fire({
        icon: "warning",
        title: "Name required",
        confirmButtonColor: "#226b45",
      });
    const dupe = guests.find(
      (g) =>
        g.name.toLowerCase() === form.name.toLowerCase() &&
        g._id !== modal.guest?._id,
    );
    if (dupe)
      return Swal.fire({
        icon: "error",
        title: "Duplicate Entry",
        text: `"${form.name}" is already in the guest list.`,
        confirmButtonColor: "#226b45",
      });
    setSaving(true);
    try {
      if (modal.mode === "edit") {
        const isMain = !modal.parent;
        if (isMain) {
          const retainedIds = new Set(companions.filter((entry) => entry.name.trim()).map((entry) => entry.id));
          const removed = modal.originalCompanions.filter((guest) => !retainedIds.has(guest._id));
          if (removed.length) {
            const confirmation = await Swal.fire({
              icon: "warning", title: "Remove companions?",
              text: `${removed.map((guest) => guest.name).join(", ")} will be removed from the guest list and their seating assignments.`,
              showCancelButton: true, confirmButtonColor: "#e74c3c",
            });
            if (!confirmation.isConfirmed) { setSaving(false); return; }
          }
        }
        const res = await api.updateGuest(modal.guest._id, isMain ? { ...form, companions } : form);
        if (res.data.guests) {
          setEventData((prev) => ({ ...prev, guests: res.data.guests, seating: res.data.seating, presidentialSeating: res.data.presidentialSeating }));
        } else {
          const refreshed = await api.getGuests();
          patchData("guests", refreshed.data);
        }
      } else {
        const res = await api.addGuest({ ...form, name: form.name.trim(), companions: companions.map((entry) => entry.name), remarks: companionRemarks });
        setEventData((prev) => ({ ...prev, guests: [...prev.guests, ...res.data.guests] }));
      }
      setModal(null);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to save.",
        confirmButtonColor: "#226b45",
      });
    }
    setSaving(false);
  };

  const deleteGuest = async (g) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Guest?",
      text: `"${g.name}" will be permanently removed.`,
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
    });
    if (!result.isConfirmed) return;
    const res = await api.deleteGuest(g._id);
    setEventData((prev) => ({
      ...prev,
      guests: res.data.guests,
      seating: res.data.seating,
      presidentialSeating: res.data.presidentialSeating,
    }));
  };

  const sortAlpha = () => {
    setSortOrder((current) => {
      if (current === "default") return "ascending";
      if (current === "ascending") return "default";
      return "ascending";
    });
    const newOrder = sortOrder === "default" ? "ascending" : "default";
    const msg =
      newOrder === "ascending" ? "Sorted A–Z" : "Reset to default order";
    Swal.fire({
      icon: "success",
      title: msg,
      timer: 1100,
      showConfirmButton: false,
    });
  };

  const submitNomination = async () => {
    if (!nominateInput.trim()) {
      return Swal.fire({
        icon: "warning",
        title: "Empty Name",
        text: "Please enter a name to nominate.",
        confirmButtonColor: "#226b45",
      });
    }

    // Check for duplicates
    if (nominatedGuests.includes(nominateInput.trim())) {
      return Swal.fire({
        icon: "warning",
        title: "Already Nominated",
        text: `"${nominateInput.trim()}" is already in the list.`,
        confirmButtonColor: "#226b45",
      });
    }

    const nominatedName = nominateInput.trim();
    const updatedNominated = [...nominatedGuests, nominatedName].sort((a, b) => a.localeCompare(b));
    patchData("nominatedGuests", updatedNominated);
    setNominateInput("");

    // Save to backend
    try {
      await api.updateNominatedGuests(updatedNominated);
    } catch (err) {
      console.error("Failed to save nominated guests:", err);
      Swal.fire({
        icon: "error",
        title: "Save Error",
        text: "Failed to save nominated guest. Please try again.",
        confirmButtonColor: "#226b45",
      });
      return;
    }

    await Swal.fire({
      icon: "success",
      title: "Nominated!",
      text: `"${nominatedName}" has been added to the list.`,
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const removeNominatedGuest = async (name) => {
    const updatedNominated = nominatedGuests.filter((g) => g !== name);
    patchData("nominatedGuests", updatedNominated);

    // Save to backend
    try {
      await api.updateNominatedGuests(updatedNominated);
    } catch (err) {
      console.error("Failed to remove nominated guest:", err);
      Swal.fire({
        icon: "error",
        title: "Delete Error",
        text: "Failed to remove nominated guest. Please try again.",
        confirmButtonColor: "#226b45",
      });
    }
  };

  return (
    <div>
      <div className="page-header-row">
        <h2 className="page-title guest-page-title">Guest List</h2>
      </div>

      <section className="guest-kpi-panel" aria-label="Guest overview">
        <div className="guest-kpi-summary">
          <div><strong>{guests.length}</strong> Guest entries</div>
          <div className="guest-kpi-progress">
            <CircleProgress pct={pct} size={40} stroke={4} />
            <span>of expected pax</span>
          </div>
        </div>
        <div className="guest-kpi-grid">
          {kpis.map(({ label, count, action, tone }) => (
            <button key={label} type="button" className={"guest-kpi" + (tone ? " guest-kpi-" + tone : "")} onClick={action}>
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </div>
      </section>

      <div className="guest-actions-bar">
        <button className="btn-primary" onClick={openAdd}>
          <i className="fa fa-plus" /> Add Guest
        </button>
        <button
          className="btn-outline"
          aria-label="Nominate Guests"
          onClick={() => setShowNominateModal(true)}
          style={{
            backgroundColor: "var(--green-light)",
            borderColor: "var(--green-main)",
            color: "var(--green-dark)",
            fontWeight: "600",
          }}
        >
          <i className="fa fa-user-tie" aria-hidden="true" /> Nominate<span className="guest-action-extra"> Guests</span>
        </button>
        <button
          className="btn-outline"
          onClick={sortAlpha}
          aria-label="Sort guests A to Z"
          title="Sort guests A to Z"
          style={{ marginLeft: "auto" }}
        >
          <i className="fa fa-arrow-down-a-z" aria-hidden="true" /><span className="guest-action-extra"> Sort A–Z</span>
        </button>
      </div>

      <div className="guest-filter-toolbar">
        <input
          type="search"
          placeholder="Search guest name..."
          aria-label="Search guest name"
          value={filter.search}
          onChange={(event) => {
            setFilter((current) => ({ ...current, search: event.target.value }));
            setPage(1);
          }}
        />
        <button
          type="button"
          className="btn-outline guest-filter-button"
          aria-label={activeFilterCount ? "Filters, " + activeFilterCount + " active" : "Filters"}
          aria-haspopup="dialog"
          onClick={() => setDraftFilters(Object.fromEntries(Object.keys(EMPTY_FILTERS).map((key) => [key, filter[key]])))}
        >
          <i className="fa fa-filter" aria-hidden="true" />
          {activeFilterCount > 0 && <span className="sponsor-count">{activeFilterCount}</span>}
        </button>
        {activeFilterCount > 0 && (
          <button type="button" className="btn-link guest-clear-filters" onClick={() => updateFilters(EMPTY_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>

      {draftFilters && (
        <Modal
          title="Guest filters"
          onClose={() => setDraftFilters(null)}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setDraftFilters({ ...EMPTY_FILTERS })}>Clear all</button>
              <button type="button" className="btn-primary" onClick={() => {
                updateFilters(draftFilters);
                setDraftFilters(null);
              }}>Apply filters</button>
            </>
          }
        >
          <div className="form-grid">
            {filterFields.map(({ key, label, options }) => (
              <label className="form-group" key={key}>
                <span>{label}</span>
                <select value={draftFilters[key]} onChange={(event) => setDraftFilters((current) => ({ ...current, [key]: event.target.value }))}>
                  <option value="">All</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {key === "tableNum" ? "Table " + option : key === "confirmation" ? option[0].toUpperCase() + option.slice(1) : option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </Modal>
      )}

      <div className="table-wrap" ref={tableRef}>
        <table className="data-table compact-table guest-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Pax</th>
              <th className="compact-table-hide">Category</th>
              <th>RSVP</th>
              <th className="compact-table-hide">Table</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length ? (
              paged.map((g) => (
                <tr key={g._id}>
                  <td data-label="Name">
                    <strong>{g.name}</strong>
                    <small className="compact-table-detail">{g.category}{g.tableNumber ? " · Table " + g.tableNumber : ""}</small>
                  </td>
                  <td data-label="Pax">{g.pax || 1}</td>
                  <td className="compact-table-hide" data-label="Category">
                    <span
                      className={`badge ${g.category === "Principal" ? "badge-principal" : g.category === "Secondary" ? "badge-secondary" : "badge-cat"}`}
                    >
                      {g.category}
                    </span>
                  </td>
                  <td data-label="RSVP">
                    <span className={`badge ${(g.rsvpStatus === "Accepted" || g.confirmed) ? "badge-green" : g.rsvpStatus === "Declined" ? "badge-gray" : "badge-cat"}`}>
                      {g.rsvpStatus === "Pending" && g.confirmed ? "Accepted" : (g.rsvpStatus || (g.confirmed ? "Accepted" : "Pending"))}
                    </span>
                  </td>
                  <td className="compact-table-hide" data-label="Table">{g.tableNumber || "—"}</td>
                  <td data-label="Actions">
                    <div className="guest-row-actions">
                      <button className="btn-icon-sm" aria-label={`Edit ${g.name}`} onClick={() => openEdit(g)}>
                        <i className="fa fa-edit" />
                      </button>
                      <button
                        className="btn-icon-sm danger"
                        aria-label={`Delete ${g.name}`}
                        onClick={() => deleteGuest(g)}
                      >
                        <i className="fa fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-row">
                  No guests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          <i className="fa fa-chevron-left" />
        </button>
        <span>
          Page {page} of {totalPages} ({filtered.length} total)
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          <i className="fa fa-chevron-right" />
        </button>
      </div>

      <div className="sponsor-section">
        <SponsorList label="Principal" guests={principalGuests} />
        <SponsorList label="Secondary" guests={secondaryGuests} />
      </div>

      {modal && (
        <Modal
          title={modal.mode === "edit" ? "Edit Guest" : "Add Guest"}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn-outline" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={saveGuest}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Guest"}
            </button>
          </>}
        >
          <div className="form-grid">
            <div className="form-group full">
              <label>Guest Name *</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Full name"
              />
            </div>
            <div className="form-group">
              <label>Number of Guests / Pax *</label>
              <input
                type="number"
                min="1"
                max="50"
                step="1"
                value={form.pax}
                disabled={Boolean(modal.parent)}
                onChange={(e) => {
                  const pax = Math.min(50, Math.max(1, Math.floor(Number(e.target.value) || 1)));
                  setForm((f) => ({ ...f, pax }));
                  setCompanions((names) => Array.from({ length: pax - 1 }, (_, i) => names[i] || { id: "", name: "" }));
                }}
              />
            </div>
            {!modal.parent && form.pax > 1 && (
              <div className="form-group full">
                <p>Optional: name companions to list and seat them separately. Unnamed places stay with the main guest.</p>
                {companions.map((entry, index) => (
                  <div className="form-group" key={index}>
                    <label htmlFor={`companion-${index}`}>Companion {index + 1}</label>
                    <input id={`companion-${index}`} value={entry.name} maxLength={120}
                      placeholder="Companion full name"
                      onChange={(e) => setCompanions((names) => names.map((value, i) => i === index ? { ...value, name: e.target.value } : value))} />
                  </div>
                ))}
              </div>
            )}
            <div className="form-group full">
              <label>Listed by</label>
              <select
                value={form.listedBy}
                onChange={(e) =>
                  setForm((f) => ({ ...f, listedBy: e.target.value }))
                }
              >
                <option value="">Select a name...</option>
                {listedByOptions.map((lb) => (
                  <option key={lb} value={lb}>
                    {lb}
                  </option>
                ))}
              </select>
              {nominatedGuests.length === 0 && (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text2)",
                    marginTop: "0.4rem",
                  }}
                >
                  <i className="fa fa-info-circle" /> Use "Nominate Guests"
                  button to add names to this list
                </p>
              )}
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label style={{ marginBottom: "0.5rem", display: "block" }}>
                Confirmation
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  backgroundColor: "var(--bg2)",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.confirmed}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, confirmed: e.target.checked }))
                  }
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "var(--accent)",
                  }}
                />
                <span style={{ fontSize: "0.95rem", color: "var(--text)" }}>
                  {form.confirmed ? "Guest confirmed" : "Mark as confirmed"}
                </span>
              </label>
            </div>
            <div className="form-group full">
              <label>Remarks</label>
              <textarea
                rows="2"
                value={modal.parent ? `Companion of ${modal.parent.name}` : companionRemarks}
                readOnly
                onChange={(e) =>
                  setForm((f) => ({ ...f, remarks: e.target.value }))
                }
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Nominate Guests Modal */}
      {showNominateModal && (
        <Modal
          title="Nominate Guests"
          onClose={() => setShowNominateModal(false)}
        >
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ color: "var(--text2)", marginBottom: "1rem" }}>
              <i className="fa fa-lightbulb" /> Listing guests under the names
              on this list
            </p>

            <div
              style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}
            >
              <input
                type="text"
                value={nominateInput}
                onChange={(e) => setNominateInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    submitNomination();
                  }
                }}
                placeholder="Enter person's name"
                style={{
                  flex: 1,
                  padding: "0.65rem 0.75rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  backgroundColor: "var(--bg2)",
                }}
              />
              <button
                className="btn-primary"
                onClick={submitNomination}
                style={{ padding: "0.65rem 1rem" }}
              >
                <i className="fa fa-plus" /> Add
              </button>
            </div>

            {nominatedGuests.length > 0 && (
              <div>
                <h4 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                  Nominated Names ({nominatedGuests.length})
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: "0.5rem",
                  }}
                >
                  {nominatedGuests.map((name) => (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.65rem 0.75rem",
                        backgroundColor: "var(--green-light)",
                        border: "1px solid var(--green-main)",
                        borderRadius: "var(--radius-xs)",
                        fontSize: "0.85rem",
                        color: "var(--green-dark)",
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>{name}</span>
                      <button
                        type="button"
                        onClick={() => removeNominatedGuest(name)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--red)",
                          cursor: "pointer",
                          padding: "0 0 0 0.5rem",
                          fontSize: "0.9rem",
                        }}
                      >
                        <i className="fa fa-trash-alt" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              className="btn-outline"
              onClick={() => setShowNominateModal(false)}
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
