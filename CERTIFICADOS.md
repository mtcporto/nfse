# Certificados PFX

A leitura de PFX usa PKI.js, e a assinatura RSA usa a implementação WebCrypto do navegador. O arquivo e a senha são processados localmente. A chave importada não pode ser exportada pelo aplicativo. O MAC do PFX é verificado antes do uso, e a chave é combinada com o certificado correspondente mesmo em arquivos que contêm uma cadeia de certificados.

Use HTTPS ou localhost. São aceitos certificados RSA em PFX com proteção PBES2/AES, inclusive exportações modernas do OpenSSL. O algoritmo de assinatura XML RSA/SHA-1 existente foi preservado para compatibilidade com o serviço municipal; essa alteração não certifica a conformidade completa do XML com o provedor.

## PFX antigos

PFX protegidos com RC2 ou 3DES/PBES1 não são aceitos pelo WebCrypto. Reexporte o certificado pelo gerenciador de certificados, incluindo a chave privada e selecionando AES-256, e mantenha o arquivo original. Não envie o PFX ou a senha a serviços de conversão online.

Essa restrição substitui o uso de node-forge, cuja versão publicada apresenta GHSA-86w9-cpqp-85rv. O aplicativo informa explicitamente quando é necessário reexportar, em vez de ignorar a proteção ou usar uma biblioteca vulnerável.

## Testes

`npm test` requer OpenSSL no PATH (ou `OPENSSL_BIN` apontando para o executável). Gera um certificado temporário, exporta um PFX AES, importa, assina, verifica a assinatura com uma implementação independente e rejeita senha incorreta, adulteração e conteúdo inválido. Nenhum certificado de produção é utilizado.
