package com.segurosbolivar.polizas.domain.model;

import com.segurosbolivar.polizas.domain.exception.ConflictoEstadoException;
import com.segurosbolivar.polizas.domain.exception.ReglaNegocioException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Póliza de arrendamiento. Es la raíz del agregado: los riesgos se agregan y cancelan a través de ella
 * para que las reglas de negocio vivan en un solo lugar.
 */
@Entity
@Table(name = "poliza")
public class Poliza {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_poliza")
    @SequenceGenerator(name = "seq_poliza", sequenceName = "seq_poliza", allocationSize = 1)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false, length = 20)
    private String numero;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private TipoPoliza tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoPoliza estado;

    @Column(nullable = false, length = 150)
    private String tomador;

    @Column(nullable = false)
    private LocalDate fechaInicioVigencia;

    @Column(nullable = false)
    private LocalDate fechaFinVigencia;

    @Column(nullable = false)
    private Integer mesesVigencia;

    @Column(nullable = false, precision = 15, scale = Montos.ESCALA)
    private BigDecimal valorCanon;

    @Column(nullable = false, precision = 15, scale = Montos.ESCALA)
    private BigDecimal valorPrima;

    /** Bloqueo optimista: dos actualizaciones concurrentes sobre la misma versión producen un 409. */
    @Version
    private Long version;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(nullable = false)
    private LocalDateTime fechaActualizacion;

    @OneToMany(mappedBy = "poliza", cascade = CascadeType.ALL)
    @OrderBy("id ASC")
    private List<Riesgo> riesgos = new ArrayList<>();

    protected Poliza() {
        // requerido por JPA
    }

    private Poliza(String numero, TipoPoliza tipo, String tomador, LocalDate fechaInicioVigencia,
                   int mesesVigencia, BigDecimal valorCanon) {
        this.numero = Objects.requireNonNull(numero, "numero");
        this.tipo = Objects.requireNonNull(tipo, "tipo");
        this.tomador = Objects.requireNonNull(tomador, "tomador");
        this.fechaInicioVigencia = Objects.requireNonNull(fechaInicioVigencia, "fechaInicioVigencia");
        Objects.requireNonNull(valorCanon, "valorCanon");
        if (mesesVigencia <= 0) {
            throw new ReglaNegocioException("Los meses de vigencia deben ser mayores a cero");
        }
        if (valorCanon.signum() <= 0) {
            throw new ReglaNegocioException("El valor del canon debe ser mayor a cero");
        }
        this.mesesVigencia = mesesVigencia;
        this.fechaFinVigencia = fechaInicioVigencia.plusMonths(mesesVigencia);
        this.valorCanon = Montos.redondear(valorCanon);
        this.valorPrima = calcularPrima(this.valorCanon, mesesVigencia);
        this.estado = EstadoPoliza.ACTIVA;
    }

    /**
     * Crea una póliza nueva en estado ACTIVA.
     * Una póliza INDIVIDUAL debe crearse con exactamente un riesgo; una COLECTIVA admite cero o más.
     */
    public static Poliza crear(String numero, TipoPoliza tipo, String tomador, LocalDate fechaInicioVigencia,
                               int mesesVigencia, BigDecimal valorCanon, List<Riesgo> riesgosIniciales) {
        Objects.requireNonNull(riesgosIniciales, "riesgosIniciales");
        if (tipo == TipoPoliza.INDIVIDUAL && riesgosIniciales.size() != 1) {
            throw new ReglaNegocioException("Una póliza individual debe crearse con exactamente un riesgo");
        }
        Poliza poliza = new Poliza(numero, tipo, tomador, fechaInicioVigencia, mesesVigencia, valorCanon);
        riesgosIniciales.forEach(poliza::vincular);
        return poliza;
    }

    /** prima = canon mensual × meses de vigencia. */
    static BigDecimal calcularPrima(BigDecimal canon, int meses) {
        return Montos.redondear(canon.multiply(BigDecimal.valueOf(meses)));
    }

    /**
     * Renueva la póliza: incrementa el canon por el IPC, recalcula la prima y abre una nueva vigencia
     * con la misma cantidad de meses, iniciando donde terminó la anterior.
     */
    public void renovar(BigDecimal ipc) {
        Objects.requireNonNull(ipc, "ipc");
        if (estaCancelada()) {
            throw new ConflictoEstadoException("No se puede renovar la póliza %s porque está cancelada".formatted(numero));
        }
        this.valorCanon = Montos.redondear(valorCanon.multiply(BigDecimal.ONE.add(ipc)));
        this.valorPrima = calcularPrima(valorCanon, mesesVigencia);
        this.fechaInicioVigencia = fechaFinVigencia;
        this.fechaFinVigencia = fechaInicioVigencia.plusMonths(mesesVigencia);
        this.estado = EstadoPoliza.RENOVADA;
    }

    /**
     * Cancela la póliza y todos sus riesgos activos.
     */
    public void cancelar() {
        if (estaCancelada()) {
            throw new ConflictoEstadoException("La póliza %s ya está cancelada".formatted(numero));
        }
        this.estado = EstadoPoliza.CANCELADA;
        riesgos.stream()
                .filter(riesgo -> !riesgo.estaCancelado())
                .forEach(Riesgo::cancelar);
    }

    /**
     * Agrega un riesgo. Solo las pólizas COLECTIVAS no canceladas admiten riesgos adicionales.
     */
    public void agregarRiesgo(Riesgo riesgo) {
        Objects.requireNonNull(riesgo, "riesgo");
        if (tipo != TipoPoliza.COLECTIVA) {
            throw new ReglaNegocioException(
                    "Solo se pueden agregar riesgos a pólizas colectivas; la póliza %s es %s".formatted(numero, tipo));
        }
        if (estaCancelada()) {
            throw new ConflictoEstadoException("No se pueden agregar riesgos a la póliza %s porque está cancelada".formatted(numero));
        }
        vincular(riesgo);
    }

    public boolean estaCancelada() {
        return estado == EstadoPoliza.CANCELADA;
    }

    private void vincular(Riesgo riesgo) {
        riesgo.asignarPoliza(this);
        riesgos.add(riesgo);
    }

    /** Auditoría: creación y última actualización parten del mismo instante. */
    @PrePersist
    void alCrear() {
        fechaCreacion = LocalDateTime.now();
        fechaActualizacion = fechaCreacion;
    }

    @PreUpdate
    void alActualizar() {
        fechaActualizacion = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getNumero() {
        return numero;
    }

    public TipoPoliza getTipo() {
        return tipo;
    }

    public EstadoPoliza getEstado() {
        return estado;
    }

    public String getTomador() {
        return tomador;
    }

    public LocalDate getFechaInicioVigencia() {
        return fechaInicioVigencia;
    }

    public LocalDate getFechaFinVigencia() {
        return fechaFinVigencia;
    }

    public Integer getMesesVigencia() {
        return mesesVigencia;
    }

    public BigDecimal getValorCanon() {
        return valorCanon;
    }

    public BigDecimal getValorPrima() {
        return valorPrima;
    }

    public Long getVersion() {
        return version;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    /** Vista de solo lectura: los riesgos se modifican únicamente mediante los métodos del agregado. */
    public List<Riesgo> getRiesgos() {
        return Collections.unmodifiableList(riesgos);
    }
}
