# Freezer Inventory Manager

A WordPress plugin for tracking what's in your freezers. Items live in a spreadsheet-style table you can edit directly in the browser.

## Features

The inventory table works like a spreadsheet: click any cell to edit it. Tab moves between cells in a row, Enter moves down a column, and Escape cancels. Month cells use an inline month picker. An "Add Item" button at the top of the inventory panel jumps straight to the add form.

Each item has a name, category, quantity, unit, raw/cooked status, location (freezer/shelf/bin), month added, and notes. Items are deleted automatically when the quantity hits zero.

Locations use cascading dropdowns: pick a freezer, then a shelf, then an optional bin. The lists of freezers, shelves, bins, and categories are managed from the Settings page. Freezers, locations, and item names can't be deleted while any inventory item references them.

The item name field autocompletes from a list that grows as you add new items.

Columns are sortable. You can filter by name, category, freezer, and raw/cooked status. The layout scales to full browser width on any screen size.

Other features:
- CSV import and export (dedicated admin page with column docs and a downloadable example file)
- PDF export (opens a print-friendly view in a new tab)
- `[freezer_inventory]` shortcode embeds a read/write inventory view on any public page, no login required (no CSV functions on frontend)
- Automatic updates from GitHub releases, visible on the WordPress Plugins page
- Admin pages require `manage_options`
- Shortcode pages and REST API responses are not cached

## Installation

1. Download `freezer-inventory.zip`
2. In WordPress, go to Plugins > Add New > Upload Plugin
3. Upload the zip and activate
4. Find "Freezer Inventory" in the admin sidebar
5. Set up freezers, locations, categories, and item names under Freezer Inventory > Settings
6. Start adding items

### Frontend

Add `[freezer_inventory]` to any page or post. All visitors can view and edit the inventory without logging in.

## Admin pages

- **Freezer Inventory**: main inventory table with add form, filters, and PDF export
- **Settings**: manage categories, freezers, locations, and item names (tabbed)
- **CSV Import / Export**: export or import inventory with column docs and an example CSV

## Requirements

- WordPress 5.0+
- PHP 7.4+

## License

GPL v2 or later
