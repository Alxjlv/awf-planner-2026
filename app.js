const DAY_START = 8 * 60;
const HOUR_PX = 60;

const tooltip = document.getElementById("tooltip");

let selected = new Set(
  JSON.parse(localStorage.getItem("awf-selected") || "[]")
);

let currentModalEvent = null;

// Modal elements
const modalOverlay = document.getElementById("modal-overlay");
const modalClose = document.getElementById("modal-close");
const modalImg = document.getElementById("modal-img");
const modalTitle = document.getElementById("modal-title");
const modalTime = document.getElementById("modal-time");
const modalDesc = document.getElementById("modal-desc");
const modalToggle = document.getElementById("modal-toggle");
const modalLink = document.getElementById("modal-link");

modalClose.onclick = closeModal;
modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

modalToggle.onclick = () => {
  const e = currentModalEvent;
  if (!e) return;
  if (selected.has(e.url)) {
    selected.delete(e.url);
  } else {
    selected.add(e.url);
  }
  localStorage.setItem("awf-selected", JSON.stringify([...selected]));
  syncModalToggle(e);
  // Update cards in the grid
  document.querySelectorAll(`.event[data-url="${CSS.escape(e.url)}"]`).forEach(el => {
    el.classList.toggle("selected", selected.has(e.url));
  });
};

function openModal(e) {
  currentModalEvent = e;
  modalTitle.textContent = e.name;
  modalTime.textContent = `${e.dateStr} · ${e.startStr} – ${e.endStr}`;

  if (e.image) {
    modalImg.src = e.image;
    modalImg.classList.remove("no-image");
  } else {
    modalImg.src = "";
    modalImg.classList.add("no-image");
  }

  modalDesc.innerHTML = e.description || "";
  modalLink.href = e.url;
  syncModalToggle(e);
  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  currentModalEvent = null;
}

function syncModalToggle(e) {
  const isSelected = selected.has(e.url);
  modalToggle.textContent = isSelected ? "✓ Marked as Considering" : "Mark as Considering";
  modalToggle.classList.toggle("selected", isSelected);
}

fetch("./awf-events.json")
  .then(r => r.json())
  .then(init);

function init(events) {
  events = events.filter(e => e.startMinutes !== null);

  const days = groupByDay(events);

  createTabs(days);

  showDay(Object.keys(days)[0], days);
}

function createTabs(days) {
  const tabs = document.getElementById("day-tabs");

  Object.keys(days).forEach((day, i) => {
    const tab = document.createElement("div");
    tab.className = "day-tab";
    tab.innerText = day;

    if (i === 0) tab.classList.add("active");

    tab.onclick = () => {
      document.querySelectorAll(".day-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      showDay(day, days);
    };

    tabs.appendChild(tab);
  });
}

function showDay(dayLabel, days) {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const events = [...days[dayLabel]];

  events.sort((a, b) => a.startMinutes - b.startMinutes);

  layoutOverlaps(events);

  const latestEnd = Math.max(...events.map(e => e.endMinutes));
  const dayEnd = Math.ceil(latestEnd / 60) * 60;

  const dayEl = document.createElement("div");
  dayEl.className = "day";

  const timeCol = document.createElement("div");
  timeCol.className = "time-column";

  for (let h = DAY_START / 60; h <= dayEnd / 60; h++) {
    const hour = document.createElement("div");
    hour.className = "hour";
    hour.innerText = `${h}:00`;
    timeCol.appendChild(hour);
  }

  const eventsCol = document.createElement("div");
  eventsCol.className = "events";
  eventsCol.style.height = ((dayEnd / 60 - DAY_START / 60 + 1) * HOUR_PX) + "px";

  events.forEach(e => {
    const top = (e.startMinutes - DAY_START) / 60 * HOUR_PX;
    const height = (e.endMinutes - e.startMinutes) / 60 * HOUR_PX;

    const ev = document.createElement("div");
    ev.className = "event";
    ev.dataset.url = e.url;

    if (selected.has(e.url)) ev.classList.add("selected");

    ev.style.top = top + "px";
    ev.style.height = height + "px";
    ev.style.left = (e.column / e.columns * 100) + "%";
    ev.style.width = (100 / e.columns) + "%";

    ev.innerHTML = `
      <div class="event-actions">
        <button class="event-star" aria-label="Mark as considering" title="Mark as considering"></button>
        <a class="event-link" href="${e.url}" target="_blank" rel="noopener" aria-label="Open event page" title="Open event page">↗</a>
      </div>
      <div class="event-title">${e.name}</div>
      <div class="event-time">${e.startStr} – ${e.endStr}</div>
    `;

    const starBtn = ev.querySelector(".event-star");
    starBtn.onclick = (event) => {
      event.stopPropagation();
      if (selected.has(e.url)) {
        selected.delete(e.url);
      } else {
        selected.add(e.url);
      }
      localStorage.setItem("awf-selected", JSON.stringify([...selected]));
      document.querySelectorAll(`.event[data-url="${CSS.escape(e.url)}"]`).forEach(el => {
        el.classList.toggle("selected", selected.has(e.url));
      });
      if (currentModalEvent && currentModalEvent.url === e.url) syncModalToggle(e);
    };

    ev.querySelector(".event-link").onclick = (event) => { event.stopPropagation(); };

    ev.onclick = (event) => {
      event.stopPropagation();
      openModal(e);
    };

    // Desktop hover tooltip (not shown on touch devices)
    ev.onmouseenter = () => {
      if (window.matchMedia("(hover: hover)").matches) showTooltip(e);
    };
    ev.onmouseleave = () => { tooltip.style.display = "none"; };

    ev.onmousemove = (event) => {
      const tooltipRect = tooltip.getBoundingClientRect();
      const pageWidth = window.innerWidth;

      let left = event.clientX - tooltipRect.width / 2;
      let top = event.clientY - tooltipRect.height - 12;

      left = Math.max(5, Math.min(left, pageWidth - tooltipRect.width - 5));
      if (top < 5) top = event.clientY + 12;

      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    };

    eventsCol.appendChild(ev);
  });

  dayEl.appendChild(timeCol);
  dayEl.appendChild(eventsCol);

  calendar.appendChild(dayEl);
}

function showTooltip(e) {
  let descHtml = "";
  if (e.description) {
    const tmp = document.createElement("div");
    tmp.innerHTML = e.description;
    const text = (tmp.textContent || tmp.innerText || "")
      .replace(/^Event \d+\n[^\n]+\n\n/, "").trim();
    if (text) {
      const truncated = text.length > 280 ? text.slice(0, 280) + "…" : text;
      descHtml = `<div class="tooltip-desc">${truncated}</div>`;
    }
  }
  tooltip.innerHTML = `<strong>${e.name}</strong><br><span class="tooltip-time">${e.startStr} – ${e.endStr}</span>${descHtml}`;
  tooltip.style.display = "block";
  tooltip.style.opacity = 1;
}

function groupByDay(events) {
  const map = {};
  for (const e of events) {
    const d = new Date(e.startISO);
    const label = d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
    if (!map[label]) map[label] = [];
    map[label].push(e);
  }
  return map;
}

function layoutOverlaps(events) {
  // Assign columns via sweep line
  let active = [];
  for (const e of events) {
    active = active.filter(a => a.endMinutes > e.startMinutes);
    const usedCols = new Set(active.map(a => a.column));
    let col = 0;
    while (usedCols.has(col)) col++;
    e.column = col;
    active.push(e);
  }

  // Each event's column count is determined by its local overlap group,
  // so isolated events get full width rather than inheriting the global max.
  for (const e of events) {
    const concurrent = events.filter(other =>
      other.startMinutes < e.endMinutes && other.endMinutes > e.startMinutes
    );
    e.columns = Math.max(...concurrent.map(o => o.column)) + 1;
  }
}
