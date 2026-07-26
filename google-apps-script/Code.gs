const SHEETS = {
  inventory: 'Inventory',
  dispatchLogs: 'DispatchLogs',
  branding: 'Branding'
};

const SPREADSHEET_ID = '';

const HEADERS = {
  inventory: [
    'barcode', 'categoryCode', 'itemNameLaos', 'itemNameChinese', 'model',
    'size', 'packSize', 'useFor', 'unitLaos', 'qty', 'group', 'category',
    'area', 'responsiblePerson', 'priceUnit', 'nameOfPrice', 'date', 'pr', 'remark', 'imageUrl'
  ],
  dispatchLogs: [
    'id', 'timestamp', 'barcode', 'itemDetails', 'qtyDispatched',
    'shippingPrice', 'weight', 'imageUrl', 'boxes', 'origin', 'destination',
    'senderName', 'senderDept', 'senderPhone',
    'receiverName', 'receiverDept', 'receiverPhone',
    'driverName', 'driverDept', 'driverPhone', 'vehiclePlate',
    'driver', 'remark'
  ],
  branding: ['title', 'subtitle', 'logoUrl']
};

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;

    if (action === 'loadAll') {
      return jsonResponse({
        ok: true,
        data: {
          inventory: readObjects(SHEETS.inventory, HEADERS.inventory),
          dispatchLogs: readObjects(SHEETS.dispatchLogs, HEADERS.dispatchLogs).map(parseDispatchLog),
          branding: readBranding()
        }
      });
    }

    if (action === 'saveInventory') {
      writeObjects(SHEETS.inventory, HEADERS.inventory, body.inventory || []);
      return jsonResponse({ ok: true, data: true });
    }

    if (action === 'saveDispatchLogs') {
      writeObjects(SHEETS.dispatchLogs, HEADERS.dispatchLogs, (body.dispatchLogs || []).map(serializeDispatchLog));
      return jsonResponse({ ok: true, data: true });
    }

    if (action === 'saveBranding') {
      writeObjects(SHEETS.branding, HEADERS.branding, body.branding ? [body.branding] : []);
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
  ensureSheet(SHEETS.branding, HEADERS.branding);
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
    dispatchHeaders: spreadsheet.getSheetByName(SHEETS.dispatchLogs).getRange(1, 1, 1, HEADERS.dispatchLogs.length).getValues()[0]
  };
}

function readBranding() {
  const rows = readObjects(SHEETS.branding, HEADERS.branding);
  return rows[0] || null;
}

function parseDispatchLog(log) {
  return {
    ...log,
    itemDetails: parseJsonCell(log.itemDetails, {})
  };
}

function serializeDispatchLog(log) {
  return {
    ...log,
    itemDetails: JSON.stringify(log.itemDetails || {})
  };
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
