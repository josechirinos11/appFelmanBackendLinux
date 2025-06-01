require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errors } = require('celebrate');
const authRoutes = require('./routes/auth.routes');
const errorHandler = require('./middleware/errorHandler');
const testRouter = require('./routes/test.router');
const webhookRoutes = require('./routes/webhook.routes');
const controlPedidoRoutes = require('./routes/controlPedido.routes.js');
const controlAccessRoutes = require('./routes/controlAccess.routes.js');
const openaiRoutes = require('./routes/openai.routes.js'); // Importamos las rutas de OpenAI

const app = express();

// Middleware
// ① Habilita CORS para que tu app nativa pueda llamar al API
app.use(cors({
  origin: '*'            // en producción define aquí el dominio de tu app
}));

// Middleware de debugging para JSON malformado
app.use((req, res, next) => {
  if (req.method === 'POST' && req.url.includes('/openai/')) {
    console.log('🔍 DEBUG JSON MIDDLEWARE:');
    console.log(`   URL: ${req.url}`);
    console.log(`   Content-Type: ${req.headers['content-type']}`);
    console.log(`   Content-Length: ${req.headers['content-length']}`);
  }
  next();
});

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      if (req.url.includes('/openai/')) {
        console.log(`📦 Raw body length: ${buf.length}`);
        console.log(`📝 Raw body preview: ${buf.toString().substring(0, 100)}...`);
        
        // Verificar si hay caracteres problemáticos en posición 77
        if (buf.length > 77) {
          console.log(`🎯 Carácter en posición 77: "${buf.toString()[77]}" (código: ${buf.toString().charCodeAt(77)})`);
        }
      }
    } catch (e) {
      console.log(`❌ Error en verify: ${e.message}`);
    }
  }
}));

// Rutas
app.use('/webhook', webhookRoutes);// Rutas para el webhook
app.use('/test', testRouter);
app.use('/auth', authRoutes);
app.use('/control-pedido', controlPedidoRoutes);
app.use('/control-access', controlAccessRoutes);
app.use('/openai', openaiRoutes); // Registramos las rutas de OpenAI

// Manejo de errores
app.use(errors());
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Permite conexiones desde cualquier IP

app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});