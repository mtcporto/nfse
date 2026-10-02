const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
const { verify, X509Certificate } = require('node:crypto');
const { readSigningIdentity, signXml, digestXml } = require('../certificate');

test('OpenSSL PFX import, signature verification, wrong password and corrupt input', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nfse-pfx-test-'));
    const openssl = process.env.OPENSSL_BIN || 'openssl';
    writeFileSync(join(dir, 'openssl.cnf'), '[req]\ndistinguished_name=dn\n[dn]\n');
    const run = (...args) => execFileSync(openssl, args, { cwd: dir, stdio: 'pipe', env: { ...process.env, OPENSSL_CONF: join(dir, 'openssl.cnf') } });
    try {
        run('req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'key.pem', '-out', 'cert.pem', '-days', '1', '-subj', '/CN=Ephemeral Test Only');
        run('pkcs12', '-export', '-inkey', 'key.pem', '-in', 'cert.pem', '-out', 'test.p12', '-passout', 'pass:test-only', '-keypbe', 'AES-256-CBC', '-certpbe', 'AES-256-CBC', '-macalg', 'sha256');
        const bytes = readFileSync(join(dir, 'test.p12'));
        const pfx = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const identity = await readSigningIdentity(pfx, 'test-only');
        assert.equal(identity.privateKey.extractable, false);
        const signature = await signXml('<SignedInfo>test</SignedInfo>', identity.privateKey);
        const certificate = new X509Certificate(Buffer.from(identity.certificateBase64, 'base64'));
        assert.equal(verify('RSA-SHA1', Buffer.from('<SignedInfo>test</SignedInfo>'), certificate.publicKey, Buffer.from(signature, 'base64')), true);
        assert.equal(verify('RSA-SHA1', Buffer.from('modified'), certificate.publicKey, Buffer.from(signature, 'base64')), false);
        assert.equal(await digestXml('abc'), 'qZk+NkcGgWq6PiVxeFDCbJzQ2J0=');
        await assert.rejects(readSigningIdentity(pfx, 'wrong-password'), /validar o PFX/);
        const corrupt = pfx.slice(0); new Uint8Array(corrupt)[corrupt.byteLength - 20] ^= 1;
        await assert.rejects(readSigningIdentity(corrupt, 'test-only'));
        await assert.rejects(readSigningIdentity(new Uint8Array([1, 2, 3]).buffer, 'test-only'));
        run('pkcs12', '-export', '-inkey', 'key.pem', '-in', 'cert.pem', '-out', 'legacy.p12', '-passout', 'pass:test-only', '-keypbe', 'PBE-SHA1-3DES', '-certpbe', 'PBE-SHA1-3DES');
        const legacy = readFileSync(join(dir, 'legacy.p12'));
        await assert.rejects(readSigningIdentity(legacy.buffer.slice(legacy.byteOffset, legacy.byteOffset + legacy.byteLength), 'test-only'), /Reexporte/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
