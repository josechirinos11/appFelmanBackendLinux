const express = require("express");
const { exec } = require("child_process");
const path = require("path");

const router = express.Router();

// Endpoint para recibir el webhook y desplegar
router.post("/webhook", (req, res) => {
  // Opcional: puedes validar el origen del webhook aquí
  res.status(200).json({ message: "Despliegue iniciado" });

  // Ejecutar el script de despliegue
  const deployScript = path.resolve(__dirname, "../../deploy.sh");
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
// Endpoint para recibir el webhook y desplegar
router.post("/backendWindos", async (req, res) => {
  try {
    const response = await fetch("http://192.168.1.81:3001/api/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: "webhook desde Linux" })
    });
    const data = await response.json();
    console.log("Datos recibidos ACCESS webhook");
    res.json(data);
  } catch (err) {
    console.error("Error consumiendo el proxy:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
