-- ============================================================================
-- PROYECTO INTEGRADOR: SIMULADOR BANCARIO WEB
-- Archivo: database.sql
-- Motor: MySQL
-- Descripción: Creación de base de datos, tablas, llaves primarias/foráneas,
--              restricciones de negocio y datos iniciales de prueba.
-- ============================================================================

DROP DATABASE IF EXISTS simulador_bancario;
CREATE DATABASE simulador_bancario CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE simulador_bancario;

-- ============================================================================
-- 1. TABLA: usuarios
-- Almacena tanto administradores como clientes del banco.
-- Las contraseñas se almacenan encriptadas con bcrypt (nunca en texto plano).
-- ============================================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(120) NOT NULL,
    correo VARCHAR(120) NOT NULL UNIQUE,
    telefono VARCHAR(25) DEFAULT NULL,
    direccion VARCHAR(180) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('ADMIN', 'CLIENTE') NOT NULL DEFAULT 'CLIENTE',
    estado ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 2. TABLA: cuentas
-- Almacena las cuentas bancarias asociadas a los clientes.
-- El PIN del cajero automático se almacena encriptado con bcrypt.
-- ============================================================================
CREATE TABLE cuentas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    numero_cuenta VARCHAR(20) NOT NULL UNIQUE,
    tipo_cuenta ENUM('AHORROS', 'CORRIENTE') NOT NULL DEFAULT 'AHORROS',
    saldo DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    pin_hash VARCHAR(255) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
    fecha_apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cuentas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_saldo_no_negativo
        CHECK (saldo >= 0)
) ENGINE=InnoDB;

-- ============================================================================
-- 3. TABLA: movimientos
-- Registra el historial financiero de cada cuenta (consignaciones, retiros de
-- cajero y transferencias enviadas o recibidas). No permite eliminaciones.
-- ============================================================================
CREATE TABLE movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_movimiento ENUM(
        'CONSIGNACION',
        'RETIRO_CAJERO',
        'TRANSFERENCIA_ENVIADA',
        'TRANSFERENCIA_RECIBIDA'
    ) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    valor DECIMAL(15, 2) NOT NULL,
    saldo_resultante DECIMAL(15, 2) NOT NULL,
    CONSTRAINT fk_movimientos_cuenta
        FOREIGN KEY (cuenta_id) REFERENCES cuentas(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_valor_movimiento_positivo
        CHECK (valor > 0)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. TABLA: transferencias
-- Registra la trazabilidad entre la cuenta origen y la cuenta destino en cada
-- transferencia realizada dentro del sistema.
-- ============================================================================
CREATE TABLE transferencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_origen_id INT NOT NULL,
    cuenta_destino_id INT NOT NULL,
    valor DECIMAL(15, 2) NOT NULL,
    descripcion VARCHAR(255) NOT NULL DEFAULT 'Transferencia entre cuentas',
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transferencias_origen
        FOREIGN KEY (cuenta_origen_id) REFERENCES cuentas(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_transferencias_destino
        FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_valor_transferencia_positivo
        CHECK (valor > 0),
    CONSTRAINT chk_cuentas_distintas
        CHECK (cuenta_origen_id <> cuenta_destino_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 5. DATOS DE PRUEBA INICIALES (Sección 14 del documento)
-- Credenciales de prueba (encriptadas con bcrypt):
--   * Administrador: correo = admin@banco.com     | contraseña = Admin123*
--   * Cliente 1:     correo = juan@correo.com     | contraseña = Cliente123* | Cuenta: 1001000001 | PIN: 1234
--   * Cliente 2:     correo = maria@correo.com    | contraseña = Cliente123* | Cuenta: 1001000002 | PIN: 5678
--   * Cliente 3:     correo = carlos@correo.com   | contraseña = Cliente123* | Cuenta: 1001000003 | PIN: 9012 (BLOQUEADO)
-- ============================================================================

INSERT INTO usuarios (id, documento, nombre_completo, correo, telefono, direccion, password_hash, rol, estado) VALUES
(1, '1000000001', 'Administrador General', 'admin@banco.com', '3001112233', 'Sede Central Banco', '$2a$10$fRg4wUptf5BUTxENrPSuxePAstE9Pk2TFvl9XvmlhHwcw1QHW/UOW', 'ADMIN', 'ACTIVO'),
(2, '1000000002', 'Juan Pérez', 'juan@correo.com', '3102223344', 'Calle 10 # 20-30', '$2a$10$FWi8ab8tx6ltrSOAlQNDneTWTnY7cTsVn/9jGICVk3nEH0uzF9GJC', 'CLIENTE', 'ACTIVO'),
(3, '1000000003', 'María Gómez', 'maria@correo.com', '3153334455', 'Carrera 45 # 12-08', '$2a$10$FWi8ab8tx6ltrSOAlQNDneTWTnY7cTsVn/9jGICVk3nEH0uzF9GJC', 'CLIENTE', 'ACTIVO'),
(4, '1000000004', 'Carlos Rodríguez', 'carlos@correo.com', '3204445566', 'Avenida 68 # 50-15', '$2a$10$FWi8ab8tx6ltrSOAlQNDneTWTnY7cTsVn/9jGICVk3nEH0uzF9GJC', 'CLIENTE', 'BLOQUEADO');

INSERT INTO cuentas (id, usuario_id, numero_cuenta, tipo_cuenta, saldo, pin_hash, estado) VALUES
(1, 2, '1001000001', 'AHORROS', 1000000.00, '$2a$10$dTKH8Obhz389gBOd6beMqeil00ceypmQjqHwk3kQ2yEDcZii/CxS2', 'ACTIVO'),
(2, 3, '1001000002', 'AHORROS', 2500000.00, '$2a$10$Zb/Z/fv1dbaXjCz8gvdefueeAvuW6zmzNx/rr/d4PxnmsSq3gr2A.', 'ACTIVO'),
(3, 4, '1001000003', 'CORRIENTE', 450000.00, '$2a$10$JEjDgJM7JSNUoTaf1Rd3KOaEUk4LoeHzXa38T8SjSLIcKpMYJAvU2', 'BLOQUEADO');

INSERT INTO movimientos (cuenta_id, fecha, tipo_movimiento, descripcion, valor, saldo_resultante) VALUES
(1, NOW() - INTERVAL 5 DAY, 'CONSIGNACION', 'Consignación inicial de apertura', 1200000.00, 1200000.00),
(1, NOW() - INTERVAL 3 DAY, 'RETIRO_CAJERO', 'Retiro en cajero automático', 100000.00, 1100000.00),
(1, NOW() - INTERVAL 1 DAY, 'TRANSFERENCIA_ENVIADA', 'Transferencia enviada a cuenta 1001000002', 100000.00, 1000000.00),
(2, NOW() - INTERVAL 4 DAY, 'CONSIGNACION', 'Consignación inicial de apertura', 2400000.00, 2400000.00),
(2, NOW() - INTERVAL 1 DAY, 'TRANSFERENCIA_RECIBIDA', 'Transferencia recibida desde cuenta 1001000001', 100000.00, 2500000.00),
(3, NOW() - INTERVAL 2 DAY, 'CONSIGNACION', 'Consignación inicial de apertura', 450000.00, 450000.00);

INSERT INTO transferencias (cuenta_origen_id, cuenta_destino_id, valor, descripcion, fecha) VALUES
(1, 2, 100000.00, 'Pago de cuota inicial', NOW() - INTERVAL 1 DAY);
