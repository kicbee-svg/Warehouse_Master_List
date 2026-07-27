(function () {
    const LOCAL_KEYS = {
        inventory: "LAO_WAREHOUSE_INVENTORY_V3",
        dispatchLogs: "LAO_WAREHOUSE_DISPATCH_V3",
        branding: "LAO_WAREHOUSE_BRANDING_V3"
    };

    const config = window.WarehouseConfig || {};

    function googleSheetsEnabled() {
        return Boolean(config.useGoogleSheets && config.googleSheetsWebAppUrl);
    }

    function loadLocal(key, fallback) {
        const stored = localStorage.getItem(LOCAL_KEYS[key]);
        return stored ? JSON.parse(stored) : fallback;
    }

    function saveLocal(key, value) {
        localStorage.setItem(LOCAL_KEYS[key], JSON.stringify(value));
        return value;
    }

    async function requestGoogleSheets(action, payload = {}) {
        const response = await fetch(config.googleSheetsWebAppUrl, {
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
            branding: loadLocal("branding", { ...defaultBranding }),
            source: "local"
        };
    }

    async function loadRemoteAll(defaultInventory, defaultBranding) {
        if (!googleSheetsEnabled()) {
            return loadCachedAll(defaultInventory, defaultBranding);
        }

        const data = await requestGoogleSheets("loadAll");
        saveLocal("inventory", data.inventory && data.inventory.length ? data.inventory : [...defaultInventory]);
        saveLocal("dispatchLogs", data.dispatchLogs || []);
        saveLocal("branding", data.branding || { ...defaultBranding });
        return {
            inventory: data.inventory && data.inventory.length ? data.inventory : [...defaultInventory],
            dispatchLogs: data.dispatchLogs || [],
            branding: data.branding || { ...defaultBranding },
            source: "googleSheets"
        };
    }

    async function saveInventory(inventory) {
        saveLocal("inventory", inventory);
        if (googleSheetsEnabled()) {
            await requestGoogleSheets("saveInventory", { inventory });
        }
    }

    async function saveInventoryItem(item, inventory) {
        if (inventory) {
            saveLocal("inventory", inventory);
        }
        if (googleSheetsEnabled()) {
            try {
                await requestGoogleSheets("saveInventoryItem", { item });
            } catch (error) {
                if (!inventory) throw error;
                console.warn("Single item save failed. Falling back to full inventory save.", error);
                await requestGoogleSheets("saveInventory", { inventory });
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
        saveInventoryItem,
        saveDispatchLogs,
        saveBranding,
        googleSheetsEnabled
    };
})();
