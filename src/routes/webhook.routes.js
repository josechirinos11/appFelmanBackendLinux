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
  // Depuración: Registrar la recepción de la solicitud y los datos del cuerpo
  console.log("📥 Solicitud recibida en /backendWindos");
  console.log("📦 Cuerpo de la solicitud:", req.body);

  try {
    // Depuración: Registrar la URL y opciones de la solicitud fetch
    const fetchOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: "webhook desde Linux" })
    };
    console.log("🌐 Enviando solicitud a: http://192.168.1.81:3001/api/webhook");
    console.log("🔧 Opciones de fetch:", fetchOptions);

    const response = await fetch("http://192.168.1.81:3001/api/webhook", fetchOptions);

    // Depuración: Registrar el estado de la respuesta
    console.log("✅ Respuesta recibida. Estado HTTP:", response.status, response.statusText);

    const data = await response.json();
    
    // Depuración: Registrar los datos recibidos
    console.log("📊 Datos recibidos del servidor remoto:", data);

    // Enviar respuesta al cliente
    res.json(data);
  } catch (err) {
    // Depuración: Registrar detalles del error
    console.error("❌ Error consumiendo el proxy:");
    console.error("Mensaje de error:", err.message);
    console.error("Stack trace:", err.stack);

    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
