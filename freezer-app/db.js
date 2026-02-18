const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'freezer.db');
const db = new Database(dbPath);

function init() {
  db.prepare(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    freezer TEXT NOT NULL,
    shelf TEXT NOT NULL,
    bin TEXT NOT NULL,
    UNIQUE(freezer, shelf, bin)
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS freezers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS item_names (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT,
    location TEXT,
    location_id INTEGER,
    preparation TEXT,
    date_added TEXT,
    notes TEXT
  )`).run();
}

init();

const uuidv4 = () => {
  // simple UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Locations
function getLocations() {
  const rows = db.prepare('SELECT id, freezer, shelf, bin FROM locations ORDER BY freezer, shelf, bin').all();
  return rows;
}

function getLocationById(id) {
  const row = db.prepare('SELECT id, freezer, shelf, bin FROM locations WHERE id = ?').get(id);
  return row || null;
}

function addLocation({ freezer, shelf, bin }) {
  if (!freezer || !shelf) throw new Error('Freezer and shelf required');
  try {
    const info = db.prepare('INSERT INTO locations (freezer,shelf,bin) VALUES (?,?,?)').run(freezer, shelf, bin || '');
    return getLocationById(info.lastInsertRowid);
  } catch (e) {
    throw e;
  }
}

function updateLocation(id, data) {
  const loc = getLocationById(id);
  if (!loc) throw new Error('not_found');
  const freezer = data.freezer ?? loc.freezer;
  const shelf = data.shelf ?? loc.shelf;
  const bin = data.bin ?? loc.bin;
  db.prepare('UPDATE locations SET freezer=?, shelf=?, bin=? WHERE id=?').run(freezer, shelf, bin, id);
  return getLocationById(id);
}

function deleteLocation(id) {
  const count = db.prepare('SELECT COUNT(*) as c FROM items WHERE location_id = ?').get(id).c;
  if (count > 0) throw new Error('in_use');
  const info = db.prepare('DELETE FROM locations WHERE id = ?').run(id);
  return info.changes > 0;
}

// Freezers
function getFreezers() {
  return db.prepare('SELECT id, name FROM freezers ORDER BY name').all();
}

function addFreezer(name) {
  if (!name) throw new Error('missing');
  const info = db.prepare('INSERT INTO freezers (name) VALUES (?)').run(name);
  return { id: info.lastInsertRowid, name };
}

function updateFreezer(id, newName) {
  if (!newName) throw new Error('missing');
  const frz = db.prepare('SELECT name FROM freezers WHERE id = ?').get(id);
  if (!frz) throw new Error('not_found');
  const oldName = frz.name;
  db.prepare('UPDATE freezers SET name = ? WHERE id = ?').run(newName, id);
  // Cascade: rename the freezer field in all affected locations
  db.prepare('UPDATE locations SET freezer = ? WHERE freezer = ?').run(newName, oldName);
  // Keep the denormalized location text in items in sync
  db.prepare(`UPDATE items SET location = (SELECT l.freezer || ' / ' || l.shelf || ' / ' || l.bin FROM locations l WHERE l.id = items.location_id) WHERE location_id IN (SELECT id FROM locations WHERE freezer = ?)`).run(newName);
  return { id, name: newName };
}

function deleteFreezer(id) {
  const frz = db.prepare('SELECT name FROM freezers WHERE id = ?').get(id);
  if (!frz) throw new Error('not_found');
  const count = db.prepare('SELECT COUNT(*) as c FROM locations WHERE freezer = ?').get(frz.name).c;
  if (count > 0) throw new Error('in_use');
  db.prepare('DELETE FROM freezers WHERE id = ?').run(id);
  return true;
}

// Item names
function getItemNames() { return db.prepare('SELECT id,name FROM item_names ORDER BY name').all(); }
function addItemName(name) { const info = db.prepare('INSERT INTO item_names (name) VALUES (?)').run(name); return { id: info.lastInsertRowid, name }; }
function deleteItemName(id) { db.prepare('DELETE FROM item_names WHERE id = ?').run(id); return true; }

// Categories
function getCategories() { return db.prepare('SELECT id,name FROM categories ORDER BY name').all(); }
function addCategory(name) { const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name); return { id: info.lastInsertRowid, name }; }
function deleteCategory(id) { db.prepare('DELETE FROM categories WHERE id = ?').run(id); return true; }

function updateCategory(id, newName) {
  if (!newName) throw new Error('missing');
  const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(id);
  if (!cat) throw new Error('not_found');
  const oldName = cat.name;
  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(newName, id);
  db.prepare('UPDATE items SET category = ? WHERE category = ?').run(newName, oldName);
  return { id, name: newName };
}

// Find or create location
function findOrCreateLocation(freezer, shelf, bin) {
  const row = db.prepare('SELECT id FROM locations WHERE freezer = ? AND shelf = ? AND bin = ?').get(freezer, shelf, bin || '');
  if (row) return row.id;
  const info = db.prepare('INSERT INTO locations (freezer,shelf,bin) VALUES (?,?,?)').run(freezer, shelf, bin || '');
  return info.lastInsertRowid;
}

// Items
function getItems({ category, location_id, freezer, shelf, bin, search } = {}) {
  let sql = `SELECT i.*, l.freezer, l.shelf, l.bin FROM items i LEFT JOIN locations l ON i.location_id = l.id WHERE 1=1`;
  const params = [];
  if (category) { sql += ' AND i.category = ?'; params.push(category); }
  if (location_id) { sql += ' AND i.location_id = ?'; params.push(location_id); }
  if (freezer) { sql += ' AND l.freezer = ?'; params.push(freezer); }
  if (shelf) { sql += ' AND l.shelf = ?'; params.push(shelf); }
  if (bin) { sql += ' AND l.bin = ?'; params.push(bin); }
  if (search) { sql += ' AND LOWER(i.name) LIKE ?'; params.push('%' + search.toLowerCase() + '%'); }
  sql += ' ORDER BY date_added DESC';
  const rows = db.prepare(sql).all(...params);
  return rows.map(r => ({
    ...r,
    quantity: parseFloat(r.quantity || 0),
    location_id: r.location_id || null,
    freezer: r.freezer || '',
    shelf: r.shelf || '',
    bin: r.bin || '',
  }));
}

function getItemById(id) {
  const r = db.prepare('SELECT i.*, l.freezer, l.shelf, l.bin FROM items i LEFT JOIN locations l ON i.location_id = l.id WHERE i.id = ?').get(id);
  if (!r) return null;
  r.quantity = parseFloat(r.quantity || 0);
  return r;
}

function addItem(data) {
  const id = uuidv4();
  const date = data.date_added || new Date().toISOString();
  const name = data.name || '';
  const category = data.category || '';
  const quantity = Number(data.quantity || 0);
  const unit = data.unit || '';
  const notes = data.notes || '';
  const preparation = data.preparation || '';

  let location_id = data.location_id || null;
  if (!location_id && data.freezer && data.shelf) {
    location_id = findOrCreateLocation(data.freezer, data.shelf, data.bin || '');
  }
  let location = data.location || '';
  if (location_id) {
    const loc = getLocationById(location_id);
    if (loc) location = `${loc.freezer} / ${loc.shelf} / ${loc.bin}`;
  }

  if (!name || !category) throw new Error('missing');

  db.prepare('INSERT INTO items (id,name,category,quantity,unit,location,location_id,preparation,date_added,notes) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, name, category, quantity, unit, location, location_id, preparation, date, notes);

  // ensure item name and category exist
  try { addItemName(name); } catch (e) {}
  try { addCategory(category); } catch (e) {}

  return getItemById(id);
}

function updateItem(id, data) {
  const item = getItemById(id);
  if (!item) throw new Error('not_found');
  const allowed = ['name','category','quantity','unit','location','location_id','preparation','notes','date_added','freezer_zone'];
  const update = {};
  allowed.forEach(k => { if (k in data) update[k] = data[k]; });

  if ('location_id' in update) {
    const loc = getLocationById(update.location_id);
    if (loc) update.location = `${loc.freezer} / ${loc.shelf} / ${loc.bin}`;
  } else if ('freezer_zone' in update && !('location' in update)) {
    update.location = update.freezer_zone;
  }

  const fields = Object.keys(update);
  if (fields.length === 0) return getItemById(id);
  const set = fields.map(f => `${f} = ?`).join(', ');
  const params = fields.map(f => update[f]);
  params.push(id);
  db.prepare(`UPDATE items SET ${set} WHERE id = ?`).run(...params);
  return getItemById(id);
}

function deleteItem(id) {
  const info = db.prepare('DELETE FROM items WHERE id = ?').run(id);
  if (info.changes === 0) throw new Error('not_found');
  return true;
}

function replaceAllItems(items) {
  const del = db.prepare('DELETE FROM items').run();
  let count = 0;
  const insert = db.prepare('INSERT INTO items (id,name,category,quantity,unit,location,location_id,preparation,date_added,notes) VALUES (?,?,?,?,?,?,?,?,?,?)');
  const trx = db.transaction((rows) => {
    for (const data of rows) {
      try {
        const id = uuidv4();
        const date = data.date_added || new Date().toISOString();
        const name = data.name || '';
        const category = data.category || '';
        const quantity = Number(data.quantity || 0);
        const unit = data.unit || '';
        let location_id = null;
        if (data.freezer && data.shelf) {
          location_id = findOrCreateLocation(data.freezer, data.shelf, data.bin || '');
          // Keep the freezers table in sync so the add-form dropdown is populated after import
          try { addFreezer(data.freezer); } catch (e) {}
        }
        let location = data.location || data.freezer_zone || '';
        if (location_id) {
          const loc = getLocationById(location_id);
          if (loc) location = `${loc.freezer} / ${loc.shelf} / ${loc.bin}`;
        } else if (data.freezer) {
          // Preserve readable location text even when no matching location row was found
          location = [data.freezer, data.shelf, data.bin].filter(Boolean).join(' / ');
        }
        insert.run(id, name, category, quantity, unit, location, location_id, data.preparation || '', date, data.notes || '');
        try { addItemName(name); } catch (e) {}
        try { addCategory(category); } catch (e) {}
        count++;
      } catch (e) {
        // skip bad rows
      }
    }
  });
  trx(items);
  return count;
}

function getPrintHtml(items) {
  const header = `<!doctype html><html><head><meta charset="utf-8"><title>Freezer Inventory</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:20px;color:#333}h1{margin-bottom:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#667eea;color:#fff}tr:nth-child(even){background:#f9f9f9}</style></head><body><h1>Freezer Inventory</h1><p>Generated on ${new Date().toLocaleString()}</p>`;
  if (!items || items.length === 0) return header + '<p>No items in inventory.</p></body></html>';
  const rows = items.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.category)}</td><td>${item.quantity}</td><td>${escapeHtml(item.unit||'')}</td><td>${escapeHtml(item.freezer||'')}</td><td>${escapeHtml(item.shelf||'')}</td><td>${escapeHtml(item.bin||'')}</td><td>${escapeHtml(item.preparation||'')}</td><td>${escapeHtml((new Date(item.date_added)).toLocaleString())}</td></tr>`).join('\n');
  return header + `<table><thead><tr><th>Name</th><th>Category</th><th>Quantity</th><th>Unit</th><th>Freezer</th><th>Shelf</th><th>Bin</th><th>Raw / Cooked</th><th>Month Added</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&"'<>]/g, c => ({'&':'&amp;','"':'&quot;','\'':'&#39;','<':'&lt;','>':'&gt;'}[c])); }

function replaceAllCategories(names) {
  db.prepare('DELETE FROM categories').run();
  let count = 0;
  const trx = db.transaction((rows) => {
    for (const name of rows) {
      if (!name) continue;
      try { addCategory(name); count++; } catch(e) {}
    }
  });
  trx(names);
  return count;
}

function replaceAllFreezers(names) {
  db.prepare('DELETE FROM freezers').run();
  let count = 0;
  const trx = db.transaction((rows) => {
    for (const name of rows) {
      if (!name) continue;
      try { addFreezer(name); count++; } catch(e) {}
    }
  });
  trx(names);
  return count;
}

function replaceAllLocations(locs) {
  db.prepare('DELETE FROM locations').run();
  let count = 0;
  const trx = db.transaction((rows) => {
    for (const loc of rows) {
      if (!loc.freezer || !loc.shelf) continue;
      try { addLocation({ freezer: loc.freezer, shelf: loc.shelf, bin: loc.bin || '' }); count++; } catch(e) {}
    }
  });
  trx(locs);
  return count;
}

function replaceAllItemNames(names) {
  db.prepare('DELETE FROM item_names').run();
  let count = 0;
  const trx = db.transaction((rows) => {
    for (const name of rows) {
      if (!name) continue;
      try { addItemName(name); count++; } catch(e) {}
    }
  });
  trx(names);
  return count;
}

// Bulk deletes
function deleteItemsBulk(ids) {
  if (!ids || !ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const info = db.prepare(`DELETE FROM items WHERE id IN (${placeholders})`).run(...ids);
  return info.changes;
}

function deleteCategoriesBulk(ids) {
  if (!ids || !ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const info = db.prepare(`DELETE FROM categories WHERE id IN (${placeholders})`).run(...ids);
  return info.changes;
}

function deleteFreezersBulk(ids) {
  if (!ids || !ids.length) return 0;
  // Only delete freezers whose name is not referenced by any location
  const placeholders = ids.map(() => '?').join(',');
  const info = db.prepare(
    `DELETE FROM freezers WHERE id IN (${placeholders}) AND name NOT IN (SELECT DISTINCT freezer FROM locations)`
  ).run(...ids);
  return info.changes;
}

function deleteLocationsBulk(ids) {
  if (!ids || !ids.length) return 0;
  // Only delete locations not referenced by any item
  const placeholders = ids.map(() => '?').join(',');
  const info = db.prepare(
    `DELETE FROM locations WHERE id IN (${placeholders}) AND id NOT IN (SELECT DISTINCT location_id FROM items WHERE location_id IS NOT NULL)`
  ).run(...ids);
  return info.changes;
}

function deleteItemNamesBulk(ids) {
  if (!ids || !ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const info = db.prepare(`DELETE FROM item_names WHERE id IN (${placeholders})`).run(...ids);
  return info.changes;
}

module.exports = {
  // locations
  getLocations, getLocationById, addLocation, updateLocation, deleteLocation,
  // freezers
  getFreezers, addFreezer, updateFreezer, deleteFreezer,
  // item names
  getItemNames, addItemName, deleteItemName,
  // categories
  getCategories, addCategory, updateCategory, deleteCategory,
  // items
  getItems, getItemById, addItem, updateItem, deleteItem, replaceAllItems,
  // replace-all for admin tables
  replaceAllCategories, replaceAllFreezers, replaceAllLocations, replaceAllItemNames,
  // bulk deletes
  deleteItemsBulk, deleteCategoriesBulk, deleteFreezersBulk, deleteLocationsBulk, deleteItemNamesBulk,
  findOrCreateLocation,
  getPrintHtml,
};
