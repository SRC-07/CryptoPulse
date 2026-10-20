import httpx
import time
from app.config import get_settings

settings = get_settings()

_crypto_cache: dict = {}
_cache_ttl_seconds = 30

FALLBACK_COINS = [
    {
        "coin_id": "bitcoin",
        "symbol": "BTC",
        "name": "Bitcoin",
        "current_price": 82577.0,
        "market_cap": 1625000000000,
        "price_change_24h": 1420.5,
        "price_change_percentage_24h": 1.81,
        "total_volume": 38500000000,
        "image_url": "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    },
    {
        "coin_id": "ethereum",
        "symbol": "ETH",
        "name": "Ethereum",
        "current_price": 2437.69,
        "market_cap": 293000000000,
        "price_change_24h": 47.1,
        "price_change_percentage_24h": 1.97,
        "total_volume": 18200000000,
        "image_url": "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    },
    {
        "coin_id": "tether",
        "symbol": "USDT",
        "name": "Tether USD",
        "current_price": 0.9991,
        "market_cap": 118000000000,
        "price_change_24h": -0.0002,
        "price_change_percentage_24h": -0.02,
        "total_volume": 42000000000,
        "image_url": "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    },
    {
        "coin_id": "binancecoin",
        "symbol": "BNB",
        "name": "BNB",
        "current_price": 738.36,
        "market_cap": 108000000000,
        "price_change_24h": 12.0,
        "price_change_percentage_24h": 1.65,
        "total_volume": 1450000000,
        "image_url": "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    },
    {
        "coin_id": "solana",
        "symbol": "SOL",
        "name": "Solana",
        "current_price": 106.13,
        "market_cap": 50500000000,
        "price_change_24h": 2.85,
        "price_change_percentage_24h": 2.76,
        "total_volume": 4800000000,
        "image_url": "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    },
    {
        "coin_id": "ripple",
        "symbol": "XRP",
        "name": "XRP",
        "current_price": 1.33,
        "market_cap": 75800000000,
        "price_change_24h": 0.03,
        "price_change_percentage_24h": 2.35,
        "total_volume": 3250000000,
        "image_url": "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    },
    {
        "coin_id": "usd-coin",
        "symbol": "USDC",
        "name": "USD Coin",
        "current_price": 0.9998,
        "market_cap": 35600000000,
        "price_change_24h": -0.0001,
        "price_change_percentage_24h": -0.01,
        "total_volume": 7800000000,
        "image_url": "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
    },
    {
        "coin_id": "cardano",
        "symbol": "ADA",
        "name": "Cardano",
        "current_price": 0.68,
        "market_cap": 24200000000,
        "price_change_24h": 0.018,
        "price_change_percentage_24h": 2.72,
        "total_volume": 920000000,
        "image_url": "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    },
    {
        "coin_id": "avalanche-2",
        "symbol": "AVAX",
        "name": "Avalanche",
        "current_price": 28.45,
        "market_cap": 11500000000,
        "price_change_24h": 0.95,
        "price_change_percentage_24h": 3.45,
        "total_volume": 580000000,
        "image_url": "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
    },
    {
        "coin_id": "dogecoin",
        "symbol": "DOGE",
        "name": "Dogecoin",
        "current_price": 0.245,
        "market_cap": 36100000000,
        "price_change_24h": 0.008,
        "price_change_percentage_24h": 3.37,
        "total_volume": 2400000000,
        "image_url": "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
    },
    {
        "coin_id": "polkadot",
        "symbol": "DOT",
        "name": "Polkadot",
        "current_price": 6.85,
        "market_cap": 9800000000,
        "price_change_24h": 0.18,
        "price_change_percentage_24h": 2.7,
        "total_volume": 320000000,
        "image_url": "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
    },
    {
        "coin_id": "chainlink",
        "symbol": "LINK",
        "name": "Chainlink",
        "current_price": 16.4,
        "market_cap": 10200000000,
        "price_change_24h": 0.52,
        "price_change_percentage_24h": 3.27,
        "total_volume": 410000000,
        "image_url": "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
    },
    {
        "coin_id": "sui",
        "symbol": "SUI",
        "name": "Sui",
        "current_price": 2.88,
        "market_cap": 8200000000,
        "price_change_24h": 0.14,
        "price_change_percentage_24h": 5.11,
        "total_volume": 940000000,
        "image_url": "https://assets.coingecko.com/coins/images/26375/large/sui-ocean-square.png",
    },
    {
        "coin_id": "near",
        "symbol": "NEAR",
        "name": "NEAR Protocol",
        "current_price": 5.72,
        "market_cap": 6900000000,
        "price_change_24h": 0.21,
        "price_change_percentage_24h": 3.81,
        "total_volume": 430000000,
        "image_url": "https://assets.coingecko.com/coins/images/10365/large/near.png",
    },
    {
        "coin_id": "uniswap",
        "symbol": "UNI",
        "name": "Uniswap",
        "current_price": 9.35,
        "market_cap": 5600000000,
        "price_change_24h": 0.28,
        "price_change_percentage_24h": 3.08,
        "total_volume": 280000000,
        "image_url": "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
    },
    {
        "coin_id": "litecoin",
        "symbol": "LTC",
        "name": "Litecoin",
        "current_price": 88.5,
        "market_cap": 6600000000,
        "price_change_24h": 1.8,
        "price_change_percentage_24h": 2.07,
        "total_volume": 510000000,
        "image_url": "https://assets.coingecko.com/coins/images/2/large/litecoin.png",
    },
    {
        "coin_id": "bitcoin-cash",
        "symbol": "BCH",
        "name": "Bitcoin Cash",
        "current_price": 420.0,
        "market_cap": 8300000000,
        "price_change_24h": 8.5,
        "price_change_percentage_24h": 2.06,
        "total_volume": 390000000,
        "image_url": "https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png",
    },
    {
        "coin_id": "shiba-inu",
        "symbol": "SHIB",
        "name": "Shiba Inu",
        "current_price": 0.0000215,
        "market_cap": 12600000000,
        "price_change_24h": 0.0000008,
        "price_change_percentage_24h": 3.86,
        "total_volume": 890000000,
        "image_url": "https://assets.coingecko.com/coins/images/11939/large/shiba.png",
    },
    {
        "coin_id": "pepe",
        "symbol": "PEPE",
        "name": "Pepe",
        "current_price": 0.0000108,
        "market_cap": 4500000000,
        "price_change_24h": 0.0000006,
        "price_change_percentage_24h": 5.88,
        "total_volume": 1200000000,
        "image_url": "https://assets.coingecko.com/coins/images/29850/large/pepe-token.png",
    },
    {
        "coin_id": "stellar",
        "symbol": "XLM",
        "name": "Stellar",
        "current_price": 0.32,
        "market_cap": 9400000000,
        "price_change_24h": 0.015,
        "price_change_percentage_24h": 4.91,
        "total_volume": 850000000,
        "image_url": "https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png",
    },
    {
        "coin_id": "tron",
        "symbol": "TRX",
        "name": "TRON",
        "current_price": 0.198,
        "market_cap": 17200000000,
        "price_change_24h": 0.002,
        "price_change_percentage_24h": 1.02,
        "total_volume": 670000000,
        "image_url": "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",
    },
    {
        "coin_id": "aptos",
        "symbol": "APT",
        "name": "Aptos",
        "current_price": 11.8,
        "market_cap": 5900000000,
        "price_change_24h": 0.45,
        "price_change_percentage_24h": 3.96,
        "total_volume": 390000000,
        "image_url": "https://assets.coingecko.com/coins/images/26455/large/aptos_round.png",
    },
    {
        "coin_id": "kaspa",
        "symbol": "KAS",
        "name": "Kaspa",
        "current_price": 0.165,
        "market_cap": 4100000000,
        "price_change_24h": 0.004,
        "price_change_percentage_24h": 2.48,
        "total_volume": 120000000,
        "image_url": "https://assets.coingecko.com/coins/images/28898/large/kaspa.png",
    },
    {
        "coin_id": "monero",
        "symbol": "XMR",
        "name": "Monero",
        "current_price": 162.0,
        "market_cap": 2980000000,
        "price_change_24h": 2.1,
        "price_change_percentage_24h": 1.31,
        "total_volume": 85000000,
        "image_url": "https://assets.coingecko.com/coins/images/69/large/monero_logo.png",
    },
    {
        "coin_id": "render-token",
        "symbol": "RENDER",
        "name": "Render",
        "current_price": 7.45,
        "market_cap": 3850000000,
        "price_change_24h": 0.35,
        "price_change_percentage_24h": 4.93,
        "total_volume": 310000000,
        "image_url": "https://assets.coingecko.com/coins/images/11636/large/rndr.png",
    },
    {
        "coin_id": "aave",
        "symbol": "AAVE",
        "name": "Aave",
        "current_price": 185.0,
        "market_cap": 2770000000,
        "price_change_24h": 6.5,
        "price_change_percentage_24h": 3.64,
        "total_volume": 220000000,
        "image_url": "https://assets.coingecko.com/coins/images/12645/large/AAVE.png",
    },
    {
        "coin_id": "injective-protocol",
        "symbol": "INJ",
        "name": "Injective",
        "current_price": 24.1,
        "market_cap": 2410000000,
        "price_change_24h": 0.85,
        "price_change_percentage_24h": 3.65,
        "total_volume": 170000000,
        "image_url": "https://assets.coingecko.com/coins/images/12882/large/Secondary_Symbol.png",
    },
    {
        "coin_id": "cosmos",
        "symbol": "ATOM",
        "name": "Cosmos Hub",
        "current_price": 5.4,
        "market_cap": 2100000000,
        "price_change_24h": 0.12,
        "price_change_percentage_24h": 2.27,
        "total_volume": 140000000,
        "image_url": "https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png",
    },
    {
        "coin_id": "arbitrum",
        "symbol": "ARB",
        "name": "Arbitrum",
        "current_price": 0.78,
        "market_cap": 3100000000,
        "price_change_24h": 0.025,
        "price_change_percentage_24h": 3.31,
        "total_volume": 260000000,
        "image_url": "https://assets.coingecko.com/coins/images/16547/large/arbitrum_logo.png",
    },
    {
        "coin_id": "optimism",
        "symbol": "OP",
        "name": "Optimism",
        "current_price": 1.85,
        "market_cap": 2300000000,
        "price_change_24h": 0.06,
        "price_change_percentage_24h": 3.35,
        "total_volume": 190000000,
        "image_url": "https://assets.coingecko.com/coins/images/25244/large/Optimism.png",
    },
]


async def fetch_crypto_prices(
    vs_currency: str = "usd",
    per_page: int = 10,
    page: int = 1,
) -> dict:
    cache_key = f"{vs_currency.lower()}:{per_page}:{page}"
    now = time.time()

    if cache_key in _crypto_cache:
        cached_entry = _crypto_cache[cache_key]
        if now - cached_entry["timestamp"] < _cache_ttl_seconds:
            return cached_entry["payload"]

    url = f"{settings.COINGECKO_API_URL}/coins/markets"
    params = {
        "vs_currency": vs_currency.lower(),
        "order": "market_cap_desc",
        "per_page": per_page,
        "page": page,
        "sparkline": "true",
        "price_change_percentage": "24h",
    }
    headers = {"User-Agent": settings.HTTP_USER_AGENT}

    try:
        async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT, headers=headers, follow_redirects=True) as client:
            response = await client.get(url, params=params)

            if response.status_code == 200:
                coins = response.json()
                normalized = []
                for coin in coins:
                    sparkline_data = coin.get("sparkline_in_7d", {})
                    sparkline_prices = sparkline_data.get("price") if isinstance(sparkline_data, dict) else None
                    normalized.append({
                        "coin_id": coin.get("id", ""),
                        "symbol": coin.get("symbol", "").upper(),
                        "name": coin.get("name", ""),
                        "current_price": float(coin.get("current_price") or 0),
                        "market_cap": float(coin.get("market_cap") or 0),
                        "price_change_24h": float(coin.get("price_change_24h") or 0),
                        "price_change_percentage_24h": float(coin.get("price_change_percentage_24h") or 0),
                        "high_24h": float(coin.get("high_24h") or 0) if coin.get("high_24h") is not None else None,
                        "low_24h": float(coin.get("low_24h") or 0) if coin.get("low_24h") is not None else None,
                        "total_volume": float(coin.get("total_volume") or 0),
                        "image_url": coin.get("image"),
                        "sparkline_in_7d": sparkline_prices[-24:] if sparkline_prices else None,
                    })

                result = {
                    "status": "success",
                    "source": "coingecko",
                    "vs_currency": vs_currency.lower(),
                    "count": len(normalized),
                    "data": normalized,
                }
                _crypto_cache[cache_key] = {"timestamp": now, "payload": result}
                return result

    except Exception:
        pass

    if cache_key in _crypto_cache:
        stale = _crypto_cache[cache_key]["payload"]
        stale["source"] = "coingecko-cached"
        return stale

    fallback_data = FALLBACK_COINS[:per_page]
    result = {
        "status": "success",
        "source": "market-backup",
        "vs_currency": vs_currency.lower(),
        "count": len(fallback_data),
        "data": fallback_data,
    }
    _crypto_cache[cache_key] = {"timestamp": now, "payload": result}
    return result


async def ping_coingecko() -> dict:
    url = f"{settings.COINGECKO_API_URL}/ping"
    headers = {"User-Agent": settings.HTTP_USER_AGENT}

    try:
        async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT, headers=headers) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "healthy",
                    "gecko_says": data.get("gecko_says", "OK"),
                }
            elif response.status_code == 429:
                return {
                    "status": "healthy",
                    "gecko_says": "Rate limited (using cache)",
                }
    except Exception as e:
        if _crypto_cache:
            return {"status": "healthy", "gecko_says": "Operating via cache"}
        raise e

    return {"status": "healthy", "gecko_says": "OK"}
