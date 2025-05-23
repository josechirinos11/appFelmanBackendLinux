const express = require('express');
const { celebrate, Joi } = require('celebrate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// Validación de registro
const registerValidation = celebrate({
  body: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().min(6).required(),
    email: Joi.string().email().required()
  })
});

// Validación de login
const loginValidation = celebrate({
  body: Joi.object({
    nombre: Joi.string().required(),
   // password: Joi.string().required()
  })
});

// Registro de usuario
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const { username, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO usuarios (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email]
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      userId: result.insertId
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const { nombre, password } = req.body;

    // Buscar usuario por nombre
    const [users] = await pool.execute(
      'SELECT * FROM usuario_app_felman WHERE nombre = ?',
      [nombre]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = users[0];
    // Verificar contraseña (en texto plano, si no está hasheada)
    if (password !== user.contraseña) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, nombre: user.nombre, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

module.exports = router;