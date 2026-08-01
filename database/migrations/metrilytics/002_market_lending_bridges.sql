-- ============================================================-- Metrilytics DB Migration 002: Market Data, Lending, Bridges, DEX Networks, ETH/SOL Prices-- ============================================================

-- Lending protocols (TVL + real borrowed amounts from DeFiLlama)
CREATE TABLE IF NOT EXISTS lending_data (
  protocol     TEXT NOT NULL,
  slug         TEXT NOT NULL,
  date         TEXT NOT NULL,
  tvl_usd      REAL NOT NULL,
  borrowed_usd REAL,
  supplied_usd REAL,
  chain        TEXT,
  PRIMARY KEY (slug, date)
);

CREATE INDEX IF NOT EXISTS idx_lending_data_date ON lending_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_lending_data_tvl ON lending_data(tvl_usd DESC);

-- Bridge protocols
CREATE TABLE IF NOT EXISTS bridge_data (
  protocol     TEXT NOT NULL,
  slug         TEXT NOT NULL,
  date         TEXT NOT NULL,
  tvl_usd      REAL NOT NULL,
  chain        TEXT,
  PRIMARY KEY (slug, date)
);

CREATE INDEX IF NOT EXISTS idx_bridge_data_date ON bridge_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_bridge_data_tvl ON bridge_data(tvl_usd DESC);

-- Market data (global crypto cap, volume, dominance from CoinGecko)
CREATE TABLE IF NOT EXISTS market_data (
  date                           TEXT PRIMARY KEY,
  total_market_cap_usd           REAL,
  total_volume_24h_usd           REAL,
  btc_dominance                  REAL,
  eth_dominance                  REAL,
  sol_dominance                  REAL,
  market_cap_change_24h          REAL,
  volume_change_24h              REAL,
  active_cryptocurrencies        INTEGER,
  active_exchanges               INTEGER,
  updated_at                     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_market_data_date ON market_data(date DESC);

-- Token prices (BTC, ETH, SOL, USDC, USDT from CoinGecko)
CREATE TABLE IF NOT EXISTS token_prices (
  symbol           TEXT NOT NULL,
  date             TEXT NOT NULL,
  price_usd        REAL,
  change_24h_pct   REAL,
  market_cap_usd   REAL,
  volume_24h_usd   REAL,
  PRIMARY KEY (symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_token_prices_symbol_date ON token_prices(symbol, date DESC);

-- DEX network stats from DexPaprika
CREATE TABLE IF NOT EXISTS dex_networks (
  network_id       TEXT NOT NULL,
  date             TEXT NOT NULL,
  name             TEXT,
  volume_usd_24h   REAL,
  txns_24h         INTEGER,
  pools_count      INTEGER,
  tokens_count     INTEGER,
  PRIMARY KEY (network_id, date)
);

CREATE INDEX IF NOT EXISTS idx_dex_networks_date ON dex_networks(date DESC);

-- DEX global stats
CREATE TABLE IF NOT EXISTS dex_stats (
  date         TEXT PRIMARY KEY,
  networks     INTEGER,
  dexes        INTEGER,
  pools        INTEGER,
  tokens       INTEGER
);

-- ETH prices (same structure as btc_prices for chart compatibility)
CREATE TABLE IF NOT EXISTS eth_prices (
  date    TEXT PRIMARY KEY,
  open    REAL,
  high    REAL,
  low     REAL,
  close   REAL,
  volume  REAL
);

CREATE INDEX IF NOT EXISTS idx_eth_prices_date ON eth_prices(date DESC);

-- SOL prices (same structure)
CREATE TABLE IF NOT EXISTS sol_prices (
  date    TEXT PRIMARY KEY,
  open    REAL,
  high    REAL,
  low     REAL,
  close   REAL,
  volume  REAL
);

CREATE INDEX IF NOT EXISTS idx_sol_prices_date ON sol_prices(date DESC);
