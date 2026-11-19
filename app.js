(() => {
  const CFG = window.SWAP_SHOP_CONFIG || {};
  const state = {
    items: [],
    snapshotById: new Map(),
    mode: "shop",
    search: "",
    category: "",
    color: "",
    swatch: "",
    condition: "",
    size: "",
    sort: "featured",
    activeItem: null,
  };

  const SWATCH_GROUPS = {
    black: ["black"],
    light: ["white", "cream"],
    grey: ["grey", "gray"],
    blue: ["blue", "light blue", "navy"],
    green: ["green", "sage"],
    pink: ["pink", "red", "purple"],
    warm: ["mustard", "orange", "beige", "brown"],
    multi: ["striped", "multi"],
  };

  const els = {
    grid: document.getElementById("catalog-grid"),
    empty: document.getElementById("empty-state"),
    resultsCount: document.getElementById("results-count"),
    statAvailable: document.getElementById("stat-available"),
    statUpcycle: document.getElementById("stat-upcycle"),
    statClaimed: document.getElementById("stat-claimed"),
    tabShop: document.getElementById("tab-count-shop"),
    tabUpcycle: document.getElementById("tab-count-upcycle"),
    tabClaimed: document.getElementById("tab-count-claimed"),
    modeBanner: document.getElementById("mode-banner"),
    modeBannerText: document.getElementById("mode-banner-text"),
    syncStatus: document.getElementById("sync-status"),
    syncStatusText: document.getElementById("sync-status-text"),
    search: document.getElementById("search-input"),
    category: document.getElementById("filter-category"),
    color: document.getElementById("filter-color"),
    condition: document.getElementById("filter-condition"),
    size: document.getElementById("filter-size"),
    sort: document.getElementById("sort-select"),
    resetBtn: document.getElementById("btn-reset-filters"),
    emptyResetBtn: document.getElementById("btn-empty-reset"),
    modal: document.getElementById("item-modal"),
    modalClose: document.getElementById("modal-close"),
    modalImg: document.getElementById("modal-img"),
    modalBadges: document.getElementById("modal-badges"),
    modalId: document.getElementById("modal-id"),
    modalTitle: document.getElementById("modal-title"),
    modalPriceRow: document.getElementById("modal-price-row"),
    modalSpecs: document.getElementById("modal-specs"),
    modalUpcycleBox: document.getElementById("modal-upcycle-box"),
    modalUpcycleNotes: document.getElementById("modal-upcycle-notes"),
    modalActions: document.getElementById("modal-action-buttons"),
    copyIdBtn: document.getElementById("btn-copy-id"),
    shareLinkBtn: document.getElementById("btn-share-link"),
    zoomBtn: document.getElementById("btn-zoom-photo"),
    beforeAfterBar: document.getElementById("before-after-bar"),
    lightbox: document.getElementById("photo-lightbox"),
    lightboxImg: document.getElementById("lightbox-img"),
    lightboxClose: document.getElementById("lightbox-close"),
    swatchBar: document.getElementById("swatch-bar"),
    inlineForm: document.getElementById("inline-request-form"),
    inlineFormTitle: document.getElementById("inline-form-title"),
    inlineFormCancel: document.getElementById("inline-form-cancel"),
    formActionType: document.getElementById("form-action-type"),
    formName: document.getElementById("form-name"),
    formContact: document.getElementById("form-contact"),
    formNotesLabel: document.getElementById("form-notes-label"),
    formNotes: document.getElementById("form-notes"),
    formSubmitBtn: document.getElementById("form-submit-btn"),
    formFeedback: document.getElementById("form-feedback"),
  };

  function extractDriveFileId(url) {
    if (!url) return "";
    const m1 = url.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
    if (m1) return m1[1];
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
    if (m2) return m2[1];
    return "";
  }

  function resolveImageUrl(item) {
    const snap = state.snapshotById.get(item.itemId);
    const liveDriveId = extractDriveFileId(item.garmentPhotoLink);
    // If someone replaced the Drive link with a new post-upcycle photo, load the new Drive thumbnail!
    if (liveDriveId && snap && snap.originalDriveFileId && liveDriveId !== snap.originalDriveFileId) {
      return `https://drive.google.com/thumbnail?id=${liveDriveId}&sz=w900`;
    }
    if (item.localImage) return `./${item.localImage}`;
    if (snap && snap.localImage) return `./${snap.localImage}`;
    if (liveDriveId) return `https://drive.google.com/thumbnail?id=${liveDriveId}&sz=w900`;
    return "";
  }

  function isAvailableForShop(item) {
    const s = (item.status || "In Inventory").toLowerCase();
    return s === "in inventory" || s === "ready for sale";
  }

  function isUpcycleCandidate(item) {
    const s = (item.status || "In Inventory").toLowerCase();
    const pot = (item.upcyclePotential || "").toLowerCase();
    return s === "in inventory" && (pot === "yes" || pot === "maybe");
  }

  function isClaimedOrInProgress(item) {
    const s = (item.status || "").toLowerCase();
    return s === "claimed for upcycle" || s === "in progress";
  }

  function isUpcycledReady(item) {
    const s = (item.status || "").toLowerCase();
    return s === "ready for sale" && Boolean(item.assignedDesigner);
  }

  function formatPrice(item) {
    const rawPrice = String(item.priceHkd || "").trim();
    if (rawPrice) {
      const cleaned = rawPrice.replace(/^HK\$/i, "").replace(/^\$/, "");
      return { text: `HK$${cleaned}`, isEstimated: false };
    }
    const sug = String(item.suggestedPrice || "").trim();
    if (sug) {
      return { text: `Est. ${sug}`, isEstimated: true };
    }
    return { text: "Price TBD", isEstimated: true };
  }

  function buildGoogleFormUrl(item, requestType) {
    const f = CFG.GOOGLE_FORM || {};
    if (!f.baseUrl) return "#";
    const params = new URLSearchParams({
      usp: "pp_url",
      [f.entryItemId]: item.itemId || "",
      [f.entryDescription]: item.description || "",
      [f.entryRequestType]: requestType === "upcycle" ? f.upcycleLabel : f.reserveLabel,
    });
    return `${f.baseUrl}?${params.toString()}`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setSyncStatus(text, isLive) {
    els.syncStatusText.textContent = text;
    els.syncStatus.classList.toggle("is-live", Boolean(isLive));
  }

  function populateFilterOptions() {
    const categories = new Set();
    const colors = new Set();
    const conditions = new Set();
    const sizes = new Set();

    state.items.forEach((it) => {
      if (it.category) categories.add(it.category);
      if (it.color) colors.add(it.color);
      if (it.condition) conditions.add(it.condition);
      if (it.size) sizes.add(it.size);
    });

    fillSelect(els.category, "All Categories", [...categories].sort());
    fillSelect(els.color, "All Colors", [...colors].sort());
    fillSelect(els.condition, "All Conditions", ["New with tags", "Like new", "Good", "Fair", "Needs repair"].filter((c) => conditions.has(c)));
    fillSelect(els.size, "All Sizes", [...sizes].sort());
  }

  function fillSelect(selectEl, defaultLabel, values) {
    const current = selectEl.value;
    selectEl.innerHTML = `<option value="">${defaultLabel}</option>` +
      values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    if (values.includes(current)) selectEl.value = current;
  }

  function updateCounts() {
    const shopCount = state.items.filter(isAvailableForShop).length;
    const upcycleCount = state.items.filter(isUpcycleCandidate).length;
    const claimedCount = state.items.filter(isClaimedOrInProgress).length;

    els.statAvailable.textContent = shopCount;
    els.statUpcycle.textContent = upcycleCount;
    els.statClaimed.textContent = claimedCount;
    els.tabShop.textContent = shopCount;
    els.tabUpcycle.textContent = upcycleCount;
    els.tabClaimed.textContent = claimedCount;
  }

  function getFilteredItems() {
    const q = state.search.trim().toLowerCase();
    let list = state.items.filter((item) => {
      if (state.mode === "shop" && !isAvailableForShop(item)) return false;
      if (state.mode === "upcycle" && !isUpcycleCandidate(item)) return false;
      if (state.mode === "claimed" && !isClaimedOrInProgress(item)) return false;

      if (state.category && item.category !== state.category) return false;
      if (state.color && item.color !== state.color) return false;
      if (state.swatch) {
        const allowed = SWATCH_GROUPS[state.swatch] || [];
        if (!allowed.includes((item.color || "").toLowerCase())) return false;
      }
      if (state.condition && item.condition !== state.condition) return false;
      if (state.size && item.size !== state.size) return false;

      if (q) {
        const hay = [
          item.itemId,
          item.description,
          item.color,
          item.brand,
          item.material,
          item.upcycleNotes,
          item.assignedDesigner,
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (state.sort === "featured") {
      list.sort((a, b) => {
        const aUp = isUpcycledReady(a) ? 0 : 1;
        const bUp = isUpcycledReady(b) ? 0 : 1;
        if (aUp !== bUp) return aUp - bUp;
        if (state.mode === "upcycle") {
          const aYes = (a.upcyclePotential || "") === "Yes" ? 0 : 1;
          const bYes = (b.upcyclePotential || "") === "Yes" ? 0 : 1;
          if (aYes !== bYes) return aYes - bYes;
        }
        return (a.itemId || "").localeCompare(b.itemId || "");
      });
    } else if (state.sort === "id-asc") {
      list.sort((a, b) => (a.itemId || "").localeCompare(b.itemId || ""));
    } else if (state.sort === "id-desc") {
      list.sort((a, b) => (b.itemId || "").localeCompare(a.itemId || ""));
    } else if (state.sort === "color") {
      list.sort((a, b) => (a.color || "").localeCompare(b.color || ""));
    }

    return list;
  }

  function renderBanner() {
    const isUpcycle = state.mode === "upcycle";
    els.modeBanner.classList.toggle("is-upcycle", isUpcycle);
    if (state.mode === "shop") {
      els.modeBannerText.textContent =
        "Browse available clothes. Prices marked \"Est.\" show suggested pocket-money ranges until finalized. Click any piece to reserve or ask about it.";
    } else if (state.mode === "upcycle") {
      els.modeBannerText.textContent =
        "For student upcyclers: explore garments with high redesign potential, check the design ideas, and click \"Claim for Upcycle\" to reserve a piece for your project.";
    } else {
      els.modeBannerText.textContent =
        "Pieces currently claimed by student designers for upcycling. Once reworked, re-photographed, and repriced, they return to Shop Available.";
    }
  }

  function renderGrid() {
    const items = getFilteredItems();
    const hasFilters = Boolean(state.search || state.category || state.color || state.swatch || state.condition || state.size);
    els.resetBtn.hidden = !hasFilters;
    els.resultsCount.textContent = `Showing ${items.length} ${items.length === 1 ? "item" : "items"}`;

    if (!items.length) {
      els.grid.innerHTML = "";
      els.empty.hidden = false;
      return;
    }

    els.empty.hidden = true;
    els.grid.innerHTML = items.map((item) => {
      const imgUrl = resolveImageUrl(item);
      const price = formatPrice(item);
      const chips = [item.color, item.size ? `Size ${item.size}` : "", item.condition, item.brand]
        .filter(Boolean)
        .slice(0, 3);

      let rightBadge = "";
      if (isUpcycledReady(item)) {
        rightBadge = `<span class="badge badge-upcycled">Upcycled</span>`;
      } else if (isClaimedOrInProgress(item)) {
        rightBadge = `<span class="badge badge-claimed">${escapeHtml(item.status)}</span>`;
      } else if (state.mode === "upcycle" && item.upcyclePotential === "Yes") {
        rightBadge = `<span class="badge badge-upcycle-pick">Top Pick</span>`;
      }

      const upcycleSnippet = state.mode === "upcycle" && item.upcycleNotes
        ? `<div class="card-upcycle-note">${escapeHtml(item.upcycleNotes)}</div>`
        : "";

      const designerLine = item.assignedDesigner
        ? `<div class="card-designer">Designer: ${escapeHtml(item.assignedDesigner)}</div>`
        : "";

      const ctaText = state.mode === "upcycle"
        ? "Claim piece &rarr;"
        : (state.mode === "claimed" ? "View details &rarr;" : "Reserve / Ask &rarr;");

      return `
        <article class="item-card" data-id="${escapeHtml(item.itemId)}" tabindex="0" role="button" aria-label="View ${escapeHtml(item.itemId)} ${escapeHtml(item.description)}">
          <div class="card-media">
            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.description)}" loading="lazy" />
            <div class="card-top-badges">
              <span class="badge badge-id">${escapeHtml(item.itemId)}</span>
              ${rightBadge}
            </div>
          </div>
          <div class="card-body">
            <h3 class="card-title">${escapeHtml(item.description)}</h3>
            <div class="card-chips">
              ${chips.map((c) => `<span class="meta-chip">${escapeHtml(c)}</span>`).join("")}
            </div>
            ${upcycleSnippet}
            ${designerLine}
            <div class="card-footer">
              <span class="price-tag ${price.isEstimated ? "is-est" : ""}">${escapeHtml(price.text)}</span>
              <span class="card-cta ${state.mode === "upcycle" ? "is-upcycle" : ""}">${ctaText}</span>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function openModal(item) {
    state.activeItem = item;
    const currentImg = resolveImageUrl(item);
    els.modalImg.src = currentImg;
    els.modalImg.alt = item.description || item.itemId;
    els.modalId.textContent = item.itemId;
    els.modalTitle.textContent = item.description;
    els.copyIdBtn.textContent = "Copy ID";

    // Before / After toggle when an upcycled piece has a brand-new photo
    const snap = state.snapshotById.get(item.itemId);
    const liveDriveId = extractDriveFileId(item.garmentPhotoLink);
    const hasNewUpcyclePhoto = Boolean(
      isUpcycledReady(item) && snap && snap.localImage && liveDriveId && snap.originalDriveFileId && liveDriveId !== snap.originalDriveFileId
    );
    els.beforeAfterBar.hidden = !hasNewUpcyclePhoto;
    if (hasNewUpcyclePhoto) {
      els.beforeAfterBar.querySelectorAll(".ba-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.ba === "after");
      });
    }

    const badges = [];
    if (isUpcycledReady(item)) {
      badges.push(`<span class="badge badge-upcycled">Upcycled by ${escapeHtml(item.assignedDesigner)}</span>`);
    } else if (item.status) {
      badges.push(`<span class="badge ${isClaimedOrInProgress(item) ? "badge-claimed" : "badge-upcycle-pick"}">${escapeHtml(item.status)}</span>`);
    }
    els.modalBadges.innerHTML = badges.join("");

    const price = formatPrice(item);
    els.modalPriceRow.innerHTML = `
      <span class="price-tag ${price.isEstimated ? "is-est" : ""}" style="font-size:1.1rem;">${escapeHtml(price.text)}</span>
      ${price.isEstimated ? '<span class="meta-chip">Suggested pocket-money range</span>' : '<span class="meta-chip">Final price</span>'}
    `;

    const specs = [
      ["Category", item.category || "Tops"],
      ["Color", item.color || "Not listed"],
      ["Size", item.size || "Ask / Check rack"],
      ["Condition", item.condition || "Good"],
      ["Material", item.material || "Not listed"],
      ["Brand", item.brand || "Unbranded / Tag not shown"],
    ];
    if (item.assignedDesigner) {
      specs.push(["Assigned Designer", item.assignedDesigner]);
    }

    els.modalSpecs.innerHTML = specs.map(([k, v]) => `
      <div class="spec-item">
        <dt>${escapeHtml(k)}</dt>
        <dd>${escapeHtml(v)}</dd>
      </div>
    `).join("");

    if (item.upcycleNotes) {
      els.modalUpcycleBox.hidden = false;
      els.modalUpcycleNotes.textContent = item.upcycleNotes;
    } else {
      els.modalUpcycleBox.hidden = true;
    }

    els.inlineForm.hidden = true;
    els.formFeedback.hidden = true;
    renderModalActions(item);
    els.modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function renderModalActions(item) {
    const hasApi = Boolean(CFG.APPS_SCRIPT_URL);
    const canClaim = (item.status || "In Inventory").toLowerCase() === "in inventory";
    const canReserve = isAvailableForShop(item);

    if (hasApi) {
      let html = "";
      if (canReserve) {
        html += `<button type="button" class="btn btn-primary" data-inline-action="reserve">Reserve / Ask about this item</button>`;
      }
      if (canClaim) {
        html += `<button type="button" class="btn btn-terracotta" data-inline-action="claim_upcycle">Claim for Upcycle</button>`;
      }
      if (!html) {
        html = `<span class="meta-chip">Currently ${escapeHtml(item.status)}</span>`;
      }
      els.modalActions.innerHTML = html;
      return;
    }

    // Out-of-the-box pre-filled Google Form links
    const reserveUrl = buildGoogleFormUrl(item, "reserve");
    const upcycleUrl = buildGoogleFormUrl(item, "upcycle");
    let html = "";
    if (canReserve) {
      html += `<a class="btn btn-primary" href="${escapeHtml(reserveUrl)}" target="_blank" rel="noopener noreferrer">Reserve / Ask about this item</a>`;
    }
    if (canClaim) {
      html += `<a class="btn btn-terracotta" href="${escapeHtml(upcycleUrl)}" target="_blank" rel="noopener noreferrer">Claim for Upcycle</a>`;
    }
    if (!html) {
      html = `<span class="meta-chip">Currently ${escapeHtml(item.status)}</span>`;
    }
    els.modalActions.innerHTML = html;
  }

  function openInlineForm(actionType) {
    els.formActionType.value = actionType;
    if (actionType === "claim_upcycle") {
      els.inlineFormTitle.textContent = `Claim ${state.activeItem.itemId} for Upcycling`;
      els.formNotesLabel.textContent = "Upcycle Design Idea (optional)";
      els.formSubmitBtn.textContent = "Confirm Upcycle Claim";
      els.formSubmitBtn.className = "btn btn-terracotta btn-full";
    } else {
      els.inlineFormTitle.textContent = `Reserve / Ask about ${state.activeItem.itemId}`;
      els.formNotesLabel.textContent = "Question or Pickup Note (optional)";
      els.formSubmitBtn.textContent = "Send Reservation / Question";
      els.formSubmitBtn.className = "btn btn-primary btn-full";
    }
    els.formFeedback.hidden = true;
    els.inlineForm.hidden = false;
    els.formName.focus();
  }

  function closeModal() {
    els.modal.hidden = true;
    document.body.style.overflow = "";
    state.activeItem = null;
  }

  async function loadLocalSnapshot() {
    const res = await fetch("./data/inventory.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load inventory.json");
    const data = await res.json();
    const items = data.items || [];
    state.snapshotById = new Map(items.map((it) => [it.itemId, it]));
    state.items = items;
    populateFilterOptions();
    updateCounts();
    renderBanner();
    renderGrid();
    setSyncStatus("Catalog ready", false);
  }

  async function tryLiveSync() {
    // 1. Prefer Apps Script Web App API if configured
    if (CFG.APPS_SCRIPT_URL) {
      try {
        const res = await fetch(CFG.APPS_SCRIPT_URL, { cache: "no-store" });
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.items) && data.items.length > 0) {
          state.items = data.items;
          populateFilterOptions();
          updateCounts();
          renderGrid();
          setSyncStatus("Live from Inventory Sheet", true);
          return;
        }
      } catch (_) {
        // Keep snapshot
      }
    }

    // 2. Fallback: try public Google Sheet GViz endpoint (only when explicitly enabled)
    if (CFG.ENABLE_PUBLIC_SHEET_SYNC && CFG.SHEET_ID) {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${CFG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CFG.SHEET_TAB || "Inventory")}`;
        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();
        const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
        if (m) {
          const parsed = JSON.parse(m[1]);
          const rows = (parsed.table && parsed.table.rows) || [];
          const liveItems = rows
            .map((r) => {
              const cell = (idx) => {
                const c = r.c && r.c[idx];
                return c ? String(c.f != null ? c.f : (c.v != null ? c.v : "")).trim() : "";
              };
              const itemId = cell(0);
              const desc = cell(3);
              if (!itemId && !desc) return null;
              return {
                itemId,
                dateLogged: cell(1),
                category: cell(2) || "Tops",
                description: desc,
                size: cell(4),
                color: cell(5),
                material: cell(6),
                condition: cell(7) || "Good",
                brand: cell(8),
                garmentPhotoLink: cell(9),
                upcyclePotential: cell(11),
                upcycleNotes: cell(12),
                assignedDesigner: cell(13),
                status: cell(14) || "In Inventory",
                priceHkd: cell(15),
                suggestedPrice: cell(17),
              };
            })
            .filter(Boolean);

          if (liveItems.length > 0) {
            state.items = liveItems;
            populateFilterOptions();
            updateCounts();
            renderGrid();
            setSyncStatus("Live from Inventory Sheet", true);
          }
        }
      } catch (_) {
        // Sheet is private; snapshot remains active
      }
    }
  }

  function bindEvents() {
    document.querySelectorAll(".mode-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-tab").forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        state.mode = btn.dataset.mode;
        renderBanner();
        renderGrid();
      });
    });

    els.search.addEventListener("input", (e) => {
      state.search = e.target.value;
      renderGrid();
    });
    els.category.addEventListener("change", (e) => {
      state.category = e.target.value;
      renderGrid();
    });
    els.color.addEventListener("change", (e) => {
      state.color = e.target.value;
      if (state.color) {
        state.swatch = "";
        els.swatchBar.querySelectorAll(".swatch-pill").forEach((p) => p.classList.toggle("active", p.dataset.swatch === ""));
      }
      renderGrid();
    });
    els.swatchBar.addEventListener("click", (e) => {
      const pill = e.target.closest(".swatch-pill");
      if (!pill) return;
      state.swatch = pill.dataset.swatch;
      if (state.swatch) {
        state.color = "";
        els.color.value = "";
      }
      els.swatchBar.querySelectorAll(".swatch-pill").forEach((p) => p.classList.toggle("active", p === pill));
      renderGrid();
    });
    els.condition.addEventListener("change", (e) => {
      state.condition = e.target.value;
      renderGrid();
    });
    els.size.addEventListener("change", (e) => {
      state.size = e.target.value;
      renderGrid();
    });
    els.sort.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderGrid();
    });

    const resetFilters = () => {
      state.search = "";
      state.category = "";
      state.color = "";
      state.swatch = "";
      state.condition = "";
      state.size = "";
      els.search.value = "";
      els.category.value = "";
      els.color.value = "";
      els.condition.value = "";
      els.size.value = "";
      els.swatchBar.querySelectorAll(".swatch-pill").forEach((p) => p.classList.toggle("active", p.dataset.swatch === ""));
      renderGrid();
    };
    els.resetBtn.addEventListener("click", resetFilters);
    els.emptyResetBtn.addEventListener("click", resetFilters);

    els.grid.addEventListener("click", (e) => {
      const card = e.target.closest(".item-card");
      if (!card) return;
      const item = state.items.find((it) => it.itemId === card.dataset.id);
      if (item) openModal(item);
    });
    els.grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".item-card");
      if (!card) return;
      e.preventDefault();
      const item = state.items.find((it) => it.itemId === card.dataset.id);
      if (item) openModal(item);
    });

    els.modalClose.addEventListener("click", closeModal);
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!els.lightbox.hidden) {
          els.lightbox.hidden = true;
        } else if (!els.modal.hidden) {
          closeModal();
        }
      }
    });

    const openLightbox = () => {
      if (!els.modalImg.src) return;
      els.lightboxImg.src = els.modalImg.src;
      els.lightboxImg.alt = els.modalImg.alt;
      els.lightbox.hidden = false;
    };
    els.modalImg.addEventListener("click", openLightbox);
    els.zoomBtn.addEventListener("click", openLightbox);
    els.lightboxClose.addEventListener("click", () => { els.lightbox.hidden = true; });
    els.lightbox.addEventListener("click", (e) => {
      if (e.target === els.lightbox || e.target === els.lightboxImg) els.lightbox.hidden = true;
    });

    els.beforeAfterBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".ba-btn");
      if (!btn || !state.activeItem) return;
      const snap = state.snapshotById.get(state.activeItem.itemId);
      els.beforeAfterBar.querySelectorAll(".ba-btn").forEach((b) => b.classList.toggle("active", b === btn));
      els.modalImg.src = btn.dataset.ba === "before" && snap ? `./${snap.localImage}` : resolveImageUrl(state.activeItem);
    });

    els.copyIdBtn.addEventListener("click", async () => {
      if (!state.activeItem) return;
      try {
        await navigator.clipboard.writeText(state.activeItem.itemId);
        els.copyIdBtn.textContent = "Copied!";
        setTimeout(() => { els.copyIdBtn.textContent = "Copy ID"; }, 1500);
      } catch (_) {
        els.copyIdBtn.textContent = state.activeItem.itemId;
      }
    });

    els.shareLinkBtn.addEventListener("click", async () => {
      if (!state.activeItem) return;
      const url = new URL(window.location.href);
      url.searchParams.set("item", state.activeItem.itemId);
      try {
        await navigator.clipboard.writeText(url.toString());
        els.shareLinkBtn.textContent = "Link copied!";
        setTimeout(() => { els.shareLinkBtn.textContent = "Copy Link"; }, 1500);
      } catch (_) {
        els.shareLinkBtn.textContent = "Copy failed";
      }
    });

    els.modalActions.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-inline-action]");
      if (!btn) return;
      openInlineForm(btn.dataset.inlineAction);
    });

    els.inlineFormCancel.addEventListener("click", () => {
      els.inlineForm.hidden = true;
    });

    els.inlineForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!state.activeItem || !CFG.APPS_SCRIPT_URL) return;
      els.formSubmitBtn.disabled = true;
      els.formFeedback.hidden = true;

      const payload = {
        action: els.formActionType.value,
        itemId: state.activeItem.itemId,
        description: state.activeItem.description,
        name: els.formName.value.trim(),
        contact: els.formContact.value.trim(),
        notes: els.formNotes.value.trim(),
      };

      try {
        const res = await fetch(CFG.APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Request failed");

        els.formFeedback.className = "form-feedback is-ok";
        if (payload.action === "claim_upcycle") {
          state.activeItem.status = "Claimed for Upcycle";
          state.activeItem.assignedDesigner = payload.name;
          els.formFeedback.textContent = `Claimed! ${state.activeItem.itemId} is now assigned to ${payload.name}.`;
          updateCounts();
          renderGrid();
          renderModalActions(state.activeItem);
        } else {
          els.formFeedback.textContent = `Sent! The Swap & Shop team received your request for ${state.activeItem.itemId}.`;
        }
        els.formFeedback.hidden = false;
        els.inlineForm.reset();
      } catch (err) {
        els.formFeedback.className = "form-feedback is-err";
        els.formFeedback.textContent = err.message || "Could not submit right now. Please try again.";
        els.formFeedback.hidden = false;
      } finally {
        els.formSubmitBtn.disabled = false;
      }
    });
  }

  async function init() {
    bindEvents();
    await loadLocalSnapshot();
    const deepLinkId = new URLSearchParams(window.location.search).get("item");
    if (deepLinkId) {
      const target = state.items.find((it) => (it.itemId || "").toUpperCase() === deepLinkId.toUpperCase());
      if (target) openModal(target);
    }
    tryLiveSync();
  }

  init();
})();
