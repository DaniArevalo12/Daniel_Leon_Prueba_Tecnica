-- Esquema de pólizas y riesgos.
-- Usa solo sintaxis compatible con Oracle y con H2 en MODE=Oracle.

-- Las secuencias inician en 1000 para reservar el rango inferior a los datos de prueba (V2).
CREATE SEQUENCE seq_poliza START WITH 1000 INCREMENT BY 1;
CREATE SEQUENCE seq_riesgo START WITH 1000 INCREMENT BY 1;
CREATE SEQUENCE seq_numero_poliza START WITH 1000 INCREMENT BY 1;

CREATE TABLE poliza (
    id                    NUMBER(19)     NOT NULL,
    numero                VARCHAR2(20)   NOT NULL,
    tipo                  VARCHAR2(20)   NOT NULL,
    estado                VARCHAR2(20)   NOT NULL,
    tomador               VARCHAR2(150)  NOT NULL,
    fecha_inicio_vigencia DATE           NOT NULL,
    fecha_fin_vigencia    DATE           NOT NULL,
    meses_vigencia        NUMBER(10)     NOT NULL,
    valor_canon           NUMBER(15, 2)  NOT NULL,
    valor_prima           NUMBER(15, 2)  NOT NULL,
    version               NUMBER(19)     DEFAULT 0 NOT NULL,
    fecha_creacion        TIMESTAMP      NOT NULL,
    fecha_actualizacion   TIMESTAMP      NOT NULL,
    CONSTRAINT pk_poliza PRIMARY KEY (id),
    CONSTRAINT uk_poliza_numero UNIQUE (numero),
    CONSTRAINT ck_poliza_tipo CHECK (tipo IN ('INDIVIDUAL', 'COLECTIVA')),
    CONSTRAINT ck_poliza_estado CHECK (estado IN ('ACTIVA', 'RENOVADA', 'CANCELADA')),
    CONSTRAINT ck_poliza_meses CHECK (meses_vigencia > 0),
    CONSTRAINT ck_poliza_canon CHECK (valor_canon > 0),
    CONSTRAINT ck_poliza_vigencia CHECK (fecha_fin_vigencia > fecha_inicio_vigencia)
);

-- Soporta el filtro GET /polizas?tipo=&estado=
CREATE INDEX ix_poliza_tipo_estado ON poliza (tipo, estado);

CREATE TABLE riesgo (
    id                  NUMBER(19)     NOT NULL,
    poliza_id           NUMBER(19)     NOT NULL,
    direccion_inmueble  VARCHAR2(200)  NOT NULL,
    arrendatario        VARCHAR2(150)  NOT NULL,
    arrendador          VARCHAR2(150)  NOT NULL,
    estado              VARCHAR2(20)   NOT NULL,
    version             NUMBER(19)     DEFAULT 0 NOT NULL,
    fecha_creacion      TIMESTAMP      NOT NULL,
    fecha_actualizacion TIMESTAMP      NOT NULL,
    CONSTRAINT pk_riesgo PRIMARY KEY (id),
    CONSTRAINT fk_riesgo_poliza FOREIGN KEY (poliza_id) REFERENCES poliza (id),
    CONSTRAINT ck_riesgo_estado CHECK (estado IN ('ACTIVO', 'CANCELADO'))
);

-- Oracle no indexa automáticamente las llaves foráneas
CREATE INDEX ix_riesgo_poliza ON riesgo (poliza_id);
