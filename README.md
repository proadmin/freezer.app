# Freezer Inventory Manager

Track what's in your freezers with an editable spreadsheet-style table. Available as a **standalone Node.js app** and as a **WordPress plugin**.

## Features

The inventory table works like a spreadsheet: click any cell to edit it. Tab moves between cells in a row, Enter moves down a column, and Escape cancels. Month cells use an inline month picker. An "Add Item" button at the top of the inventory panel jumps straight to the add form.

Each item has a name, category, quantity, unit, raw/cooked status, location (freezer/shelf/bin), month added, and notes. Items are deleted automatically when the quantity hits zero.

Locations use cascading dropdowns: pick a freezer, then a shelf, then an optional bin. The lists of freezers, shelves, bins, and categories are managed from the Settings page. Freezers, locations, and item names can't be deleted while any inventory item references them.

The item name field autocompletes from a list that grows as you add new items.

Columns are sortable. You can filter by name, category, freezer, and raw/cooked status — all filters are on one row. The layout scales to full browser width on any screen size.

Other features:
- CSV import and export (dedicated page with column docs and a downloadable example file)
- PDF export (opens a print-friendly view in a new tab)
- Settings and CSV pages linked from the main inventory page footer

## Node.js App

The standalone app lives in `freezer-app/`. It uses Express and SQLite — no external database required.

### Installation

```bash
cd freezer-app
npm install
npm start        # production, http://localhost:3000
npm run dev      # development — auto-restarts on file changes
```

Set `PORT` to override the default port:
```bash
PORT=8080 npm start
```

The SQLite database is created automatically at `freezer-app/data/freezer.db` on first run.

### Pages

- `/` → redirects to `/admin`
- `/admin` — main inventory table with filters, add form, and PDF export
- `/admin/settings` — manage freezers, locations, categories, and item names
- `/admin/csv` — CSV import and export
- `/health` — health check endpoint, returns `{"status":"ok"}`

## WordPress Plugin

The plugin lives in `freezer-inventory/`. It stores data in the WordPress database and adds an admin sidebar menu.

### Installation

1. Download `freezer-inventory.zip`
2. In WordPress, go to Plugins > Add New > Upload Plugin
3. Upload the zip and activate
4. Find "Freezer Inventory" in the admin sidebar
5. Set up freezers, locations, categories, and item names under Freezer Inventory > Settings
6. Start adding items

### Frontend shortcode

Add `[freezer_inventory]` to any page or post. All visitors can view and edit the inventory without logging in (CSV import/export not available on frontend).

### Requirements

- WordPress 5.0+
- PHP 7.4+

## Changelog

### 1.3.1
- Add/edit form dropdowns (freezer, shelf, bin, category) now load live from the API on startup — fixes broken dropdowns in the standalone app
- Category field changed to a combo-box (free-text + autocomplete) so new categories can be typed directly and are added to the categories list automatically
- Back arrow on Settings and CSV pages links back to the inventory
- Notes field widens to fill remaining row space
- CSV Export: "Include admin tables" checkbox exports everything (inventory, categories, freezers, locations, item names) as a single .zip file
- CSV Import: accepts .zip files; each file inside the zip is routed to the appropriate table; warning popup lists which tables will be overwritten

### 1.3.0
- All inventory table headers now display with a blue background
- Full-width responsive layout on all pages; tables scroll horizontally on small screens; filter bar and form rows stack on narrow viewports
- Sort ascending/descending by clicking column headers on all Settings admin tables (Categories, Freezers, Locations, Item Names)
- "Showing x of x Items" stats line is now blue; each category is a clickable link that filters and sorts the inventory by that category
- Settings and CSV Import/Export buttons moved to a dedicated "Admin" section at the bottom of the main inventory page (below the Add New Item form)

### 1.2.0
- Converted WordPress plugin to standalone Node.js app (Express + SQLite)
- Filter bar now lays out on a single row
- Settings and CSV Import / Export linked from buttons in the inventory footer
- Node.js dependency updates: better-sqlite3 v11, multer v2 (CVE fix), nodemon dev server

### 1.1.1
- Added version and copyright footer to inventory pages

### 1.1.0
- Rewrote README for clarity
- Added .gitignore

### 1.0.5
- Expanded filter inputs to fill available browser width
- Synced frontend shortcode with current admin page layout
- Disabled caching for shortcode pages and REST API responses

## License

GPL v2 or later
