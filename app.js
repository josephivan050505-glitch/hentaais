/**
 * Hentai Vault - Application logic
 * Coordinates localStorage state, UI rendering, filters, statistics,
 * interactive star inputs, and JSON backups.
 */

// Initial seed data if vault is empty (so it looks "fino" at first glance)
const SEED_DATA = [
    {
        id: "seed-1",
        title: "Bible Black",
        url: "https://myanimelist.net/anime/368/Bible_Black",
        category: "OVA",
        rating: 5,
        image: "",
        tags: ["clásico", "sobrenatural", "misterio", "culto"],
        notes: "Un clásico absoluto de culto del género. Excelente ambientación oscura y banda sonora memorable. Imprescindible para conocer la historia del medio.",
        dateAdded: new Date(2026, 4, 10).toISOString()
    },
    {
        id: "seed-2",
        title: "Resort Boin",
        url: "https://myanimelist.net/anime/4029/Resort_Boin",
        category: "OVA",
        rating: 5,
        image: "",
        tags: ["vanilla", "milf", "harem", "comedia"],
        notes: "Animación de primer nivel y una de las tramas más entretenidas y ligeras. Excelente diseño de personajes y comedia divertida.",
        dateAdded: new Date(2026, 4, 15).toISOString()
    },
    {
        id: "seed-3",
        title: "Euphoria",
        url: "https://myanimelist.net/anime/10851/Euphoria",
        category: "OVA",
        rating: 4,
        image: "",
        tags: ["psicológico", "drama", "survival"],
        notes: "Reconocido por su intensidad, pero destaca por tener una trama y giros de guión sorprendentemente bien logrados en comparación con la media. No apto para sensibles.",
        dateAdded: new Date(2026, 4, 20).toISOString()
    }
];

// App State
let appState = {
    entries: [],
    filters: {
        search: "",
        category: "all",
        activeTag: null,
        sortBy: "rating-desc"
    }
};

// DOM Elements
const elements = {
    linksGrid: document.getElementById("links-grid"),
    emptyState: document.getElementById("empty-state"),
    modal: document.getElementById("link-modal"),
    form: document.getElementById("link-form"),
    modalTitle: document.getElementById("modal-title"),
    entryId: document.getElementById("entry-id"),
    entryTitle: document.getElementById("entry-title"),
    entryCategory: document.getElementById("entry-category"),
    entryRating: document.getElementById("entry-rating"),
    entryUrl: document.getElementById("entry-url"),
    entryImage: document.getElementById("entry-image"),
    entryTags: document.getElementById("entry-tags"),
    entryNotes: document.getElementById("entry-notes"),
    
    // Star Input UI
    starSelector: document.getElementById("star-rating-selector"),
    
    // Filter controls
    searchInput: document.getElementById("search-input"),
    categoryTabs: document.getElementById("category-tabs"),
    sortBy: document.getElementById("sort-by"),
    quickTagsContainer: document.getElementById("quick-tags-container"),
    itemsCountDisplay: document.getElementById("items-count-display"),
    heroFeatured: document.getElementById("hero-featured"),
    toastContainer: document.getElementById("toast-container"),
    
    // Stat elements
    statTotal: document.querySelector("#stat-total .stat-value"),
    statAvg: document.querySelector("#stat-avg .stat-value"),
    statTopTag: document.querySelector("#stat-top-tag .stat-value"),
    
    // Action Buttons
    btnOpenModal: document.getElementById("btn-open-modal"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    btnCancelModal: document.getElementById("btn-cancel-modal"),
    btnEmptyAdd: document.getElementById("btn-empty-add"),
    btnExport: document.getElementById("btn-export"),
    btnImportTrigger: document.getElementById("btn-import-trigger"),
    importFileInput: document.getElementById("import-file-input"),
    btnResetData: document.getElementById("btn-reset-data")
};

/* ==========================================
   INITIALIZATION & PERSISTENCE
   ========================================== */
function init() {
    loadData();
    setupEventListeners();
    render();
}

function loadData() {
    const rawData = localStorage.getItem("hentai_vault_data");
    if (rawData) {
        try {
            appState.entries = JSON.parse(rawData);
        } catch (e) {
            console.error("Error al leer localStorage, reiniciando estado.", e);
            appState.entries = [];
        }
    } else {
        // First load: seed with default data to look rich
        appState.entries = [...SEED_DATA];
        saveData();
    }
}

function saveData() {
    localStorage.setItem("hentai_vault_data", JSON.stringify(appState.entries));
}

/* ==========================================
   EVENT LISTENERS Setup
   ========================================== */
function setupEventListeners() {
    // Modal controls
    elements.btnOpenModal.addEventListener("click", () => openModal());
    elements.btnEmptyAdd.addEventListener("click", () => openModal());
    elements.btnCloseModal.addEventListener("click", closeModal);
    elements.btnCancelModal.addEventListener("click", closeModal);
    
    // Form submission
    elements.form.addEventListener("submit", handleFormSubmit);
    
    // Interactive Rating Stars
    const starBtns = elements.starSelector.querySelectorAll(".star-btn");
    starBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const ratingValue = parseInt(btn.getAttribute("data-value"));
            setFormRating(ratingValue);
        });
        btn.addEventListener("mouseenter", () => {
            const hoverVal = parseInt(btn.getAttribute("data-value"));
            highlightStars(hoverVal, true);
        });
        btn.addEventListener("mouseleave", () => {
            const currentVal = parseInt(elements.entryRating.value);
            highlightStars(currentVal);
        });
    });
    
    // Filtering & Sorting Input Events
    elements.searchInput.addEventListener("input", (e) => {
        appState.filters.search = e.target.value.toLowerCase().trim();
        render();
    });
    
    // Category Tabs Logic
    const tabBtns = elements.categoryTabs.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            appState.filters.category = btn.getAttribute("data-category");
            render();
        });
    });
    
    elements.sortBy.addEventListener("change", (e) => {
        appState.filters.sortBy = e.target.value;
        render();
    });
    
    // Backup & Restore
    elements.btnExport.addEventListener("click", exportData);
    elements.btnImportTrigger.addEventListener("click", () => elements.importFileInput.click());
    elements.importFileInput.addEventListener("change", importData);
    elements.btnResetData.addEventListener("click", resetData);
}

/* ==========================================
   TOAST SYSTEM (NEW)
   ========================================== */
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    const icon = type === "success" ? "✓" : type === "danger" ? "⚠" : "ℹ";
    
    toast.innerHTML = `
        <span class="toast-icon" style="font-weight: bold;">${icon}</span>
        <span class="toast-message">${escapeHTML(message)}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Animation fadeout handles destruction, but clean node after 3.3s
    setTimeout(() => {
        toast.remove();
    }, 3300);
}

/* ==========================================
   MODAL ACTIONS
   ========================================== */
function openModal(entryToEdit = null) {
    if (entryToEdit) {
        elements.modalTitle.textContent = "Editar Hentai de Bóveda";
        elements.entryId.value = entryToEdit.id;
        elements.entryTitle.value = entryToEdit.title;
        elements.entryCategory.value = entryToEdit.category;
        elements.entryUrl.value = entryToEdit.url;
        elements.entryImage.value = entryToEdit.image || "";
        elements.entryTags.value = entryToEdit.tags ? entryToEdit.tags.join(", ") : "";
        elements.entryNotes.value = entryToEdit.notes || "";
        setFormRating(entryToEdit.rating || 5);
    } else {
        elements.modalTitle.textContent = "Agregar Nuevo Hentai";
        elements.form.reset();
        elements.entryId.value = "";
        setFormRating(5); // Default to 5 stars
    }
    elements.modal.classList.remove("hidden");
    elements.entryTitle.focus();
}

function closeModal() {
    elements.modal.classList.add("hidden");
    elements.form.reset();
}

function setFormRating(ratingValue) {
    elements.entryRating.value = ratingValue;
    highlightStars(ratingValue);
}

function highlightStars(ratingValue, isHoverState = false) {
    const starBtns = elements.starSelector.querySelectorAll(".star-btn");
    starBtns.forEach(btn => {
        const val = parseInt(btn.getAttribute("data-value"));
        if (val <= ratingValue) {
            btn.classList.add("active");
            if (isHoverState) btn.classList.add("hover");
        } else {
            btn.classList.remove("active");
            btn.classList.remove("hover");
        }
    });
}

/* ==========================================
   FORM HANDLING & CRUD
   ========================================== */
function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = elements.entryId.value;
    const title = elements.entryTitle.value.trim();
    const category = elements.entryCategory.value;
    const rating = parseInt(elements.entryRating.value);
    const url = elements.entryUrl.value.trim();
    const image = elements.entryImage.value.trim();
    
    // Parse tags to array
    const rawTags = elements.entryTags.value;
    const tags = rawTags
        ? rawTags.split(",")
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0)
        : [];
        
    const notes = elements.entryNotes.value.trim();
    
    if (id) {
        // Edit mode
        const index = appState.entries.findIndex(entry => entry.id === id);
        if (index !== -1) {
            appState.entries[index] = {
                ...appState.entries[index],
                title,
                category,
                rating,
                url,
                image,
                tags,
                notes
            };
            showToast("Hentai actualizado con éxito.");
        }
    } else {
        // Create mode
        const newEntry = {
            id: 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            title,
            category,
            rating,
            url,
            image,
            tags,
            notes,
            dateAdded: new Date().toISOString()
        };
        appState.entries.unshift(newEntry);
        showToast("¡Hentai guardado en la Bóveda!");
    }
    
    saveData();
    closeModal();
    render();
}

function deleteEntry(id) {
    if (confirm("¿Estás seguro de que quieres eliminar esta joya de tu colección?")) {
        appState.entries = appState.entries.filter(entry => entry.id !== id);
        saveData();
        showToast("Elemento eliminado de la Bóveda.", "danger");
        render();
    }
}

/* ==========================================
   STATS CALCULATION
   ========================================== */
function recalculateStats() {
    const total = appState.entries.length;
    elements.statTotal.textContent = total;
    
    // Average Rating
    if (total > 0) {
        const sum = appState.entries.reduce((acc, curr) => acc + curr.rating, 0);
        elements.statAvg.textContent = (sum / total).toFixed(1);
    } else {
        elements.statAvg.textContent = "0.0";
    }
    
    // Favorite Tag / Genre
    const tagCounts = {};
    appState.entries.forEach(entry => {
        if (entry.tags) {
            entry.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });
    
    let favoriteTag = "-";
    let maxCount = 0;
    for (const [tag, count] of Object.entries(tagCounts)) {
        if (count > maxCount) {
            maxCount = count;
            favoriteTag = tag;
        }
    }
    elements.statTopTag.textContent = favoriteTag;
}

/* ==========================================
   HERO BANNER RENDER (NEW)
   ========================================== */
function renderHeroFeatured() {
    // Only display if we have at least one 5-star rating item, and not filtering
    const hasActiveFilters = appState.filters.search !== "" || appState.filters.category !== "all" || appState.filters.activeTag !== null;
    
    if (appState.entries.length === 0 || hasActiveFilters) {
        elements.heroFeatured.classList.add("hidden");
        return;
    }
    
    // Filter to find 5-star items
    const premiumItems = appState.entries.filter(entry => entry.rating === 5);
    if (premiumItems.length === 0) {
        elements.heroFeatured.classList.add("hidden");
        return;
    }
    
    // Get the newest one
    premiumItems.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    const featured = premiumItems[0];
    
    elements.heroFeatured.classList.remove("hidden");
    
    // Fallback cover initials
    const initials = featured.title
        .split(" ")
        .slice(0, 2)
        .map(w => w.charAt(0))
        .join("")
        .toUpperCase();
        
    let coverHtml = "";
    if (featured.image) {
        coverHtml = `<div class="hero-cover-art" style="background-image: url('${escapeHTML(featured.image)}');"></div>`;
    } else {
        coverHtml = `<div class="hero-cover-fallback">${escapeHTML(initials)}</div>`;
    }
    
    let tagsHtml = "";
    if (featured.tags && featured.tags.length > 0) {
        featured.tags.forEach(tag => {
            tagsHtml += `<span class="card-tag">#${escapeHTML(tag)}</span>`;
        });
    }
    
    elements.heroFeatured.innerHTML = `
        <div class="hero-banner-content">
            <div class="hero-left">
                <div class="hero-badge-row">
                    <span class="hero-featured-tag">★ Recomendación Premium</span>
                    <span class="badge-category category-${featured.category.toLowerCase()}">${escapeHTML(featured.category)}</span>
                </div>
                <h2 class="hero-title">${escapeHTML(featured.title)}</h2>
                <p class="hero-desc">${featured.notes ? escapeHTML(featured.notes) : "Sin descripción detallada disponible. Este es uno de tus favoritos calificado con 5 estrellas."}</p>
                <div class="hero-tags">
                    ${tagsHtml}
                </div>
                <div class="hero-actions-row">
                    <a href="${escapeHTML(featured.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                        Ver Contenido ahora ↗
                    </a>
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-hero-edit">
                        ✏️ Editar Detalles
                    </button>
                </div>
            </div>
            <div class="hero-right">
                ${coverHtml}
            </div>
        </div>
    `;
    
    document.getElementById("btn-hero-edit").addEventListener("click", () => openModal(featured));
}

/* ==========================================
   RENDERING ENGINE
   ========================================== */
function render() {
    recalculateStats();
    renderTagFilters();
    renderHeroFeatured();
    
    const filteredAndSorted = getFilteredAndSortedEntries();
    
    // Update items display count
    const totalCount = filteredAndSorted.length;
    elements.itemsCountDisplay.textContent = `Mostrando ${totalCount} de ${appState.entries.length} enlaces`;
    
    // Manage grid empty state
    if (appState.entries.length === 0) {
        elements.emptyState.classList.remove("hidden");
        elements.linksGrid.classList.add("hidden");
        return;
    } else {
        elements.emptyState.classList.add("hidden");
        elements.linksGrid.classList.remove("hidden");
    }
    
    if (totalCount === 0) {
        elements.linksGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; width: 100%; max-width: 100%; margin: 20px 0;">
                <div class="empty-icon">🔍</div>
                <h3>Sin coincidencias</h3>
                <p>Prueba ajustando los filtros o la barra de búsqueda.</p>
            </div>
        `;
        return;
    }
    
    // Clean and Populate grid
    elements.linksGrid.innerHTML = "";
    filteredAndSorted.forEach(entry => {
        const cardElement = createHentaiCard(entry);
        elements.linksGrid.appendChild(cardElement);
    });
}

function renderTagFilters() {
    // Collect unique tags
    const allTags = new Set();
    appState.entries.forEach(entry => {
        if (entry.tags) {
            entry.tags.forEach(tag => allTags.add(tag));
        }
    });
    
    if (allTags.size === 0) {
        elements.quickTagsContainer.innerHTML = '<span class="no-tags-tip">No hay etiquetas activas</span>';
        return;
    }
    
    elements.quickTagsContainer.innerHTML = "";
    
    // Add "All tags" clear pill if one is active
    if (appState.filters.activeTag) {
        const clearPill = document.createElement("span");
        clearPill.className = "tag-pill active";
        clearPill.textContent = `❌ ${appState.filters.activeTag}`;
        clearPill.addEventListener("click", () => {
            appState.filters.activeTag = null;
            render();
        });
        elements.quickTagsContainer.appendChild(clearPill);
    }
    
    allTags.forEach(tag => {
        // Skip current active tag in list since we show it as a clear pill
        if (tag === appState.filters.activeTag) return;
        
        const pill = document.createElement("span");
        pill.className = "tag-pill";
        pill.textContent = tag;
        pill.addEventListener("click", () => {
            appState.filters.activeTag = tag;
            render();
        });
        elements.quickTagsContainer.appendChild(pill);
    });
}

function getFilteredAndSortedEntries() {
    let result = [...appState.entries];
    
    // 1. Search Query filter (matches title, description, or tags)
    if (appState.filters.search) {
        const query = appState.filters.search;
        result = result.filter(entry => {
            const matchTitle = entry.title.toLowerCase().includes(query);
            const matchNotes = entry.notes && entry.notes.toLowerCase().includes(query);
            const matchTags = entry.tags && entry.tags.some(tag => tag.includes(query));
            return matchTitle || matchNotes || matchTags;
        });
    }
    
    // 2. Category filter
    if (appState.filters.category !== "all") {
        result = result.filter(entry => entry.category === appState.filters.category);
    }
    
    // 3. Active Tag filter
    if (appState.filters.activeTag) {
        result = result.filter(entry => entry.tags && entry.tags.includes(appState.filters.activeTag));
    }
    
    // 4. Sorting logic
    result.sort((a, b) => {
        switch (appState.filters.sortBy) {
            case "rating-desc":
                return b.rating - a.rating; // Stars from 5 to 1
            case "date-desc":
                return new Date(b.dateAdded) - new Date(a.dateAdded); // Newest first
            case "date-asc":
                return new Date(a.dateAdded) - new Date(b.dateAdded); // Oldest first
            case "title-asc":
                return a.title.localeCompare(b.title); // Alphabetical A-Z
            default:
                return 0;
        }
    });
    
    return result;
}

function createHentaiCard(entry) {
    const card = document.createElement("article");
    card.className = "hentai-card";
    
    // Generate initials for the fallback cover
    const initials = entry.title
        .split(" ")
        .slice(0, 2)
        .map(w => w.charAt(0))
        .join("")
        .toUpperCase();
        
    // Check if thumbnail is provided
    let bannerInnerHtml = "";
    if (entry.image) {
        bannerInnerHtml = `<div class="card-banner" style="background-image: url('${escapeHTML(entry.image)}');"></div>`;
    } else {
        // Fallback elegant gradient banner
        bannerInnerHtml = `
            <div class="card-banner-fallback">
                <div class="fallback-pattern"></div>
                <div class="fallback-initials">${escapeHTML(initials)}</div>
            </div>
        `;
    }
    
    // Assemble Badges in Banner
    const catClass = `category-${entry.category.toLowerCase()}`;
    
    // Generate tags markup
    let tagsHtml = "";
    if (entry.tags && entry.tags.length > 0) {
        entry.tags.forEach(tag => {
            tagsHtml += `<span class="card-tag">#${escapeHTML(tag)}</span>`;
        });
    }
    
    const notesText = entry.notes ? escapeHTML(entry.notes) : "Sin descripción guardada.";
    const notesClass = entry.notes ? "" : "empty";
    
    card.innerHTML = `
        <div class="hentai-card-banner-wrapper">
            ${bannerInnerHtml}
            <div class="card-play-overlay">
                <div class="play-icon-glow">▶</div>
            </div>
            <div class="card-badges">
                <span class="badge-category ${catClass}">${escapeHTML(entry.category)}</span>
                <span class="card-rating-badge">★ ${entry.rating}</span>
            </div>
        </div>
        <div class="card-body">
            <h3 class="card-title" title="${escapeHTML(entry.title)}">${escapeHTML(entry.title)}</h3>
            <p class="card-notes ${notesClass}">${notesText}</p>
            <div class="card-tags">
                ${tagsHtml}
            </div>
        </div>
        <div class="card-actions">
            <a href="${escapeHTML(entry.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-play">
                Ver Contenido ↗
            </a>
            <button type="button" class="card-btn-icon btn-edit" title="Editar enlace">
                ✏️
            </button>
            <button type="button" class="card-btn-icon btn-delete" title="Eliminar enlace">
                🗑️
            </button>
        </div>
    `;
    
    // Hook up card buttons
    card.querySelector(".btn-edit").addEventListener("click", () => openModal(entry));
    card.querySelector(".btn-delete").addEventListener("click", () => deleteEntry(entry.id));
    
    return card;
}

/* ==========================================
   BACKUP & RESET FUNCTIONS
   ========================================== */
function exportData() {
    if (appState.entries.length === 0) {
        showToast("No hay datos para exportar.", "danger");
        return;
    }
    
    const dataStr = JSON.stringify(appState.entries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    downloadAnchor.download = `hentai_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
    showToast("Respaldo descargado correctamente.");
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const imported = JSON.parse(evt.target.result);
            if (Array.isArray(imported)) {
                // Quick validation of array elements
                const isValid = imported.every(item => item.title && item.url && item.category);
                if (isValid) {
                    if (confirm(`¿Quieres importar ${imported.length} enlaces? Esto reemplazará tu colección actual.`)) {
                        appState.entries = imported;
                        saveData();
                        render();
                        showToast("¡Colección importada con éxito!");
                    }
                } else {
                    showToast("Formato de respaldo no válido.", "danger");
                }
            } else {
                showToast("El respaldo JSON debe ser una lista.", "danger");
            }
        } catch (err) {
            showToast("Error al leer el archivo JSON: " + err.message, "danger");
        }
        // Reset file input so same file can be uploaded again
        elements.importFileInput.value = "";
    };
    reader.readAsText(file);
}

function resetData() {
    const confirmation1 = confirm("⚠️ ATENCIÓN: Estás a punto de borrar TODA tu colección guardada en este navegador. ¿Deseas continuar?");
    if (confirmation1) {
        const confirmation2 = confirm("¿De verdad quieres borrar todo? Los datos se perderán de forma permanente a menos que tengas un respaldo.");
        if (confirmation2) {
            appState.entries = [];
            saveData();
            render();
            showToast("Bóveda formateada por completo.", "danger");
        }
    }
}

/* ==========================================
   UTILITY FUNCTIONS
   ========================================== */
function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Start application when page is ready
document.addEventListener("DOMContentLoaded", init);
