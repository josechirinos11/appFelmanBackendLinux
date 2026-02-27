// src/routes/controlCrudTablas.routes.js
// CRUD de tablas de administración
// Accede a 2 bases de datos:
//   pool        → felman2026  (tabla: usuario_app_felman — sin PK, nombre es clave única)
//   poolAlmacen → almacen     (tablas: usuariosinstaladores, tf_usuarios)
//
// Esquemas reales:
//   usuario_app_felman : nombre, dni, correo, contraseña, rol, telefono
//   usuariosinstaladores: id PK, nombre, rol, grupo_instaladores, telefono, activo
//   tf_usuarios         : id PK, nombre, username, password, rol enum('usuario','desarrollador'), activo

const express = require('express');
const pool        = require('../config/database');          // DB felman2026
const poolAlmacen = require('../config/databaseAlamcen');  // DB almacen

const router = express.Router();

const ROLES_VALIDOS = ['administrador', 'instalador', 'supervisor', 'fabrica', 'developer', 'usuario'];
const GRUPOS_INSTALADOR = ['Alfa', 'Bravo', 'Beta', 'Felman'];

// ─── GET /init: verificar estructura de tablas (diagnóstico) ────────────────────
router.get('/init', async (req, res) => {
  try {
    const [colsFelman]       = await pool.query('SHOW COLUMNS FROM usuario_app_felman');
    const [colsInstaladores] = await poolAlmacen.query('SHOW COLUMNS FROM usuariosinstaladores');
    const [colsTfUsuarios]   = await poolAlmacen.query('SHOW COLUMNS FROM tf_usuarios');
    res.json({
      status: 'ok',
      tablas: {
        usuario_app_felman:   colsFelman.map(c => c.Field),
        usuariosinstaladores: colsInstaladores.map(c => c.Field),
        tf_usuarios:          colsTfUsuarios.map(c => c.Field),
      },
    });
  } catch (error) {
    console.error('❌ Error en GET /crud-tablas/init:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── GET /usuarios: listar con búsqueda por nombre y filtro por rol ─────────────
router.get('/usuarios', async (req, res) => {
  try {
    const { buscar, rol } = req.query;

    let query = 'SELECT nombre, dni, correo, rol, telefono FROM usuario_app_felman WHERE 1=1';
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

// ─── GET /usuarios/:nombre: obtener un usuario por nombre ───────────────────────
router.get('/usuarios/:nombre', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT nombre, dni, correo, rol, telefono FROM usuario_app_felman WHERE nombre = ?',
      [req.params.nombre]
    );
    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }
    // Si es instalador, enriquecer con datos de usuariosinstaladores
    const usuario = rows[0];
    if (usuario.rol === 'instalador') {
      const [inst] = await poolAlmacen.query(
        'SELECT grupo_instaladores, activo FROM usuariosinstaladores WHERE nombre = ?',
        [usuario.nombre]
      );
      if (inst.length) {
        usuario.grupo_instaladores = inst[0].grupo_instaladores;
        usuario.activo = inst[0].activo;
      }
    }
    res.json({ status: 'ok', data: usuario });
  } catch (error) {
    console.error('❌ Error en GET /crud-tablas/usuarios/:nombre:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── POST /usuarios: crear usuario ──────────────────────────────────────────────
router.post('/usuarios', async (req, res) => {
  const { nombre, dni, correo, contraseña, rol, telefono, grupo_instaladores } = req.body;

  if (!nombre || !contraseña || !rol) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan campos requeridos: nombre, contraseña, rol',
    });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({
      status: 'error',
      message: `Rol inválido. Válidos: ${ROLES_VALIDOS.join(', ')}`,
    });
  }

  try {
    // 1. Insertar en felman2026.usuario_app_felman
    await pool.query(
      'INSERT INTO usuario_app_felman (nombre, dni, correo, contraseña, rol, telefono) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre.trim(), dni || null, correo || null, contraseña, rol, telefono || null]
    );

    // 2. Si es instalador → insertar en almacen.usuariosinstaladores
    if (rol === 'instalador') {
      const grupo = GRUPOS_INSTALADOR.includes(grupo_instaladores) ? grupo_instaladores : 'Felman';
      await poolAlmacen.query(
        'INSERT INTO usuariosinstaladores (nombre, rol, grupo_instaladores, telefono) VALUES (?, ?, ?, ?)',
        [nombre.trim(), rol, grupo, telefono || null]
      ).catch(e => console.warn('⚠️ usuariosinstaladores insert:', e.message));
    }

    // 3. Si es usuario → insertar en almacen.tf_usuarios
    if (rol === 'usuario') {
      await poolAlmacen.query(
        'INSERT INTO tf_usuarios (nombre, username, password, rol) VALUES (?, ?, ?, ?)',
        [nombre.trim(), nombre.trim(), contraseña, 'usuario']
      ).catch(e => console.warn('⚠️ tf_usuarios insert:', e.message));
    }

    res.json({ status: 'ok', message: 'Usuario creado correctamente', nombre: nombre.trim() });
  } catch (error) {
    console.error('❌ Error en POST /crud-tablas/usuarios:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'El nombre de usuario ya existe' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── PUT /usuarios/:nombre: actualizar usuario ───────────────────────────────────
// :nombre es el nombre ACTUAL (antes de la edición)
router.put('/usuarios/:nombre', async (req, res) => {
  const nombreAnterior = req.params.nombre;
  const { nombre, dni, correo, contraseña, rol, telefono, grupo_instaladores } = req.body;

  if (!nombre || !rol) {
    return res.status(400).json({ status: 'error', message: 'Faltan campos requeridos: nombre, rol' });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({
      status: 'error',
      message: `Rol inválido. Válidos: ${ROLES_VALIDOS.join(', ')}`,
    });
  }

  try {
    // Obtener datos actuales
    const [existing] = await pool.query(
      'SELECT nombre, rol FROM usuario_app_felman WHERE nombre = ?',
      [nombreAnterior]
    );
    if (!existing.length) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }
    const rolAnterior = existing[0].rol;

    // Actualizar en felman2026
    if (contraseña && contraseña.trim()) {
      await pool.query(
        'UPDATE usuario_app_felman SET nombre=?, dni=?, correo=?, contraseña=?, rol=?, telefono=? WHERE nombre=?',
        [nombre.trim(), dni || null, correo || null, contraseña, rol, telefono || null, nombreAnterior]
      );
    } else {
      await pool.query(
        'UPDATE usuario_app_felman SET nombre=?, dni=?, correo=?, rol=?, telefono=? WHERE nombre=?',
        [nombre.trim(), dni || null, correo || null, rol, telefono || null, nombreAnterior]
      );
    }

    // ── Sincronizar tablas auxiliares ──────────────────────────────────────────
    if (rol === 'instalador') {
      const grupo = GRUPOS_INSTALADOR.includes(grupo_instaladores) ? grupo_instaladores : 'Felman';
      // Buscar en usuariosinstaladores por nombre anterior
      const [existeInst] = await poolAlmacen.query(
        'SELECT id FROM usuariosinstaladores WHERE nombre = ?', [nombreAnterior]
      ).catch(() => [[]]);

      if (existeInst && existeInst.length) {
        await poolAlmacen.query(
          'UPDATE usuariosinstaladores SET nombre=?, rol=?, grupo_instaladores=?, telefono=? WHERE nombre=?',
          [nombre.trim(), rol, grupo, telefono || null, nombreAnterior]
        ).catch(e => console.warn('⚠️ usuariosinstaladores update:', e.message));
      } else {
        await poolAlmacen.query(
          'INSERT INTO usuariosinstaladores (nombre, rol, grupo_instaladores, telefono) VALUES (?, ?, ?, ?)',
          [nombre.trim(), rol, grupo, telefono || null]
        ).catch(e => console.warn('⚠️ usuariosinstaladores insert:', e.message));
      }

      // Si antes era usuario → limpiar tf_usuarios
      if (rolAnterior === 'usuario') {
        await poolAlmacen.query(
          'DELETE FROM tf_usuarios WHERE username = ?', [nombreAnterior]
        ).catch(() => {});
      }

    } else if (rol === 'usuario') {
      // Buscar en tf_usuarios por username anterior
      const [existeTf] = await poolAlmacen.query(
        'SELECT id FROM tf_usuarios WHERE username = ?', [nombreAnterior]
      ).catch(() => [[]]);

      if (existeTf && existeTf.length) {
        const updatesTf = contraseña && contraseña.trim()
          ? 'UPDATE tf_usuarios SET nombre=?, username=?, password=? WHERE username=?'
          : 'UPDATE tf_usuarios SET nombre=?, username=? WHERE username=?';
        const paramsTf = contraseña && contraseña.trim()
          ? [nombre.trim(), nombre.trim(), contraseña, nombreAnterior]
          : [nombre.trim(), nombre.trim(), nombreAnterior];
        await poolAlmacen.query(updatesTf, paramsTf)
          .catch(e => console.warn('⚠️ tf_usuarios update:', e.message));
      } else {
        await poolAlmacen.query(
          'INSERT INTO tf_usuarios (nombre, username, password, rol) VALUES (?, ?, ?, ?)',
          [nombre.trim(), nombre.trim(), contraseña || '', 'usuario']
        ).catch(e => console.warn('⚠️ tf_usuarios insert:', e.message));
      }

      // Si antes era instalador → limpiar usuariosinstaladores
      if (rolAnterior === 'instalador') {
        await poolAlmacen.query(
          'DELETE FROM usuariosinstaladores WHERE nombre = ?', [nombreAnterior]
        ).catch(() => {});
      }

    } else {
      // Rol sin tabla auxiliar → limpiar registros anteriores
      if (rolAnterior === 'instalador') {
        await poolAlmacen.query(
          'DELETE FROM usuariosinstaladores WHERE nombre = ?', [nombreAnterior]
        ).catch(() => {});
      }
      if (rolAnterior === 'usuario') {
        await poolAlmacen.query(
          'DELETE FROM tf_usuarios WHERE username = ?', [nombreAnterior]
        ).catch(() => {});
      }
    }

    res.json({ status: 'ok', message: 'Usuario actualizado correctamente', nombre: nombre.trim() });
  } catch (error) {
    console.error('❌ Error en PUT /crud-tablas/usuarios/:nombre:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'El nombre de usuario ya existe' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── DELETE /usuarios/:nombre: eliminar usuario ──────────────────────────────────
router.delete('/usuarios/:nombre', async (req, res) => {
  const { nombre } = req.params;
  try {
    const [existing] = await pool.query(
      'SELECT nombre, rol FROM usuario_app_felman WHERE nombre = ?', [nombre]
    );
    if (!existing.length) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    const { rol } = existing[0];

    // Eliminar de tablas auxiliares según rol
    if (rol === 'instalador') {
      await poolAlmacen.query(
        'DELETE FROM usuariosinstaladores WHERE nombre = ?', [nombre]
      ).catch(() => {});
    } else if (rol === 'usuario') {
      await poolAlmacen.query(
        'DELETE FROM tf_usuarios WHERE username = ?', [nombre]
      ).catch(() => {});
    }

    // Eliminar de felman2026
    await pool.query('DELETE FROM usuario_app_felman WHERE nombre = ?', [nombre]);

    res.json({ status: 'ok', message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error en DELETE /crud-tablas/usuarios/:nombre:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
