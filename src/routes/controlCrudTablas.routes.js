// src/routes/controlCrudTablas.routes.js
// CRUD de tablas de administración
// Accede a 2 bases de datos:
//   pool        → felman2026  (tabla: usuario_app_felman)
//   poolAlmacen → almacen     (tablas: usuariosinstaladores, tf_usuarios)

const express = require('express');
const pool = require('../config/database');           // DB felman2026
const poolAlmacen = require('../config/databaseAlamcen'); // DB almacen

const router = express.Router();

const ROLES_VALIDOS = ['administrador', 'instalador', 'supervisor', 'fabrica', 'developer', 'usuario'];

// ─── INIT: crear tabla usuariosinstaladores si no existe ────────────────────────
router.get('/init', async (req, res) => {
  try {
    await poolAlmacen.query(`
      CREATE TABLE IF NOT EXISTS usuariosinstaladores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_felman_id INT NOT NULL UNIQUE,
        nombre VARCHAR(255) NOT NULL,
        activo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    res.json({ status: 'ok', message: 'Tabla usuariosinstaladores verificada/creada' });
  } catch (error) {
    console.error('❌ Error en GET /crud-tablas/init:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── GET /usuarios: listar con búsqueda por nombre y filtro por rol ─────────────
router.get('/usuarios', async (req, res) => {
  try {
    const { buscar, rol } = req.query;

    let query = 'SELECT id, nombre, rol FROM usuario_app_felman WHERE 1=1';
    const params = [];

    if (buscar && buscar.trim()) {
      query += ' AND nombre LIKE ?';
      params.push(`%${buscar.trim()}%`);
    }
    if (rol && rol.trim()) {
      query += ' AND rol = ?';
      params.push(rol.trim());
    }

    query += ' ORDER BY nombre ASC';

    const [rows] = await pool.query(query, params);
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en GET /crud-tablas/usuarios:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── GET /usuarios/:id: obtener un usuario por ID ───────────────────────────────
router.get('/usuarios/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, rol FROM usuario_app_felman WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }
    res.json({ status: 'ok', data: rows[0] });
  } catch (error) {
    console.error('❌ Error en GET /crud-tablas/usuarios/:id:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── POST /usuarios: crear usuario ──────────────────────────────────────────────
router.post('/usuarios', async (req, res) => {
  const { nombre, contraseña, rol } = req.body;

  if (!nombre || !contraseña || !rol) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan campos requeridos: nombre, contraseña, rol',
    });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ status: 'error', message: `Rol inválido. Roles válidos: ${ROLES_VALIDOS.join(', ')}` });
  }

  try {
    // 1. Insertar en felman2026.usuario_app_felman
    const [result] = await pool.query(
      'INSERT INTO usuario_app_felman (nombre, contraseña, rol) VALUES (?, ?, ?)',
      [nombre.trim(), contraseña, rol]
    );
    const nuevoId = result.insertId;

    // 2. Si es instalador → insertar en almacen.usuariosinstaladores
    if (rol === 'instalador') {
      try {
        await poolAlmacen.query(
          'INSERT INTO usuariosinstaladores (usuario_felman_id, nombre) VALUES (?, ?)',
          [nuevoId, nombre.trim()]
        );
      } catch (e) {
        console.warn('⚠️ No se pudo insertar en usuariosinstaladores:', e.message);
      }
    }

    // 3. Si es usuario → insertar en almacen.tf_usuarios
    if (rol === 'usuario') {
      try {
        await poolAlmacen.query(
          'INSERT INTO tf_usuarios (nombre, username, password, rol) VALUES (?, ?, ?, ?)',
          [nombre.trim(), nombre.trim(), contraseña, 'usuario']
        );
      } catch (e) {
        console.warn('⚠️ No se pudo insertar en tf_usuarios:', e.message);
      }
    }

    res.json({ status: 'ok', message: 'Usuario creado correctamente', id: nuevoId });
  } catch (error) {
    console.error('❌ Error en POST /crud-tablas/usuarios:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'El nombre de usuario ya existe' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── PUT /usuarios/:id: actualizar usuario ───────────────────────────────────────
router.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, contraseña, rol } = req.body;

  if (!nombre || !rol) {
    return res.status(400).json({ status: 'error', message: 'Faltan campos requeridos: nombre, rol' });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ status: 'error', message: `Rol inválido. Roles válidos: ${ROLES_VALIDOS.join(', ')}` });
  }

  try {
    // Obtener datos actuales del usuario
    const [existing] = await pool.query(
      'SELECT rol, nombre AS nombre_anterior FROM usuario_app_felman WHERE id = ?',
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    const rolAnterior = existing[0].rol;
    const nombreAnterior = existing[0].nombre_anterior;

    // Actualizar en felman2026
    if (contraseña && contraseña.trim()) {
      await pool.query(
        'UPDATE usuario_app_felman SET nombre = ?, contraseña = ?, rol = ? WHERE id = ?',
        [nombre.trim(), contraseña, rol, id]
      );
    } else {
      await pool.query(
        'UPDATE usuario_app_felman SET nombre = ?, rol = ? WHERE id = ?',
        [nombre.trim(), rol, id]
      );
    }

    // ── Sincronizar tablas auxiliares ──────────────────────────────────────────
    if (rol === 'instalador') {
      // Upsert en usuariosinstaladores
      const [existe] = await poolAlmacen.query(
        'SELECT id FROM usuariosinstaladores WHERE usuario_felman_id = ?',
        [id]
      );
      if (existe.length) {
        await poolAlmacen.query(
          'UPDATE usuariosinstaladores SET nombre = ? WHERE usuario_felman_id = ?',
          [nombre.trim(), id]
        );
      } else {
        await poolAlmacen.query(
          'INSERT INTO usuariosinstaladores (usuario_felman_id, nombre) VALUES (?, ?)',
          [id, nombre.trim()]
        );
      }
      // Si antes era 'usuario', limpiar tf_usuarios
      if (rolAnterior === 'usuario') {
        await poolAlmacen.query(
          'DELETE FROM tf_usuarios WHERE username = ?',
          [nombreAnterior]
        ).catch(() => {});
      }

    } else if (rol === 'usuario') {
      // Upsert en tf_usuarios
      const [existe] = await poolAlmacen.query(
        'SELECT id FROM tf_usuarios WHERE username = ?',
        [nombreAnterior]
      );
      if (existe.length) {
        await poolAlmacen.query(
          'UPDATE tf_usuarios SET nombre = ?, username = ? WHERE username = ?',
          [nombre.trim(), nombre.trim(), nombreAnterior]
        );
      } else {
        await poolAlmacen.query(
          'INSERT INTO tf_usuarios (nombre, username, password, rol) VALUES (?, ?, ?, ?)',
          [nombre.trim(), nombre.trim(), contraseña || '', 'usuario']
        );
      }
      // Si antes era 'instalador', limpiar usuariosinstaladores
      if (rolAnterior === 'instalador') {
        await poolAlmacen.query(
          'DELETE FROM usuariosinstaladores WHERE usuario_felman_id = ?',
          [id]
        ).catch(() => {});
      }

    } else {
      // Rol sin tabla auxiliar: limpiar registros previos si los había
      if (rolAnterior === 'instalador') {
        await poolAlmacen.query(
          'DELETE FROM usuariosinstaladores WHERE usuario_felman_id = ?',
          [id]
        ).catch(() => {});
      }
      if (rolAnterior === 'usuario') {
        await poolAlmacen.query(
          'DELETE FROM tf_usuarios WHERE username = ?',
          [nombreAnterior]
        ).catch(() => {});
      }
    }

    res.json({ status: 'ok', message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error en PUT /crud-tablas/usuarios/:id:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'El nombre de usuario ya existe' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── DELETE /usuarios/:id: eliminar usuario ──────────────────────────────────────
router.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await pool.query(
      'SELECT rol, nombre FROM usuario_app_felman WHERE id = ?',
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    const { rol, nombre } = existing[0];

    // Eliminar de tabla auxiliar según rol
    if (rol === 'instalador') {
      await poolAlmacen.query(
        'DELETE FROM usuariosinstaladores WHERE usuario_felman_id = ?',
        [id]
      ).catch(() => {});
    } else if (rol === 'usuario') {
      await poolAlmacen.query(
        'DELETE FROM tf_usuarios WHERE username = ?',
        [nombre]
      ).catch(() => {});
    }

    // Eliminar de felman2026
    await pool.query('DELETE FROM usuario_app_felman WHERE id = ?', [id]);

    res.json({ status: 'ok', message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error en DELETE /crud-tablas/usuarios/:id:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
