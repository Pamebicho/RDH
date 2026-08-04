const STORAGE_PREFIX = "krontec.hoursRegister";
const SESSION_KEY = "krontec.demoSession";
const MAX_DAILY_HOURS = 24;

const COST_CENTERS = Object.freeze([
  { id: "20-013", name: "Gestión Operaciones", selected: true },
  { id: "10-010", name: "Otros TI", selected: true },
  { id: "41-394", name: "Proyecto TOVE IV", selected: true },
  { id: "41-451", name: "Servicio Sonacol", selected: true },
  { id: "60-002", name: "Capacitación", selected: true },
  { id: "30-101", name: "Administración", selected: false },
  { id: "40-220", name: "Proyecto Minería Norte", selected: false },
  { id: "50-033", name: "Soporte interno", selected: false }
]);

const PERIOD_CONFIG = Object.freeze({
  "2026-07": { label: "Julio 2026", expectedHours: 157.5, deadline: "03/08/2026" },
  "2026-06": { label: "Junio 2026", expectedHours: 170, deadline: "03/07/2026" },
  "2026-05": { label: "Mayo 2026", expectedHours: 178.5, deadline: "03/06/2026" }
});

const WEEKDAYS = Object.freeze(["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]);

function getElement(id) {
  return document.getElementById(id);
}

function roundHours(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatHours(value) {
  return Number(value || 0).toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`;
}

function storageKey(period) {
  return `${STORAGE_PREFIX}.${period}`;
}

function createMonthDays(period) {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();

    return {
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: `${String(day).padStart(2, "0")} ${WEEKDAYS[weekday]}`,
      weekend: weekday === 0 || weekday === 6
    };
  });
}

function createEmptyEntries(period) {
  return Object.fromEntries(
    createMonthDays(period).map((day) => [
      day.date,
      {
        hours: Object.fromEntries(COST_CENTERS.map((center) => [center.id, 0])),
        observation: ""
      }
    ])
  );
}

function createDemoEntries(period) {
  const entries = createEmptyEntries(period);

  if (period !== "2026-07") {
    return entries;
  }

  const demoRows = {
    "2026-07-01": { values: [1, 7, 0.5, 0, 0], observation: "Reunión de coordinación del proyecto" },
    "2026-07-02": { values: [1, 6, 1.5, 0, 0], observation: "Desarrollo de reportes" },
    "2026-07-03": { values: [2, 6.5, 0, 0, 0], observation: "Soporte a usuarios" },
    "2026-07-06": { values: [0, 6, 0, 0, 0.5], observation: "Capacitación Power BI" },
    "2026-07-07": { values: [1.5, 7, 0, 0, 0], observation: "" },
    "2026-07-08": { values: [1, 6, 0, 0, 0], observation: "Documentación técnica" }
  };

  const defaultCenters = COST_CENTERS.filter((center) => center.selected);

  Object.entries(demoRows).forEach(([date, demo]) => {
    if (!entries[date]) {
      return;
    }

    defaultCenters.forEach((center, index) => {
      entries[date].hours[center.id] = demo.values[index] ?? 0;
    });

    entries[date].observation = demo.observation;
  });

  return entries;
}

function createInitialState(period) {
  return {
    period,
    status: "editing",
    selectedCenterIds: COST_CENTERS.filter((center) => center.selected).map((center) => center.id),
    entries: createDemoEntries(period),
    activeDate: null,
    dirty: false
  };
}

function normalizeStoredState(stored, period) {
  const base = createInitialState(period);

  if (!stored || typeof stored !== "object") {
    return base;
  }

  const selectedCenterIds = Array.isArray(stored.selectedCenterIds)
    ? stored.selectedCenterIds.filter((id) => COST_CENTERS.some((center) => center.id === id))
    : base.selectedCenterIds;

  return {
    ...base,
    status: stored.status === "submitted" ? "submitted" : "editing",
    selectedCenterIds: selectedCenterIds.length ? selectedCenterIds : base.selectedCenterIds,
    entries: {
      ...base.entries,
      ...(stored.entries || {})
    },
    dirty: false
  };
}

function loadState(period) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(period)) || "null");
    return normalizeStoredState(stored, period);
  } catch (error) {
    console.error("No fue posible leer el registro guardado:", error);
    return createInitialState(period);
  }
}

function persistState(state) {
  const serializableState = {
    period: state.period,
    status: state.status,
    selectedCenterIds: state.selectedCenterIds,
    entries: state.entries
  };

  localStorage.setItem(storageKey(state.period), JSON.stringify(serializableState));
  state.dirty = false;
}

function getSelectedCenters(state) {
  return state.selectedCenterIds
    .map((id) => COST_CENTERS.find((center) => center.id === id))
    .filter(Boolean);
}

function getDayTotal(state, date) {
  const entry = state.entries[date];
  const centers = getSelectedCenters(state);

  return roundHours(
    centers.reduce((total, center) => total + Number(entry?.hours?.[center.id] || 0), 0)
  );
}

function getColumnTotal(state, centerId) {
  return roundHours(
    Object.values(state.entries).reduce(
      (total, entry) => total + Number(entry.hours?.[centerId] || 0),
      0
    )
  );
}

function getRegisteredHours(state) {
  return roundHours(
    createMonthDays(state.period).reduce(
      (total, day) => total + getDayTotal(state, day.date),
      0
    )
  );
}

function showToast(elements, message, type = "info") {
  const config = {
    info: { title: "Registro de horas", icon: "bi-info-circle text-primary" },
    success: { title: "Cambios guardados", icon: "bi-check-circle text-success" },
    warning: { title: "Atención", icon: "bi-exclamation-triangle text-warning" },
    danger: { title: "No fue posible completar la acción", icon: "bi-x-circle text-danger" }
  }[type] || { title: "Registro de horas", icon: "bi-info-circle text-primary" };

  elements.toastTitle.textContent = config.title;
  elements.toastMessage.textContent = message;
  elements.toastIcon.className = `bi ${config.icon} me-2`;
  bootstrap.Toast.getOrCreateInstance(elements.toast, { delay: 3500 }).show();
}

function renderCentersModal(state, elements) {
  elements.centersList.innerHTML = COST_CENTERS.map((center) => {
    const checked = state.selectedCenterIds.includes(center.id) ? "checked" : "";

    return `
      <label class="center-option">
        <input class="form-check-input center-checkbox" type="checkbox" value="${center.id}" ${checked}>
        <span>
          <strong>${center.id}</strong>
          <small>${center.name}</small>
        </span>
      </label>
    `;
  }).join("");
}

function renderTable(state, elements) {
  const centers = getSelectedCenters(state);
  const days = createMonthDays(state.period);
  const disabled = state.status === "submitted";

  elements.tableHead.innerHTML = `
    <tr>
      <th scope="col">Día</th>
      ${centers.map((center) => `
        <th scope="col">
          <span class="cost-center-code">${center.id}</span>
          <span class="cost-center-name">${center.name}</span>
        </th>
      `).join("")}
      <th scope="col">Total diario<span class="cost-center-name">Horas</span></th>
      <th scope="col" class="observations-column">Observaciones<span class="cost-center-name">Opcional</span></th>
    </tr>
  `;

  elements.tableBody.innerHTML = days.map((day) => {
    const entry = state.entries[day.date];
    const rowTotal = getDayTotal(state, day.date);
    const isActive = state.activeDate === day.date ? "is-active" : "";
    const rowClass = [day.weekend ? "is-weekend" : "", isActive].filter(Boolean).join(" ");
    const inputDisabled = disabled || day.weekend ? "disabled" : "";

    return `
      <tr class="${rowClass}" data-date="${day.date}">
        <th scope="row">${day.label}</th>
        ${centers.map((center) => `
          <td>
            <input
              class="hours-input"
              type="number"
              min="0"
              max="${MAX_DAILY_HOURS}"
              step="0.5"
              value="${Number(entry?.hours?.[center.id] || 0)}"
              data-date="${day.date}"
              data-center-id="${center.id}"
              aria-label="Horas del ${day.label} en ${center.id} ${center.name}"
              ${inputDisabled}
            >
          </td>
        `).join("")}
        <td class="daily-total ${rowTotal > MAX_DAILY_HOURS ? "is-over-limit" : ""}" data-total-date="${day.date}">${formatHours(rowTotal)}</td>
        <td>
          <input
            class="observation-input"
            type="text"
            maxlength="180"
            value="${escapeHtml(entry?.observation || "")}"
            placeholder="Agregar observación"
            data-observation-date="${day.date}"
            aria-label="Observación del ${day.label}"
            ${inputDisabled}
          >
        </td>
      </tr>
    `;
  }).join("");

  const registered = getRegisteredHours(state);

  elements.tableFoot.innerHTML = `
    <tr>
      <th scope="row">TOTAL</th>
      ${centers.map((center) => `
        <td class="column-total" data-column-total="${center.id}">${formatHours(getColumnTotal(state, center.id))}</td>
      `).join("")}
      <td class="grand-total" id="grand-total">${formatHours(registered)}</td>
      <td>—</td>
    </tr>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateSummary(state, elements) {
  const config = PERIOD_CONFIG[state.period] || { expectedHours: 0 };
  const registered = getRegisteredHours(state);
  const remaining = Math.max(0, roundHours(config.expectedHours - registered));
  const progress = config.expectedHours > 0
    ? Math.min(100, roundHours((registered / config.expectedHours) * 100))
    : 0;

  elements.expectedHours.textContent = formatHours(config.expectedHours);
  elements.registeredHours.textContent = formatHours(registered);
  elements.remainingHours.textContent = formatHours(remaining);
  elements.progressValue.textContent = formatPercent(progress);
  elements.progressBar.style.width = `${progress}%`;
  elements.progressBar.parentElement.setAttribute("aria-valuenow", String(progress));
}

function updateStatus(state, elements) {
  const submitted = state.status === "submitted";

  elements.periodStatus.textContent = submitted ? "Enviado" : "En edición";
  elements.periodStatus.className = submitted
    ? "status-badge status-badge--submitted"
    : "status-badge status-badge--editing";

  [
    elements.manageCentersButton,
    elements.copyDayButton,
    elements.copyWeekButton,
    elements.copyMonthButton,
    elements.saveButton,
    elements.submitButton
  ].forEach((button) => {
    button.disabled = submitted;
  });
}

function renderAll(state, elements) {
  renderCentersModal(state, elements);
  renderTable(state, elements);
  updateSummary(state, elements);
  updateStatus(state, elements);

  const deadline = PERIOD_CONFIG[state.period]?.deadline;
  const note = document.querySelector(".summary-note span");
  if (note && deadline) {
    note.textContent = `Recuerda enviar tu registro para aprobación antes del ${deadline}.`;
  }
}

function updateSingleRow(state, elements, date) {
  const totalCell = elements.tableBody.querySelector(`[data-total-date="${date}"]`);
  const total = getDayTotal(state, date);

  if (totalCell) {
    totalCell.textContent = formatHours(total);
    totalCell.classList.toggle("is-over-limit", total > MAX_DAILY_HOURS);
  }

  getSelectedCenters(state).forEach((center) => {
    const columnCell = elements.tableFoot.querySelector(`[data-column-total="${center.id}"]`);
    if (columnCell) {
      columnCell.textContent = formatHours(getColumnTotal(state, center.id));
    }
  });

  const grandTotal = getElement("grand-total");
  if (grandTotal) {
    grandTotal.textContent = formatHours(getRegisteredHours(state));
  }

  updateSummary(state, elements);
}

function setActiveDate(state, elements, date) {
  state.activeDate = date;
  elements.tableBody.querySelectorAll("tr.is-active").forEach((row) => row.classList.remove("is-active"));
  elements.tableBody.querySelector(`tr[data-date="${date}"]`)?.classList.add("is-active");
}

function copyEntry(state, fromDate, toDate) {
  const source = state.entries[fromDate];
  const target = state.entries[toDate];

  if (!source || !target) {
    return false;
  }

  getSelectedCenters(state).forEach((center) => {
    target.hours[center.id] = Number(source.hours[center.id] || 0);
  });
  target.observation = source.observation || "";
  state.dirty = true;
  return true;
}

function findPreviousEditableDate(state, date) {
  const days = createMonthDays(state.period);
  const currentIndex = days.findIndex((day) => day.date === date);

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (!days[index].weekend) {
      return days[index].date;
    }
  }

  return null;
}

function getPreviousPeriod(period) {
  const [year, month] = period.split("-").map(Number);
  const previous = new Date(year, month - 2, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
}

function exportCsv(state) {
  const centers = getSelectedCenters(state);
  const rows = [
    ["Día", ...centers.map((center) => `${center.id} - ${center.name}`), "Total diario", "Observaciones"]
  ];

  createMonthDays(state.period).forEach((day) => {
    const entry = state.entries[day.date];
    rows.push([
      day.label,
      ...centers.map((center) => Number(entry.hours[center.id] || 0).toString().replace(".", ",")),
      formatHours(getDayTotal(state, day.date)),
      entry.observation || ""
    ]);
  });

  rows.push([
    "TOTAL",
    ...centers.map((center) => formatHours(getColumnTotal(state, center.id))),
    formatHours(getRegisteredHours(state)),
    ""
  ]);

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\r\n");

  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `registro-horas-${state.period}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function initializeNavigation(elements) {
  document.querySelectorAll("[data-module]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      showToast(elements, `El módulo “${control.dataset.module}” se construirá en la siguiente etapa.`, "info");
    });
  });

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "../index.html";
  };

  elements.desktopLogout.addEventListener("click", logout);
  elements.mobileLogout.addEventListener("click", logout);
  elements.profileLogout.addEventListener("click", logout);
}

export function initializeHoursRegister() {
  const elements = {
    periodSelect: getElement("period-select"),
    periodStatus: getElement("period-status"),
    manageCentersButton: getElement("manage-centers-button"),
    copyDayButton: getElement("copy-day-button"),
    copyWeekButton: getElement("copy-week-button"),
    copyMonthButton: getElement("copy-month-button"),
    exportButton: getElement("export-button"),
    tableHead: getElement("hours-table-head"),
    tableBody: getElement("hours-table-body"),
    tableFoot: getElement("hours-table-foot"),
    expectedHours: getElement("expected-hours"),
    registeredHours: getElement("registered-hours"),
    remainingHours: getElement("remaining-hours"),
    progressValue: getElement("progress-value"),
    progressBar: getElement("progress-bar"),
    saveButton: getElement("save-button"),
    submitButton: getElement("submit-button"),
    centersList: getElement("centers-list"),
    applyCentersButton: getElement("apply-centers-button"),
    centersModal: getElement("centers-modal"),
    approvalModal: getElement("approval-modal"),
    approvalWarning: getElement("approval-warning"),
    confirmSubmitButton: getElement("confirm-submit-button"),
    toast: getElement("app-toast"),
    toastTitle: getElement("toast-title"),
    toastMessage: getElement("toast-message"),
    toastIcon: getElement("toast-icon"),
    desktopLogout: getElement("desktop-logout"),
    mobileLogout: getElement("mobile-logout"),
    profileLogout: getElement("profile-logout")
  };

  let state = loadState(elements.periodSelect.value);
  renderAll(state, elements);
  initializeNavigation(elements);

  elements.tableBody.addEventListener("focusin", (event) => {
    const date = event.target.dataset.date || event.target.dataset.observationDate;
    if (date) {
      setActiveDate(state, elements, date);
    }
  });

  elements.tableBody.addEventListener("input", (event) => {
    if (event.target.matches(".hours-input")) {
      const { date, centerId } = event.target.dataset;
      let value = Number(event.target.value || 0);

      if (!Number.isFinite(value) || value < 0) {
        value = 0;
      }

      const otherHours = getSelectedCenters(state)
        .filter((center) => center.id !== centerId)
        .reduce(
          (total, center) => total + Number(state.entries[date].hours[center.id] || 0),
          0
        );
      const maximumForInput = Math.max(0, roundHours(MAX_DAILY_HOURS - otherHours));
      const exceededDailyLimit = value > maximumForInput;

      if (exceededDailyLimit) {
        value = maximumForInput;
        event.target.value = String(maximumForInput);
        showToast(
          elements,
          `El total diario no puede superar ${formatHours(MAX_DAILY_HOURS)} horas.`,
          "warning"
        );
      }

      event.target.classList.toggle("is-invalid-value", exceededDailyLimit);
      state.entries[date].hours[centerId] = roundHours(value);
      state.dirty = true;
      setActiveDate(state, elements, date);
      updateSingleRow(state, elements, date);
      return;
    }

    if (event.target.matches(".observation-input")) {
      const date = event.target.dataset.observationDate;
      state.entries[date].observation = event.target.value;
      state.dirty = true;
      setActiveDate(state, elements, date);
    }
  });

  elements.periodSelect.addEventListener("change", () => {
    if (state.dirty) {
      persistState(state);
    }

    state = loadState(elements.periodSelect.value);
    renderAll(state, elements);
    showToast(elements, `Se cargó el período ${PERIOD_CONFIG[state.period]?.label || state.period}.`, "info");
  });

  elements.applyCentersButton.addEventListener("click", () => {
    const selectedIds = [...elements.centersList.querySelectorAll(".center-checkbox:checked")]
      .map((input) => input.value);

    if (!selectedIds.length) {
      showToast(elements, "Debes seleccionar al menos un centro de costo.", "warning");
      return;
    }

    state.selectedCenterIds = selectedIds;
    state.dirty = true;
    renderTable(state, elements);
    updateSummary(state, elements);
    bootstrap.Modal.getOrCreateInstance(elements.centersModal).hide();
    showToast(elements, "La tabla fue actualizada con los centros seleccionados.", "success");
  });

  elements.copyDayButton.addEventListener("click", () => {
    if (!state.activeDate) {
      showToast(elements, "Selecciona primero un día de la tabla.", "warning");
      return;
    }

    const previousDate = findPreviousEditableDate(state, state.activeDate);

    if (!previousDate || !copyEntry(state, previousDate, state.activeDate)) {
      showToast(elements, "No existe un día anterior disponible para copiar.", "warning");
      return;
    }

    renderTable(state, elements);
    updateSummary(state, elements);
    setActiveDate(state, elements, state.activeDate);
    showToast(elements, "Se copiaron las horas del día hábil anterior.", "success");
  });

  elements.copyWeekButton.addEventListener("click", () => {
    if (!state.activeDate) {
      showToast(elements, "Selecciona un día de la semana que deseas completar.", "warning");
      return;
    }

    const days = createMonthDays(state.period);
    const activeIndex = days.findIndex((day) => day.date === state.activeDate);
    let copied = 0;

    for (let offset = 0; offset < 7; offset += 1) {
      const target = days[activeIndex + offset];
      const source = days[activeIndex + offset - 7];

      if (target && source && !target.weekend && copyEntry(state, source.date, target.date)) {
        copied += 1;
      }
    }

    if (!copied) {
      showToast(elements, "No hay una semana anterior disponible dentro de este período.", "warning");
      return;
    }

    renderTable(state, elements);
    updateSummary(state, elements);
    setActiveDate(state, elements, state.activeDate);
    showToast(elements, `Se copiaron ${copied} días desde la semana anterior.`, "success");
  });

  elements.copyMonthButton.addEventListener("click", () => {
    const previousPeriod = getPreviousPeriod(state.period);
    const stored = localStorage.getItem(storageKey(previousPeriod));

    if (!stored) {
      showToast(elements, "No existe un registro guardado del mes anterior para copiar.", "warning");
      return;
    }

    try {
      const previousState = normalizeStoredState(JSON.parse(stored), previousPeriod);
      const currentDays = createMonthDays(state.period);
      const previousDays = createMonthDays(previousPeriod);

      currentDays.forEach((currentDay, index) => {
        const previousDay = previousDays[index];
        if (!currentDay.weekend && previousDay && previousState.entries[previousDay.date]) {
          getSelectedCenters(state).forEach((center) => {
            state.entries[currentDay.date].hours[center.id] = Number(
              previousState.entries[previousDay.date].hours?.[center.id] || 0
            );
          });
          state.entries[currentDay.date].observation = previousState.entries[previousDay.date].observation || "";
        }
      });

      state.dirty = true;
      renderTable(state, elements);
      updateSummary(state, elements);
      showToast(elements, "Se copiaron los datos disponibles del mes anterior.", "success");
    } catch (error) {
      console.error(error);
      showToast(elements, "El registro anterior no tiene un formato válido.", "danger");
    }
  });

  elements.saveButton.addEventListener("click", () => {
    persistState(state);
    showToast(elements, "El registro quedó guardado localmente en este navegador.", "success");
  });

  elements.exportButton.addEventListener("click", () => {
    exportCsv(state);
    showToast(elements, "Se descargó un archivo CSV compatible con Microsoft Excel.", "success");
  });

  elements.submitButton.addEventListener("click", () => {
    const expected = PERIOD_CONFIG[state.period]?.expectedHours || 0;
    const registered = getRegisteredHours(state);
    const remaining = Math.max(0, roundHours(expected - registered));

    if (remaining > 0) {
      elements.approvalWarning.textContent = `Aún quedan ${formatHours(remaining)} horas por registrar. Puedes enviar el período, pero la jefatura verá esta diferencia.`;
      elements.approvalWarning.classList.remove("d-none");
    } else {
      elements.approvalWarning.classList.add("d-none");
    }

    bootstrap.Modal.getOrCreateInstance(elements.approvalModal).show();
  });

  elements.confirmSubmitButton.addEventListener("click", () => {
    state.status = "submitted";
    persistState(state);
    renderAll(state, elements);
    bootstrap.Modal.getOrCreateInstance(elements.approvalModal).hide();
    showToast(elements, "El período fue enviado para aprobación y quedó bloqueado.", "success");
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });
}
