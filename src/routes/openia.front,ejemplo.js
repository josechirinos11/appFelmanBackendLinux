// Ejemplo para generar consulta SQL
const generarSQL = async (texto) => {
  const respuesta = await fetch('http://tu-servidor:3000/openai/generate-sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer TU_TOKEN_JWT'
    },
    body: JSON.stringify({ textoUsuario: texto })
  });
  
  return await respuesta.json();
};

// Ejemplo para ejecutar consulta SQL
const ejecutarSQL = async (texto) => {
  const respuesta = await fetch('http://tu-servidor:3000/openai/ejecutar-sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer TU_TOKEN_JWT'
    },
    body: JSON.stringify({ textoUsuario: texto })
  });
  
  return await respuesta.json();
};