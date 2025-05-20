const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Proteger todas las rutas de clientes
router.use(authMiddleware);

// Obtener todos los clientes
router.get('/', async (req, res, next) => {
  try {
    const [clientes] = await pool.execute('SELECT * FROM clientes');
    res.json(clientes);
  } catch (error) {
    next(error);
  }
});

// Obtener un cliente por ID
router.get('/:id', async (req, res, next) => {
  try {
    const [clientes] = await pool.execute(
      'SELECT * FROM clientes WHERE id = ?',
      [req.params.id]
    );

    if (clientes.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    res.json(clientes[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 