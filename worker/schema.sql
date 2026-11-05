-- Super Sam :: Bestenliste (Cloudflare D1)
CREATE TABLE IF NOT EXISTS scores (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT    NOT NULL,
  score  INTEGER NOT NULL,
  time   INTEGER NOT NULL,   -- Spielzeit in Sekunden, nur die gewerteten Sektor-Versuche
  deaths INTEGER NOT NULL,
  kills  INTEGER NOT NULL,
  chips  INTEGER NOT NULL,
  ver    INTEGER NOT NULL DEFAULT 1,
  at     INTEGER NOT NULL    -- Unix-Sekunden
);
CREATE INDEX IF NOT EXISTS scores_rank ON scores (score DESC, time ASC, id ASC);
-- Rate-Limit: nur ein gesalzener Hash der IP, nie die IP selbst. Zeilen über 24 Stunden löscht der Worker bei jedem neuen Eintrag.
CREATE TABLE IF NOT EXISTS hits (
  h  TEXT    NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS hits_h ON hits (h, at);
CREATE INDEX IF NOT EXISTS hits_at ON hits (at);
