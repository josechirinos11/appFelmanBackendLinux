// src/routes/controlCrudTablas.routes.js
// CRUD de tablas de administracion

const express = require('express');
const pool = require('../config/database');

let poolAlmacen;
try {
  poolAlmacen = require('../config/databaseAlamcen');
} catch (_) {
  poolAlmacen = require('../config/databaseAlmacen');
}

const router = express.Router();

const ROLES_APP = ['administrador', 'instalador', 'supervisor', 'fabrica', 'developer', 'usuario'];
const GRUPOS_INSTALADOR = ['Alfa', 'Bravo', 'Beta', 'Felman'];
const ROLES_TF = ['usuario', 'desarrollador'];

function mapRolAppToTf(rol) {
  if (rol === 'usuario') return 'usuario';
  if (rol === 'developer') return 'desarrollador';
  return null;
}

router.get('/init', async (_req, res) => {
  try {
    const [colsFelman] = await pool.query('SHOW COLUMNS FROM usuario_app_felman');
    const [colsInst] = await poolAlmacen.query('SHOW COLUMNS FROM usuariosinstaladores');
    const [colsTf] = await poolAlmacen.query('SHOW COLUMNS FROM tf_usuarios');

    res.json({
      status: 'ok',
      tablas: {
        usuario_app_felman: colsFelman.map((c) => c.Field),
        usuariosinstaladores: colsInst.map((c) => c.Field),
        tf_usuarios: colsTf.map((c) => c.Field),
      },
    });
  } catch (error) {
    console.error('Error en GET /crud-tablas/init:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/usuarios', async (req, res) => {
  try {
    const { buscar, rol } = req.query;
    let query = 'SELECT nombre, dni, correo, rol, telefono FROM usuario_app_felman WHERE 1=1';
    const params = [];

    if (buscar && String(buscar).trim()) {
      query += ' AND nombre LIKE ?';
      params.push(`%${String(buscar).trim()}%`);
    }
    if (rol && String(rol).trim()) {
      query += ' AND rol = ?';
      params.push(String(rol).trim());
    }

    query += ' ORDER BY nombre ASC';

    const [rows] = await pool.query(query, params);
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('Error en GET /crud-tablas/usuarios:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/usuarios/:nombre', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT nombre, dni, correo, rol, telefono FROM usuario_app_felman WHERE nombre = ?',
      [req.params.nombre],
    );

    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    const usuario = rows[0];

    if (usuario.rol === 'instalador') {
      const [inst] = await poolAlmacen.query(
        'SELECT grupo_instaladores, activo FROM usuariosinstaladores WHERE nombre = ?',
        [usuario.nombre],
      );
      if (inst.length) {
        usuario.grupo_instaladores = inst[0].grupo_instaladores;
        usuario.activo = inst[0].activo;
      }
    }

    if (mapRolAppToTf(usuario.rol)) {
      const [tf] = await poolAlmacen.query(
        'SELECT id, username, rol, activo FROM tf_usuarios WHERE username = ?',
        [usuario.nombre],
      );
      if (tf.length) {
        usuario.tf_usuario = tf[0];
      }
    }

    res.json({ status: 'ok', data: usuario });
  } catch (error) {
    console.error('Error en GET /crud-tablas/usuarios/:nombre:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/usuarios', async (req, res) => {
  const { nombre, dni, correo, contraseña, rol, telefono, grupo_instaladores } = req.body;

  if (!nombre || !contraseña || !rol) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan campos requeridos: nombre, contraseña, rol',
    });
  }

  if (!ROLES_APP.includes(rol)) {
    return res.status(400).json({
      status: 'error',
      message: `Rol invalido. Validos: ${ROLES_APP.join(', ')}`,
    });
  }

  try {
    await pool.query(
      'INSERT INTO usuario_app_felman (nombre, dni, correo, contraseña, rol, telefono) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre.trim(), dni || null, correo || null, contraseña, rol, telefono || null],
    );

    if (rol === 'instalador') {
      const grupo = GRUPOS_INSTALADOR.includes(grupo_instaladores) ? grupo_instaladores : 'Felman';
      await poolAlmacen.query(
        'INSERT INTO usuariosinstaladores (nombre, rol, grupo_instaladores, telefono, activo) VALUES (?, ?, ?, ?, 1)',
        [nombre.trim(), rol, grupo, telefono || null],
      );
    }

    const rolTf = mapRolAppToTf(rol);
    if (rolTf) {
      await poolAlmacen.query(
        'INSERT INTO tf_usuarios (nombre, username, password, rol, activo) VALUES (?, ?, ?, ?, 1)',
        [nombre.trim(), nombre.trim(), contraseña, rolTf],
      );
    }

    res.json({ status: 'ok', message: 'Usuario creado correctamente', nombre: nombre.trim() });
  } catch (error) {
    console.error('Error en POST /crud-tablas/usuarios:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'El nombre de usuario ya existe' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.put('/usuarios/:nombre', async (req, res) => {
  const nombreAnterior = req.params.nombre;
  const { nombre, dni, correo, contraseña, rol, telefono, grupo_instaladores } = req.body;

  if (!nombre || !rol) {
    return res.status(400).json({ status: 'error', message: 'Faltan campos requeridos: nombre, rol' });
  }

  if (!ROLES_APP.includes(rol)) {
    return res.status(400).json({
      status: 'error',
      message: `Rol invalido. Validos: ${ROLES_APP.join(', ')}`,
    });
  }

  try {
    const [existing] = await pool.query(
      'SELECT nombre, rol FROM usuario_app_felman WHERE nombre = ?',
      [nombreAnterior],
    );

    if (!existing.length) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    const rolAnterior = existing[0].rol;

    if (contraseña && String(contraseña).trim()) {
      await pool.query(
        'UPDATE usuario_app_felman SET nombre=?, dni=?, correo=?, contraseña=?, rol=?, telefono=? WHERE nombre=?',
        [nombre.trim(), dni || null, correo || null, contraseña, rol, telefono || null, nombreAnterior],
      );
    } else {
      await pool.query(
        'UPDATE usuario_app_felman SET nombre=?, dni=?, correo=?, rol=?, telefono=? WHERE nombre=?',
        [nombre.trim(), dni || null, correo || null, rol, telefono || null, nombreAnterior],
      );
    }

    if (rol === 'instalador') {
      const grupo = GRUPOS_INSTALADOR.includes(grupo_instaladores) ? grupo_instaladores : 'Felman';
      const [inst] = await poolAlmacen.query('SELECT id FROM usuariosinstaladores WHERE nombre = ?', [nombreAnterior]);

      if (inst.length) {
        await poolAlmacen.query(
          'UPDATE usuariosinstaladores SET nombre=?, rol=?, grupo_instaladores=?, telefono=? WHERE nombre=?',
          [nombre.trim(), rol, grupo, telefono || null, nombreAnterior],
        );
      } else {
        await poolAlmacen.query(
          'INSERT INTO usuariosinstaladores (nombre, rol, grupo_instaladores, telefono, activo) VALUES (?, ?, ?, ?, 1)',
          [nombre.trim(), rol, grupo, telefono || null],
        );
      }
    } else if (rolAnterior === 'instalador') {
      await poolAlmacen.query('DELETE FROM usuariosinstaladores WHERE nombre = ?', [nombreAnterior]);
    }

    const nuevoRolTf = mapRolAppToTf(rol);
    const viejoRolTf = mapRolAppToTf(rolAnterior);

    if (nuevoRolTf) {
      const [tf] = await poolAlmacen.query('SELECT id FROM tf_usuarios WHERE username = ?', [nombreAnterior]);
      if (tf.length) {
        if (contraseña && String(contraseña).trim()) {
          await poolAlmacen.query(
            'UPDATE tf_usuarios SET nombre=?, username=?, password=?, rol=? WHERE username=?',
            [nombre.trim(), nombre.trim(), contraseña, nuevoRolTf, nombreAnterior],
          );
        } else {
          await poolAlmacen.query(
            'UPDATE tf_usuarios SET nombre=?, username=?, rol=? WHERE username=?',
            [nombre.trim(), nombre.trim(), nuevoRolTf, nombreAnterior],
          );
        }
      } else {
        await poolAlmacen.query(
          'INSERT INTO tf_usuarios (nombre, username, password, rol, activo) VALUES (?, ?, ?, ?, 1)',
          [nombre.trim(), nombre.trim(), contraseña || '', nuevoRolTf],
        );
      }
    } else if (viejoRolTf) {
      await poolAlmacen.query('DELETE FROM tf_usuarios WHERE username = ?', [nombreAnterior]);
    }

    res.json({ status: 'ok', message: 'Usuario actualizado correctamente', nombre: nombre.trim() });
  } catch (error) {
    console.error('Error en PUT /crud-tablas/usuarios/:nombre:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'El nombre de usuario ya existe' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.delete('/usuarios/:nombre', async (req, res) => {
  const { nombre } = req.params;
  try {
    const [existing] = await pool.query(
      'SELECT nombre, rol FROM usuario_app_felman WHERE nombre = ?',
      [nombre],
    );

    if (!existing.length) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    const { rol } = existing[0];

    if (rol === 'instalador') {
      await poolAlmacen.query('DELETE FROM usuariosinstaladores WHERE nombre = ?', [nombre]);
    }
    if (mapRolAppToTf(rol)) {
      await poolAlmacen.query('DELETE FROM tf_usuarios WHERE username = ?', [nombre]);
    }

    await pool.query('DELETE FROM usuario_app_felman WHERE nombre = ?', [nombre]);

    res.json({ status: 'ok', message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error en DELETE /crud-tablas/usuarios/:nombre:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/usuariosinstaladores', async (req, res) => {
  try {
    const { buscar, grupo, activo } = req.query;
    let query = 'SELECT id, nombre, rol, grupo_instaladores, telefono, activo FROM usuariosinstaladores WHERE 1=1';
    const params = [];

    if (buscar && String(buscar).trim()) {
      query += ' AND nombre LIKE ?';
      params.push(`%${String(buscar).trim()}%`);
    }
    if (grupo && String(grupo).trim()) {
      query += ' AND grupo_instaladores = ?';
      params.push(String(grupo).trim());
    }
    if (activo === '0' || activo === '1') {
      query += ' AND activo = ?';
      params.push(Number(activo));
    }

    query += ' ORDER BY nombre ASC';
    const [rows] = await poolAlmacen.query(query, params);
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('Error en GET /crud-tablas/usuariosinstaladores:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/usuariosinstaladores/:id', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query(
      'SELECT id, nombre, rol, grupo_instaladores, telefono, activo FROM usuariosinstaladores WHERE id = ?',
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'Registro no encontrado' });
    }

    res.json({ status: 'ok', data: rows[0] });
  } catch (error) {
    console.error('Error en GET /crud-tablas/usuariosinstaladores/:id:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/usuariosinstaladores', async (req, res) => {
  const { nombre, rol, grupo_instaladores, telefono, activo } = req.body;

  if (!nombre || !rol || !grupo_instaladores) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan campos requeridos: nombre, rol, grupo_instaladores',
    });
  }

  if (!GRUPOS_INSTALADOR.includes(grupo_instaladores)) {
    return res.status(400).json({
      status: 'error',
      message: `Grupo invalido. Validos: ${GRUPOS_INSTALADOR.join(', ')}`,
    });
  }

  try {
    const valorActivo = activo === 0 ? 0 : 1;
    const [result] = await poolAlmacen.query(
      'INSERT INTO usuariosinstaladores (nombre, rol, grupo_instaladores, telefono, activo) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), rol.trim(), grupo_instaladores, telefono || null, valorActivo],
    );

    res.json({ status: 'ok', message: 'Registro creado', id: result.insertId });
  } catch (error) {
    console.error('Error en POST /crud-tablas/usuariosinstaladores:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.put('/usuariosinstaladores/:id', async (req, res) => {
  const { nombre, rol, grupo_instaladores, telefono, activo } = req.body;

  if (!nombre || !rol || !grupo_instaladores) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan campos requeridos: nombre, rol, grupo_instaladores',
    });
  }

  if (!GRUPOS_INSTALADOR.includes(grupo_instaladores)) {
    return res.status(400).json({
      status: 'error',
      message: `Grupo invalido. Validos: ${GRUPOS_INSTALADOR.join(', ')}`,
    });
  }

  try {
    const valorActivo = activo === 0 ? 0 : 1;
    const [result] = await poolAlmacen.query(
      'UPDATE usuariosinstaladores SET nombre=?, rol=?, grupo_instaladores=?, telefono=?, activo=? WHERE id=?',
      [nombre.trim(), rol.trim(), grupo_instaladores, telefono || null, valorActivo, req.params.id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ status: 'error', message: 'Registro no encontrado' });
    }

    res.json({ status: 'ok', message: 'Registro actualizado' });
  } catch (error) {
    console.error('Error en PUT /crud-tablas/usuariosinstaladores/:id:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.delete('/usuariosinstaladores/:id', async (req, res) => {
  try {
    const [result] = await poolAlmacen.query('DELETE FROM usuariosinstaladores WHERE id=?', [req.params.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ status: 'error', message: 'Registro no encontrado' });
    }

    res.json({ status: 'ok', message: 'Registro eliminado' });
  } catch (error) {
    console.error('Error en DELETE /crud-tablas/usuariosinstaladores/:id:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/tf-usuarios', async (req, res) => {
  try {
    const { buscar, rol, activo } = req.query;
    let query = 'SELECT id, nombre, username, rol, activo FROM tf_usuarios WHERE 1=1';
    const params = [];

    if (buscar && String(buscar).trim()) {
      query += ' AND (nombre LIKE ? OR username LIKE ?)';
      const value = `%${String(buscar).trim()}%`;
      params.push(value, value);
    }
    if (rol && String(rol).trim()) {
      query += ' AND rol = ?';
      params.push(String(rol).trim());
    }
    if (activo === '0' || activo === '1') {
      query += ' AND activo = ?';
      params.push(Number(activo));
    }

    query += ' ORDER BY nombre ASC';

    const [rows] = await poolAlmacen.query(query, params);
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('Error en GET /crud-tablas/tf-usuarios:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/tf-usuarios/:id', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query(
      'SELECT id, nombre, username, rol, activo FROM tf_usuarios WHERE id = ?',
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'Registro no encontrado' });
    }

    res.json({ status: 'ok', data: rows[0] });
  } catch (error) {
    console.error('Error en GET /crud-tablas/tf-usuarios/:id:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/tf-usuarios', async (req, res) => {
  const { nombre, username, password, rol, activo } = req.body;

  if (!nombre || !username || !password || !rol) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan campos requeridos: nombre, username, password, rol',
    });
  }

  if (!ROLES_TF.includes(rol)) {
    return res.status(400).json({
      status: 'error',
      message: `Rol invalido. Validos: ${ROLES_TF.join(', ')}`,
    });
  }

  try {
    const valorActivo = activo === 0 ? 0 : 1;
    const [result] = await poolAlmacen.query(
      'INSERT INTO tf_usuarios (nombre, username, password, rol, activo) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), username.trim(), password, rol, valorActivo],
    );

    res.json({ status: 'ok', message: 'Usuario creado', id: result.insertId });
  } catch (error) {
    console.error('Error en POST /crud-tablas/tf-usuarios:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'El username ya existe' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.put('/tf-usuarios/:id', async (req, res) => {
  const { nombre, username, password, rol, activo } = req.body;

  if (!nombre || !username || !rol) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan campos requeridos: nombre, username, rol',
    });
  }

  if (!ROLES_TF.includes(rol)) {
    return res.status(400).json({
      status: 'error',
      message: `Rol invalido. Validos: ${ROLES_TF.join(', ')}`,
    });
  }

  try {
    const valorActivo = activo === 0 ? 0 : 1;
    if (password && String(password).trim()) {
      const [result] = await poolAlmacen.query(
        'UPDATE tf_usuarios SET nombre=?, username=?, password=?, rol=?, activo=? WHERE id=?',
        [nombre.trim(), username.trim(), password, rol, valorActivo, req.params.id],
      );
      if (!result.affectedRows) {
        return res.status(404).json({ status: 'error', message: 'Registro no encontrado' });
      }
    } else {
      const [result] = await poolAlmacen.query(
        'UPDATE tf_usuarios SET nombre=?, username=?, rol=?, activo=? WHERE id=?',
        [nombre.trim(), username.trim(), rol, valorActivo, req.params.id],
      );
      if (!result.affectedRows) {
        return res.status(404).json({ status: 'error', message: 'Registro no encontrado' });
      }
    }

    res.json({ status: 'ok', message: 'Usuario actualizado' });
  } catch (error) {
    console.error('Error en PUT /crud-tablas/tf-usuarios/:id:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'El username ya existe' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.delete('/tf-usuarios/:id', async (req, res) => {
  try {
    const [result] = await poolAlmacen.query('DELETE FROM tf_usuarios WHERE id=?', [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ status: 'error', message: 'Registro no encontrado' });
    }

    res.json({ status: 'ok', message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error en DELETE /crud-tablas/tf-usuarios/:id:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
