-- Datos de prueba: pólizas individuales y colectivas en distintos estados.
-- Ids explícitos (< 1000) para que los ejemplos de README y Postman sean reproducibles.
-- Todos los nombres y direcciones son ficticios. prima = canon × meses.

-- 1. INDIVIDUAL ACTIVA
INSERT INTO poliza (id, numero, tipo, estado, tomador, fecha_inicio_vigencia, fecha_fin_vigencia, meses_vigencia, valor_canon, valor_prima, version, fecha_creacion, fecha_actualizacion)
VALUES (1, 'POL-000001', 'INDIVIDUAL', 'ACTIVA', 'Inmobiliaria Andina S.A.S.', DATE '2026-01-01', DATE '2027-01-01', 12, 1500000.00, 18000000.00, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (1, 1, 'Calle 72 # 10-34 Apto 501, Bogotá', 'Laura Gómez', 'Carlos Pérez', 'ACTIVO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. INDIVIDUAL RENOVADA
INSERT INTO poliza (id, numero, tipo, estado, tomador, fecha_inicio_vigencia, fecha_fin_vigencia, meses_vigencia, valor_canon, valor_prima, version, fecha_creacion, fecha_actualizacion)
VALUES (2, 'POL-000002', 'INDIVIDUAL', 'RENOVADA', 'Andrés Rodríguez', DATE '2026-03-01', DATE '2026-09-01', 6, 2104000.00, 12624000.00, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (2, 2, 'Carrera 43A # 1-50 Casa 12, Medellín', 'Juan Martínez', 'Andrés Rodríguez', 'ACTIVO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. INDIVIDUAL CANCELADA
INSERT INTO poliza (id, numero, tipo, estado, tomador, fecha_inicio_vigencia, fecha_fin_vigencia, meses_vigencia, valor_canon, valor_prima, version, fecha_creacion, fecha_actualizacion)
VALUES (3, 'POL-000003', 'INDIVIDUAL', 'CANCELADA', 'Marta Salazar', DATE '2025-06-01', DATE '2026-06-01', 12, 980000.00, 11760000.00, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (3, 3, 'Avenida 6N # 23-61, Cali', 'Pedro Castillo', 'Marta Salazar', 'CANCELADO', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. COLECTIVA ACTIVA con riesgos activos y uno cancelado
INSERT INTO poliza (id, numero, tipo, estado, tomador, fecha_inicio_vigencia, fecha_fin_vigencia, meses_vigencia, valor_canon, valor_prima, version, fecha_creacion, fecha_actualizacion)
VALUES (4, 'POL-000004', 'COLECTIVA', 'ACTIVA', 'Administraciones del Caribe Ltda.', DATE '2026-02-01', DATE '2027-02-01', 12, 4500000.00, 54000000.00, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (4, 4, 'Calle 84 # 51B-20 Local 3, Barranquilla', 'Comercializadora Atlántico', 'Administraciones del Caribe Ltda.', 'ACTIVO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (5, 4, 'Carrera 53 # 76-115 Apto 802, Barranquilla', 'Sofía Herrera', 'Administraciones del Caribe Ltda.', 'ACTIVO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (6, 4, 'Calle 98 # 52-115 Apto 101, Barranquilla', 'Diego Vargas', 'Administraciones del Caribe Ltda.', 'CANCELADO', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 5. COLECTIVA RENOVADA
INSERT INTO poliza (id, numero, tipo, estado, tomador, fecha_inicio_vigencia, fecha_fin_vigencia, meses_vigencia, valor_canon, valor_prima, version, fecha_creacion, fecha_actualizacion)
VALUES (5, 'POL-000005', 'COLECTIVA', 'RENOVADA', 'Propiedad Raíz Santander S.A.', DATE '2026-04-01', DATE '2027-04-01', 12, 3156000.00, 37872000.00, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (7, 5, 'Carrera 27 # 36-14 Apto 304, Bucaramanga', 'Valentina Rojas', 'Propiedad Raíz Santander S.A.', 'ACTIVO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (8, 5, 'Calle 48 # 28-40 Casa 7, Bucaramanga', 'Felipe Ortiz', 'Propiedad Raíz Santander S.A.', 'ACTIVO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 6. COLECTIVA CANCELADA (todos sus riesgos cancelados)
INSERT INTO poliza (id, numero, tipo, estado, tomador, fecha_inicio_vigencia, fecha_fin_vigencia, meses_vigencia, valor_canon, valor_prima, version, fecha_creacion, fecha_actualizacion)
VALUES (6, 'POL-000006', 'COLECTIVA', 'CANCELADA', 'Gestión Inmobiliaria del Eje S.A.S.', DATE '2025-09-01', DATE '2026-09-01', 12, 2800000.00, 33600000.00, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (9, 6, 'Avenida Santander # 45-12, Manizales', 'Camila Restrepo', 'Gestión Inmobiliaria del Eje S.A.S.', 'CANCELADO', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (10, 6, 'Calle 19 # 8-34 Apto 202, Pereira', 'Santiago López', 'Gestión Inmobiliaria del Eje S.A.S.', 'CANCELADO', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 7. COLECTIVA ACTIVA sin riesgos aún
INSERT INTO poliza (id, numero, tipo, estado, tomador, fecha_inicio_vigencia, fecha_fin_vigencia, meses_vigencia, valor_canon, valor_prima, version, fecha_creacion, fecha_actualizacion)
VALUES (7, 'POL-000007', 'COLECTIVA', 'ACTIVA', 'Arrendamientos Boyacá S.A.S.', DATE '2026-07-01', DATE '2027-01-01', 6, 1200000.00, 7200000.00, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 8. INDIVIDUAL ACTIVA
INSERT INTO poliza (id, numero, tipo, estado, tomador, fecha_inicio_vigencia, fecha_fin_vigencia, meses_vigencia, valor_canon, valor_prima, version, fecha_creacion, fecha_actualizacion)
VALUES (8, 'POL-000008', 'INDIVIDUAL', 'ACTIVA', 'Ricardo Mejía', DATE '2026-05-15', DATE '2027-05-15', 12, 2250000.00, 27000000.00, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO riesgo (id, poliza_id, direccion_inmueble, arrendatario, arrendador, estado, version, fecha_creacion, fecha_actualizacion)
VALUES (11, 8, 'Carrera 5 # 26-10 Apto 1102, Cartagena', 'Natalia Cárdenas', 'Ricardo Mejía', 'ACTIVO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
