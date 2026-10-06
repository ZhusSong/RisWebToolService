/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness loads TypeScript in an isolated module context. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const root = path.resolve(__dirname, '..') + path.sep;
const req = createRequire(root + 'package.json');
const ts = req('typescript');
const Database = req('better-sqlite3');
function load(file, overrides = {}) {
  const code = ts.transpileModule(fs.readFileSync(root + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(
    name => name === 'server-only' ? {} : (overrides[name] ?? req(name)), mod, mod.exports);
  return mod.exports;
}
(async () => {
  const stats = load('src/lib/visitor-analytics.ts');
  const headers = value => new Headers(value === null ? {} : { 'x-real-ip': value });
  delete process.env.ANALYTICS_TRUST_PROXY;
  assert.equal(stats.getVisitorIp(headers('192.0.2.1')), null);
  process.env.ANALYTICS_TRUST_PROXY = 'true';
  assert.equal(stats.getVisitorIp(headers('192.0.2.1')), '192.0.2.1');
  assert.equal(stats.getVisitorIp(headers('2001:0DB8:0:0:0:0:0:1')), '2001:db8::1');
  assert.equal(stats.getVisitorIp(headers('::ffff:192.0.2.1')), '192.0.2.1');
  for (const value of [null, 'bad', '192.0.2.1, 203.0.113.1', '192.0.2.1:80', 'fe80::1%eth0']) {
    assert.equal(stats.getVisitorIp(headers(value)), null);
  }
  assert.equal(stats.getVisitorIp(new Headers({'x-forwarded-for':'192.0.2.1'})), null);
  const db = new Database(':memory:');
  stats.initializeVisitorStats(db);
  stats.initializeVisitorStats(db);
  stats.recordVisitorPageView(db, '192.0.2.1');
  stats.recordVisitorPageView(db, '192.0.2.1');
  stats.recordVisitorPageView(db, '2001:db8::1');
  db.prepare("INSERT INTO visitor_ip_daily(day,ip,page_views) VALUES(date('now','+9 hours','-29 days'),'192.0.2.1',3)").run();
  db.prepare("INSERT INTO visitor_ip_daily(day,ip,page_views) VALUES(date('now','+9 hours','-30 days'),'192.0.2.99',100)").run();
  const result = stats.readVisitorStats(db);
  assert.equal(result.uniqueIps, 2);
  assert.equal(result.pageViews, 6);
  assert.equal(result.rows.find(x => x.ip === '192.0.2.1').pageViews, 5);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM visitor_ip_daily').get().n, 3);
  assert.ok(result.rows.every(x => x.lastSeen.endsWith('Z')));
  for (let i=1; i<=110; i++) stats.recordVisitorPageView(db, '203.0.113.'+i);
  assert.equal(stats.readVisitorStats(db).uniqueIps, 112);
  assert.equal(stats.readVisitorStats(db).rows.length, 100);
  db.close();
  const routeDb = new Database(':memory:');
  let authenticated = false;
  const route = load('src/app/api/analytics/route.ts', {
    'better-sqlite3': function () { return routeDb; },
    'node:fs': { mkdirSync() {} },
    '../../../lib/admin-auth': { isAdminAuthenticated: async () => authenticated },
    '../../../lib/visitor-analytics': stats,
  });
  const denied = await route.GET();
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('cache-control'), 'no-store');
  assert.ok(!(await denied.text()).includes('192.0.2'));
  const post = (eventType, ip) => route.POST(new Request('http://localhost/api/analytics', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(ip ? {'x-real-ip':ip} : {}) },
    body: JSON.stringify({eventType, toolName:'test', ip:'198.51.100.99'}),
  }));
  assert.equal((await post('page_view','192.0.2.1')).status, 200);
  assert.equal((await post('page_view',null)).status, 200);
  assert.equal((await post('tool_use','192.0.2.2')).status, 200);
  authenticated = true;
  const response = await route.GET();
  const data = await response.json();
  assert.equal(data.pageViews, 2);
  assert.equal(data.toolUses, 1);
  assert.equal(data.visitorStats.uniqueIps, 1);
  assert.equal(data.visitorStats.rows[0].ip, '192.0.2.1');
  assert.equal(data.visitorStats.rows[0].pageViews, 1);
  delete process.env.ANALYTICS_TRUST_PROXY;
  await post('page_view','192.0.2.3');
  assert.equal(stats.readVisitorStats(routeDb).uniqueIps, 1);
  routeDb.close();
  console.log('PASS: proxy gate, IP normalization, forged headers/body, 30-day retention, aggregation, top-100 summary, auth protection and route integration (in-memory DB only).');
})().catch(error => { console.error(error); process.exitCode=1; });
