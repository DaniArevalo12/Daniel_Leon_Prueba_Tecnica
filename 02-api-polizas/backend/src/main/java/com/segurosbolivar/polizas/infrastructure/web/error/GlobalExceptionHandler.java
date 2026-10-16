package com.segurosbolivar.polizas.infrastructure.web.error;

import com.segurosbolivar.polizas.domain.exception.ConflictoEstadoException;
import com.segurosbolivar.polizas.domain.exception.RecursoNoEncontradoException;
import com.segurosbolivar.polizas.domain.exception.ReglaNegocioException;
import com.segurosbolivar.polizas.infrastructure.config.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.lang.Nullable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Traduce excepciones a respuestas RFC 9457 (ProblemDetail).
 * <p>
 * Hereda de {@link ResponseEntityExceptionHandler} para cubrir los errores estándar de Spring MVC
 * (JSON mal formado, tipos inválidos en parámetros, método no permitido...) con el mismo formato.
 * Nunca se expone el stack trace ni el mensaje interno de excepciones inesperadas.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ProblemDetail manejarNoEncontrado(RecursoNoEncontradoException ex) {
        return problema(HttpStatus.NOT_FOUND, "Recurso no encontrado", ex.getMessage());
    }

    @ExceptionHandler(ConflictoEstadoException.class)
    public ProblemDetail manejarConflicto(ConflictoEstadoException ex) {
        log.info("Conflicto de estado: {}", ex.getMessage());
        return problema(HttpStatus.CONFLICT, "Conflicto de estado", ex.getMessage());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ProblemDetail manejarConcurrencia(ObjectOptimisticLockingFailureException ex) {
        log.warn("Modificación concurrente detectada: {}", ex.getPersistentClassName());
        return problema(HttpStatus.CONFLICT, "Modificación concurrente",
                "El recurso fue modificado por otra operación. Consulte su estado actual e intente de nuevo.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail manejarIntegridad(DataIntegrityViolationException ex) {
        log.warn("Violación de integridad de datos", ex);
        return problema(HttpStatus.CONFLICT, "Conflicto de datos",
                "La operación viola una restricción de integridad de los datos.");
    }

    @ExceptionHandler(ReglaNegocioException.class)
    public ProblemDetail manejarReglaNegocio(ReglaNegocioException ex) {
        log.info("Regla de negocio violada: {}", ex.getMessage());
        return problema(HttpStatus.UNPROCESSABLE_ENTITY, "Regla de negocio violada", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail manejarInesperado(Exception ex) {
        log.error("Error inesperado", ex);
        return problema(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno",
                "Ocurrió un error inesperado. Reporte el correlationId al equipo de soporte.");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        Map<String, String> errores = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errores.putIfAbsent(error.getField(), error.getDefaultMessage());
        }
        ProblemDetail problema = problema(HttpStatus.BAD_REQUEST, "Solicitud inválida",
                "Uno o más campos no son válidos.");
        problema.setProperty("errores", errores);
        return ResponseEntity.badRequest().body(problema);
    }

    /**
     * Parámetro de ruta o query con tipo inválido (p. ej. ?tipo=XX). No se refleja el valor recibido.
     */
    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex, HttpHeaders headers,
                                                        HttpStatusCode status, WebRequest request) {
        String parametro = ex.getPropertyName() != null ? ex.getPropertyName() : "desconocido";
        String detalle = "El parámetro '%s' tiene un valor inválido.".formatted(parametro);
        Class<?> tipoEsperado = ex.getRequiredType();
        if (tipoEsperado != null && tipoEsperado.isEnum()) {
            detalle += " Valores permitidos: " + Arrays.toString(tipoEsperado.getEnumConstants());
        }
        return ResponseEntity.badRequest().body(problema(HttpStatus.BAD_REQUEST, "Solicitud inválida", detalle));
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        return ResponseEntity.badRequest().body(problema(HttpStatus.BAD_REQUEST, "Solicitud inválida",
                "El cuerpo de la petición no es un JSON válido o contiene valores no permitidos."));
    }

    /**
     * Enriquece también los ProblemDetail generados por Spring (400, 404 de ruta, 405...).
     */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, @Nullable Object body, HttpHeaders headers,
                                                             HttpStatusCode statusCode, WebRequest request) {
        // Spring puede construir el ProblemDetail dentro de super (body nulo), por eso se enriquece después
        ResponseEntity<Object> respuesta = super.handleExceptionInternal(ex, body, headers, statusCode, request);
        if (respuesta != null && respuesta.getBody() instanceof ProblemDetail problema) {
            enriquecer(problema);
        }
        return respuesta;
    }

    private static ProblemDetail problema(HttpStatus status, String titulo, String detalle) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(status, detalle);
        problema.setTitle(titulo);
        return enriquecer(problema);
    }

    private static ProblemDetail enriquecer(ProblemDetail problema) {
        problema.setProperty("timestamp", OffsetDateTime.now());
        problema.setProperty(CorrelationIdFilter.MDC_KEY, MDC.get(CorrelationIdFilter.MDC_KEY));
        return problema;
    }
}
