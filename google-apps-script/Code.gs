const SHEETS = {
  inventory: 'Inventory',
  dispatchLogs: 'DispatchLogs',
  stickerPrintHistory: 'StickerPrintHistory',
  branding: 'Branding'
};

const SPREADSHEET_ID = '';

const HEADERS = {
  inventory: [
    'barcode', 'categoryCode', 'itemNameLaos', 'itemNameChinese', 'model',
    'size', 'packSize', 'useFor', 'unitLaos', 'snkQty', 'mmnQty', 'qty', 'group', 'category',
    'area', 'responsiblePerson', 'priceUnit', 'nameOfPrice', 'date', 'pr', 'remark', 'imageUrl'
  ],
  dispatchLogs: [
    'id', 'timestamp', 'barcode', 'qtyDispatched',
    'shippingPrice', 'weight', 'imageUrl', 'boxes', 'origin', 'destination',
    'senderName', 'senderDept', 'senderPhone',
    'receiverName', 'receiverDept', 'receiverPhone',
    'driverName', 'driverDept', 'driverPhone', 'vehiclePlate',
    'driver', 'remark'
  ],
  stickerPrintHistory: [
    'id', 'timestamp', 'printedAtLocal', 'source', 'printerName', 'labelSize',
    'paperWidth', 'paperHeight', 'totalItems', 'totalCopies', 'showBorder',
    'watermarkOpacity', 'offsetY', 'barcodes', 'prs', 'itemNames', 'itemsJson', 'settingsJson'
  ],
  branding: ['title', 'subtitle', 'logoUrl']
};

function doGet() {
  try {
    migrateSchema();
    const spreadsheet = getSpreadsheet();
    return jsonResponse({
      ok: true,
      data: {
        status: 'ready',
        message: 'Warehouse Google Sheets backend is connected.',
        spreadsheetId: spreadsheet.getId(),
        spreadsheetName: spreadsheet.getName(),
        sheets: Object.values(SHEETS)
      }
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;

    if (action === 'loadAll') {
      migrateInventoryQtyData();
      return jsonResponse({
        ok: true,
        data: {
          inventory: readObjects(SHEETS.inventory, HEADERS.inventory),
          dispatchLogs: readObjects(SHEETS.dispatchLogs, HEADERS.dispatchLogs).map(parseDispatchLog),
          stickerPrintHistory: readObjects(SHEETS.stickerPrintHistory, HEADERS.stickerPrintHistory).map(parseStickerPrintLog),
          branding: readBranding()
        }
      });
    }

    if (action === 'saveInventory') {
      withWriteLock(() => {
        writeObjects(SHEETS.inventory, HEADERS.inventory, (body.inventory || []).map(normalizeInventoryForSheet));
      });
      return jsonResponse({ ok: true, data: true });
    }

    if (action === 'saveInventoryItem') {
      withWriteLock(() => {
        upsertObjectByKey(SHEETS.inventory, HEADERS.inventory, normalizeInventoryForSheet(body.item || {}), 'barcode');
      });
      return jsonResponse({ ok: true, data: true });
    }

    if (action === 'saveDispatchLogs') {
      withWriteLock(() => {
        writeObjects(SHEETS.dispatchLogs, HEADERS.dispatchLogs, (body.dispatchLogs || []).map(serializeDispatchLog));
      });
      return jsonResponse({ ok: true, data: true });
    }

    if (action === 'saveStickerPrintHistory') {
      withWriteLock(() => {
        writeObjects(SHEETS.stickerPrintHistory, HEADERS.stickerPrintHistory, (body.stickerPrintHistory || []).map(serializeStickerPrintLog));
      });
      return jsonResponse({ ok: true, data: true });
    }

    if (action === 'saveBranding') {
      withWriteLock(() => {
        writeObjects(SHEETS.branding, HEADERS.branding, body.branding ? [body.branding] : []);
      });
      return jsonResponse({ ok: true, data: true });
    }

    if (action === 'migrateSchema') {
      migrateSchema();
      return jsonResponse({ ok: true, data: true });
    }

    throw new Error('Unknown action: ' + action);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

function migrateSchema() {
  ensureSheet(SHEETS.inventory, HEADERS.inventory);
  ensureSheet(SHEETS.dispatchLogs, HEADERS.dispatchLogs);
  ensureSheet(SHEETS.stickerPrintHistory, HEADERS.stickerPrintHistory);
  ensureSheet(SHEETS.branding, HEADERS.branding);
  migrateInventoryQtyData();
  return true;
}

function runDatabaseMigration() {
  migrateSchema();
  SpreadsheetApp.flush();
  const spreadsheet = getSpreadsheet();
  return {
    ok: true,
    spreadsheetName: spreadsheet.getName(),
    inventoryHeaders: spreadsheet.getSheetByName(SHEETS.inventory).getRange(1, 1, 1, HEADERS.inventory.length).getValues()[0],
    dispatchHeaders: spreadsheet.getSheetByName(SHEETS.dispatchLogs).getRange(1, 1, 1, HEADERS.dispatchLogs.length).getValues()[0],
    stickerPrintHistoryHeaders: spreadsheet.getSheetByName(SHEETS.stickerPrintHistory).getRange(1, 1, 1, HEADERS.stickerPrintHistory.length).getValues()[0]
  };
}

function readBranding() {
  const rows = readObjects(SHEETS.branding, HEADERS.branding);
  return rows[0] || null;
}

function parseDispatchLog(log) {
  return { ...log };
}

function serializeDispatchLog(log) {
  const copy = { ...log };
  delete copy.itemDetails;
  return copy;
}

function parseStickerPrintLog(log) {
  const copy = { ...log };
  copy.items = parseJsonCell(copy.itemsJson, []);
  copy.settings = parseJsonCell(copy.settingsJson, {});
  return copy;
}

function serializeStickerPrintLog(log) {
  const copy = { ...log };
  copy.itemsJson = typeof copy.itemsJson === 'string' ? copy.itemsJson : JSON.stringify(copy.items || []);
  copy.settingsJson = typeof copy.settingsJson === 'string' ? copy.settingsJson : JSON.stringify(copy.settings || {});
  delete copy.items;
  delete copy.settings;
  return copy;
}

function normalizeInventoryForSheet(item) {
  const copy = { ...item };
  const legacyQty = Number(copy.qty || copy.QTY || copy.Quantity || 0) || 0;
  copy.snkQty = Number(copy.snkQty || copy.SNK_QTY || copy["SNK'QTY"] || copy['SNK QTY'] || 0) || 0;
  copy.mmnQty = Number(copy.mmnQty || copy.MMN_QTY || copy["MMN'QTY"] || copy['MMN QTY'] || 0) || 0;

  if (!copy.snkQty && !copy.mmnQty && legacyQty) {
    copy.snkQty = legacyQty;
  }

  copy.qty = copy.snkQty + copy.mmnQty;
  return copy;
}

function parseJsonCell(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function readObjects(sheetName, headers) {
  const sheet = ensureSheet(sheetName, headers);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1)
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      return item;
    });
}

function writeObjects(sheetName, headers, rows) {
  const sheet = ensureSheet(sheetName, headers);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (!rows.length) return;

  const values = rows.map(item => headers.map(header => item[header] ?? ''));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function upsertObjectByKey(sheetName, headers, item, keyHeader) {
  const sheet = ensureSheet(sheetName, headers);
  const keyIndex = headers.indexOf(keyHeader);
  if (keyIndex === -1) throw new Error('Missing key header: ' + keyHeader);

  const keyValue = item[keyHeader];
  if (keyValue === undefined || keyValue === null || String(keyValue).trim() === '') {
    throw new Error('Missing key value: ' + keyHeader);
  }

  const lastRow = sheet.getLastRow();
  const values = headers.map(header => item[header] ?? '');
  let targetRow = lastRow + 1;

  if (lastRow > 1) {
    const keyValues = sheet.getRange(2, keyIndex + 1, lastRow - 1, 1).getValues();
    const matchIndex = keyValues.findIndex(row => String(row[0]) === String(keyValue));
    if (matchIndex !== -1) {
      targetRow = matchIndex + 2;
    }
  }

  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);
}

function ensureSheet(sheetName, headers) {
  const spreadsheet = getSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

  const maxColumns = Math.max(sheet.getLastColumn(), headers.length, 1);
  let existingHeaders = sheet.getRange(1, 1, 1, maxColumns).getValues()[0].map(String);
  const hasHeaders = existingHeaders.some(value => value !== '');
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  headers.forEach((header, index) => {
    existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), index + 1)).getValues()[0].map(String);
    if (existingHeaders[index] === header) return;

    const existingIndex = existingHeaders.indexOf(header);
    if (existingIndex === -1) {
      sheet.insertColumnBefore(index + 1);
      sheet.getRange(1, index + 1).setValue(header);
    } else {
      sheet.moveColumns(sheet.getRange(1, existingIndex + 1, sheet.getMaxRows(), 1), index + 1);
    }
  });

  const syncedHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (headers.some((header, index) => syncedHeaders[index] !== header)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function migrateInventoryQtyData() {
  const sheet = ensureSheet(SHEETS.inventory, HEADERS.inventory);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const headers = sheet.getRange(1, 1, 1, HEADERS.inventory.length).getValues()[0].map(String);
  const snkIndex = headers.indexOf('snkQty');
  const mmnIndex = headers.indexOf('mmnQty');
  const qtyIndex = headers.indexOf('qty');
  if (snkIndex === -1 || mmnIndex === -1 || qtyIndex === -1) return;

  const range = sheet.getRange(2, 1, lastRow - 1, HEADERS.inventory.length);
  const rows = range.getValues();
  let changed = false;

  const normalizedRows = rows.map(row => {
    const legacyQty = Number(row[qtyIndex] || 0) || 0;
    let snkQty = Number(row[snkIndex] || 0) || 0;
    let mmnQty = Number(row[mmnIndex] || 0) || 0;

    if (!snkQty && !mmnQty && legacyQty) {
      snkQty = legacyQty;
      row[snkIndex] = snkQty;
      row[mmnIndex] = 0;
      changed = true;
    }

    const totalQty = snkQty + mmnQty;
    if (Number(row[qtyIndex] || 0) !== totalQty) {
      row[qtyIndex] = totalQty;
      changed = true;
    }

    return row;
  });

  if (changed) {
    range.setValues(normalizedRows);
  }
}

function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('No active spreadsheet found. Put your Google Sheet ID into SPREADSHEET_ID in Code.gs.');
  }

  return spreadsheet;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function withWriteLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}
