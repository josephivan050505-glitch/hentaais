/**
 * Hentai Vault - Application logic
 * Synchronizes database state in real-time using Firebase Firestore.
 * Handles CRUD operations, star ratings, interactive filters, stats,
 * and JSON backup exports.
 */

// Firebase Configuration (Credential provided by user)
const firebaseConfig = {
    apiKey: "AIzaSyDBICXpTB6E0nTo6iFMG5Irh7U1ul1E0K8",
    authDomain: "zartwlaz.firebaseapp.com",
    projectId: "zartwlaz",
    storageBucket: "zartwlaz.firebasestorage.app",
    messagingSenderId: "682461122990",
    appId: "1:682461122990:web:460e4f3ecfe4ab5afa783f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const hentaisCollection = db.collection("hentais");

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
   INITIALIZATION & FIRESTORE REAL-TIME SYNC
   ========================================== */
function init() {
    loadData();
    setupEventListeners();
}

function loadData() {
    showToast("Conectando con la base de datos...", "info");
    
    // Listen to firestore changes in real-time
    hentaisCollection.onSnapshot((snapshot) => {
        appState.entries = [];
        snapshot.forEach((doc) => {
            appState.entries.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Seed default database if empty
        if (appState.entries.length === 0) {
            seedDefaultData();
        } else {
            render();
        }
    }, (error) => {
        console.error("Error de conexión a Firestore:", error);
        showToast("Error de conexión a base de datos. Verifica tus reglas de seguridad.", "danger");
    });
}

function seedDefaultData() {
    // Write seeds to Firestore
    SEED_DATA.forEach(entry => {
        const { id, ...data } = entry;
        hentaisCollection.doc(id).set(data);
    });
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
   TOAST SYSTEM
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
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
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
        setFormRating(5);
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
   FORM HANDLING & CLOUD CRUD
   ========================================== */
function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = elements.entryId.value;
    const title = elements.entryTitle.value.trim();
    const category = elements.entryCategory.value;
    const rating = parseInt(elements.entryRating.value);
    const url = elements.entryUrl.value.trim();
    const image = elements.entryImage.value.trim();
    
    const rawTags = elements.entryTags.value;
    const tags = rawTags
        ? rawTags.split(",")
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0)
        : [];
        
    const notes = elements.entryNotes.value.trim();
    
    if (id) {
        // Edit Mode: Update in Firestore
        hentaisCollection.doc(id).update({
            title,
            category,
            rating,
            url,
            image,
            tags,
            notes
        }).then(() => {
            showToast("Hentai actualizado con éxito.");
        }).catch((err) => {
            console.error("Error al actualizar:", err);
            showToast("Error al guardar cambios en Firestore.", "danger");
        });
    } else {
        // Create Mode: Add to Firestore
        hentaisCollection.add({
            title,
            category,
            rating,
            url,
            image,
            tags,
            notes,
            dateAdded: new Date().toISOString()
        }).then(() => {
            showToast("¡Hentai guardado en la nube!");
        }).catch((err) => {
            console.error("Error al agregar:", err);
            showToast("Error al subir a la base de datos.", "danger");
        });
    }
    
    closeModal();
}

function deleteEntry(id) {
    if (confirm("¿Estás seguro de que quieres eliminar esta joya de tu colección?")) {
        hentaisCollection.doc(id).delete().then(() => {
            showToast("Elemento eliminado de la nube.", "danger");
        }).catch((err) => {
            console.error("Error al borrar:", err);
            showToast("Error al eliminar de Firestore.", "danger");
        });
    }
}

/* ==========================================
   STATS CALCULATION
   ========================================== */
function recalculateStats() {
    const total = appState.entries.length;
    elements.statTotal.textContent = total;
    
    if (total > 0) {
        const sum = appState.entries.reduce((acc, curr) => acc + curr.rating, 0);
        elements.statAvg.textContent = (sum / total).toFixed(1);
    } else {
        elements.statAvg.textContent = "0.0";
    }
    
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
   HERO BANNER RENDER
   ========================================== */
function renderHeroFeatured() {
    const hasActiveFilters = appState.filters.search !== "" || appState.filters.category !== "all" || appState.filters.activeTag !== null;
    
    if (appState.entries.length === 0 || hasActiveFilters) {
        elements.heroFeatured.classList.add("hidden");
        return;
    }
    
    const premiumItems = appState.entries.filter(entry => entry.rating === 5);
    if (premiumItems.length === 0) {
        elements.heroFeatured.classList.add("hidden");
        return;
    }
    
    // Get newest 5 star
    premiumItems.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    const featured = premiumItems[0];
    
    elements.heroFeatured.classList.remove("hidden");
    
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
    
    const totalCount = filteredAndSorted.length;
    elements.itemsCountDisplay.textContent = `Mostrando ${totalCount} de ${appState.entries.length} enlaces`;
    
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
    
    elements.linksGrid.innerHTML = "";
    filteredAndSorted.forEach(entry => {
        const cardElement = createHentaiCard(entry);
        elements.linksGrid.appendChild(cardElement);
    });
}

function renderTagFilters() {
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
    
    // 1. Search Query filter
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
                return b.rating - a.rating;
            case "date-desc":
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            case "date-asc":
                return new Date(a.dateAdded) - new Date(b.dateAdded);
            case "title-asc":
                return a.title.localeCompare(b.title);
            default:
                return 0;
        }
    });
    
    return result;
}

function createHentaiCard(entry) {
    const card = document.createElement("article");
    card.className = "hentai-card";
    
    const initials = entry.title
        .split(" ")
        .slice(0, 2)
        .map(w => w.charAt(0))
        .join("")
        .toUpperCase();
        
    let bannerInnerHtml = "";
    if (entry.image) {
        bannerInnerHtml = `<div class="card-banner" style="background-image: url('${escapeHTML(entry.image)}');"></div>`;
    } else {
        bannerInnerHtml = `
            <div class="card-banner-fallback">
                <div class="fallback-pattern"></div>
                <div class="fallback-initials">${escapeHTML(initials)}</div>
            </div>
        `;
    }
    
    const catClass = `category-${entry.category.toLowerCase()}`;
    
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
    
    card.querySelector(".btn-edit").addEventListener("click", () => openModal(entry));
    card.querySelector(".btn-delete").addEventListener("click", () => deleteEntry(entry.id));
    
    return card;
}

/* ==========================================
   BACKUP & RESET FUNCTIONS (CLOUD-INTEGRATION)
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

async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const imported = JSON.parse(evt.target.result);
            if (Array.isArray(imported)) {
                const isValid = imported.every(item => item.title && item.url && item.category);
                if (isValid) {
                    if (confirm(`¿Quieres importar ${imported.length} enlaces? Esto reemplazará la colección en la base de datos en la nube.`)) {
                        showToast("Importando a Firebase...", "info");
                        
                        // Clean existing documents in collection
                        const snapshot = await hentaisCollection.get();
                        const batch = db.batch();
                        snapshot.docs.forEach((doc) => {
                            batch.delete(doc.ref);
                        });
                        await batch.commit();
                        
                        // Insert imported documents
                        const addBatch = db.batch();
                        imported.forEach((item) => {
                            const newDocRef = hentaisCollection.doc();
                            const { id, ...itemData } = item;
                            addBatch.set(newDocRef, {
                                ...itemData,
                                dateAdded: itemData.dateAdded || new Date().toISOString()
                            });
                        });
                        await addBatch.commit();
                        showToast("¡Colección en la nube importada!");
                    }
                } else {
                    showToast("Formato de respaldo no válido.", "danger");
                }
            } else {
                showToast("El respaldo JSON debe ser una lista.", "danger");
            }
        } catch (err) {
            showToast("Error al importar: " + err.message, "danger");
        }
        elements.importFileInput.value = "";
    };
    reader.readAsText(file);
}

async function resetData() {
    const confirmation1 = confirm("⚠️ ATENCIÓN: Estás a punto de borrar TODA tu colección guardada en Firestore. ¿Deseas continuar?");
    if (confirmation1) {
        const confirmation2 = confirm("¿De verdad quieres borrar todo en la nube? Esto afectará a todos tus amigos.");
        if (confirmation2) {
            try {
                const snapshot = await hentaisCollection.get();
                const batch = db.batch();
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                showToast("Colección en la nube vaciada.", "danger");
            } catch (err) {
                console.error("Error al formatear:", err);
                showToast("Error al limpiar base de datos.", "danger");
            }
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
