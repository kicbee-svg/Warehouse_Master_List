(function () {
    const LOCAL_KEYS = {
        inventory: "LAO_WAREHOUSE_INVENTORY_V3",
        dispatchLogs: "LAO_WAREHOUSE_DISPATCH_V3",
        stickerPrintHistory: "LAO_WAREHOUSE_STICKER_PRINT_HISTORY_V1",
        branding: "LAO_WAREHOUSE_BRANDING_V3"
    };

    const config = window.WarehouseConfig || {};

    function getGoogleSheetsWebAppUrl() {
        return String(config.googleSheetsWebAppUrl || '').trim();
    }

    function googleSheetsEnabled() {
        return Boolean(config.useGoogleSheets && getGoogleSheetsWebAppUrl());
    }

    function loadLocal(key, fallback) {
        const stored = localStorage.getItem(LOCAL_KEYS[key]);
        return stored ? JSON.parse(stored) : fallback;
    }

    function saveLocal(key, value) {
        localStorage.setItem(LOCAL_KEYS[key], JSON.stringify(value));
        return value;
    }

    function normalizeInventoryItemForSheet(item = {}) {
        const copy = { ...item };
        copy.snkQty = Number(copy.snkQty || 0) || 0;
        copy.mmnQty = Number(copy.mmnQty || 0) || 0;
        copy.hqQty = Number(copy.hqQty || 0) || 0;
        copy.qty = copy.snkQty + copy.mmnQty + copy.hqQty;
        return copy;
    }

    function normalizeInventoryForSheet(inventory = []) {
        return inventory.map(normalizeInventoryItemForSheet);
    }

    async function requestGoogleSheets(action, payload = {}) {
        const url = getGoogleSheetsWebAppUrl();
        if (!url) {
            throw new Error("Google Sheets Web App URL is not configured.");
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({ action, ...payload })
        });

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (error) {
            throw new Error(`Google Sheets returned non-JSON response (${response.status}). Check Apps Script deployment access.`);
        }

        if (!response.ok) {
            throw new Error(result.error || `Google Sheets request failed: ${response.status}`);
        }

        if (!result.ok) {
            throw new Error(result.error || "Google Sheets request failed");
        }
        return result.data;
    }

    async function testConnection() {
        const url = getGoogleSheetsWebAppUrl();
        if (!url) {
            throw new Error("Google Sheets Web App URL is not configured.");
        }

        const response = await fetch(url, { method: "GET" });
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (error) {
            throw new Error(`Google Sheets returned non-JSON response (${response.status}). Redeploy Apps Script as a Web App with access set to Anyone.`);
        }

        if (!response.ok || !result.ok) {
            throw new Error(result.error || `Google Sheets connection test failed: ${response.status}`);
        }

        return result.data;
    }

    async function loadAll(defaultInventory, defaultBranding) {
        if (!googleSheetsEnabled()) {
            return loadCachedAll(defaultInventory, defaultBranding);
        }

        return loadRemoteAll(defaultInventory, defaultBranding);
    }

    function loadCachedAll(defaultInventory, defaultBranding) {
        return {
            inventory: loadLocal("inventory", [...defaultInventory]),
            dispatchLogs: loadLocal("dispatchLogs", []),
            stickerPrintHistory: loadLocal("stickerPrintHistory", []),
            branding: loadLocal("branding", { ...defaultBranding }),
            source: "local"
        };
    }

    async function loadRemoteAll(defaultInventory, defaultBranding) {
        if (!googleSheetsEnabled()) {
            return loadCachedAll(defaultInventory, defaultBranding);
        }

        await migrateSchemaIfAvailable();
        const data = await requestGoogleSheets("loadAll");
        saveLocal("inventory", data.inventory && data.inventory.length ? data.inventory : [...defaultInventory]);
        saveLocal("dispatchLogs", data.dispatchLogs || []);
        saveLocal("stickerPrintHistory", data.stickerPrintHistory || []);
        saveLocal("branding", data.branding || { ...defaultBranding });
        return {
            inventory: data.inventory && data.inventory.length ? data.inventory : [...defaultInventory],
            dispatchLogs: data.dispatchLogs || [],
            stickerPrintHistory: data.stickerPrintHistory || [],
            branding: data.branding || { ...defaultBranding },
            source: "googleSheets"
        };
    }

    async function migrateSchemaIfAvailable() {
        try {
            await requestGoogleSheets("migrateSchema");
        } catch (error) {
            console.warn("Google Sheets schema migration was skipped.", error);
        }
    }

    async function saveInventory(inventory) {
        const normalizedInventory = normalizeInventoryForSheet(inventory);
        saveLocal("inventory", normalizedInventory);
        if (googleSheetsEnabled()) {
            await requestGoogleSheets("saveInventory", { inventory: normalizedInventory });
        }
    }

    function saveInventoryLocal(inventory) {
        saveLocal("inventory", normalizeInventoryForSheet(inventory));
    }

    async function syncInventory(inventory) {
        if (googleSheetsEnabled()) {
            await requestGoogleSheets("saveInventory", { inventory: normalizeInventoryForSheet(inventory) });
        }
    }

    async function saveInventoryItem(item, inventory) {
        if (inventory) {
            saveLocal("inventory", inventory);
        }
        await syncInventoryItem(item, inventory);
    }

    async function syncInventoryItem(item, inventory) {
        if (googleSheetsEnabled()) {
            try {
                await requestGoogleSheets("saveInventoryItem", { item: normalizeInventoryItemForSheet(item) });
            } catch (error) {
                if (!inventory) throw error;
                console.warn("Single item save failed. Falling back to full inventory save.", error);
                await syncInventory(inventory);
            }
        }
    }

    async function saveDispatchLogs(dispatchLogs) {
        saveLocal("dispatchLogs", dispatchLogs);
        if (googleSheetsEnabled()) {
            const sheetDispatchLogs = dispatchLogs.map(({ itemDetails, ...log }) => log);
            await requestGoogleSheets("saveDispatchLogs", { dispatchLogs: sheetDispatchLogs });
        }
    }

    async function saveStickerPrintHistory(stickerPrintHistory) {
        saveLocal("stickerPrintHistory", stickerPrintHistory);
        if (googleSheetsEnabled()) {
            await requestGoogleSheets("saveStickerPrintHistory", { stickerPrintHistory });
        }
    }

    function saveStickerPrintHistoryLocal(stickerPrintHistory) {
        saveLocal("stickerPrintHistory", stickerPrintHistory);
    }

    async function syncStickerPrintHistory(stickerPrintHistory) {
        if (googleSheetsEnabled()) {
            await requestGoogleSheets("saveStickerPrintHistory", { stickerPrintHistory });
        }
    }

    async function saveBranding(branding) {
        saveLocal("branding", branding);
        if (googleSheetsEnabled()) {
            await requestGoogleSheets("saveBranding", { branding });
        }
    }

    window.WarehouseStore = {
        loadAll,
        loadCachedAll,
        loadRemoteAll,
        saveInventory,
        saveInventoryLocal,
        syncInventory,
        saveInventoryItem,
        syncInventoryItem,
        saveDispatchLogs,
        saveStickerPrintHistory,
        saveStickerPrintHistoryLocal,
        syncStickerPrintHistory,
        saveBranding,
        migrateSchemaIfAvailable,
        googleSheetsEnabled,
        testConnection
    };
})();
