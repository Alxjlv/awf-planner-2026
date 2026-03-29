const DAY_START = 8 * 60;
const DAY_END = 22 * 60;
const DAY_DURATION = DAY_END - DAY_START;

const tooltip = document.getElementById("tooltip");

let selected = new Set(
  JSON.parse(localStorage.getItem("awf-selected") || "[]")
);

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

  const dayEl = document.createElement("div");
  dayEl.className = "day";

  const timeCol = document.createElement("div");
  timeCol.className = "time-column";

  for (let h = DAY_START / 60; h <= DAY_END / 60; h++) {
    const hour = document.createElement("div");
    hour.className = "hour";
    hour.innerText = `${h}:00`;
    timeCol.appendChild(hour);
  }

  const eventsCol = document.createElement("div");
  eventsCol.className = "events";

  events.forEach(e => {
    const top = (e.startMinutes - DAY_START) / DAY_DURATION * 100;
    const height = (e.endMinutes - e.startMinutes) / DAY_DURATION * 100;

    const ev = document.createElement("div");
    ev.className = "event";

    if (selected.has(e.url)) ev.classList.add("selected");

    ev.style.top = top + "%";
    ev.style.height = height + "%";
    ev.style.left = (e.column / e.columns * 100) + "%";
    ev.style.width = (100 / e.columns) + "%";

    ev.innerHTML = `
      <div class="event-title">${e.name}</div>
      <div class="event-time">${e.startStr} – ${e.endStr}</div>
    `;

    ev.onclick = (event) => {
      event.stopPropagation();
      if (selected.has(e.url)) {
        selected.delete(e.url);
        ev.classList.remove("selected");
      } else {
        selected.add(e.url);
        ev.classList.add("selected");
      }
      localStorage.setItem("awf-selected", JSON.stringify([...selected]));
    };

    ev.ondblclick = () => window.open(e.url);

    ev.onmouseenter = () => showTooltip(e);
    ev.onmouseleave = () => tooltip.style.display = "none";

    ev.onmousemove = (event) => {
      const tooltipRect = tooltip.getBoundingClientRect();
      const pageWidth = window.innerWidth;
      const pageHeight = window.innerHeight;

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
  tooltip.innerHTML = `
    <strong>${e.name}</strong><br>
    ${e.startStr} – ${e.endStr}<br><br>
    ${e.description}
  `;
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
  let active = [];
  for (const e of events) {
    active = active.filter(a => a.endMinutes > e.startMinutes);
    const usedCols = new Set(active.map(a => a.column));
    let col = 0;
    while (usedCols.has(col)) col++;
    e.column = col;
    active.push(e);
  }
  const maxCol = Math.max(...events.map(e => e.column), 0) + 1;
  events.forEach(e => e.columns = maxCol);
}