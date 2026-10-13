-- Ranking de Combi Loca: un puntaje por partida (la ficha firmada que da /api/partida).

CREATE TABLE IF NOT EXISTS puntajes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  partida   TEXT NOT NULL UNIQUE,   -- id de la ficha: cada partida se guarda una sola vez
  nombre    TEXT NOT NULL,
  clave     TEXT NOT NULL,          -- nombre en minúsculas, para quedarse con el mejor de cada uno
  puntaje   INTEGER NOT NULL,       -- céntimos recaudados
  pasajeros INTEGER NOT NULL,
  duracion  INTEGER NOT NULL,       -- milisegundos de juego
  ip        TEXT NOT NULL,          -- hash de la IP, solo para limitar abusos
  creado    INTEGER NOT NULL        -- milisegundos
);
CREATE INDEX IF NOT EXISTS puntajes_puntaje ON puntajes (puntaje DESC);
CREATE INDEX IF NOT EXISTS puntajes_clave ON puntajes (clave, puntaje DESC);
CREATE INDEX IF NOT EXISTS puntajes_ip_creado ON puntajes (ip, creado);
