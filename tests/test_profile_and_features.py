import httpx
import time

BASE_URL = "http://localhost:8080/api"

def test_full_features():
    print("=== PROBANDO NUEVAS CARACTERÍSTICAS ===")
    client = httpx.Client(timeout=10.0)

    # 1. Probar obtención de catálogo ampliado de criptos (30+)
    res = client.get(f"{BASE_URL}/crypto/prices?vs_currency=usd&per_page=50")
    assert res.status_code == 200, f"Error obteniendo precios: {res.text}"
    cryptos = res.json().get("data", [])
    print(f"1. Total Criptomonedas Obtenidas: {len(cryptos)} (Esperado: >= 30)")
    assert len(cryptos) >= 30, f"Se esperaban al menos 30 criptos, llegaron {len(cryptos)}"
    symbols = [c["symbol"] for c in cryptos[:10]]
    print(f"   Top 10 símbolos: {symbols}")

    # 2. Registrar usuario de prueba para probar perfil y seguridad
    ts = int(time.time())
    username = f"trader_pro_{ts}"
    email = f"trader_{ts}@gmail.com"
    password = "SuperPassword123"

    reg_payload = {"username": username, "email": email, "password": password}
    reg_res = client.post(f"{BASE_URL}/auth/register", json=reg_payload)
    assert reg_res.status_code == 200, f"Error registro: {reg_res.text}"
    token_data = reg_res.json()
    token = token_data["access_token"]
    wallet_addr = token_data["wallet_address"]
    print(f"2. Usuario Registrado: {username} | Wallet: {wallet_addr}")

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Probar GET /api/auth/me
    me_res = client.get(f"{BASE_URL}/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == username
    print(f"3. Consulta Perfil /me exitosa: {me_res.json()['email']}")

    # 4. Probar actualización de perfil PUT /api/auth/profile
    new_username = f"trader_vip_{ts}"
    new_email = f"vip_{ts}@crypto.com"
    update_res = client.put(
        f"{BASE_URL}/auth/profile",
        headers=headers,
        json={"username": new_username, "email": new_email}
    )
    assert update_res.status_code == 200, f"Error actualizando perfil: {update_res.text}"
    updated_profile = update_res.json()
    assert updated_profile["username"] == new_username
    assert updated_profile["email"] == new_email
    print(f"4. Actualización de Perfil OK: {new_username} ({new_email})")

    # 5. Probar cambio de contraseña POST /api/auth/change-password
    new_pwd = "NewSecurePassword456"
    # Intento con contraseña errónea
    fail_res = client.post(
        f"{BASE_URL}/auth/change-password",
        headers=headers,
        json={"current_password": "WrongPassword", "new_password": new_pwd}
    )
    assert fail_res.status_code == 400, "Debería fallar con clave errónea"
    print("5a. Validación de contraseña incorrecta: Rechazo 400 exitoso")

    # Cambio exitoso
    succ_res = client.post(
        f"{BASE_URL}/auth/change-password",
        headers=headers,
        json={"current_password": password, "new_password": new_pwd}
    )
    assert succ_res.status_code == 200, f"Error cambiando contraseña: {succ_res.text}"
    print("5b. Cambio de contraseña exitoso")

    # Probar login con nueva contraseña
    login_res = client.post(f"{BASE_URL}/auth/login", json={"email": new_email, "password": new_pwd})
    assert login_res.status_code == 200, "Login con nueva clave falló"
    new_token = login_res.json()["access_token"]
    print("5c. Login con nueva contraseña autenticado correctamente")

    # 6. Ejecutar orden simulada para gastar saldo
    order_payload = {"symbol": "BTC", "order_type": "BUY", "quantity": 0.05}
    order_res = client.post(
        f"{BASE_URL}/wallet/simulate/order",
        headers={"Authorization": f"Bearer {new_token}"},
        json=order_payload
    )
    assert order_res.status_code == 200, f"Error en orden: {order_res.text}"
    spent_balance = order_res.json()["updated_wallet"]["fiat_balance"]
    print(f"6. Orden simulada ejecutada. Saldo restante: ${spent_balance:,.2f} USD")
    assert spent_balance < 10000.0

    # 7. Restablecer saldo POST /api/auth/reset-funds
    reset_res = client.post(
        f"{BASE_URL}/auth/reset-funds",
        headers={"Authorization": f"Bearer {new_token}"}
    )
    assert reset_res.status_code == 200, f"Error restableciendo fondos: {reset_res.text}"
    reset_data = reset_res.json()
    assert reset_data["fiat_balance"] == 10000.0
    print(f"7. Restablecimiento de Fondos Virtuales OK: ${reset_data['fiat_balance']:,.2f} USD")

    # 8. Verificar que el frontend sirve correctamente sin errores
    fe_res = client.get("http://localhost:3000/")
    assert fe_res.status_code == 200
    print("8. Frontend HTTP 200 sirviendo correctamente en puerto 3000")

    print("\n[ÉXITO] TODAS LAS PRUEBAS DE PERFIL, SEGURIDAD, CATÁLOGO Y DIVISAS PASARON AL 100%.")

if __name__ == "__main__":
    test_full_features()
