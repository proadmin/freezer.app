(function() {
    'use strict';

    var API_BASE = typeof freezerInventory !== 'undefined' ? freezerInventory.restUrl : '';
    var NONCE = typeof freezerInventory !== 'undefined' ? freezerInventory.nonce : '';

    function headers() {
        var h = { 'Content-Type': 'application/json' };
        if (NONCE) h['X-WP-Nonce'] = NONCE;
        return h;
    }

    var downloadCsvBtn = document.getElementById('downloadCsvBtn');
    var csvFileInput = document.getElementById('csvFileInput');
    var csvFileName = document.getElementById('csvFileName');

    function setup() {
        if (downloadCsvBtn) downloadCsvBtn.addEventListener('click', handleDownloadCsv);
        if (csvFileInput) csvFileInput.addEventListener('change', handleCsvImport);
    }

    function handleDownloadCsv() {
        var includeAdmin = document.getElementById('exportAdminTables');
        var withAdmin = includeAdmin && includeAdmin.checked;
        var url = API_BASE + '/items/export-csv' + (withAdmin ? '?include=admin' : '');
        var dateStr = new Date().toISOString().slice(0, 10);

        if (withAdmin) {
            // Server sends binary zip directly
            fetch(url, { headers: NONCE ? { 'X-WP-Nonce': NONCE } : {} })
                .then(function(r) {
                    if (!r.ok) throw new Error('Export failed');
                    return r.blob();
                })
                .then(function(blob) {
                    var a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'freezer-inventory-' + dateStr + '.zip';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);
                })
                .catch(function() { showMsg('error', 'Failed to export zip.'); });
        } else {
            fetch(url, { headers: headers() })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
                    var a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = data.filename || ('freezer-inventory-' + dateStr + '.csv');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);
                })
                .catch(function() { showMsg('error', 'Failed to export CSV.'); });
        }
    }

    function handleCsvImport() {
        var file = csvFileInput.files[0];
        if (!file) return;
        if (csvFileName) csvFileName.textContent = file.name;

        var isZip = file.name.toLowerCase().endsWith('.zip');
        var warningMsg = isZip
            ? 'WARNING: Importing this zip will REPLACE ALL data in each table contained in the zip file (inventory, categories, freezers, locations, and/or item names). This cannot be undone.\n\nAre you sure you want to continue?'
            : 'WARNING: Importing this CSV will replace ALL current inventory items. This cannot be undone.\n\nAre you sure you want to continue?';

        if (!confirm(warningMsg)) {
            csvFileInput.value = '';
            if (csvFileName) csvFileName.textContent = '';
            return;
        }
        var formData = new FormData();
        formData.append('file', file);
        var h = {};
        if (NONCE) h['X-WP-Nonce'] = NONCE;
        fetch(API_BASE + '/items/import-csv', {
            method: 'POST',
            headers: h,
            body: formData
        })
            .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, json: j }; }); })
            .then(function(res) {
                csvFileInput.value = '';
                if (csvFileName) csvFileName.textContent = '';
                if (!res.ok) throw new Error(res.json.error || 'Import failed');
                var msg;
                if (typeof res.json.imported === 'object') {
                    var parts = Object.keys(res.json.imported).map(function(k) {
                        return k + ': ' + res.json.imported[k];
                    });
                    msg = 'Imported — ' + parts.join(', ');
                } else {
                    msg = 'Imported ' + res.json.imported + ' items.';
                }
                showMsg('success', msg);
            })
            .catch(function(err) {
                csvFileInput.value = '';
                if (csvFileName) csvFileName.textContent = '';
                showMsg('error', 'Import failed: ' + err.message);
            });
    }

    function showMsg(type, message) {
        var section = document.querySelector('.form-section');
        if (!section) return;
        var div = document.createElement('div');
        div.className = type === 'error' ? 'error-message' : 'success-message';
        div.textContent = message;
        section.insertBefore(div, section.firstChild);
        setTimeout(function() { div.remove(); }, 5000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();
