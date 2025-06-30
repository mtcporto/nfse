from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app) # Habilita CORS para todas as rotas

WEBSERVICE_TARGET_URL = 'https://serem-hml.joaopessoa.pb.gov.br/notafiscal-abrasfv203-ws/NotaFiscalSoap'

@app.route('/nfse-proxy', methods=['POST', 'OPTIONS'])
def nfse_proxy():
    if request.method == 'OPTIONS':
        # Preflight request para CORS
        resp = Response(status=200)
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, SOAPAction, X-Requested-With'
        resp.headers['Access-Control-Max-Age'] = '86400'
        return resp

    if request.method == 'POST':
        try:
            # O frontend enviará JSON para este proxy
            data = request.get_json()

            if not data or 'soapEnvelope' not in data or 'url' not in data:
                return jsonify({'success': False, 'error': 'Payload JSON inválido. Requer url e soapEnvelope.'}), 400

            soap_envelope = data['soapEnvelope']

            # Cabeçalhos para a requisição real ao webservice da prefeitura
            headers = {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': '""' # Padrão ABRASF v2.03
            }

            # Se houver headers adicionais no payload do frontend
            if 'headers' in data and isinstance(data['headers'], dict):
                headers.update(data['headers'])

            # Fazer a requisição POST para o webservice da prefeitura
            # O timeout aqui é para a requisição do proxy para a prefeitura
            print(f"Proxy: Enviando para {data['url']}")
            print(f"Proxy: Headers: {headers}")

            # O requests.post já lida com o encoding e Content-Length
            proxy_response = requests.post(data['url'], headers=headers, data=soap_envelope, timeout=45) # 45 segundos de timeout

            print(f"Proxy: Recebeu resposta do webservice: {proxy_response.status_code}")

            # Retornar a resposta do webservice para o frontend
            # Certifique-se de manter o Content-Type original da resposta da prefeitura
            # E adicionar os headers CORS para o frontend
            response_headers = dict(proxy_response.headers)
            response_headers['Access-Control-Allow-Origin'] = '*' # Permite CORS para o frontend

            # Retornar o corpo da resposta da prefeitura
            return Response(proxy_response.text, status=proxy_response.status_code, headers=response_headers)

        except requests.exceptions.Timeout:
            print("Proxy: Erro: Requisição para o webservice da prefeitura expirou (timeout).")
            return jsonify({'success': False, 'error': 'Timeout ao conectar com o webservice da prefeitura.'}), 504 # Gateway Timeout

        except requests.exceptions.RequestException as e:
            print(f"Proxy: Erro de requisição: {e}")
            return jsonify({'success': False, 'error': f'Erro ao conectar com o webservice da prefeitura: {e}'}), 502 # Bad Gateway

        except Exception as e:
            print(f"Proxy: Erro inesperado: {e}")
            return jsonify({'success': False, 'error': f'Erro interno do proxy: {e}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) # Rode em http://127.0.0.1:5000/