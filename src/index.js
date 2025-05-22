require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errors } = require('celebrate');
const authRoutes = require('./routes/auth.routes');
const clientesRoutes = require('./routes/clientes.routes');
const testRoutes = require('./routes/test.routes');
const errorHandler = require('./middleware/errorHandler');
const testRouter = require('./routes/test.router');


const app = express();

// Middleware
// ① Habilita CORS para que tu app nativa pueda llamar al API
app.use(cors({
  origin: '*'            // en producción define aquí el dominio de tu app
}));
app.use(express.json());

// Rutas
app.use('/auth', authRoutes);
app.use('/clientes', clientesRoutes);

// Manejo de errores
app.use(errors());
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
}); 