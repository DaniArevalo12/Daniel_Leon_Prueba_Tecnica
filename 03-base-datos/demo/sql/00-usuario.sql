-- Crea (o recrea) el usuario de la demo en FREEPDB1. Se ejecuta como SYSDBA dentro del contenedor.
WHENEVER SQLERROR EXIT FAILURE
SET FEEDBACK OFF
ALTER SESSION SET CONTAINER = FREEPDB1;

BEGIN
  EXECUTE IMMEDIATE 'DROP USER demo_perf CASCADE';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1918 THEN RAISE; END IF;  -- ORA-01918: el usuario no existe
END;
/

CREATE USER demo_perf IDENTIFIED BY "Demo_Perf_2026" QUOTA UNLIMITED ON users DEFAULT TABLESPACE users;
GRANT CREATE SESSION, CREATE TABLE, CREATE VIEW, CREATE MATERIALIZED VIEW, CREATE PROCEDURE, CREATE SEQUENCE TO demo_perf;
-- Para DBMS_XPLAN.DISPLAY_CURSOR desde SQL*Plus
GRANT SELECT_CATALOG_ROLE TO demo_perf;
-- Para medir lecturas lógicas dentro del procedimiento de medición (los roles no aplican en PL/SQL)
GRANT SELECT ON sys.v_$mystat TO demo_perf;
GRANT SELECT ON sys.v_$statname TO demo_perf;

PROMPT Usuario demo_perf creado en FREEPDB1
EXIT
