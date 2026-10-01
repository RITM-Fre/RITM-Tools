# RITM Tools

Bilingual (fa/en) client-side tools. Plain HTML/CSS/JS, no build step.

**Run:** serve the folder over HTTP (modules, `fetch` and the service worker don't work from `file://`), e.g. `python3 -m http.server`, then open `http://localhost:8000`.

## Add a tool
1. Add an object to `tools/registry.js`:
   ```js
   { id: 'my-tool', n: 29, c: 'extra', i: '✨',
     f: [{ k: 'text', t: 'area' }],             // fields: area | text | num | sel | chk | color
     run: (v, x) => v.text.toUpperCase() }      // return string | {s, p, note}; throw Error('e.empty') etc.
   ```
2. Add `tool.my-tool.n` and `tool.my-tool.d` to every file in `i18n/`.
3. Add any new field labels (`f.<key>`) or option labels (`o.<value>`) there too.

## Add a language
1. Copy `i18n/en.json` to `i18n/<code>.json` and translate it.
2. Extend `setLang` / the language button in `script.js` (direction, digits locale in `fmt`) and add the file to `ASSETS` in `service-worker.js`.

Supported browsers: latest Chrome, Firefox, Safari, Edge.
