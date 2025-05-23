const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const router = express.Router();

// Endpoint para recibir el webhook y desplegar
router.post('/webhook', (req, res) => {
  // Opcional: puedes validar el origen del webhook aquí
  res.status(200).json({ message: 'Despliegue iniciado' });

  // Ejecutar el script de despliegue
  const deployScript = path.resolve(__dirname, '../../deploy.sh');
  exec(`bash ${deployScript}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al ejecutar deploy.sh: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);
  });
});

module.exports = router;
