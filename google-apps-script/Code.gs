const SHEETS = {
  inventory: 'Inventory',
  dispatchLogs: 'DispatchLogs',
  branding: 'Branding'
};

const HEADERS = {
  inventory: [
    'barcode', 'categoryCode', 'itemNameLaos', 'itemNameChinese', 'model',
    'size', 'packSize', 'useFor', 'unitLaos', 'qty', 'group', 'category',
    'area', 'responsiblePerson', 'priceUnit', 'nameOfPrice', 'date', 'pr', 'remark'
  ],
  dispatchLogs: [
    'id', 'timestamp', 'barcode', 'itemDetails', 'qtyDispatched',
    'shippingPrice', 'weight', 'origin', 'destination', 'driver', 'remark'
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

    throw new Error('Unknown action: ' + action);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
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
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

  const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = existingHeaders.some(value => value !== '');
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
