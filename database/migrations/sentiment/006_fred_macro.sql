-- ============================================================
-- Migration 007: FRED Macro Economic Indicators (38 series)
-- Source: Federal Reserve Economic Data (FRED API)
-- ============================================================

-- ── Monetary Policy ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fred_sofr_data      (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_walcl_data     (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_rrpontsyd_data (date TEXT PRIMARY KEY, value REAL NOT NULL);

-- ── Inflation ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fred_cpiaucsl_data  (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_cpilfesl_data  (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_pcepi_data     (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_pcepilfe_data  (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_mich_data      (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_t5yie_data     (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_t10yie_data    (date TEXT PRIMARY KEY, value REAL NOT NULL);

-- ── Treasury Yields ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fred_dgs1mo_data    (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_dgs3mo_data    (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_dgs6mo_data    (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_dgs1_data      (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_dgs5_data      (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_dgs20_data     (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_dgs30_data     (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_t10y2y_data    (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_t10y3m_data    (date TEXT PRIMARY KEY, value REAL NOT NULL);

-- ── Money Supply ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fred_mabmm301_data  (date TEXT PRIMARY KEY, value REAL NOT NULL);

-- ── Labor Market ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fred_unrate_data    (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_payems_data    (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_icsa_data      (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_jtsjol_data    (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_emratio_data   (date TEXT PRIMARY KEY, value REAL NOT NULL);

-- ── Growth / Activity ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fred_gdpc1_data     (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_indpro_data    (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_houst_data     (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_umcsent_data   (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_rsxfs_data     (date TEXT PRIMARY KEY, value REAL NOT NULL);

-- ── Financial Conditions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS fred_dcoilwtico_data   (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_bamlh0a0hym2_data (date TEXT PRIMARY KEY, value REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fred_mortgage30us_data  (date TEXT PRIMARY KEY, value REAL NOT NULL);

-- ── Credit ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fred_totalsl_data   (date TEXT PRIMARY KEY, value REAL NOT NULL);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fred_sofr         ON fred_sofr_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_walcl        ON fred_walcl_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_rrpontsyd    ON fred_rrpontsyd_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_cpiaucsl     ON fred_cpiaucsl_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_cpilfesl     ON fred_cpilfesl_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_pcepi        ON fred_pcepi_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_pcepilfe     ON fred_pcepilfe_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_mich         ON fred_mich_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_t5yie        ON fred_t5yie_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_t10yie       ON fred_t10yie_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_dgs1mo       ON fred_dgs1mo_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_dgs3mo       ON fred_dgs3mo_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_dgs6mo       ON fred_dgs6mo_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_dgs1         ON fred_dgs1_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_dgs5         ON fred_dgs5_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_dgs20        ON fred_dgs20_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_dgs30        ON fred_dgs30_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_t10y2y       ON fred_t10y2y_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_t10y3m       ON fred_t10y3m_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_mabmm301     ON fred_mabmm301_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_unrate       ON fred_unrate_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_payems       ON fred_payems_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_icsa         ON fred_icsa_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_jtsjol       ON fred_jtsjol_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_emratio      ON fred_emratio_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_gdpc1        ON fred_gdpc1_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_indpro       ON fred_indpro_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_houst        ON fred_houst_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_umcsent      ON fred_umcsent_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_rsxfs        ON fred_rsxfs_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_dcoilwtico   ON fred_dcoilwtico_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_bamlh0a0hym2 ON fred_bamlh0a0hym2_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_mortgage30us ON fred_mortgage30us_data(date);
CREATE INDEX IF NOT EXISTS idx_fred_totalsl      ON fred_totalsl_data(date);
