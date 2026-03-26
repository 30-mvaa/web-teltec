--
-- PostgreSQL database dump
--

\restrict 5hH3jIiGtguZo9jgi19CaTwODgfzEAq9VWlJUNfCdCZnKDfFu0w7dGbp0tNU2z4

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: teltec_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO teltec_user;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: teltec_user
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: actualizar_deuda_cliente(integer); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.actualizar_deuda_cliente(cliente_id_param integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    resultado RECORD;
BEGIN
    SELECT * INTO resultado FROM calcular_meses_pendientes_cliente(cliente_id_param);
    
    IF resultado IS NULL THEN
        RETURN FALSE;
    END IF;
    
    UPDATE clientes 
    SET 
        meses_pendientes = resultado.meses_pendientes,
        monto_total_deuda = resultado.monto_deuda,
        estado_pago = resultado.estado_pago,
        fecha_ultimo_pago = resultado.fecha_ultimo_pago,
        fecha_vencimiento_pago = resultado.fecha_vencimiento,
        fecha_actualizacion = NOW()
    WHERE id = cliente_id_param;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.actualizar_deuda_cliente(cliente_id_param integer) OWNER TO teltec_user;

--
-- Name: FUNCTION actualizar_deuda_cliente(cliente_id_param integer); Type: COMMENT; Schema: public; Owner: teltec_user
--

COMMENT ON FUNCTION public.actualizar_deuda_cliente(cliente_id_param integer) IS 'Actualiza la deuda de un cliente específico';


--
-- Name: actualizar_deudas_automatico(); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.actualizar_deudas_automatico() RETURNS TABLE(cliente_id integer, cedula character varying, nombres character varying, apellidos character varying, meses_pendientes_anterior integer, meses_pendientes_nuevo integer, deuda_anterior numeric, deuda_nueva numeric, estado_anterior character varying, estado_nuevo character varying)
    LANGUAGE plpgsql
    AS $$
                DECLARE
                    cliente_record RECORD;
                    fecha_ref DATE := '2025-08-31';
                    meses_transcurridos INTEGER;
                    meses_pagados INTEGER;
                    meses_pendientes INTEGER;
                    monto_deuda DECIMAL;
                    estado_pago VARCHAR;
                    fecha_ultimo_pago DATE;
                    fecha_vencimiento DATE;
                BEGIN
                    -- Iterar sobre todos los clientes activos
                    FOR cliente_record IN 
                        SELECT c.id, c.cedula, c.nombres, c.apellidos, c.precio_plan, 
                               c.fecha_registro, c.meses_pendientes, c.monto_total_deuda, c.estado_pago
                        FROM clientes c
                        WHERE c.estado = 'activo'
                    LOOP
                        -- Calcular meses transcurridos desde el registro
                        meses_transcurridos := EXTRACT(YEAR FROM AGE(fecha_ref, cliente_record.fecha_registro)) * 12 + 
                                              EXTRACT(MONTH FROM AGE(fecha_ref, cliente_record.fecha_registro));
                        
                        -- Calcular meses pagados
                        SELECT COALESCE(SUM(monto), 0) INTO monto_deuda
                        FROM pagos 
                        WHERE pagos.cliente_id = cliente_record.id AND pagos.estado = 'completado';
                        
                        IF cliente_record.precio_plan > 0 THEN
                            meses_pagados := FLOOR(monto_deuda / cliente_record.precio_plan);
                        ELSE
                            meses_pagados := 0;
                        END IF;
                        
                        -- Calcular meses pendientes
                        meses_pendientes := GREATEST(0, meses_transcurridos - meses_pagados);
                        monto_deuda := meses_pendientes * cliente_record.precio_plan;
                        
                        -- Determinar estado del pago
                        IF meses_pendientes = 0 THEN
                            estado_pago := 'al_dia';
                        ELSIF meses_pendientes = 1 THEN
                            estado_pago := 'proximo_vencimiento';
                        ELSIF meses_pendientes <= 2 THEN
                            estado_pago := 'vencido';
                        ELSE
                            estado_pago := 'corte_pendiente';
                        END IF;
                        
                        -- Obtener fecha del último pago
                        SELECT MAX(fecha_pago) INTO fecha_ultimo_pago
                        FROM pagos 
                        WHERE pagos.cliente_id = cliente_record.id AND pagos.estado = 'completado';
                        
                        -- Calcular fecha de vencimiento
                        fecha_vencimiento := cliente_record.fecha_registro + INTERVAL '30 days';
                        
                        -- Actualizar cliente
                        UPDATE clientes 
                        SET meses_pendientes = meses_pendientes,
                            monto_total_deuda = monto_deuda,
                            estado_pago = estado_pago,
                            fecha_ultimo_pago = fecha_ultimo_pago,
                            fecha_vencimiento_pago = fecha_vencimiento,
                            fecha_actualizacion = NOW()
                        WHERE clientes.id = cliente_record.id;
                        
                        -- Retornar información del cambio
                        cliente_id := cliente_record.id;
                        cedula := cliente_record.cedula;
                        nombres := cliente_record.nombres;
                        apellidos := cliente_record.apellidos;
                        meses_pendientes_anterior := cliente_record.meses_pendientes;
                        meses_pendientes_nuevo := meses_pendientes;
                        deuda_anterior := cliente_record.monto_total_deuda;
                        deuda_nueva := monto_deuda;
                        estado_anterior := cliente_record.estado_pago;
                        estado_nuevo := estado_pago;
                        
                        RETURN NEXT;
                    END LOOP;
                    
                    RETURN;
                END;
                $$;


ALTER FUNCTION public.actualizar_deudas_automatico() OWNER TO teltec_user;

--
-- Name: actualizar_deudas_todos_clientes(); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.actualizar_deudas_todos_clientes() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    cliente_record RECORD;
    clientes_actualizados INTEGER := 0;
BEGIN
    FOR cliente_record IN SELECT id FROM clientes WHERE estado = 'activo'
    LOOP
        IF actualizar_deuda_cliente(cliente_record.id) THEN
            clientes_actualizados := clientes_actualizados + 1;
        END IF;
    END LOOP;
    
    RETURN clientes_actualizados;
END;
$$;


ALTER FUNCTION public.actualizar_deudas_todos_clientes() OWNER TO teltec_user;

--
-- Name: FUNCTION actualizar_deudas_todos_clientes(); Type: COMMENT; Schema: public; Owner: teltec_user
--

COMMENT ON FUNCTION public.actualizar_deudas_todos_clientes() IS 'Actualiza las deudas de todos los clientes activos';


--
-- Name: actualizar_fecha_actualizacion(); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.actualizar_fecha_actualizacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_fecha_actualizacion() OWNER TO teltec_user;

--
-- Name: asignar_numero_comprobante(); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.asignar_numero_comprobante() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.numero_comprobante IS NULL OR NEW.numero_comprobante = '' THEN
        NEW.numero_comprobante := generar_numero_comprobante();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.asignar_numero_comprobante() OWNER TO teltec_user;

--
-- Name: calcular_meses_pendientes_cliente(integer); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.calcular_meses_pendientes_cliente(cliente_id_param integer) RETURNS TABLE(meses_pendientes integer, monto_deuda numeric, estado_pago character varying, fecha_ultimo_pago date, fecha_vencimiento date)
    LANGUAGE plpgsql
    AS $$
DECLARE
    cliente_record RECORD;
    meses_desde_registro INTEGER;
    meses_pagados INTEGER;
    meses_pendientes_calc INTEGER;
    monto_deuda_calc DECIMAL(10,2);
    estado_pago_calc VARCHAR(20);
    fecha_ultimo_pago_calc DATE;
    fecha_vencimiento_calc DATE;
    fecha_actual DATE := CURRENT_DATE;
BEGIN
    -- Obtener datos del cliente
    SELECT c.id, c.fecha_registro, c.precio_plan
    INTO cliente_record
    FROM clientes c
    WHERE c.id = cliente_id_param;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calcular meses desde registro hasta el mes actual (INCLUYENDO EL MES ACTUAL)
    IF EXTRACT(YEAR FROM cliente_record.fecha_registro) = EXTRACT(YEAR FROM fecha_actual) THEN
        meses_desde_registro := EXTRACT(MONTH FROM fecha_actual) - EXTRACT(MONTH FROM cliente_record.fecha_registro) + 1;
    ELSE
        meses_desde_registro := (EXTRACT(YEAR FROM fecha_actual) - EXTRACT(YEAR FROM cliente_record.fecha_registro)) * 12 + 
                               (EXTRACT(MONTH FROM fecha_actual) - EXTRACT(MONTH FROM cliente_record.fecha_registro) + 1);
    END IF;
    
    -- Calcular meses pagados basándose en los conceptos de los pagos (como en recaudación)
    SELECT COUNT(DISTINCT 
        CASE 
            WHEN concepto ILIKE '%January%' OR concepto ILIKE '%Enero%' THEN '2025-01'
            WHEN concepto ILIKE '%February%' OR concepto ILIKE '%Febrero%' THEN '2025-02'
            WHEN concepto ILIKE '%March%' OR concepto ILIKE '%Marzo%' THEN '2025-03'
            WHEN concepto ILIKE '%April%' OR concepto ILIKE '%Abril%' THEN '2025-04'
            WHEN concepto ILIKE '%May%' OR concepto ILIKE '%Mayo%' THEN '2025-05'
            WHEN concepto ILIKE '%June%' OR concepto ILIKE '%Junio%' THEN '2025-06'
            WHEN concepto ILIKE '%July%' OR concepto ILIKE '%Julio%' THEN '2025-07'
            WHEN concepto ILIKE '%August%' OR concepto ILIKE '%Agosto%' THEN '2025-08'
            WHEN concepto ILIKE '%September%' OR concepto ILIKE '%Septiembre%' THEN '2025-09'
            WHEN concepto ILIKE '%October%' OR concepto ILIKE '%Octubre%' THEN '2025-10'
            WHEN concepto ILIKE '%November%' OR concepto ILIKE '%Noviembre%' THEN '2025-11'
            WHEN concepto ILIKE '%December%' OR concepto ILIKE '%Diciembre%' THEN '2025-12'
        END
    )
    INTO meses_pagados
    FROM pagos 
    WHERE cliente_id = cliente_id_param 
    AND estado = 'completado'
    AND (concepto ILIKE '%Pago mensual%' OR concepto ILIKE '%Pago distribuido%');
    
    -- Calcular meses pendientes
    meses_pendientes_calc := GREATEST(0, meses_desde_registro - meses_pagados);
    monto_deuda_calc := meses_pendientes_calc * cliente_record.precio_plan;
    
    -- Determinar estado del pago
    IF meses_pendientes_calc = 0 THEN
        estado_pago_calc := 'al_dia';
    ELSIF meses_pendientes_calc = 1 THEN
        estado_pago_calc := 'proximo_vencimiento';
    ELSE
        estado_pago_calc := 'vencido';
    END IF;
    
    -- Obtener fecha del último pago
    SELECT MAX(fecha_pago) INTO fecha_ultimo_pago_calc
    FROM pagos 
    WHERE cliente_id = cliente_id_param AND estado = 'completado';
    
    -- Calcular fecha de vencimiento (próximo mes desde la fecha actual)
    fecha_vencimiento_calc := fecha_actual + INTERVAL '1 month';
    
    RETURN QUERY SELECT 
        meses_pendientes_calc,
        monto_deuda_calc,
        estado_pago_calc,
        fecha_ultimo_pago_calc,
        fecha_vencimiento_calc;
END;
$$;


ALTER FUNCTION public.calcular_meses_pendientes_cliente(cliente_id_param integer) OWNER TO teltec_user;

--
-- Name: FUNCTION calcular_meses_pendientes_cliente(cliente_id_param integer); Type: COMMENT; Schema: public; Owner: teltec_user
--

COMMENT ON FUNCTION public.calcular_meses_pendientes_cliente(cliente_id_param integer) IS 'Calcula los meses pendientes basándose en pagos reales registrados';


--
-- Name: generar_cuotas_mensuales(); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.generar_cuotas_mensuales() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    cliente RECORD;
    fecha_inicio DATE;
    fecha_actual DATE := CURRENT_DATE;
    v_mes INT;
    v_anio INT;
    fecha_cuota DATE;
BEGIN
    FOR cliente IN SELECT id, fecha_registro, precio_plan FROM clientes WHERE estado = 'activo' LOOP
        fecha_inicio := date_trunc('month', cliente.fecha_registro);
        WHILE fecha_inicio <= date_trunc('month', fecha_actual) LOOP
            v_mes := EXTRACT(MONTH FROM fecha_inicio);
            v_anio := EXTRACT(YEAR FROM fecha_inicio);
            -- Solo insertar si no existe ya una cuota para ese mes/año
            IF NOT EXISTS (
                SELECT 1 FROM cuotas_mensuales
                WHERE cliente_id = cliente.id AND mes = v_mes AND año = v_anio
            ) THEN
                -- Fecha de vencimiento: el 5 del mes siguiente, por ejemplo
                fecha_cuota := (fecha_inicio + INTERVAL '1 month')::date;
                fecha_cuota := fecha_cuota + (5 - 1); -- 5 = día de vencimiento
                INSERT INTO cuotas_mensuales (cliente_id, mes, año, monto, fecha_vencimiento, estado)
                VALUES (cliente.id, v_mes, v_anio, cliente.precio_plan, fecha_cuota, 'pendiente');
            END IF;
            -- Siguiente mes
            fecha_inicio := (fecha_inicio + INTERVAL '1 month')::date;
        END LOOP;
    END LOOP;
END;
$$;


ALTER FUNCTION public.generar_cuotas_mensuales() OWNER TO teltec_user;

--
-- Name: generar_numero_comprobante(); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.generar_numero_comprobante() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    numero TEXT;
    existe BOOLEAN;
BEGIN
    LOOP
        numero := 'COMP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0');
        SELECT EXISTS(SELECT 1 FROM pagos WHERE numero_comprobante = numero) INTO existe;
        IF NOT existe THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN numero;
END;
$$;


ALTER FUNCTION public.generar_numero_comprobante() OWNER TO teltec_user;

--
-- Name: mantenimiento_diario_deudas(); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.mantenimiento_diario_deudas() RETURNS TABLE(operacion character varying, resultado character varying, fecha_operacion timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
                DECLARE
                    fecha_ref DATE := '2025-08-31';
                    clientes_actualizados INTEGER := 0;
                    inconsistencias_encontradas INTEGER := 0;
                BEGIN
                    -- Limpiar cache (simulado)
                    operacion := 'limpiar_cache';
                    resultado := 'Cache limpiado exitosamente';
                    fecha_operacion := NOW();
                    RETURN NEXT;
                    
                    -- Verificar inconsistencias
                    SELECT COUNT(*) INTO inconsistencias_encontradas
                    FROM clientes c
                    WHERE c.estado = 'activo'
                    AND c.meses_pendientes != (
                        SELECT GREATEST(0, 
                            EXTRACT(YEAR FROM AGE(fecha_ref, c.fecha_registro)) * 12 + 
                            EXTRACT(MONTH FROM AGE(fecha_ref, c.fecha_registro)) - 
                            FLOOR(COALESCE(SUM(p.monto), 0) / c.precio_plan)
                        )
                        FROM pagos p 
                        WHERE p.cliente_id = c.id AND p.estado = 'completado'
                    );
                    
                    operacion := 'verificar_inconsistencias';
                    resultado := FORMAT('Encontradas %s inconsistencias', inconsistencias_encontradas);
                    fecha_operacion := NOW();
                    RETURN NEXT;
                    
                    -- Actualizar deudas si hay inconsistencias
                    IF inconsistencias_encontradas > 0 THEN
                        SELECT COUNT(*) INTO clientes_actualizados
                        FROM actualizar_deudas_automatico();
                        
                        operacion := 'actualizar_deudas';
                        resultado := FORMAT('Actualizados %s clientes', clientes_actualizados);
                        fecha_operacion := NOW();
                        RETURN NEXT;
                    ELSE
                        operacion := 'actualizar_deudas';
                        resultado := 'No se requieren actualizaciones';
                        fecha_operacion := NOW();
                        RETURN NEXT;
                    END IF;
                    
                    -- Generar estadísticas
                    operacion := 'generar_estadisticas';
                    resultado := 'Estadísticas generadas exitosamente';
                    fecha_operacion := NOW();
                    RETURN NEXT;
                    
                    RETURN;
                END;
                $$;


ALTER FUNCTION public.mantenimiento_diario_deudas() OWNER TO teltec_user;

--
-- Name: obtener_meses_disponibles_cliente(integer); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.obtener_meses_disponibles_cliente(cliente_id_param integer) RETURNS TABLE("año" integer, mes integer, nombre_mes character varying, ya_pagado boolean, monto numeric, fecha_limite date)
    LANGUAGE plpgsql
    AS $$
DECLARE
    cliente_record RECORD;
    fecha_actual DATE := CURRENT_DATE;
    año_actual INTEGER := EXTRACT(YEAR FROM fecha_actual);
    mes_actual INTEGER := EXTRACT(MONTH FROM fecha_actual);
    año_inicio INTEGER;
    fecha_inicio DATE;
    fecha_fin DATE;
    fecha_iter DATE;
    nombre_mes_iter VARCHAR(20);
    ya_pagado_iter BOOLEAN;
BEGIN
    -- Obtener datos del cliente
    SELECT c.fecha_registro, c.precio_plan
    INTO cliente_record
    FROM clientes c
    WHERE c.id = cliente_id_param;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calcular año de inicio (máximo 3 años hacia atrás)
    año_inicio := GREATEST(2023, año_actual - 3);
    fecha_inicio := DATE(año_inicio || '-01-01');
    fecha_fin := fecha_actual;
    
    fecha_iter := fecha_inicio;
    WHILE fecha_iter <= fecha_fin LOOP
        -- Obtener nombre del mes
        nombre_mes_iter := CASE EXTRACT(MONTH FROM fecha_iter)
            WHEN 1 THEN 'Enero'
            WHEN 2 THEN 'Febrero'
            WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril'
            WHEN 5 THEN 'Mayo'
            WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio'
            WHEN 8 THEN 'Agosto'
            WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre'
            WHEN 11 THEN 'Noviembre'
            WHEN 12 THEN 'Diciembre'
        END;
        
        -- Verificar si ya está pagado
        SELECT EXISTS(
            SELECT 1 FROM pagos 
            WHERE cliente_id = cliente_id_param 
            AND estado = 'completado'
            AND concepto ILIKE '%' || nombre_mes_iter || '%'
            AND concepto ILIKE '%' || EXTRACT(YEAR FROM fecha_iter)::TEXT || '%'
        ) INTO ya_pagado_iter;
        
        RETURN QUERY SELECT 
            EXTRACT(YEAR FROM fecha_iter)::INTEGER,
            EXTRACT(MONTH FROM fecha_iter)::INTEGER,
            nombre_mes_iter,
            ya_pagado_iter,
            cliente_record.precio_plan,
            fecha_iter + INTERVAL '1 month' - INTERVAL '1 day' + INTERVAL '5 days'  -- Día 5 del mes siguiente
        ;
        
        -- Avanzar al siguiente mes
        fecha_iter := fecha_iter + INTERVAL '1 month';
    END LOOP;
END;
$$;


ALTER FUNCTION public.obtener_meses_disponibles_cliente(cliente_id_param integer) OWNER TO teltec_user;

--
-- Name: FUNCTION obtener_meses_disponibles_cliente(cliente_id_param integer); Type: COMMENT; Schema: public; Owner: teltec_user
--

COMMENT ON FUNCTION public.obtener_meses_disponibles_cliente(cliente_id_param integer) IS 'Obtiene meses disponibles para pago (como en recaudación)';


--
-- Name: sincronizar_pago_con_cuotas(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sincronizar_pago_con_cuotas(pago_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $_$
DECLARE
    pago_record RECORD;
    cuota_record RECORD;
    monto_restante DECIMAL(10,2);
    monto_aplicar DECIMAL(10,2);
    meses_cubiertos INTEGER := 0;
BEGIN
    -- Obtener información del pago
    SELECT * INTO pago_record 
    FROM pagos 
    WHERE id = pago_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pago no encontrado: %', pago_id;
    END IF;
    
    -- Inicializar monto restante
    monto_restante := pago_record.monto;
    
    -- Procesar cuotas pendientes y vencidas del cliente
    FOR cuota_record IN 
        SELECT id, monto, estado, fecha_vencimiento
        FROM cuotas_mensuales 
        WHERE cliente_id = pago_record.cliente_id 
        AND estado IN ('pendiente', 'vencido')
        ORDER BY año ASC, mes ASC
    LOOP
        -- Si ya no hay monto restante, salir
        IF monto_restante <= 0 THEN
            EXIT;
        END IF;
        
        -- Calcular cuánto aplicar a esta cuota
        monto_aplicar := LEAST(monto_restante, cuota_record.monto);
        
        -- Actualizar la cuota
        UPDATE cuotas_mensuales 
        SET 
            estado = 'pagado',
            fecha_pago = pago_record.fecha_pago,
            pago_id = pago_record.id
        WHERE id = cuota_record.id;
        
        -- Registrar en historial
        INSERT INTO historial_pagos_cliente (
            cliente_id, 
            pago_id, 
            monto_pagado, 
            concepto, 
            fecha_pago, 
            meses_cubiertos
        ) VALUES (
            pago_record.cliente_id,
            pago_record.id,
            monto_aplicar,
            pago_record.concepto,
            pago_record.fecha_pago,
            1
        );
        
        -- Actualizar contadores
        monto_restante := monto_restante - monto_aplicar;
        meses_cubiertos := meses_cubiertos + 1;
    END LOOP;
    
    -- Actualizar información del cliente
    UPDATE clientes 
    SET 
        fecha_ultimo_pago = pago_record.fecha_pago,
        monto_total_deuda = (
            SELECT COALESCE(SUM(monto), 0)
            FROM cuotas_mensuales 
            WHERE cliente_id = pago_record.cliente_id 
            AND estado IN ('pendiente', 'vencido')
        ),
        meses_pendientes = (
            SELECT COUNT(*)
            FROM cuotas_mensuales 
            WHERE cliente_id = pago_record.cliente_id 
            AND estado IN ('pendiente', 'vencido')
        ),
        estado_pago = CASE 
            WHEN (
                SELECT COUNT(*)
                FROM cuotas_mensuales 
                WHERE cliente_id = pago_record.cliente_id 
                AND estado = 'vencido'
            ) > 0 THEN 'vencido'
            WHEN (
                SELECT COUNT(*)
                FROM cuotas_mensuales 
                WHERE cliente_id = pago_record.cliente_id 
                AND estado IN ('pendiente', 'vencido')
            ) > 0 THEN 'pendiente'
            ELSE 'al_dia'
        END
    WHERE id = pago_record.cliente_id;
    
    RAISE NOTICE 'Pago % sincronizado: % meses cubiertos, $% restante', 
        pago_id, meses_cubiertos, monto_restante;
END;
$_$;


ALTER FUNCTION public.sincronizar_pago_con_cuotas(pago_id integer) OWNER TO postgres;

--
-- Name: sincronizar_pagos_existentes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sincronizar_pagos_existentes() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    pago_record RECORD;
BEGIN
    -- Procesar todos los pagos completados que no han sido sincronizados
    FOR pago_record IN 
        SELECT p.id 
        FROM pagos p
        LEFT JOIN cuotas_mensuales c ON c.pago_id = p.id
        WHERE p.estado = 'completado' 
        AND c.pago_id IS NULL
        ORDER BY p.fecha_creacion ASC
    LOOP
        BEGIN
            PERFORM sincronizar_pago_con_cuotas(pago_record.id);
            RAISE NOTICE 'Pago existente sincronizado: %', pago_record.id;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error sincronizando pago %: %', pago_record.id, SQLERRM;
        END;
    END LOOP;
END;
$$;


ALTER FUNCTION public.sincronizar_pagos_existentes() OWNER TO postgres;

--
-- Name: trigger_actualizar_deuda_automatico(); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.trigger_actualizar_deuda_automatico() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Actualizar el cliente cuando se inserta o actualiza un pago
    PERFORM actualizar_deuda_cliente(NEW.cliente_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_actualizar_deuda_automatico() OWNER TO teltec_user;

--
-- Name: FUNCTION trigger_actualizar_deuda_automatico(); Type: COMMENT; Schema: public; Owner: teltec_user
--

COMMENT ON FUNCTION public.trigger_actualizar_deuda_automatico() IS 'Trigger que actualiza automáticamente la deuda cuando se registra un pago';


--
-- Name: update_fecha_actualizacion(); Type: FUNCTION; Schema: public; Owner: teltec_user
--

CREATE FUNCTION public.update_fecha_actualizacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_fecha_actualizacion() OWNER TO teltec_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


ALTER TABLE public.auth_group OWNER TO teltec_user;

--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.auth_group_permissions OWNER TO teltec_user;

--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


ALTER TABLE public.auth_permission OWNER TO teltec_user;

--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    cedula character varying(20) NOT NULL,
    nombres character varying(255) NOT NULL,
    apellidos character varying(255) NOT NULL,
    fecha_nacimiento date NOT NULL,
    direccion text NOT NULL,
    email character varying(255) NOT NULL,
    telefono character varying(20) NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    telegram_chat_id character varying(100),
    id_sector integer,
    estado_pago character varying(50) DEFAULT 'sin_fecha'::character varying,
    meses_pendientes integer DEFAULT 0,
    monto_total_deuda numeric(10,2) DEFAULT 0.00,
    fecha_ultimo_pago date,
    fecha_vencimiento_pago date,
    CONSTRAINT clientes_estado_check CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'suspendido'::character varying])::text[])))
);


ALTER TABLE public.clientes OWNER TO teltec_user;

--
-- Name: clientes_backup_completo; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.clientes_backup_completo (
    id integer,
    cedula character varying(20),
    nombres character varying(255),
    apellidos character varying(255),
    tipo_plan character varying(100),
    fecha_nacimiento date,
    direccion text,
    sector character varying(100),
    email character varying(255),
    telefono character varying(20),
    estado character varying(20),
    fecha_registro timestamp with time zone,
    fecha_actualizacion timestamp with time zone,
    precio_plan numeric,
    telegram_chat_id character varying(100)
);


ALTER TABLE public.clientes_backup_completo OWNER TO teltec_user;

--
-- Name: clientes_planes; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.clientes_planes (
    id_cliente_plan integer NOT NULL,
    id_cliente integer NOT NULL,
    id_plan integer NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    estado character varying(20) DEFAULT 'activo'::character varying,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clientes_planes OWNER TO teltec_user;

--
-- Name: pagos; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.pagos (
    id integer NOT NULL,
    cliente_id integer,
    monto numeric(10,2) NOT NULL,
    fecha_pago date DEFAULT CURRENT_DATE NOT NULL,
    metodo_pago character varying(50) NOT NULL,
    concepto text NOT NULL,
    estado character varying(20) DEFAULT 'completado'::character varying,
    comprobante_enviado boolean DEFAULT false,
    numero_comprobante character varying(50) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento date,
    observaciones text,
    concepto_mes character varying(20),
    CONSTRAINT pagos_estado_check CHECK (((estado)::text = ANY ((ARRAY['completado'::character varying, 'pendiente'::character varying, 'fallido'::character varying])::text[]))),
    CONSTRAINT pagos_monto_check CHECK ((monto > (0)::numeric))
);


ALTER TABLE public.pagos OWNER TO teltec_user;

--
-- Name: planes; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.planes (
    id_plan integer NOT NULL,
    tipo_plan character varying(50) NOT NULL,
    precio numeric(10,2) NOT NULL,
    descripcion text,
    estado character varying(20) DEFAULT 'activo'::character varying,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.planes OWNER TO teltec_user;

--
-- Name: sectores; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sectores (
    id_sector integer NOT NULL,
    nombre_sector character varying(100) NOT NULL,
    descripcion text,
    estado character varying(20) DEFAULT 'activo'::character varying,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sectores OWNER TO teltec_user;

--
-- Name: clientes_deuda; Type: VIEW; Schema: public; Owner: teltec_user
--

CREATE VIEW public.clientes_deuda AS
 SELECT c.id,
    c.cedula,
    c.nombres,
    c.apellidos,
    c.fecha_nacimiento,
    c.direccion,
    s.nombre_sector AS sector,
    c.email,
    c.telefono,
    c.estado,
    c.telegram_chat_id,
    c.fecha_registro,
    c.fecha_actualizacion,
    p.tipo_plan,
    (p.precio)::numeric AS precio_plan,
    GREATEST((0)::bigint, (8 - COALESCE(pagos_info.pagos_count, (0)::bigint))) AS meses_pendientes,
    (p.precio * (GREATEST((0)::bigint, (8 - COALESCE(pagos_info.pagos_count, (0)::bigint))))::numeric) AS monto_total_deuda,
        CASE
            WHEN (COALESCE(pagos_info.pagos_count, (0)::bigint) >= 8) THEN 'al_dia'::text
            WHEN (COALESCE(pagos_info.pagos_count, (0)::bigint) = 7) THEN 'proximo_vencimiento'::text
            ELSE 'vencido'::text
        END AS estado_pago,
    COALESCE(pagos_info.total_pagado, (0)::numeric) AS total_pagado,
    ultimo_pago.fecha_pago AS fecha_ultimo_pago,
    (((c.fecha_registro)::date + '1 mon'::interval) + (((GREATEST((0)::bigint, (8 - COALESCE(pagos_info.pagos_count, (0)::bigint))) - 1))::double precision * '1 mon'::interval)) AS fecha_vencimiento_pago
   FROM (((((public.clientes c
     JOIN public.clientes_planes cp ON (((c.id = cp.id_cliente) AND ((cp.estado)::text = 'activo'::text))))
     JOIN public.planes p ON ((cp.id_plan = p.id_plan)))
     LEFT JOIN public.sectores s ON ((c.id_sector = s.id_sector)))
     LEFT JOIN ( SELECT pagos.cliente_id,
            count(*) AS pagos_count,
            sum(pagos.monto) AS total_pagado
           FROM public.pagos
          WHERE ((pagos.estado)::text = 'completado'::text)
          GROUP BY pagos.cliente_id) pagos_info ON ((c.id = pagos_info.cliente_id)))
     LEFT JOIN ( SELECT DISTINCT ON (pagos.cliente_id) pagos.cliente_id,
            pagos.fecha_pago
           FROM public.pagos
          WHERE ((pagos.estado)::text = 'completado'::text)
          ORDER BY pagos.cliente_id, pagos.fecha_pago DESC) ultimo_pago ON ((c.id = ultimo_pago.cliente_id)))
  WHERE ((c.estado)::text = 'activo'::text);


ALTER VIEW public.clientes_deuda OWNER TO teltec_user;

--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clientes_id_seq OWNER TO teltec_user;

--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: clientes_planes_id_cliente_plan_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.clientes_planes_id_cliente_plan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clientes_planes_id_cliente_plan_seq OWNER TO teltec_user;

--
-- Name: clientes_planes_id_cliente_plan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.clientes_planes_id_cliente_plan_seq OWNED BY public.clientes_planes.id_cliente_plan;


--
-- Name: deudas; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.deudas (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    plan_id integer NOT NULL,
    mes_anio date NOT NULL,
    fecha_vencimiento date NOT NULL,
    monto_deuda numeric(10,2) NOT NULL,
    monto_pagado numeric(10,2) DEFAULT 0.00,
    estado character varying(20) DEFAULT 'vencido'::character varying,
    meses_atraso integer DEFAULT 0,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    observaciones text,
    CONSTRAINT deudas_estado_check CHECK (((estado)::text = ANY ((ARRAY['al_dia'::character varying, 'proximo_vencimiento'::character varying, 'vencido'::character varying, 'pagado'::character varying])::text[]))),
    CONSTRAINT deudas_monto_deuda_check CHECK ((monto_deuda > (0)::numeric))
);


ALTER TABLE public.deudas OWNER TO teltec_user;

--
-- Name: TABLE deudas; Type: COMMENT; Schema: public; Owner: teltec_user
--

COMMENT ON TABLE public.deudas IS 'Tabla para gestionar las deudas de los clientes';


--
-- Name: deudas_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.deudas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deudas_id_seq OWNER TO teltec_user;

--
-- Name: deudas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.deudas_id_seq OWNED BY public.deudas.id;


--
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.django_admin_log (
    id integer NOT NULL,
    action_time timestamp with time zone NOT NULL,
    object_id text,
    object_repr character varying(200) NOT NULL,
    action_flag smallint NOT NULL,
    change_message text NOT NULL,
    content_type_id integer,
    user_id bigint NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);


ALTER TABLE public.django_admin_log OWNER TO teltec_user;

--
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.django_admin_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_admin_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


ALTER TABLE public.django_content_type OWNER TO teltec_user;

--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


ALTER TABLE public.django_migrations OWNER TO teltec_user;

--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_session; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.django_session (
    session_key character varying(40) NOT NULL,
    session_data text NOT NULL,
    expire_date timestamp with time zone NOT NULL
);


ALTER TABLE public.django_session OWNER TO teltec_user;

--
-- Name: estadisticas_deudas; Type: VIEW; Schema: public; Owner: teltec_user
--

CREATE VIEW public.estadisticas_deudas AS
 SELECT count(*) AS total_clientes,
    count(
        CASE
            WHEN (estado_pago = 'al_dia'::text) THEN 1
            ELSE NULL::integer
        END) AS clientes_al_dia,
    count(
        CASE
            WHEN (estado_pago = 'vencido'::text) THEN 1
            ELSE NULL::integer
        END) AS clientes_vencidos,
    count(
        CASE
            WHEN (estado_pago = 'proximo_vencimiento'::text) THEN 1
            ELSE NULL::integer
        END) AS clientes_proximo_vencimiento,
    sum(monto_total_deuda) AS total_deuda,
    avg(monto_total_deuda) AS promedio_deuda,
    sum(meses_pendientes) AS cuotas_vencidas
   FROM public.clientes_deuda;


ALTER VIEW public.estadisticas_deudas OWNER TO teltec_user;

--
-- Name: gastos; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.gastos (
    id integer NOT NULL,
    descripcion text NOT NULL,
    categoria character varying(100) NOT NULL,
    monto numeric(10,2) NOT NULL,
    fecha_gasto date DEFAULT CURRENT_DATE NOT NULL,
    proveedor character varying(255),
    metodo_pago character varying(50),
    comprobante_url character varying(500),
    usuario_id integer,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT gastos_monto_check CHECK ((monto > (0)::numeric))
);


ALTER TABLE public.gastos OWNER TO teltec_user;

--
-- Name: gastos_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.gastos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gastos_id_seq OWNER TO teltec_user;

--
-- Name: gastos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.gastos_id_seq OWNED BY public.gastos.id;


--
-- Name: historial_deudas; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.historial_deudas (
    id integer NOT NULL,
    deuda_id integer NOT NULL,
    tipo_cambio character varying(20) NOT NULL,
    descripcion text NOT NULL,
    monto_anterior numeric(10,2),
    monto_nuevo numeric(10,2),
    estado_anterior character varying(20),
    estado_nuevo character varying(20),
    fecha_cambio timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    usuario character varying(100),
    CONSTRAINT historial_deudas_tipo_cambio_check CHECK (((tipo_cambio)::text = ANY ((ARRAY['creacion'::character varying, 'pago'::character varying, 'ajuste'::character varying, 'cambio_estado'::character varying, 'eliminacion'::character varying])::text[])))
);


ALTER TABLE public.historial_deudas OWNER TO teltec_user;

--
-- Name: TABLE historial_deudas; Type: COMMENT; Schema: public; Owner: teltec_user
--

COMMENT ON TABLE public.historial_deudas IS 'Tabla para mantener el historial de cambios en las deudas';


--
-- Name: historial_deudas_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.historial_deudas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_deudas_id_seq OWNER TO teltec_user;

--
-- Name: historial_deudas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.historial_deudas_id_seq OWNED BY public.historial_deudas.id;


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.notificaciones (
    id integer NOT NULL,
    cliente_id integer,
    tipo character varying(50) NOT NULL,
    mensaje text NOT NULL,
    fecha_envio timestamp with time zone,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    canal character varying(20) DEFAULT 'whatsapp'::character varying,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_programada timestamp without time zone,
    intentos integer DEFAULT 0,
    CONSTRAINT notificaciones_canal_check CHECK (((canal)::text = ANY ((ARRAY['telegram'::character varying, 'email'::character varying, 'sms'::character varying, 'whatsapp'::character varying])::text[]))),
    CONSTRAINT notificaciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'enviado'::character varying, 'fallido'::character varying])::text[]))),
    CONSTRAINT notificaciones_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('pago_proximo'::character varying)::text, ('pago_vencido'::character varying)::text, ('corte_servicio'::character varying)::text, ('promocion'::character varying)::text, ('mantenimiento'::character varying)::text])))
);


ALTER TABLE public.notificaciones OWNER TO teltec_user;

--
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.notificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notificaciones_id_seq OWNER TO teltec_user;

--
-- Name: notificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.notificaciones_id_seq OWNED BY public.notificaciones.id;


--
-- Name: pagos_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pagos_id_seq OWNER TO teltec_user;

--
-- Name: pagos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.pagos_id_seq OWNED BY public.pagos.id;


--
-- Name: planes_id_plan_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.planes_id_plan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.planes_id_plan_seq OWNER TO teltec_user;

--
-- Name: planes_id_plan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.planes_id_plan_seq OWNED BY public.planes.id_plan;


--
-- Name: sectores_id_sector_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.sectores_id_sector_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sectores_id_sector_seq OWNER TO teltec_user;

--
-- Name: sectores_id_sector_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.sectores_id_sector_seq OWNED BY public.sectores.id_sector;


--
-- Name: sitio_web_carrusel; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_carrusel (
    id bigint NOT NULL,
    titulo character varying(200) NOT NULL,
    descripcion text,
    imagen character varying(200) NOT NULL,
    video character varying(200),
    enlace character varying(200),
    activo boolean NOT NULL,
    orden integer NOT NULL,
    fecha_creacion timestamp with time zone NOT NULL,
    fecha_actualizacion timestamp with time zone NOT NULL
);


ALTER TABLE public.sitio_web_carrusel OWNER TO teltec_user;

--
-- Name: sitio_web_carrusel_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.sitio_web_carrusel ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sitio_web_carrusel_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sitio_web_cobertura; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_cobertura (
    id bigint NOT NULL,
    zona character varying(200) NOT NULL,
    descripcion text NOT NULL,
    coordenadas jsonb NOT NULL,
    activo boolean NOT NULL,
    orden integer NOT NULL,
    fecha_creacion timestamp with time zone NOT NULL,
    fecha_actualizacion timestamp with time zone NOT NULL
);


ALTER TABLE public.sitio_web_cobertura OWNER TO teltec_user;

--
-- Name: sitio_web_cobertura_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.sitio_web_cobertura ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sitio_web_cobertura_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sitio_web_configuracionsitio; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_configuracionsitio (
    id integer NOT NULL,
    mostrar_estadisticas boolean DEFAULT true,
    mostrar_testimonios boolean DEFAULT true,
    mostrar_servicios boolean DEFAULT true,
    mostrar_contacto boolean DEFAULT true,
    tema_color character varying(50) DEFAULT 'blue'::character varying,
    logo_url character varying(500) DEFAULT '/images/logo.png'::character varying,
    favicon_url character varying(500) DEFAULT '/images/favicon.ico'::character varying,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    mostrar_precios boolean DEFAULT true,
    modo_mantenimiento boolean DEFAULT false,
    mensaje_mantenimiento text DEFAULT 'Sitio en mantenimiento'::text
);


ALTER TABLE public.sitio_web_configuracionsitio OWNER TO teltec_user;

--
-- Name: sitio_web_configuracionsitio_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.sitio_web_configuracionsitio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sitio_web_configuracionsitio_id_seq OWNER TO teltec_user;

--
-- Name: sitio_web_configuracionsitio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.sitio_web_configuracionsitio_id_seq OWNED BY public.sitio_web_configuracionsitio.id;


--
-- Name: sitio_web_contacto; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_contacto (
    id bigint NOT NULL,
    tipo character varying(20) NOT NULL,
    titulo character varying(100) NOT NULL,
    valor character varying(300) NOT NULL,
    icono character varying(50),
    url character varying(200),
    activo boolean NOT NULL,
    orden integer NOT NULL,
    fecha_creacion timestamp with time zone NOT NULL,
    fecha_actualizacion timestamp with time zone NOT NULL
);


ALTER TABLE public.sitio_web_contacto OWNER TO teltec_user;

--
-- Name: sitio_web_contacto_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.sitio_web_contacto ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sitio_web_contacto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sitio_web_empresa; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_empresa (
    id integer NOT NULL,
    nombre character varying(200) DEFAULT 'TelTec Net'::character varying,
    descripcion text DEFAULT 'Empresa líder en servicios de internet de alta velocidad'::text,
    direccion character varying(500) DEFAULT 'Sisid Centro, Cañar, Ecuador'::character varying,
    telefono character varying(50) DEFAULT '+593 98 765 4321'::character varying,
    email character varying(200) DEFAULT 'info@teltecnet.com'::character varying,
    horario_atencion character varying(200) DEFAULT 'Lunes a Viernes: 8:00 AM - 6:00 PM'::character varying,
    mision text DEFAULT 'Proporcionar servicios de internet de alta calidad y soporte técnico excepcional'::text,
    vision text DEFAULT 'Ser el proveedor de internet más confiable y preferido en la región'::text,
    valores text DEFAULT 'Confianza, Calidad, Innovación, Servicio al Cliente'::text,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ruc character varying(20) DEFAULT '1234567890001'::character varying,
    horario character varying(200) DEFAULT 'Lunes a Viernes: 8:00 AM - 6:00 PM'::character varying
);


ALTER TABLE public.sitio_web_empresa OWNER TO teltec_user;

--
-- Name: sitio_web_empresa_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.sitio_web_empresa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sitio_web_empresa_id_seq OWNER TO teltec_user;

--
-- Name: sitio_web_empresa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.sitio_web_empresa_id_seq OWNED BY public.sitio_web_empresa.id;


--
-- Name: sitio_web_footer; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_footer (
    id bigint NOT NULL,
    texto_copyright character varying(300) NOT NULL,
    mostrar_redes_sociales boolean NOT NULL,
    mostrar_contacto boolean NOT NULL,
    color_fondo character varying(7) NOT NULL,
    color_texto character varying(7) NOT NULL,
    fecha_actualizacion timestamp with time zone NOT NULL
);


ALTER TABLE public.sitio_web_footer OWNER TO teltec_user;

--
-- Name: sitio_web_footer_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.sitio_web_footer ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sitio_web_footer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sitio_web_header; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_header (
    id bigint NOT NULL,
    logo_url character varying(200),
    logo_alt character varying(200) NOT NULL,
    mostrar_menu boolean NOT NULL,
    color_fondo character varying(7) NOT NULL,
    color_texto character varying(7) NOT NULL,
    fecha_actualizacion timestamp with time zone NOT NULL
);


ALTER TABLE public.sitio_web_header OWNER TO teltec_user;

--
-- Name: sitio_web_header_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.sitio_web_header ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sitio_web_header_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sitio_web_informacionsitio; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_informacionsitio (
    id integer NOT NULL,
    titulo character varying(200) DEFAULT 'TelTec Net - Proveedor de Internet'::character varying,
    subtitulo character varying(300) DEFAULT 'Conectando comunidades con tecnología de vanguardia'::character varying,
    descripcion text DEFAULT 'Somos una empresa líder en servicios de internet de alta velocidad, comprometida con brindar conectividad confiable y soporte técnico excepcional.'::text,
    lema character varying(200) DEFAULT 'Conectando tu mundo digital'::character varying,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sitio_web_informacionsitio OWNER TO teltec_user;

--
-- Name: sitio_web_informacionsitio_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.sitio_web_informacionsitio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sitio_web_informacionsitio_id_seq OWNER TO teltec_user;

--
-- Name: sitio_web_informacionsitio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.sitio_web_informacionsitio_id_seq OWNED BY public.sitio_web_informacionsitio.id;


--
-- Name: sitio_web_plan; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_plan (
    id bigint NOT NULL,
    nombre character varying(200) NOT NULL,
    velocidad character varying(100) NOT NULL,
    precio numeric(10,2) NOT NULL,
    descripcion text NOT NULL,
    caracteristicas jsonb NOT NULL,
    popular boolean NOT NULL,
    activo boolean NOT NULL,
    orden integer NOT NULL,
    fecha_creacion timestamp with time zone NOT NULL,
    fecha_actualizacion timestamp with time zone NOT NULL
);


ALTER TABLE public.sitio_web_plan OWNER TO teltec_user;

--
-- Name: sitio_web_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

ALTER TABLE public.sitio_web_plan ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sitio_web_plan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sitio_web_redsocial; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_redsocial (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    url character varying(500),
    icono character varying(100),
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo character varying(50) DEFAULT 'social'::character varying
);


ALTER TABLE public.sitio_web_redsocial OWNER TO teltec_user;

--
-- Name: sitio_web_redsocial_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.sitio_web_redsocial_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sitio_web_redsocial_id_seq OWNER TO teltec_user;

--
-- Name: sitio_web_redsocial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.sitio_web_redsocial_id_seq OWNED BY public.sitio_web_redsocial.id;


--
-- Name: sitio_web_servicio; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.sitio_web_servicio (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    descripcion text,
    precio numeric(10,2) DEFAULT 0.00,
    velocidad character varying(50),
    caracteristicas text,
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    orden integer DEFAULT 0,
    icono character varying(50),
    imagen character varying(200)
);


ALTER TABLE public.sitio_web_servicio OWNER TO teltec_user;

--
-- Name: sitio_web_servicio_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.sitio_web_servicio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sitio_web_servicio_id_seq OWNER TO teltec_user;

--
-- Name: sitio_web_servicio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.sitio_web_servicio_id_seq OWNED BY public.sitio_web_servicio.id;


--
-- Name: top_deudores; Type: VIEW; Schema: public; Owner: teltec_user
--

CREATE VIEW public.top_deudores AS
 SELECT nombres,
    apellidos,
    cedula,
    monto_total_deuda AS monto_deuda,
    estado_pago,
    meses_pendientes
   FROM public.clientes_deuda
  WHERE (monto_total_deuda > (0)::numeric)
  ORDER BY monto_total_deuda DESC
 LIMIT 10;


ALTER VIEW public.top_deudores OWNER TO teltec_user;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: teltec_user
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    rol character varying(50) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reset_token character varying(255),
    reset_expires timestamp with time zone,
    reset_token_expires timestamp without time zone,
    last_activity timestamp with time zone,
    session_timeout_minutes integer NOT NULL,
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['administrador'::character varying, 'economia'::character varying, 'atencion_cliente'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO teltec_user;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: teltec_user
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO teltec_user;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: teltec_user
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: clientes_planes id_cliente_plan; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.clientes_planes ALTER COLUMN id_cliente_plan SET DEFAULT nextval('public.clientes_planes_id_cliente_plan_seq'::regclass);


--
-- Name: deudas id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.deudas ALTER COLUMN id SET DEFAULT nextval('public.deudas_id_seq'::regclass);


--
-- Name: gastos id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.gastos ALTER COLUMN id SET DEFAULT nextval('public.gastos_id_seq'::regclass);


--
-- Name: historial_deudas id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.historial_deudas ALTER COLUMN id SET DEFAULT nextval('public.historial_deudas_id_seq'::regclass);


--
-- Name: notificaciones id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.notificaciones ALTER COLUMN id SET DEFAULT nextval('public.notificaciones_id_seq'::regclass);


--
-- Name: pagos id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.pagos ALTER COLUMN id SET DEFAULT nextval('public.pagos_id_seq'::regclass);


--
-- Name: planes id_plan; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.planes ALTER COLUMN id_plan SET DEFAULT nextval('public.planes_id_plan_seq'::regclass);


--
-- Name: sectores id_sector; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sectores ALTER COLUMN id_sector SET DEFAULT nextval('public.sectores_id_sector_seq'::regclass);


--
-- Name: sitio_web_configuracionsitio id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_configuracionsitio ALTER COLUMN id SET DEFAULT nextval('public.sitio_web_configuracionsitio_id_seq'::regclass);


--
-- Name: sitio_web_empresa id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_empresa ALTER COLUMN id SET DEFAULT nextval('public.sitio_web_empresa_id_seq'::regclass);


--
-- Name: sitio_web_informacionsitio id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_informacionsitio ALTER COLUMN id SET DEFAULT nextval('public.sitio_web_informacionsitio_id_seq'::regclass);


--
-- Name: sitio_web_redsocial id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_redsocial ALTER COLUMN id SET DEFAULT nextval('public.sitio_web_redsocial_id_seq'::regclass);


--
-- Name: sitio_web_servicio id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_servicio ALTER COLUMN id SET DEFAULT nextval('public.sitio_web_servicio_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.auth_group (id, name) FROM stdin;
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add log entry	1	add_logentry
2	Can change log entry	1	change_logentry
3	Can delete log entry	1	delete_logentry
4	Can view log entry	1	view_logentry
5	Can add permission	2	add_permission
6	Can change permission	2	change_permission
7	Can delete permission	2	delete_permission
8	Can view permission	2	view_permission
9	Can add group	3	add_group
10	Can change group	3	change_group
11	Can delete group	3	delete_group
12	Can view group	3	view_group
13	Can add content type	4	add_contenttype
14	Can change content type	4	change_contenttype
15	Can delete content type	4	delete_contenttype
16	Can view content type	4	view_contenttype
17	Can add session	5	add_session
18	Can change session	5	change_session
19	Can delete session	5	delete_session
20	Can view session	5	view_session
21	Can add Usuario	6	add_usuario
22	Can change Usuario	6	change_usuario
23	Can delete Usuario	6	delete_usuario
24	Can view Usuario	6	view_usuario
25	Can add Cliente	7	add_cliente
26	Can change Cliente	7	change_cliente
27	Can delete Cliente	7	delete_cliente
28	Can view Cliente	7	view_cliente
29	Can add Gasto	8	add_gasto
30	Can change Gasto	8	change_gasto
31	Can delete Gasto	8	delete_gasto
32	Can view Gasto	8	view_gasto
33	Can add Pago	9	add_pago
34	Can change Pago	9	change_pago
35	Can delete Pago	9	delete_pago
36	Can view Pago	9	view_pago
37	Can add Notificación	10	add_notificacion
38	Can change Notificación	10	change_notificacion
39	Can delete Notificación	10	delete_notificacion
40	Can view Notificación	10	view_notificacion
41	Can add Configuración del Sitio	11	add_configuracionsitio
42	Can change Configuración del Sitio	11	change_configuracionsitio
43	Can delete Configuración del Sitio	11	delete_configuracionsitio
44	Can view Configuración del Sitio	11	view_configuracionsitio
45	Can add Empresa	12	add_empresa
46	Can change Empresa	12	change_empresa
47	Can delete Empresa	12	delete_empresa
48	Can view Empresa	12	view_empresa
49	Can add Información del Sitio	13	add_informacionsitio
50	Can change Información del Sitio	13	change_informacionsitio
51	Can delete Información del Sitio	13	delete_informacionsitio
52	Can view Información del Sitio	13	view_informacionsitio
53	Can add Servicio	14	add_servicio
54	Can change Servicio	14	change_servicio
55	Can delete Servicio	14	delete_servicio
56	Can view Servicio	14	view_servicio
57	Can add Red Social	15	add_redsocial
58	Can change Red Social	15	change_redsocial
59	Can delete Red Social	15	delete_redsocial
60	Can view Red Social	15	view_redsocial
61	Can add Configuración del Sistema	16	add_configuracionsistema
62	Can change Configuración del Sistema	16	change_configuracionsistema
63	Can delete Configuración del Sistema	16	delete_configuracionsistema
64	Can view Configuración del Sistema	16	view_configuracionsistema
65	Can add Plan	17	add_plan
66	Can change Plan	17	change_plan
67	Can delete Plan	17	delete_plan
68	Can view Plan	17	view_plan
69	Can add Sector	18	add_sector
70	Can change Sector	18	change_sector
71	Can delete Sector	18	delete_sector
72	Can view Sector	18	view_sector
73	Can add Plan	19	add_plan
74	Can change Plan	19	change_plan
75	Can delete Plan	19	delete_plan
76	Can view Plan	19	view_plan
77	Can add Cobertura	20	add_cobertura
78	Can change Cobertura	20	change_cobertura
79	Can delete Cobertura	20	delete_cobertura
80	Can view Cobertura	20	view_cobertura
81	Can add Contacto	21	add_contacto
82	Can change Contacto	21	change_contacto
83	Can delete Contacto	21	delete_contacto
84	Can view Contacto	21	view_contacto
85	Can add Carrusel	22	add_carrusel
86	Can change Carrusel	22	change_carrusel
87	Can delete Carrusel	22	delete_carrusel
88	Can view Carrusel	22	view_carrusel
89	Can add Header	23	add_header
90	Can change Header	23	change_header
91	Can delete Header	23	delete_header
92	Can view Header	23	view_header
93	Can add Footer	24	add_footer
94	Can change Footer	24	change_footer
95	Can delete Footer	24	delete_footer
96	Can view Footer	24	view_footer
97	Can add Sector	25	add_sector
98	Can change Sector	25	change_sector
99	Can delete Sector	25	delete_sector
100	Can view Sector	25	view_sector
101	Can add Plan	26	add_plan
102	Can change Plan	26	change_plan
103	Can delete Plan	26	delete_plan
104	Can view Plan	26	view_plan
105	Can add Plan del Cliente	27	add_clienteplan
106	Can change Plan del Cliente	27	change_clienteplan
107	Can delete Plan del Cliente	27	delete_clienteplan
108	Can view Plan del Cliente	27	view_clienteplan
109	Can add conversacion chatbot	28	add_conversacionchatbot
110	Can change conversacion chatbot	28	change_conversacionchatbot
111	Can delete conversacion chatbot	28	delete_conversacionchatbot
112	Can view conversacion chatbot	28	view_conversacionchatbot
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.clientes (id, cedula, nombres, apellidos, fecha_nacimiento, direccion, email, telefono, estado, fecha_registro, fecha_actualizacion, telegram_chat_id, id_sector, estado_pago, meses_pendientes, monto_total_deuda, fecha_ultimo_pago, fecha_vencimiento_pago) FROM stdin;
28	0300491099	MANUELA MARIA	PAUCAR YAMASQUI 	1955-04-11	SISID	maria@gmail.com	0987654	activo	2025-01-30 19:00:00-05	2025-11-05 17:36:50.491779-05		7	vencido	2	36.00	2025-09-11	2025-10-01
48	0301327649	 MARIA ROSA	ANGAMARCA YUPA	1977-01-09	CAGUNAPAMBA	rosa@gmail.com	09876543	activo	2025-01-02 19:00:00-05	2025-11-05 17:36:50.500065-05		14	vencido	10	200.00	\N	2025-02-01
53	0300601259	JUAN	CAGUANA TENEZACA 	1959-01-31	SISID	juan@gmail.com	09876543	activo	2025-01-07 19:00:00-05	2025-11-05 17:36:50.506914-05		16	vencido	2	36.00	2025-09-11	2025-10-01
55	0301486635	 MARIA	TENEZACA DUTAN	1977-06-22	SISID	mariaa@gmail.com	0987654	activo	2025-01-07 19:00:00-05	2025-11-05 17:36:50.509286-05		16	vencido	9	180.00	\N	2025-02-01
66	0300818036	SEGUNDO MANUEL CRUZ	YUPA PALCHIZACA 	1961-03-31	SISID	cruz@gmail.com	0987654	activo	2025-01-27 19:00:00-05	2025-11-05 17:36:50.517128-05		16	proximo_vencimiento	1	18.00	2025-09-11	2025-10-01
81	0301052130	 MARIA ZOILA	 DUTAN ANGAMARCA	2000-09-09	SISID 	zoila@gmail.com	09876543	activo	2025-01-25 19:00:00-05	2025-11-05 17:36:50.527356-05		20	vencido	4	80.00	2025-09-11	2025-10-01
86	0000000000	ASOPROGASI	COOPERATIVA AGROPECUARIO	1972-09-04	CENTRO DE ACOPIO SISID	asoprogasi@gmail.com	0987659876	activo	2025-01-12 19:00:00-05	2025-11-05 17:36:50.530657-05		9	vencido	3	60.00	2025-09-11	2025-10-01
95	0300190516	TENEZACA YUPA	MARIA PAULA	1988-09-03	sisid cullcaloma	paolaa@gmail.com	0987654098	activo	2025-01-09 19:00:00-05	2025-11-05 17:36:50.534358-05	\N	16	proximo_vencimiento	1	20.00	2025-09-03	2025-10-01
127	0300679008	MARIA DOLORES	QUIZHPI ROMERO	1958-11-13	chico sisid	dolores@gmail.com	0999859689	activo	2025-12-09 10:23:38.660176-05	2025-12-09 10:23:38.660236-05	\N	3	sin_fecha	0	0.00	\N	\N
79	0941280679	JAVIER ANDRES	YEPEZ SALTOS	2007-09-02	CAGUANAPMABA	yepez@gmail.com	0987650987	suspendido	2024-12-31 19:00:00-05	2025-09-02 09:54:49.265377-05		5	sin_fecha	0	0.00	\N	\N
3	0301824785	MARIA MANUELA	YUPA CUZCO 	1981-07-12	SISID	mmanuela@gmail.com	0983481554	activo	2025-01-24 19:00:00-05	2025-11-05 17:36:50.453006-05		16	vencido	2	40.00	2025-09-02	2025-10-01
17	0300590106	MARIA ANTONIA	CAGUANA YUPA 	1959-04-18	CAGUANAPAMBA	antonia@gmail.com	0987654	activo	2024-12-31 19:00:00-05	2025-11-05 17:36:50.478237-05		5	vencido	3	60.00	2025-09-11	2025-10-01
50	0300432002	MARIA	CAGUANA CAGUANA	1950-07-27	CAGUANAPAMBA	janethdre18@gmail.com	0987654987	activo	2025-01-11 19:00:00-05	2025-11-05 17:36:50.502081-05		5	proximo_vencimiento	1	18.00	2025-09-11	2025-10-01
65	0300447265	MARIA MERCEDES	PINGUIL GUAMAN 	1948-12-31	TAMBO	mercedespg@gmail.com	098765	activo	2025-01-14 19:00:00-05	2025-11-05 17:36:50.516352-05		12	vencido	9	180.00	\N	2025-02-01
76	0302100953	 CESAR DAMIAN	ZARUMA DUCHI	1977-07-14	CHUICHUN 	damianz@gmail.com	098765	activo	2025-01-11 19:00:00-05	2025-11-05 17:36:50.523994-05		8	vencido	2	40.00	2025-09-11	2025-10-01
21	0302382759	 JONATHAN MANUEL	ESPINOZA BUÑAY	1994-07-06	CAGUNAPAMBA	jhona@gmail.com	0987654	activo	2025-01-06 19:00:00-05	2025-11-05 17:36:50.483299-05		5	vencido	9	180.00	\N	2025-02-01
60	0300749736	 TOMASA	GUALLPA CAZHO	1961-06-30	SISID	tomasaa@gmail.com	098765	activo	2025-01-02 19:00:00-05	2025-11-05 17:36:50.512927-05		16	vencido	2	40.00	2025-09-11	2025-10-01
64	0300789302	 ZOILA MERCEDES	CHUQUI ANGAMARCA	1962-05-04	SISID	mercedes@gmail.com	098765	activo	2025-01-01 19:00:00-05	2025-11-05 17:36:50.515595-05		7	vencido	5	100.00	2025-09-11	2025-10-01
75	0301141834	 ANA LUCIA	YUPANGUI ZUMBA	2005-09-05	MARCOPAMBA CENTRO	lucia@gmail.com	09877654	activo	2025-01-08 19:00:00-05	2025-11-05 17:36:50.522916-05		6	vencido	9	180.00	\N	2025-02-01
78	0301326732	ISAURA	YUPA NARANJO	1973-12-29	SISID	isaura@gmail.com	0987698765	activo	2025-01-01 19:00:00-05	2025-11-05 17:36:50.525635-05		13	vencido	10	200.00	\N	2025-02-01
98	0301055699	PETRONA	TENEZACA UZHCA	2007-08-16	SISID	uzca@gmail.com	098765432	activo	2025-01-12 19:00:00-05	2025-11-05 17:36:50.536804-05		10	proximo_vencimiento	1	18.00	2025-09-11	2025-10-01
5	0300893658	TOMASA	MUÑOS HUERTA	1964-11-13	SISID 	tomasa@gmail.com		activo	2025-01-19 19:00:00-05	2025-11-05 17:36:50.457027-05		16	vencido	2	40.00	2025-09-11	2025-10-01
7	0300902103	TANIA MERCY	ANGAMARCA TENEZACA 	1994-08-05	SISID	tania@gmail.com	9876543	activo	2025-01-13 19:00:00-05	2025-11-05 17:36:50.460768-05		16	proximo_vencimiento	1	20.00	2025-09-11	2025-10-01
26	0300813516	 MARIA VIRGINIA	QUISHPI TENEZACA	1959-02-09	SISID	virginia@gmail.com	09876543	activo	2025-01-16 19:00:00-05	2025-11-05 17:36:50.489184-05		20	vencido	3	60.00	2025-09-11	2025-10-01
42	0300769189	MARIANA DE JESUS	YUPA DUTAN	1961-10-15	CAGUNAPAMBA	maruayupatambo2022@gmail.com	0987654006	activo	2025-01-03 19:00:00-05	2025-11-05 17:36:50.495172-05		5	vencido	9	180.00	2025-09-11	2025-10-01
14	0301238796	EHMA LUCIA	ANGAMARCA YAMASQUI	1964-08-19	SISID	lucias@gmail.com	0987654387	activo	2025-01-17 19:00:00-05	2025-11-05 17:36:50.473001-05		7	al_dia	0	0.00	2025-09-11	2025-10-01
23	0300454600	 MARIA MANUELA	PALLCHIZACA YUPA	1953-07-22	SISID	manuela@gmail.coma	09876543	activo	2025-01-15 19:00:00-05	2025-11-05 17:36:50.485556-05		16	vencido	6	108.00	2025-09-11	2025-10-01
44	0300741733	MARIA JESUS	YUPA CAGUANA 	1958-12-12	CAGUANPAMABA	mariaJ@gmail.com	098765	activo	2025-01-01 19:00:00-05	2025-11-05 17:36:50.496235-05		14	vencido	4	80.00	2025-09-11	2025-10-01
49	0301078705	MANUEL SANTIAGO	ZHAO BUÑAY	1965-12-13	CAGUANAPAMBA	zhaosantiago55@gmail.com	0987654098	activo	2025-01-15 19:00:00-05	2025-11-05 17:36:50.501092-05		14	vencido	3	60.00	2025-09-11	2025-10-01
57	0301220323	LUIS ALBERTO	CHIMBORAZO MAYANCELA 	1969-05-15	CAGUANAPAMBA	albertyo@gmail.com	098765	activo	2025-01-09 19:00:00-05	2025-11-05 17:36:50.51097-05		19	vencido	9	180.00	\N	2025-02-01
74	0300317369	MARIA ROSA	TENEZACA PALLCHIZACA	1940-06-18	SISID	rosam@gmail.com	0987658756	activo	2025-01-21 19:00:00-05	2025-11-05 17:36:50.522227-05		13	proximo_vencimiento	1	18.00	2025-09-11	2025-10-01
82	0300732476	PEDRO MARIA	BUÑAY CAMAS	1960-11-01	SISID 	pedro@gmail.com	0987654	activo	2025-01-08 19:00:00-05	2025-11-05 17:36:50.528228-05		2	vencido	3	60.00	2025-09-11	2025-10-01
87	391011559001	 CAGUANAPAMBA	COMUNA	1930-08-05	CAGUNAPAMBA 	cagunba@gmail.com	0987654321	activo	2025-01-18 19:00:00-05	2025-11-05 17:36:50.531451-05		14	vencido	9	180.00	\N	2025-02-01
88	0302536198	 BYRON ISRAEL	ROMERO MIRADANDA	2007-08-08	Ingapirca	israel@gmail.com	098765432	activo	2025-01-24 19:00:00-05	2025-11-05 17:36:50.532212-05		11	vencido	9	162.00	\N	2025-02-01
92	0300266830	MELCHOR 	QUIZHPI TENEZACA	2007-08-17	SISID 	qmaulchor@gmail.com	0987654321	activo	2025-01-02 19:00:00-05	2025-11-05 17:36:50.532797-05		18	vencido	2	30.00	2025-09-11	2025-10-01
97	0302839865	SANDRA ADELA	CAZHO LLIGUICHUSCA	1995-08-04	TAMBO PARQUE DE LA MADRE 	5cazho.sucesores@gmail.com	0997079497	activo	2025-01-06 19:00:00-05	2025-11-05 17:36:50.536-05		1	vencido	9	180.00	\N	2025-02-01
101	0300818044	MANUEL JESUS	TENESACA YUPA	1959-12-07	SISID  secar de la cadsa de leverato	pedroo@gmail.com	0987654	activo	2025-01-03 19:00:00-05	2025-11-05 17:36:50.538365-05		10	vencido	10	180.00	\N	2025-02-01
11	0300866464	MARIA FRANCISCA	YUPA DUTAN 	1979-09-05	Caguanapamba	francisca@gmail.com	0987654	activo	2025-01-25 19:00:00-05	2025-11-05 17:36:50.466963-05		5	vencido	3	60.00	2025-09-11	2025-10-01
25	0300646668	 CAITANO	QUIZHPI PALCHIZACA	1945-02-03	SISID	cae@gmail.com	098765	activo	2025-01-23 19:00:00-05	2025-11-05 17:36:50.487965-05		7	vencido	6	108.00	2025-09-11	2025-10-01
68	0301254009	 LUCIO VERDADERO	QUIZHPI CODO	1972-11-28	MARCOPAMBA CENTRO 	codo@gmail.com	0987654	activo	2025-01-09 19:00:00-05	2025-11-05 17:36:50.51847-05		6	vencido	3	60.00	2025-09-11	2025-10-01
71	0300515095	 LORENZA	YUPA YUPA	1955-04-07	CAGUNAPAMBA	lor@gmail.com	0987654	activo	2025-01-05 19:00:00-05	2025-11-05 17:36:50.52057-05		19	vencido	2	36.00	2025-09-11	2025-10-01
83	0302543210	GLADIS ALEGRIA 	MAURIZACA TENEZACA	2005-11-06	SISID	gladis@gmail.com	098765	activo	2025-01-13 19:00:00-05	2025-11-05 17:36:50.52905-05	123456789	16	proximo_vencimiento	1	20.00	2025-09-11	2025-10-01
85	391010889001	 SAN ISIDRO DE VENDELECHE	COOPERATIVA AGROPECUARIO	1960-10-26	VENDE LECHE	sanisidro@gmail.com	0987654	activo	2025-01-05 19:00:00-05	2025-11-05 17:36:50.529817-05		17	vencido	9	180.00	\N	2025-02-01
96	0300586088	MARGARITA	CASTILLO CORONEL 	2007-08-09	SISID	inesgahui25@gmail.com	0992554640	activo	2025-01-28 19:00:00-05	2025-11-05 17:36:50.535065-05		7	vencido	9	162.00	\N	2025-02-01
99	0302042669	NARCISO	QUIZPI ROMERO 	2007-08-16	SISID ANEJO	narciso@gmail.com	09876543	activo	2025-01-16 19:00:00-05	2025-11-05 17:36:50.537601-05		4	vencido	3	60.00	2025-09-11	2025-10-01
47	0300798188	 MARIA MANUELA	YUPA ALVAREZ	1953-08-06	CAGUANAPAMBA	mmaria@gmail.com	0987654	activo	2025-01-27 19:00:00-05	2026-01-20 19:17:45.057492-05		5	vencido	10	180.00	2026-01-21	2026-01-28
12	0300317872	 JOSEFA	PALLCHISACA CAGUANA	1946-09-13	SISID	josefa@gmail.com	0987654	activo	2024-12-31 19:00:00-05	2025-11-05 17:36:50.468985-05		16	vencido	3	54.00	2025-09-11	2025-10-01
19	0604092098	HILDA VIOLETA	VINAN VINAN 	1987-05-18	CAGUNAPAMBA	hilda@gmail.com	09876543	activo	2025-01-28 19:00:00-05	2025-11-05 17:36:50.480741-05		5	vencido	9	180.00	\N	2025-02-01
20	0302443031	 VERONICA ALEXANDRA	YUPA YUPA 	1997-10-24	CAGUNAPAMBA	vero@gmail.com	09876543	activo	2025-01-23 19:00:00-05	2025-11-05 17:36:50.482045-05		5	vencido	3	60.00	2025-09-11	2025-10-01
56	0350446373	KAREN JHULEY	CAÑAR DUTAN	2007-02-02	nd	juliey@gmail.com	0983825558	inactivo	2025-01-30 19:00:00-05	2025-12-03 12:28:29.297047-05	\N	14	vencido	9	162.00	\N	2025-02-01
1	0300624970	MARIA GUADALUPE	ANGAMARCA ANGAMARCA	1958-09-04	Sisid	vangamarca4@gmail.com	0999859689	activo	2025-01-16 19:00:00-05	2025-12-11 13:18:00.041899-05	2115692403	16	al_dia	0	-324.00	2025-12-11	2025-12-17
22	0300690559	 MARCOS	ROMERO PALCHIZACA	1960-10-31	SISID 	marco@gmail.com	0987654	activo	2025-01-07 19:00:00-05	2025-11-05 17:36:50.484386-05		3	vencido	9	180.00	\N	2025-02-01
24	0302333984	ZOILA MERCEDES	SOLORZANO CASTILLO 	1997-08-04	SISD	solorzano@gmail.comM	098765	activo	2025-01-14 19:00:00-05	2025-11-05 17:36:50.486799-05		7	vencido	2	40.00	2025-09-11	2025-10-01
29	0303140917	 ALEX VICENTE	TENEZACA ANGAMARCA	1999-08-11	SISID	vicente@gmail.com	098765	activo	2025-01-29 19:00:00-05	2025-11-05 17:36:50.493177-05		16	vencido	2	40.00	2025-09-11	2025-10-01
45	0301653713	MARIA JUANA	CAGUANA CAGUANA 	1979-11-08	CAGUANAPMABA	juanyupa73@gmail.com	09876	activo	2025-01-06 19:00:00-05	2025-11-05 17:36:50.497245-05		5	vencido	3	60.00	2025-09-11	2025-10-01
46	0302051735	MARIA JACOBA	PINGUIL CAGUANA	1984-05-02	CAGUANAPAMBA	mpinguil37@gmail.com	0995579815	activo	2025-01-20 19:00:00-05	2025-11-05 17:36:50.498352-05		5	vencido	5	75.00	2025-09-11	2025-10-01
54	0302567680	 DAVID ELIAS	CHIMBORAZO YUPA	1994-01-10	AGUNAPAMBA	elias@gmail.com	0987654	activo	2025-01-21 19:00:00-05	2025-11-05 17:36:50.508239-05		14	vencido	9	180.00	\N	2025-02-01
58	0301307203	MARIA BRIJIDA	PALLCHISACA CAGUANA 	1969-03-11	SISID 	brijida@gmail.com	09876543	activo	2025-01-13 19:00:00-05	2025-11-05 17:36:50.511852-05		3	vencido	9	180.00	\N	2025-02-01
67	0302631494	 EDISON FERNANDO	PASTUISACA VERDUGO	1995-05-21	CAÑAR PARQUE CENTRAL 	edificio@gmail.com		activo	2025-01-10 19:00:00-05	2025-11-05 17:36:50.517803-05		1	vencido	6	120.00	2025-09-11	2025-10-01
69	0301026308	 MARIA MERCEDES	DUTAN DUTAN	1969-05-10	CAGUANAPMABA	mermaria@gmail.com	098765	activo	2025-01-26 19:00:00-05	2025-11-05 17:36:50.519194-05		19	vencido	4	80.00	2025-09-11	2025-10-01
70	0301253084	 BALTAZARA	QUIZHPI PALLCHIZACA	1972-07-17	CHUICHUN	balt@gmail.com	09876	activo	2025-01-04 19:00:00-05	2025-11-05 17:36:50.519903-05		15	vencido	5	100.00	2025-09-11	2025-10-01
77	0300420890	MARIA SEMIRA	ANGAMARCA ANGAMARCA	1948-08-14	SISID	semira@gmail.com	0998109704	activo	2025-01-12 19:00:00-05	2025-11-05 17:36:50.524867-05		7	vencido	9	162.00	\N	2025-02-01
80	0300417268	 LIBERATO	QUIZHPI ORTEGA	1949-10-04	SISID 	liberato@gmail.com	098765	activo	2025-01-10 19:00:00-05	2025-11-05 17:36:50.526498-05		3	vencido	4	72.00	2025-09-11	2025-10-01
94	0300464989	MARIA AURORA	DUTAN YAMASQUI	2007-08-01	SISID	auroraa@gmail.com	0987654	activo	2025-01-15 19:00:00-05	2025-11-05 17:36:50.53354-05		13	vencido	9	162.00	\N	2025-02-01
9	0302426846	MARIA LUZ	TENEZACA ANGAMARCA	1988-01-13	SISID	mluz@gmail.com	09876545	activo	2025-01-04 19:00:00-05	2025-11-05 17:36:50.463881-05		16	vencido	3	60.00	2025-09-11	2025-10-01
15	0303012470	KEVIN LEONARDO	SAETEROS SIGUENCIA 	2003-09-17	SISID	saeteros@gmail.com	0987654	activo	2025-01-05 19:00:00-05	2025-11-05 17:36:50.475583-05		16	vencido	2	40.00	2025-09-11	2025-10-01
41	0301623161	 MARIA MATEA	TENEZACA DUTAN	1955-04-11	SISID 	mmatea@gmail.com	098765765	activo	2025-01-11 19:00:00-05	2025-11-05 17:36:50.494129-05		16	vencido	4	80.00	2025-09-11	2025-10-01
61	0302580873	 LUIS GEOVANNY	CAGUANA YUPA	2001-06-11	CAGUANAPAMBA	jova@gmail.com	09876	activo	2025-01-22 19:00:00-05	2025-11-05 17:36:50.514058-05		14	proximo_vencimiento	1	20.00	2025-09-11	2025-10-01
72	0301580775	MARIA LIBERATA	YUPA CUZCO	2000-06-02	SISID	live@gmail.com	0987658765	activo	2025-01-04 19:00:00-05	2025-11-05 17:36:50.521285-05		13	vencido	3	60.00	2025-09-11	2025-10-01
2	0300967031	MARIA MANUELA	ANGAMARCA CHIMBORAZO	1963-11-04	SISID 	angamarcam483@gmail.com	0984400153	activo	2025-01-29 19:00:00-05	2025-11-05 17:36:50.451304-05		16	vencido	2	40.00	2025-09-02	2025-10-01
8	0301386538	SERGIO	TENEZACA PAUCAR	1975-10-07	SISID 	serio@gmail.com	0998969106	activo	2025-01-08 19:00:00-05	2025-11-05 17:36:50.462234-05		16	vencido	5	100.00	2025-09-11	2025-10-01
16	0350001863	 WILIN PATRICIO	TENEZACA TENEZACA	1997-02-13	SISID	patricio@gmail.com	09876543	activo	2025-01-17 19:00:00-05	2025-11-05 17:36:50.477043-05		18	vencido	2	40.00	2025-09-11	2025-10-01
62	0301029187	ALFONSO	MAYANCELA CAGUANA 	1967-04-29	CAGUANAPMABA	alfonso@gmail.com	098765	activo	2025-01-14 19:00:00-05	2025-11-05 17:36:50.514884-05		14	vencido	7	140.00	2025-09-11	2025-10-01
6	0300902095	MARIA MATEA	TENEZACA CUZCO	1966-08-31	SISID 		098765	activo	2025-01-26 19:00:00-05	2025-11-05 17:36:50.459279-05		16	al_dia	0	0.00	2025-09-11	2025-10-01
10	0300584380	 ANTONIO	ANGAMARCA YAMASQUI	1986-07-04	SISID	antonio@gmail.com	09876543	activo	2025-01-18 19:00:00-05	2025-11-05 17:36:50.465477-05		7	al_dia	0	0.00	2025-09-11	2025-10-01
13	0301563649	 LORENZO	ANGAMARCA 	1967-10-05	SISID	lorenzo@gmail.com	09876543	activo	2025-01-19 19:00:00-05	2025-11-05 17:36:50.471116-05		20	al_dia	0	0.00	2025-09-11	2025-10-01
27	0300849296	MARIA MERCEDES	DUTAN ANGAMARCA	1960-06-07	SISID	merce@gmail.com	098765	activo	2025-01-10 19:00:00-05	2025-11-05 17:36:50.490473-05		20	vencido	2	40.00	2025-09-11	2025-10-01
4	0300791845	MARIA AURORA	TENEZACA CUZCO	1987-06-03	SISID	aurora@gmail.com	098765432	activo	2025-01-20 19:00:00-05	2025-11-05 17:36:50.45467-05		16	proximo_vencimiento	1	20.00	2025-09-11	2025-10-01
18	0301838108	MARIA MAGDALENA	 PALCHIZACA YUPA	1977-12-29	SISID	magdalena@gmail.com	0987654	activo	2025-01-03 19:00:00-05	2025-11-05 17:36:50.479454-05		3	vencido	4	80.00	2025-09-11	2025-10-01
51	0300999927	MARIA TRANSITO	GUALLPA CAZHO	1967-09-25	SISID	tranci@gmail.com	098765	activo	2025-01-22 19:00:00-05	2025-11-05 17:36:50.50306-05		16	proximo_vencimiento	1	20.00	2025-09-11	2025-10-01
52	0301846317	MANUEL ALEJANDRO	YUPA PAUCAR	1982-07-12	SISID	ale@gmail.com	0987650987	activo	2025-01-17 19:00:00-05	2025-11-05 17:36:50.50548-05		13	vencido	9	180.00	\N	2025-02-01
\.


--
-- Data for Name: clientes_backup_completo; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.clientes_backup_completo (id, cedula, nombres, apellidos, tipo_plan, fecha_nacimiento, direccion, sector, email, telefono, estado, fecha_registro, fecha_actualizacion, precio_plan, telegram_chat_id) FROM stdin;
28	0300491099	MANUELA MARIA	PAUCAR YAMASQUI 	Plan Tercera Edad	1955-04-11	SISID	Sisid Centro	maria@gmail.com	0987654	activo	2025-01-30 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
79	0941280679	 JAVIER ANDRES	YEPEZ SALTOS	Plan familiar	1994-03-10	CAGUANAPMABA	Naug Nag	yepez@gmail.com	098765	activo	2024-12-31 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
48	0301327649	 MARIA ROSA	ANGAMARCA YUPA	Plan familiar	1977-01-09	CAGUNAPAMBA	Caguanapamba Centro	rosa@gmail.com	09876543	activo	2025-01-02 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
55	0301486635	 MARIA	TENEZACA DUTAN	Plan familiar	1977-06-22	SISID	Cullcaloma	mariaa@gmail.com	0987654	activo	2025-01-07 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
86	0000000000	ASOPROGASI	COOPERATIVA AGROPECUARIO	Plan familiar	1972-09-04	CENTRO DE ACOPIO SISID	Centro de acopio Sisid	asoprogasi@gmail.com	0987659876	activo	2025-01-12 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
81	0301052130	 MARIA ZOILA	 DUTAN ANGAMARCA	Plan familiar	2000-09-09	SISID 	Churuguayco	zoila@gmail.com	09876543	activo	2025-01-25 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
95	0300190516	TENEZACA YUPA	MARIA PAULA	Plan familiar	2007-08-01	SISID	Cullcaloma	paolaa@gmail.com	0987654	activo	2025-01-09 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
53	0300601259	JUAN	CAGUANA TENEZACA 	Plan Tercera Edad	1959-01-31	SISID	Cullcaloma	juan@gmail.com	09876543	activo	2025-01-07 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
66	0300818036	SEGUNDO MANUEL CRUZ	YUPA PALCHIZACA 	Plan Tercera Edad	1961-03-31	SISID	Cullcaloma	cruz@gmail.com	0987654	activo	2025-01-27 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
17	0300590106	MARIA ANTONIA	CAGUANA YUPA 	Plan familiar	1959-04-18	CAGUANAPAMBA	Naug Nag	antonia@gmail.com	0987654	activo	2024-12-31 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
65	0300447265	MARIA MERCEDES	PINGUIL GUAMAN 	Plan familiar	1948-12-31	TAMBO	Tambo Reservorio	mercedespg@gmail.com	098765	activo	2025-01-14 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
3	0301824785	MARIA MANUELA	YUPA CUZCO 	Plan familiar	1981-07-12	SISID	Cullcaloma	mmanuela@gmail.com	0983481554	activo	2025-01-24 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
76	0302100953	 CESAR DAMIAN	ZARUMA DUCHI	Plan familiar	1977-07-14	CHUICHUN 	Zarapamba	damianz@gmail.com	098765	activo	2025-01-11 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
50	0300432002	MARIA	CAGUANA CAGUANA	Plan Tercera Edad	1950-07-27	CAGUANAPAMBA	Naug Nag	janethdre18@gmail.com	0987654987	activo	2025-01-11 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
64	0300789302	 ZOILA MERCEDES	CHUQUI ANGAMARCA	Plan familiar	1962-05-04	SISID	Sisid Centro	mercedes@gmail.com	098765	activo	2025-01-01 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
75	0301141834	 ANA LUCIA	YUPANGUI ZUMBA	Plan familiar	2005-09-05	MARCOPAMBA CENTRO	Marco Pamba	lucia@gmail.com	09877654	activo	2025-01-08 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
78	0301326732	ISAURA	YUPA NARANJO	Plan familiar	1973-12-29	SISID	Galuay	isaura@gmail.com	0987698765	activo	2025-01-01 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
21	0302382759	 JONATHAN MANUEL	ESPINOZA BUÑAY	Plan familiar	1994-07-06	CAGUNAPAMBA	Naug Nag	jhona@gmail.com	0987654	activo	2025-01-06 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
60	0300749736	 TOMASA	GUALLPA CAZHO	Plan familiar	1961-06-30	SISID	Cullcaloma	tomasaa@gmail.com	098765	activo	2025-01-02 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
98	0301055699	PETRONA	TENEZACA UZHCA	Plan Tercera Edad	2007-08-16	SISID	Lirio Loma	uzca@gmail.com	098765432	activo	2025-01-12 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
5	0300893658	TOMASA	MUÑOS HUERTA	Plan familiar	1964-11-13	SISID 	Cullcaloma	tomasa@gmail.com		activo	2025-01-19 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
7	0300902103	TANIA MERCY	ANGAMARCA TENEZACA 	Plan familiar	1994-08-05	SISID	Cullcaloma	tania@gmail.com	9876543	activo	2025-01-13 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
26	0300813516	 MARIA VIRGINIA	QUISHPI TENEZACA	Plan familiar	1959-02-09	SISID	Churuguayco	virginia@gmail.com	09876543	activo	2025-01-16 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
42	0300769189	MARIANA DE JESUS	YUPA DUTAN	Plan familiar	1961-10-15	CAGUNAPAMBA	Naug Nag	maruayupatambo2022@gmail.com	0987654006	activo	2025-01-03 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
57	0301220323	LUIS ALBERTO	CHIMBORAZO MAYANCELA 	Plan familiar	1969-05-15	CAGUANAPAMBA	Zharo	albertyo@gmail.com	098765	activo	2025-01-09 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
87	391011559001	 CAGUANAPAMBA	COMUNA	Plan familiar	1930-08-05	CAGUNAPAMBA 	Caguanapamba Centro	cagunba@gmail.com	0987654321	activo	2025-01-18 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
82	0300732476	PEDRO MARIA	BUÑAY CAMAS	Plan familiar	1960-11-01	SISID 	Cajon Tambo	pedro@gmail.com	0987654	activo	2025-01-08 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
97	0302839865	SANDRA ADELA	CAZHO LLIGUICHUSCA	Plan familiar	1995-08-04	TAMBO PARQUE DE LA MADRE 	Tambo	5cazho.sucesores@gmail.com	0997079497	activo	2025-01-06 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
44	0300741733	MARIA JESUS	YUPA CAGUANA 	Plan familiar	1958-12-12	CAGUANPAMABA	Caguanapamba Centro	mariaJ@gmail.com	098765	activo	2025-01-01 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
49	0301078705	MANUEL SANTIAGO	ZHAO BUÑAY	Plan familiar	1965-12-13	CAGUANAPAMBA	Caguanapamba Centro	zhaosantiago55@gmail.com	0987654098	activo	2025-01-15 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
101	0300818044	MANUEL JESUS	TENESACA YUPA	Plan Tercera Edad	1959-12-07	SISID  secar de la cadsa de leverato	Lirio Loma	pedroo@gmail.com	0987654	activo	2025-01-03 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
23	0300454600	 MARIA MANUELA	PALLCHIZACA YUPA	Plan Tercera Edad	1953-07-22	SISID	Cullcaloma	manuela@gmail.coma	09876543	activo	2025-01-15 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
74	0300317369	MARIA ROSA	TENEZACA PALLCHIZACA	Plan Tercera Edad	1940-06-18	SISID	Galuay	rosam@gmail.com	0987658756	activo	2025-01-21 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
88	0302536198	 BYRON ISRAEL	ROMERO MIRADANDA	Plan Tercera Edad	2007-08-08	Ingapirca	Ingapirca	israel@gmail.com	098765432	activo	2025-01-24 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
92	0300266830	MELCHOR 	QUIZHPI TENEZACA	Plan Básico	2007-08-17	SISID 	Cashaloma	qmaulchor@gmail.com	0987654321	activo	2025-01-02 19:00:00-05	2025-09-01 14:55:06.314618-05	15.00	
14	0301238796	EHMA LUCIA	ANGAMARCA YAMASQUI	Plan Preferencial	1964-08-19	SISID	Sisid Centro	lucias@gmail.com	0987654387	activo	2025-01-17 19:00:00-05	2025-09-01 14:55:06.315174-05	10.00	
85	391010889001	 SAN ISIDRO DE VENDELECHE	COOPERATIVA AGROPECUARIO	Plan familiar	1960-10-26	VENDE LECHE	Centro de acopio Vende Leche	sanisidro@gmail.com	0987654	activo	2025-01-05 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
68	0301254009	 LUCIO VERDADERO	QUIZHPI CODO	Plan familiar	1972-11-28	MARCOPAMBA CENTRO 	Marco Pamba	codo@gmail.com	0987654	activo	2025-01-09 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
83	0302543210	GLADIS ALEGRIA 	MAURIZACA TENEZACA	Plan familiar	2005-11-06	SISID	Cullcaloma	gladis@gmail.com	098765	activo	2025-01-13 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	123456789
11	0300866464	MARIA FRANCISCA	YUPA DUTAN 	Plan familiar	1979-09-05	Caguanapamba	Naug Nag	francisca@gmail.com	0987654	activo	2025-01-25 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
99	0302042669	NARCISO	QUIZPI ROMERO 	Plan familiar	2007-08-16	SISID ANEJO	Sisid Anejo	narciso@gmail.com	09876543	activo	2025-01-16 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
96	0300586088	MARGARITA	CASTILLO CORONEL 	Plan Tercera Edad	2007-08-09	SISID	Sisid Centro	inesgahui25@gmail.com	0992554640	activo	2025-01-28 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
47	0300798188	 MARIA MANUELA	YUPA ALVAREZ	Plan Tercera Edad	1953-08-06	CAGUANAPAMBA	Naug Nag	mmaria@gmail.com	0987654	activo	2025-01-27 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
25	0300646668	 CAITANO	QUIZHPI PALCHIZACA	Plan Tercera Edad	1945-02-03	SISID	Sisid Centro	cae@gmail.com	098765	activo	2025-01-23 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
71	0300515095	 LORENZA	YUPA YUPA	Plan Tercera Edad	1955-04-07	CAGUNAPAMBA	Zharo	lor@gmail.com	0987654	activo	2025-01-05 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
58	0301307203	MARIA BRIJIDA	PALLCHISACA CAGUANA 	Plan familiar	1969-03-11	SISID 	Rumiloma	brijida@gmail.com	09876543	activo	2025-01-13 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
19	0604092098	HILDA VIOLETA	VINAN VINAN 	Plan familiar	1987-05-18	CAGUNAPAMBA	Naug Nag	hilda@gmail.com	09876543	activo	2025-01-28 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
54	0302567680	 DAVID ELIAS	CHIMBORAZO YUPA	Plan familiar	1994-01-10	AGUNAPAMBA	Caguanapamba Centro	elias@gmail.com	0987654	activo	2025-01-21 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
22	0300690559	 MARCOS	ROMERO PALCHIZACA	Plan familiar	1960-10-31	SISID 	Rumiloma	marco@gmail.com	0987654	activo	2025-01-07 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
45	0301653713	MARIA JUANA	CAGUANA CAGUANA 	Plan familiar	1979-11-08	CAGUANAPMABA	Naug Nag	juanyupa73@gmail.com	09876	activo	2025-01-06 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
67	0302631494	 EDISON FERNANDO	PASTUISACA VERDUGO	Plan familiar	1995-05-21	CAÑAR PARQUE CENTRAL 	Tambo	edificio@gmail.com		activo	2025-01-10 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
70	0301253084	 BALTAZARA	QUIZHPI PALLCHIZACA	Plan familiar	1972-07-17	CHUICHUN	Ana maria	balt@gmail.com	09876	activo	2025-01-04 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
24	0302333984	ZOILA MERCEDES	SOLORZANO CASTILLO 	Plan familiar	1997-08-04	SISD	Sisid Centro	solorzano@gmail.comM	098765	activo	2025-01-14 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
29	0303140917	 ALEX VICENTE	TENEZACA ANGAMARCA	Plan familiar	1999-08-11	SISID	Cullcaloma	vicente@gmail.com	098765	activo	2025-01-29 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
69	0301026308	 MARIA MERCEDES	DUTAN DUTAN	Plan familiar	1969-05-10	CAGUANAPMABA	Zharo	mermaria@gmail.com	098765	activo	2025-01-26 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
20	0302443031	 VERONICA ALEXANDRA	YUPA YUPA 	Plan familiar	1997-10-24	CAGUNAPAMBA	Naug Nag	vero@gmail.com	09876543	activo	2025-01-23 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
56	0350446373	KAREN JHULEY	CAÑAR DUTAN	Plan Tercera Edad	2005-01-10	CAGUANAPAMBA	Caguanapamba Centro	juliey@gmail.com	0983825558	activo	2025-01-30 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
77	0300420890	MARIA SEMIRA	ANGAMARCA ANGAMARCA	Plan Tercera Edad	1948-08-14	SISID	Sisid Centro	semira@gmail.com	0998109704	activo	2025-01-12 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
94	0300464989	MARIA AURORA	DUTAN YAMASQUI	Plan Tercera Edad	2007-08-01	SISID	Galuay	auroraa@gmail.com	0987654	activo	2025-01-15 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
80	0300417268	 LIBERATO	QUIZHPI ORTEGA	Plan Tercera Edad	1949-10-04	SISID 	Rumiloma	liberato@gmail.com	098765	activo	2025-01-10 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
1	0300624970	MARIA GUADALUPE	ANGAMARCA ANGAMARCA	Plan Tercera Edad	1958-09-04	Sisid	Cullcaloma	vangamarca4@gmail.com	0999859689	activo	2025-01-16 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	2115692403
12	0300317872	 JOSEFA	PALLCHISACA CAGUANA	Plan Tercera Edad	1946-09-13	SISID	Cullcaloma	josefa@gmail.com	0987654	activo	2024-12-31 19:00:00-05	2025-09-01 14:55:06.313204-05	18.00	
46	0302051735	MARIA JACOBA	PINGUIL CAGUANA	Plan Básico	1984-05-02	CAGUANAPAMBA	Naug Nag	mpinguil37@gmail.com	0995579815	activo	2025-01-20 19:00:00-05	2025-09-01 14:55:06.314618-05	15.00	
61	0302580873	 LUIS GEOVANNY	CAGUANA YUPA	Plan familiar	2001-06-11	CAGUANAPAMBA	Caguanapamba Centro	jova@gmail.com	09876	activo	2025-01-22 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
72	0301580775	MARIA LIBERATA	YUPA CUZCO	Plan familiar	2000-06-02	SISID	Galuay	live@gmail.com	0987658765	activo	2025-01-04 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
9	0302426846	MARIA LUZ	TENEZACA ANGAMARCA	Plan familiar	1988-01-13	SISID	Cullcaloma	mluz@gmail.com	09876545	activo	2025-01-04 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
15	0303012470	KEVIN LEONARDO	SAETEROS SIGUENCIA 	Plan familiar	2003-09-17	SISID	Cullcaloma	saeteros@gmail.com	0987654	activo	2025-01-05 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
41	0301623161	 MARIA MATEA	TENEZACA DUTAN	Plan familiar	1955-04-11	SISID 	Cullcaloma	mmatea@gmail.com	098765765	activo	2025-01-11 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
2	0300967031	MARIA MANUELA	ANGAMARCA CHIMBORAZO	Plan familiar	1963-11-04	SISID 	Cullcaloma	angamarcam483@gmail.com	0984400153	activo	2025-01-29 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
8	0301386538	SERGIO	TENEZACA PAUCAR	Plan familiar	1975-10-07	SISID 	Cullcaloma	serio@gmail.com	0998969106	activo	2025-01-08 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
16	0350001863	 WILIN PATRICIO	TENEZACA TENEZACA	Plan familiar	1997-02-13	SISID	Cashaloma	patricio@gmail.com	09876543	activo	2025-01-17 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
62	0301029187	ALFONSO	MAYANCELA CAGUANA 	Plan familiar	1967-04-29	CAGUANAPMABA	Caguanapamba Centro	alfonso@gmail.com	098765	activo	2025-01-14 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
13	0301563649	 LORENZO	ANGAMARCA 	Plan familiar	1967-10-05	SISID	Churuguayco	lorenzo@gmail.com	09876543	activo	2025-01-19 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
6	0300902095	MARIA MATEA	TENEZACA CUZCO	Plan familiar	1966-08-31	SISID 	Cullcaloma		098765	activo	2025-01-26 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
10	0300584380	 ANTONIO	ANGAMARCA YAMASQUI	Plan familiar	1986-07-04	SISID	Sisid Centro	antonio@gmail.com	09876543	activo	2025-01-18 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
27	0300849296	MARIA MERCEDES	DUTAN ANGAMARCA	Plan familiar	1960-06-07	SISID	Churuguayco	merce@gmail.com	098765	activo	2025-01-10 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
52	0301846317	MANUEL ALEJANDRO	YUPA PAUCAR	Plan familiar	1982-07-12	SISID	Galuay	ale@gmail.com	0987650987	activo	2025-01-17 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
4	0300791845	MARIA AURORA	TENEZACA CUZCO	Plan familiar	1987-06-03	SISID	Cullcaloma	aurora@gmail.com	098765432	activo	2025-01-20 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
18	0301838108	MARIA MAGDALENA	 PALCHIZACA YUPA	Plan familiar	1977-12-29	SISID	Rumiloma	magdalena@gmail.com	0987654	activo	2025-01-03 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
51	0300999927	MARIA TRANSITO	GUALLPA CAZHO	Plan familiar	1967-09-25	SISID	Cullcaloma	tranci@gmail.com	098765	activo	2025-01-22 19:00:00-05	2025-09-01 14:55:06.301746-05	20.00	
\.


--
-- Data for Name: clientes_planes; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.clientes_planes (id_cliente_plan, id_cliente, id_plan, fecha_inicio, fecha_fin, estado, fecha_creacion, fecha_actualizacion) FROM stdin;
1	28	2	2025-01-31	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
2	79	1	2025-01-01	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
3	48	1	2025-01-03	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
4	55	1	2025-01-08	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
5	86	1	2025-01-13	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
6	81	1	2025-01-26	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
8	53	2	2025-01-08	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
9	66	2	2025-01-28	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
10	17	1	2025-01-01	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
11	65	1	2025-01-15	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
12	3	1	2025-01-25	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
13	76	1	2025-01-12	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
14	50	2	2025-01-12	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
15	64	1	2025-01-02	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
16	75	1	2025-01-09	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
17	78	1	2025-01-02	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
18	21	1	2025-01-07	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
19	60	1	2025-01-03	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
20	98	2	2025-01-13	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
21	5	1	2025-01-20	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
22	7	1	2025-01-14	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
23	26	1	2025-01-17	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
24	42	1	2025-01-04	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
25	57	1	2025-01-10	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
26	87	1	2025-01-19	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
27	82	1	2025-01-09	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
28	97	1	2025-01-07	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
29	44	1	2025-01-02	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
30	49	1	2025-01-16	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
31	101	2	2025-01-04	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
32	23	2	2025-01-16	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
33	74	2	2025-01-22	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
34	88	2	2025-01-25	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
35	92	3	2025-01-03	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
36	14	4	2025-01-18	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
37	85	1	2025-01-06	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
38	68	1	2025-01-10	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
39	83	1	2025-01-14	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
40	11	1	2025-01-26	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
41	99	1	2025-01-17	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
42	96	2	2025-01-29	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
43	47	2	2025-01-28	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
44	25	2	2025-01-24	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
45	71	2	2025-01-06	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
46	58	1	2025-01-14	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
47	19	1	2025-01-29	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
48	54	1	2025-01-22	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
49	22	1	2025-01-08	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
50	45	1	2025-01-07	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
51	67	1	2025-01-11	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
52	70	1	2025-01-05	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
53	24	1	2025-01-15	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
54	29	1	2025-01-30	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
55	69	1	2025-01-27	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
56	20	1	2025-01-24	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
58	77	2	2025-01-13	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
59	94	2	2025-01-16	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
60	80	2	2025-01-11	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
61	1	2	2025-01-17	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
62	12	2	2025-01-01	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
63	46	3	2025-01-21	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
64	61	1	2025-01-23	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
65	72	1	2025-01-05	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
66	9	1	2025-01-05	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
67	15	1	2025-01-06	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
68	41	1	2025-01-12	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
69	2	1	2025-01-30	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
70	8	1	2025-01-09	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
71	16	1	2025-01-18	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
72	62	1	2025-01-15	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
73	13	1	2025-01-20	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
74	6	1	2025-01-27	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
75	10	1	2025-01-19	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
76	27	1	2025-01-11	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
77	52	1	2025-01-18	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
78	4	1	2025-01-21	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
79	18	1	2025-01-04	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
80	51	1	2025-01-23	\N	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
7	95	1	2025-01-10	2025-09-03	inactivo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
91	95	1	2025-09-03	\N	activo	2025-09-03 14:38:27.56058	2025-09-03 14:38:27.560597
57	56	2	2025-01-31	2025-12-03	inactivo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
116	56	2	2025-12-03	\N	activo	2025-12-03 17:28:29.370818	2025-12-03 17:28:29.370824
118	127	2	2025-12-09	\N	activo	2025-12-09 15:23:38.678136	2025-12-09 15:23:38.678153
\.


--
-- Data for Name: deudas; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.deudas (id, cliente_id, plan_id, mes_anio, fecha_vencimiento, monto_deuda, monto_pagado, estado, meses_atraso, fecha_creacion, fecha_actualizacion, observaciones) FROM stdin;
2	28	3	2025-09-01	2025-09-05	15.00	0.00	al_dia	0	2025-09-02 17:26:23.686321-05	2025-09-02 17:26:23.686327-05	Deuda de prueba - September 2025
3	28	3	2025-08-01	2025-08-05	15.00	0.00	vencido	1	2025-09-02 17:26:23.689326-05	2025-09-02 17:26:23.689329-05	Deuda de prueba - August 2025
4	28	3	2025-07-01	2025-07-05	15.00	0.00	vencido	2	2025-09-02 17:26:23.691042-05	2025-09-02 17:26:23.691044-05	Deuda de prueba - July 2025
5	28	3	2025-06-01	2025-06-05	15.00	0.00	vencido	3	2025-09-02 17:26:23.69236-05	2025-09-02 17:26:23.692363-05	Deuda de prueba - June 2025
6	28	3	2025-05-01	2025-05-05	15.00	0.00	vencido	4	2025-09-02 17:26:23.693484-05	2025-09-02 17:26:23.693487-05	Deuda de prueba - May 2025
7	28	3	2025-04-01	2025-04-05	15.00	0.00	vencido	5	2025-09-02 17:26:23.694753-05	2025-09-02 17:26:23.694756-05	Deuda de prueba - April 2025
8	28	3	2025-03-01	2025-03-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.696043-05	2025-09-02 17:26:23.696046-05	Deuda de prueba - March 2025
9	28	3	2025-02-01	2025-02-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.697348-05	2025-09-02 17:26:23.697351-05	Deuda de prueba - February 2025
10	56	3	2025-09-01	2025-09-05	15.00	0.00	al_dia	0	2025-09-02 17:26:23.698943-05	2025-09-02 17:26:23.698946-05	Deuda de prueba - September 2025
11	56	3	2025-08-01	2025-08-05	15.00	0.00	vencido	1	2025-09-02 17:26:23.702168-05	2025-09-02 17:26:23.702172-05	Deuda de prueba - August 2025
12	56	3	2025-07-01	2025-07-05	15.00	0.00	vencido	2	2025-09-02 17:26:23.70389-05	2025-09-02 17:26:23.703893-05	Deuda de prueba - July 2025
13	56	3	2025-06-01	2025-06-05	15.00	0.00	vencido	3	2025-09-02 17:26:23.705141-05	2025-09-02 17:26:23.705143-05	Deuda de prueba - June 2025
14	56	3	2025-05-01	2025-05-05	15.00	0.00	vencido	4	2025-09-02 17:26:23.70638-05	2025-09-02 17:26:23.706383-05	Deuda de prueba - May 2025
15	56	3	2025-04-01	2025-04-05	15.00	0.00	vencido	5	2025-09-02 17:26:23.707749-05	2025-09-02 17:26:23.707752-05	Deuda de prueba - April 2025
16	56	3	2025-03-01	2025-03-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.708925-05	2025-09-02 17:26:23.708928-05	Deuda de prueba - March 2025
17	56	3	2025-02-01	2025-02-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.710191-05	2025-09-02 17:26:23.710194-05	Deuda de prueba - February 2025
18	2	3	2025-09-01	2025-09-05	15.00	0.00	al_dia	0	2025-09-02 17:26:23.711608-05	2025-09-02 17:26:23.711611-05	Deuda de prueba - September 2025
19	2	3	2025-08-01	2025-08-05	15.00	0.00	vencido	1	2025-09-02 17:26:23.713039-05	2025-09-02 17:26:23.713042-05	Deuda de prueba - August 2025
20	2	3	2025-07-01	2025-07-05	15.00	0.00	vencido	2	2025-09-02 17:26:23.714298-05	2025-09-02 17:26:23.714301-05	Deuda de prueba - July 2025
21	2	3	2025-06-01	2025-06-05	15.00	0.00	vencido	3	2025-09-02 17:26:23.715862-05	2025-09-02 17:26:23.715865-05	Deuda de prueba - June 2025
22	2	3	2025-05-01	2025-05-05	15.00	0.00	vencido	4	2025-09-02 17:26:23.716952-05	2025-09-02 17:26:23.716955-05	Deuda de prueba - May 2025
23	2	3	2025-04-01	2025-04-05	15.00	0.00	vencido	5	2025-09-02 17:26:23.718319-05	2025-09-02 17:26:23.718322-05	Deuda de prueba - April 2025
24	2	3	2025-03-01	2025-03-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.719573-05	2025-09-02 17:26:23.719575-05	Deuda de prueba - March 2025
25	2	3	2025-02-01	2025-02-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.720942-05	2025-09-02 17:26:23.720945-05	Deuda de prueba - February 2025
26	29	3	2025-09-01	2025-09-05	15.00	0.00	al_dia	0	2025-09-02 17:26:23.722583-05	2025-09-02 17:26:23.722586-05	Deuda de prueba - September 2025
27	29	3	2025-08-01	2025-08-05	15.00	0.00	vencido	1	2025-09-02 17:26:23.723805-05	2025-09-02 17:26:23.723808-05	Deuda de prueba - August 2025
28	29	3	2025-07-01	2025-07-05	15.00	0.00	vencido	2	2025-09-02 17:26:23.724909-05	2025-09-02 17:26:23.724912-05	Deuda de prueba - July 2025
29	29	3	2025-06-01	2025-06-05	15.00	0.00	vencido	3	2025-09-02 17:26:23.726298-05	2025-09-02 17:26:23.726301-05	Deuda de prueba - June 2025
30	29	3	2025-05-01	2025-05-05	15.00	0.00	vencido	4	2025-09-02 17:26:23.727473-05	2025-09-02 17:26:23.727476-05	Deuda de prueba - May 2025
31	29	3	2025-04-01	2025-04-05	15.00	0.00	vencido	5	2025-09-02 17:26:23.728795-05	2025-09-02 17:26:23.728798-05	Deuda de prueba - April 2025
32	29	3	2025-03-01	2025-03-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.729781-05	2025-09-02 17:26:23.729784-05	Deuda de prueba - March 2025
33	29	3	2025-02-01	2025-02-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.730811-05	2025-09-02 17:26:23.730814-05	Deuda de prueba - February 2025
34	96	3	2025-09-01	2025-09-05	15.00	0.00	al_dia	0	2025-09-02 17:26:23.732201-05	2025-09-02 17:26:23.732204-05	Deuda de prueba - September 2025
35	96	3	2025-08-01	2025-08-05	15.00	0.00	vencido	1	2025-09-02 17:26:23.733551-05	2025-09-02 17:26:23.733554-05	Deuda de prueba - August 2025
36	96	3	2025-07-01	2025-07-05	15.00	0.00	vencido	2	2025-09-02 17:26:23.734657-05	2025-09-02 17:26:23.73466-05	Deuda de prueba - July 2025
37	96	3	2025-06-01	2025-06-05	15.00	0.00	vencido	3	2025-09-02 17:26:23.736045-05	2025-09-02 17:26:23.736048-05	Deuda de prueba - June 2025
38	96	3	2025-05-01	2025-05-05	15.00	0.00	vencido	4	2025-09-02 17:26:23.737198-05	2025-09-02 17:26:23.7372-05	Deuda de prueba - May 2025
39	96	3	2025-04-01	2025-04-05	15.00	0.00	vencido	5	2025-09-02 17:26:23.7382-05	2025-09-02 17:26:23.738203-05	Deuda de prueba - April 2025
40	96	3	2025-03-01	2025-03-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.739324-05	2025-09-02 17:26:23.739327-05	Deuda de prueba - March 2025
41	96	3	2025-02-01	2025-02-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.740334-05	2025-09-02 17:26:23.740337-05	Deuda de prueba - February 2025
42	19	3	2025-09-01	2025-09-05	15.00	0.00	al_dia	0	2025-09-02 17:26:23.742034-05	2025-09-02 17:26:23.742038-05	Deuda de prueba - September 2025
43	19	3	2025-08-01	2025-08-05	15.00	0.00	vencido	1	2025-09-02 17:26:23.74317-05	2025-09-02 17:26:23.743173-05	Deuda de prueba - August 2025
44	19	3	2025-07-01	2025-07-05	15.00	0.00	vencido	2	2025-09-02 17:26:23.744528-05	2025-09-02 17:26:23.744532-05	Deuda de prueba - July 2025
45	19	3	2025-06-01	2025-06-05	15.00	0.00	vencido	3	2025-09-02 17:26:23.745741-05	2025-09-02 17:26:23.745744-05	Deuda de prueba - June 2025
46	19	3	2025-05-01	2025-05-05	15.00	0.00	vencido	4	2025-09-02 17:26:23.747152-05	2025-09-02 17:26:23.747155-05	Deuda de prueba - May 2025
47	19	3	2025-04-01	2025-04-05	15.00	0.00	vencido	5	2025-09-02 17:26:23.748179-05	2025-09-02 17:26:23.748182-05	Deuda de prueba - April 2025
48	19	3	2025-03-01	2025-03-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.749665-05	2025-09-02 17:26:23.749668-05	Deuda de prueba - March 2025
49	19	3	2025-02-01	2025-02-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.750857-05	2025-09-02 17:26:23.75086-05	Deuda de prueba - February 2025
50	47	3	2025-09-01	2025-09-05	15.00	0.00	al_dia	0	2025-09-02 17:26:23.753043-05	2025-09-02 17:26:23.753046-05	Deuda de prueba - September 2025
51	47	3	2025-08-01	2025-08-05	15.00	0.00	vencido	1	2025-09-02 17:26:23.754008-05	2025-09-02 17:26:23.754011-05	Deuda de prueba - August 2025
52	47	3	2025-07-01	2025-07-05	15.00	0.00	vencido	2	2025-09-02 17:26:23.755024-05	2025-09-02 17:26:23.755027-05	Deuda de prueba - July 2025
53	47	3	2025-06-01	2025-06-05	15.00	0.00	vencido	3	2025-09-02 17:26:23.756215-05	2025-09-02 17:26:23.756218-05	Deuda de prueba - June 2025
54	47	3	2025-05-01	2025-05-05	15.00	0.00	vencido	4	2025-09-02 17:26:23.757491-05	2025-09-02 17:26:23.757493-05	Deuda de prueba - May 2025
55	47	3	2025-04-01	2025-04-05	15.00	0.00	vencido	5	2025-09-02 17:26:23.758892-05	2025-09-02 17:26:23.758895-05	Deuda de prueba - April 2025
56	47	3	2025-03-01	2025-03-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.760194-05	2025-09-02 17:26:23.760197-05	Deuda de prueba - March 2025
57	47	3	2025-02-01	2025-02-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.761433-05	2025-09-02 17:26:23.761436-05	Deuda de prueba - February 2025
58	66	3	2025-09-01	2025-09-05	15.00	0.00	al_dia	0	2025-09-02 17:26:23.763273-05	2025-09-02 17:26:23.763276-05	Deuda de prueba - September 2025
59	66	3	2025-08-01	2025-08-05	15.00	0.00	vencido	1	2025-09-02 17:26:23.76428-05	2025-09-02 17:26:23.764282-05	Deuda de prueba - August 2025
60	66	3	2025-07-01	2025-07-05	15.00	0.00	vencido	2	2025-09-02 17:26:23.765513-05	2025-09-02 17:26:23.765516-05	Deuda de prueba - July 2025
61	66	3	2025-06-01	2025-06-05	15.00	0.00	vencido	3	2025-09-02 17:26:23.76674-05	2025-09-02 17:26:23.766743-05	Deuda de prueba - June 2025
62	66	3	2025-05-01	2025-05-05	15.00	0.00	vencido	4	2025-09-02 17:26:23.767859-05	2025-09-02 17:26:23.767862-05	Deuda de prueba - May 2025
63	66	3	2025-04-01	2025-04-05	15.00	0.00	vencido	5	2025-09-02 17:26:23.769284-05	2025-09-02 17:26:23.769286-05	Deuda de prueba - April 2025
64	66	3	2025-03-01	2025-03-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.770246-05	2025-09-02 17:26:23.770249-05	Deuda de prueba - March 2025
65	66	3	2025-02-01	2025-02-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.771379-05	2025-09-02 17:26:23.771382-05	Deuda de prueba - February 2025
66	69	3	2025-09-01	2025-09-05	15.00	0.00	al_dia	0	2025-09-02 17:26:23.772672-05	2025-09-02 17:26:23.772675-05	Deuda de prueba - September 2025
67	69	3	2025-08-01	2025-08-05	15.00	0.00	vencido	1	2025-09-02 17:26:23.774044-05	2025-09-02 17:26:23.774046-05	Deuda de prueba - August 2025
68	69	3	2025-07-01	2025-07-05	15.00	0.00	vencido	2	2025-09-02 17:26:23.776846-05	2025-09-02 17:26:23.776849-05	Deuda de prueba - July 2025
69	69	3	2025-06-01	2025-06-05	15.00	0.00	vencido	3	2025-09-02 17:26:23.77805-05	2025-09-02 17:26:23.778053-05	Deuda de prueba - June 2025
70	69	3	2025-05-01	2025-05-05	15.00	0.00	vencido	4	2025-09-02 17:26:23.779351-05	2025-09-02 17:26:23.779353-05	Deuda de prueba - May 2025
71	69	3	2025-04-01	2025-04-05	15.00	0.00	vencido	5	2025-09-02 17:26:23.780608-05	2025-09-02 17:26:23.780611-05	Deuda de prueba - April 2025
72	69	3	2025-03-01	2025-03-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.78272-05	2025-09-02 17:26:23.782723-05	Deuda de prueba - March 2025
73	69	3	2025-02-01	2025-02-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.783689-05	2025-09-02 17:26:23.783691-05	Deuda de prueba - February 2025
74	6	3	2025-09-01	2025-09-05	15.00	0.00	al_dia	0	2025-09-02 17:26:23.785021-05	2025-09-02 17:26:23.785024-05	Deuda de prueba - September 2025
75	6	3	2025-08-01	2025-08-05	15.00	0.00	vencido	1	2025-09-02 17:26:23.786754-05	2025-09-02 17:26:23.786756-05	Deuda de prueba - August 2025
76	6	3	2025-07-01	2025-07-05	15.00	0.00	vencido	2	2025-09-02 17:26:23.787946-05	2025-09-02 17:26:23.787949-05	Deuda de prueba - July 2025
77	6	3	2025-06-01	2025-06-05	15.00	0.00	vencido	3	2025-09-02 17:26:23.789157-05	2025-09-02 17:26:23.789159-05	Deuda de prueba - June 2025
78	6	3	2025-05-01	2025-05-05	15.00	0.00	vencido	4	2025-09-02 17:26:23.790669-05	2025-09-02 17:26:23.790671-05	Deuda de prueba - May 2025
79	6	3	2025-04-01	2025-04-05	15.00	0.00	vencido	5	2025-09-02 17:26:23.791752-05	2025-09-02 17:26:23.791755-05	Deuda de prueba - April 2025
80	6	3	2025-03-01	2025-03-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.792901-05	2025-09-02 17:26:23.792904-05	Deuda de prueba - March 2025
81	6	3	2025-02-01	2025-02-05	15.00	0.00	vencido	7	2025-09-02 17:26:23.793986-05	2025-09-02 17:26:23.793988-05	Deuda de prueba - February 2025
\.


--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.django_admin_log (id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id) FROM stdin;
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	admin	logentry
2	auth	permission
3	auth	group
4	contenttypes	contenttype
5	sessions	session
6	usuarios	usuario
7	clientes	cliente
8	pagos	gasto
9	pagos	pago
10	notificaciones	notificacion
11	sitio_web	configuracionsitio
12	sitio_web	empresa
13	sitio_web	informacionsitio
14	sitio_web	servicio
15	sitio_web	redsocial
16	configuracion	configuracionsistema
17	configuracion	plan
18	configuracion	sector
19	sitio_web	plan
20	sitio_web	cobertura
21	sitio_web	contacto
22	sitio_web	carrusel
23	sitio_web	header
24	sitio_web	footer
25	sectores_app	sector
26	planes_app	plan
27	clientes_planes_app	clienteplan
28	chatbot	conversacionchatbot
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2025-08-21 13:34:55.917403-05
2	contenttypes	0002_remove_content_type_name	2025-08-22 22:08:54.175152-05
3	auth	0001_initial	2025-08-22 22:08:54.180029-05
4	auth	0002_alter_permission_name_max_length	2025-08-22 22:08:54.181968-05
5	auth	0003_alter_user_email_max_length	2025-08-22 22:08:54.184035-05
6	auth	0004_alter_user_username_opts	2025-08-22 22:08:54.185572-05
7	auth	0005_alter_user_last_login_null	2025-08-22 22:08:54.186707-05
8	auth	0006_require_contenttypes_0002	2025-08-22 22:08:54.188374-05
9	auth	0007_alter_validators_add_error_messages	2025-08-22 22:08:54.190046-05
10	auth	0008_alter_user_username_max_length	2025-08-22 22:08:54.191161-05
11	auth	0009_alter_user_last_name_max_length	2025-08-22 22:08:54.192872-05
12	auth	0010_alter_group_name_max_length	2025-08-22 22:08:54.194554-05
13	auth	0011_update_proxy_permissions	2025-08-22 22:08:54.196568-05
14	auth	0012_alter_user_first_name_max_length	2025-08-22 22:08:54.197598-05
15	usuarios	0001_initial	2025-08-22 22:08:54.198444-05
16	admin	0001_initial	2025-08-22 22:08:54.200085-05
17	admin	0002_logentry_remove_auto_add	2025-08-22 22:08:54.201923-05
18	admin	0003_logentry_add_action_flag_choices	2025-08-22 22:08:54.202919-05
19	clientes	0001_initial	2025-08-22 22:08:54.203863-05
20	clientes	0002_alter_cliente_apellidos_alter_cliente_cedula_and_more	2025-08-22 22:08:54.205438-05
21	notificaciones	0001_initial	2025-08-22 22:08:54.207267-05
22	notificaciones	0002_alter_configuracion_table	2025-08-22 22:08:54.208465-05
23	notificaciones	0003_delete_configuracion	2025-08-22 22:08:54.210312-05
24	notificaciones	0004_llamadaautomatizada	2025-08-22 22:08:54.211853-05
25	notificaciones	0005_delete_llamadaautomatizada	2025-08-22 22:08:54.213996-05
26	pagos	0001_initial	2025-08-22 22:08:54.215749-05
27	pagos	0002_initial	2025-08-22 22:08:54.21666-05
28	sessions	0001_initial	2025-08-22 22:08:54.217978-05
29	sitio_web	0001_initial	2025-08-22 22:08:54.219001-05
30	usuarios	0002_remove_usuario_fecha_actualizacion_and_more	2025-08-22 22:08:54.220557-05
31	configuracion	0001_initial	2025-08-24 17:02:36.804552-05
32	sitio_web	0002_auto_20250825_1515	2025-08-25 15:16:43.46807-05
33	sitio_web	0004_auto_20250825_1537	2025-08-25 15:44:08.00072-05
34	sitio_web	0005_auto_20250825_1602	2025-08-25 16:02:50.18279-05
35	sectores_app	0001_initial	2025-09-01 15:44:16.840587-05
36	planes_app	0001_initial	2025-09-01 15:44:30.486962-05
37	clientes	0003_remove_cliente_precio_plan_remove_cliente_sector_and_more	2025-09-01 15:44:35.527084-05
38	clientes_planes_app	0001_initial	2025-09-01 15:44:35.529095-05
39	sitio_web	0006_redsocial_fecha_creacion_redsocial_icono_and_more	2025-09-02 17:18:30.518785-05
40	usuarios	0003_usuario_last_activity_and_more	2026-03-25 20:31:00.143531-05
\.


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.django_session (session_key, session_data, expire_date) FROM stdin;
\.


--
-- Data for Name: gastos; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.gastos (id, descripcion, categoria, monto, fecha_gasto, proveedor, metodo_pago, comprobante_url, usuario_id, fecha_creacion) FROM stdin;
\.


--
-- Data for Name: historial_deudas; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.historial_deudas (id, deuda_id, tipo_cambio, descripcion, monto_anterior, monto_nuevo, estado_anterior, estado_nuevo, fecha_cambio, usuario) FROM stdin;
2	2	creacion	Deuda de prueba creada para September 2025	\N	15.00	\N	al_dia	2025-09-02 17:26:23.687885-05	sistema
3	3	creacion	Deuda de prueba creada para August 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.690093-05	sistema
4	4	creacion	Deuda de prueba creada para July 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.691543-05	sistema
5	5	creacion	Deuda de prueba creada para June 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.692792-05	sistema
6	6	creacion	Deuda de prueba creada para May 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.693963-05	sistema
7	7	creacion	Deuda de prueba creada para April 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.695191-05	sistema
8	8	creacion	Deuda de prueba creada para March 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.69665-05	sistema
9	9	creacion	Deuda de prueba creada para February 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.697701-05	sistema
10	10	creacion	Deuda de prueba creada para September 2025	\N	15.00	\N	al_dia	2025-09-02 17:26:23.699499-05	sistema
11	11	creacion	Deuda de prueba creada para August 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.702843-05	sistema
12	12	creacion	Deuda de prueba creada para July 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.704409-05	sistema
13	13	creacion	Deuda de prueba creada para June 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.705472-05	sistema
14	14	creacion	Deuda de prueba creada para May 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.706977-05	sistema
15	15	creacion	Deuda de prueba creada para April 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.708127-05	sistema
16	16	creacion	Deuda de prueba creada para March 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.709283-05	sistema
17	17	creacion	Deuda de prueba creada para February 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.710556-05	sistema
18	18	creacion	Deuda de prueba creada para September 2025	\N	15.00	\N	al_dia	2025-09-02 17:26:23.71211-05	sistema
19	19	creacion	Deuda de prueba creada para August 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.713391-05	sistema
20	20	creacion	Deuda de prueba creada para July 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.715015-05	sistema
21	21	creacion	Deuda de prueba creada para June 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.716237-05	sistema
22	22	creacion	Deuda de prueba creada para May 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.717494-05	sistema
23	23	creacion	Deuda de prueba creada para April 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.71867-05	sistema
24	24	creacion	Deuda de prueba creada para March 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.720078-05	sistema
25	25	creacion	Deuda de prueba creada para February 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.721274-05	sistema
26	26	creacion	Deuda de prueba creada para September 2025	\N	15.00	\N	al_dia	2025-09-02 17:26:23.723101-05	sistema
27	27	creacion	Deuda de prueba creada para August 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.724187-05	sistema
28	28	creacion	Deuda de prueba creada para July 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.725437-05	sistema
29	29	creacion	Deuda de prueba creada para June 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.726621-05	sistema
30	30	creacion	Deuda de prueba creada para May 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.727972-05	sistema
31	31	creacion	Deuda de prueba creada para April 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.729127-05	sistema
32	32	creacion	Deuda de prueba creada para March 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.730111-05	sistema
33	33	creacion	Deuda de prueba creada para February 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.731161-05	sistema
34	34	creacion	Deuda de prueba creada para September 2025	\N	15.00	\N	al_dia	2025-09-02 17:26:23.732774-05	sistema
35	35	creacion	Deuda de prueba creada para August 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.733909-05	sistema
36	36	creacion	Deuda de prueba creada para July 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.735142-05	sistema
37	37	creacion	Deuda de prueba creada para June 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.736558-05	sistema
38	38	creacion	Deuda de prueba creada para May 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.737551-05	sistema
39	39	creacion	Deuda de prueba creada para April 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.73852-05	sistema
40	40	creacion	Deuda de prueba creada para March 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.73967-05	sistema
41	41	creacion	Deuda de prueba creada para February 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.740705-05	sistema
42	42	creacion	Deuda de prueba creada para September 2025	\N	15.00	\N	al_dia	2025-09-02 17:26:23.742399-05	sistema
43	43	creacion	Deuda de prueba creada para August 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.743685-05	sistema
44	44	creacion	Deuda de prueba creada para July 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.744857-05	sistema
45	45	creacion	Deuda de prueba creada para June 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.746244-05	sistema
46	46	creacion	Deuda de prueba creada para May 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.747511-05	sistema
47	47	creacion	Deuda de prueba creada para April 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.748659-05	sistema
48	48	creacion	Deuda de prueba creada para March 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.750059-05	sistema
49	49	creacion	Deuda de prueba creada para February 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.751482-05	sistema
50	50	creacion	Deuda de prueba creada para September 2025	\N	15.00	\N	al_dia	2025-09-02 17:26:23.753369-05	sistema
51	51	creacion	Deuda de prueba creada para August 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.754304-05	sistema
52	52	creacion	Deuda de prueba creada para July 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.755442-05	sistema
53	53	creacion	Deuda de prueba creada para June 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.756599-05	sistema
54	54	creacion	Deuda de prueba creada para May 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.758124-05	sistema
55	55	creacion	Deuda de prueba creada para April 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.759409-05	sistema
56	56	creacion	Deuda de prueba creada para March 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.76055-05	sistema
57	57	creacion	Deuda de prueba creada para February 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.761949-05	sistema
58	58	creacion	Deuda de prueba creada para September 2025	\N	15.00	\N	al_dia	2025-09-02 17:26:23.763617-05	sistema
59	59	creacion	Deuda de prueba creada para August 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.76464-05	sistema
60	60	creacion	Deuda de prueba creada para July 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.766021-05	sistema
61	61	creacion	Deuda de prueba creada para June 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.767089-05	sistema
62	62	creacion	Deuda de prueba creada para May 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.768594-05	sistema
63	63	creacion	Deuda de prueba creada para April 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.769597-05	sistema
64	64	creacion	Deuda de prueba creada para March 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.770576-05	sistema
65	65	creacion	Deuda de prueba creada para February 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.771684-05	sistema
66	66	creacion	Deuda de prueba creada para September 2025	\N	15.00	\N	al_dia	2025-09-02 17:26:23.773195-05	sistema
67	67	creacion	Deuda de prueba creada para August 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.774452-05	sistema
68	68	creacion	Deuda de prueba creada para July 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.777177-05	sistema
69	69	creacion	Deuda de prueba creada para June 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.77855-05	sistema
70	70	creacion	Deuda de prueba creada para May 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.779685-05	sistema
71	71	creacion	Deuda de prueba creada para April 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.78206-05	sistema
72	72	creacion	Deuda de prueba creada para March 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.783061-05	sistema
73	73	creacion	Deuda de prueba creada para February 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.784026-05	sistema
74	74	creacion	Deuda de prueba creada para September 2025	\N	15.00	\N	al_dia	2025-09-02 17:26:23.785817-05	sistema
75	75	creacion	Deuda de prueba creada para August 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.787283-05	sistema
76	76	creacion	Deuda de prueba creada para July 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.788277-05	sistema
77	77	creacion	Deuda de prueba creada para June 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.79003-05	sistema
78	78	creacion	Deuda de prueba creada para May 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.791035-05	sistema
79	79	creacion	Deuda de prueba creada para April 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.792098-05	sistema
80	80	creacion	Deuda de prueba creada para March 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.793236-05	sistema
81	81	creacion	Deuda de prueba creada para February 2025	\N	15.00	\N	vencido	2025-09-02 17:26:23.794485-05	sistema
\.


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.notificaciones (id, cliente_id, tipo, mensaje, fecha_envio, estado, canal, fecha_creacion, fecha_programada, intentos) FROM stdin;
317	1	pago_proximo	AVISO: Su factura está vencida. Su servicio será suspendido si no realiza el pago en las próximas 24 horas.	\N	pendiente	whatsapp	2026-03-23 14:44:13.90737-05	\N	0
318	78	pago_vencido	Hola ISAURA, este es un recordatorio de TelTec Net. Tu deuda actual es de $296.667. Por favor realiza tu pago para evitar la suspensión del servicio.	\N	pendiente	whatsapp	2026-03-23 14:44:28.578859-05	\N	0
\.


--
-- Data for Name: pagos; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.pagos (id, cliente_id, monto, fecha_pago, metodo_pago, concepto, estado, comprobante_enviado, numero_comprobante, fecha_creacion, fecha_vencimiento, observaciones, concepto_mes) FROM stdin;
1072	2	20.00	2025-09-02	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250902-00001	2025-09-02 16:52:57.056908-05	\N	\N	\N
1073	2	20.00	2025-09-02	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250902-00002	2025-09-02 16:52:57.068951-05	\N	\N	\N
1074	2	20.00	2025-09-02	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250902-00003	2025-09-02 16:52:57.070626-05	\N	\N	\N
1075	2	20.00	2025-09-02	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250902-00004	2025-09-02 16:52:57.072237-05	\N	\N	\N
1076	2	20.00	2025-09-02	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250902-00005	2025-09-02 16:52:57.073613-05	\N	\N	\N
1077	3	20.00	2025-09-02	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250902-00006	2025-09-02 16:54:55.66385-05	\N	\N	\N
1078	3	20.00	2025-09-02	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250902-00007	2025-09-02 16:54:55.670846-05	\N	\N	\N
1079	3	20.00	2025-09-02	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250902-00008	2025-09-02 16:54:55.671692-05	\N	\N	\N
1080	3	20.00	2025-09-02	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250902-00009	2025-09-02 16:54:55.672489-05	\N	\N	\N
1081	3	20.00	2025-09-02	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250902-00010	2025-09-02 16:54:55.67329-05	\N	\N	\N
1082	3	20.00	2025-09-02	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250902-00011	2025-09-02 16:54:55.674082-05	\N	\N	\N
1083	3	20.00	2025-09-02	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250902-00012	2025-09-02 16:54:55.674863-05	\N	\N	\N
1084	1	18.00	2025-09-02	efectivo	Pago mensual - Agosto 2025 - Plan Tercera Edad	completado	f	TELTEC-20250902-00013	2025-09-02 16:56:01.324973-05	\N	\N	\N
1085	1	18.00	2025-09-02	efectivo	Pago mensual - Julio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250902-00014	2025-09-02 16:56:01.331353-05	\N	\N	\N
1086	1	18.00	2025-09-02	efectivo	Pago mensual - Junio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250902-00015	2025-09-02 16:56:01.332356-05	\N	\N	\N
1087	1	18.00	2025-09-02	efectivo	Pago mensual - Abril 2025 - Plan Tercera Edad	completado	f	TELTEC-20250902-00016	2025-09-02 16:56:01.333224-05	\N	\N	\N
1088	1	18.00	2025-09-02	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250902-00017	2025-09-02 16:56:01.33407-05	\N	\N	\N
1089	1	18.00	2025-09-02	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250902-00018	2025-09-02 16:56:01.335141-05	\N	\N	\N
1090	1	18.00	2025-09-02	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250902-00019	2025-09-02 16:56:01.336005-05	\N	\N	\N
1091	1	18.00	2025-09-02	efectivo	Pago mensual - Mayo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250902-00020	2025-09-02 16:56:01.336783-05	\N	\N	\N
1092	2	20.00	2025-09-02	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250902-00021	2025-09-02 17:44:18.13867-05	\N	\N	\N
1093	2	20.00	2025-09-02	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250902-00022	2025-09-02 17:44:18.145735-05	\N	\N	\N
1094	95	20.00	2025-09-03	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250903-00001	2025-09-03 09:46:05.30473-05	\N	\N	\N
1095	95	20.00	2025-09-03	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250903-00002	2025-09-03 09:46:05.316324-05	\N	\N	\N
1096	95	20.00	2025-09-03	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250903-00003	2025-09-03 09:46:05.317527-05	\N	\N	\N
1097	95	20.00	2025-09-03	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250903-00004	2025-09-03 09:46:05.318523-05	\N	\N	\N
1098	95	20.00	2025-09-03	efectivo	Pago mensual - Agosto 2025 - Plan familiar	completado	f	TELTEC-20250903-00005	2025-09-03 09:46:05.319604-05	\N	\N	\N
1099	95	20.00	2025-09-03	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250903-00006	2025-09-03 09:46:05.320604-05	\N	\N	\N
1100	95	20.00	2025-09-03	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250903-00007	2025-09-03 09:46:05.321578-05	\N	\N	\N
1101	95	20.00	2025-09-03	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250903-00008	2025-09-03 09:46:05.322695-05	\N	\N	\N
1102	50	18.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00001	2025-09-11 09:41:49.612524-05	\N	\N	\N
1103	50	18.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00002	2025-09-11 09:41:49.65045-05	\N	\N	\N
1104	50	18.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00003	2025-09-11 09:41:49.65117-05	\N	\N	\N
1105	50	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00004	2025-09-11 09:41:49.652029-05	\N	\N	\N
1106	50	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00005	2025-09-11 09:41:49.652681-05	\N	\N	\N
1107	50	18.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00006	2025-09-11 09:41:49.653295-05	\N	\N	\N
1108	50	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00007	2025-09-11 09:41:49.653936-05	\N	\N	\N
1109	50	18.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00008	2025-09-11 09:41:49.654604-05	\N	\N	\N
1110	82	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00009	2025-09-11 09:50:27.208598-05	\N	\N	\N
1111	82	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00010	2025-09-11 09:50:27.214349-05	\N	\N	\N
1112	82	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00011	2025-09-11 09:50:27.215416-05	\N	\N	\N
1113	82	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00012	2025-09-11 09:50:27.216209-05	\N	\N	\N
1114	82	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00013	2025-09-11 09:50:27.217088-05	\N	\N	\N
1115	82	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00014	2025-09-11 09:50:27.217926-05	\N	\N	\N
1116	4	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00015	2025-09-11 09:52:47.699213-05	\N	\N	\N
1117	4	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00016	2025-09-11 09:52:47.7051-05	\N	\N	\N
1118	4	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00017	2025-09-11 09:52:47.705887-05	\N	\N	\N
1119	4	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00018	2025-09-11 09:52:47.706621-05	\N	\N	\N
1120	4	20.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan familiar	completado	f	TELTEC-20250911-00019	2025-09-11 09:52:47.70741-05	\N	\N	\N
1121	4	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00020	2025-09-11 09:52:47.708195-05	\N	\N	\N
1122	4	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00021	2025-09-11 09:52:47.708971-05	\N	\N	\N
1123	4	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00022	2025-09-11 09:52:47.70958-05	\N	\N	\N
1124	5	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00023	2025-09-11 09:53:25.026219-05	\N	\N	\N
1125	5	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00024	2025-09-11 09:53:25.032191-05	\N	\N	\N
1126	5	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00025	2025-09-11 09:53:25.033032-05	\N	\N	\N
1127	5	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00026	2025-09-11 09:53:25.033846-05	\N	\N	\N
1128	5	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00027	2025-09-11 09:53:25.034614-05	\N	\N	\N
1129	5	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00028	2025-09-11 09:53:25.035375-05	\N	\N	\N
1130	5	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00029	2025-09-11 09:53:25.036127-05	\N	\N	\N
1131	6	20.00	2025-09-11	efectivo	Pago mensual - Septiembre 2025 - Plan familiar	completado	f	TELTEC-20250911-00030	2025-09-11 09:53:56.689988-05	\N	\N	\N
1132	6	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00031	2025-09-11 09:53:56.694457-05	\N	\N	\N
1133	6	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00032	2025-09-11 09:53:56.695244-05	\N	\N	\N
1134	6	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00033	2025-09-11 09:53:56.695908-05	\N	\N	\N
1135	6	20.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan familiar	completado	f	TELTEC-20250911-00034	2025-09-11 09:53:56.696732-05	\N	\N	\N
1136	6	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00035	2025-09-11 09:53:56.697331-05	\N	\N	\N
1137	6	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00036	2025-09-11 09:53:56.698168-05	\N	\N	\N
1138	6	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00037	2025-09-11 09:53:56.698765-05	\N	\N	\N
1139	6	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00038	2025-09-11 09:53:56.699363-05	\N	\N	\N
1140	7	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00039	2025-09-11 09:54:27.399327-05	\N	\N	\N
1141	7	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00040	2025-09-11 09:54:27.401948-05	\N	\N	\N
1142	7	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00041	2025-09-11 09:54:27.402675-05	\N	\N	\N
1143	7	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00042	2025-09-11 09:54:27.403368-05	\N	\N	\N
1144	7	20.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan familiar	completado	f	TELTEC-20250911-00043	2025-09-11 09:54:27.403971-05	\N	\N	\N
1145	7	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00044	2025-09-11 09:54:27.404547-05	\N	\N	\N
1146	7	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00045	2025-09-11 09:54:27.405155-05	\N	\N	\N
1147	7	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00046	2025-09-11 09:54:27.405709-05	\N	\N	\N
1148	8	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00047	2025-09-11 09:55:01.123908-05	\N	\N	\N
1149	8	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00048	2025-09-11 09:55:01.128962-05	\N	\N	\N
1150	8	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00049	2025-09-11 09:55:01.130224-05	\N	\N	\N
1151	8	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00050	2025-09-11 09:55:01.131125-05	\N	\N	\N
1152	9	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00051	2025-09-11 09:55:35.032718-05	\N	\N	\N
1153	9	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00052	2025-09-11 09:55:35.037457-05	\N	\N	\N
1154	9	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00053	2025-09-11 09:55:35.038551-05	\N	\N	\N
1155	9	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00054	2025-09-11 09:55:35.039633-05	\N	\N	\N
1156	9	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00055	2025-09-11 09:55:35.040848-05	\N	\N	\N
1157	9	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00056	2025-09-11 09:55:35.042117-05	\N	\N	\N
1158	9	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00057	2025-09-11 09:55:35.04325-05	\N	\N	\N
1159	10	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00058	2025-09-11 09:56:03.527601-05	\N	\N	\N
1160	10	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00059	2025-09-11 09:56:03.532805-05	\N	\N	\N
1161	10	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00060	2025-09-11 09:56:03.534745-05	\N	\N	\N
1162	10	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00061	2025-09-11 09:56:03.536693-05	\N	\N	\N
1163	10	20.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan familiar	completado	f	TELTEC-20250911-00062	2025-09-11 09:56:03.538707-05	\N	\N	\N
1164	10	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00063	2025-09-11 09:56:03.54057-05	\N	\N	\N
1165	10	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00064	2025-09-11 09:56:03.542469-05	\N	\N	\N
1166	10	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00065	2025-09-11 09:56:03.54423-05	\N	\N	\N
1167	10	20.00	2025-09-11	efectivo	Pago mensual - Septiembre 2025 - Plan familiar	completado	f	TELTEC-20250911-00066	2025-09-11 09:56:03.545884-05	\N	\N	\N
1168	11	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00067	2025-09-11 09:56:39.92069-05	\N	\N	\N
1169	11	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00068	2025-09-11 09:56:39.923786-05	\N	\N	\N
1170	11	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00069	2025-09-11 09:56:39.925072-05	\N	\N	\N
1171	11	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00070	2025-09-11 09:56:39.926115-05	\N	\N	\N
1172	11	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00071	2025-09-11 09:56:39.926924-05	\N	\N	\N
1173	11	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00072	2025-09-11 09:56:39.927806-05	\N	\N	\N
1174	12	18.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00073	2025-09-11 09:57:23.000281-05	\N	\N	\N
1175	12	18.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00074	2025-09-11 09:57:23.003156-05	\N	\N	\N
1176	12	18.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00075	2025-09-11 09:57:23.004088-05	\N	\N	\N
1177	12	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00076	2025-09-11 09:57:23.005526-05	\N	\N	\N
1178	12	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00077	2025-09-11 09:57:23.006613-05	\N	\N	\N
1179	12	18.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00078	2025-09-11 09:57:23.0075-05	\N	\N	\N
1180	12	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00079	2025-09-11 09:57:23.008319-05	\N	\N	\N
1181	13	20.00	2025-09-11	efectivo	Pago mensual - Noviembre 2025 - Plan familiar	completado	f	TELTEC-20250911-00080	2025-09-11 09:58:07.429817-05	\N	\N	\N
1182	13	20.00	2025-09-11	efectivo	Pago mensual - Octubre 2025 - Plan familiar	completado	f	TELTEC-20250911-00081	2025-09-11 09:58:07.435985-05	\N	\N	\N
1183	13	20.00	2025-09-11	efectivo	Pago mensual - Septiembre 2025 - Plan familiar	completado	f	TELTEC-20250911-00082	2025-09-11 09:58:07.438101-05	\N	\N	\N
1184	13	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00083	2025-09-11 09:58:07.439984-05	\N	\N	\N
1185	13	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00084	2025-09-11 09:58:07.442009-05	\N	\N	\N
1186	13	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00085	2025-09-11 09:58:07.444348-05	\N	\N	\N
1187	13	20.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan familiar	completado	f	TELTEC-20250911-00086	2025-09-11 09:58:07.446255-05	\N	\N	\N
1188	13	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00087	2025-09-11 09:58:07.447944-05	\N	\N	\N
1189	13	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00088	2025-09-11 09:58:07.449684-05	\N	\N	\N
1190	13	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00089	2025-09-11 09:58:07.451396-05	\N	\N	\N
1191	13	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00090	2025-09-11 09:58:07.453058-05	\N	\N	\N
1192	14	12.50	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00091	2025-09-11 09:58:47.286394-05	\N	\N	\N
1193	14	12.50	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00092	2025-09-11 09:58:47.289705-05	\N	\N	\N
1194	14	12.50	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00093	2025-09-11 09:58:47.290507-05	\N	\N	\N
1195	14	12.50	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00094	2025-09-11 09:58:47.291254-05	\N	\N	\N
1196	14	12.50	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00095	2025-09-11 09:58:47.291935-05	\N	\N	\N
1197	14	12.50	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00096	2025-09-11 09:58:47.292617-05	\N	\N	\N
1198	14	12.50	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00097	2025-09-11 09:58:47.293355-05	\N	\N	\N
1199	14	12.50	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00098	2025-09-11 09:58:47.293998-05	\N	\N	\N
1200	14	12.50	2025-09-11	efectivo	Pago mensual - Octubre 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00099	2025-09-11 09:58:47.294615-05	\N	\N	\N
1201	14	12.50	2025-09-11	efectivo	Pago mensual - Noviembre 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00100	2025-09-11 09:58:47.295224-05	\N	\N	\N
1202	14	12.50	2025-09-11	efectivo	Pago mensual - Septiembre 2025 - Plan Preferencial Actualizado	completado	f	TELTEC-20250911-00101	2025-09-11 09:58:47.295802-05	\N	\N	\N
1203	15	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00102	2025-09-11 09:59:26.1097-05	\N	\N	\N
1204	15	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00103	2025-09-11 09:59:26.113142-05	\N	\N	\N
1205	15	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00104	2025-09-11 09:59:26.11419-05	\N	\N	\N
1206	15	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00105	2025-09-11 09:59:26.115259-05	\N	\N	\N
1207	15	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00106	2025-09-11 09:59:26.116289-05	\N	\N	\N
1208	15	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00107	2025-09-11 09:59:26.117268-05	\N	\N	\N
1209	15	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00108	2025-09-11 09:59:26.118516-05	\N	\N	\N
1210	16	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00109	2025-09-11 09:59:58.491761-05	\N	\N	\N
1211	16	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00110	2025-09-11 09:59:58.495195-05	\N	\N	\N
1212	16	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00111	2025-09-11 09:59:58.496292-05	\N	\N	\N
1213	16	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00112	2025-09-11 09:59:58.49737-05	\N	\N	\N
1214	16	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00113	2025-09-11 09:59:58.498508-05	\N	\N	\N
1215	16	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00114	2025-09-11 09:59:58.49959-05	\N	\N	\N
1216	16	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00115	2025-09-11 09:59:58.500987-05	\N	\N	\N
1217	17	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00116	2025-09-11 10:00:31.811187-05	\N	\N	\N
1218	17	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00117	2025-09-11 10:00:31.816985-05	\N	\N	\N
1219	17	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00118	2025-09-11 10:00:31.818031-05	\N	\N	\N
1220	17	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00119	2025-09-11 10:00:31.819072-05	\N	\N	\N
1221	17	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00120	2025-09-11 10:00:31.820128-05	\N	\N	\N
1222	17	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00121	2025-09-11 10:00:31.821194-05	\N	\N	\N
1223	17	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00122	2025-09-11 10:00:31.822583-05	\N	\N	\N
1224	18	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00123	2025-09-11 10:01:42.994365-05	\N	\N	\N
1225	18	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00124	2025-09-11 10:01:42.999059-05	\N	\N	\N
1226	18	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00125	2025-09-11 10:01:43.00126-05	\N	\N	\N
1227	18	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00126	2025-09-11 10:01:43.003208-05	\N	\N	\N
1228	18	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00127	2025-09-11 10:01:43.005449-05	\N	\N	\N
1229	18	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00128	2025-09-11 10:01:43.007283-05	\N	\N	\N
1230	20	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00129	2025-09-11 10:02:13.216495-05	\N	\N	\N
1231	20	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00130	2025-09-11 10:02:13.219149-05	\N	\N	\N
1232	20	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00131	2025-09-11 10:02:13.219749-05	\N	\N	\N
1233	20	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00132	2025-09-11 10:02:13.220315-05	\N	\N	\N
1234	20	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00133	2025-09-11 10:02:13.220963-05	\N	\N	\N
1235	20	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00134	2025-09-11 10:02:13.221525-05	\N	\N	\N
1236	23	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00135	2025-09-11 10:03:48.472336-05	\N	\N	\N
1237	23	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00136	2025-09-11 10:03:48.480083-05	\N	\N	\N
1238	23	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00137	2025-09-11 10:03:48.481859-05	\N	\N	\N
1239	24	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00138	2025-09-11 10:04:36.156404-05	\N	\N	\N
1240	24	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00139	2025-09-11 10:04:36.160282-05	\N	\N	\N
1241	24	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00140	2025-09-11 10:04:36.161317-05	\N	\N	\N
1242	24	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00141	2025-09-11 10:04:36.162429-05	\N	\N	\N
1243	24	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00142	2025-09-11 10:04:36.163507-05	\N	\N	\N
1244	24	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00143	2025-09-11 10:04:36.164582-05	\N	\N	\N
1245	24	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00144	2025-09-11 10:04:36.165626-05	\N	\N	\N
1246	25	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00145	2025-09-11 10:05:12.57796-05	\N	\N	\N
1247	25	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00146	2025-09-11 10:05:12.581412-05	\N	\N	\N
1248	25	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00147	2025-09-11 10:05:12.582303-05	\N	\N	\N
1249	26	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00148	2025-09-11 10:05:49.271421-05	\N	\N	\N
1250	26	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00149	2025-09-11 10:05:49.279459-05	\N	\N	\N
1251	26	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00150	2025-09-11 10:05:49.281105-05	\N	\N	\N
1252	26	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00151	2025-09-11 10:05:49.282811-05	\N	\N	\N
1253	26	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00152	2025-09-11 10:05:49.284378-05	\N	\N	\N
1254	26	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00153	2025-09-11 10:05:49.285883-05	\N	\N	\N
1255	27	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00154	2025-09-11 10:06:24.579063-05	\N	\N	\N
1256	27	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00155	2025-09-11 10:06:24.584324-05	\N	\N	\N
1257	27	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00156	2025-09-11 10:06:24.586395-05	\N	\N	\N
1258	27	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00157	2025-09-11 10:06:24.588032-05	\N	\N	\N
1259	27	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00158	2025-09-11 10:06:24.588887-05	\N	\N	\N
1260	27	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00159	2025-09-11 10:06:24.589698-05	\N	\N	\N
1261	27	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00160	2025-09-11 10:06:24.591457-05	\N	\N	\N
1262	28	18.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00161	2025-09-11 10:07:02.025313-05	\N	\N	\N
1263	28	18.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00162	2025-09-11 10:07:02.029139-05	\N	\N	\N
1264	28	18.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00163	2025-09-11 10:07:02.03031-05	\N	\N	\N
1265	28	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00164	2025-09-11 10:07:02.031703-05	\N	\N	\N
1266	28	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00165	2025-09-11 10:07:02.033522-05	\N	\N	\N
1267	28	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00166	2025-09-11 10:07:02.035696-05	\N	\N	\N
1268	28	18.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00167	2025-09-11 10:07:02.037647-05	\N	\N	\N
1269	29	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00168	2025-09-11 10:07:36.24125-05	\N	\N	\N
1270	29	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00169	2025-09-11 10:07:36.244757-05	\N	\N	\N
1271	29	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00170	2025-09-11 10:07:36.246812-05	\N	\N	\N
1272	29	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00171	2025-09-11 10:07:36.248829-05	\N	\N	\N
1273	29	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00172	2025-09-11 10:07:36.250808-05	\N	\N	\N
1274	29	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00173	2025-09-11 10:07:36.2528-05	\N	\N	\N
1275	29	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00174	2025-09-11 10:07:36.254839-05	\N	\N	\N
1276	41	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00175	2025-09-11 10:08:53.544991-05	\N	\N	\N
1277	41	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00176	2025-09-11 10:08:53.550101-05	\N	\N	\N
1278	41	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00177	2025-09-11 10:08:53.551087-05	\N	\N	\N
1279	41	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00178	2025-09-11 10:08:53.5522-05	\N	\N	\N
1280	41	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00179	2025-09-11 10:08:53.55344-05	\N	\N	\N
1281	42	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00180	2025-09-11 10:09:28.152239-05	\N	\N	\N
1282	44	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00181	2025-09-11 10:13:24.999944-05	\N	\N	\N
1283	44	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00182	2025-09-11 10:13:25.005935-05	\N	\N	\N
1284	44	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00183	2025-09-11 10:13:25.007076-05	\N	\N	\N
1285	44	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00184	2025-09-11 10:13:25.008218-05	\N	\N	\N
1286	44	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00185	2025-09-11 10:13:25.009486-05	\N	\N	\N
1287	44	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00186	2025-09-11 10:13:25.010498-05	\N	\N	\N
1288	45	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00187	2025-09-11 10:14:16.939671-05	\N	\N	\N
1289	45	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00188	2025-09-11 10:14:16.944774-05	\N	\N	\N
1290	45	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00189	2025-09-11 10:14:16.945644-05	\N	\N	\N
1291	45	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00190	2025-09-11 10:14:16.946603-05	\N	\N	\N
1292	45	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00191	2025-09-11 10:14:16.947459-05	\N	\N	\N
1293	45	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00192	2025-09-11 10:14:16.948395-05	\N	\N	\N
1294	46	15.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Básico	completado	f	TELTEC-20250911-00193	2025-09-11 10:14:47.311965-05	\N	\N	\N
1295	46	15.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Básico	completado	f	TELTEC-20250911-00194	2025-09-11 10:14:47.318127-05	\N	\N	\N
1296	46	15.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Básico	completado	f	TELTEC-20250911-00195	2025-09-11 10:14:47.319391-05	\N	\N	\N
1297	46	15.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Básico	completado	f	TELTEC-20250911-00196	2025-09-11 10:14:47.320668-05	\N	\N	\N
1298	49	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00197	2025-09-11 10:15:45.026689-05	\N	\N	\N
1299	49	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00198	2025-09-11 10:15:45.03718-05	\N	\N	\N
1300	49	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00199	2025-09-11 10:15:45.038306-05	\N	\N	\N
1301	49	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00200	2025-09-11 10:15:45.03939-05	\N	\N	\N
1302	49	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00201	2025-09-11 10:15:45.040438-05	\N	\N	\N
1303	49	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00202	2025-09-11 10:15:45.041465-05	\N	\N	\N
1304	51	20.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan familiar	completado	f	TELTEC-20250911-00203	2025-09-11 10:16:45.282374-05	\N	\N	\N
1305	51	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00204	2025-09-11 10:16:45.288312-05	\N	\N	\N
1306	51	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00205	2025-09-11 10:16:45.289261-05	\N	\N	\N
1307	51	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00206	2025-09-11 10:16:45.290326-05	\N	\N	\N
1308	51	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00207	2025-09-11 10:16:45.291396-05	\N	\N	\N
1309	51	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00208	2025-09-11 10:16:45.292433-05	\N	\N	\N
1310	51	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00209	2025-09-11 10:16:45.293501-05	\N	\N	\N
1311	51	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00210	2025-09-11 10:16:45.294488-05	\N	\N	\N
1312	53	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00211	2025-09-11 10:17:58.261967-05	\N	\N	\N
1313	53	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00212	2025-09-11 10:17:58.267185-05	\N	\N	\N
1314	53	18.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00213	2025-09-11 10:17:58.267818-05	\N	\N	\N
1315	53	18.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00214	2025-09-11 10:17:58.268499-05	\N	\N	\N
1316	53	18.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00215	2025-09-11 10:17:58.269192-05	\N	\N	\N
1317	53	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00216	2025-09-11 10:17:58.269797-05	\N	\N	\N
1318	53	18.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00217	2025-09-11 10:17:58.270465-05	\N	\N	\N
1319	61	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00218	2025-09-11 10:20:38.267942-05	\N	\N	\N
1320	61	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00219	2025-09-11 10:20:38.273779-05	\N	\N	\N
1321	61	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00220	2025-09-11 10:20:38.274603-05	\N	\N	\N
1322	61	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00221	2025-09-11 10:20:38.27526-05	\N	\N	\N
1323	61	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00222	2025-09-11 10:20:38.275839-05	\N	\N	\N
1324	61	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00223	2025-09-11 10:20:38.27656-05	\N	\N	\N
1325	61	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00224	2025-09-11 10:20:38.277349-05	\N	\N	\N
1326	61	20.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan familiar	completado	f	TELTEC-20250911-00225	2025-09-11 10:20:38.277958-05	\N	\N	\N
1327	62	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00226	2025-09-11 10:20:58.484942-05	\N	\N	\N
1328	62	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00227	2025-09-11 10:20:58.489092-05	\N	\N	\N
1329	64	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00228	2025-09-11 10:21:35.104142-05	\N	\N	\N
1330	64	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00229	2025-09-11 10:21:35.109345-05	\N	\N	\N
1331	64	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00230	2025-09-11 10:21:35.110249-05	\N	\N	\N
1332	64	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00231	2025-09-11 10:21:35.111356-05	\N	\N	\N
1333	64	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00232	2025-09-11 10:21:35.112216-05	\N	\N	\N
1334	66	18.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00233	2025-09-11 10:22:36.391821-05	\N	\N	\N
1335	66	18.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00234	2025-09-11 10:22:36.396936-05	\N	\N	\N
1336	66	18.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00235	2025-09-11 10:22:36.398293-05	\N	\N	\N
1337	66	18.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00236	2025-09-11 10:22:36.399245-05	\N	\N	\N
1338	66	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00237	2025-09-11 10:22:36.400426-05	\N	\N	\N
1339	66	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00238	2025-09-11 10:22:36.401456-05	\N	\N	\N
1340	66	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00239	2025-09-11 10:22:36.402563-05	\N	\N	\N
1341	66	18.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00240	2025-09-11 10:22:36.403711-05	\N	\N	\N
1342	67	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00241	2025-09-11 10:23:14.65025-05	\N	\N	\N
1343	67	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00242	2025-09-11 10:23:14.656001-05	\N	\N	\N
1344	67	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00243	2025-09-11 10:23:14.657289-05	\N	\N	\N
1345	68	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00244	2025-09-11 10:23:57.268342-05	\N	\N	\N
1346	68	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00245	2025-09-11 10:23:57.274032-05	\N	\N	\N
1347	68	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00246	2025-09-11 10:23:57.275242-05	\N	\N	\N
1348	68	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00247	2025-09-11 10:23:57.27616-05	\N	\N	\N
1349	68	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00248	2025-09-11 10:23:57.277459-05	\N	\N	\N
1350	68	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00249	2025-09-11 10:23:57.279444-05	\N	\N	\N
1351	69	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00250	2025-09-11 10:24:46.877351-05	\N	\N	\N
1352	69	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00251	2025-09-11 10:24:46.880598-05	\N	\N	\N
1353	69	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00252	2025-09-11 10:24:46.881353-05	\N	\N	\N
1354	69	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00253	2025-09-11 10:24:46.882098-05	\N	\N	\N
1355	69	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00254	2025-09-11 10:24:46.882817-05	\N	\N	\N
1356	70	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00255	2025-09-11 10:25:12.285545-05	\N	\N	\N
1357	70	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00256	2025-09-11 10:25:12.289566-05	\N	\N	\N
1358	70	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00257	2025-09-11 10:25:12.290932-05	\N	\N	\N
1359	70	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00258	2025-09-11 10:25:12.292044-05	\N	\N	\N
1360	70	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00259	2025-09-11 10:25:12.293226-05	\N	\N	\N
1361	71	18.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00260	2025-09-11 10:25:45.871872-05	\N	\N	\N
1362	71	18.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00261	2025-09-11 10:25:45.876944-05	\N	\N	\N
1363	71	18.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00262	2025-09-11 10:25:45.878108-05	\N	\N	\N
1364	71	18.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00263	2025-09-11 10:25:45.879252-05	\N	\N	\N
1365	71	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00264	2025-09-11 10:25:45.880353-05	\N	\N	\N
1366	71	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00265	2025-09-11 10:25:45.881425-05	\N	\N	\N
1367	71	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00266	2025-09-11 10:25:45.882465-05	\N	\N	\N
1368	99	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00267	2025-09-11 10:26:19.632416-05	\N	\N	\N
1369	99	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00268	2025-09-11 10:26:19.636021-05	\N	\N	\N
1370	99	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00269	2025-09-11 10:26:19.637354-05	\N	\N	\N
1371	99	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00270	2025-09-11 10:26:19.638374-05	\N	\N	\N
1372	99	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00271	2025-09-11 10:26:19.639234-05	\N	\N	\N
1373	99	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00272	2025-09-11 10:26:19.640588-05	\N	\N	\N
1374	86	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00273	2025-09-11 10:28:29.294996-05	\N	\N	\N
1375	86	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00274	2025-09-11 10:28:29.301485-05	\N	\N	\N
1376	86	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00275	2025-09-11 10:28:29.302448-05	\N	\N	\N
1377	86	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00276	2025-09-11 10:28:29.303455-05	\N	\N	\N
1378	86	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00277	2025-09-11 10:28:29.304404-05	\N	\N	\N
1379	86	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00278	2025-09-11 10:28:29.305303-05	\N	\N	\N
1380	72	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00279	2025-09-11 10:28:59.68021-05	\N	\N	\N
1381	72	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00280	2025-09-11 10:28:59.683104-05	\N	\N	\N
1382	72	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00281	2025-09-11 10:28:59.684118-05	\N	\N	\N
1383	72	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00282	2025-09-11 10:28:59.685127-05	\N	\N	\N
1384	72	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00283	2025-09-11 10:28:59.686764-05	\N	\N	\N
1385	72	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00284	2025-09-11 10:28:59.687727-05	\N	\N	\N
1386	72	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00285	2025-09-11 10:28:59.688775-05	\N	\N	\N
1387	74	18.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00286	2025-09-11 10:29:50.76386-05	\N	\N	\N
1388	74	18.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00287	2025-09-11 10:29:50.767176-05	\N	\N	\N
1389	74	18.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00288	2025-09-11 10:29:50.768252-05	\N	\N	\N
1390	74	18.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00289	2025-09-11 10:29:50.76921-05	\N	\N	\N
1391	74	18.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00290	2025-09-11 10:29:50.770236-05	\N	\N	\N
1392	74	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00291	2025-09-11 10:29:50.771197-05	\N	\N	\N
1393	74	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00292	2025-09-11 10:29:50.772069-05	\N	\N	\N
1394	74	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00293	2025-09-11 10:29:50.77286-05	\N	\N	\N
1395	76	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00294	2025-09-11 10:30:24.945256-05	\N	\N	\N
1396	76	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00295	2025-09-11 10:30:24.984697-05	\N	\N	\N
1397	76	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00296	2025-09-11 10:30:24.985485-05	\N	\N	\N
1398	76	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00297	2025-09-11 10:30:24.986329-05	\N	\N	\N
1399	76	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00298	2025-09-11 10:30:24.987094-05	\N	\N	\N
1400	76	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00299	2025-09-11 10:30:24.987712-05	\N	\N	\N
1401	76	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00300	2025-09-11 10:30:24.988626-05	\N	\N	\N
1402	80	18.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00301	2025-09-11 10:31:28.194829-05	\N	\N	\N
1403	80	18.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00302	2025-09-11 10:31:28.19784-05	\N	\N	\N
1404	80	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00303	2025-09-11 10:31:28.199112-05	\N	\N	\N
1405	80	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00304	2025-09-11 10:31:28.200192-05	\N	\N	\N
1406	80	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00305	2025-09-11 10:31:28.2013-05	\N	\N	\N
1407	98	18.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00306	2025-09-11 10:32:08.2315-05	\N	\N	\N
1408	98	18.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00307	2025-09-11 10:32:08.235792-05	\N	\N	\N
1409	98	18.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00308	2025-09-11 10:32:08.236911-05	\N	\N	\N
1410	98	18.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00309	2025-09-11 10:32:08.237953-05	\N	\N	\N
1411	98	18.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00310	2025-09-11 10:32:08.239004-05	\N	\N	\N
1412	98	18.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00311	2025-09-11 10:32:08.240068-05	\N	\N	\N
1413	98	18.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00312	2025-09-11 10:32:08.24114-05	\N	\N	\N
1414	98	18.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Tercera Edad	completado	f	TELTEC-20250911-00313	2025-09-11 10:32:08.242124-05	\N	\N	\N
1415	81	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00314	2025-09-11 10:32:39.471234-05	\N	\N	\N
1416	81	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00315	2025-09-11 10:32:39.476543-05	\N	\N	\N
1417	81	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00316	2025-09-11 10:32:39.477373-05	\N	\N	\N
1418	81	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00317	2025-09-11 10:32:39.478192-05	\N	\N	\N
1419	81	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00318	2025-09-11 10:32:39.47886-05	\N	\N	\N
1420	92	15.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan Básico	completado	f	TELTEC-20250911-00319	2025-09-11 10:35:07.796523-05	\N	\N	\N
1421	92	15.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan Básico	completado	f	TELTEC-20250911-00320	2025-09-11 10:35:07.803141-05	\N	\N	\N
1422	92	15.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan Básico	completado	f	TELTEC-20250911-00321	2025-09-11 10:35:07.804237-05	\N	\N	\N
1423	92	15.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan Básico	completado	f	TELTEC-20250911-00322	2025-09-11 10:35:07.805331-05	\N	\N	\N
1424	92	15.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan Básico	completado	f	TELTEC-20250911-00323	2025-09-11 10:35:07.806426-05	\N	\N	\N
1425	92	15.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan Básico	completado	f	TELTEC-20250911-00324	2025-09-11 10:35:07.807534-05	\N	\N	\N
1426	92	15.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan Básico	completado	f	TELTEC-20250911-00325	2025-09-11 10:35:07.808561-05	\N	\N	\N
1427	92	15.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan Básico	completado	f	TELTEC-20250911-00326	2025-09-11 10:35:07.809719-05	\N	\N	\N
1428	83	20.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan familiar	completado	f	TELTEC-20250911-00327	2025-09-11 10:35:41.756429-05	\N	\N	\N
1429	83	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00328	2025-09-11 10:35:41.760841-05	\N	\N	\N
1430	83	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00329	2025-09-11 10:35:41.761683-05	\N	\N	\N
1431	83	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00330	2025-09-11 10:35:41.762431-05	\N	\N	\N
1432	83	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00331	2025-09-11 10:35:41.763242-05	\N	\N	\N
1433	83	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00332	2025-09-11 10:35:41.764005-05	\N	\N	\N
1434	83	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00333	2025-09-11 10:35:41.764778-05	\N	\N	\N
1435	83	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00334	2025-09-11 10:35:41.765472-05	\N	\N	\N
1436	60	20.00	2025-09-11	efectivo	Pago mensual - Agosto 2025 - Plan familiar	completado	f	TELTEC-20250911-00335	2025-09-11 10:38:26.949423-05	\N	\N	\N
1437	60	20.00	2025-09-11	efectivo	Pago mensual - Julio 2025 - Plan familiar	completado	f	TELTEC-20250911-00336	2025-09-11 10:38:26.954458-05	\N	\N	\N
1438	60	20.00	2025-09-11	efectivo	Pago mensual - Junio 2025 - Plan familiar	completado	f	TELTEC-20250911-00337	2025-09-11 10:38:26.955626-05	\N	\N	\N
1439	60	20.00	2025-09-11	efectivo	Pago mensual - Mayo 2025 - Plan familiar	completado	f	TELTEC-20250911-00338	2025-09-11 10:38:26.956514-05	\N	\N	\N
1440	60	20.00	2025-09-11	efectivo	Pago mensual - Abril 2025 - Plan familiar	completado	f	TELTEC-20250911-00339	2025-09-11 10:38:26.957543-05	\N	\N	\N
1441	60	20.00	2025-09-11	efectivo	Pago mensual - Marzo 2025 - Plan familiar	completado	f	TELTEC-20250911-00340	2025-09-11 10:38:26.958666-05	\N	\N	\N
1442	60	20.00	2025-09-11	efectivo	Pago mensual - Febrero 2025 - Plan familiar	completado	f	TELTEC-20250911-00341	2025-09-11 10:38:26.959665-05	\N	\N	\N
1443	60	20.00	2025-09-11	efectivo	Pago mensual - Enero 2025 - Plan familiar	completado	f	TELTEC-20250911-00342	2025-09-11 10:38:26.96056-05	\N	\N	\N
1444	28	18.00	2025-12-03	efectivo	Pago mensual - Agosto 2025 - Plan Tercera Edad	completado	f	TELTEC-20251203-00001	2025-12-03 11:55:34.64703-05	\N	\N	\N
1445	28	18.00	2025-12-03	efectivo	Pago mensual - Noviembre 2025 - Plan Tercera Edad	completado	f	TELTEC-20251203-00002	2025-12-03 11:55:34.679292-05	\N	\N	\N
1446	28	18.00	2025-12-03	efectivo	Pago mensual - Octubre 2025 - Plan Tercera Edad	completado	f	TELTEC-20251203-00003	2025-12-03 11:55:34.680932-05	\N	\N	\N
1447	28	18.00	2025-12-03	efectivo	Pago mensual - Septiembre 2025 - Plan Tercera Edad	completado	f	TELTEC-20251203-00004	2025-12-03 11:55:34.682607-05	\N	\N	\N
1448	28	18.00	2025-12-03	efectivo	Pago mensual - Diciembre 2025 - Plan Tercera Edad	completado	f	TELTEC-20251203-00005	2025-12-03 11:55:34.684223-05	\N	\N	\N
1449	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00001	2025-12-11 12:45:34.077799-05	\N	\N	\N
1450	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00002	2025-12-11 12:52:45.347662-05	\N	\N	\N
1451	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00003	2025-12-11 12:55:04.53604-05	\N	\N	\N
1452	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00004	2025-12-11 12:55:52.986181-05	\N	\N	\N
1453	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00005	2025-12-11 12:56:32.612563-05	\N	\N	\N
1454	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00006	2025-12-11 12:57:21.382535-05	\N	\N	\N
1455	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00007	2025-12-11 12:58:03.762689-05	\N	\N	\N
1456	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00008	2025-12-11 13:09:03.212241-05	\N	\N	\N
1457	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00009	2025-12-11 13:09:42.367962-05	\N	\N	\N
1458	1	18.00	2025-12-11	transferencia	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00010	2025-12-11 13:10:57.829938-05	\N	\N	\N
1459	1	18.00	2025-12-11	tarjeta	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00011	2025-12-11 13:11:34.241342-05	\N	\N	\N
1460	1	18.00	2025-12-11	cheque	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00012	2025-12-11 13:12:13.592301-05	\N	\N	\N
1461	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00013	2025-12-11 13:12:44.47239-05	\N	\N	\N
1462	1	18.00	2025-12-11	tarjeta	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00014	2025-12-11 13:13:20.373074-05	\N	\N	\N
1463	1	18.00	2025-12-11	transferencia	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00015	2025-12-11 13:13:56.076391-05	\N	\N	\N
1464	1	18.00	2025-12-11	transferencia	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00016	2025-12-11 13:15:29.595031-05	\N	\N	\N
1465	1	18.00	2025-12-11	tarjeta	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00017	2025-12-11 13:16:23.187461-05	\N	\N	\N
1466	1	18.00	2025-12-11	transferencia	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00018	2025-12-11 13:16:53.611374-05	\N	\N	\N
1467	1	18.00	2025-12-11	efectivo	Pago mensual - Plan Tercera Edad	completado	f	TELTEC-20251211-00019	2025-12-11 13:17:20.65204-05	\N	\N	\N
1468	1	18.00	2025-12-11	transferencia	Pago mensual - Plan Tercera Edad	completado	t	TELTEC-20251211-00020	2025-12-11 13:18:00.036328-05	\N	\N	\N
1469	47	18.00	2026-01-21	efectivo	Pago mensual - Enero 2026 - Plan Tercera Edad	completado	f	TELTEC-20260120-00001	2026-01-20 19:17:45.010183-05	\N	\N	\N
\.


--
-- Data for Name: planes; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.planes (id_plan, tipo_plan, precio, descripcion, estado, fecha_creacion, fecha_actualizacion) FROM stdin;
2	Plan Tercera Edad	18.00	Plan especial para adultos mayores	activo	2025-09-01 20:12:48.235939	2025-09-01 20:12:48.235939
1	Plan familiar	20.00	Plan completo para familias	activo	2025-09-02 06:12:48.235939	2025-09-01 21:52:17.607484
4	Plan Preferencial Actualizado	12.50	Plan actualizado	inactivo	2025-09-02 16:12:48.235939	2025-09-02 15:40:01.28032
3	Plan Básico	15.00	Plan básico de servicios	activo	2025-09-02 16:12:48.235939	2025-09-02 15:58:09.33347
7	Plan personalizado	10.00		activo	2025-09-05 19:18:34.793676	2025-09-05 14:20:07.439416
8	Plan B√°Sico ($15)	15.00	Plan creado automáticamente durante importación	activo	2026-03-25 22:57:39.918551	2026-03-25 22:57:39.918589
9	Plan Familiar ($20)	20.00	Plan creado automáticamente durante importación	activo	2026-03-25 23:40:24.816796	2026-03-25 23:40:24.816813
10	prueba 	11.00		activo	2026-03-26 01:03:46.320789	2026-03-26 01:03:46.320812
\.


--
-- Data for Name: sectores; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sectores (id_sector, nombre_sector, descripcion, estado, fecha_creacion, fecha_actualizacion) FROM stdin;
1	Tambo	Sector de Tambo	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
2	Cajon Tambo	Sector de Cajon Tambo	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
3	Rumiloma	Sector de Rumiloma	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
4	Sisid Anejo	Sector de Sisid Anejo	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
5	Naug Nag	Sector de Naug Nag	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
6	Marco Pamba	Sector de Marco Pamba	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
7	Sisid Centro	Sector de Sisid Centro	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
8	Zarapamba	Sector de Zarapamba	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
9	Centro de acopio Sisid	Sector de Centro de acopio Sisid	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
10	Lirio Loma	Sector de Lirio Loma	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
11	Ingapirca	Sector de Ingapirca	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
12	Tambo Reservorio	Sector de Tambo Reservorio	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
13	Galuay	Sector de Galuay	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
16	Cullcaloma	Sector de Cullcaloma	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
17	Centro de acopio Vende Leche	Sector de Centro de acopio Vende Leche	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
18	Cashaloma	Sector de Cashaloma	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
19	Zharo	Sector de Zharo	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
20	Churuguayco	Sector de Churuguayco	activo	2025-09-01 20:22:23.268333	2025-09-01 20:22:23.268333
14	Caguanapamba Centrooo	Sector de Caguanapamba Centro	activo	2025-09-02 01:22:23.268333	2025-09-02 15:31:53.638718
21	cento cuenca fusa	aa	inactivo	2025-09-02 22:13:40.359507	2025-09-02 15:36:11.527711
15	Ana mariaaaa	Sector de Ana maria	activo	2025-09-02 11:22:23.268333	2025-09-02 15:59:01.823792
\.


--
-- Data for Name: sitio_web_carrusel; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_carrusel (id, titulo, descripcion, imagen, video, enlace, activo, orden, fecha_creacion, fecha_actualizacion) FROM stdin;
10	Internet de Alta Velocidad	Conectividad confiable para tu hogar y negocio	/images/hero-1.jpg			t	1	2025-08-27 10:47:47.532396-05	2025-08-27 10:47:47.532403-05
11	Televisión Digital	Entretenimiento familiar con la mejor calidad	/images/hero-2.jpg			t	2	2025-08-27 10:47:47.532907-05	2025-08-27 10:47:47.532911-05
12	Soporte Técnico 24/7	Estamos siempre disponibles para ayudarte	/images/hero-4.jpg			t	3	2025-08-27 10:47:47.533416-05	2025-08-27 10:47:47.533421-05
\.


--
-- Data for Name: sitio_web_cobertura; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_cobertura (id, zona, descripcion, coordenadas, activo, orden, fecha_creacion, fecha_actualizacion) FROM stdin;
10	Centro de Azogues	Cobertura completa en el centro histórico y comercial de Azogues.	{"lat": -2.7397, "lng": -78.8486}	t	1	2025-08-27 10:47:47.497061-05	2025-08-27 10:47:47.497069-05
11	Zona Norte	Servicio disponible en los barrios del norte de la ciudad.	{"lat": -2.73, "lng": -78.84}	t	2	2025-08-27 10:47:47.497688-05	2025-08-27 10:47:47.497692-05
12	Zona Sur	Cobertura en los sectores residenciales del sur.	{"lat": -2.75, "lng": -78.85}	t	3	2025-08-27 10:47:47.498059-05	2025-08-27 10:47:47.498062-05
13	El Tambo	Servicio extendido a la parroquia de El Tambo.	{"lat": -2.8, "lng": -78.9}	t	4	2025-08-27 10:47:47.49839-05	2025-08-27 10:47:47.498393-05
\.


--
-- Data for Name: sitio_web_configuracionsitio; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_configuracionsitio (id, mostrar_estadisticas, mostrar_testimonios, mostrar_servicios, mostrar_contacto, tema_color, logo_url, favicon_url, fecha_actualizacion, mostrar_precios, modo_mantenimiento, mensaje_mantenimiento) FROM stdin;
1	t	t	t	t	blue	/images/logo.png	/images/favicon.ico	2025-08-27 15:05:29.720042	t	f	Sitio en mantenimiento. Volveremos pronto.
\.


--
-- Data for Name: sitio_web_contacto; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_contacto (id, tipo, titulo, valor, icono, url, activo, orden, fecha_creacion, fecha_actualizacion) FROM stdin;
16	telefono	Teléfono Principal	0984517703	phone	tel:0984517703	t	1	2025-08-27 10:47:47.514855-05	2025-08-27 10:47:47.514866-05
17	email	Email de Contacto	info@teltecnet.com	mail	mailto:info@teltecnet.com	t	2	2025-08-27 10:47:47.515441-05	2025-08-27 10:47:47.515445-05
18	whatsapp	WhatsApp	0984517703	message-circle	https://wa.me/593984517703	t	3	2025-08-27 10:47:47.515805-05	2025-08-27 10:47:47.515808-05
19	direccion	Dirección	Av. 24 de Mayo 123, Centro de Azogues	map-pin		t	4	2025-08-27 10:47:47.516133-05	2025-08-27 10:47:47.516138-05
20	horario	Horario de Atención	Lunes a Viernes: 8:00 AM - 6:00 PM	clock		t	5	2025-08-27 10:47:47.516445-05	2025-08-27 10:47:47.516448-05
\.


--
-- Data for Name: sitio_web_empresa; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_empresa (id, nombre, descripcion, direccion, telefono, email, horario_atencion, mision, vision, valores, fecha_actualizacion, ruc, horario) FROM stdin;
1	TelTec Net	Empresa líder en servicios de internet de alta velocidad	Av. 24 de Mayo 123, Centro de Azogues, Cañar	0984517703	info@teltecnet.com	Lunes a Viernes: 8:00 AM - 6:00 PM	Proporcionar servicios de internet de alta calidad y soporte técnico excepcional	Ser el proveedor de internet más confiable y preferido en la región	Confianza, Calidad, Innovación, Servicio al Cliente	2025-08-27 15:47:47.439147	1234567890001	Lunes a Viernes: 8:00 AM - 6:00 PM | Sábados: 8:00 AM - 2:00 PM
\.


--
-- Data for Name: sitio_web_footer; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_footer (id, texto_copyright, mostrar_redes_sociales, mostrar_contacto, color_fondo, color_texto, fecha_actualizacion) FROM stdin;
1	© 2025 TelTec Net - Todos los derechos reservados | Desarrollado en Ecuador 🇪🇨	t	t	#1f2937	#ffffff	2025-08-27 10:47:47.442196-05
\.


--
-- Data for Name: sitio_web_header; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_header (id, logo_url, logo_alt, mostrar_menu, color_fondo, color_texto, fecha_actualizacion) FROM stdin;
1	/images/ttnet-logo.png	TelTec Net Logo	t	#ffffff	#000000	2025-08-27 10:47:47.440906-05
\.


--
-- Data for Name: sitio_web_informacionsitio; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_informacionsitio (id, titulo, subtitulo, descripcion, lema, fecha_actualizacion) FROM stdin;
1	TelTec Net - Internet de Alta Velocidad	Conectando comunidades con tecnología de vanguardia	Somos una empresa líder en servicios de internet de alta velocidad, comprometida con brindar conectividad confiable y soporte técnico excepcional en toda la provincia del Cañar.	Conectando tu mundo digital	2025-08-27 15:47:47.436984
\.


--
-- Data for Name: sitio_web_plan; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_plan (id, nombre, velocidad, precio, descripcion, caracteristicas, popular, activo, orden, fecha_creacion, fecha_actualizacion) FROM stdin;
10	Plan Básico	15 MB	15.00	Perfecto para usuarios individuales que buscan una conexión confiable.	["Internet estable", "Soporte técnico", "Sin límite de datos", "Instalación incluida"]	f	t	1	2025-08-27 10:47:47.482066-05	2025-08-27 10:47:47.482075-05
11	Plan Familiar	30 MB	20.00	Ideal para familias que necesitan conectividad estable para trabajo y entretenimiento.	["Internet de alta velocidad", "Soporte técnico 24/7", "Sin límite de datos", "Instalación gratuita"]	t	t	2	2025-08-27 10:47:47.484719-05	2025-08-27 10:47:47.484726-05
12	Plan Empresarial	50 MB	35.00	Soluciones a medida para empresas y usuarios con necesidades específicas.	["Velocidad personalizada", "Soporte prioritario", "SLA garantizado", "Consultoría técnica"]	f	t	3	2025-08-27 10:47:47.485425-05	2025-08-27 10:47:47.485433-05
\.


--
-- Data for Name: sitio_web_redsocial; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_redsocial (id, nombre, url, icono, activo, fecha_creacion, fecha_actualizacion, tipo) FROM stdin;
31	Facebook	https://facebook.com/teltecnet	\N	t	2025-08-27 15:47:47.443788	2025-08-27 15:47:47.44379	facebook
32	Instagram	https://instagram.com/teltecnet	\N	t	2025-08-27 15:47:47.444632	2025-08-27 15:47:47.444635	instagram
33	TikTok	https://tiktok.com/@teltecnet	\N	t	2025-08-27 15:47:47.444981	2025-08-27 15:47:47.444984	tiktok
\.


--
-- Data for Name: sitio_web_servicio; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.sitio_web_servicio (id, nombre, descripcion, precio, velocidad, caracteristicas, activo, fecha_creacion, fecha_actualizacion, orden, icono, imagen) FROM stdin;
33	Internet para Emprendimientos	Conexión de alta velocidad diseñada para emprendedores y pequeñas empresas. Ideal para e-commerce, marketing digital y comunicación empresarial.	0.00	\N	\N	t	2025-09-05 20:43:19.364833	2025-09-05 20:43:19.36492	1	wifi	/images/hero-1.jpg
34	Internet Empresarial	Soluciones de conectividad dedicada para empresas medianas y grandes. Conexión estable, redundante y soporte técnico especializado 24/7.	0.00	\N	\N	t	2025-09-05 20:43:19.368492	2025-09-05 20:43:19.368496	2	building	/images/hero-2.jpg
35	Cámaras de Seguridad	Sistemas de videovigilancia profesional con tecnología EZVIZ. Monitoreo 24/7, detección inteligente y acceso remoto desde cualquier dispositivo.	0.00	\N	\N	t	2025-09-05 20:43:19.369054	2025-09-05 20:43:19.369056	3	camera	/images/hero-4.jpg
36	Desarrollo de Aplicaciones Móviles y Web	Desarrollo de aplicaciones móviles nativas e híbridas, sitios web responsivos y sistemas web personalizados con tecnologías modernas.	0.00	\N	\N	t	2025-09-05 20:43:19.369487	2025-09-05 20:43:19.369489	4	smartphone	/images/hero-1.jpg
37	Mantenimiento de Software	Servicios de mantenimiento, actualización y soporte técnico para aplicaciones existentes. Optimización de rendimiento y corrección de errores.	0.00	\N	\N	t	2025-09-05 20:43:19.369984	2025-09-05 20:43:19.369989	5	settings	/images/hero-2.jpg
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: teltec_user
--

COPY public.usuarios (id, email, password_hash, nombre, rol, activo, fecha_creacion, fecha_actualizacion, reset_token, reset_expires, reset_token_expires, last_activity, session_timeout_minutes) FROM stdin;
8	vangamarca4@gmail.com	$2b$12$V5.5SSbxrwTVFAQ2iStZvO1UWNX0YcQfiUeiU4lV83IaqxWaIn6YC	Marco AA	administrador	t	2025-07-13 23:15:04.632427-05	2026-03-25 20:02:29.624007-05	\N	2025-08-05 07:42:20.512484-05	\N	\N	30
\.


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 112, true);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.clientes_id_seq', 147, true);


--
-- Name: clientes_planes_id_cliente_plan_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.clientes_planes_id_cliente_plan_seq', 138, true);


--
-- Name: deudas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.deudas_id_seq', 82, true);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 1, false);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 28, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 40, true);


--
-- Name: gastos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.gastos_id_seq', 14, true);


--
-- Name: historial_deudas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.historial_deudas_id_seq', 82, true);


--
-- Name: notificaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.notificaciones_id_seq', 318, true);


--
-- Name: pagos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.pagos_id_seq', 1469, true);


--
-- Name: planes_id_plan_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.planes_id_plan_seq', 10, true);


--
-- Name: sectores_id_sector_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sectores_id_sector_seq', 22, true);


--
-- Name: sitio_web_carrusel_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_carrusel_id_seq', 12, true);


--
-- Name: sitio_web_cobertura_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_cobertura_id_seq', 12, true);


--
-- Name: sitio_web_configuracionsitio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_configuracionsitio_id_seq', 1, false);


--
-- Name: sitio_web_contacto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_contacto_id_seq', 20, true);


--
-- Name: sitio_web_empresa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_empresa_id_seq', 1, false);


--
-- Name: sitio_web_footer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_footer_id_seq', 1, false);


--
-- Name: sitio_web_header_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_header_id_seq', 1, false);


--
-- Name: sitio_web_informacionsitio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_informacionsitio_id_seq', 1, false);


--
-- Name: sitio_web_plan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_plan_id_seq', 12, true);


--
-- Name: sitio_web_redsocial_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_redsocial_id_seq', 33, true);


--
-- Name: sitio_web_servicio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.sitio_web_servicio_id_seq', 37, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: teltec_user
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 17, true);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_cedula_key; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_cedula_key UNIQUE (cedula);


--
-- Name: clientes clientes_email_key; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_email_key UNIQUE (email);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: clientes_planes clientes_planes_id_cliente_id_plan_fecha_inicio_key; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.clientes_planes
    ADD CONSTRAINT clientes_planes_id_cliente_id_plan_fecha_inicio_key UNIQUE (id_cliente, id_plan, fecha_inicio);


--
-- Name: clientes_planes clientes_planes_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.clientes_planes
    ADD CONSTRAINT clientes_planes_pkey PRIMARY KEY (id_cliente_plan);


--
-- Name: deudas deudas_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.deudas
    ADD CONSTRAINT deudas_pkey PRIMARY KEY (id);


--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_pkey PRIMARY KEY (id);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.django_session
    ADD CONSTRAINT django_session_pkey PRIMARY KEY (session_key);


--
-- Name: gastos gastos_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_pkey PRIMARY KEY (id);


--
-- Name: historial_deudas historial_deudas_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.historial_deudas
    ADD CONSTRAINT historial_deudas_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: pagos pagos_numero_comprobante_key; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_numero_comprobante_key UNIQUE (numero_comprobante);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id);


--
-- Name: planes planes_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.planes
    ADD CONSTRAINT planes_pkey PRIMARY KEY (id_plan);


--
-- Name: planes planes_tipo_plan_key; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.planes
    ADD CONSTRAINT planes_tipo_plan_key UNIQUE (tipo_plan);


--
-- Name: sectores sectores_nombre_sector_key; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sectores
    ADD CONSTRAINT sectores_nombre_sector_key UNIQUE (nombre_sector);


--
-- Name: sectores sectores_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sectores
    ADD CONSTRAINT sectores_pkey PRIMARY KEY (id_sector);


--
-- Name: sitio_web_carrusel sitio_web_carrusel_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_carrusel
    ADD CONSTRAINT sitio_web_carrusel_pkey PRIMARY KEY (id);


--
-- Name: sitio_web_cobertura sitio_web_cobertura_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_cobertura
    ADD CONSTRAINT sitio_web_cobertura_pkey PRIMARY KEY (id);


--
-- Name: sitio_web_configuracionsitio sitio_web_configuracionsitio_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_configuracionsitio
    ADD CONSTRAINT sitio_web_configuracionsitio_pkey PRIMARY KEY (id);


--
-- Name: sitio_web_contacto sitio_web_contacto_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_contacto
    ADD CONSTRAINT sitio_web_contacto_pkey PRIMARY KEY (id);


--
-- Name: sitio_web_empresa sitio_web_empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_empresa
    ADD CONSTRAINT sitio_web_empresa_pkey PRIMARY KEY (id);


--
-- Name: sitio_web_footer sitio_web_footer_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_footer
    ADD CONSTRAINT sitio_web_footer_pkey PRIMARY KEY (id);


--
-- Name: sitio_web_header sitio_web_header_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_header
    ADD CONSTRAINT sitio_web_header_pkey PRIMARY KEY (id);


--
-- Name: sitio_web_informacionsitio sitio_web_informacionsitio_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_informacionsitio
    ADD CONSTRAINT sitio_web_informacionsitio_pkey PRIMARY KEY (id);


--
-- Name: sitio_web_plan sitio_web_plan_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_plan
    ADD CONSTRAINT sitio_web_plan_pkey PRIMARY KEY (id);


--
-- Name: sitio_web_redsocial sitio_web_redsocial_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_redsocial
    ADD CONSTRAINT sitio_web_redsocial_pkey PRIMARY KEY (id);


--
-- Name: sitio_web_servicio sitio_web_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.sitio_web_servicio
    ADD CONSTRAINT sitio_web_servicio_pkey PRIMARY KEY (id);


--
-- Name: deudas uk_deuda_cliente_plan_mes; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.deudas
    ADD CONSTRAINT uk_deuda_cliente_plan_mes UNIQUE (cliente_id, plan_id, mes_anio);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON public.django_admin_log USING btree (content_type_id);


--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON public.django_admin_log USING btree (user_id);


--
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX django_session_expire_date_a5c62663 ON public.django_session USING btree (expire_date);


--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX django_session_session_key_c0390e0f_like ON public.django_session USING btree (session_key varchar_pattern_ops);


--
-- Name: idx_clientes_cedula; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_clientes_cedula ON public.clientes USING btree (cedula);


--
-- Name: idx_clientes_email; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_clientes_email ON public.clientes USING btree (email);


--
-- Name: idx_clientes_estado; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_clientes_estado ON public.clientes USING btree (estado);


--
-- Name: idx_clientes_nombres_apellidos; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_clientes_nombres_apellidos ON public.clientes USING btree (nombres, apellidos);


--
-- Name: idx_clientes_planes_cliente; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_clientes_planes_cliente ON public.clientes_planes USING btree (id_cliente);


--
-- Name: idx_clientes_planes_fecha; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_clientes_planes_fecha ON public.clientes_planes USING btree (fecha_inicio, fecha_fin);


--
-- Name: idx_clientes_planes_plan; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_clientes_planes_plan ON public.clientes_planes USING btree (id_plan);


--
-- Name: idx_clientes_search; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_clientes_search ON public.clientes USING gin (((((((((nombres)::text || ' '::text) || (apellidos)::text) || ' '::text) || (cedula)::text) || ' '::text) || (email)::text)) public.gin_trgm_ops);


--
-- Name: idx_clientes_sector; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_clientes_sector ON public.clientes USING btree (id_sector);


--
-- Name: idx_deudas_cliente_estado; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_deudas_cliente_estado ON public.deudas USING btree (cliente_id, estado);


--
-- Name: idx_deudas_estado_meses; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_deudas_estado_meses ON public.deudas USING btree (estado, meses_atraso);


--
-- Name: idx_deudas_fecha_vencimiento; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_deudas_fecha_vencimiento ON public.deudas USING btree (fecha_vencimiento);


--
-- Name: idx_gastos_categoria; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_gastos_categoria ON public.gastos USING btree (categoria);


--
-- Name: idx_gastos_fecha; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_gastos_fecha ON public.gastos USING btree (fecha_gasto);


--
-- Name: idx_gastos_search; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_gastos_search ON public.gastos USING gin ((((((descripcion || ' '::text) || (categoria)::text) || ' '::text) || (COALESCE(proveedor, ''::character varying))::text)) public.gin_trgm_ops);


--
-- Name: idx_gastos_usuario; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_gastos_usuario ON public.gastos USING btree (usuario_id);


--
-- Name: idx_historial_deuda_fecha; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_historial_deuda_fecha ON public.historial_deudas USING btree (deuda_id, fecha_cambio);


--
-- Name: idx_notificaciones_cliente_id; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_notificaciones_cliente_id ON public.notificaciones USING btree (cliente_id);


--
-- Name: idx_notificaciones_estado; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_notificaciones_estado ON public.notificaciones USING btree (estado);


--
-- Name: idx_notificaciones_tipo; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_notificaciones_tipo ON public.notificaciones USING btree (tipo);


--
-- Name: idx_pagos_cliente_estado; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_pagos_cliente_estado ON public.pagos USING btree (cliente_id, estado);


--
-- Name: idx_pagos_cliente_fecha; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_pagos_cliente_fecha ON public.pagos USING btree (cliente_id, fecha_pago);


--
-- Name: idx_pagos_cliente_id; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_pagos_cliente_id ON public.pagos USING btree (cliente_id);


--
-- Name: idx_pagos_comprobante; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_pagos_comprobante ON public.pagos USING btree (numero_comprobante);


--
-- Name: idx_pagos_concepto_mes; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_pagos_concepto_mes ON public.pagos USING btree (concepto_mes);


--
-- Name: idx_pagos_estado; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_pagos_estado ON public.pagos USING btree (estado);


--
-- Name: idx_pagos_fecha; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_pagos_fecha ON public.pagos USING btree (fecha_pago);


--
-- Name: idx_pagos_metodo; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_pagos_metodo ON public.pagos USING btree (metodo_pago);


--
-- Name: idx_sectores_nombre; Type: INDEX; Schema: public; Owner: teltec_user
--

CREATE INDEX idx_sectores_nombre ON public.sectores USING btree (nombre_sector);


--
-- Name: clientes trigger_clientes_fecha_actualizacion; Type: TRIGGER; Schema: public; Owner: teltec_user
--

CREATE TRIGGER trigger_clientes_fecha_actualizacion BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_actualizacion();


--
-- Name: pagos trigger_pagos_numero_comprobante; Type: TRIGGER; Schema: public; Owner: teltec_user
--

CREATE TRIGGER trigger_pagos_numero_comprobante BEFORE INSERT ON public.pagos FOR EACH ROW EXECUTE FUNCTION public.asignar_numero_comprobante();


--
-- Name: deudas trigger_update_fecha_actualizacion; Type: TRIGGER; Schema: public; Owner: teltec_user
--

CREATE TRIGGER trigger_update_fecha_actualizacion BEFORE UPDATE ON public.deudas FOR EACH ROW EXECUTE FUNCTION public.update_fecha_actualizacion();


--
-- Name: usuarios trigger_usuarios_fecha_actualizacion; Type: TRIGGER; Schema: public; Owner: teltec_user
--

CREATE TRIGGER trigger_usuarios_fecha_actualizacion BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_actualizacion();


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: clientes_planes clientes_planes_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.clientes_planes
    ADD CONSTRAINT clientes_planes_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: clientes_planes clientes_planes_id_plan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.clientes_planes
    ADD CONSTRAINT clientes_planes_id_plan_fkey FOREIGN KEY (id_plan) REFERENCES public.planes(id_plan) ON DELETE CASCADE;


--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_usuarios_id; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_usuarios_id FOREIGN KEY (user_id) REFERENCES public.usuarios(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: clientes fk_clientes_sector; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT fk_clientes_sector FOREIGN KEY (id_sector) REFERENCES public.sectores(id_sector);


--
-- Name: deudas fk_deuda_cliente; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.deudas
    ADD CONSTRAINT fk_deuda_cliente FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: deudas fk_deuda_plan; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.deudas
    ADD CONSTRAINT fk_deuda_plan FOREIGN KEY (plan_id) REFERENCES public.planes(id_plan) ON DELETE CASCADE;


--
-- Name: historial_deudas fk_historial_deuda; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.historial_deudas
    ADD CONSTRAINT fk_historial_deuda FOREIGN KEY (deuda_id) REFERENCES public.deudas(id) ON DELETE CASCADE;


--
-- Name: gastos gastos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: notificaciones notificaciones_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: pagos pagos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: teltec_user
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: teltec_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- Name: FUNCTION actualizar_fecha_actualizacion(); Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON FUNCTION public.actualizar_fecha_actualizacion() TO postgres;


--
-- Name: FUNCTION asignar_numero_comprobante(); Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON FUNCTION public.asignar_numero_comprobante() TO postgres;


--
-- Name: FUNCTION generar_numero_comprobante(); Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON FUNCTION public.generar_numero_comprobante() TO postgres;


--
-- Name: TABLE clientes; Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON TABLE public.clientes TO postgres;


--
-- Name: TABLE pagos; Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON TABLE public.pagos TO postgres;


--
-- Name: SEQUENCE clientes_id_seq; Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON SEQUENCE public.clientes_id_seq TO postgres;


--
-- Name: TABLE gastos; Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON TABLE public.gastos TO postgres;


--
-- Name: SEQUENCE gastos_id_seq; Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON SEQUENCE public.gastos_id_seq TO postgres;


--
-- Name: TABLE notificaciones; Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON TABLE public.notificaciones TO postgres;


--
-- Name: SEQUENCE notificaciones_id_seq; Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON SEQUENCE public.notificaciones_id_seq TO postgres;


--
-- Name: SEQUENCE pagos_id_seq; Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON SEQUENCE public.pagos_id_seq TO postgres;


--
-- Name: TABLE usuarios; Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON TABLE public.usuarios TO postgres;


--
-- Name: SEQUENCE usuarios_id_seq; Type: ACL; Schema: public; Owner: teltec_user
--

GRANT ALL ON SEQUENCE public.usuarios_id_seq TO postgres;


--
-- PostgreSQL database dump complete
--

\unrestrict 5hH3jIiGtguZo9jgi19CaTwODgfzEAq9VWlJUNfCdCZnKDfFu0w7dGbp0tNU2z4

