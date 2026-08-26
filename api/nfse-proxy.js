const TARGET_URL = 'https://serem-hml.joaopessoa.pb.gov.br/notafiscal-abrasfv203-ws/NotaFiscalSoap';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const { soapEnvelope, url = TARGET_URL } = req.body || {};

    if (!soapEnvelope || url !== TARGET_URL) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }

    const response = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '""',
      },
      body: soapEnvelope,
    });

    const responseText = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/xml; charset=utf-8');
    return res.status(response.status).send(responseText);
  } catch (error) {
    console.error('Erro no proxy NFS-e:', error);
    return res.status(502).json({ error: 'Não foi possível conectar ao webservice da prefeitura.' });
  }
};
