const express = require('express');
const { celebrate, Joi, Segments } = require('celebrate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// Validación de registro
const registerValidation = celebrate({
  body: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().min(6).required(),
   
  })
});

// Validación de login


const loginValidation = celebrate({
  [Segments.BODY]: Joi.object().keys({
    nombre: Joi.string().required(),
    // Si quieres permitir que password venga vacío (""), usa allow():
    password: Joi.string().allow('').required()
  })
});

// Registro de usuario
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    

    const [result] = await pool.execute(
      'INSERT INTO usuario_app_felman (nombre, contraseña) VALUES (?, ?, ?)',
      [username, password]
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
  console.log('EN autenticación');
  console.log('req.body', req.body);
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
      { userId: user.id, nombre: user.nombre, role: user.rol },
      process.env.JWT_SECRET
    );

 //  Removemos la contraseña antes de enviar el usuario
    const { contraseña, ...userSinPassword } = user;
       //  Respondemos con token y datos de usuario
    return res.json({
      token,
      user: userSinPassword
    });


  } catch (error) {
    next(error);
  }
});

module.exports = router;