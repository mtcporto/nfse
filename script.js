const forge = require('node-forge'); // Usar require para compatibilidade com o bundle

document.addEventListener('DOMContentLoaded', () => {
    const gerarEnviarBtn = document.getElementById('gerarEnviarBtn');
    const xmlGeradoPre = document.getElementById('xmlGerado');
    const xmlGeradoSection = document.getElementById('xmlGeradoSection');
    const respostaWsPre = document.getElementById('respostaWs');
    const respostaWsSection = document.getElementById('respostaWsSection');
    const resumoNfseDiv = document.getElementById('resumoNfse');
    const resumoNfseSection = document.getElementById('resumoNfseSection');
    const pfxFile = document.getElementById('pfxFile');
    const pfxPassword = document.getElementById('pfxPassword');

    // Preenche a data de competência com o mês/ano atual
    const today = new Date();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentYear = today.getFullYear();
    document.getElementById('competencia').value = `${currentMonth}/${currentYear}`;


    gerarEnviarBtn.addEventListener('click', async () => {
        // Limpar resultados anteriores
        xmlGeradoPre.textContent = '';
        respostaWsPre.textContent = '';
        resumoNfseDiv.innerHTML = '';
        xmlGeradoSection.style.display = 'none';
        respostaWsSection.style.display = 'none';
        resumoNfseSection.style.display = 'none';

        try {
            const file = pfxFile.files[0];
            const password = pfxPassword.value;

            if (!file || !password) {
                alert('Por favor, selecione o arquivo .PFX e insira a senha.');
                return;
            }

            // Ler o conteúdo do arquivo PFX
            const pfxContent = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });

            // Parsear o arquivo PFX com node-forge e descriptografar com a senha
            const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxContent));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password); // Usando pkcs12FromAsn1 com a senha

            let privateKey = null;
            let certificate = null;

            // Iterar sobre os "safe bags" para encontrar a chave privada e o certificado
            for (let i = 0; i < p12.safeContents.length; ++i) {
                const safeContents = p12.safeContents[i];
                for (let j = 0; j < safeContents.safeBags.length; ++j) {
                    const safeBag = safeContents.safeBags[j];
                    if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
                        privateKey = safeBag.key;
                    } else if (safeBag.type === forge.pki.oids.certBag) {
                        certificate = safeBag.cert;
                    }
                }
            }
            
            if (!privateKey || !certificate) {
                alert('Erro: Não foi possível extrair a chave privada ou o certificado do arquivo PFX. Verifique se o arquivo está correto e a senha.');
                return;
            }

            const dadosPrestador = {
                cnpj: document.getElementById('cnpjPrestador').value.replace(/\D/g, ''),
                inscricaoMunicipal: document.getElementById('imPrestador').value,
                razaoSocial: document.getElementById('razaoPrestador').value
            };

            const tipoDocTomador = document.getElementById('tipoDocTomador').value;
            const docTomador = document.getElementById('docTomador').value.replace(/\D/g, '');
            const dadosTomador = {
                documento: docTomador,
                tipoDoc: tipoDocTomador,
                razaoSocial: document.getElementById('razaoTomador').value,
                endereco: document.getElementById('logradouroTomador').value,
                numero: document.getElementById('numeroTomador').value,
                bairro: document.getElementById('bairroTomador').value,
                codigoMunicipio: document.getElementById('codMunicipioTomador').value,
                uf: document.getElementById('ufTomador').value,
                cep: document.getElementById('cepTomador').value.replace(/\D/g, '')
            };

            const dadosServico = {
                valorServicos: parseFloat(document.getElementById('valorServicos').value).toFixed(2),
                discriminacao: document.getElementById('discriminacao').value,
                itemListaServico: document.getElementById('itemListaServico').value,
                codigoCnae: document.getElementById('codigoCnae').value,
                codigoMunicipioIncidencia: document.getElementById('codigoMunicipioServico').value,
                competencia: document.getElementById('competencia').value // MM/YYYY
            };
            
            // Gerar DataEmissao no formatoYYYY-MM-DD com base na data atual de João Pessoa, Paraíba, Brasil
            const localDate = new Date(); // Obtém a data e hora atual do sistema
            const options = { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' };
            const [month, day, year] = new Intl.DateTimeFormat('en-US', options).format(localDate).split('/');
            const dataEmissao = `${year}-${month}-${day}`;


            // Gerar Competencia no formatoYYYY-MM-DD (primeiro dia do mês)
            const [compMonth, compYear] = dadosServico.competencia.split('/');
            const competenciaFormatted = `${compYear}-${compMonth.padStart(2, '0')}-01`;


            const rpsId = 'rps' + Math.floor(Math.random() * 100000000); // Gerar um ID único e maior para o RPS

            // --- NOVO AJUSTE AQUI: Início do xmlContent diretamente com GerarNfseEnvio e o namespace nfse:
            let xmlContent = `
<GerarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
    <Rps Id="${rpsId}">
        <InfDeclaracaoPrestacaoServico Id="${rpsId}">
            <Rps Id="">
                <IdentificacaoRps>
                    <Numero>${rpsId.replace('rps', '')}</Numero>
                    <Serie>A1</Serie>
                    <Tipo>1</Tipo>
                </IdentificacaoRps>
                <DataEmissao>${dataEmissao}</DataEmissao>
                <Status>1</Status>
            </Rps>
            <Competencia>${competenciaFormatted}</Competencia>
            <Servico>
                <Valores>
                    <ValorServicos>${dadosServico.valorServicos}</ValorServicos>
                    <ValorDeducoes>0.00</ValorDeducoes>
                    <ValorPis>0.00</ValorPis>
                    <ValorCofins>0.00</ValorCofins>
                    <ValorInss>0.00</ValorInss>
                    <ValorIr>0.00</ValorIr>
                    <ValorCsll>0.00</ValorCsll>
                    <OutrasRetencoes>0.00</OutrasRetencoes>
                    <ValTotTributos>0.00</ValTotTributos>
                    <ValorIss>0.00</ValorIss>
                    <Aliquota>0.00</Aliquota>
                    <DescontoIncondicionado>0.00</DescontoIncondicionado>
                    <DescontoCondicionado>0.00</DescontoCondicionado>
                </Valores>
                <IssRetido>2</IssRetido>
                <ItemListaServico>${dadosServico.itemListaServico}</ItemListaServico>
                <CodigoCnae>${dadosServico.codigoCnae}</CodigoCnae>
                <Discriminacao>${dadosServico.discriminacao}</Discriminacao>
                <CodigoMunicipio>${dadosServico.codigoMunicipioIncidencia}</CodigoMunicipio>
                <ExigibilidadeISS>1</ExigibilidadeISS>
                <MunicipioIncidencia>${dadosServico.codigoMunicipioIncidencia}</MunicipioIncidencia>
            </Servico>
            <Prestador>
                <CpfCnpj>
                    <Cnpj>${dadosPrestador.cnpj}</Cnpj>
                </CpfCnpj>
                <InscricaoMunicipal>${dadosPrestador.inscricaoMunicipal}</InscricaoMunicipal>
            </Prestador>
            <Tomador>
                <IdentificacaoTomador>
                    ${dadosTomador.tipoDoc === 'cnpj' ? `<Cnpj>${dadosTomador.documento}</Cnpj>` : `<Cpf>${dadosTomador.documento}</Cpf>`}
                </IdentificacaoTomador>
                <RazaoSocial>${dadosTomador.razaoSocial}</RazaoSocial>
                <Endereco>
                    <Endereco>${dadosTomador.endereco}</Endereco>
                    <Numero>${dadosTomador.numero}</Numero>
                    <Bairro>${dadosTomador.bairro}</Bairro>
                    <CodigoMunicipio>${dadosTomador.codigoMunicipio}</CodigoMunicipio>
                    <Uf>${dadosTomador.uf}</Uf>
                    <Cep>${dadosTomador.cep}</Cep>
                </Endereco>
            </Tomador>
            <OptanteSimplesNacional>2</OptanteSimplesNacional>
            <IncentivoFiscal>2</IncentivoFiscal>
        </InfDeclaracaoPrestacaoServico>
        </Rps>
</GerarNfseEnvio>`;
            // --- FIM DO NOVO AJUSTE ---

            // --- Etapa de Assinatura Digital com node-forge ---
            const xmlDoc = new DOMParser().parseFromString(xmlContent, "application/xml");
            // Agora, o rpsElement deve ser selecionado de dentro do GerarNfseEnvio
            // O target para a assinatura ainda é o Rps, mas o caminho para ele dentro do DOM mudou ligeiramente.
            // Para assinatura, o elemento a ser assinado é o <Rps> que contém a InfDeclaracaoPrestacaoServico
            const rpsElement = xmlDoc.querySelector(`Rps[Id="${rpsId}"]`); // Continua sendo a forma correta de pegar o Rps pelo ID

            // Canonicalização do XML para Digest (C14N)
            // O outerHTML do elemento rpsElement será usado para calcular o digest
            const xmlToDigest = rpsElement.outerHTML;
            
            const md = forge.md.sha1.create();
            md.update(xmlToDigest, 'utf8');
            const digestValue = forge.util.encode64(md.digest().bytes());

            // Montar o bloco SignedInfo
            const signedInfoXml = `
<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
    <Reference URI="#${rpsId}">
        <Transforms>
            <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
        <DigestValue>${digestValue}</DigestValue>
    </Reference>
</SignedInfo>`;

            // Canonicalizar o SignedInfo para assinatura
            const parserSignedInfo = new DOMParser();
            const xmlDocSignedInfo = parserSignedInfo.parseFromString(signedInfoXml, "application/xml");
            const signedInfoCanonical = new XMLSerializer().serializeToString(xmlDocSignedInfo.documentElement);

            // Assinar o SignedInfo canônico
            const mdSignedInfo = forge.md.sha1.create();
            mdSignedInfo.update(signedInfoCanonical, 'utf8');
            const signature = privateKey.sign(mdSignedInfo);
            const signatureValue = forge.util.encode64(signature);

            // Obtenção do certBase64
            const certPem = forge.pki.certificateToPem(certificate);
            const certBase64 = certPem.replace(/(-----(BEGIN|END) CERTIFICATE-----|\s)/g, '');

            // Montar o bloco KeyInfo
            const keyInfoXml = `
<KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
    <X509Data>
        <X509Certificate>${certBase64}</X509Certificate>
    </X509Data>
</KeyInfo>`;

            // Inserir a assinatura no XML original
            const signatureXml = `
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    ${signedInfoXml}
    <SignatureValue>${signatureValue}</SignatureValue>
    ${keyInfoXml}
</Signature>`;

            const rpsNode = xmlDoc.querySelector(`Rps[Id="${rpsId}"]`);
            const signatureNode = new DOMParser().parseFromString(signatureXml, "application/xml").documentElement;
            rpsNode.appendChild(signatureNode);

            // Serializa o DOM XML para a string final.
            // O `XMLSerializer` adicionará os prefixos de namespace (nfse:, etc.) automaticamente
            // com base nas declarações de namespace no documento.
            const finalXmlPayload = new XMLSerializer().serializeToString(xmlDoc);

            // --- Fim da Etapa de Assinatura Digital ---

            // --- Etapa de Envelope SOAP ---
            const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ws="http://nfse.abrasf.org.br"
                  xmlns:nfse="http://www.abrasf.org.br/nfse.xsd">
    <soapenv:Header/>
    <soapenv:Body>
        <ws:GerarNfse>
            ${finalXmlPayload} </ws:GerarNfse>
    </soapenv:Body>
</soapenv:Envelope>`;

            xmlGeradoPre.textContent = formatXml(soapEnvelope);
            xmlGeradoSection.style.display = 'block';

            // --- Etapa de Envio para o Cloudflare Worker ---
            const workerUrl = 'http://127.0.0.1:5000/nfse-proxy'; // URL do seu proxy Python
            const webserviceTargetUrl = 'https://serem-hml.joaopessoa.pb.gov.br/notafiscal-abrasfv203-ws/NotaFiscalSoap'; // O webservice real da prefeitura
            
            const workerPayload = {
                url: webserviceTargetUrl,
                soapEnvelope: soapEnvelope,
                headers: {
                    'SOAPAction': '""' // Passa o SOAPAction para o Worker repassar
                }
            };

            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' // AGORA ENVIAMOS JSON PARA O WORKER
                },
                body: JSON.stringify(workerPayload) // O CORPO É O JSON STRINGIFICADO
            });

            const responseText = await response.text();
            respostaWsPre.textContent = formatXml(responseText);
            respostaWsSection.style.display = 'block';

            // --- Processar Resposta (Opcional) ---
            processarRespostaNfse(responseText, resumoNfseDiv, resumoNfseSection);

        } catch (error) {
            console.error('Erro ao gerar/enviar NFS-e:', error);
            respostaWsPre.textContent = `Erro: ${error.message}\n${error.stack}`;
            respostaWsSection.style.display = 'block';
            respostaWsPre.classList.add('error');
        }
    });

    // Função para formatar XML (indentar)
    function formatXml(xml) {
        let formatted = '';
        const reg = /(>)(<)(\/?)/g;
        xml = xml.replace(reg, '$1\r\n$2$3');
        let pad = 0;
        xml.split('\r\n').forEach(node => {
            let indent = 0;
            if (node.match( /.+<\/\w[^>]*>$/ )) {
                indent = 0;
            } else if (node.match( /^<\/\w/ )) {
                if (pad !== 0) {
                    pad -= 1;
                }
            } else if (node.match( /^<\w[^>]*[^\/]>.*$/ )) {
                indent = 1;
            } else {
                indent = 0;
            }

            let padding = '';
            for (let i = 0; i < pad; i++) {
                padding += '  ';
            }
            formatted += padding + node + '\r\n';
            pad += indent;
        });
        return formatted;
    }

    // Função para processar e exibir resumo da resposta da NFS-e
    function processarRespostaNfse(xmlResponse, resumoDiv, resumoSection) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlResponse, "text/xml");

            const mensagemRetorno = xmlDoc.querySelector('MensagemRetorno');
            if (mensagemRetorno) {
                const codigo = mensagemRetorno.querySelector('Codigo')?.textContent;
                const mensagem = mensagemRetorno.querySelector('Mensagem')?.textContent;
                const correcao = mensagemRetorno.querySelector('Correcao')?.textContent;
                resumoDiv.innerHTML = `
                    <p><strong>Status:</strong> ERRO</p>
                    <p><strong>Código:</strong> ${codigo || 'N/A'}</p>
                    <p><strong>Mensagem:</strong> ${mensagem || 'N/A'}</p>
                    <p><strong>Correção:</strong> ${correcao || 'N/A'}</p>
                `;
            } else {
                const compNfse = xmlDoc.querySelector('CompNfse');
                if (compNfse) {
                    const numeroNfse = compNfse.querySelector('Nfse Numero')?.textContent;
                    const codigoVerificacao = compNfse.querySelector('Nfse CodigoVerificacao')?.textContent;
                    const dataEmissao = compNfse.querySelector('Nfse DataEmissao')?.textContent;
                    const valorServicos = compNfse.querySelector('Nfse ValoresNfse ValorServicos')?.textContent;
                    const razaoSocialPrestador = compNfse.querySelector('Nfse PrestadorServico RazaoSocial')?.textContent;
                    const cnpjPrestador = compNfse.querySelector('Nfse PrestadorServico IdentificacaoPrestador CpfCnpj Cnpj')?.textContent;
                    const razaoSocialTomador = compNfse.querySelector('Nfse DeclaracaoPrestacaoServico Tomador RazaoSocial')?.textContent;
                    const documentoTomador = compNfse.querySelector('Nfse DeclaracaoPrestacaoServico Tomador IdentificacaoTomador CpfCnpj Cpf, Nfse DeclaracaoPrestacaoServico Tomador IdentificacaoTomador CpfCnpj Cnpj')?.textContent;
                    const discriminacao = compNfse.querySelector('Nfse DeclaracaoPrestacaoServico Servico Discriminacao')?.textContent;


                    resumoDiv.innerHTML = `
                        <p><strong>Status:</strong> SUCESSO</p>
                        <p><strong>Número NFS-e:</strong> ${numeroNfse || 'N/A'}</p>
                        <p><strong>Código de Verificação:</strong> ${codigoVerificacao || 'N/A'}</p>
                        <p><strong>Data de Emissão:</strong> ${dataEmissao ? new Date(dataEmissao).toLocaleString() : 'N/A'}</p>
                        <p><strong>Valor dos Serviços:</strong> R$ ${valorServicos || 'N/A'}</p>
                        <hr>
                        <p><strong>Prestador:</strong> ${razaoSocialPrestador || 'N/A'} (CNPJ: ${cnpjPrestador || 'N/A'})</p>
                        <p><strong>Tomador:</strong> ${razaoSocialTomador || 'N/A'} (Doc: ${documentoTomador || 'N/A'})</p>
                        <p><strong>Serviço:</strong> ${discriminacao || 'N/A'}</p>
                    `;
                } else {
                    resumoDiv.innerHTML = '<p>Resposta do webservice não contém NFS-e gerada ou mensagem de erro clara.</p>';
                }
            }
            resumoSection.style.display = 'block';
        } catch (e) {
            console.error('Erro ao processar resposta XML:', e);
            resumoDiv.innerHTML = `<p class="error">Erro ao processar a resposta do webservice: ${e.message}</p>`;
            resumoSection.style.display = 'block';
        }
    }
});