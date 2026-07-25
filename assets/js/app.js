const CATEGORY_MAP = {
    "10000000": "ຍານພາຫະນະ",
    "20000000": "ອຸປະກອນສຳນັກງານ",
    "30000000": "ອຸປະກອນອາໄຫຼ່ທົ່ວໄປ",
    "40000000": "ອຸປະກອນທົ່ວໄປ",
    "50000000": "ອຸປະກອນໄຟຟ້າ",
    "60000000": "ອຸປະກອນລາຍການຜະລິດ",
    "70000000": "ອຸປະກອນ Lab",
    "80000000": "ອຸປະກອນກໍສ້າງ",
    "90000000": "ເຄື່ອງມືຊ່າງ"
};


const THEME_STORAGE_KEY = "LAO_WAREHOUSE_THEME";

function getStoredTheme() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY) || "dark";
    } catch (error) {
        return "dark";
    }
}

function applyTheme(theme) {
    const isDark = theme !== "light";
    document.documentElement.classList.toggle("dark", isDark);
    const icon = document.getElementById("theme-toggle-icon");
    const button = document.getElementById("theme-toggle-btn");

    if (icon) {
        icon.classList.toggle("fa-moon", isDark);
        icon.classList.toggle("fa-sun", !isDark);
    }

    if (button) {
        button.setAttribute("aria-pressed", String(!isDark));
        button.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    }
}

window.toggleTheme = function() {
    const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
        console.warn("Theme preference was not saved", error);
    }
    applyTheme(nextTheme);
};

// Initial default sample dataset
const DEFAULT_INVENTORY = [
    {
        barcode: "10000001",
        categoryCode: "10000000",
        itemNameLaos: "ລົດກະບະ Toyota Hilux Revo",
        itemNameChinese: "丰田皮卡车",
        model: "Hilux Revo 4WD",
        size: "2.8L Auto",
        packSize: "1 Unit",
        useFor: "ຂົນສົ່ງສິນຄ້າປະຈຳໂຮງງານ",
        unitLaos: "ຄັນ",
        qty: 2,
        group: "ຍານພາຫະນະ",
        category: "ລົດບໍລິສັດ",
        area: "Garage A",
        responsiblePerson: "ທ້າວ ສົມຊາຍ",
        priceUnit: 45000,
        nameOfPrice: "USD",
        date: "2026-01-15",
        pr: "PR-2026-001",
        remark: "ສະພາບດີ 95%"
    },
    {
        barcode: "20000001",
        categoryCode: "20000000",
        itemNameLaos: "ໂຕະເຮັດວຽກໄມ້ສັກ VIP",
        itemNameChinese: "柚木办公桌",
        model: "VIP-Desk 180",
        size: "180x80x75 cm",
        packSize: "1 Set/Box",
        useFor: "ຫ້ອງບໍລິຫານ",
        unitLaos: "ຊຸດ",
        qty: 10,
        group: "ອຸປະກອນສຳນັກງານ",
        category: "ເຟີນີເຈີ",
        area: "Office Storage 2",
        responsiblePerson: "ນາງ ນາລີ",
        priceUnit: 8500,
        nameOfPrice: "THB",
        date: "2026-02-10",
        pr: "PR-2026-012",
        remark: "ພ້ອມລິ້ນຊັກ"
    },
    {
        barcode: "50000001",
        categoryCode: "50000000",
        itemNameLaos: "ສາຍໄຟ THW 2.5 sq.mm (100m)",
        itemNameChinese: "电线 THW 2.5",
        model: "THW 2.5",
        size: "100m/Roll",
        packSize: "1 Roll",
        useFor: "ງານຕິດຕັ້ງໄຟຟ້າ",
        unitLaos: "ກວ້ອນ",
        qty: 50,
        group: "ອຸປະກອນໄຟຟ້າ",
        category: "ສາຍໄຟ",
        area: "Rack E-01",
        responsiblePerson: "ທ້າວ ບຸນມີ",
        priceUnit: 450000,
        nameOfPrice: "LAK",
        date: "2026-03-01",
        pr: "PR-2026-045",
        remark: "ສີຟ້າ ແລະ ສີແດງ"
    }
];

const DEFAULT_BRANDING = {
    title: document.querySelector("#app-company-title")?.textContent.trim() || document.title,
    subtitle: "Smart Warehouse & Inter-Factory Dispatching System (Phetsarath OT)",
    logoUrl: ""
};

// Master Application State
let inventory = [];
let dispatchLogs = [];
let branding = { ...DEFAULT_BRANDING };

let selectedDispatchItem = null;
let inventoryCurrentPage = 1;
let inventoryPageSize = 80;
let dispatchCurrentPage = 1;
let dispatchPageSize = 80;


window.onload = async function() {
    applyTheme(getStoredTheme());
    showLoadingOverlay();
    try {
        await loadAllPersistentData();
        sortInventoryByBarcode();
        renderInventoryTable();
        renderDispatchLogsTable();
        populateDispatchDropdown();
        applyBrandingUI();
        updateTopStats();
        initTodayDates();
    } finally {
        hideLoadingOverlay();
    }
};

function showLoadingOverlay() {
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) overlay.classList.remove('is-hidden');
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) overlay.classList.add('is-hidden');
}

function initTodayDates() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('input-date');
    if (dateInput) dateInput.value = today;
}

// Save & Load State through the configured data store.
async function loadAllPersistentData() {
    try {
        const data = await window.WarehouseStore.loadAll(DEFAULT_INVENTORY, DEFAULT_BRANDING);
        inventory = (data.inventory || [...DEFAULT_INVENTORY]).map(normalizeInventoryItem);
        dispatchLogs = data.dispatchLogs || [];
        branding = data.branding || { ...DEFAULT_BRANDING };

        if (!data.inventory || data.inventory.length === 0) {
            await saveInventoryData();
        }
    } catch(e) {
        console.error("Error loading persistent data", e);
        inventory = [...DEFAULT_INVENTORY].map(normalizeInventoryItem);
        dispatchLogs = [];
        branding = { ...DEFAULT_BRANDING };
        showToast("Google Sheets load failed. Using local browser data instead.", "warning");
    }
}

async function saveInventoryData() {
    try {
        await window.WarehouseStore.saveInventory(inventory);
    } catch(e) {
        console.error("Error saving inventory", e);
        showToast("Inventory save to Google Sheets failed.", "error");
    }
}

async function saveDispatchData() {
    try {
        await window.WarehouseStore.saveDispatchLogs(dispatchLogs);
    } catch(e) {
        console.error("Error saving dispatch logs", e);
        showToast("Dispatch log save to Google Sheets failed.", "error");
    }
}

async function saveBrandingData() {
    try {
        await window.WarehouseStore.saveBranding(branding);
    } catch(e) {
        console.error("Error saving branding", e);
        showToast("Branding save to Google Sheets failed.", "error");
    }
}

async function loadSampleInventoryData() {
    inventory = [...DEFAULT_INVENTORY].map(normalizeInventoryItem);
    await saveInventoryData();
    sortInventoryByBarcode();
    renderInventoryTable();
    populateDispatchDropdown();
    showToast("ໂຫຼດຂໍ້ມູນຕົວຢ່າງສຳເລັດ!", "success");
}

// Sort Inventory Array by Barcode
function sortInventoryByBarcode() {
    inventory.sort((a, b) => String(a.barcode).localeCompare(String(b.barcode), undefined, { numeric: true }));
}

// Navigation Tab Switching Logic
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(el => {
        el.classList.remove('bg-emerald-600', 'text-white', 'shadow-lg');
        el.classList.add('bg-slate-800', 'text-slate-300');
    });

    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-slate-800', 'text-slate-300');
        activeBtn.classList.add('bg-emerald-600', 'text-white', 'shadow-lg');
    }

    if (tabName === 'inventory') renderInventoryTable();
    if (tabName === 'dispatch') populateDispatchDropdown();
    if (tabName === 'dispatch-logs') renderDispatchLogsTable();
}

function filterByCategory(catCode) {
    switchTab('inventory');
    document.getElementById('inventory-category-filter').value = catCode;
    inventoryCurrentPage = 1;
    renderInventoryTable();
}



function normalizeInventoryItem(item) {
    const normalized = { ...item };
    normalized.barcode = cleanCode(normalized.barcode ?? normalized.BarCode ?? normalized.Barcode ?? normalized.barCode);
    normalized.categoryCode = normalizeCategoryCode(normalized);
    normalized.qty = Number(normalized.qty ?? normalized.QTY ?? normalized.Quantity ?? 0) || 0;
    normalized.priceUnit = Number(normalized.priceUnit ?? normalized['Pice Unit'] ?? normalized['Price Unit'] ?? 0) || 0;
    return normalized;
}

function cleanCode(value) {
    const text = String(value ?? '').trim();
    if (!text) return '';
    const numeric = Number(text);
    if (Number.isFinite(numeric) && /^\d+(\.0+)?$/.test(text)) {
        return String(Math.trunc(numeric));
    }
    return text.replace(/\.0+$/, '');
}

function normalizeCategoryCode(item) {
    const rawCode = cleanCode(item?.categoryCode ?? item?.CategoryCode ?? item?.category_code);
    if (CATEGORY_MAP[rawCode]) return rawCode;

    const rawDigits = rawCode.replace(/\D/g, '');
    if (rawDigits) {
        const fromDigits = `${rawDigits.charAt(0)}0000000`;
        if (CATEGORY_MAP[fromDigits]) return fromDigits;
    }

    const barcode = cleanCode(item?.barcode ?? item?.BarCode ?? item?.Barcode ?? item?.barCode);
    const derivedCode = barcode ? `${barcode.charAt(0)}0000000` : '';
    return CATEGORY_MAP[derivedCode] ? derivedCode : rawCode;
}

function matchesInventoryCategory(item, categoryFilter) {
    if (categoryFilter === 'ALL') return true;
    return normalizeCategoryCode(item) === String(categoryFilter);
}


function updateCategorySummary() {
    const counts = Object.fromEntries(Object.keys(CATEGORY_MAP).map(code => [code, 0]));
    inventory.forEach(item => {
        const code = normalizeCategoryCode(item);
        if (Object.prototype.hasOwnProperty.call(counts, code)) {
            counts[code] += 1;
        }
    });

    const activeCode = document.getElementById('inventory-category-filter')?.value || 'ALL';
    Object.keys(CATEGORY_MAP).forEach(code => {
        const countEl = document.getElementById(`category-count-${code}`);
        const cardEl = document.querySelector(`[data-category-card="${code}"]`);
        if (countEl) countEl.innerText = counts[code].toLocaleString();
        if (cardEl) cardEl.classList.toggle('is-active', activeCode === code);
    });
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventory-table-body');
    const searchVal = document.getElementById('inventory-search').value.toLowerCase().trim();
    const catFilter = document.getElementById('inventory-category-filter').value;

    const filtered = inventory.filter(item => {
        const matchesSearch = String(item.barcode || '').toLowerCase().includes(searchVal) ||
                              String(item.itemNameLaos || '').toLowerCase().includes(searchVal) ||
                              String(item.itemNameChinese || '').toLowerCase().includes(searchVal) ||
                              String(item.model || '').toLowerCase().includes(searchVal) ||
                              String(item.area || '').toLowerCase().includes(searchVal);
        
        const matchesCat = matchesInventoryCategory(item, catFilter);
        return matchesSearch && matchesCat;
    });

    const totalQtySum = filtered.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const pageSize = getInventoryPageSize(filtered.length);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    if (inventoryCurrentPage > totalPages) inventoryCurrentPage = totalPages;
    if (inventoryCurrentPage < 1) inventoryCurrentPage = 1;

    const startIndex = filtered.length === 0 ? 0 : (inventoryCurrentPage - 1) * pageSize;
    const endIndex = inventoryPageSize === 'ALL' ? filtered.length : Math.min(startIndex + pageSize, filtered.length);
    const pagedItems = filtered.slice(startIndex, endIndex);

    document.getElementById('filtered-count-badge').innerText = filtered.length;
    updateInventoryPagination(filtered.length, startIndex, endIndex, totalPages);

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="20" class="text-center py-12 text-slate-500 font-sans">
                    <i class="fa-solid fa-box-open text-4xl mb-2 block"></i>
                    No inventory data found
                </td>
            </tr>
        `;
        updateTableSummary(0, 0);
        updateCategorySummary();
        return;
    }

    let html = '';

    pagedItems.forEach((item, index) => {
        const qtyVal = Number(item.qty || 0);
        const rowNumber = startIndex + index + 1;

        html += `
            <tr class="transition hover:bg-emerald-950/30">
                <td class="text-center text-slate-500 font-mono">${rowNumber}</td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="quickDispatchItem('${item.barcode}')" title="No inventory data found" class="p-1 bg-amber-950 hover:bg-amber-800 text-amber-300 border border-amber-500/30 rounded text-[11px] transition">
                            <i class="fa-solid fa-truck-fast"></i>
                        </button>
                        <button onclick="openEditModal('${item.barcode}')" title="No inventory data found" class="p-1 bg-blue-950 hover:bg-blue-800 text-blue-300 border border-blue-500/30 rounded text-[11px] transition">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="deleteSingleItem('${item.barcode}')" title="No inventory data found" class="p-1 bg-red-950 hover:bg-red-800 text-red-300 border border-red-500/30 rounded text-[11px] transition">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
                <td class="font-bold text-emerald-400 font-mono">${escapeHtml(item.barcode)}</td>
                <td class="font-bold text-slate-100 font-sans">${escapeHtml(item.itemNameLaos)}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.itemNameChinese || '-')}</td>
                <td class="text-slate-300">${escapeHtml(item.model || '-')}</td>
                <td class="text-slate-300">${escapeHtml(item.size || '-')}</td>
                <td class="text-slate-300">${escapeHtml(item.packSize || '-')}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.useFor || '-')}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.unitLaos)}</td>
                <td class="text-right font-bold text-emerald-400 font-mono text-sm">${qtyVal.toLocaleString()}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.group || CATEGORY_MAP[normalizeCategoryCode(item)] || '-')}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.category || '-')}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.area || '-')}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.responsiblePerson || '-')}</td>
                <td class="text-right font-mono text-amber-400">${Number(item.priceUnit || 0).toLocaleString()}</td>
                <td class="text-slate-300">${escapeHtml(item.nameOfPrice || 'LAK')}</td>
                <td class="text-slate-400">${escapeHtml(item.date || '-')}</td>
                <td class="text-slate-400">${escapeHtml(item.pr || '-')}</td>
                <td class="text-slate-400 font-sans">${escapeHtml(item.remark || '-')}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateTableSummary(filtered.length, totalQtySum);
    updateCategorySummary();
    updateTopStats();
}

function getInventoryPageSize(totalItems) {
    return inventoryPageSize === 'ALL' ? Math.max(totalItems, 1) : Number(inventoryPageSize || 80);
}

function updateInventoryPagination(totalItems, startIndex, endIndex, totalPages) {
    const rangeEl = document.getElementById('inventory-page-range');
    const prevBtn = document.getElementById('inventory-prev-page');
    const nextBtn = document.getElementById('inventory-next-page');
    const sizeSelect = document.getElementById('inventory-page-size');

    if (sizeSelect) sizeSelect.value = String(inventoryPageSize);
    if (rangeEl) {
        const from = totalItems === 0 ? 0 : startIndex + 1;
        const to = totalItems === 0 ? 0 : endIndex;
        rangeEl.innerText = `${from}-${to} / ${totalItems}`;
    }
    if (prevBtn) prevBtn.disabled = inventoryCurrentPage <= 1 || totalItems === 0;
    if (nextBtn) nextBtn.disabled = inventoryCurrentPage >= totalPages || totalItems === 0;
}


window.resetInventoryPaginationAndRender = function() {
    inventoryCurrentPage = 1;
    renderInventoryTable();
};

window.changeInventoryPage = function(direction) {
    inventoryCurrentPage += Number(direction || 0);
    renderInventoryTable();
};

window.changeInventoryPageSize = function(value) {
    inventoryPageSize = value === 'ALL' ? 'ALL' : Number(value || 80);
    inventoryCurrentPage = 1;
    renderInventoryTable();
};

function updateTableSummary(itemCount, totalQty) {
    document.getElementById('table-summary-stats').innerHTML = `
        ລວມ: <span class="text-emerald-400 font-bold font-mono">${itemCount}</span> ລາຍການ | 
        QTY ລວມ: <span class="text-blue-400 font-bold font-mono">${totalQty.toLocaleString()}</span>
    `;
}

function updateTopStats() {
    updateCategorySummary();
    document.getElementById('stat-total-items').innerText = inventory.length;
    const totalQtySum = inventory.reduce((acc, curr) => acc + Number(curr.qty || 0), 0);
    document.getElementById('stat-total-qty').innerText = totalQtySum.toLocaleString();
    document.getElementById('stat-total-dispatches').innerText = dispatchLogs.length;
}

window.autoGenerateBarcode = function() {
    const catCode = document.getElementById('input-category-code').value;
    if (!catCode) return;

    const prefixDigit = catCode.charAt(0);
    const existingBarcodes = inventory
        .map(i => String(i.barcode))
        .filter(b => b.startsWith(prefixDigit) && b.length === 8);

    let maxNum = 0;
    existingBarcodes.forEach(b => {
        const num = parseInt(b, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    let nextBarcode = (maxNum === 0) ? (prefixDigit + '0000001') : (maxNum + 1).toString();
    document.getElementById('input-barcode').value = nextBarcode;
};

window.handleSingleItemSubmit = async function(e) {
    e.preventDefault();

    const catCode = document.getElementById('input-category-code').value;
    const barcode = document.getElementById('input-barcode').value.trim();
    const itemNameLaos = document.getElementById('input-item-name-laos').value.trim();

    if (!catCode) {
        showToast("ກະລຸນາເລືອກ Group / Category Prefix", "error");
        return;
    }

    // RULE 1: NO DUPLICATE BARCODES
    if (inventory.some(i => String(i.barcode) === barcode)) {
        showToast(`Barcode [${barcode}] ມີໃນລະບົບແລ້ວ! ຫ້າມປ້ອນ Barcode ຊ້ຳກັນ.`, "error");
        return;
    }

    // RULE 2: NO DUPLICATE ITEM NAMES IN SAME CATEGORY
    if (inventory.some(i => i.itemNameLaos.toLowerCase() === itemNameLaos.toLowerCase() && i.categoryCode === catCode)) {
        showToast(`ມີລາຍການສິນຄ້າຊື່ "${itemNameLaos}" ໃນກຸ່ມນີ້ແລ້ວ! ຫ້າມມີລາຍການຊ້ຳກັນ.`, "error");
        return;
    }

    const qty = parseInt(document.getElementById('input-qty').value, 10) || 0;
    const priceUnit = parseFloat(document.getElementById('input-price-unit').value) || 0;

    const newItem = {
        barcode,
        categoryCode: catCode,
        itemNameLaos,
        itemNameChinese: document.getElementById('input-item-name-chinese').value.trim(),
        model: document.getElementById('input-model').value.trim(),
        size: document.getElementById('input-size').value.trim(),
        packSize: document.getElementById('input-pack-size').value.trim(),
        useFor: document.getElementById('input-use-for').value.trim(),
        unitLaos: document.getElementById('input-unit-laos').value.trim(),
        qty,
        group: document.getElementById('input-group').value.trim() || CATEGORY_MAP[catCode],
        category: document.getElementById('input-category').value.trim(),
        area: document.getElementById('input-area').value.trim(),
        responsiblePerson: document.getElementById('input-responsible-person').value.trim(),
        priceUnit,
        nameOfPrice: document.getElementById('input-name-of-price').value,
        date: document.getElementById('input-date').value || new Date().toISOString().split('T')[0],
        pr: document.getElementById('input-pr').value.trim(),
        remark: document.getElementById('input-remark').value.trim()
    };

    inventory.push(newItem);
    sortInventoryByBarcode();
    await saveInventoryData();

    showToast(`ບັນທຶກສິນຄ້າ [${itemNameLaos}] ເຂົ້າສາງສຳເລັດ (Saved Permanently)!`, "success");
    document.getElementById('add-item-form').reset();
    initTodayDates();
    populateDispatchDropdown();
    switchTab('inventory');
};

window.openEditModal = function(barcode) {
    const item = inventory.find(i => String(i.barcode) === String(barcode));
    if (!item) return;

    document.getElementById('edit-original-barcode').value = item.barcode;
    document.getElementById('edit-category-code').value = item.categoryCode || "40000000";
    document.getElementById('edit-barcode').value = item.barcode;
    document.getElementById('edit-item-name-laos').value = item.itemNameLaos || "";
    document.getElementById('edit-item-name-chinese').value = item.itemNameChinese || "";
    document.getElementById('edit-model').value = item.model || "";
    document.getElementById('edit-size').value = item.size || "";
    document.getElementById('edit-pack-size').value = item.packSize || "";
    document.getElementById('edit-use-for').value = item.useFor || "";
    document.getElementById('edit-unit-laos').value = item.unitLaos || "";
    document.getElementById('edit-qty').value = item.qty || 0;
    document.getElementById('edit-group').value = item.group || "";
    document.getElementById('edit-category').value = item.category || "";
    document.getElementById('edit-area').value = item.area || "";
    document.getElementById('edit-responsible-person').value = item.responsiblePerson || "";
    document.getElementById('edit-price-unit').value = item.priceUnit || 0;
    document.getElementById('edit-name-of-price').value = item.nameOfPrice || "LAK";
    document.getElementById('edit-date').value = item.date || "";
    document.getElementById('edit-pr').value = item.pr || "";
    document.getElementById('edit-remark').value = item.remark || "";

    document.getElementById('edit-item-modal').classList.remove('hidden');
};

window.closeEditModal = function() {
    document.getElementById('edit-item-modal').classList.add('hidden');
};

window.handleEditItemSubmit = async function(e) {
    e.preventDefault();
    const origBarcode = document.getElementById('edit-original-barcode').value;
    const newBarcode = document.getElementById('edit-barcode').value.trim();

    const idx = inventory.findIndex(i => String(i.barcode) === String(origBarcode));
    if (idx === -1) return;

    if (newBarcode !== origBarcode && inventory.some(i => String(i.barcode) === newBarcode)) {
        showToast(`Barcode [${newBarcode}] ມີໃນລະບົບແລ້ວ! ຫ້າມປ້ອນ Barcode ຊ້ຳ.`, "error");
        return;
    }

    const catCode = document.getElementById('edit-category-code').value;
    const qty = parseInt(document.getElementById('edit-qty').value, 10) || 0;
    const priceUnit = parseFloat(document.getElementById('edit-price-unit').value) || 0;

    inventory[idx] = {
        barcode: newBarcode,
        categoryCode: catCode,
        itemNameLaos: document.getElementById('edit-item-name-laos').value.trim(),
        itemNameChinese: document.getElementById('edit-item-name-chinese').value.trim(),
        model: document.getElementById('edit-model').value.trim(),
        size: document.getElementById('edit-size').value.trim(),
        packSize: document.getElementById('edit-pack-size').value.trim(),
        useFor: document.getElementById('edit-use-for').value.trim(),
        unitLaos: document.getElementById('edit-unit-laos').value.trim(),
        qty,
        group: document.getElementById('edit-group').value.trim() || CATEGORY_MAP[catCode],
        category: document.getElementById('edit-category').value.trim(),
        area: document.getElementById('edit-area').value.trim(),
        responsiblePerson: document.getElementById('edit-responsible-person').value.trim(),
        priceUnit,
        nameOfPrice: document.getElementById('edit-name-of-price').value,
        date: document.getElementById('edit-date').value,
        pr: document.getElementById('edit-pr').value.trim(),
        remark: document.getElementById('edit-remark').value.trim()
    };

    sortInventoryByBarcode();
    await saveInventoryData();
    renderInventoryTable();
    populateDispatchDropdown();
    closeEditModal();
    showToast("ອັບເດດຂໍ້ມູນສິນຄ້າຮຽບຮ້ອຍແລ້ວ!", "success");
};

window.deleteSingleItem = async function(barcode) {
    const item = inventory.find(i => String(i.barcode) === String(barcode));
    if (!item) return;

    if (confirm(`ທ່ານແນ່ໃຈບໍທີ່ຕ້ອງການລົບ [${item.barcode}] ${item.itemNameLaos}?`)) {
        inventory = inventory.filter(i => String(i.barcode) !== String(barcode));
        await saveInventoryData();
        renderInventoryTable();
        populateDispatchDropdown();
        showToast(`ລົບ [${barcode}] ຮຽບຮ້ອຍແລ້ວ`, "warning");
    }
};

window.confirmDeleteAllInventory = async function() {
    if (inventory.length === 0) {
        showToast("ບໍ່ມີຂໍ້ມູນສິນຄ້າໃຫ້ລົບ", "warning");
        return;
    }

    if (confirm("⚠️ ຢືນຢັນການລົບ: ທ່ານແນ່ໃຈບໍທີ່ຕ້ອງການລົບຂໍ້ມູນທັງໝົດໃນສາງ?")) {
        const conf = prompt("ພິມຄຳວ່າ 'DELETE' ເພື່ອຢືນຢັນ:");
        if (conf && conf.toUpperCase() === 'DELETE') {
            inventory = [];
            await saveInventoryData();
            renderInventoryTable();
            populateDispatchDropdown();
            showToast("ລົບຂໍ້ມູນສິນຄ້າທັງໝົດຮຽບຮ້ອຍແລ້ວ!", "error");
        }
    }
};

// Download Excel Template
window.downloadExcelTemplate = function() {
    const templateData = [
        {
            NO: 1,
            BarCode: "50000010",
            "Item name Laos": "ສາຍໄຟ THW 2.5",
            "Item name Chinese": "电线 THW 2.5",
            Modle: "THW-2.5",
            Size: "100m",
            "Pack size": "1 Roll",
            Use_For: "ໄຟຟ້າ",
            "Unit Laos": "ກວ້ອນ",
            QTY: 20,
            Group: "ອຸປະກອນໄຟຟ້າ",
            Category: "ສາຍໄຟ",
            Area: "Rack E-02",
            "Responsible person": "ທ້າວ ບຸນມີ",
            "Pice Unit": 450000,
            name_of_price: "LAK",
            Date: "2026-07-22",
            PR: "PR-2026-99",
            Remark: "ຕົວຢ່າງ Excel"
        }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Template");
    XLSX.writeFile(wb, "Warehouse_Template.xlsx");
};

// Handle Excel Import for Inventory
window.handleExcelImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });

            if (!rows || rows.length === 0) {
                showToast("ໄຟລ໌ Excel ບໍ່ມີຂໍ້ມູນ!", "error");
                return;
            }

            let addedCount = 0;
            let skippedCount = 0;

            rows.forEach(row => {
                const barcode = String(row.BarCode || row.Barcode || row.barcode || row['ລະຫັດ'] || '').trim();
                const itemNameLaos = String(row['Item name Laos'] || row.itemNameLaos || row.Name || row['ຊື່ສິນຄ້າ'] || '').trim();

                if (!barcode || !itemNameLaos) return;

                if (inventory.some(i => String(i.barcode) === barcode)) {
                    skippedCount++;
                    return;
                }

                let catCode = String(row.categoryCode || '').trim();
                if (!catCode || !CATEGORY_MAP[catCode]) {
                    const firstChar = barcode.charAt(0);
                    const matchedKey = firstChar + "0000000";
                    catCode = CATEGORY_MAP[matchedKey] ? matchedKey : "40000000";
                }

                const qty = parseInt(row.QTY || row.qty || row.Quantity || 0, 10);
                const priceUnit = parseFloat(row['Pice Unit'] || row['Price Unit'] || row.priceUnit || 0);

                inventory.push({
                    barcode,
                    categoryCode: catCode,
                    itemNameLaos,
                    itemNameChinese: String(row['Item name Chinese'] || row.itemNameChinese || ''),
                    model: String(row.Modle || row.Model || row.model || ''),
                    size: String(row.Size || row.size || ''),
                    packSize: String(row['Pack size'] || row.packSize || ''),
                    useFor: String(row.Use_For || row.useFor || ''),
                    unitLaos: String(row['Unit Laos'] || row.unitLaos || 'ອັນ'),
                    qty,
                    group: String(row.Group || row.group || CATEGORY_MAP[catCode]),
                    category: String(row.Category || row.category || ''),
                    area: String(row.Area || row.area || ''),
                    responsiblePerson: String(row['Responsible person'] || row.responsiblePerson || ''),
                    priceUnit,
                    nameOfPrice: String(row.name_of_price || row.nameOfPrice || 'LAK'),
                    date: String(row.Date || row.date || new Date().toISOString().split('T')[0]),
                    pr: String(row.PR || row.pr || ''),
                    remark: String(row.Remark || row.remark || '')
                });

                addedCount++;
            });

            sortInventoryByBarcode();
            await saveInventoryData();
            renderInventoryTable();
            populateDispatchDropdown();

            showToast(`ນຳເຂົ້າ Excel ສຳເລັດ ${addedCount} ລາຍການ! (ຂ້າມ Barcode ຊ້ຳ ${skippedCount})`, "success");
            document.getElementById('excel-file-input').value = "";
            switchTab('inventory');

        } catch(err) {
            console.error(err);
            showToast("ເກີດຂໍ້ຜິດພາດໃນການອ່ານໄຟລ໌ Excel", "error");
        }
    };
    reader.readAsArrayBuffer(file);
};

// Export Inventory Table to Excel
window.exportInventoryToExcel = function() {
    if (inventory.length === 0) {
        showToast("ບໍ່ມີຂໍ້ມູນໃນສາງໃຫ້ Export", "warning");
        return;
    }

    const exportData = inventory.map((item, index) => ({
        NO: index + 1,
        BarCode: item.barcode,
        "Item name Laos": item.itemNameLaos,
        "Item name Chinese": item.itemNameChinese || '',
        Modle: item.model || '',
        Size: item.size || '',
        "Pack size": item.packSize || '',
        Use_For: item.useFor || '',
        "Unit Laos": item.unitLaos,
        QTY: item.qty,
        Group: item.group || '',
        Category: item.category || '',
        Area: item.area || '',
        "Responsible person": item.responsiblePerson || '',
        "Pice Unit": item.priceUnit,
        name_of_price: item.nameOfPrice || 'LAK',
        Date: item.date || '',
        PR: item.pr || '',
        Remark: item.remark || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Data");
    XLSX.writeFile(wb, `Inventory_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// =========================================================================
// DISPATCH SYSTEM LOGIC (REQUIREMENT 2: Barcode lookup + Fetch ALL fields + Shipping Price + Weight)
// =========================================================================

function populateDispatchDropdown() {
    const select = document.getElementById('dispatch-barcode-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- ເລືອກສິນຄ້າຈາກຕາຕະລາງສາງ --</option>';
    inventory.forEach(item => {
        const option = document.createElement('option');
        option.value = item.barcode;
        option.textContent = `[${item.barcode}] ${item.itemNameLaos} (QTY: ${item.qty} ${item.unitLaos})`;
        select.appendChild(option);
    });
}

window.quickDispatchItem = function(barcode) {
    switchTab('dispatch');
    document.getElementById('dispatch-barcode-input').value = barcode;
    document.getElementById('dispatch-barcode-select').value = barcode;
    lookupItemByBarcode();
};

window.selectDispatchItemFromDropdown = function(barcode) {
    if (!barcode) return;
    document.getElementById('dispatch-barcode-input').value = barcode;
    lookupItemByBarcode();
};

window.lookupItemByBarcode = function() {
    const barcodeVal = document.getElementById('dispatch-barcode-input').value.trim();
    const card = document.getElementById('dispatch-product-card');
    const submitBtn = document.getElementById('dispatch-submit-btn');

    if (!barcodeVal) {
        selectedDispatchItem = null;
        card.innerHTML = `
            <div class="text-slate-500 text-xs italic flex items-center gap-2">
                <i class="fa-solid fa-circle-question text-lg"></i> ກະລຸນາປ້ອນ/ເລືອກ Barcode ເພື່ອດຶງຂໍ້ມູນສິນຄ້າມາທຸກຢ່າງ
            </div>
        `;
        submitBtn.disabled = true;
        return;
    }

    const item = inventory.find(i => String(i.barcode) === String(barcodeVal));

    if (!item) {
        selectedDispatchItem = null;
        card.innerHTML = `
            <div class="text-red-400 text-xs font-semibold flex items-center gap-2">
                <i class="fa-solid fa-circle-xmark text-lg"></i> ບໍ່ພົບ Barcode [${escapeHtml(barcodeVal)}] ໃນສາງສິນຄ້າ!
            </div>
        `;
        submitBtn.disabled = true;
        return;
    }

    selectedDispatchItem = item;
    document.getElementById('dispatch-barcode-select').value = item.barcode;

    // Display ALL item fields fetched from inventory
    card.innerHTML = `
        <div class="w-full text-left space-y-3">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <span class="font-mono font-bold text-emerald-400 text-sm">
                    <i class="fa-solid fa-barcode"></i> BarCode: ${escapeHtml(item.barcode)}
                </span>
                <span class="bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full">
                    QTY ໃນສາງ: <strong class="font-mono text-emerald-400">${item.qty}</strong> ${escapeHtml(item.unitLaos)}
                </span>
            </div>

            <!-- Display ALL fetched inventory fields -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
                <div><strong class="text-slate-400">ຊື່ລາວ:</strong> <span class="text-white font-bold">${escapeHtml(item.itemNameLaos)}</span></div>
                <div><strong class="text-slate-400">ຊື່ຈີນ:</strong> ${escapeHtml(item.itemNameChinese || '-')}</div>
                <div><strong class="text-slate-400">ຮຸ່ນ (Model):</strong> ${escapeHtml(item.model || '-')}</div>
                <div><strong class="text-slate-400">ຂະໜາດ (Size):</strong> ${escapeHtml(item.size || '-')}</div>
                <div><strong class="text-slate-400">ບັນຈຸ (Pack size):</strong> ${escapeHtml(item.packSize || '-')}</div>
                <div><strong class="text-slate-400">ນຳໃຊ້ສຳລັບ:</strong> ${escapeHtml(item.useFor || '-')}</div>
                <div><strong class="text-slate-400">ກຸ່ມ (Group):</strong> ${escapeHtml(item.group || '-')}</div>
                <div><strong class="text-slate-400">ໝວດ (Category):</strong> ${escapeHtml(item.category || '-')}</div>
                <div><strong class="text-slate-400">ພື້ນທີ່ (Area):</strong> ${escapeHtml(item.area || '-')}</div>
                <div><strong class="text-slate-400">ຜູ້ດູແລ:</strong> ${escapeHtml(item.responsiblePerson || '-')}</div>
                <div><strong class="text-slate-400">ລາຄາ/ໜ່ວຍ:</strong> ${Number(item.priceUnit || 0).toLocaleString()} ${escapeHtml(item.nameOfPrice || 'LAK')}</div>
                <div><strong class="text-slate-400">ວັນທີ/PR:</strong> ${escapeHtml(item.date || '-')} / ${escapeHtml(item.pr || '-')}</div>
            </div>
        </div>
    `;

    submitBtn.disabled = false;
};

// Handle Dispatch Excel Import
window.handleDispatchExcelImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });

            if (!rows || rows.length === 0) {
                showToast("ໄຟລ໌ Excel ບໍ່ມີຂໍ້ມູນ!", "error");
                return;
            }

            let dispatchedCount = 0;
            rows.forEach(row => {
                const barcode = String(row.BarCode || row.Barcode || row.barcode || '').trim();
                const qtyDispatch = parseInt(row.QTY || row.qty || row.qtyDispatch || 1, 10);
                const shippingPrice = parseFloat(row.shippingPrice || row['ລາຄາຂົນສົ່ງ'] || 0);
                const weight = String(row.weight || row['ນ້ຳໜັກ'] || '-');
                const origin = String(row.origin || row['ໂຮງງານຕົ້ນທາງ'] || 'ໂຮງງານສູນກາງ ນະຄອນຫຼວງວຽງຈັນ');
                const destination = String(row.destination || row['ໂຮງງານປາຍທາງ'] || 'ໂຮງງານສາຂາ');

                const item = inventory.find(i => String(i.barcode) === barcode);
                if (item && item.qty >= qtyDispatch) {
                    // Deduct stock
                    item.qty -= qtyDispatch;

                    // Add log with ALL inventory details + Shipping Cost + Weight
                    dispatchLogs.unshift({
                        id: `DN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        timestamp: new Date().toLocaleString('lo-LA'),
                        barcode: item.barcode,
                        itemDetails: { ...item }, // Copy ALL inventory properties
                        qtyDispatched: qtyDispatch,
                        shippingPrice: shippingPrice,
                        weight: weight,
                        origin: origin,
                        destination: destination,
                        driver: String(row.driver || row['ຄົນຂັບ'] || '-'),
                        remark: String(row.remark || row['ໝາຍເຫດ'] || 'Excel Batch Import')
                    });

                    dispatchedCount++;
                }
            });

            await saveInventoryData();
            await saveDispatchData();
            renderInventoryTable();
            renderDispatchLogsTable();
            populateDispatchDropdown();

            showToast(`Import Dispatch Excel สำເລັດ ${dispatchedCount} ລາຍການ!`, "success");
            document.getElementById('excel-dispatch-file-input').value = "";
            switchTab('dispatch-logs');

        } catch(err) {
            console.error(err);
            showToast("ເກີດຂໍ້ຜິດພາດໃນການ Import Barcode Excel", "error");
        }
    };
    reader.readAsArrayBuffer(file);
};

window.handleDispatchSubmit = async function(e) {
    e.preventDefault();

    if (!selectedDispatchItem) {
        showToast("ກະລຸນາເລືອກ Barcode ສິນຄ້າໃຫ້ຖືກຕ້ອງ", "error");
        return;
    }

    const qtyDispatch = parseInt(document.getElementById('dispatch-qty').value, 10) || 0;
    const shippingPrice = parseFloat(document.getElementById('dispatch-shipping-price').value) || 0;
    const weight = document.getElementById('dispatch-weight').value.trim() || "-";
    const origin = document.getElementById('dispatch-origin').value.trim();
    const destination = document.getElementById('dispatch-destination').value.trim();
    const driver = document.getElementById('dispatch-driver').value.trim() || "-";
    const remark = document.getElementById('dispatch-remark').value.trim() || "-";

    if (qtyDispatch <= 0) {
        showToast("ຈຳນວນທີ່ສົ່ງເຄື່ອງຕ້ອງຫຼາຍກວ່າ 0", "error");
        return;
    }

    if (selectedDispatchItem.qty < qtyDispatch) {
        showToast(`ຈຳນວນສິນຄ້າໃນສາງບໍ່ພໍ! (ມີໃນສາງ: ${selectedDispatchItem.qty}, ຕ້ອງການສົ່ງ: ${qtyDispatch})`, "error");
        return;
    }

    // Deduct stock automatically
    selectedDispatchItem.qty -= qtyDispatch;

    // Create Dispatch Record with ALL item details + Shipping Cost + Weight
    const newLog = {
        id: `DN-${Date.now()}`,
        timestamp: new Date().toLocaleString('lo-LA'),
        barcode: selectedDispatchItem.barcode,
        itemDetails: { ...selectedDispatchItem }, // Includes ALL inventory fields
        qtyDispatched: qtyDispatch,
        shippingPrice: shippingPrice,
        weight: weight,
        origin: origin,
        destination: destination,
        driver: driver,
        remark: remark
    };

    dispatchLogs.unshift(newLog);

    await saveInventoryData();
    await saveDispatchData();
    renderInventoryTable();
    renderDispatchLogsTable();
    populateDispatchDropdown();

    showToast(`ສົ່ງເຄື່ອງ [${selectedDispatchItem.itemNameLaos}] ຈຳນວນ ${qtyDispatch} ${selectedDispatchItem.unitLaos} ສຳເລັດ!`, "success");

    // Reset dispatch form & lookup
    document.getElementById('dispatch-form').reset();
    document.getElementById('dispatch-shipping-price').value = "0";
    document.getElementById('dispatch-weight').value = "";
    document.getElementById('dispatch-qty').value = "1";
    lookupItemByBarcode();

    // Open Delivery Note modal for printing
    openDeliveryModal(newLog.id);
};

function renderDispatchLogsTable() {
    const tbody = document.getElementById('dispatch-logs-tbody');
    if (!tbody) return;

    const pageSize = getDispatchPageSize(dispatchLogs.length);
    const totalPages = Math.max(1, Math.ceil(dispatchLogs.length / pageSize));
    if (dispatchCurrentPage > totalPages) dispatchCurrentPage = totalPages;
    if (dispatchCurrentPage < 1) dispatchCurrentPage = 1;

    const startIndex = dispatchLogs.length === 0 ? 0 : (dispatchCurrentPage - 1) * pageSize;
    const endIndex = dispatchPageSize === 'ALL' ? dispatchLogs.length : Math.min(startIndex + pageSize, dispatchLogs.length);
    const pagedLogs = dispatchLogs.slice(startIndex, endIndex);
    updateDispatchPagination(dispatchLogs.length, startIndex, endIndex, totalPages);

    if (dispatchLogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-12 text-slate-500 font-sans">
                    <i class="fa-solid fa-truck-fade text-4xl mb-2 block"></i>
                    No dispatch history found
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    pagedLogs.forEach(log => {
        const details = log.itemDetails || {};
        html += `
            <tr class="transition hover:bg-slate-800/60">
                <td class="p-3">
                    <div class="font-bold text-slate-200">${log.id}</div>
                    <div class="text-[10px] text-slate-400">${log.timestamp}</div>
                </td>
                <td class="p-3 font-mono font-bold text-emerald-400">${escapeHtml(log.barcode)}</td>
                <td class="p-3 font-bold text-slate-100 font-sans">${escapeHtml(details.itemNameLaos || '-')}</td>
                <td class="p-3 text-right font-bold text-amber-400 font-mono">${log.qtyDispatched} ${escapeHtml(details.unitLaos || '')}</td>
                <td class="p-3 text-right font-bold text-emerald-400 font-mono">${Number(log.shippingPrice || 0).toLocaleString()}</td>
                <td class="p-3 text-teal-300 font-mono">${escapeHtml(log.weight || '-')}</td>
                <td class="p-3 font-sans text-slate-300">${escapeHtml(log.origin)}</td>
                <td class="p-3 font-sans text-slate-300">${escapeHtml(log.destination)}</td>
                <td class="p-3 font-sans text-slate-400">${escapeHtml(log.driver)}</td>
                <td class="p-3 text-center">
                    <button onclick="openDeliveryModal('${log.id}')" title="Print delivery note" class="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs transition flex items-center gap-1 mx-auto">
                        <i class="fa-solid fa-print"></i> ??????
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateTopStats();
}

function getDispatchPageSize(totalItems) {
    return dispatchPageSize === 'ALL' ? Math.max(totalItems, 1) : Number(dispatchPageSize || 80);
}

function updateDispatchPagination(totalItems, startIndex, endIndex, totalPages) {
    const rangeEl = document.getElementById('dispatch-page-range');
    const prevBtn = document.getElementById('dispatch-prev-page');
    const nextBtn = document.getElementById('dispatch-next-page');
    const sizeSelect = document.getElementById('dispatch-page-size');

    if (sizeSelect) sizeSelect.value = String(dispatchPageSize);
    if (rangeEl) {
        const from = totalItems === 0 ? 0 : startIndex + 1;
        const to = totalItems === 0 ? 0 : endIndex;
        rangeEl.innerText = `${from}-${to} / ${totalItems}`;
    }
    if (prevBtn) prevBtn.disabled = dispatchCurrentPage <= 1 || totalItems === 0;
    if (nextBtn) nextBtn.disabled = dispatchCurrentPage >= totalPages || totalItems === 0;
}

window.changeDispatchPage = function(direction) {
    dispatchCurrentPage += Number(direction || 0);
    renderDispatchLogsTable();
};

window.changeDispatchPageSize = function(value) {
    dispatchPageSize = value === 'ALL' ? 'ALL' : Number(value || 80);
    dispatchCurrentPage = 1;
    renderDispatchLogsTable();
};

window.exportDispatchLogsToExcel = function() {
    if (dispatchLogs.length === 0) {
        showToast("ບໍ່ມີປະຫວັດການສົ່ງເຄື່ອງໃຫ້ Export", "warning");
        return;
    }

    const exportData = dispatchLogs.map(log => {
        const item = log.itemDetails || {};
        return {
            "ເລກທີໃບສົ່ງ": log.id,
            "ວັນທີ & ເວລາ": log.timestamp,
            BarCode: log.barcode,
            "Item name Laos": item.itemNameLaos || '',
            "Item name Chinese": item.itemNameChinese || '',
            Modle: item.model || '',
            Size: item.size || '',
            "Pack size": item.packSize || '',
            Use_For: item.useFor || '',
            "Unit Laos": item.unitLaos || '',
            "QTY ສົ່ງ": log.qtyDispatched,
            "ລາຄາຂົນສົ່ງ": log.shippingPrice || 0,
            "ນ້ຳໜັກ": log.weight || '-',
            Group: item.group || '',
            Category: item.category || '',
            Area: item.area || '',
            "Responsible person": item.responsiblePerson || '',
            "Pice Unit": item.priceUnit || 0,
            name_of_price: item.nameOfPrice || 'LAK',
            "ໂຮງງານຕົ້ນທາງ": log.origin,
            "ໂຮງງານປາຍທາງ": log.destination,
            "ຜູ້ບັນທຶກ/ຄົນຂັບ": log.driver,
            "ໝາຍເຫດ": log.remark
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dispatch_History");
    XLSX.writeFile(wb, `Dispatch_History_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// =========================================================================
// DELIVERY NOTE & PRINTING MODAL
// =========================================================================
window.openDeliveryModal = function(logId) {
    const log = dispatchLogs.find(l => l.id === logId);
    if (!log) return;

    const item = log.itemDetails || {};

    document.getElementById('pn-id').innerText = log.id;
    document.getElementById('pn-date').innerText = log.timestamp;
    document.getElementById('pn-origin').innerText = log.origin;
    document.getElementById('pn-destination').innerText = log.destination;
    
    // Render ALL item details inside the delivery note header card
    document.getElementById('pn-full-item-details').innerHTML = `
        <div><strong>ຊື່ສິນຄ້າ (ລາວ):</strong> ${escapeHtml(item.itemNameLaos || '-')}</div>
        <div><strong>ຊື່ສິນຄ້າ (ຈີນ):</strong> ${escapeHtml(item.itemNameChinese || '-')}</div>
        <div><strong>ຮຸ່ນ (Model):</strong> ${escapeHtml(item.model || '-')}</div>
        <div><strong>ຂະໜາດ (Size):</strong> ${escapeHtml(item.size || '-')}</div>
        <div><strong>ບັນຈຸ (Pack size):</strong> ${escapeHtml(item.packSize || '-')}</div>
        <div><strong>ນຳໃຊ້ສຳລັບ (Use For):</strong> ${escapeHtml(item.useFor || '-')}</div>
        <div><strong>ກຸ່ມ/ໝວດ:</strong> ${escapeHtml(item.group || '-')} / ${escapeHtml(item.category || '-')}</div>
        <div><strong>ພື້ນທີ່/ຜູ້ດູແລ:</strong> ${escapeHtml(item.area || '-')} / ${escapeHtml(item.responsiblePerson || '-')}</div>
        <div><strong>ລາຄາ/ໜ່ວຍ:</strong> ${Number(item.priceUnit || 0).toLocaleString()} ${escapeHtml(item.nameOfPrice || 'LAK')}</div>
    `;

    document.getElementById('pn-barcode').innerText = log.barcode;
    document.getElementById('pn-item-name').innerText = item.itemNameLaos || '-';
    document.getElementById('pn-model-size').innerText = `${item.model || ''} ${item.size || ''}`.trim() || '-';
    document.getElementById('pn-qty').innerText = `${log.qtyDispatched} ${item.unitLaos || ''}`;
    document.getElementById('pn-shipping-price').innerText = Number(log.shippingPrice || 0).toLocaleString();
    document.getElementById('pn-weight').innerText = log.weight || '-';
    document.getElementById('pn-driver').innerText = log.driver;
    document.getElementById('pn-remark').innerText = log.remark;

    // Render SVG Barcode
    try {
        JsBarcode("#pn-barcode-svg", log.barcode, {
            format: "CODE128",
            width: 2,
            height: 45,
            displayValue: true
        });
    } catch(e) {
        console.warn("JsBarcode error", e);
    }

    document.getElementById('delivery-note-modal').classList.remove('hidden');
};

window.closeDeliveryModal = function() {
    document.getElementById('delivery-note-modal').classList.add('hidden');
};

// =========================================================================
// BRANDING MODAL
// =========================================================================
window.openBrandingModal = function() {
    document.getElementById('branding-title-input').value = branding.title;
    document.getElementById('branding-subtitle-input').value = branding.subtitle;
    document.getElementById('branding-logo-input').value = branding.logoUrl || "";
    document.getElementById('branding-modal').classList.remove('hidden');
};

window.closeBrandingModal = function() {
    document.getElementById('branding-modal').classList.add('hidden');
};

window.handleLogoUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        branding.logoUrl = e.target.result;
        document.getElementById('branding-logo-input').value = branding.logoUrl;
    };
    reader.readAsDataURL(file);
};

window.saveBrandingSettings = async function() {
    branding.title = document.getElementById('branding-title-input').value.trim() || branding.title;
    branding.subtitle = document.getElementById('branding-subtitle-input').value.trim() || branding.subtitle;
    branding.logoUrl = document.getElementById('branding-logo-input').value.trim();

    await saveBrandingData();
    applyBrandingUI();
    closeBrandingModal();
    showToast("ອັບເດດໂລໂກ ແລະ ຫົວຂໍ້ບໍລິສັດສຳເລັດ!", "success");
};

function applyBrandingUI() {
    const titleEl = document.getElementById('app-company-title');
    const subtextEl = document.getElementById('subtext-display');
    const logoImg = document.getElementById('app-company-logo');
    const iconEl = document.getElementById('app-company-icon');
    const printTitle = document.getElementById('print-company-name');

    if (titleEl) titleEl.innerText = branding.title;
    if (subtextEl) subtextEl.innerText = branding.subtitle;
    if (printTitle) printTitle.innerText = `${branding.title} - ໃບສົ່ງເຄື່ອງ`;

    if (branding.logoUrl) {
        logoImg.src = branding.logoUrl;
        logoImg.classList.remove('hidden');
        iconEl.classList.add('hidden');
    } else {
        logoImg.classList.add('hidden');
        iconEl.classList.remove('hidden');
    }
}

// =========================================================================
// TOAST NOTIFICATIONS & UTILS
// =========================================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    let bgColors = "bg-slate-800 text-slate-100 border-slate-700";
    let icon = "fa-circle-info text-blue-400";

    if (type === 'success') {
        bgColors = "bg-emerald-950 text-emerald-100 border-emerald-500/50 shadow-emerald-900/40";
        icon = "fa-circle-check text-emerald-400";
    } else if (type === 'error') {
        bgColors = "bg-red-950 text-red-100 border-red-500/50 shadow-red-900/40";
        icon = "fa-triangle-exclamation text-red-400";
    } else if (type === 'warning') {
        bgColors = "bg-amber-950 text-amber-100 border-amber-500/50 shadow-amber-900/40";
        icon = "fa-circle-exclamation text-amber-400";
    }

    toast.className = `flex items-center gap-3 p-3.5 rounded-xl border text-xs font-semibold shadow-2xl transition duration-300 transform translate-y-2 opacity-0 ${bgColors}`;
    toast.innerHTML = `
        <i class="fa-solid ${icon} text-base"></i>
        <span class="flex-grow">${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
