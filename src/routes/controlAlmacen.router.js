// src/routes/controlAlmacen.router.js
const express = require('express');
const poolAlmacen = require('../config/databaseAlamcen');
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

    // Construcción de rango: desde inclusivo, hasta exclusivo (día siguiente)
    // Si no vienen, se fija una semana atrás hasta hoy.
    const fromDate = from && /^\d{4}-\d{2}-\d{2}$/.test(from)
      ? from
      : new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    let toDate = to && /^\d{4}-\d{2}-\d{2}$/.test(to)
      ? to
      : new Date().toISOString().slice(0, 10);

    // endExclusive = toDate + 1 día
    const endExclusive = new Date(toDate);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const toExclusive = endExclusive.toISOString().slice(0, 10);

    const sql = `
      SELECT
        id,
        fecha,
        nombre_instalador,
        obra,
        direccion,
        descripcion,
        status,
        incidencia,
        geo_lat,
        geo_lng,
        geo_address,
        TIME_FORMAT(hora_modal, '%H:%i:%s') AS hora_modal
      FROM reportes
      WHERE fecha >= ? AND fecha < ?
      ORDER BY fecha DESC, id DESC
    `;
    const [rows] = await poolAlmacen.query(sql, [fromDate, toExclusive]);
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en read-reportes:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Crea un reporte
router.post('/control-instaladores/create-reportes', async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /control-instaladores/create-reportes - Body:`, req.body);
  try {
    const {
      fecha,
      nombre_instalador,
      obra,
      direccion,
      descripcion,
      status,
      incidencia,
      geo_lat,
      geo_lng,
      geo_address,
      hora_modal
    } = req.body || {};

    // Validaciones mínimas
    if (!fecha || !nombre_instalador || !obra || !direccion || !status || !incidencia) {
      return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios' });
    }

    const sql = `
      INSERT INTO reportes
      (fecha, nombre_instalador, obra, direccion, descripcion, status, incidencia,
       geo_lat, geo_lng, geo_address, hora_modal)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `;
    await poolAlmacen.query(sql, [
      fecha,
      nombre_instalador,
      obra,
      direccion,
      descripcion ?? null,
      status,
      incidencia,
      geo_lat ?? null,
      geo_lng ?? null,
      geo_address ?? null,
      hora_modal ?? null
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
    const {
      id,
      fecha,
      nombre_instalador,
      obra,
      direccion,
      descripcion,
      status,
      incidencia,
      geo_lat,
      geo_lng,
      geo_address,
      hora_modal
    } = req.body || {};

    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Se requiere id' });
    }

    const sql = `
      UPDATE reportes
      SET
        fecha = ?,
        nombre_instalador = ?,
        obra = ?,
        direccion = ?,
        descripcion = ?,
        status = ?,
        incidencia = ?,
        geo_lat = ?,
        geo_lng = ?,
        geo_address = ?,
        hora_modal = ?
      WHERE id = ?
    `;
    await poolAlmacen.query(sql, [
      fecha ?? null,
      nombre_instalador ?? null,
      obra ?? null,
      direccion ?? null,
      descripcion ?? null,
      status ?? null,
      incidencia ?? null,
      (geo_lat === undefined ? null : geo_lat),
      (geo_lng === undefined ? null : geo_lng),
      (geo_address === undefined ? null : geo_address),
      (hora_modal === undefined ? null : hora_modal),
      id
    ]);

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
