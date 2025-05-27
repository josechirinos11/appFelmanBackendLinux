require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errors } = require('celebrate');
const authRoutes = require('./routes/auth.routes');

const errorHandler = require('./middleware/errorHandler');
const testRouter = require('./routes/test.router');
const webhookRoutes = require('./routes/webhook.routes');
const controlPedidoRoutes = require('./routes/controlPedido.routes.js'); // Asegúrate de importar controlPedidoRoutes
const controlAccessRoutes = require('./routes/controlAccess.routes.js'); // Asegúrate de importar controlPedidoRoutes

const app = express();

// Middleware
// ① Habilita CORS para que tu app nativa pueda llamar al API
app.use(cors({
  origin: '*'            // en producción define aquí el dominio de tu app
}));
app.use(express.json());

// Rutas
app.use('/webhook', webhookRoutes);// Rutas para el webhook
app.use('/test', testRouter);

app.use('/auth', authRoutes);
app.use('/control-pedido', controlPedidoRoutes); // Asegúrate de importar controlPedidoRoutes


app.use('/control-access', controlAccessRoutes); // Asegúrate de importar controlPedidoRoutes

// Manejo de errores
app.use(errors());
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Permite conexiones desde cualquier IP

app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});