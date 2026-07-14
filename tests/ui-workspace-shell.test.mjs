import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /class="app workspace-shell"/, 'the app should use the redesigned workspace shell');
assert.match(html, /class="workspace-welcome"/, 'the import view should lead with a learning-workspace welcome area');
assert.match(html, /class="dashboard-rail"/, 'the import view should include the supporting study-information rail');
assert.match(html, /--canvas-dot:/, 'the design system should include the dotted workspace canvas token');

console.log('workspace shell UI contract passed');
