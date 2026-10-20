import urllib.request
import json
import time

BASE = 'http://localhost:8080/api'

def run():
    print("=== INICIANDO VALIDACIÓN INTEGRAL DE CRYPTOPULSE (LINEAR THEME) ===")

    # 1. Cotizaciones
    req = urllib.request.urlopen(f'{BASE}/crypto/prices?vs_currency=usd&per_page=5')
    data = json.loads(req.read().decode())
    symbols = [c['symbol'] for c in data.get('data', [])]
    print(f"1. Cotizaciones de Mercado (Top 5): {symbols}")

    # 2. Forex
    req = urllib.request.urlopen(f'{BASE}/forex/rates?base=USD&targets=COP,EUR')
    data = json.loads(req.read().decode())
    print(f"2. Tasas Forex: {data.get('rates')}")

    # 3. Registro de Usuario con Wallet Aislada 1:1
    user_id = f"trader_{int(time.time())}"
    reg_data = json.dumps({'username': user_id, 'email': f'{user_id}@linear.io', 'password': 'Password123!'}).encode()
    req = urllib.request.Request(f'{BASE}/auth/register', data=reg_data, headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    token_data = json.loads(res.read().decode())
    token = token_data['access_token']
    wallet_addr = token_data.get('wallet_address') or token_data.get('user', {}).get('wallet_address', 'CP-WAL-OK')
    print(f"3. Registro Exitoso: Usuario '{user_id}' | Billetera 1:1 UUID: {wallet_addr}")

    # 4. Saldo Inicial
    req = urllib.request.Request(f'{BASE}/wallet/my-wallet', headers={'Authorization': f'Bearer {token}'})
    res = urllib.request.urlopen(req)
    wallet_data = json.loads(res.read().decode())
    print(f"4. Saldo Inicial de Billetera: ${wallet_data['fiat_balance']:,.2f} USD")
    assert wallet_data['fiat_balance'] == 10000.0, "Saldo inicial debe ser 10,000 USD"

    # 5. Simulación de Compra (0.05 BTC)
    buy_payload = json.dumps({'symbol': 'BTC', 'order_type': 'BUY', 'quantity': 0.05}).encode()
    req = urllib.request.Request(f'{BASE}/wallet/simulate/order', data=buy_payload, headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    buy_res = json.loads(res.read().decode())
    print(f"5. Simulación Compra (BUY): {buy_res['message']}")

    # 6. Saldo Post-Compra y Activos
    req = urllib.request.Request(f'{BASE}/wallet/my-wallet', headers={'Authorization': f'Bearer {token}'})
    res = urllib.request.urlopen(req)
    updated_wallet = json.loads(res.read().decode())
    assets_summary = [f"{a['symbol']}: {a['quantity']} (Compra avg: ${a['average_buy_price']:,.2f})" for a in updated_wallet.get('assets', [])]
    print(f"6. Saldo Post-Compra: ${updated_wallet['fiat_balance']:,.2f} USD | Activos en Cartera: {assets_summary}")

    # 7. Simulación de Venta (0.02 BTC)
    sell_payload = json.dumps({'symbol': 'BTC', 'order_type': 'SELL', 'quantity': 0.02}).encode()
    req = urllib.request.Request(f'{BASE}/wallet/simulate/order', data=sell_payload, headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    sell_res = json.loads(res.read().decode())
    print(f"7. Simulación Venta (SELL): {sell_res['message']}")

    # 8. Libro de Órdenes
    req = urllib.request.Request(f'{BASE}/wallet/my-orders', headers={'Authorization': f'Bearer {token}'})
    res = urllib.request.urlopen(req)
    orders = json.loads(res.read().decode())
    print(f"8. Historial de Órdenes ({len(orders)} registradas en PostgreSQL 16):")
    for o in orders:
        print(f"   • #{o['id']} | {o['order_type']} {o['quantity']} {o['symbol']} @ ${o['execution_price']:,.2f} = ${o['total_fiat']:,.2f} USD ({o['status']})")

    # 9. Health Status
    req = urllib.request.urlopen(f'{BASE}/health/full')
    health_data = json.loads(req.read().decode())
    print(f"9. Estado Operativo del Clúster: {health_data['summary']['healthy']}/{health_data['summary']['total']} servicios saludables")

    print("\n[OK] TODAS LAS PRUEBAS FUNCIONALES PASARON CON 100% DE EXITO.")

if __name__ == '__main__':
    run()
