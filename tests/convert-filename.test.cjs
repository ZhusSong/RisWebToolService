/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

const exportsObject = {};
const source = fs.readFileSync("src/app/api/convert/route.ts", "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
    },
}).outputText;

new Function("require", "exports", compiled)(
    name => name.includes("request-guard") ? {} : require(name),
    exportsObject,
);

const { convertedFileName } = exportsObject;

test("converted output keeps the selected file base name", () => {
    assert.equal(convertedFileName("年度报告.docx", "pdf"), "年度报告.pdf");
    assert.equal(convertedFileName("archive.final.pdf", "docx"), "archive.final.docx");
});

test("converted output name cannot contain a submitted path", () => {
    assert.equal(convertedFileName("../../report.pdf", "docx"), "report.docx");
    assert.equal(convertedFileName("folder\\report.pdf", "txt"), "report.txt");
});
