
// src/routes/controlAlmacen.router.js
const express = require('express');
const poolAlmacen = require('../config/databaseAlamcen');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Ruta /inicio para verificar conexión
router.get('/inicio', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT NOW() AS fecha_servidor');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /inicio:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Rutas CRUD básicas para cada tabla (consultas SELECT simples)

// Ajustes
router.get('/ajustes', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM ajustes');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /ajustes:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.post('/ajustescrear', async (req, res) => {
  const { articulo_id, tipo_ajuste, cantidad, motivo, creado_por } = req.body;
  try {
    await poolAlmacen.query(
      'INSERT INTO ajustes (articulo_id, tipo_ajuste, cantidad, motivo, creado_por, actualizado_por) VALUES (?, ?, ?, ?, ?, ?)',
      [articulo_id, tipo_ajuste, cantidad, motivo, creado_por, creado_por]
    );
    res.json({ status: 'ok', message: 'Ajuste creado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.put('/ajustesactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { tipo_ajuste, cantidad, motivo, actualizado_por } = req.body;
  try {
    await poolAlmacen.query(
      'UPDATE ajustes SET tipo_ajuste=?, cantidad=?, motivo=?, actualizado_por=? WHERE id=?',
      [tipo_ajuste, cantidad, motivo, actualizado_por, id]
    );
    res.json({ status: 'ok', message: 'Ajuste actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.delete('/ajusteseliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolAlmacen.query('DELETE FROM ajustes WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Ajuste eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Rutas CRUD para tabla Artículos
router.get('/articulos', async (req, res) => {
    const [rows] = await poolAlmacen.query('SELECT * FROM articulos');
    res.json({ status: 'ok', data: rows });
  });
  
  router.post('/articuloscrear', async (req, res) => {
    const { sku, nombre, descripcion, categoria_id, ubicacion_id, precio_costo, precio_venta, stock_minimo, stock_maximo, creado_por } = req.body;
    await poolAlmacen.query('INSERT INTO articulos (sku, nombre, descripcion, categoria_id, ubicacion_id, precio_costo, precio_venta, stock_minimo, stock_maximo, creado_por, actualizado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [sku, nombre, descripcion, categoria_id, ubicacion_id, precio_costo, precio_venta, stock_minimo, stock_maximo, creado_por, creado_por]);
    res.json({ status: 'ok', message: 'Artículo creado correctamente' });
  });
  
  router.put('/articulosactualizar/:id', async (req, res) => {
    console.log(`[${new Date().toISOString()}] PUT /articulosactualizar/${req.params.id} - Body:`, req.body);
    const { id } = req.params;
    const { nombre, descripcion, precio_costo, precio_venta, stock_minimo, stock_maximo, actualizado_por } = req.body;
    await poolAlmacen.query('UPDATE articulos SET nombre=?, descripcion=?, precio_costo=?, precio_venta=?, stock_minimo=?, stock_maximo=?, actualizado_por=? WHERE id=?', [nombre, descripcion, precio_costo, precio_venta, stock_minimo, stock_maximo, actualizado_por, id]);
    res.json({ status: 'ok', message: 'Artículo actualizado correctamente' });
  });
  
  router.delete('/articuloseliminar/:id', async (req, res) => {
    const { id } = req.params;
    await poolAlmacen.query('DELETE FROM articulos WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Artículo eliminado correctamente' });
  });
  

// Categorías
router.get('/categorias', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM categorias');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /categorias:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.post('/categoriascrear', async (req, res) => {
  const { nombre, descripcion, creado_por } = req.body;
  try {
    await poolAlmacen.query(
      'INSERT INTO categorias (nombre, descripcion, creado_por, actualizado_por) VALUES (?, ?, ?, ?)',
      [nombre, descripcion, creado_por, creado_por]
    );
    res.json({ status: 'ok', message: 'Categoría creada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.put('/categoriasactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, actualizado_por } = req.body;
  try {
    await poolAlmacen.query(
      'UPDATE categorias SET nombre=?, descripcion=?, actualizado_por=? WHERE id=?',
      [nombre, descripcion, actualizado_por, id]
    );
    res.json({ status: 'ok', message: 'Categoría actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.delete('/categoriaseliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolAlmacen.query('DELETE FROM categorias WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Categoría eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Configuraciones
router.get('/configuraciones', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM configuraciones');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /configuraciones:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.post('/configuracionescrear', async (req, res) => {
  const { clave, valor, descripcion, creado_por } = req.body;
  try {
    await poolAlmacen.query(
      'INSERT INTO configuraciones (clave, valor, descripcion, creado_por, actualizado_por) VALUES (?, ?, ?, ?, ?)',
      [clave, valor, descripcion, creado_por, creado_por]
    );
    res.json({ status: 'ok', message: 'Configuración creada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.put('/configuracionesactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { clave, valor, descripcion, actualizado_por } = req.body;
  try {
    await poolAlmacen.query(
      'UPDATE configuraciones SET clave=?, valor=?, descripcion=?, actualizado_por=? WHERE id=?',
      [clave, valor, descripcion, actualizado_por, id]
    );
    res.json({ status: 'ok', message: 'Configuración actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.delete('/configuracioneseliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolAlmacen.query('DELETE FROM configuraciones WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Configuración eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Entradas
router.get('/entradas', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM entradas');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /entradas:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.post('/entradascrear', async (req, res) => {
  const { articulo_id, cantidad, referencia, creado_por } = req.body;
  try {
    await poolAlmacen.query(
      'INSERT INTO entradas (articulo_id, cantidad, referencia, creado_por, actualizado_por) VALUES (?, ?, ?, ?, ?)',
      [articulo_id, cantidad, referencia, creado_por, creado_por]
    );
    res.json({ status: 'ok', message: 'Entrada creada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.put('/entradasactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { cantidad, referencia, actualizado_por } = req.body;
  try {
    await poolAlmacen.query(
      'UPDATE entradas SET cantidad=?, referencia=?, actualizado_por=? WHERE id=?',
      [cantidad, referencia, actualizado_por, id]
    );
    res.json({ status: 'ok', message: 'Entrada actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.delete('/entradaseliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolAlmacen.query('DELETE FROM entradas WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Entrada eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Pedido Items
router.get('/pedido_items', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM pedido_items');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /pedido_items:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.post('/pedido_itemscrear', async (req, res) => {
  const { pedido_id, articulo_id, cantidad, precio_unitario, creado_por } = req.body;
  try {
    await poolAlmacen.query(
      'INSERT INTO pedido_items (pedido_id, articulo_id, cantidad, precio_unitario, creado_por) VALUES (?, ?, ?, ?, ?)',
      [pedido_id, articulo_id, cantidad, precio_unitario, creado_por]
    );
    res.json({ status: 'ok', message: 'Item de pedido creado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.put('/pedido_itemsactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { cantidad, precio_unitario } = req.body;
  try {
    await poolAlmacen.query(
      'UPDATE pedido_items SET cantidad=?, precio_unitario=? WHERE id=?',
      [cantidad, precio_unitario, id]
    );
    res.json({ status: 'ok', message: 'Item de pedido actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.delete('/pedido_itemseliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolAlmacen.query('DELETE FROM pedido_items WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Item de pedido eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Pedidos
router.get('/pedidos', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM pedidos');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /pedidos:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.post('/pedidoscrear', async (req, res) => {
  const { numero_presupuesto, fecha_pedido, estado, total_estimate, cliente, creado_por } = req.body;
  try {
    await poolAlmacen.query(
      'INSERT INTO pedidos (numero_presupuesto, fecha_pedido, estado, total_estimate, cliente, creado_por, actualizado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [numero_presupuesto, fecha_pedido, estado, total_estimate, cliente, creado_por, creado_por]
    );
    res.json({ status: 'ok', message: 'Pedido creado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.put('/pedidosactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { numero_presupuesto, fecha_pedido, estado, total_estimate, cliente, actualizado_por } = req.body;
  try {
    await poolAlmacen.query(
      'UPDATE pedidos SET numero_presupuesto=?, fecha_pedido=?, estado=?, total_estimate=?, cliente=?, actualizado_por=? WHERE id=?',
      [numero_presupuesto, fecha_pedido, estado, total_estimate, cliente, actualizado_por, id]
    );
    res.json({ status: 'ok', message: 'Pedido actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.delete('/pedidoseliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolAlmacen.query('DELETE FROM pedidos WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Pedido eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Salidas
router.get('/salidas', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM salidas');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /salidas:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.post('/salidascrear', async (req, res) => {
  const { articulo_id, cantidad, motivo, referencia, creado_por } = req.body;
  try {
    await poolAlmacen.query(
      'INSERT INTO salidas (articulo_id, cantidad, motivo, referencia, creado_por, actualizado_por) VALUES (?, ?, ?, ?, ?, ?)',
      [articulo_id, cantidad, motivo, referencia, creado_por, creado_por]
    );
    res.json({ status: 'ok', message: 'Salida creada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.put('/salidasactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { cantidad, motivo, referencia, actualizado_por } = req.body;
  try {
    await poolAlmacen.query(
      'UPDATE salidas SET cantidad=?, motivo=?, referencia=?, actualizado_por=? WHERE id=?',
      [cantidad, motivo, referencia, actualizado_por, id]
    );
    res.json({ status: 'ok', message: 'Salida actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.delete('/salidaseliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolAlmacen.query('DELETE FROM salidas WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Salida eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Transferencias
router.get('/transferencias', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM transferencias');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /transferencias:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.post('/transferenciascrear', async (req, res) => {
  const { articulo_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, referencia, creado_por } = req.body;
  try {
    await poolAlmacen.query(
      'INSERT INTO transferencias (articulo_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, referencia, creado_por, actualizado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [articulo_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, referencia, creado_por, creado_por]
    );
    res.json({ status: 'ok', message: 'Transferencia creada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.put('/transferenciasactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { ubicacion_origen_id, ubicacion_destino_id, cantidad, referencia, actualizado_por } = req.body;
  try {
    await poolAlmacen.query(
      'UPDATE transferencias SET ubicacion_origen_id=?, ubicacion_destino_id=?, cantidad=?, referencia=?, actualizado_por=? WHERE id=?',
      [ubicacion_origen_id, ubicacion_destino_id, cantidad, referencia, actualizado_por, id]
    );
    res.json({ status: 'ok', message: 'Transferencia actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.delete('/transferenciaseliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolAlmacen.query('DELETE FROM transferencias WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Transferencia eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Ubicaciones
router.get('/ubicaciones', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM ubicaciones');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /ubicaciones:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.post('/ubicacionescrear', async (req, res) => {
  const { nombre, descripcion, creado_por } = req.body;
  try {
    await poolAlmacen.query(
      'INSERT INTO ubicaciones (nombre, descripcion, creado_por, actualizado_por) VALUES (?, ?, ?, ?)',
      [nombre, descripcion, creado_por, creado_por]
    );
    res.json({ status: 'ok', message: 'Ubicación creada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.put('/ubicacionesactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, actualizado_por } = req.body;
  try {
    await poolAlmacen.query(
      'UPDATE ubicaciones SET nombre=?, descripcion=?, actualizado_por=? WHERE id=?',
      [nombre, descripcion, actualizado_por, id]
    );
    res.json({ status: 'ok', message: 'Ubicación actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.delete('/ubicacioneseliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolAlmacen.query('DELETE FROM ubicaciones WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Ubicación eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Usuarios
router.get('/usuarios', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM usuarios');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /usuarios:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.post('/usuarioscrear', async (req, res) => {
  const { username, nombre, password_hash, rol, creado_por } = req.body;
  try {
    await poolAlmacen.query(
      'INSERT INTO usuarios (username, nombre, password_hash, rol, creado_por, actualizado_por) VALUES (?, ?, ?, ?, ?, ?)',
      [username, nombre, password_hash, rol, creado_por, creado_por]
    );
    res.json({ status: 'ok', message: 'Usuario creado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.put('/usuariosactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, password_hash, rol, actualizado_por } = req.body;
  try {
    await poolAlmacen.query(
      'UPDATE usuarios SET nombre=?, password_hash=?, rol=?, actualizado_por=? WHERE id=?',
      [nombre, password_hash, rol, actualizado_por, id]
    );
    res.json({ status: 'ok', message: 'Usuario actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});
router.delete('/usuarioseliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolAlmacen.query('DELETE FROM usuarios WHERE id=?', [id]);
    res.json({ status: 'ok', message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});








// Lee reportes con filtro de fechas (>= from y < to+1día)


// Lee reportes con filtro de fechas (>= from y < to+1día)


// Lee reportes con filtro de fechas (>= from y < to+1día)


// Lee reportes con filtro de fechas (>= from y < to+1día)


// Lee reportes con filtro de fechas (>= from y < to+1día)


// Lee reportes con filtro de fechas (>= from y < to+1día)





router.get('/control-instaladores/read-reportes', async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /control-instaladores/read-reportes - Query:`, req.query);
  try {
    const { from, to } = req.query;

    const isYmd = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

    // "Hoy" según MySQL (evita UTC/zonas horarias del server Node)
    const [todayRows] = await poolAlmacen.query(`SELECT CURDATE() AS today`);
    const today = todayRows[0].today; // normalmente 'YYYY-MM-DD' o Date

    const toYmd = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d));

    const toDate = isYmd(to) ? to : toYmd(today);

    // Default: 7 días atrás desde MySQL (coherente con CURDATE)
    const fromDate = isYmd(from)
      ? from
      : (await (async () => {
          const [r] = await poolAlmacen.query(`SELECT DATE_SUB(CURDATE(), INTERVAL 7 DAY) AS fromDate`);
          return toYmd(r[0].fromDate);
        })());

    // Hasta exclusivo = toDate + 1 día (en MySQL)
    const [toExRows] = await poolAlmacen.query(
      `SELECT DATE_ADD(?, INTERVAL 1 DAY) AS toExclusive`,
      [toDate]
    );
    const toExclusive = toYmd(toExRows[0].toExclusive);

    const sql = `
      SELECT
        id,
        equipo_montador,
        DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
        hora_inicio,
        hora_fin,
        hora_modal_final,
        nombre_instalador,
        obra,
        cliente,
        direccion,
        tipo_trabajo,
        descripcion,
        status,
        incidencia,
        geo_lat,
        geo_lng,
        geo_address,
        unidades
      FROM reportes
      WHERE fecha >= ? AND fecha < ?
      ORDER BY fecha DESC, id DESC
    `;

    const [rows] = await poolAlmacen.query(sql, [fromDate, toExclusive]);
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en read-reportes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      detail: error.message
    });
  }
});










// Crea un reporte
router.post('/control-instaladores/create-reportes', async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /control-instaladores/create-reportes - Body:`, req.body);
  try {

    let {
      equipo_montador,
      fecha,
      hora_inicio,
      hora_fin,
      hora_modal_final,
      nombre_instalador,
      obra,
      cliente,
      direccion,
      tipo_trabajo,
      descripcion,
      status,
      incidencia,
      geo_lat,
      geo_lng,
      geo_address,
      unidades
    } = req.body || {};

    // Convertir cadenas vacías a null para los campos de hora
    hora_inicio = (hora_inicio === '' ? null : hora_inicio);
    hora_fin = (hora_fin === '' ? null : hora_fin);
    hora_modal_final = (hora_modal_final === '' ? null : hora_modal_final);

    // Validaciones mínimas (solo obligatorios: fecha, nombre_instalador, obra)
    if (!fecha || !nombre_instalador || !obra) {
      return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios: fecha, nombre_instalador y obra' });
    }

    const sql = `
      INSERT INTO reportes
      (equipo_montador, fecha, hora_inicio, hora_fin, hora_modal_final, nombre_instalador, obra, cliente, direccion, tipo_trabajo, descripcion, status, incidencia, geo_lat, geo_lng, geo_address, unidades)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;
    await poolAlmacen.query(sql, [
      equipo_montador ?? null,
      fecha,
      hora_inicio ?? null,
      hora_fin ?? null,
      hora_modal_final ?? null,
      nombre_instalador,
      obra,
      cliente ?? null,
      direccion,
      tipo_trabajo ?? null,
      descripcion ?? null,
      status,
      incidencia,
      geo_lat ?? null,
      geo_lng ?? null,
      geo_address ?? null,
      unidades ?? null
    ]);

    res.json({ status: 'ok', message: 'Reporte creado correctamente' });
  } catch (error) {
    console.error('❌ Error en create-reportes:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Actualiza un reporte
router.post('/control-instaladores/update-reportes', async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /control-instaladores/update-reportes - Body:`, req.body);
  try {
    const { id, ...fields } = req.body || {};
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Se requiere id' });
    }
    // No permitir actualizar el id
    delete fields.id;
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No hay campos para actualizar' });
    }
    // Construir SET dinámico
    const setClause = Object.keys(fields)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(fields);
    const sql = `UPDATE reportes SET ${setClause} WHERE id = ?`;
    await poolAlmacen.query(sql, [...values, id]);
    res.json({ status: 'ok', message: 'Reporte actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error en update-reportes:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Elimina un reporte
// Elimina un reporte
router.post('/control-instaladores/delete-reportes', async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /control-instaladores/delete-reportes - Body:`, req.body);
  try {
    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Se requiere id' });
    }
    await poolAlmacen.query('DELETE FROM reportes WHERE id = ?', [id]);
    res.json({ status: 'ok', message: 'Reporte eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error en delete-reportes:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});


// Obtener información de usuariosInstaladores
router.get('/control-instaladores/obtenerinformacionUsuario', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM usuariosInstaladores');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en obtenerinformacionUsuario:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});



// ═══════════════════════════════════════════════════════════════
//  MÓDULO TICKETS FELMAN
//  Tablas: tf_usuarios, tf_tickets, tf_ticket_historial
//  Prefijo: /control-almacen/tickets/*
//  IMPORTANTE: rutas estáticas ANTES de rutas con parámetros (:id)
// ═══════════════════════════════════════════════════════════════

// ── INIT: crear tablas si no existen ─────────────────────────
router.get('/tickets/init', async (req, res) => {
  try {
    await poolAlmacen.query(`
      CREATE TABLE IF NOT EXISTS tf_usuarios (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        nombre     VARCHAR(100) NOT NULL,
        username   VARCHAR(50)  NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        rol        ENUM('usuario','desarrollador') NOT NULL DEFAULT 'usuario',
        activo     TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await poolAlmacen.query(`
      CREATE TABLE IF NOT EXISTS tf_tickets (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        titulo            VARCHAR(200) NOT NULL,
        descripcion       TEXT NOT NULL,
        numero_referencia VARCHAR(100),
        tipo_referencia   ENUM('fabricacion','presupuesto','oferta') NOT NULL,
        estado            ENUM('abierto','procesando','pausado','terminado') NOT NULL DEFAULT 'abierto',
        prioridad         ENUM('baja','media','alta','urgente') NOT NULL DEFAULT 'media',
        imagen_path       VARCHAR(500),
        usuario_id        INT NOT NULL,
        desarrollador_id  INT,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await poolAlmacen.query(`
      CREATE TABLE IF NOT EXISTS tf_ticket_historial (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id       INT NOT NULL,
        usuario_id      INT NOT NULL,
        tipo            ENUM('creacion','cambio_estado','feedback','asignacion') NOT NULL,
        estado_anterior ENUM('abierto','procesando','pausado','terminado'),
        estado_nuevo    ENUM('abierto','procesando','pausado','terminado'),
        mensaje         TEXT,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Usuario admin por defecto si no existe
    const [admins] = await poolAlmacen.query(
      'SELECT id FROM tf_usuarios WHERE username = ?', ['admin']
    );
    if (admins.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await poolAlmacen.query(
        'INSERT INTO tf_usuarios (nombre, username, password, rol) VALUES (?, ?, ?, ?)',
        ['Administrador', 'admin', hash, 'desarrollador']
      );
    }

    res.json({ status: 'ok', message: 'Tablas de tickets inicializadas correctamente' });
  } catch (error) {
    console.error('❌ Error en /tickets/init:', error);
    res.status(500).json({ status: 'error', message: 'Error al inicializar tablas', detail: error.message });
  }
});

// ── DASHBOARD: conteo de tickets por estado ───────────────────
router.get('/tickets/dashboard', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query(`
      SELECT
        SUM(estado = 'abierto')    AS abierto,
        SUM(estado = 'procesando') AS procesando,
        SUM(estado = 'pausado')    AS pausado,
        SUM(estado = 'terminado')  AS terminado,
        COUNT(*)                   AS total
      FROM tf_tickets
    `);
    const d = rows[0];
    res.json({
      status: 'ok',
      data: {
        abierto:    Number(d.abierto    || 0),
        procesando: Number(d.procesando || 0),
        pausado:    Number(d.pausado    || 0),
        terminado:  Number(d.terminado  || 0),
        total:      Number(d.total      || 0),
      }
    });
  } catch (error) {
    console.error('❌ Error en /tickets/dashboard:', error);
    res.status(500).json({ status: 'error', message: 'Error interno', detail: error.message });
  }
});

// ── MIS TICKETS: tickets del usuario (query param: usuario_id) ─
router.get('/tickets/mis-tickets', async (req, res) => {
  const { usuario_id } = req.query;
  // Convertir a entero (MongoDB _id string → NaN → 0); si falta, usar 0
  const uid = parseInt(String(usuario_id ?? 0), 10);
  const uidSafe = isNaN(uid) ? 0 : uid;
  try {
    const [rows] = await poolAlmacen.query(`
      SELECT
        t.*,
        u.nombre AS usuario_nombre,
        d.nombre AS desarrollador_nombre
      FROM tf_tickets t
      LEFT JOIN tf_usuarios u ON t.usuario_id      = u.id
      LEFT JOIN tf_usuarios d ON t.desarrollador_id = d.id
      WHERE t.usuario_id = ?
      ORDER BY t.created_at DESC
    `, [uidSafe]);
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /tickets/mis-tickets:', error);
    res.status(500).json({ status: 'error', message: 'Error interno', detail: error.message });
  }
});

// ── TODOS LOS TICKETS: con filtros opcionales ─────────────────
// Query params opcionales: estado, prioridad
router.get('/tickets/todos', async (req, res) => {
  const { estado, prioridad } = req.query;
  try {
    let sql = `
      SELECT
        t.*,
        u.nombre AS usuario_nombre,
        d.nombre AS desarrollador_nombre
      FROM tf_tickets t
      LEFT JOIN tf_usuarios u ON t.usuario_id      = u.id
      LEFT JOIN tf_usuarios d ON t.desarrollador_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (estado)    { sql += ' AND t.estado = ?';    params.push(estado); }
    if (prioridad) { sql += ' AND t.prioridad = ?'; params.push(prioridad); }
    sql += ' ORDER BY t.created_at DESC';

    const [rows] = await poolAlmacen.query(sql, params);
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /tickets/todos:', error);
    res.status(500).json({ status: 'error', message: 'Error interno', detail: error.message });
  }
});

// ── USUARIOS DE TICKETS: listado ──────────────────────────────
// IMPORTANTE: debe estar ANTES de GET /tickets/:id
router.get('/tickets/usuarios', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query(
      'SELECT id, nombre, username, rol, activo, created_at FROM tf_usuarios ORDER BY nombre ASC'
    );
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /tickets/usuarios:', error);
    res.status(500).json({ status: 'error', message: 'Error interno', detail: error.message });
  }
});

// ── CREAR USUARIO DE TICKETS ──────────────────────────────────
router.post('/tickets/usuarioscrear', async (req, res) => {
  const { nombre, username, password, rol } = req.body;
  if (!nombre || !username || !password) {
    return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios: nombre, username, password' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await poolAlmacen.query(
      'INSERT INTO tf_usuarios (nombre, username, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, username, hash, rol || 'usuario']
    );
    res.json({ status: 'ok', message: 'Usuario creado correctamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'El nombre de usuario ya existe' });
    }
    console.error('❌ Error en /tickets/usuarioscrear:', error);
    res.status(500).json({ status: 'error', message: 'Error interno', detail: error.message });
  }
});

// ── ACTUALIZAR USUARIO DE TICKETS ─────────────────────────────
router.put('/tickets/usuariosactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, username, password, rol, activo } = req.body;
  try {
    const sets = [];
    const params = [];
    if (nombre   !== undefined) { sets.push('nombre   = ?'); params.push(nombre); }
    if (username !== undefined) { sets.push('username = ?'); params.push(username); }
    if (rol      !== undefined) { sets.push('rol      = ?'); params.push(rol); }
    if (activo   !== undefined) { sets.push('activo   = ?'); params.push(activo); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      sets.push('password = ?');
      params.push(hash);
    }
    if (sets.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No hay campos para actualizar' });
    }
    sets.push('updated_at = NOW()');
    params.push(id);
    await poolAlmacen.query(`UPDATE tf_usuarios SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ status: 'ok', message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error en /tickets/usuariosactualizar/:id:', error);
    res.status(500).json({ status: 'error', message: 'Error interno', detail: error.message });
  }
});

// ── CREAR TICKET ──────────────────────────────────────────────
// Body: titulo, descripcion, tipo_referencia, numero_referencia?, prioridad?, usuario_id
router.post('/tickets/crear', async (req, res) => {
  console.log(`[TICKETS] POST /tickets/crear - content-type: ${req.headers['content-type']} - body:`, JSON.stringify(req.body));
  const { titulo, descripcion, tipo_referencia, numero_referencia, prioridad, usuario_id } = req.body;
  // usuario_id puede ser 0 (usuario Lambda/MongoDB) — solo validar texto obligatorio
  if (!titulo || !descripcion || !tipo_referencia) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan campos obligatorios: titulo, descripcion, tipo_referencia'
    });
  }
  // Convertir usuario_id a entero seguro (string MongoDB _id → 0)
  const usuarioIdInt = parseInt(String(usuario_id ?? 0), 10);
  const uid = isNaN(usuarioIdInt) ? 0 : usuarioIdInt;
  try {
    const [result] = await poolAlmacen.query(
      `INSERT INTO tf_tickets
         (titulo, descripcion, tipo_referencia, numero_referencia, prioridad, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [titulo, descripcion, tipo_referencia, numero_referencia || null, prioridad || 'media', uid]
    );
    const ticketId = result.insertId;

    // Registro inicial en historial
    await poolAlmacen.query(
      `INSERT INTO tf_ticket_historial
         (ticket_id, usuario_id, tipo, estado_nuevo, mensaje)
       VALUES (?, ?, 'creacion', 'abierto', 'Ticket creado')`,
      [ticketId, uid]
    );

    res.json({ status: 'ok', message: 'Ticket creado correctamente', data: { id: ticketId } });
  } catch (error) {
    console.error('❌ Error en /tickets/crear:', error);
    res.status(500).json({ status: 'error', message: 'Error interno', detail: error.message });
  }
});

// ── CAMBIAR ESTADO DE UN TICKET ───────────────────────────────
// Body: estado, feedback?, usuario_id
router.put('/tickets/estadoactualizar/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, feedback, usuario_id } = req.body;
  if (!estado) {
    return res.status(400).json({ status: 'error', message: 'Se requiere estado' });
  }
  const uid = parseInt(String(usuario_id ?? 0), 10) || 0;
  try {
    const [tickets] = await poolAlmacen.query(
      'SELECT estado FROM tf_tickets WHERE id = ?', [id]
    );
    if (tickets.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Ticket no encontrado' });
    }
    const estadoAnterior = tickets[0].estado;

    await poolAlmacen.query(
      'UPDATE tf_tickets SET estado = ?, desarrollador_id = ?, updated_at = NOW() WHERE id = ?',
      [estado, uid, id]
    );

    await poolAlmacen.query(
      `INSERT INTO tf_ticket_historial
         (ticket_id, usuario_id, tipo, estado_anterior, estado_nuevo, mensaje)
       VALUES (?, ?, 'cambio_estado', ?, ?, ?)`,
      [id, uid, estadoAnterior, estado, feedback || null]
    );

    res.json({ status: 'ok', message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error en /tickets/estadoactualizar/:id:', error);
    res.status(500).json({ status: 'error', message: 'Error interno', detail: error.message });
  }
});

// ── AGREGAR FEEDBACK / COMENTARIO ────────────────────────────
// Body: mensaje, usuario_id
router.post('/tickets/feedbackcrear/:id', async (req, res) => {
  const { id } = req.params;
  const { mensaje, usuario_id } = req.body;
  if (!mensaje) {
    return res.status(400).json({ status: 'error', message: 'Se requiere mensaje' });
  }
  const uid = parseInt(String(usuario_id ?? 0), 10) || 0;
  try {
    await poolAlmacen.query(
      `INSERT INTO tf_ticket_historial
         (ticket_id, usuario_id, tipo, mensaje)
       VALUES (?, ?, 'feedback', ?)`,
      [id, uid, mensaje]
    );
    res.json({ status: 'ok', message: 'Comentario agregado correctamente' });
  } catch (error) {
    console.error('❌ Error en /tickets/feedbackcrear/:id:', error);
    res.status(500).json({ status: 'error', message: 'Error interno', detail: error.message });
  }
});

// ── DETALLE DE UN TICKET (con historial) ─────────────────────
// IMPORTANTE: debe estar al FINAL entre las rutas GET /tickets/*
// para no capturar antes: dashboard, mis-tickets, todos, usuarios
router.get('/tickets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [tickets] = await poolAlmacen.query(`
      SELECT
        t.*,
        u.nombre AS usuario_nombre,
        d.nombre AS desarrollador_nombre
      FROM tf_tickets t
      LEFT JOIN tf_usuarios u ON t.usuario_id      = u.id
      LEFT JOIN tf_usuarios d ON t.desarrollador_id = d.id
      WHERE t.id = ?
    `, [id]);

    if (tickets.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Ticket no encontrado' });
    }

    const [historial] = await poolAlmacen.query(`
      SELECT h.*, u.nombre AS usuario_nombre
      FROM tf_ticket_historial h
      LEFT JOIN tf_usuarios u ON h.usuario_id = u.id
      WHERE h.ticket_id = ?
      ORDER BY h.created_at ASC
    `, [id]);

    res.json({ status: 'ok', data: { ...tickets[0], historial } });
  } catch (error) {
    console.error('❌ Error en /tickets/:id:', error);
    res.status(500).json({ status: 'error', message: 'Error interno', detail: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  FIN MÓDULO TICKETS
// ═══════════════════════════════════════════════════════════════

// Handler 404 para rutas no encontradas
router.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Ruta no encontrada' });
});

// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('❌ Error en control-almacén:', err);
  res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: err.message });
});





module.exports = router;
