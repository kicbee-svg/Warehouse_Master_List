# Google Sheets Backend

1. Create a Google Sheet.
2. Open Extensions > Apps Script from that Sheet.
3. Paste `Code.gs` into Apps Script.
4. Click Deploy > New deployment > Web app.
5. Set "Execute as" to `Me`.
6. Set "Who has access" to `Anyone`.
7. Click Deploy and authorize the script.
8. Copy the `/exec` Web App URL into `assets/js/config.js`.
9. Set `useGoogleSheets: true`.

The app uses these tabs in the same Google Sheet: `Inventory`, `Input`, `DispatchLogs`, `StickerPrintHistory`, and `Branding`.

Open the deployed `/exec` URL in a browser to test the connection. A working deployment returns JSON with `ok: true` and `status: "ready"`.

If the warehouse page shows `Google Sheets load failed`, open the Web App URL in a browser. A valid deployment returns JSON with `ok: true`. A `401 Unauthorized` or Google Drive HTML page means the Web App access is not set to `Anyone` or the copied URL is not the active `/exec` deployment URL.
