const { test } = require('node:test');
const assert = require('node:assert/strict');
const { escapeMarkup } = require('../markup');
test('invoice and provider values cannot inject HTML or XML elements', () => {
    assert.equal(escapeMarkup('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    assert.equal(escapeMarkup('A & B </Discriminacao><Valor>0'), 'A &amp; B &lt;/Discriminacao&gt;&lt;Valor&gt;0');
    assert.equal(escapeMarkup('João & Maria'), 'João &amp; Maria');
});
