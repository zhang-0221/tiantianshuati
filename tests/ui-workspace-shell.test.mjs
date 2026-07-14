import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /class="app workspace-shell"/, 'the app should use the redesigned workspace shell');
assert.match(html, /class="workspace-welcome"/, 'the import view should lead with a learning-workspace welcome area');
assert.match(html, /class="dashboard-rail"/, 'the import view should include the supporting study-information rail');
assert.match(html, /--canvas-dot:/, 'the design system should include the dotted workspace canvas token');
assert.match(html, /--sidebar-ink:/, 'the redesigned shell should define a deeper sidebar color token');
assert.match(html, /--sidebar-surface:\s*#eaf2ff/, 'the detached sidebar should use the requested light-blue surface');
assert.match(html, /\.workspace-shell\{[^}]*gap:/s, 'the sidebar and main workspace should be separated by a visible gap');
assert.match(html, /\.sidebar\{[^}]*border-radius:/s, 'the sidebar should be an independent rounded surface');
assert.match(html, /\.app-main\{[^}]*border-radius:/s, 'the main workspace should be an independent rounded surface');
assert.doesNotMatch(html, /\.import-card \.card-hd::before\{content:'\+'/s, 'the import heading should not have a decorative plus icon');
assert.match(html, /<h2>开始一段专注学习<\/h2>/, 'the welcome title should not end with punctuation');

console.log('workspace shell UI contract passed');
