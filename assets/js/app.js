const CATEGORY_MAP = {
    "10000000": "ຍານພາຫະນະ",
    "20000000": "ອຸປະກອນສຳນັກງານ",
    "30000000": "ອຸປະກອນອາໄຫຼ່ທົ່ວໄປ",
    "40000000": "ອຸປະກອນທົ່ວໄປ",
    "50000000": "ອຸປະກອນໄຟຟ້າ",
    "60000000": "ອຸປະກອນລາຍການຜະລິດ",
    "70000000": "ອຸປະກອນ Lab",
    "80000000": "ອຸປະກອນກໍ່ສ້າງ",
    "90000000": "ເຄື່ອງມືຊ່າງ"
};


const THEME_STORAGE_KEY = "LAO_WAREHOUSE_THEME";
const INVENTORY_UPDATE_ALERT_STORAGE_KEY = "LAO_WAREHOUSE_UPDATE_ALERTS_V1";

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
        remark: "ສະພາບດີ 95%",
        imageUrl: ""
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
        remark: "ພ້ອມລິ້ນຊັກ",
        imageUrl: ""
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
        remark: "ສີຟ້າ ແລະ ສີແດງ",
        imageUrl: ""
    }
];

const DEFAULT_BRANDING = {
    title: document.querySelector("#app-company-title")?.textContent.trim() || document.title,
    subtitle: "Smart Warehouse & Inter-Factory Dispatching System (Phetsarath OT)",
    logoUrl: "assets/image/LOGO.png"
};
const DEFAULT_STICKER_WATERMARK_URL = "assets/image/LOGO%20STICKER.png";

// Master Application State
let inventory = [];
let dispatchLogs = [];
let branding = { ...DEFAULT_BRANDING };

let selectedDispatchItem = null;
let inventoryCurrentPage = 1;
let inventoryPageSize = 80;
let dispatchCurrentPage = 1;
let dispatchPageSize = 80;
let dispatchSearchValue = '';
let dispatchCategoryFilter = 'ALL';
let pendingImportRows = [];
let laoRepairObserver = null;
let laoRepairTimer = null;
let selectedStickerItem = null;
let stickerWatermarkDataUrl = DEFAULT_STICKER_WATERMARK_URL;
let stickerBatchItems = [];
const INVENTORY_COLUMN_WIDTH_STORAGE_KEY = 'warehouse_inventory_column_widths_v1';
const INVENTORY_DEFAULT_COLUMN_WIDTHS = [56, 124, 112, 150, 158, 112, 112, 116, 136, 116, 92, 92, 98, 128, 128, 128, 150, 112, 122, 112, 112, 180];


window.onload = async function() {
    applyTheme(getStoredTheme());
    refreshCategorySelectLabels();
    repairLaoStaticText();
    showLoadingOverlay();
    try {
        loadCachedPersistentData();
        renderInitialAppShell();
        syncRemotePersistentDataInBackground();
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

function getLaoDateValue(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Vientiane',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}:${value.second}`;
}

function formatInventoryDate(dateValue) {
    const value = String(dateValue || '').trim();
    if (!value) return '';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime()) && /T|Z|[+-]\d{2}:?\d{2}$/.test(value)) {
        return getLaoDateValue(parsed);
    }
    return value.replace('T', ' ');
}

function initTodayDates() {
    const today = getLaoDateValue();
    const dateInput = document.getElementById('input-date');
    if (dateInput) dateInput.value = today;
    const stickerDateInput = document.getElementById('sticker-lot-date');
    if (stickerDateInput && !stickerDateInput.value) stickerDateInput.value = today.slice(0, 10);
}

function initAddItemEnterNavigation() {
    const form = document.getElementById('add-item-form');
    if (!form || form.dataset.enterNavigationReady === 'true') return;

    form.dataset.enterNavigationReady = 'true';
    form.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
        if (event.target?.tagName === 'TEXTAREA') return;

        const fields = Array.from(form.querySelectorAll('input, select, textarea, button'))
            .filter(field => !field.disabled && field.type !== 'hidden' && field.offsetParent !== null);
        const currentIndex = fields.indexOf(event.target);
        if (currentIndex === -1 || currentIndex === fields.length - 1) return;

        event.preventDefault();
        fields[currentIndex + 1].focus();
    });
}

// Save & Load State through the configured data store.
function applyPersistentData(data = {}) {
    inventory = (data.inventory || [...DEFAULT_INVENTORY]).map(normalizeInventoryItem);
    dispatchLogs = (data.dispatchLogs || []).map(normalizeDispatchLog);
    branding = data.branding || { ...DEFAULT_BRANDING };
    sortInventoryByBarcode();
}

function loadCachedPersistentData() {
    try {
        applyPersistentData(window.WarehouseStore.loadCachedAll(DEFAULT_INVENTORY, DEFAULT_BRANDING));
    } catch (error) {
        console.error("Error loading cached data", error);
        applyPersistentData({
            inventory: [...DEFAULT_INVENTORY],
            dispatchLogs: [],
            branding: { ...DEFAULT_BRANDING }
        });
    }
}

function renderInitialAppShell() {
    renderInventoryTable();
    initInventoryColumnResize();
    applyBrandingUI();
    repairLaoStaticText();
    updateTopStats();
    initTodayDates();
    initAddItemEnterNavigation();
    installLaoTextRepairObserver();
}

function syncRemotePersistentDataInBackground() {
    if (!window.WarehouseStore.googleSheetsEnabled()) return;

    setTimeout(async () => {
        try {
            const data = await window.WarehouseStore.loadRemoteAll(DEFAULT_INVENTORY, DEFAULT_BRANDING);
            applyPersistentData(data);
            renderInventoryTable();
            applyBrandingUI();
            updateTopStats();
            if (!document.getElementById('tab-dispatch')?.classList.contains('hidden')) {
                populateDispatchDropdown();
            }
            if (!document.getElementById('tab-dispatch-logs')?.classList.contains('hidden')) {
                renderDispatchLogsTable();
            }
            if (!document.getElementById('tab-stickers')?.classList.contains('hidden')) {
                populateStickerItemSelect();
                renderStickerPreview();
            }
        } catch (error) {
            console.error("Google Sheets background sync failed", error);
            showToast("Google Sheets sync failed. Showing cached data.", "warning");
        }
    }, 0);
}

async function loadAllPersistentData() {
    try {
        const data = await window.WarehouseStore.loadAll(DEFAULT_INVENTORY, DEFAULT_BRANDING);
        applyPersistentData(data);

        if (!data.inventory || data.inventory.length === 0) {
            await saveInventoryData();
        }
    } catch(e) {
        console.error("Error loading persistent data", e);
        applyPersistentData({
            inventory: [...DEFAULT_INVENTORY],
            dispatchLogs: [],
            branding: { ...DEFAULT_BRANDING }
        });
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

async function saveInventoryItemData(item) {
    try {
        if (window.WarehouseStore.saveInventoryItem) {
            await window.WarehouseStore.saveInventoryItem(item, inventory);
            return true;
        }
        await window.WarehouseStore.saveInventory(inventory);
        return true;
    } catch(e) {
        console.error("Error saving inventory item", e);
        showToast("Inventory item save to Google Sheets failed.", "error");
        return false;
    }
}

function saveInventoryDataFast() {
    try {
        window.WarehouseStore.saveInventoryLocal(inventory);
        const inventorySnapshot = inventory.map(item => ({ ...item }));
        setTimeout(() => {
            window.WarehouseStore.syncInventory(inventorySnapshot).catch(e => {
                console.error("Inventory background sync failed", e);
                showToast("Google Sheets sync failed. Local data was saved.", "warning");
            });
        }, 0);
        return true;
    } catch(e) {
        console.error("Error saving inventory locally", e);
        showToast("Inventory save failed.", "error");
        return false;
    }
}

function saveInventoryItemDataFast(item) {
    try {
        window.WarehouseStore.saveInventoryLocal(inventory);
        const itemSnapshot = { ...item };
        const inventorySnapshot = inventory.map(entry => ({ ...entry }));
        setTimeout(() => {
            window.WarehouseStore.syncInventoryItem(itemSnapshot, inventorySnapshot).catch(e => {
                console.error("Inventory item background sync failed", e);
                showToast("Google Sheets sync failed. Local data was saved.", "warning");
            });
        }, 0);
        return true;
    } catch(e) {
        console.error("Error saving inventory item locally", e);
        showToast("Inventory item save failed.", "error");
        return false;
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
    populateStickerItemSelect();
    showToast("ໂຫຼດຂໍ້ມູນຕົວຢ່າງສຳເລັດ!", "success");
}

// Sort Inventory Array by Barcode
function sortInventoryByBarcode() {
    inventory.sort((a, b) => String(a.barcode).localeCompare(String(b.barcode), undefined, { numeric: true }));
}

// Navigation Tab Switching Logic
function switchTab(tabName) {
    refreshCategorySelectLabels();
    repairLaoStaticText();
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
    if (tabName === 'stickers') {
        populateStickerItemSelect();
        renderStickerPreview();
    }
    repairLaoStaticText();
}

function filterByCategory(catCode) {
    switchTab('inventory');
    document.getElementById('inventory-category-filter').value = catCode;
    inventoryCurrentPage = 1;
    renderInventoryTable();
}

function getActiveTabName() {
    const activeTab = Array.from(document.querySelectorAll('.tab-content'))
        .find(tab => !tab.classList.contains('hidden'));
    return activeTab ? activeTab.id.replace('tab-', '') : '';
}

function keepAddEntryTab(tabName) {
    if (tabName === 'add-entry' && document.getElementById('tab-add-entry')?.classList.contains('hidden')) {
        switchTab('add-entry');
    }
}



function normalizeInventoryItem(item) {
    const normalized = { ...item };
    normalized.barcode = cleanCode(normalized.barcode ?? normalized.BarCode ?? normalized.Barcode ?? normalized.barCode);
    normalized.categoryCode = normalizeCategoryCode(normalized);
    const legacyQty = Number(normalized.qty ?? normalized.QTY ?? normalized.Quantity ?? 0) || 0;
    normalized.snkQty = Number(normalized.snkQty ?? normalized.SNK_QTY ?? normalized["SNK'QTY"] ?? normalized['SNK QTY'] ?? 0) || 0;
    normalized.mmnQty = Number(normalized.mmnQty ?? normalized.MMN_QTY ?? normalized["MMN'QTY"] ?? normalized['MMN QTY'] ?? 0) || 0;
    if (!normalized.snkQty && !normalized.mmnQty && legacyQty) {
        normalized.snkQty = legacyQty;
    }
    normalized.qty = normalized.snkQty + normalized.mmnQty;
    normalized.priceUnit = Number(normalized.priceUnit ?? normalized['Pice Unit'] ?? normalized['Price Unit'] ?? 0) || 0;
    normalized.imageUrl = String(
        normalized.imageUrl ??
        normalized.ImageUrl ??
        normalized['Image URL'] ??
        normalized['Image Url'] ??
        normalized['ຮູບ'] ??
        normalized.photoUrl ??
        normalized.image ??
        normalized.photo ??
        normalized.pictureUrl ??
        normalized.picture ??
        ''
    ).trim();
    return normalized;
}

function getItemTotalQty(item) {
    return Number(item?.snkQty || 0) + Number(item?.mmnQty || 0);
}

function reduceInventorySplitQty(item, qtyToReduce) {
    let remaining = Number(qtyToReduce || 0);
    const snkReduction = Math.min(Number(item.snkQty || 0), remaining);
    item.snkQty = Number(item.snkQty || 0) - snkReduction;
    remaining -= snkReduction;
    item.mmnQty = Math.max(0, Number(item.mmnQty || 0) - remaining);
    item.qty = getItemTotalQty(item);
}

function normalizeDispatchLog(log) {
    const normalized = { ...log };
    normalized.qtyDispatched = Number(normalized.qtyDispatched || 0) || 0;
    normalized.shippingPrice = Number(normalized.shippingPrice || 0) || 0;
    normalized.boxes = Number(normalized.boxes || 0) || 0;
    normalized.itemDetails = normalized.itemDetails || {};
    normalized.imageUrl = normalized.imageUrl || getItemImageUrl(normalized.itemDetails);
    normalized.driverName = normalized.driverName || normalized.driver || '';
    normalized.driver = normalized.driver || normalized.driverName || '';
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

function normalizeComparableText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function getExpectedGroupName(categoryCode) {
    return CATEGORY_MAP[String(categoryCode || '').trim()] || '';
}

function getDisplayGroupName(item) {
    return CATEGORY_MAP[normalizeCategoryCode(item)] || item?.group || '-';
}

function isGroupNameValid(categoryCode, groupName) {
    const expected = getExpectedGroupName(categoryCode);
    const actual = normalizeComparableText(groupName);
    return Boolean(expected) && (!actual || actual === normalizeComparableText(expected));
}

function laoValidationMessage(message) {
    if (message.startsWith('Group must match')) {
        return message.replace('Group must match', 'ຊື່ກຸ່ມຕ້ອງກົງກັບ');
    }

    const messages = {
        'Category code is invalid': 'ລະຫັດກຸ່ມສິນຄ້າບໍ່ຖືກຕ້ອງ',
        'Duplicate barcode': 'Barcode ຊ້ຳກັບຂໍ້ມູນໃນລະບົບ',
        'Barcode is required': 'ກະລຸນາປ້ອນ Barcode',
        'Duplicate barcode inside import file': 'Barcode ຊ້ຳກັນໃນໄຟລ໌ Import',
        'Duplicate barcode inside fixed rows': 'Barcode ຊ້ຳກັນໃນລາຍການທີ່ແກ້ໄຂ'
    };

    return messages[message] || message;
}

function formatLaoValidationMessages(errors) {
    return errors.map(laoValidationMessage).join(' | ');
}

function readImportRow(row) {
    const barcode = cleanCode(row.BarCode || row.Barcode || row.barcode || row['Barcode'] || row['Code']);
    const rawCategoryCode = cleanCode(row.categoryCode || row.CategoryCode || row['Category Code'] || row['Group Code'] || row['groupCode']);
    const derivedCode = rawCategoryCode || normalizeCategoryCode({ barcode });
    const categoryCode = CATEGORY_MAP[derivedCode] ? derivedCode : '';

    return normalizeInventoryItem({
        barcode,
        categoryCode,
        itemNameLaos: String(row['Item name Laos'] || row.itemNameLaos || row.Name || row['Item Name'] || '').trim(),
        itemNameChinese: String(row['Item name Chinese'] || row.itemNameChinese || '').trim(),
        model: String(row.Modle || row.Model || row.model || '').trim(),
        size: String(row.Size || row.size || '').trim(),
        packSize: String(row['Pack size'] || row.packSize || '').trim(),
        useFor: String(row.Use_For || row.useFor || '').trim(),
        unitLaos: String(row['Unit Laos'] || row.unitLaos || '').trim(),
        snkQty: parseInt(row["SNK'QTY"] || row.SNK_QTY || row['SNK QTY'] || row.snkQty || 0, 10) || 0,
        mmnQty: parseInt(row["MMN'QTY"] || row.MMN_QTY || row['MMN QTY'] || row.mmnQty || 0, 10) || 0,
        qty: parseInt(row["TOTAL'QTY"] || row.QTY || row.qty || row.Quantity || 0, 10) || 0,
        group: String(row.Group || row.group || '').trim(),
        category: String(row.Category || row.category || '').trim(),
        area: String(row.Area || row.area || '').trim(),
        responsiblePerson: String(row['Responsible person'] || row.responsiblePerson || '').trim(),
        priceUnit: parseFloat(row['Pice Unit'] || row['Price Unit'] || row.priceUnit || 0) || 0,
        nameOfPrice: String(row.name_of_price || row.nameOfPrice || 'LAK').trim() || 'LAK',
        date: formatInventoryDate(row.Date || row.date || getLaoDateValue()),
        pr: String(row.PR || row.pr || '').trim(),
        remark: String(row.Remark || row.remark || '').trim(),
        imageUrl: String(row.imageUrl || row.ImageUrl || row['Image URL'] || row['Image Url'] || row['ຮູບ'] || row.photoUrl || row.image || row.photo || row.pictureUrl || row.picture || '').trim()
    });
}

function validateInventoryItem(item, options = {}) {
    const errors = [];
    const barcode = cleanCode(item.barcode);
    const categoryCode = normalizeCategoryCode(item);
    const expectedGroup = getExpectedGroupName(categoryCode);
    const existingItems = options.existingItems || inventory;
    const originalBarcode = options.originalBarcode ? String(options.originalBarcode) : '';

    if (!categoryCode || !expectedGroup) errors.push('Category code is invalid');
    if (!isGroupNameValid(categoryCode, item.group)) errors.push(`Group must match ${categoryCode} - ${expectedGroup}`);
    if (!barcode) errors.push('Barcode is required');

    if (barcode && existingItems.some(i => String(i.barcode) === barcode && String(i.barcode) !== originalBarcode)) {
        errors.push('Duplicate barcode');
    }

    return {
        ok: errors.length === 0,
        errors,
        item: {
            ...item,
            barcode,
            categoryCode,
            qty: getItemTotalQty(item),
            group: expectedGroup || item.group || ''
        }
    };
}

function validateImportCategoryGroupOnly(item) {
    const categoryCode = cleanCode(item.categoryCode);
    const expectedGroup = getExpectedGroupName(categoryCode);
    const actualGroup = normalizeComparableText(item.group);
    const errors = [];

    if (!categoryCode || !expectedGroup) {
        errors.push('Category code is invalid');
    } else if (!actualGroup || actualGroup !== normalizeComparableText(expectedGroup)) {
        errors.push(`Group must match ${categoryCode} - ${expectedGroup}`);
    }

    return {
        ok: errors.length === 0,
        errors,
        item: {
            ...item,
            categoryCode,
            group: expectedGroup || item.group || ''
        }
    };
}

function createBarcodeSequence(items = inventory) {
    const maxByCategory = {};

    Object.keys(CATEGORY_MAP).forEach(code => {
        maxByCategory[code] = Number(code);
    });

    items.forEach(item => {
        const barcode = cleanCode(item.barcode);
        const categoryCode = normalizeCategoryCode(item);
        const numericBarcode = Number(barcode);

        if (
            CATEGORY_MAP[categoryCode] &&
            /^\d{8}$/.test(barcode) &&
            Number.isFinite(numericBarcode) &&
            barcode.charAt(0) === categoryCode.charAt(0)
        ) {
            maxByCategory[categoryCode] = Math.max(maxByCategory[categoryCode] || Number(categoryCode), numericBarcode);
        }
    });

    return function nextBarcode(categoryCode) {
        const code = cleanCode(categoryCode);
        if (!CATEGORY_MAP[code]) return '';
        maxByCategory[code] = Math.max(maxByCategory[code] || Number(code), Number(code)) + 1;
        return String(maxByCategory[code]).padStart(8, '0');
    };
}

function getNextBarcodeForCategory(categoryCode) {
    const code = cleanCode(categoryCode);
    if (!CATEGORY_MAP[code]) return '';

    const prefixDigit = code.charAt(0);
    const maxBarcode = inventory.reduce((max, item) => {
        const barcode = cleanCode(item.barcode);
        const numericBarcode = Number(barcode);
        if (
            /^\d{8}$/.test(barcode) &&
            barcode.charAt(0) === prefixDigit &&
            Number.isFinite(numericBarcode)
        ) {
            return Math.max(max, numericBarcode);
        }
        return max;
    }, Number(code));

    return String(maxBarcode + 1).padStart(8, '0');
}

function updateInputBarcodeSuggestion(categoryCode) {
    const barcodeInput = document.getElementById('input-barcode');
    if (!barcodeInput) return;

    const nextBarcode = getNextBarcodeForCategory(categoryCode);
    barcodeInput.placeholder = nextBarcode ? `ຕົວຕໍ່ໄປ: ${nextBarcode}` : 'ຕົວຢ່າງ: 10000001';
}

function getInventoryUpdateNotifications() {
    try {
        const alerts = JSON.parse(localStorage.getItem(INVENTORY_UPDATE_ALERT_STORAGE_KEY) || '[]');
        return Array.isArray(alerts) ? alerts : [];
    } catch (error) {
        return [];
    }
}

function saveInventoryUpdateNotifications(alerts) {
    localStorage.setItem(INVENTORY_UPDATE_ALERT_STORAGE_KEY, JSON.stringify(alerts.slice(0, 20)));
}

function addInventoryUpdateNotification(item) {
    const barcode = cleanCode(item?.barcode);
    if (!barcode) return;

    const alerts = getInventoryUpdateNotifications().filter(alert => String(alert.barcode) !== String(barcode));
    alerts.unshift({
        barcode,
        itemNameLaos: item.itemNameLaos || item.itemNameChinese || '-',
        updatedAt: new Date().toLocaleString('lo-LA')
    });
    saveInventoryUpdateNotifications(alerts);
    renderInventoryUpdateNotifications();
}

function renderInventoryUpdateNotifications() {
    const alertBox = document.getElementById('inventory-update-alert');
    const countEl = document.getElementById('inventory-update-alert-count');
    const listEl = document.getElementById('inventory-update-alert-list');
    if (!alertBox || !countEl || !listEl) return;

    const alerts = getInventoryUpdateNotifications();
    alertBox.classList.toggle('hidden', alerts.length === 0);
    countEl.textContent = alerts.length;
    listEl.textContent = alerts
        .slice(0, 5)
        .map(alert => `[${alert.barcode}] ${alert.itemNameLaos}`)
        .join(' | ');
}

window.clearInventoryUpdateNotifications = function() {
    saveInventoryUpdateNotifications([]);
    renderInventoryUpdateNotifications();
    renderInventoryTable();
};


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
    const filtered = getFilteredInventoryItems();
    const updatedBarcodes = new Set(getInventoryUpdateNotifications().map(alert => String(alert.barcode)));

    const totalQtySum = filtered.reduce((sum, item) => sum + getItemTotalQty(item), 0);
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
                <td colspan="22" class="text-center py-12 text-slate-500 font-sans">
                    <i class="fa-solid fa-box-open text-4xl mb-2 block"></i>
                    No inventory data found
                </td>
            </tr>
        `;
        updateTableSummary(0, 0);
        updateCategorySummary();
        renderInventoryUpdateNotifications();
        return;
    }

    let html = '';

    pagedItems.forEach((item, index) => {
        const snkQtyVal = Number(item.snkQty || 0);
        const mmnQtyVal = Number(item.mmnQty || 0);
        const qtyVal = snkQtyVal + mmnQtyVal;
        const rowNumber = startIndex + index + 1;
        const isUpdated = updatedBarcodes.has(String(item.barcode));
        const rowClass = isUpdated
            ? 'transition bg-blue-950/25 hover:bg-blue-900/35 ring-1 ring-inset ring-blue-500/40'
            : 'transition hover:bg-emerald-950/30';
        const barcodeClass = isUpdated
            ? 'font-bold text-blue-400 font-mono'
            : 'font-bold text-emerald-400 font-mono';

        html += `
            <tr class="${rowClass}">
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
                <td class="${barcodeClass}">${escapeHtml(item.barcode)}${isUpdated ? ' <span class="ml-1 inline-flex items-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white">UPDATE</span>' : ''}</td>
                <td class="font-bold text-slate-100 font-sans">${escapeHtml(item.itemNameLaos)}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.itemNameChinese || '-')}</td>
                <td class="text-slate-300">${escapeHtml(item.model || '-')}</td>
                <td class="text-slate-300">${escapeHtml(item.size || '-')}</td>
                <td class="text-slate-300">${escapeHtml(item.packSize || '-')}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.useFor || '-')}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.unitLaos)}</td>
                <td class="text-right font-bold text-emerald-400 font-mono text-sm">${snkQtyVal.toLocaleString()}</td>
                <td class="text-right font-bold text-cyan-400 font-mono text-sm">${mmnQtyVal.toLocaleString()}</td>
                <td class="text-right font-bold text-blue-400 font-mono text-sm">${qtyVal.toLocaleString()}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.group || CATEGORY_MAP[normalizeCategoryCode(item)] || '-')}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.category || '-')}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.area || '-')}</td>
                <td class="text-slate-300 font-sans">${escapeHtml(item.responsiblePerson || '-')}</td>
                <td class="text-right font-mono text-amber-400">${Number(item.priceUnit || 0).toLocaleString()}</td>
                <td class="text-slate-300">${escapeHtml(item.nameOfPrice || 'LAK')}</td>
                <td class="text-slate-400">${escapeHtml(formatInventoryDate(item.date) || '-')}</td>
                <td class="text-slate-400">${escapeHtml(item.pr || '-')}</td>
                <td class="text-slate-400 font-sans">${escapeHtml(item.remark || '-')}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateTableSummary(filtered.length, totalQtySum);
    updateCategorySummary();
    updateTopStats();
    renderInventoryUpdateNotifications();
}

function getFilteredInventoryItems() {
    const searchVal = document.getElementById('inventory-search')?.value.toLowerCase().trim() || '';
    const catFilter = document.getElementById('inventory-category-filter')?.value || 'ALL';
    const dateFrom = document.getElementById('inventory-date-from')?.value || '';
    const dateTo = document.getElementById('inventory-date-to')?.value || '';

    return inventory.filter(item => {
        const itemDate = formatInventoryDate(item.date).slice(0, 10);
        const matchesSearch = String(item.barcode || '').toLowerCase().includes(searchVal) ||
                              String(item.itemNameLaos || '').toLowerCase().includes(searchVal) ||
                              String(item.itemNameChinese || '').toLowerCase().includes(searchVal) ||
                              String(item.model || '').toLowerCase().includes(searchVal) ||
                              String(item.area || '').toLowerCase().includes(searchVal);

        const matchesCat = matchesInventoryCategory(item, catFilter);
        const matchesDateFrom = !dateFrom || (itemDate && itemDate >= dateFrom);
        const matchesDateTo = !dateTo || (itemDate && itemDate <= dateTo);
        return matchesSearch && matchesCat && matchesDateFrom && matchesDateTo;
    });
}

function getCurrentInventoryPageItems() {
    const filtered = getFilteredInventoryItems();
    const pageSize = getInventoryPageSize(filtered.length);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(Math.max(inventoryCurrentPage, 1), totalPages);
    const startIndex = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize;
    const endIndex = inventoryPageSize === 'ALL' ? filtered.length : Math.min(startIndex + pageSize, filtered.length);
    return filtered.slice(startIndex, endIndex);
}

function getInventoryColumnWidths() {
    try {
        const saved = JSON.parse(localStorage.getItem(INVENTORY_COLUMN_WIDTH_STORAGE_KEY) || '[]');
        if (Array.isArray(saved) && saved.length === INVENTORY_DEFAULT_COLUMN_WIDTHS.length) {
            return saved.map((width, index) => Math.max(48, Number(width) || INVENTORY_DEFAULT_COLUMN_WIDTHS[index]));
        }
    } catch (error) {
        console.warn('Inventory column width load failed', error);
    }
    return [...INVENTORY_DEFAULT_COLUMN_WIDTHS];
}

function applyInventoryColumnWidths(widths = getInventoryColumnWidths()) {
    const table = document.getElementById('inventory-resizable-table');
    const cols = document.querySelectorAll('#inventory-column-widths col');
    if (!table || cols.length === 0) return;

    cols.forEach((col, index) => {
        col.style.width = `${widths[index] || INVENTORY_DEFAULT_COLUMN_WIDTHS[index] || 100}px`;
    });
    table.style.width = `${widths.reduce((sum, width) => sum + width, 0)}px`;
}

function initInventoryColumnResize() {
    const table = document.getElementById('inventory-resizable-table');
    if (!table || table.dataset.resizeReady === 'true') return;

    applyInventoryColumnWidths();
    table.dataset.resizeReady = 'true';

    table.querySelectorAll('.column-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', event => {
            event.preventDefault();
            event.stopPropagation();

            const th = handle.closest('th');
            const colIndex = Number(th?.dataset.resizeCol);
            if (!Number.isInteger(colIndex)) return;

            const startX = event.clientX;
            const widths = getInventoryColumnWidths();
            const startWidth = widths[colIndex] || th.offsetWidth;
            document.body.classList.add('is-resizing-column');

            const onMove = moveEvent => {
                const nextWidth = Math.max(48, startWidth + moveEvent.clientX - startX);
                widths[colIndex] = nextWidth;
                applyInventoryColumnWidths(widths);
            };

            const onUp = () => {
                document.body.classList.remove('is-resizing-column');
                localStorage.setItem(INVENTORY_COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(widths));
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    });
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
    const totalQtySum = inventory.reduce((acc, curr) => acc + getItemTotalQty(curr), 0);
    document.getElementById('stat-total-qty').innerText = totalQtySum.toLocaleString();
    document.getElementById('stat-total-dispatches').innerText = dispatchLogs.length;
}

window.syncInputGroupWithCategory = function() {
    const catCode = document.getElementById('input-category-code').value;
    const groupInput = document.getElementById('input-group');
    if (catCode && groupInput) groupInput.value = CATEGORY_MAP[catCode] || "";
    updateInputBarcodeSuggestion(catCode);
};

window.autoGenerateBarcode = window.syncInputGroupWithCategory;

window.syncEditGroupWithCategory = function() {
    const catCode = document.getElementById('edit-category-code')?.value;
    const groupInput = document.getElementById('edit-group');
    if (catCode && groupInput) groupInput.value = CATEGORY_MAP[catCode] || "";
};

window.updateEditTotalQty = function() {
    const snkQty = Number(document.getElementById('edit-snk-qty')?.value || 0);
    const mmnQty = Number(document.getElementById('edit-mmn-qty')?.value || 0);
    const totalInput = document.getElementById('edit-total-qty');
    if (totalInput) totalInput.value = snkQty + mmnQty;
};

window.updateImportReviewTotal = function(input) {
    const row = input?.closest('tr');
    if (!row) return;
    const snkQty = Number(row.querySelector('[data-field="snkQty"]')?.value || 0);
    const mmnQty = Number(row.querySelector('[data-field="mmnQty"]')?.value || 0);
    const totalInput = row.querySelector('[data-field="qty"]');
    if (totalInput) totalInput.value = snkQty + mmnQty;
};

window.clearAddItemForm = function() {
    const form = document.getElementById('add-item-form');
    if (!form) return;

    form.reset();
    initTodayDates();
    updateInputBarcodeSuggestion('');
    document.getElementById('input-category-code')?.focus();
};

window.handleSingleItemSubmit = async function(e) {
    e.preventDefault();
    const activeTabBeforeSave = getActiveTabName();

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

    const qtySlot = document.getElementById('input-qty-slot')?.value || 'snkQty';
    const inputQty = parseInt(document.getElementById('input-qty').value, 10) || 0;
    const snkQty = qtySlot === 'snkQty' ? inputQty : 0;
    const mmnQty = qtySlot === 'mmnQty' ? inputQty : 0;
    const priceUnit = parseFloat(document.getElementById('input-price-unit').value) || 0;

    const newItemDraft = {
        barcode,
        categoryCode: catCode,
        itemNameLaos,
        itemNameChinese: document.getElementById('input-item-name-chinese').value.trim(),
        model: document.getElementById('input-model').value.trim(),
        size: document.getElementById('input-size').value.trim(),
        packSize: document.getElementById('input-pack-size').value.trim(),
        useFor: document.getElementById('input-use-for').value.trim(),
        unitLaos: document.getElementById('input-unit-laos').value.trim(),
        snkQty,
        mmnQty,
        qty: snkQty + mmnQty,
        group: document.getElementById('input-group').value.trim() || CATEGORY_MAP[catCode],
        category: document.getElementById('input-category').value.trim(),
        area: document.getElementById('input-area').value.trim(),
        responsiblePerson: document.getElementById('input-responsible-person').value.trim(),
        priceUnit,
        nameOfPrice: document.getElementById('input-name-of-price').value,
        date: getLaoDateValue(),
        pr: document.getElementById('input-pr').value.trim(),
        remark: document.getElementById('input-remark').value.trim(),
        imageUrl: document.getElementById('input-image-url').value.trim()
    };

    const validation = validateInventoryItem(newItemDraft);
    if (!validation.ok) {
        showToast(formatLaoValidationMessages(validation.errors), "error");
        return;
    }

    const newItem = validation.item;
    inventory.push(newItem);
    sortInventoryByBarcode();
    const saved = saveInventoryItemDataFast(newItem);
    if (!saved) {
        inventory = inventory.filter(i => String(i.barcode) !== String(newItem.barcode));
        return;
    }

    addInventoryUpdateNotification(newItem);
    showToast(`ບັນທຶກສິນຄ້າ [${itemNameLaos}] ເຂົ້າສາງສຳເລັດ (Saved Permanently)!`, "success");
    document.getElementById('add-item-form').reset();
    initTodayDates();
    updateInputBarcodeSuggestion('');
    populateDispatchDropdown();
    populateStickerItemSelect();
    keepAddEntryTab(activeTabBeforeSave);
    setTimeout(() => keepAddEntryTab(activeTabBeforeSave), 0);
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
    document.getElementById('edit-snk-qty').value = item.snkQty || 0;
    document.getElementById('edit-mmn-qty').value = item.mmnQty || 0;
    document.getElementById('edit-total-qty').value = Number(item.snkQty || 0) + Number(item.mmnQty || 0);
    document.getElementById('edit-group').value = item.group || "";
    document.getElementById('edit-category').value = item.category || "";
    document.getElementById('edit-area').value = item.area || "";
    document.getElementById('edit-responsible-person').value = item.responsiblePerson || "";
    document.getElementById('edit-price-unit').value = item.priceUnit || 0;
    document.getElementById('edit-name-of-price').value = item.nameOfPrice || "LAK";
    document.getElementById('edit-date').value = formatInventoryDate(item.date);
    document.getElementById('edit-pr').value = item.pr || "";
    document.getElementById('edit-remark').value = item.remark || "";
    document.getElementById('edit-image-url').value = item.imageUrl || "";

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
    const snkQty = parseInt(document.getElementById('edit-snk-qty').value, 10) || 0;
    const mmnQty = parseInt(document.getElementById('edit-mmn-qty').value, 10) || 0;
    const priceUnit = parseFloat(document.getElementById('edit-price-unit').value) || 0;

    const editedDraft = {
        barcode: newBarcode,
        categoryCode: catCode,
        itemNameLaos: document.getElementById('edit-item-name-laos').value.trim(),
        itemNameChinese: document.getElementById('edit-item-name-chinese').value.trim(),
        model: document.getElementById('edit-model').value.trim(),
        size: document.getElementById('edit-size').value.trim(),
        packSize: document.getElementById('edit-pack-size').value.trim(),
        useFor: document.getElementById('edit-use-for').value.trim(),
        unitLaos: document.getElementById('edit-unit-laos').value.trim(),
        snkQty,
        mmnQty,
        qty: snkQty + mmnQty,
        group: document.getElementById('edit-group').value.trim() || CATEGORY_MAP[catCode],
        category: document.getElementById('edit-category').value.trim(),
        area: document.getElementById('edit-area').value.trim(),
        responsiblePerson: document.getElementById('edit-responsible-person').value.trim(),
        priceUnit,
        nameOfPrice: document.getElementById('edit-name-of-price').value,
        date: document.getElementById('edit-date').value,
        pr: document.getElementById('edit-pr').value.trim(),
        remark: document.getElementById('edit-remark').value.trim(),
        imageUrl: document.getElementById('edit-image-url').value.trim()
    };

    const validation = validateInventoryItem(editedDraft, { originalBarcode: origBarcode });
    if (!validation.ok) {
        showToast(formatLaoValidationMessages(validation.errors), "error");
        return;
    }

    inventory[idx] = validation.item;
    sortInventoryByBarcode();
    await saveInventoryData();
    addInventoryUpdateNotification(validation.item);
    renderInventoryTable();
    populateDispatchDropdown();
    populateStickerItemSelect();
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
        populateStickerItemSelect();
        showToast(`ລົບ [${barcode}] ຮຽບຮ້ອຍແລ້ວ`, "warning");
    }
};

window.confirmDeleteAllInventory = async function() {
    if (inventory.length === 0) {
        showToast("ບໍ່ມີຂໍ້ມູນສິນຄ້າໃຫ້ລົບ", "warning");
        return;
    }

    if (confirm("ຢືນຢັນການລົບ: ທ່ານແນ່ໃຈບໍທີ່ຕ້ອງການລົບຂໍ້ມູນທັງໝົດໃນສາງ?")) {
        const conf = prompt("ພິມຄຳວ່າ 'DELETE' ເພື່ອຢືນຢັນ:");
        if (conf && conf.toUpperCase() === 'DELETE') {
            inventory = [];
            await saveInventoryData();
            renderInventoryTable();
            populateDispatchDropdown();
            populateStickerItemSelect();
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
            categoryCode: "50000000",
            "Item name Laos": "ສາຍໄຟ THW 2.5",
            "Item name Chinese": "电线 THW 2.5",
            Modle: "THW-2.5",
            Size: "100m",
            "Pack size": "1 Roll",
            Use_For: "ໄຟຟ້າ",
            "Unit Laos": "ກວ້ອນ",
            "SNK'QTY": 20,
            "MMN'QTY": 0,
            "TOTAL'QTY": 20,
            Group: "ອຸປະກອນໄຟຟ້າ",
            Category: "ສາຍໄຟ",
            Area: "Rack E-02",
            "Responsible person": "ທ້າວ ບຸນມີ",
            "Pice Unit": 450000,
            name_of_price: "LAK",
            Date: "2026-07-22",
            PR: "PR-2026-99",
            Remark: "ຕົວຢ່າງ Excel",
            "Image URL": "https://example.com/product-image.jpg"
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
    const activeTabBeforeSave = getActiveTabName();

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });

            if (!rows || rows.length === 0) {
                showToast("ໄຟລ໌ Excel ບໍ່ມີຂໍ້ມູນ", "error");
                return;
            }

            let addedCount = 0;
            pendingImportRows = [];
            const importedItems = [];

            rows.forEach((row, index) => {
                const draft = readImportRow(row);
                const validation = validateInventoryItem(draft, { existingItems: [...inventory, ...importedItems] });
                const errors = [...validation.errors];

                if (errors.length) {
                    pendingImportRows.push({ rowNumber: index + 2, item: validation.item, errors });
                    return;
                }

                importedItems.push(validation.item);
                inventory.push(validation.item);
                addedCount++;
            });

            if (addedCount > 0) {
                sortInventoryByBarcode();
                if (!saveInventoryDataFast()) return;
                importedItems.forEach(addInventoryUpdateNotification);
                renderInventoryTable();
                populateDispatchDropdown();
                populateStickerItemSelect();
            }

            if (pendingImportRows.length) {
                renderImportReviewModal();
                showToast(`ນຳເຂົ້າສຳເລັດ ${addedCount} ລາຍການ, ມີ ${pendingImportRows.length} ລາຍການຕ້ອງແກ້ໄຂ`, "warning");
            } else {
                showToast(`ນຳເຂົ້າ Excel ສຳເລັດ ${addedCount} ລາຍການ`, "success");
            }
            document.getElementById('excel-file-input').value = "";
            keepAddEntryTab(activeTabBeforeSave);
            setTimeout(() => keepAddEntryTab(activeTabBeforeSave), 0);

        } catch(err) {
            console.error(err);
            showToast("ນຳເຂົ້າ Excel ບໍ່ສຳເລັດ ກະລຸນາກວດຮູບແບບໄຟລ໌", "error");
        }
    };
    reader.readAsArrayBuffer(file);
};

function renderImportReviewModal() {
    const modal = document.getElementById('import-review-modal');
    const tbody = document.getElementById('import-review-tbody');
    const count = document.getElementById('import-review-count');
    if (!modal || !tbody) return;

    if (count) count.innerText = pendingImportRows.length;
    tbody.innerHTML = pendingImportRows.map((entry, index) => {
        const item = entry.item;
        const categoryOptions = Object.keys(CATEGORY_MAP).map(code =>
            `<option value="${code}" ${code === item.categoryCode ? 'selected' : ''}>${code} - ${escapeHtml(CATEGORY_MAP[code])}</option>`
        ).join('');

        return `
            <tr class="align-top">
                <td class="p-2 text-slate-400 font-mono">${entry.rowNumber}</td>
                <td class="p-2"><input data-import-index="${index}" data-field="barcode" value="${escapeHtml(item.barcode)}" placeholder="ປ້ອນ Barcode" class="import-review-input font-mono"></td>
                <td class="p-2"><select data-import-index="${index}" data-field="categoryCode" class="import-review-input">${categoryOptions}</select></td>
                <td class="p-2"><input data-import-index="${index}" data-field="group" value="${escapeHtml(item.group)}" class="import-review-input"></td>
                <td class="p-2"><input data-import-index="${index}" data-field="itemNameLaos" value="${escapeHtml(item.itemNameLaos)}" class="import-review-input"></td>
                <td class="p-2"><input data-import-index="${index}" data-field="unitLaos" value="${escapeHtml(item.unitLaos)}" class="import-review-input"></td>
                <td class="p-2"><input data-import-index="${index}" data-field="snkQty" type="number" min="0" oninput="updateImportReviewTotal(this)" value="${Number(item.snkQty || 0)}" class="import-review-input font-mono"></td>
                <td class="p-2"><input data-import-index="${index}" data-field="mmnQty" type="number" min="0" oninput="updateImportReviewTotal(this)" value="${Number(item.mmnQty || 0)}" class="import-review-input font-mono"></td>
                <td class="p-2"><input data-import-index="${index}" data-field="qty" type="number" min="0" value="${Number(item.qty || 0)}" class="import-review-input font-mono" readonly></td>
                <td class="p-2 text-red-300 text-[11px] min-w-56 import-review-error">${escapeHtml(formatLaoValidationMessages(entry.errors))}</td>
            </tr>
        `;
    }).join('');

    modal.classList.remove('hidden');
}

window.closeImportReviewModal = function() {
    document.getElementById('import-review-modal')?.classList.add('hidden');
};

window.applyFixedImportRows = async function() {
    const activeTabBeforeSave = getActiveTabName();

    document.querySelectorAll('[data-import-index][data-field]').forEach(input => {
        const index = Number(input.dataset.importIndex);
        const field = input.dataset.field;
        if (!pendingImportRows[index]) return;
        pendingImportRows[index].item[field] = ['snkQty', 'mmnQty', 'qty'].includes(field) ? Number(input.value || 0) : input.value.trim();
        pendingImportRows[index].item.qty = Number(pendingImportRows[index].item.snkQty || 0) + Number(pendingImportRows[index].item.mmnQty || 0);
    });

    const remaining = [];
    const validRows = [];

    pendingImportRows.forEach(entry => {
        const validation = validateInventoryItem(entry.item, { existingItems: [...inventory, ...validRows] });
        const errors = [...validation.errors];

        if (errors.length) {
            remaining.push({ ...entry, item: validation.item, errors });
            return;
        }

        validRows.push(validation.item);
    });

    if (validRows.length) {
        inventory.push(...validRows);
        sortInventoryByBarcode();
        if (!saveInventoryDataFast()) return;
        validRows.forEach(addInventoryUpdateNotification);
        renderInventoryTable();
        populateDispatchDropdown();
        populateStickerItemSelect();
    }

    pendingImportRows = remaining;
    if (pendingImportRows.length) {
        renderImportReviewModal();
        showToast(`ນຳເຂົ້າແລ້ວ ${validRows.length} ລາຍການ, ຍັງເຫຼືອ ${pendingImportRows.length} ລາຍການຕ້ອງແກ້ໄຂ`, "warning");
        keepAddEntryTab(activeTabBeforeSave);
        setTimeout(() => keepAddEntryTab(activeTabBeforeSave), 0);
        return;
    }

    closeImportReviewModal();
    showToast(`ນຳເຂົ້າລາຍການທີ່ແກ້ໄຂສຳເລັດ ${validRows.length} ລາຍການ`, "success");
    keepAddEntryTab(activeTabBeforeSave);
    setTimeout(() => keepAddEntryTab(activeTabBeforeSave), 0);
};
// Export Inventory Table to Excel
window.exportInventoryToExcel = function() {
    const visibleItems = getCurrentInventoryPageItems();
    const filteredItems = getFilteredInventoryItems();
    const pageSize = getInventoryPageSize(filteredItems.length);
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const currentPage = Math.min(Math.max(inventoryCurrentPage, 1), totalPages);
    const exportStartIndex = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize;

    if (visibleItems.length === 0) {
        showToast("ບໍ່ມີຂໍ້ມູນໃນສາງໃຫ້ Export", "warning");
        return;
    }

    const exportData = visibleItems.map((item, index) => ({
        NO: exportStartIndex + index + 1,
        BarCode: item.barcode,
        "Item name Laos": item.itemNameLaos,
        "Item name Chinese": item.itemNameChinese || '',
        Modle: item.model || '',
        Size: item.size || '',
        "Pack size": item.packSize || '',
        Use_For: item.useFor || '',
        "Unit Laos": item.unitLaos,
        "SNK'QTY": item.snkQty || 0,
        "MMN'QTY": item.mmnQty || 0,
        "TOTAL'QTY": Number(item.snkQty || 0) + Number(item.mmnQty || 0),
        Group: item.group || '',
        Category: item.category || '',
        Area: item.area || '',
        "Responsible person": item.responsiblePerson || '',
        "Pice Unit": item.priceUnit,
        name_of_price: item.nameOfPrice || 'LAK',
        Date: formatInventoryDate(item.date),
        PR: item.pr || '',
        Remark: item.remark || '',
        "Image URL": item.imageUrl || ''
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
        option.textContent = `[${item.barcode}] ${item.itemNameLaos} (QTY: ${getItemTotalQty(item)} ${item.unitLaos})`;
        select.appendChild(option);
    });
}

function getLogItemDetails(log) {
    return log.itemDetails || {};
}

function getLogCategoryName(log) {
    const item = getLogItemDetails(log);
    return CATEGORY_MAP[normalizeCategoryCode(item)] || item.group || '-';
}

function refreshCategorySelectLabels() {
    const selectors = [
        'inventory-category-filter',
        'dispatch-category-filter',
        'dispatch-barcode-select',
        'input-category-code',
        'edit-category-code'
    ];

    selectors.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        Array.from(select.options).forEach(option => {
            if (option.value === 'ALL') {
                option.textContent = '-- ທຸກກຸ່ມສິນຄ້າ (All Categories) --';
            } else if (option.value === '' && (id === 'input-category-code' || id === 'edit-category-code')) {
                option.textContent = '-- ເລືອກກຸ່ມສິນຄ້າ --';
            } else if (option.value === '' && id === 'dispatch-barcode-select') {
                option.textContent = '-- ເລືອກສິນຄ້າຈາກຕາຕະລາງສາງ --';
            } else if (CATEGORY_MAP[option.value]) {
                option.textContent = `${option.value} - ${CATEGORY_MAP[option.value]}`;
            }
        });
    });
}

function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
}

function setHtml(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
}

function setPlaceholder(id, text) {
    const el = document.getElementById(id);
    if (el) el.placeholder = text;
}

function setNearestLabel(inputId, html) {
    const input = document.getElementById(inputId);
    const label = input?.closest('div')?.querySelector('label');
    if (label) label.innerHTML = html;
}

function refreshCurrencySelectLabels() {
    ['input-name-of-price', 'edit-name-of-price'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const labels = {
            LAK: 'LAK (ກີບ)',
            THB: 'THB (ບາດ)',
            USD: 'USD (ໂດລາ)',
            CNY: 'CNY (ຢວນ)'
        };
        Array.from(select.options).forEach(option => {
            if (labels[option.value]) option.textContent = labels[option.value];
        });
    });
}

function repairLaoStaticText() {
    document.title = 'ລະບົບຈັດການສາງ & ສົ່ງເຄື່ອງໄປໂຮງງານຕ່າງແຂວງ';

    setText('#app-company-title', 'ລະບົບຈັດການສາງ & ສົ່ງເຄື່ອງໄປໂຮງງານ');
    setText('#subtext-display', 'Smart Warehouse & Inter-Factory Dispatching System (Phetsarath OT)');
    setHtml('#tab-btn-inventory', '<i class="fa-solid fa-table-cells"></i> 1. ຕາຕະລາງສາງສິນຄ້າ');
    setHtml('#tab-btn-add-entry', '<i class="fa-solid fa-circle-plus"></i> 2. ປ້ອນຂໍ້ມູນ / ນຳເຂົ້າ Excel');
    setHtml('#tab-btn-dispatch', '<i class="fa-solid fa-truck-ramp-box"></i> 3. ສົ່ງເຄື່ອງໄປໂຮງງານຕ່າງແຂວງ');
    setHtml('#tab-btn-dispatch-logs', '<i class="fa-solid fa-clock-rotate-left"></i> 4. ປະຫວັດການສົ່ງເຄື່ອງ');
    setHtml('#tab-btn-stickers', '<i class="fa-solid fa-tags"></i> 5. ປີ້ນສະຕິກເກີ');

    setHtml('#tab-add-entry h2', '<i class="fa-solid fa-pen-to-square"></i> ປ້ອນຂໍ້ມູນສິນຄ້າເຂົ້າສາງ');
    setText('#tab-add-entry h2 + p', 'ປ້ອນຂໍ້ມູນ ພ້ອມກວດສອບ Barcode ແລະ ລາຍການຊ້ຳກັນອັດໂນມັດ');
    setHtml('#tab-add-entry .lg\\:col-span-4 h2', '<i class="fa-solid fa-file-excel"></i> ນຳເຂົ້າ Excel (Import)');
    setHtml('#tab-dispatch h2', '<i class="fa-solid fa-truck-ramp-box"></i> ລະບົບຈັດເກັບຂໍ້ມູນສົ່ງເຄື່ອງໄປໂຮງງານຕ່າງແຂວງ');
    setText('#tab-dispatch h2 + p', 'ດຶງຂໍ້ມູນສິນຄ້າອັດໂນມັດຈາກ Barcode ພ້ອມເພີ່ມລາຄາຂົນສົ່ງ, ນ້ຳໜັກ ແລະ Box');
    setHtml('#tab-dispatch-logs h2', '<i class="fa-solid fa-clock-rotate-left"></i> ປະຫວັດການສົ່ງເຄື່ອງໄປໂຮງງານຕ່າງແຂວງ');
    setText('#tab-dispatch-logs h2 + p', 'ບັນທຶກປະຫວັດການຂົນສົ່ງສິນຄ້າລະຫວ່າງໂຮງງານ');
    setHtml('#tab-stickers h2', '<i class="fa-solid fa-tags"></i> ປີ້ນສະຕິກເກີ Barcode');
    setText('#tab-stickers h2 + p', 'ເລືອກສິນຄ້າຈາກສາງ ແລ້ວພິມສະຕິກເກີ Barcode ໄດ້ທັນທີ');
    setHtml('#tab-inventory h3', '<i class="fa-solid fa-barcode text-teal-400"></i> ກົດເກນ Barcode ຕາມກຸ່ມສິນຄ້າ (ແຍກກຸ່ມ ແລະ ລຽງລຳດັບອັດໂນມັດ)');
    setHtml('#tab-inventory h3 + span', '<i class="fa-solid fa-database"></i> ເກັບຂໍ້ມູນຖາວອນ');

    const dispatchLookupLabel = document.querySelector('#dispatch-form label.block.font-bold.text-emerald-400');
    if (dispatchLookupLabel) {
        dispatchLookupLabel.innerHTML = '<i class="fa-solid fa-barcode"></i> 1. ສະແກນ ຫຼື ເລືອກ Barcode ສິນຄ້າ (Barcode Lookup / Select)';
    }

    const dispatchProductEmpty = document.querySelector('#dispatch-product-card .text-slate-500');
    if (dispatchProductEmpty) {
        dispatchProductEmpty.innerHTML = '<i class="fa-solid fa-circle-question text-lg"></i> ກະລຸນາປ້ອນ/ເລືອກ Barcode ເພື່ອດຶງຂໍ້ມູນສິນຄ້າມາທຸກຢ່າງ';
    }

    const importPanel = document.querySelector('#tab-add-entry .lg\\:col-span-4');
    if (importPanel) {
        const importText = importPanel.querySelector('.border-b')?.nextElementSibling;
        if (importText) {
            importText.textContent = 'ທ່ານສາມາດນຳເຂົ້າໄຟລ໌ Excel (.xlsx ຫຼື .csv). ລະບົບຈະກວດສອບ Barcode ແລະ ລາຍການຊ້ຳກັນອັດໂນມັດ.';
        }
        const dropzoneTitle = importPanel.querySelector('#dropzone p.text-xs');
        if (dropzoneTitle) dropzoneTitle.textContent = 'ກົດເພື່ອເລືອກໄຟລ໌ Excel ຫຼື ລາກໄຟລ໌ມາເພີ່ມ';
        const sampleButton = importPanel.querySelector('button[onclick="loadSampleInventoryData()"]');
        if (sampleButton) sampleButton.innerHTML = '<i class="fa-solid fa-bolt text-amber-400"></i> ໂຫຼດຂໍ້ມູນຕົວຢ່າງ';
    }

    const importReviewModal = document.getElementById('import-review-modal');
    if (importReviewModal) {
        const title = importReviewModal.querySelector('h2');
        if (title) title.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ກວດສອບຂໍ້ມູນນຳເຂົ້າ';
        const desc = importReviewModal.querySelector('h2 + p');
        if (desc) desc.textContent = 'ກະລຸນາແກ້ໄຂລາຍການທີ່ຜິດ ແລ້ວກົດນຳເຂົ້າໃໝ່. ລາຍການທີ່ກຸ່ມສິນຄ້າບໍ່ກົງກັນຈະບໍ່ຖືກເພີ່ມເຂົ້າສາງ.';
        const count = importReviewModal.querySelector('#import-review-count')?.parentElement;
        if (count) count.innerHTML = `ມີ <span id="import-review-count">${pendingImportRows.length || 0}</span> ລາຍການຕ້ອງແກ້ໄຂ`;
        const headers = importReviewModal.querySelectorAll('th');
        ['ແຖວ Excel', 'Barcode ອັດຕະໂນມັດ', 'ລະຫັດກຸ່ມ', 'ຊື່ກຸ່ມ', 'ຊື່ສິນຄ້າ', 'ຫົວໜ່ວຍ', "SNK'QTY", "MMN'QTY", "TOTAL'QTY", 'ຂໍ້ຜິດພາດ'].forEach((text, index) => {
            if (headers[index]) headers[index].textContent = text;
        });
        const buttons = importReviewModal.querySelectorAll('button');
        if (buttons[0]) buttons[0].textContent = 'ປິດ';
        if (buttons[1]) buttons[1].innerHTML = '<i class="fa-solid fa-circle-check"></i> ນຳເຂົ້າລາຍການທີ່ແກ້ໄຂແລ້ວ';
    }

    setText('.dispatch-summary-card--count .dispatch-summary-label', 'ລາຍການຂົນສົ່ງທັງໝົດ');
    setText('.dispatch-summary-card--money .dispatch-summary-label', 'ຄ່າຂົນສົ່ງລວມ');
    setText('.dispatch-summary-card--qty .dispatch-summary-label', 'ຈຳນວນ QTY ທີ່ສົ່ງ');
    setText('.dispatch-summary-card--box .dispatch-summary-label', 'ຈຳນວນກ່ອງ/Box');
    setHtml('.dispatch-destination-panel h3', '<i class="fa-solid fa-warehouse"></i> ສະຫຼຸບການຂົນສົ່ງຕາມສາງປາຍທາງ');

    const statLabels = document.querySelectorAll('header .text-\\[11px\\].text-slate-400');
    if (statLabels[0]) statLabels[0].textContent = 'ລາຍການສິນຄ້າ';
    if (statLabels[1]) statLabels[1].textContent = 'ຈຳນວນ QTY ລວມ';
    if (statLabels[2]) statLabels[2].textContent = 'ປະຫວັດການສົ່ງ';

    document.querySelectorAll('[data-category-card]').forEach(card => {
        const code = card.getAttribute('data-category-card');
        const label = card.querySelector('span:last-child');
        if (label && CATEGORY_MAP[code]) label.textContent = CATEGORY_MAP[code];
    });

    setPlaceholder('inventory-search', 'ຄົ້ນຫາ Barcode, ຊື່, ຮຸ່ນ, ພື້ນທີ່...');
    setPlaceholder('dispatch-history-search', 'ຄົ້ນຫາ Barcode, ຊື່, ຮຸ່ນ, ພື້ນທີ່...');
    setPlaceholder('dispatch-barcode-input', 'ປ້ອນ Barcode...');
    setPlaceholder('input-barcode', 'ຕົວຢ່າງ: 10000001');
    updateInputBarcodeSuggestion(document.getElementById('input-category-code')?.value);
    setPlaceholder('input-item-name-laos', 'ຊື່ສິນຄ້າ ພາສາລາວ');
    setPlaceholder('input-item-name-chinese', 'ຊື່ສິນຄ້າ ພາສາຈີນ');
    setPlaceholder('input-model', 'ຕົວຢ່າງ: XL-2026');
    setPlaceholder('input-size', 'ຕົວຢ່າງ: 2.5 mm, 100x50 cm');
    setPlaceholder('input-pack-size', 'ຕົວຢ່າງ: 10 units/box');
    setPlaceholder('input-use-for', 'ຕົວຢ່າງ: ສຳນັກງານ, ຊ່າງ, ໂຮງງານ');
    setPlaceholder('input-unit-laos', 'ອັນ, ກ້ອນ, ຊຸດ, ເຄື່ອງ...');
    setPlaceholder('input-group', 'ກຸ່ມສິນຄ້າ');
    setPlaceholder('input-category', 'ໝວດໝູ່ສິນຄ້າ');
    setPlaceholder('input-area', 'Zone A - Rack 01');
    setPlaceholder('input-responsible-person', 'ຊື່ຜູ້ດູແລ');
    setPlaceholder('input-remark', 'ລາຍລະອຽດເພີ່ມເຕີມ...');
    setPlaceholder('dispatch-weight', 'ຕົວຢ່າງ: 15.5 kg / 2 ໂຕນ');
    setPlaceholder('dispatch-origin', 'ຕົວຢ່າງ: ສາງສຳນັກງານໃຫຍ່ HQ');
    setPlaceholder('dispatch-destination', 'ຕົວຢ່າງ: ສາງວັງວຽງ');
    setPlaceholder('dispatch-sender-name', 'ຊື່ຜູ້ສົ່ງ');
    setPlaceholder('dispatch-sender-dept', 'ພະແນກ');
    setPlaceholder('dispatch-sender-phone', 'ເບີໂທ');
    setPlaceholder('dispatch-receiver-name', 'ຊື່ຜູ້ຮັບ');
    setPlaceholder('dispatch-receiver-dept', 'ພະແນກ');
    setPlaceholder('dispatch-receiver-phone', 'ເບີໂທ');
    setPlaceholder('dispatch-driver-name', 'ຊື່ຜູ້ຂັບລົດ');
    setPlaceholder('dispatch-driver-dept', 'ພະແນກ');
    setPlaceholder('dispatch-driver-phone', 'ເບີໂທ');
    setPlaceholder('dispatch-vehicle-plate', 'ປ້າຍລົດ');
    setPlaceholder('dispatch-remark', 'ຕົວຢ່າງ: TR-2026-0088');

    const inventoryPageSizeLabel = document.querySelector('label[for="inventory-page-size"]');
    if (inventoryPageSizeLabel) inventoryPageSizeLabel.textContent = 'Rows';
    const dispatchPageSizeLabel = document.querySelector('label[for="dispatch-page-size"]');
    if (dispatchPageSizeLabel) dispatchPageSizeLabel.textContent = 'Rows';
    const inventoryFoundText = document.querySelector('#filtered-count-badge')?.parentElement;
    if (inventoryFoundText) {
        const badge = inventoryFoundText.querySelector('#filtered-count-badge');
        if (badge) {
            inventoryFoundText.replaceChildren(
                document.createTextNode('ພົບ: '),
                badge,
                document.createTextNode(' ລາຍການ')
            );
        }
    }
    const inventoryActionHeader = document.querySelector('#tab-inventory table thead th:nth-child(2)');
    if (inventoryActionHeader) inventoryActionHeader.textContent = 'ຈັດການ (Action)';
    const deleteAllInventoryButton = document.querySelector('button[onclick="confirmDeleteAllInventory()"]');
    if (deleteAllInventoryButton) deleteAllInventoryButton.innerHTML = '<i class="fa-solid fa-trash-can"></i> ລົບຂໍ້ມູນທັງໝົດ';
    const inventoryFooterNote = document.querySelector('#table-summary-stats')?.previousElementSibling?.querySelector('span:last-child');
    if (inventoryFooterNote) inventoryFooterNote.textContent = 'ລຽງລຳດັບ Barcode ແຕ່ 10000000 ຫາ 90000000 ອັດໂນມັດ (Font: Noto Sans Lao)';

    setNearestLabel('input-category-code', 'Group / Category Prefix <span class="text-red-400">*</span>');
    setNearestLabel('input-barcode', 'BarCode <span class="text-red-400">* (ຫ້າມຊ້ຳ)</span>');
    setNearestLabel('input-model', 'Modle (ຮຸ່ນ)');
    setNearestLabel('input-size', 'Size (ຂະໜາດ)');
    setNearestLabel('input-pack-size', 'Pack size (ຂະໜາດບັນຈຸ)');
    setNearestLabel('input-use-for', 'Use_For (ນຳໃຊ້ສຳລັບ)');
    setNearestLabel('input-qty-slot', 'QTY Slot');
    setNearestLabel('input-qty', 'QTY (ຈຳນວນ)');
    setNearestLabel('input-group', 'Group (ກຸ່ມ)');
    setNearestLabel('input-category', 'Category (ໝວດໝູ່)');
    setNearestLabel('input-area', 'Area (ພື້ນທີ່ຈັດເກັບ)');
    setNearestLabel('input-responsible-person', 'Responsible person (ຜູ້ຮັບຜິດຊອບ)');
    setNearestLabel('input-price-unit', 'Pice Unit (ລາຄາຕໍ່ໜ່ວຍ)');
    setNearestLabel('input-name-of-price', 'name_of_price (ສະກຸນເງິນ)');
    setNearestLabel('input-date', 'Date (ວັນທີ / ເວລາ)');
    setNearestLabel('input-pr', 'PR (ເລກທີ PR)');
    setNearestLabel('input-remark', 'Remark (ໝາຍເຫດ)');
    setNearestLabel('input-image-url', 'ຮູບສິນຄ້າ (Image URL)');
    setNearestLabel('edit-image-url', 'ຮູບສິນຄ້າ (Image URL)');
    setNearestLabel('dispatch-qty', 'ຈຳນວນທີ່ສົ່ງເຄື່ອງ (QTY Dispatch) <span class="text-red-400">*</span>');
    setNearestLabel('dispatch-shipping-price', '<i class="fa-solid fa-money-bill-wave"></i> ລາຄາຂົນສົ່ງ (Shipping Cost)');
    setNearestLabel('dispatch-weight', '<i class="fa-solid fa-weight-hanging"></i> ນ້ຳໜັກ (Weight)');
    setNearestLabel('dispatch-boxes', '<i class="fa-solid fa-box"></i> ຈຳນວນກ່ອງ (Box)');
    setNearestLabel('dispatch-origin', 'ໂຮງງານຕົ້ນທາງ (Origin Factory) <span class="text-red-400">*</span>');
    setNearestLabel('dispatch-destination', 'ໂຮງງານປາຍທາງ (Destination Factory) <span class="text-red-400">*</span>');
    setNearestLabel('dispatch-remark', 'ໝາຍເຫດ / ໃບຂົນສົ່ງ');

    const dispatchSectionTitles = document.querySelectorAll('#tab-dispatch h3');
    if (dispatchSectionTitles[1]) dispatchSectionTitles[1].innerHTML = '<i class="fa-solid fa-user-up"></i> ຜູ້ສົ່ງ';
    if (dispatchSectionTitles[2]) dispatchSectionTitles[2].innerHTML = '<i class="fa-solid fa-user-check"></i> ຜູ້ຮັບ';
    if (dispatchSectionTitles[3]) dispatchSectionTitles[3].innerHTML = '<i class="fa-solid fa-truck"></i> ຜູ້ຂັບລົດຂົນສົ່ງ';
    const dispatchSubmit = document.getElementById('dispatch-submit-btn');
    if (dispatchSubmit) dispatchSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ຢືນຢັນການສົ່ງເຄື່ອງ & ຕັດສະຕັອກອັດໂນມັດ';

    const addSubmit = document.querySelector('#add-item-form button[type="submit"]');
    if (addSubmit) addSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> ບັນທຶກຂໍ້ມູນສິນຄ້າເຂົ້າສາງ (Save Permanent)';

    const editItemTitle = document.querySelector('#edit-item-modal h2');
    if (editItemTitle) editItemTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> ແກ້ໄຂຂໍ້ມູນສິນຄ້າ';
    const editItemButtons = document.querySelectorAll('#edit-item-modal form button');
    if (editItemButtons[0]) editItemButtons[0].textContent = 'ຍົກເລີກ';
    if (editItemButtons[1]) editItemButtons[1].textContent = 'ບັນທຶກການແກ້ໄຂ';

    const brandingTitle = document.querySelector('#branding-modal h2');
    if (brandingTitle) brandingTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> ແກ້ໄຂໂລໂກບໍລິສັດ & ຂໍ້ຄວາມຫົວຂໍ້ (Custom Branding)';
    setNearestLabel('branding-title-input', 'ຊື່ບໍລິສັດ / ຫົວຂໍ້ລະບົບ (Company Title)');
    setNearestLabel('branding-subtitle-input', 'ຄຳອະທິບາຍກ້ອງ / Subtitle');
    setNearestLabel('branding-logo-input', 'URL ຮູບໂລໂກ (Logo Image URL)');
    const brandingButtons = document.querySelectorAll('#branding-modal button');
    if (brandingButtons[1]) brandingButtons[1].textContent = 'ຍົກເລີກ';
    if (brandingButtons[2]) brandingButtons[2].textContent = 'ບັນທຶກການປ່ຽນແປງ';

    refreshCurrencySelectLabels();
    refreshCategorySelectLabels();
}

function scheduleLaoTextRepair() {
    if (laoRepairTimer) return;
    laoRepairTimer = setTimeout(() => {
        laoRepairTimer = null;
        if (laoRepairObserver) laoRepairObserver.disconnect();
        repairLaoStaticText();
        if (laoRepairObserver && document.body) {
            laoRepairObserver.observe(document.body, { childList: true, subtree: true });
        }
    }, 80);
}

function installLaoTextRepairObserver() {
    if (laoRepairObserver || !document.body) return;
    laoRepairObserver = new MutationObserver(mutations => {
        if (mutations.some(mutation => mutation.type === 'childList')) {
            scheduleLaoTextRepair();
        }
    });
    laoRepairObserver.observe(document.body, { childList: true, subtree: true });
}

function formatPerson(name, dept, phone) {
    const parts = [name, dept, phone].filter(Boolean);
    return parts.length ? parts.join(' / ') : '-';
}

function getItemImageUrl(item = {}) {
    const configuredUrl = item.imageUrl || item.photoUrl || item.image || item.photo || item.pictureUrl || item.picture || '';
    if (configuredUrl) return configuredUrl;

    const barcode = cleanCode(item.barcode ?? item.BarCode ?? item.Barcode ?? item.barCode);
    return barcode ? `assets/image/${barcode}.png` : '';
}

function renderDispatchItemImage(item = {}) {
    const imageUrl = getItemImageUrl(item);
    if (!imageUrl) {
        return `
            <div class="dispatch-item-image dispatch-item-image--empty" title="No image">
                <i class="fa-regular fa-image"></i>
            </div>
        `;
    }

    const safeUrl = escapeHtml(imageUrl);
    const safeName = escapeHtml(item.itemNameLaos || 'Dispatch item image');
    return `
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="dispatch-item-image-link" title="${safeName}">
            <img src="${safeUrl}" alt="${safeName}" class="dispatch-item-image" loading="lazy" onerror="this.closest('a').outerHTML='<div class=&quot;dispatch-item-image dispatch-item-image--empty&quot; title=&quot;No image&quot;><i class=&quot;fa-regular fa-image&quot;></i></div>'">
        </a>
    `;
}

function getStickerSizeConfig() {
    const size = document.getElementById('sticker-size-select')?.value || 'medium';
    const configs = {
        xp480b: { width: '75mm', height: '75mm', columns: 2, barcodeHeight: 36, fontSize: 10 }
    };
    return configs[size] || configs.xp480b;
}

function renderStickerBarcode(svg, barcode, height) {
    if (!svg || !barcode || typeof JsBarcode === 'undefined') return;
    try {
        JsBarcode(svg, barcode, {
            format: 'CODE128',
            width: 1.6,
            height,
            displayValue: true,
            font: 'monospace',
            fontSize: 13,
            margin: 2
        });
    } catch (error) {
        console.warn('Sticker barcode render failed', error);
    }
}

function populateStickerItemSelect() {
    const select = document.getElementById('sticker-item-select');
    if (!select) return;

    const currentValue = select.value || selectedStickerItem?.categoryCode || '';
    const groups = new Map();
    inventory.forEach(item => {
        const code = cleanCode(item.categoryCode || '');
        if (!code || groups.has(code)) return;
        groups.set(code, item.group || item.category || 'ບໍ່ມີຊື່ກຸ່ມ');
    });

    select.innerHTML = '<option value="">-- ເລືອກກຸ່ມສິນຄ້າ --</option>';
    groups.forEach((groupName, categoryCode) => {
        const option = document.createElement('option');
        option.value = categoryCode;
        option.textContent = categoryCode;
        select.appendChild(option);
    });

    if (currentValue && groups.has(cleanCode(currentValue))) {
        select.value = currentValue;
    }
    populateStickerProductSelect(select.value);
}

function populateStickerProductSelect(categoryCode = '') {
    const select = document.getElementById('sticker-product-select');
    if (!select) return;

    const cleanCategoryCode = cleanCode(categoryCode || '');
    const currentValue = select.value || selectedStickerItem?.barcode || '';
    const items = inventory.filter(item => !cleanCategoryCode || cleanCode(item.categoryCode || '') === cleanCategoryCode);
    select.innerHTML = '<option value="">-- ເລືອກລາຍຊື່ສິນຄ້າ --</option>';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.barcode || '';
        option.textContent = item.itemNameLaos || item.itemNameChinese || item.barcode || '-';
        select.appendChild(option);
    });

    if (currentValue && items.some(item => String(item.barcode) === String(currentValue))) {
        select.value = currentValue;
    }
}

function clearStickerLinkedDetails(keepBarcode = true) {
    selectedStickerItem = null;
    const values = {
        'sticker-pr-input': '',
        'sticker-item-name-input': '',
        'sticker-model-size-input': '',
        'sticker-qty-input': '0',
        'sticker-unit-input': 'PCS'
    };
    Object.entries(values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    });
    if (!keepBarcode) {
        const barcodeInput = document.getElementById('sticker-barcode-input');
        if (barcodeInput) barcodeInput.value = '';
    }
    const groupSelect = document.getElementById('sticker-item-select');
    if (groupSelect) groupSelect.value = '';
    populateStickerProductSelect('');
    const productSelect = document.getElementById('sticker-product-select');
    if (productSelect) productSelect.value = '';
}

function fillStickerFromInventoryItem(item) {
    if (!item) return;
    selectedStickerItem = item;
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    };
    setValue('sticker-pr-input', item.pr || 'P-12345678');
    setValue('sticker-item-name-input', item.itemNameLaos || '');
    setValue('sticker-model-size-input', `${item.model || '-'} / ${item.size || '-'}`);
    setValue('sticker-qty-input', getItemTotalQty(item));
    setValue('sticker-unit-input', item.unitLaos || 'PCS');
    setValue('sticker-barcode-input', item.barcode || '');

    const select = document.getElementById('sticker-item-select');
    if (select) select.value = cleanCode(item.categoryCode || '');
    populateStickerProductSelect(item.categoryCode || '');
    const productSelect = document.getElementById('sticker-product-select');
    if (productSelect) productSelect.value = item.barcode || '';
}

window.selectStickerGroup = function(categoryCode) {
    const cleanCategoryCode = cleanCode(categoryCode || '');
    populateStickerProductSelect(cleanCategoryCode);
    const barcode = cleanCode(document.getElementById('sticker-barcode-input')?.value || '');
    const matchedItem = inventory.find(item => cleanCode(item.barcode || '') === barcode);
    if (matchedItem && cleanCode(matchedItem.categoryCode || '') === cleanCategoryCode) {
        fillStickerFromInventoryItem(matchedItem);
    } else {
        const productSelect = document.getElementById('sticker-product-select');
        if (productSelect) productSelect.value = '';
    }
    renderStickerPreview();
};

window.selectStickerProduct = function(barcode) {
    const matchedItem = inventory.find(item => cleanCode(item.barcode || '') === cleanCode(barcode || ''));
    if (matchedItem) {
        fillStickerFromInventoryItem(matchedItem);
    }
    renderStickerPreview();
};

window.handleStickerBarcodeInput = function(barcode) {
    const cleanBarcode = cleanCode(barcode || '');
    const matchedItem = inventory.find(item => cleanCode(item.barcode || '') === cleanBarcode);
    if (matchedItem) {
        fillStickerFromInventoryItem(matchedItem);
    } else {
        clearStickerLinkedDetails(true);
    }
    renderStickerPreview();
};

window.selectStickerItem = function(barcode) {
    selectedStickerItem = inventory.find(item => String(item.barcode) === String(barcode)) || null;
    if (selectedStickerItem) {
        fillStickerFromInventoryItem(selectedStickerItem);
    }
    renderStickerPreview();
};

function getStickerCopies() {
    const input = document.getElementById('sticker-copy-count');
    const value = Number(input?.value || 1);
    return Math.max(1, Math.min(200, Number.isFinite(value) ? Math.floor(value) : 1));
}

function buildStickerData(item = {}, options = {}) {
    const readValue = (id, fallback = '') => document.getElementById(id)?.value || fallback;
    const no = options.no ?? readValue('sticker-no-input', '1');
    const brand = options.brand ?? readValue('sticker-brand-input', 'MMN');
    const lotDateRaw = options.lotDate ?? readValue('sticker-lot-date', new Date().toISOString().split('T')[0]);
    const lotDate = lotDateRaw ? new Date(`${lotDateRaw}T00:00:00`).toLocaleDateString('en-GB') : '';
    return {
        no: String(no || '1').padStart(2, '0'),
        brand,
        lotDate,
        pr: options.pr ?? readValue('sticker-pr-input', item.pr || 'P-12345678'),
        itemName: options.itemName ?? readValue('sticker-item-name-input', item.itemNameLaos || ''),
        modelSize: options.modelSize ?? readValue('sticker-model-size-input', `${item.model || '-'} / ${item.size || '-'}`),
        qty: options.qty ?? readValue('sticker-qty-input', getItemTotalQty(item) || '0'),
        unit: options.unit ?? readValue('sticker-unit-input', item.unitLaos || 'PCS'),
        barcode: cleanCode(options.barcode ?? readValue('sticker-barcode-input', item.barcode || '')),
        footerLine1: options.footerLine1 ?? readValue('sticker-footer-line1', ''),
        footerLine2: options.footerLine2 ?? readValue('sticker-footer-line2', '')
    };
}

function stickerCardHtml(item = {}, options = {}) {
    const data = options.data || buildStickerData(item, options);
    const showBorder = options.showBorder ?? document.getElementById('sticker-show-border')?.checked ?? true;
    const watermarkOpacity = Number(document.getElementById('sticker-watermark-opacity')?.value || 10) / 100;
    const watermarkUrl = stickerWatermarkDataUrl
        ? new URL(stickerWatermarkDataUrl, window.location.href).href
        : '';
    const watermarkStyle = watermarkUrl
        ? `style="background-image:url('${escapeHtml(watermarkUrl)}');opacity:${watermarkOpacity}"`
        : `style="opacity:${watermarkOpacity}"`;
    const watermarkContent = watermarkUrl ? '' : 'LOGO';
    return `
        <div class="sticker-card ${showBorder ? '' : 'sticker-card--no-border'}">
            <div class="sticker-watermark" ${watermarkStyle}>${watermarkContent}</div>
            <div class="sticker-label-head">
                <span>XP-480B 75x75</span>
                <strong>No: ${escapeHtml(data.no)}</strong>
            </div>
            <div class="sticker-brand">${escapeHtml(data.brand)}</div>
            <div class="sticker-rule"></div>
            <div class="sticker-row"><span>ວັນທີ / LotDate:</span><strong>${escapeHtml(data.lotDate)}</strong></div>
            <div class="sticker-row"><span>ລະຫັດ PR:</span><strong>${escapeHtml(data.pr)}</strong></div>
            <div class="sticker-row"><span>ຊື່ສິນຄ້າ:</span><strong>${escapeHtml(data.itemName)}</strong></div>
            <div class="sticker-row"><span>ຮຸ່ນ / ຂະໜາດ:</span><strong>${escapeHtml(data.modelSize)}</strong></div>
            <div class="sticker-row"><span>ຈຳນວນ / Quantity:</span><strong>${Number(data.qty || 0).toLocaleString()} ${escapeHtml(data.unit)}</strong></div>
            <svg class="sticker-card__barcode" data-sticker-barcode="${escapeHtml(data.barcode)}"></svg>
            <div class="sticker-footer-box">
                <strong>${escapeHtml(data.footerLine1)}</strong>
                <span>${escapeHtml(data.footerLine2)}</span>
            </div>
        </div>
    `;
}

window.renderStickerPreview = function() {
    const grid = document.getElementById('sticker-preview-grid');
    const count = document.getElementById('sticker-preview-count');
    if (!grid) return;

    const copies = getStickerCopies();
    const sizeConfig = getStickerSizeConfig();
    const item = selectedStickerItem || {};
    const renderItems = stickerBatchItems.length
        ? stickerBatchItems.flatMap(entry => Array.from({ length: entry.copies }, () => stickerCardHtml({}, { data: entry.data })))
        : Array.from({ length: copies }, () => stickerCardHtml(item));
    grid.style.setProperty('--sticker-width', sizeConfig.width);
    grid.style.setProperty('--sticker-height', sizeConfig.height);
    grid.innerHTML = renderItems.join('');
    grid.querySelectorAll('[data-sticker-barcode]').forEach(svg => {
        renderStickerBarcode(svg, svg.getAttribute('data-sticker-barcode'), sizeConfig.barcodeHeight);
    });

    if (count) {
        const total = stickerBatchItems.length ? stickerBatchItems.reduce((sum, item) => sum + item.copies, 0) : copies;
        count.textContent = `${total.toLocaleString()} ໃບ`;
    }
};

window.printSelectedStickers = function() {
    const barcode = cleanCode(document.getElementById('sticker-barcode-input')?.value || selectedStickerItem?.barcode || '');
    if (!stickerBatchItems.length && !barcode) {
        showToast('ກະລຸນາປ້ອນ Barcode ກ່ອນ Print', 'warning');
        return;
    }

    const copies = getStickerCopies();
    const sizeConfig = getStickerSizeConfig();
    const showBorder = document.getElementById('sticker-show-border')?.checked ?? true;
    const cards = stickerBatchItems.length
        ? stickerBatchItems.flatMap(entry => Array.from({ length: entry.copies }, () => stickerCardHtml({}, { data: entry.data, showBorder }))).join('')
        : Array.from({ length: copies }, () => stickerCardHtml(selectedStickerItem || {}, { showBorder })).join('');
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        showToast('ກະລຸນາອະນຸຍາດ popup ເພື່ອ Print', 'error');
        return;
    }

    printWindow.document.write(`
        <!doctype html>
        <html lang="lo">
        <head>
            <meta charset="utf-8">
            <title>Barcode Stickers</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
            <style>
                @page { size: A4; margin: 8mm; }
                * { box-sizing: border-box; }
                body {
                    margin: 0;
                    background: #ffffff;
                    color: #0f172a;
                    font-family: 'Noto Sans Lao', Arial, sans-serif;
                }
                .sticker-print-grid {
                    display: grid;
                    grid-template-columns: repeat(${sizeConfig.columns}, ${sizeConfig.width});
                    gap: 4mm;
                    align-items: start;
                }
                .sticker-card {
                    width: ${sizeConfig.width};
                    height: ${sizeConfig.height};
                    position: relative;
                    border: 1px solid #111827;
                    border-radius: 0;
                    padding: 2.4mm;
                    overflow: hidden;
                    break-inside: avoid;
                }
                .sticker-card--no-border { border-color: transparent; }
                .sticker-watermark {
                    position: absolute;
                    inset: 23mm 8mm 24mm;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-repeat: no-repeat;
                    background-position: center;
                    background-size: contain;
                    color: #94a3b8;
                    font-size: 30px;
                    font-weight: 900;
                    pointer-events: none;
                    z-index: 0;
                }
                .sticker-label-head,
                .sticker-brand,
                .sticker-rule,
                .sticker-row,
                .sticker-card__barcode,
                .sticker-footer-box {
                    position: relative;
                    z-index: 1;
                }
                .sticker-label-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 10px;
                    font-weight: 800;
                }
                .sticker-label-head span { color: #8aa0b8; font-size: 8px; }
                .sticker-label-head strong { font-size: 12px; }
                .sticker-brand {
                    text-align: center;
                    font-family: Georgia, 'Times New Roman', serif;
                    font-size: 33px;
                    line-height: 1;
                    font-weight: 900;
                    margin-top: 1mm;
                }
                .sticker-rule { border-top: 2px solid #111827; margin: 1.4mm 0 0.8mm; }
                .sticker-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 2mm;
                    border-bottom: 1px dashed #94a3b8;
                    font-size: 9px;
                    line-height: 1.75;
                    font-weight: 800;
                }
                .sticker-row strong { text-align: right; }
                .sticker-card__barcode {
                    width: 48mm;
                    height: 13mm;
                    display: block;
                    margin: 0.6mm auto 0;
                }
                .sticker-footer-box {
                    border: 1px solid #111827;
                    border-radius: 1mm;
                    text-align: center;
                    padding: 1mm 1.2mm;
                    margin-top: 1mm;
                    font-size: 7px;
                    line-height: 1.25;
                }
                .sticker-footer-box strong,
                .sticker-footer-box span { display: block; }
                .sticker-footer-box span { font-size: 6px; }
                svg text { font-family: monospace !important; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="sticker-print-grid">${cards}</div>
            <script>
                window.onload = function() {
                    document.querySelectorAll('[data-sticker-barcode]').forEach(function(svg) {
                        JsBarcode(svg, svg.getAttribute('data-sticker-barcode'), {
                            format: 'CODE128',
                            width: 1.6,
                            height: ${sizeConfig.barcodeHeight},
                            displayValue: true,
                            font: 'monospace',
                            fontSize: 13,
                            margin: 2
                        });
                    });
                    var doPrint = function() { window.print(); window.close(); };
                    if (document.fonts && document.fonts.ready) {
                        document.fonts.ready.then(function() { setTimeout(doPrint, 250); });
                    } else {
                        setTimeout(doPrint, 600);
                    }
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

function readStickerImportValue(row, keys, fallback = '') {
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
    }
    return fallback;
}

function normalizeStickerImportRow(row, index) {
    const barcode = cleanCode(readStickerImportValue(row, ['Barcode', 'BarCode', 'barcode', 'ລະຫັດແທ່ງ Barcode']));
    const inventoryItem = inventory.find(item => String(item.barcode) === String(barcode)) || {};
    const lotDateRaw = readStickerImportValue(row, ['LotDate', 'Lot Date', 'Date', 'ວັນທີ'], document.getElementById('sticker-lot-date')?.value || new Date().toISOString().split('T')[0]);
    const model = readStickerImportValue(row, ['Modle', 'Model', 'ຮຸ່ນ'], inventoryItem.model || '');
    const size = readStickerImportValue(row, ['Size', 'ຂະໜາດ'], inventoryItem.size || '');
    const modelSize = readStickerImportValue(row, ['Model/Size', 'Model Size', 'ຮຸ່ນ / ຂະໜາດ'], `${model || '-'} / ${size || '-'}`);
    const copies = Number(readStickerImportValue(row, ['Copies', 'Copy', 'ຈຳນວນປ້າຍ', 'ຈຳນວນໃບ'], '1')) || 1;

    return {
        copies: Math.max(1, Math.min(200, Math.floor(copies))),
        data: buildStickerData(inventoryItem, {
            no: readStickerImportValue(row, ['No', 'NO', 'ລຳດັບ'], String(index + 1)),
            brand: readStickerImportValue(row, ['Brand', 'MMN', 'ຊື່ຜູ້ຈັດກຽມ'], document.getElementById('sticker-brand-input')?.value || 'MMN'),
            lotDate: lotDateRaw,
            pr: readStickerImportValue(row, ['PR', 'P/R', 'ລະຫັດ PR'], inventoryItem.pr || 'P-12345678'),
            itemName: readStickerImportValue(row, ['Item name Laos', 'Item Name', 'Name', 'ຊື່ສິນຄ້າ'], inventoryItem.itemNameLaos || ''),
            modelSize,
            qty: readStickerImportValue(row, ['Quantity', 'QTY', 'Qty', 'ຈຳນວນ'], getItemTotalQty(inventoryItem) || '0'),
            unit: readStickerImportValue(row, ['Unit', 'Unit Laos', 'ຫົວໜ່ວຍ'], inventoryItem.unitLaos || 'PCS'),
            barcode,
            footerLine1: readStickerImportValue(row, ['Footer 1', 'Company', 'ຂໍ້ມູນອົງກອນ 1'], document.getElementById('sticker-footer-line1')?.value || ''),
            footerLine2: readStickerImportValue(row, ['Footer 2', 'Address', 'ຂໍ້ມູນອົງກອນ 2'], document.getElementById('sticker-footer-line2')?.value || '')
        })
    };
}

function renderStickerBatchList() {
    const panel = document.getElementById('sticker-batch-panel');
    const list = document.getElementById('sticker-batch-list');
    if (!panel || !list) return;

    panel.classList.toggle('hidden', stickerBatchItems.length === 0);
    list.innerHTML = stickerBatchItems.map((entry, index) => `
        <div class="sticker-batch-item">
            <div>
                <strong>${escapeHtml(entry.data.brand)} · No: ${escapeHtml(entry.data.no)}</strong>
                <span>${escapeHtml(entry.data.itemName || '-')} | ${escapeHtml(entry.data.barcode || '-')}</span>
            </div>
            <div class="sticker-batch-actions">
                <span>${entry.copies} ໃບ</span>
                <button type="button" onclick="removeStickerBatchItem(${index})"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>
    `).join('');
}

function importStickerBatchFile(file, inputToClear) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            stickerBatchItems = rows
                .map((row, index) => normalizeStickerImportRow(row, index))
                .filter(entry => entry.data.barcode);

            renderStickerBatchList();
            renderStickerPreview();
            if (stickerBatchItems.length) {
                showToast(`ນຳເຂົ້າລາຍການສະຕິກເກີ ${stickerBatchItems.length} ລາຍການ`, 'success');
            } else {
                showToast('ບໍ່ພົບ Barcode ໃນໄຟລ໌ Import', 'warning');
            }
        } catch (error) {
            console.error(error);
            showToast('ນຳເຂົ້າ Excel/CSV ສະຕິກເກີບໍ່ສຳເລັດ', 'error');
        } finally {
            if (inputToClear) inputToClear.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

window.handleStickerBatchImport = function(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    importStickerBatchFile(file, event.target);
};

window.handleStickerDropzoneDrag = function(event) {
    event.preventDefault();
    event.currentTarget.classList.add('is-dragging');
};

window.handleStickerDropzoneLeave = function(event) {
    event.currentTarget.classList.remove('is-dragging');
};

window.handleStickerBatchDrop = function(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('is-dragging');
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    importStickerBatchFile(file);
};

window.removeStickerBatchItem = function(index) {
    stickerBatchItems.splice(index, 1);
    renderStickerBatchList();
    renderStickerPreview();
};

window.clearStickerBatchItems = function() {
    stickerBatchItems = [];
    renderStickerBatchList();
    renderStickerPreview();
};

window.downloadStickerImportTemplate = function() {
    const rows = [
        {
            No: 1,
            Brand: 'MMN',
            LotDate: new Date().toISOString().split('T')[0],
            PR: 'P-12345678',
            'Item name Laos': 'ອາໄຫຼ່ຕິດຕັ້ງໄຟ',
            Modle: 'Model X',
            Size: 'L',
            Quantity: 100,
            Unit: 'PCS',
            Barcode: '012345678905',
            Copies: 1,
            'Footer 1': document.getElementById('sticker-footer-line1')?.value || '',
            'Footer 2': document.getElementById('sticker-footer-line2')?.value || ''
        }
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sticker_Import');
    XLSX.writeFile(wb, 'Sticker_Import_Template.xlsx');
};

window.loadSampleStickerBatchData = function() {
    const today = new Date().toISOString().split('T')[0];
    stickerBatchItems = [
        normalizeStickerImportRow({
            No: 1,
            Brand: 'MMN',
            LotDate: today,
            PR: 'P-12345678',
            'Item name Laos': 'ອາໄຫຼ່ຕິດຕັ້ງໄຟ',
            Modle: 'Model X',
            Size: 'L',
            Quantity: 100,
            Unit: 'PCS',
            Barcode: '012345678905',
            Copies: 2
        }, 0),
        normalizeStickerImportRow({
            No: 2,
            Brand: 'MMN',
            LotDate: today,
            PR: 'P-99990001',
            'Item name Laos': 'ສາຍໄຟ THW 2.5',
            Modle: 'THW 2.5',
            Size: '100m/Roll',
            Quantity: 50,
            Unit: 'PCS',
            Barcode: '50000001',
            Copies: 1
        }, 1)
    ].filter(entry => entry.data.barcode);
    renderStickerBatchList();
    renderStickerPreview();
    showToast('ໂຫຼດຂໍ້ມູນຕົວຢ່າງສະຕິກເກີແລ້ວ', 'success');
};

window.handleStickerWatermarkUpload = function(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        stickerWatermarkDataUrl = String(reader.result || '');
        renderStickerPreview();
    };
    reader.readAsDataURL(file);
};

window.clearStickerWatermark = function() {
    stickerWatermarkDataUrl = DEFAULT_STICKER_WATERMARK_URL;
    const input = document.getElementById('sticker-watermark-file');
    if (input) input.value = '';
    renderStickerPreview();
};

window.saveCurrentStickerItem = function() {
    renderStickerPreview();
    showToast('ບັນທຶກຟອມສະຕິກເກີແລ້ວ', 'success');
};

window.resetStickerForm = function() {
    const defaults = {
        'sticker-brand-input': 'MMN',
        'sticker-no-input': '1',
        'sticker-pr-input': '',
        'sticker-item-name-input': '',
        'sticker-model-size-input': '',
        'sticker-qty-input': '0',
        'sticker-unit-input': 'PCS',
        'sticker-barcode-input': '',
        'sticker-footer-line1': 'ບໍລິສັດ ມີມີເອັນການຄ້າ ຂາອອກ-ຂາເຂົ້າ ຈຳກັດ',
        'sticker-footer-line2': 'ສຳນັກງານໃຫຍ່: ບ້ານ ປະຊາຊົນ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ'
    };
    Object.entries(defaults).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    });
    const select = document.getElementById('sticker-item-select');
    if (select) select.value = '';
    populateStickerProductSelect('');
    const productSelect = document.getElementById('sticker-product-select');
    if (productSelect) productSelect.value = '';
    selectedStickerItem = null;
    stickerBatchItems = [];
    renderStickerBatchList();
    clearStickerWatermark();
    initTodayDates();
    renderStickerPreview();
};

function getFilteredDispatchLogs() {
    const searchInput = document.getElementById('dispatch-history-search');
    const categoryInput = document.getElementById('dispatch-category-filter');
    dispatchSearchValue = (searchInput?.value || '').toLowerCase().trim();
    dispatchCategoryFilter = categoryInput?.value || 'ALL';

    return dispatchLogs.filter(log => {
        const item = getLogItemDetails(log);
        const categoryCode = normalizeCategoryCode(item);
        const matchesCategory = dispatchCategoryFilter === 'ALL' || categoryCode === dispatchCategoryFilter;
        const searchText = [
            log.id,
            log.timestamp,
            log.barcode,
            log.origin,
            log.destination,
            log.senderName,
            log.receiverName,
            log.driverName,
            log.vehiclePlate,
            log.remark,
            item.itemNameLaos,
            item.itemNameChinese,
            item.model,
            item.size,
            item.area,
            item.pr,
            item.group,
            item.category
        ].map(value => String(value || '').toLowerCase()).join(' ');

        return matchesCategory && (!dispatchSearchValue || searchText.includes(dispatchSearchValue));
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
                <span class="dispatch-stock-badge bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full">
                    QTY ໃນສາງ: <strong class="font-mono text-emerald-400">${getItemTotalQty(item)}</strong> ${escapeHtml(item.unitLaos)}
                </span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
                <div><strong class="text-slate-400">ຊື່ລາວ:</strong> <span class="text-white font-bold">${escapeHtml(item.itemNameLaos)}</span></div>
                <div><strong class="text-slate-400">ຊື່ຈີນ:</strong> ${escapeHtml(item.itemNameChinese || '-')}</div>
                <div><strong class="text-slate-400">ຮຸ່ນ (Model):</strong> ${escapeHtml(item.model || '-')}</div>
                <div><strong class="text-slate-400">ຂະໜາດ (Size):</strong> ${escapeHtml(item.size || '-')}</div>
                <div><strong class="text-slate-400">ບັນຈຸ (Pack size):</strong> ${escapeHtml(item.packSize || '-')}</div>
                <div><strong class="text-slate-400">ນຳໃຊ້ສຳລັບ:</strong> ${escapeHtml(item.useFor || '-')}</div>
                <div><strong class="text-slate-400">ກຸ່ມ (Group):</strong> ${escapeHtml(getDisplayGroupName(item))}</div>
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
                const boxes = parseInt(row.boxes || row.Box || row.BOX || row['ຈຳນວນກ່ອງ'] || 0, 10) || 0;
                const origin = String(row.origin || row['ໂຮງງານຕົ້ນທາງ'] || 'ໂຮງງານສູນກາງ ນະຄອນຫຼວງວຽງຈັນ');
                const destination = String(row.destination || row['ໂຮງງານປາຍທາງ'] || 'ໂຮງງານສາຂາ');
                const driverName = String(row.driverName || row.driver || row['ຊື່ຜູ້ຂັບ'] || row['ຄົນຂັບ'] || '-');

                const item = inventory.find(i => String(i.barcode) === barcode);
                if (item && getItemTotalQty(item) >= qtyDispatch) {
                    // Deduct stock
                    reduceInventorySplitQty(item, qtyDispatch);

                    // Add log with ALL inventory details + Shipping Cost + Weight
                    dispatchLogs.unshift({
                        id: `DN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        timestamp: new Date().toLocaleString('lo-LA'),
                        barcode: item.barcode,
                        itemDetails: { ...item }, // Copy ALL inventory properties
                        qtyDispatched: qtyDispatch,
                        shippingPrice: shippingPrice,
                        weight: weight,
                        imageUrl: getItemImageUrl(item),
                        boxes: boxes,
                        origin: origin,
                        destination: destination,
                        senderName: String(row.senderName || row['ຊື່ຜູ້ສົ່ງ'] || ''),
                        senderDept: String(row.senderDept || row['ພະແນກຜູ້ສົ່ງ'] || ''),
                        senderPhone: String(row.senderPhone || row['ເບີໂທຜູ້ສົ່ງ'] || ''),
                        receiverName: String(row.receiverName || row['ຊື່ຜູ້ຮັບ'] || ''),
                        receiverDept: String(row.receiverDept || row['ພະແນກຜູ້ຮັບ'] || ''),
                        receiverPhone: String(row.receiverPhone || row['ເບີໂທຜູ້ຮັບ'] || ''),
                        driverName: driverName,
                        driverDept: String(row.driverDept || row['ພະແນກຜູ້ຂັບ'] || ''),
                        driverPhone: String(row.driverPhone || row['ເບີໂທຜູ້ຂັບ'] || ''),
                        vehiclePlate: String(row.vehiclePlate || row['ປ້າຍລົດ'] || ''),
                        driver: driverName,
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
            populateStickerItemSelect();

            showToast(`Import Dispatch Excel ສຳເລັດ ${dispatchedCount} ລາຍການ!`, "success");
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
    const boxes = parseInt(document.getElementById('dispatch-boxes').value, 10) || 0;
    const origin = document.getElementById('dispatch-origin').value.trim();
    const destination = document.getElementById('dispatch-destination').value.trim();
    const senderName = document.getElementById('dispatch-sender-name').value.trim();
    const senderDept = document.getElementById('dispatch-sender-dept').value.trim();
    const senderPhone = document.getElementById('dispatch-sender-phone').value.trim();
    const receiverName = document.getElementById('dispatch-receiver-name').value.trim();
    const receiverDept = document.getElementById('dispatch-receiver-dept').value.trim();
    const receiverPhone = document.getElementById('dispatch-receiver-phone').value.trim();
    const driverName = document.getElementById('dispatch-driver-name').value.trim() || "-";
    const driverDept = document.getElementById('dispatch-driver-dept').value.trim();
    const driverPhone = document.getElementById('dispatch-driver-phone').value.trim();
    const vehiclePlate = document.getElementById('dispatch-vehicle-plate').value.trim();
    const remark = document.getElementById('dispatch-remark').value.trim() || "-";

    if (qtyDispatch <= 0) {
        showToast("ຈຳນວນທີ່ສົ່ງເຄື່ອງຕ້ອງຫຼາຍກວ່າ 0", "error");
        return;
    }

    if (getItemTotalQty(selectedDispatchItem) < qtyDispatch) {
        showToast(`ຈຳນວນສິນຄ້າໃນສາງບໍ່ພໍ! (ມີໃນສາງ: ${getItemTotalQty(selectedDispatchItem)}, ຕ້ອງການສົ່ງ: ${qtyDispatch})`, "error");
        return;
    }

    // Deduct stock automatically
    reduceInventorySplitQty(selectedDispatchItem, qtyDispatch);

    // Create Dispatch Record with ALL item details + Shipping Cost + Weight
    const newLog = {
        id: `DN-${Date.now()}`,
        timestamp: new Date().toLocaleString('lo-LA'),
        barcode: selectedDispatchItem.barcode,
        itemDetails: { ...selectedDispatchItem }, // Includes ALL inventory fields
        qtyDispatched: qtyDispatch,
        shippingPrice: shippingPrice,
        weight: weight,
        imageUrl: getItemImageUrl(selectedDispatchItem),
        boxes: boxes,
        origin: origin,
        destination: destination,
        senderName,
        senderDept,
        senderPhone,
        receiverName,
        receiverDept,
        receiverPhone,
        driverName,
        driverDept,
        driverPhone,
        vehiclePlate,
        driver: driverName,
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
    document.getElementById('dispatch-boxes').value = "0";
    document.getElementById('dispatch-qty').value = "1";
    lookupItemByBarcode();

};

function renderDispatchLogsTable() {
    const tbody = document.getElementById('dispatch-logs-tbody');
    if (!tbody) return;
    const filteredLogs = getFilteredDispatchLogs();
    updateDispatchSummary(filteredLogs);

    const pageSize = getDispatchPageSize(filteredLogs.length);
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
    if (dispatchCurrentPage > totalPages) dispatchCurrentPage = totalPages;
    if (dispatchCurrentPage < 1) dispatchCurrentPage = 1;

    const startIndex = filteredLogs.length === 0 ? 0 : (dispatchCurrentPage - 1) * pageSize;
    const endIndex = dispatchPageSize === 'ALL' ? filteredLogs.length : Math.min(startIndex + pageSize, filteredLogs.length);
    const pagedLogs = filteredLogs.slice(startIndex, endIndex);
    updateDispatchPagination(filteredLogs.length, startIndex, endIndex, totalPages);

    if (filteredLogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="17" class="text-center py-12 text-slate-500 font-sans">
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
        const imageDetails = { ...details, imageUrl: log.imageUrl || getItemImageUrl(details) };
        html += `
            <tr class="transition hover:bg-slate-800/60">
                <td class="p-3" data-label="ຈັດການ">
                    <div class="dispatch-row-actions">
                        <button type="button" onclick="openEditDispatchLogModal('${escapeJs(log.id)}')" class="dispatch-action-btn dispatch-action-btn--edit" title="ແກ້ໄຂ">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" onclick="deleteDispatchLog('${escapeJs(log.id)}')" class="dispatch-action-btn dispatch-action-btn--delete" title="ລົບ">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
                <td class="p-3" data-label="ເລກທີ / ວັນທີ">
                    <div class="font-bold text-slate-200">${log.id}</div>
                    <div class="text-[10px] text-slate-400">${log.timestamp}</div>
                </td>
                <td class="p-3 font-mono font-bold text-emerald-400" data-label="BarCode">${escapeHtml(log.barcode)}</td>
                <td class="p-3 font-mono text-slate-300" data-label="PR">${escapeHtml(log.remark || '-')}</td>
                <td class="p-3 font-bold text-slate-100 font-sans" data-label="Item name Laos">${escapeHtml(details.itemNameLaos || '-')}</td>
                <td class="p-3 text-slate-300" data-label="Modle">${escapeHtml(details.model || '-')}</td>
                <td class="p-3 text-slate-300" data-label="Size">${escapeHtml(details.size || '-')}</td>
                <td class="p-3 text-right font-bold text-amber-400 font-mono" data-label="QTY ສົ່ງ">${log.qtyDispatched} ${escapeHtml(details.unitLaos || '')}</td>
                <td class="p-3 text-right font-bold text-cyan-400 font-mono" data-label="Box">${Number(log.boxes || 0).toLocaleString()}</td>
                <td class="p-3 text-right font-bold text-emerald-400 font-mono" data-label="ລາຄາຂົນສົ່ງ">${Number(log.shippingPrice || 0).toLocaleString()}</td>
                <td class="p-3 text-teal-300 font-mono" data-label="ນ້ຳໜັກ">${escapeHtml(log.weight || '-')}</td>
                <td class="p-3" data-label="ຮູບ">${renderDispatchItemImage(imageDetails)}</td>
                <td class="p-3 font-sans text-slate-300" data-label="ໂຮງງານຕົ້ນທາງ">${escapeHtml(log.origin)}</td>
                <td class="p-3 font-sans text-slate-300" data-label="ໂຮງງານປາຍທາງ">${escapeHtml(log.destination)}</td>
                <td class="p-3 font-sans text-slate-400" data-label="ຜູ້ສົ່ງ">${escapeHtml(formatPerson(log.senderName, log.senderDept, log.senderPhone))}</td>
                <td class="p-3 font-sans text-slate-400" data-label="ຜູ້ຮັບ">${escapeHtml(formatPerson(log.receiverName, log.receiverDept, log.receiverPhone))}</td>
                <td class="p-3 font-sans text-slate-400" data-label="ຜູ້ຂັບ / ປ້າຍລົດ">${escapeHtml(formatPerson(log.driverName || log.driver, log.driverDept, log.driverPhone))}<div class="text-[10px] text-slate-500">${escapeHtml(log.vehiclePlate || '')}</div></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateTopStats();
}

function updateDispatchSummary(logs = dispatchLogs) {
    const totalCount = logs.length;
    const totalShipping = logs.reduce((sum, log) => sum + Number(log.shippingPrice || 0), 0);
    const totalQty = logs.reduce((sum, log) => sum + Number(log.qtyDispatched || 0), 0);
    const totalBoxes = logs.reduce((sum, log) => sum + Number(log.boxes || 0), 0);

    const countEl = document.getElementById('dispatch-summary-count');
    const shippingEl = document.getElementById('dispatch-summary-shipping');
    const qtyEl = document.getElementById('dispatch-summary-qty');
    const boxesEl = document.getElementById('dispatch-summary-boxes');

    if (countEl) countEl.innerText = totalCount.toLocaleString();
    if (shippingEl) shippingEl.innerText = totalShipping.toLocaleString();
    if (qtyEl) qtyEl.innerText = totalQty.toLocaleString();
    if (boxesEl) boxesEl.innerText = totalBoxes.toLocaleString();

    renderDestinationDispatchSummary(logs);
}

function renderDestinationDispatchSummary(logs = dispatchLogs) {
    const container = document.getElementById('dispatch-destination-summary');
    if (!container) return;

    if (!logs.length) {
        container.innerHTML = '<div class="text-xs text-slate-500">ບໍ່ມີຂໍ້ມູນຂົນສົ່ງ</div>';
        return;
    }

    const summary = new Map();
    logs.forEach(log => {
        const destination = log.destination || '-';
        const current = summary.get(destination) || {
            destination,
            count: 0,
            shipping: 0,
            qty: 0,
            boxes: 0,
            items: new Set(),
            groups: new Set()
        };
        const details = getLogItemDetails(log);
        current.count += 1;
        current.shipping += Number(log.shippingPrice || 0);
        current.qty += Number(log.qtyDispatched || 0);
        current.boxes += Number(log.boxes || 0);
        current.items.add(details.itemNameLaos || log.barcode || '-');
        current.groups.add(getLogCategoryName(log));
        summary.set(destination, current);
    });

    container.innerHTML = Array.from(summary.values()).map(item => `
        <div class="dispatch-destination-card bg-slate-900/80 border border-slate-700 rounded-xl p-3 space-y-2">
            <div class="dispatch-destination-card__head flex items-center justify-between gap-3">
                <div class="dispatch-destination-card__title font-bold text-slate-100">${escapeHtml(item.destination)}</div>
                <div class="dispatch-destination-card__money text-emerald-400 font-mono font-bold">${item.shipping.toLocaleString()}</div>
            </div>
            <div class="dispatch-destination-card__meta grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                <div>ລາຍການ: <span class="text-slate-100 font-mono">${item.count.toLocaleString()}</span></div>
                <div>QTY: <span class="text-amber-300 font-mono">${item.qty.toLocaleString()}</span></div>
                <div>Box: <span class="text-cyan-300 font-mono">${item.boxes.toLocaleString()}</span></div>
            </div>
            <div class="dispatch-destination-card__line text-[11px] text-slate-400"><strong class="text-slate-300">ກຸ່ມສິນຄ້າ:</strong> ${escapeHtml(Array.from(item.groups).join(', '))}</div>
        </div>
    `).join('');
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

window.openEditDispatchLogModal = function(id) {
    const log = dispatchLogs.find(item => String(item.id) === String(id));
    if (!log) {
        showToast("ບໍ່ພົບລາຍການຂົນສົ່ງນີ້", "error");
        return;
    }

    document.getElementById('edit-dispatch-log-id').value = log.id || '';
    document.getElementById('edit-dispatch-remark').value = log.remark || '';
    document.getElementById('edit-dispatch-qty').value = Number(log.qtyDispatched || 0);
    document.getElementById('edit-dispatch-boxes').value = Number(log.boxes || 0);
    document.getElementById('edit-dispatch-shipping').value = Number(log.shippingPrice || 0);
    document.getElementById('edit-dispatch-weight').value = log.weight || '';
    document.getElementById('edit-dispatch-origin').value = log.origin || '';
    document.getElementById('edit-dispatch-destination').value = log.destination || '';
    document.getElementById('edit-dispatch-image-url').value = log.imageUrl || getItemImageUrl(log.itemDetails || {});
    document.getElementById('edit-dispatch-sender-name').value = log.senderName || '';
    document.getElementById('edit-dispatch-sender-dept').value = log.senderDept || '';
    document.getElementById('edit-dispatch-sender-phone').value = log.senderPhone || '';
    document.getElementById('edit-dispatch-receiver-name').value = log.receiverName || '';
    document.getElementById('edit-dispatch-receiver-dept').value = log.receiverDept || '';
    document.getElementById('edit-dispatch-receiver-phone').value = log.receiverPhone || '';
    document.getElementById('edit-dispatch-driver-name').value = log.driverName || log.driver || '';
    document.getElementById('edit-dispatch-driver-dept').value = log.driverDept || '';
    document.getElementById('edit-dispatch-driver-phone').value = log.driverPhone || '';
    document.getElementById('edit-dispatch-vehicle-plate').value = log.vehiclePlate || '';
    document.getElementById('edit-dispatch-log-modal').classList.remove('hidden');
};

window.closeEditDispatchLogModal = function() {
    document.getElementById('edit-dispatch-log-modal')?.classList.add('hidden');
};

window.handleEditDispatchLogSubmit = async function(event) {
    event.preventDefault();
    const id = document.getElementById('edit-dispatch-log-id').value;
    const index = dispatchLogs.findIndex(item => String(item.id) === String(id));
    if (index === -1) {
        showToast("ບໍ່ພົບລາຍການຂົນສົ່ງນີ້", "error");
        return;
    }

    const updated = {
        ...dispatchLogs[index],
        remark: document.getElementById('edit-dispatch-remark').value.trim(),
        qtyDispatched: Number(document.getElementById('edit-dispatch-qty').value || 0),
        boxes: Number(document.getElementById('edit-dispatch-boxes').value || 0),
        shippingPrice: Number(document.getElementById('edit-dispatch-shipping').value || 0),
        weight: document.getElementById('edit-dispatch-weight').value.trim() || '-',
        origin: document.getElementById('edit-dispatch-origin').value.trim(),
        destination: document.getElementById('edit-dispatch-destination').value.trim(),
        imageUrl: document.getElementById('edit-dispatch-image-url').value.trim(),
        senderName: document.getElementById('edit-dispatch-sender-name').value.trim(),
        senderDept: document.getElementById('edit-dispatch-sender-dept').value.trim(),
        senderPhone: document.getElementById('edit-dispatch-sender-phone').value.trim(),
        receiverName: document.getElementById('edit-dispatch-receiver-name').value.trim(),
        receiverDept: document.getElementById('edit-dispatch-receiver-dept').value.trim(),
        receiverPhone: document.getElementById('edit-dispatch-receiver-phone').value.trim(),
        driverName: document.getElementById('edit-dispatch-driver-name').value.trim(),
        driverDept: document.getElementById('edit-dispatch-driver-dept').value.trim(),
        driverPhone: document.getElementById('edit-dispatch-driver-phone').value.trim(),
        vehiclePlate: document.getElementById('edit-dispatch-vehicle-plate').value.trim()
    };
    updated.driver = updated.driverName;

    if (updated.itemDetails) {
        updated.itemDetails = { ...updated.itemDetails, imageUrl: updated.imageUrl || updated.itemDetails.imageUrl || '' };
    }

    dispatchLogs[index] = normalizeDispatchLog(updated);
    await saveDispatchData();
    renderDispatchLogsTable();
    closeEditDispatchLogModal();
    showToast("ບັນທຶກການແກ້ໄຂປະຫວັດຂົນສົ່ງແລ້ວ", "success");
};

window.deleteDispatchLog = async function(id) {
    const log = dispatchLogs.find(item => String(item.id) === String(id));
    if (!log) return;

    if (!confirm(`ຢືນຢັນລົບລາຍການ ${log.id}?`)) return;

    dispatchLogs = dispatchLogs.filter(item => String(item.id) !== String(id));
    await saveDispatchData();
    renderDispatchLogsTable();
    showToast("ລົບລາຍການຂົນສົ່ງແລ້ວ", "warning");
};

window.changeDispatchPage = function(direction) {
    dispatchCurrentPage += Number(direction || 0);
    renderDispatchLogsTable();
};

window.changeDispatchPageSize = function(value) {
    dispatchPageSize = value === 'ALL' ? 'ALL' : Number(value || 80);
    dispatchCurrentPage = 1;
    renderDispatchLogsTable();
};

window.resetDispatchPaginationAndRender = function() {
    dispatchCurrentPage = 1;
    renderDispatchLogsTable();
};

function getCurrentDispatchPageLogs() {
    const filteredLogs = getFilteredDispatchLogs();
    const pageSize = getDispatchPageSize(filteredLogs.length);
    const startIndex = filteredLogs.length === 0 ? 0 : (dispatchCurrentPage - 1) * pageSize;
    const endIndex = dispatchPageSize === 'ALL' ? filteredLogs.length : Math.min(startIndex + pageSize, filteredLogs.length);
    return filteredLogs.slice(startIndex, endIndex);
}

function resolvePrintableImageUrl(imageUrl) {
    if (!imageUrl) return '';
    try {
        return new URL(imageUrl, window.location.href).href;
    } catch (error) {
        return imageUrl;
    }
}

window.printCurrentDispatchPage = function() {
    const pageLogs = getCurrentDispatchPageLogs();
    if (pageLogs.length === 0) {
        showToast("ບໍ່ມີລາຍການໃນໜ້ານີ້ໃຫ້ Print", "warning");
        return;
    }

    const rows = pageLogs.map((log, index) => {
        const item = log.itemDetails || {};
        const imageUrl = log.imageUrl || getItemImageUrl(item);
        const absoluteImageUrl = resolvePrintableImageUrl(imageUrl);
        return `
            <tr>
                <td class="doc-cell">
                    <div class="doc-id">${escapeHtml(log.id || '')}</div>
                    <div class="doc-date">${escapeHtml(log.timestamp || '')}</div>
                </td>
                <td class="barcode-cell">${escapeHtml(log.barcode || '')}</td>
                <td>${escapeHtml(log.remark || '-')}</td>
                <td class="item-cell">${escapeHtml(item.itemNameLaos || '-')}</td>
                <td>${escapeHtml(item.model || '-')}</td>
                <td>${escapeHtml(item.size || '-')}</td>
                <td class="qty-cell">${escapeHtml(log.qtyDispatched || 0)} ${escapeHtml(item.unitLaos || '')}</td>
                <td class="center-cell">${escapeHtml(log.boxes || 0)}</td>
                <td class="money-cell">${Number(log.shippingPrice || 0).toLocaleString()}</td>
                <td class="center-cell">${escapeHtml(log.weight || '-')}</td>
                <td class="image-cell">${absoluteImageUrl ? `<img src="${escapeHtml(absoluteImageUrl)}" alt="${escapeHtml(item.itemNameLaos || log.barcode || 'Item image')}">` : ''}</td>
                <td>${escapeHtml(log.origin || '-')}</td>
                <td>${escapeHtml(log.destination || '-')}</td>
            </tr>
        `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast("ກະລຸນາອະນຸຍາດ popup ເພື່ອ Print", "error");
        return;
    }

    printWindow.document.write(`
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Dispatch Items Print</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>
                @page { size: A4 landscape; margin: 8mm; }
                * { box-sizing: border-box; }
                body, table, th, td, h1, p {
                    font-family: 'Noto Sans Lao', 'Phetsarath OT', Arial, sans-serif;
                }
                body { color: #0f172a; background: #ffffff; }
                h1 { font-size: 18px; margin: 0 0 4px; color: #0f766e; font-weight: 900; }
                p { margin: 0 0 12px; color: #64748b; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #bfdbfe; }
                th, td { border: 1px solid #bfdbfe; padding: 7px 10px; vertical-align: middle; }
                th {
                    background: #d9fbff;
                    border-bottom: 2px solid #14b8a6;
                    color: #0f172a;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: 0;
                    text-align: left;
                    text-transform: uppercase;
                    white-space: nowrap;
                }
                tbody tr:nth-child(even) { background: #f0fdfa; }
                tbody tr:nth-child(odd) { background: #ffffff; }
                img {
                    width: 52px;
                    height: 52px;
                    object-fit: contain;
                    display: block;
                    margin: 0 auto;
                    padding: 3px;
                    border: 1px solid #99f6e4;
                    border-radius: 8px;
                    background: #ffffff;
                }
                .doc-id { font-weight: 900; color: #020617; white-space: nowrap; }
                .doc-date { margin-top: 2px; color: #64748b; font-size: 9px; white-space: nowrap; }
                .barcode-cell { color: #008060; font-weight: 900; white-space: nowrap; }
                .item-cell { color: #020617; font-weight: 900; }
                .qty-cell { color: #c2410c; font-weight: 900; text-align: center; white-space: nowrap; }
                .money-cell { color: #008060; font-weight: 900; text-align: right; white-space: nowrap; }
                .center-cell, .image-cell { text-align: center; }
            </style>
        </head>
        <body>
            <h1>ລາຍການຂົນສົ່ງໃນໜ້ານີ້</h1>
            <p>ວັນທີພິມ: ${new Date().toLocaleString('lo-LA')} | ຈຳນວນ ${pageLogs.length} ລາຍການ</p>
            <table>
                <thead>
                    <tr>
                        <th>ເລກທີ / ວັນທີ</th>
                        <th>Barcode</th>
                        <th>PR</th>
                        <th>Item name Laos</th>
                        <th>Modle</th>
                        <th>Size</th>
                        <th>QTY ສົ່ງ</th>
                        <th>Box</th>
                        <th>ລາຄາຂົນສົ່ງ</th>
                        <th>ນ້ຳໜັກ</th>
                        <th>ຮູບ</th>
                        <th>ໂຮງງານຕົ້ນທາງ</th>
                        <th>ໂຮງງານປາຍທາງ</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <script>
                window.onload = function() {
                    const printPage = function() {
                        window.print();
                        window.close();
                    };
                    if (document.fonts && document.fonts.ready) {
                        document.fonts.ready.then(function() {
                            setTimeout(printPage, 250);
                        });
                    } else {
                        setTimeout(printPage, 600);
                    }
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
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
            "ຈຳນວນກ່ອງ/Box": log.boxes || 0,
            "ລາຄາຂົນສົ່ງ": log.shippingPrice || 0,
            "ນ້ຳໜັກ": log.weight || '-',
            "Image URL": log.imageUrl || getItemImageUrl(item),
            Group: item.group || '',
            Category: item.category || '',
            Area: item.area || '',
            "Responsible person": item.responsiblePerson || '',
            "Pice Unit": item.priceUnit || 0,
            name_of_price: item.nameOfPrice || 'LAK',
            "ໂຮງງານຕົ້ນທາງ": log.origin,
            "ໂຮງງານປາຍທາງ": log.destination,
            "ຊື່ຜູ້ສົ່ງ": log.senderName || '',
            "ພະແນກຜູ້ສົ່ງ": log.senderDept || '',
            "ເບີໂທຜູ້ສົ່ງ": log.senderPhone || '',
            "ຊື່ຜູ້ຮັບ": log.receiverName || '',
            "ພະແນກຜູ້ຮັບ": log.receiverDept || '',
            "ເບີໂທຜູ້ຮັບ": log.receiverPhone || '',
            "ຊື່ຜູ້ຂັບ": log.driverName || log.driver || '',
            "ພະແນກຜູ້ຂັບ": log.driverDept || '',
            "ເບີໂທຜູ້ຂັບ": log.driverPhone || '',
            "ປ້າຍລົດ": log.vehiclePlate || '',
            "ໝາຍເຫດ": log.remark
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dispatch_History");
    XLSX.writeFile(wb, `Dispatch_History_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// =========================================================================
// BRANDING MODAL
// =========================================================================
window.openBrandingModal = function() {
    document.getElementById('branding-title-input').value = branding.title;
    document.getElementById('branding-subtitle-input').value = branding.subtitle;
    document.getElementById('branding-logo-input').value = branding.logoUrl || DEFAULT_BRANDING.logoUrl;
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

    if (titleEl) titleEl.innerText = branding.title;
    if (subtextEl) subtextEl.innerText = branding.subtitle;

    const logoUrl = branding.logoUrl || DEFAULT_BRANDING.logoUrl;
    if (logoUrl) {
        logoImg.src = logoUrl;
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

function escapeJs(str) {
    return String(str ?? '')
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}
