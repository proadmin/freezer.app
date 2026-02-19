Freezer Inventory Manager
=========================

Version: 2.0.0
License: GPLv2 or later — https://www.gnu.org/licenses/gpl-2.0.html

Track what's in your freezers with an editable spreadsheet-style table.
Built on Node.js, Express, and SQLite — no external database required.


Description
-----------

Freezer Inventory Manager lets you:

* Add items with name, category, quantity, unit, raw/cooked, location
  (freezer/shelf/bin), month added, and notes
* Edit any field directly in the inventory table — click a cell to edit,
  like a spreadsheet
* Editable month field with inline month picker
* Navigate between cells with Tab, Enter, and Escape keys
* Items are automatically removed when quantity reaches zero
* Sort any column ascending or descending by clicking the column header
* Search and filter by name, category, freezer, and raw/cooked
* Manage freezers, locations, categories, and item names from the Settings page
* Freezer and category names are inline-editable; renaming cascades to all
  affected inventory items and locations
* Item name autocomplete that learns new names as you add items
* Cascading location dropdowns (freezer → shelf → bin); bin is optional
* Bulk delete with checkboxes on the inventory and all Settings tables
* Dedicated CSV Import / Export page with column documentation and example CSV
* ZIP export includes all admin tables (categories, freezers, locations, item names)
* ZIP import routes each bundled CSV to the correct table automatically
* Print-friendly PDF view
* Fully responsive layout — uses full available width on all screen sizes


Installation
------------

Requirements: Node.js 18+, npm

1. Clone or download the repository
2. cd freezer-app
3. npm install
4. npm start

The app runs at http://localhost:3000 by default.
Set the PORT environment variable to use a different port:

    PORT=8080 npm start

For development with auto-restart on file changes:

    npm run dev

The SQLite database is created automatically at freezer-app/data/freezer.db
on first run. No database setup is required.


Pages
-----

/               Redirects to /admin
/admin          Main inventory table with filters, add form, and PDF export
/admin/settings Manage freezers, locations, categories, and item names
/admin/csv      CSV import and export
/health         Health check endpoint — returns {"status":"ok"}


Frequently Asked Questions
--------------------------

Where is data stored?
    In a local SQLite database at freezer-app/data/freezer.db.
    The file is created automatically on first run.

How do I get a PDF?
    Click "Download PDF" on the inventory page. A new tab opens with a
    printable table. Use your browser's Print > Save as PDF to save the file.

How do I export or import CSV?
    Go to /admin/csv. Click "Export CSV" to download the inventory.
    Check "Include admin tables" to export everything as a ZIP file.
    Click "Choose File" to import a CSV or ZIP. The page includes column
    documentation and a downloadable example CSV.

How do I edit an item?
    Click any cell in the inventory table to edit it in place, including
    the month. Use Tab to move between cells in a row, Enter to move down
    a column, and Escape to cancel.

What happens when quantity reaches zero?
    The item is automatically deleted from the inventory.

Can I rename a freezer or category?
    Yes. In Settings, click a freezer or category name to edit it inline.
    The rename cascades to all affected locations and inventory items.

Can I delete a freezer, location, category, or item name?
    Yes, from the Settings page — but only if no inventory items or
    locations currently reference them. In-use entries are skipped and
    a count of skipped items is reported.


Changelog
---------

2.0.0
* Removed WordPress plugin; app is now standalone Node.js only
* Freezer and category names are inline-editable in Settings; renaming
  cascades to all affected inventory items and locations

1.3.2
* CSV import: inventory import now syncs the Freezers table so the
  add-form freezer dropdown is populated after import
* CSV import: plain inventory CSV no longer touches admin tables
* Bulk delete for inventory and all Settings tables

1.3.1
* Form dropdowns now load live from the API on startup
* Category field changed to a combo-box (free-text + autocomplete)
* Back arrow on Settings and CSV pages
* Notes field widens to fill remaining row space
* CSV Export: "Include admin tables" checkbox exports a ZIP file
* CSV Import: accepts ZIP files

1.3.0
* Blue header row on all inventory table columns
* Full-width responsive layout on all pages
* Sortable columns on all Settings tables
* Category links in the stats line filter and sort by that category

1.2.0
* Converted WordPress plugin to standalone Node.js app (Express + SQLite)
* Filter bar on a single row
* Settings and CSV linked from the inventory footer
