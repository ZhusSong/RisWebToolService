/* eslint-disable @typescript-eslint/no-require-imports -- Load TS modules without a separate test framework. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(file) {
    file = path.resolve(__dirname, '..', file);
    if (cache.has(file)) return cache.get(file);
    const mod = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(
        name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts') : require(name), mod, mod.exports);
    cache.set(file, mod.exports);
    return mod.exports;
}
function leaves(value, prefix = '') {
    return Object.entries(value).flatMap(([key, item]) => typeof item === 'string'
        ? [[prefix + key, item]] : leaves(item, prefix + key + '.'));
}
const { getI18n, resolveLocale } = load('src/lib/i18n.ts');
const { ui } = load('src/messages/ui.ts');
const base = leaves(getI18n('zh-CN').messages).map(([key]) => key).sort();
for (const locale of ['zh-CN', 'en', 'ja']) {
    assert.equal(resolveLocale(locale), locale);
    const entries = leaves(getI18n(locale).messages);
    assert.deepEqual(entries.map(([key]) => key).sort(), base, locale + ': dictionary coverage');
    assert.ok(entries.every(([,text]) => text.trim()), locale + ': empty translation');
    assert.deepEqual(Object.keys(ui[locale]).sort(), Object.keys(ui['zh-CN']).sort());
    for (const key of Object.keys(ui['zh-CN'])) {
        assert.deepEqual((ui[locale][key].match(/\{\w+\}/g) || []).sort(),
            (key.match(/\{\w+\}/g) || []).sort(), locale + ': placeholders');
    }
    assert.equal(getI18n(locale).t('custom-tool'), 'custom-tool');
}
for (const value of [null, undefined, '', 'fr', 'EN', '../en', '<script>']) {
    assert.equal(resolveLocale(value), 'zh-CN');
}
const summary = Object.keys(ui.en).find(key => key.includes('{ips}'));
assert.ok(getI18n('en').t(summary, {ips: 2, views: 4}).includes('2 distinct IPs and 4 page views'));
assert.equal(getI18n('en').t('文本字数统计'), 'Character counter');
assert.equal(getI18n('ja').messages.translator.languages.en, '英語');
console.log('PASS: locale validation, dictionary coverage, placeholders and tool display names.');
