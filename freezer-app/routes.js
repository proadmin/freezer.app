const express = require('express');
const router = express.Router();
const db = require('./db');
const multer = require('multer');
const upload = multer();
const { parse } = require('csv-parse/sync');
const AdmZip = require('adm-zip');

// Items
router.get('/items', (req, res) => {
  const items = db.getItems({ category: req.query.category, search: req.query.search, location_id: req.query.location });
  res.json(items);
});

router.post('/items', express.json(), (req, res) => {
  try {
    const params = req.body;
    if (!params.location && params.freezer_zone) params.location = params.freezer_zone;
    const item = db.addItem(params);
    res.status(201).json(item);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/items/:id', (req, res) => {
  try { db.deleteItem(req.params.id); res.json({ message: 'Item deleted successfully' }); }
  catch (e) { res.status(404).json({ error: e.message }); }
});

router.put('/items/:id', express.json(), (req, res) => {
  try { const item = db.updateItem(req.params.id, req.body); res.json(item); }
  catch (e) { res.status(404).json({ error: e.message }); }
});

// CSV import/export
router.post('/items/import-csv', upload.single('file'), (req, res) => {
  if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    const isZip = req.file.originalname.toLowerCase().endsWith('.zip') ||
                  req.file.mimetype === 'application/zip' ||
                  req.file.mimetype === 'application/x-zip-compressed';

    if (isZip) {
      const zip = new AdmZip(req.file.buffer);
      const result = {};

      const getEntry = (name) => {
        const e = zip.getEntry(name);
        return e ? e.getData().toString('utf8') : null;
      };

      const parseNormalized = (text) => {
        const records = parse(text, { columns: true, skip_empty_lines: true });
        return records.map(r => {
          const obj = {};
          for (const k of Object.keys(r)) {
            const lower = k.trim().toLowerCase();
            const key = (lower === 'month added' || lower === 'date added') ? 'date_added' : lower;
            obj[key] = r[k];
          }
          return obj;
        });
      };

      const inv = getEntry('inventory.csv');
      if (inv) result.inventory = db.replaceAllItems(parseNormalized(inv));

      const cats = getEntry('categories.csv');
      if (cats) {
        const rows = parse(cats, { columns: true, skip_empty_lines: true });
        result.categories = db.replaceAllCategories(rows.map(r => r.Name || r.name));
      }

      const frzs = getEntry('freezers.csv');
      if (frzs) {
        const rows = parse(frzs, { columns: true, skip_empty_lines: true });
        result.freezers = db.replaceAllFreezers(rows.map(r => r.Name || r.name));
      }

      const locs = getEntry('locations.csv');
      if (locs) {
        const rows = parse(locs, { columns: true, skip_empty_lines: true });
        result.locations = db.replaceAllLocations(rows.map(r => ({
          freezer: r.Freezer || r.freezer,
          shelf: r.Shelf || r.shelf,
          bin: r.Bin || r.bin || '',
        })));
      }

      const inames = getEntry('item-names.csv');
      if (inames) {
        const rows = parse(inames, { columns: true, skip_empty_lines: true });
        result.item_names = db.replaceAllItemNames(rows.map(r => r.Name || r.name));
      }

      return res.json({ imported: result });
    }

    // Plain CSV — inventory only
    const text = req.file.buffer.toString('utf8');
    const records = parse(text, { columns: true, skip_empty_lines: true });
    const mapped = records.map(r => {
      const obj = {};
      for (const k of Object.keys(r)) {
        const lower = k.trim().toLowerCase();
        const key = (lower === 'month added' || lower === 'date added') ? 'date_added' : lower;
        obj[key] = r[k];
      }
      return obj;
    });
    const count = db.replaceAllItems(mapped);
    res.json({ imported: count });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

function buildInventoryCsv(items) {
  const header = ['Name','Category','Quantity','Unit','Freezer','Shelf','Bin','Preparation','Month Added','Notes'];
  const lines = [header.join(',')];
  for (const it of items) {
    const row = [it.name, it.category, it.quantity, it.unit||'', it.freezer||'', it.shelf||'', it.bin||'', it.preparation||'', new Date(it.date_added).toLocaleString('en-US',{year:'numeric',month:'short'}), it.notes||''];
    lines.push(row.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','));
  }
  return lines.join('\n');
}

router.get('/items/export-csv', (req, res) => {
  const dateStr = new Date().toISOString().slice(0,10);
  if (req.query.include === 'admin') {
    const zip = new AdmZip();

    zip.addFile('inventory.csv', Buffer.from(buildInventoryCsv(db.getItems()), 'utf8'));

    const cats = db.getCategories();
    const catCsv = 'Name\n' + cats.map(c => '"' + c.name.replace(/"/g,'""') + '"').join('\n');
    zip.addFile('categories.csv', Buffer.from(catCsv, 'utf8'));

    const frzs = db.getFreezers();
    const frzCsv = 'Name\n' + frzs.map(f => '"' + f.name.replace(/"/g,'""') + '"').join('\n');
    zip.addFile('freezers.csv', Buffer.from(frzCsv, 'utf8'));

    const locs = db.getLocations();
    const locLines = ['Freezer,Shelf,Bin'];
    for (const l of locs) locLines.push([l.freezer, l.shelf, l.bin||''].map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','));
    zip.addFile('locations.csv', Buffer.from(locLines.join('\n'), 'utf8'));

    const inames = db.getItemNames();
    const inameCsv = 'Name\n' + inames.map(n => '"' + n.name.replace(/"/g,'""') + '"').join('\n');
    zip.addFile('item-names.csv', Buffer.from(inameCsv, 'utf8'));

    const buf = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="freezer-inventory-${dateStr}.zip"`);
    res.setHeader('Content-Length', buf.length);
    return res.end(buf);
  }

  const csv = buildInventoryCsv(db.getItems());
  res.json({ csv, filename: `freezer-inventory-${dateStr}.csv` });
});

// Locations
router.get('/locations', (req, res) => {
  const locs = db.getLocations();
  // attach counts
  const items = db.getItems();
  const counts = {};
  items.forEach(i => { if (i.location_id) counts[i.location_id] = (counts[i.location_id]||0)+1; });
  const out = locs.map(l => ({ ...l, item_count: counts[l.id]||0 }));
  res.json(out);
});

router.post('/locations', express.json(), (req, res) => {
  try { const loc = db.addLocation(req.body); res.status(201).json(loc); } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/locations/:id', express.json(), (req, res) => {
  try { const loc = db.updateLocation(parseInt(req.params.id,10), req.body); res.json(loc); } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/locations/:id', (req, res) => {
  try { db.deleteLocation(parseInt(req.params.id,10)); res.json({ message: 'Location deleted' }); } catch (e) { const code = e.message === 'in_use' ? 409 : 404; res.status(code).json({ error: e.message }); }
});

// Freezers
router.get('/freezers', (req, res) => {
  const freezers = db.getFreezers();
  // counts
  const locs = db.getLocations();
  const map = {};
  locs.forEach(l => { map[l.freezer] = (map[l.freezer]||0) + 1; });
  const out = freezers.map(f => ({ ...f, location_count: map[f.name]||0 }));
  res.json(out);
});
router.post('/freezers', express.json(), (req, res) => { try { const f = db.addFreezer(req.body.name); res.status(201).json(f); } catch (e) { res.status(400).json({ error: e.message }); } });
router.delete('/freezers/:id', (req, res) => { try { db.deleteFreezer(parseInt(req.params.id,10)); res.json({ message: 'Freezer deleted' }); } catch (e) { const code = e.message === 'in_use' ? 409 : 404; res.status(code).json({ error: e.message }); } });

// Categories
router.get('/categories', (req, res) => { const cats = db.getCategories(); const counts = {}; db.getItems().forEach(i => counts[i.category] = (counts[i.category]||0)+1); res.json(cats.map(c=>({ ...c, item_count: counts[c.name]||0 }))); });
router.post('/categories', express.json(), (req, res) => { try { const c = db.addCategory(req.body.name); res.status(201).json(c); } catch (e) { res.status(400).json({ error: e.message }); } });
router.delete('/categories/:id', (req, res) => { try { db.deleteCategory(parseInt(req.params.id,10)); res.json({ message: 'Category deleted' }); } catch (e) { res.status(400).json({ error: e.message }); } });

// Item names
router.get('/item-names', (req, res) => { const names = db.getItemNames(); const counts = {}; db.getItems().forEach(i => counts[i.name] = (counts[i.name]||0)+1); res.json(names.map(n=>({ ...n, item_count: counts[n.name]||0 }))); });
router.post('/item-names', express.json(), (req, res) => { try { const n = db.addItemName(req.body.name); res.status(201).json(n); } catch (e) { res.status(400).json({ error: e.message }); } });
router.delete('/item-names/:id', (req, res) => { try { db.deleteItemName(parseInt(req.params.id,10)); res.json({ message: 'Item name deleted' }); } catch (e) { res.status(400).json({ error: e.message }); } });

// PDF HTML
router.get('/inventory/pdf', (req, res) => { const items = db.getItems(); const html = db.getPrintHtml(items); res.json({ html }); });

module.exports = router;
