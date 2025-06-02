const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');


// Ruta para probar conexión al servidor Felman
router.get('/test-connection', (req, res) => {
  // Respondemos con un mensaje fijo
 res.json({ message: 'Conectado Servidor Felman' });
});

// Ruta para probar conexión al servidor Access
router.get('/test-access', async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.81:3001/api/test-access');
    const data = await response.text();
    res.json({ message: data });
  } catch (err) {
    console.error('Error consumiendo el proxy:', err);
    res.status(500).json({ error: err.message });
  }
});


router.post('/consulta', async (req, res, next) => {
  try {
    const { nombre, password } = req.body;

    // Verificar que se proporcionaron credenciales
    if (!nombre || !password) {
      return res.status(400).json({ message: 'Nombre y contraseña son requeridos' });
    }

    // Buscar usuario en la base de datos MySQL
    const [users] = await pool.query(
      'SELECT * FROM usuario_app_felman WHERE nombre = ?',
      [nombre]
    );

    // Verificar si el usuario existe
    if (users.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }    const user = users[0];

    // Verificar la contraseña directamente
    if (password !== user.contraseña) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: user.id,
        nombre: user.nombre,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Enviar respuesta exitosa
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
});
// Ruta pública de prueba
router.get('/usuarios', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verificar estructura de la tabla clientes
    const [columns] = await connection.query(`SELECT * FROM usuario_app_felman`);

    // Obtener los últimos 10 clientes creados
    const [clientes] = await connection.query(`SELECT * FROM usuario_app_felman`);

    connection.release();

    res.json({
      status: 'success',
      message: 'Conexión exitosa a la base de datos',
      data: {
         clientes
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;