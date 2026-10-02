const { PFX, CryptoEngine } = require('pkijs');

function toBase64(buffer) {
    let binary = '';
    for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
    return btoa(binary);
}

async function readSigningIdentity(pfxContent, password) {
    if (!globalThis.crypto?.subtle) throw new Error('Abra o aplicativo usando HTTPS ou localhost.');
    if (pfxContent.byteLength > 5 * 1024 * 1024) throw new Error('O PFX deve ter no máximo 5 MB.');
    const engine = new CryptoEngine({ name: 'WebCrypto', crypto: globalThis.crypto });
    const passwordBytes = new TextEncoder().encode(password).buffer;
    try {
        const pfx = PFX.fromBER(pfxContent);
        await pfx.parseInternalValues({ password: passwordBytes, checkIntegrity: true }, engine);
        const safe = pfx.parsedValue.authenticatedSafe;
        await safe.parseInternalValues({ safeContents: safe.safeContents.map(() => ({ password: passwordBytes })) }, engine);
        const keys = [];
        const certificates = [];
        for (const content of safe.parsedValue.safeContents) {
            for (const bag of content.value.safeBags) {
                if (bag.bagId === '1.2.840.113549.1.12.10.1.2') {
                    await bag.bagValue.parseInternalValues({ password: passwordBytes }, engine);
                    keys.push(bag.bagValue.parsedValue);
                } else if (bag.bagId === '1.2.840.113549.1.12.10.1.1') {
                    keys.push(bag.bagValue);
                } else if (bag.bagId === '1.2.840.113549.1.12.10.1.3') {
                    certificates.push(bag.bagValue.parsedValue);
                }
            }
        }
        // Match the private key to its certificate, rather than selecting a CA
        // certificate that happens to appear last in a certificate chain.
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        for (const keyInfo of keys) {
            if (keyInfo.privateKeyAlgorithm.algorithmId !== '1.2.840.113549.1.1.1') continue;
            const privateKey = await crypto.subtle.importKey('pkcs8', keyInfo.toSchema().toBER(false),
                { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' }, false, ['sign']);
            const proof = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, challenge);
            for (const certificate of certificates) {
                if (certificate.subjectPublicKeyInfo.algorithm.algorithmId !== '1.2.840.113549.1.1.1') continue;
                const publicKey = await crypto.subtle.importKey('spki', certificate.subjectPublicKeyInfo.toSchema().toBER(false),
                    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' }, false, ['verify']);
                if (await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, proof, challenge)) {
                    return { privateKey, certificateBase64: toBase64(certificate.toSchema().toBER(false)) };
                }
            }
        }
        throw new Error('O PFX não contém uma chave RSA e um certificado correspondente.');
    } catch (error) {
        if (/encryption|algorithm|OID/i.test(error.message)) {
            throw new Error('Formato criptográfico do PFX não suportado. Reexporte o certificado como PFX com AES-256/PBES2; consulte CERTIFICADOS.md.');
        }
        throw new Error('Não foi possível validar o PFX. Verifique a senha, a integridade e se ele contém a chave privada e o certificado correspondente.');
    } finally {
        new Uint8Array(passwordBytes).fill(0);
    }
}

async function digestXml(text) {
    return toBase64(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text)));
}

async function signXml(text, privateKey) {
    return toBase64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(text)));
}

module.exports = { readSigningIdentity, digestXml, signXml };
