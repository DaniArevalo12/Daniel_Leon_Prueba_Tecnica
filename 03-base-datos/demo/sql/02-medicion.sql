-- Instrumento de medición. Cada consulta se ejecuta 1 vez de calentamiento + N medidas, trayendo
-- TODAS las filas (como lo haría la aplicación). Se registra el tiempo y las lecturas lógicas reales.
WHENEVER SQLERROR EXIT FAILURE
SET FEEDBACK OFF

CREATE TABLE resultados (
  etiqueta   VARCHAR2(40),
  repeticion NUMBER,
  ms         NUMBER,
  lecturas   NUMBER,
  filas      NUMBER,
  creado     TIMESTAMP DEFAULT SYSTIMESTAMP
);

CREATE OR REPLACE PROCEDURE medir(p_etiqueta VARCHAR2, p_sql CLOB, p_repeticiones PLS_INTEGER DEFAULT 5) AS
  TYPE t_num IS TABLE OF NUMBER;
  TYPE t_fecha IS TABLE OF DATE;
  TYPE t_texto IS TABLE OF VARCHAR2(200);
  v_id     t_num;
  v_fecha  t_fecha;
  v_nombre t_texto;
  v_total  t_num;
  v_cursor SYS_REFCURSOR;
  v_inicio TIMESTAMP;
  v_fin    TIMESTAMP;
  v_lr0    NUMBER;
  v_lr1    NUMBER;
  v_ms     NUMBER;
  v_filas  NUMBER;

  FUNCTION lecturas_logicas RETURN NUMBER IS
    v NUMBER;
  BEGIN
    SELECT m.value INTO v
    FROM v$mystat m JOIN v$statname n ON n.statistic# = m.statistic#
    WHERE n.name = 'session logical reads';
    RETURN v;
  END;
BEGIN
  FOR i IN 0 .. p_repeticiones LOOP          -- i = 0 es calentamiento y no se registra
    v_filas := 0;
    v_lr0 := lecturas_logicas;
    v_inicio := SYSTIMESTAMP;
    OPEN v_cursor FOR p_sql;
    LOOP
      FETCH v_cursor BULK COLLECT INTO v_id, v_fecha, v_nombre, v_total LIMIT 1000;
      v_filas := v_filas + v_id.COUNT;
      EXIT WHEN v_id.COUNT < 1000;
    END LOOP;
    CLOSE v_cursor;
    v_fin := SYSTIMESTAMP;
    v_lr1 := lecturas_logicas;
    v_ms := EXTRACT(SECOND FROM (v_fin - v_inicio)) * 1000 + EXTRACT(MINUTE FROM (v_fin - v_inicio)) * 60000;
    IF i > 0 THEN
      INSERT INTO resultados (etiqueta, repeticion, ms, lecturas, filas)
      VALUES (p_etiqueta, i, v_ms, v_lr1 - v_lr0, v_filas);
    END IF;
  END LOOP;
  COMMIT;
END;
/
SHOW ERRORS

-- Detiene la demo si el procedimiento no compiló (WHENEVER SQLERROR no cubre errores de compilación)
DECLARE
  v_estado VARCHAR2(10);
BEGIN
  SELECT status INTO v_estado FROM user_objects WHERE object_name = 'MEDIR' AND object_type = 'PROCEDURE';
  IF v_estado != 'VALID' THEN
    RAISE_APPLICATION_ERROR(-20001, 'El procedimiento MEDIR no compiló');
  END IF;
END;
/

PROMPT Instrumento de medición creado
EXIT
