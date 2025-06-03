# 🧠 Ejemplos para Postman - Endpoint SQL Inteligente Felman

## 📋 Información del Endpoint

**URL:** `POST http://localhost:3000/ai21/generar-sql-inteligente`
**Headers:** `Content-Type: application/json`

---

## 🎯 Ejemplos Básicos (sin instrucciones personalizadas)

### 1. Presupuestos Aprobados
```json
{
  "textoUsuario": "Dame todos los presupuestos aprobados de este mes"
}
```

### 2. Conteo de Clientes
```json
{
  "textoUsuario": "¿Cuántos clientes diferentes han hecho presupuestos?"
}
```

### 3. Suma de Importes
```json
{
  "textoUsuario": "Suma total de importes de presupuestos facturados"
}
```

### 4. JOIN Complejo
```json
{
  "textoUsuario": "Presupuestos con líneas pendientes de fabricar"
}
```

### 5. Ranking de Clientes
```json
{
  "textoUsuario": "Top 5 clientes por importe total"
}
```

### 6. Búsqueda en Líneas
```json
{
  "textoUsuario": "líneas fabricadas de la serie ventanas"
}
```

### 7. Números de Fabricación
```json
{
  "textoUsuario": "números de fabricación enviados a fábrica"
}
```

### 8. Cliente Específico
```json
{
  "textoUsuario": "presupuestos del cliente GARCIA SL"
}
```

### 9. Agrupación Geográfica
```json
{
  "textoUsuario": "total facturado por provincias"
}
```

### 10. Filtros Múltiples
```json
{
  "textoUsuario": "presupuestos entregados pero no facturados"
}
```

---

## 🎛️ Ejemplos con Instrucciones Personalizadas

### Ejemplo 1: Instrucciones de Formato
```json
{
  "textoUsuario": "Dame los presupuestos recientes",
  "instruccionesPersonalizadas": "- SIEMPRE incluye el nombre del cliente\n- Ordena por fecha descendente\n- Usa alias en español\n- Si mencionan 'recientes', filtra por últimos 7 días"
}
```

### Ejemplo 2: Instrucciones de Precisión
```json
{
  "textoUsuario": "Clientes con mayor facturación",
  "instruccionesPersonalizadas": "- Para importes usa ROUND(precio, 2)\n- Incluye información de contacto\n- Ordena por importe descendente\n- Limita a los top 10"
}
```

### Ejemplo 3: Instrucciones de Negocio
```json
{
  "textoUsuario": "Análisis de presupuestos por estado",
  "instruccionesPersonalizadas": "- Agrupa por Estado\n- Muestra porcentajes del total\n- Incluye conteos y sumas\n- Ordena por cantidad descendente"
}
```

---

## 📊 Casos Avanzados

### Consulta con Fechas Específicas
```json
{
  "textoUsuario": "presupuestos creados la semana pasada que están aprobados"
}
```

### Consulta con Múltiples JOINs
```json
{
  "textoUsuario": "líneas de presupuestos facturados con sus números de fabricación"
}
```

### Consulta de Rentabilidad
```json
{
  "textoUsuario": "presupuestos con mayor beneficio por cliente"
}
```

### Consulta Geográfica
```json
{
  "textoUsuario": "presupuestos por municipio con totales"
}
```

---

## ✅ Respuesta Esperada

```json
{
  "success": true,
  "data": {
    "consultaUsuario": "Dame todos los presupuestos aprobados de este mes",
    "sqlGenerado": "SELECT Serie, Numero, ClienteNombre, Precio FROM fpresupuestos WHERE Aprobado = 1 AND MONTH(FechaCreacion) = MONTH(CURDATE()) AND YEAR(FechaCreacion) = YEAR(CURDATE()) ORDER BY FechaCreacion DESC;",
    "modelo": "AI21 Jamba + Instrucciones Felman",
    "timestamp": "2025-06-03T18:00:00.000Z",
    "instruccionesUsadas": false,
    "esquemaFelman": true
  }
}
```

---

## 🚨 Características Importantes

### ✅ Lo que SÍ hace el endpoint:
- ✅ Genera ÚNICAMENTE código SQL válido
- ✅ Usa los nombres exactos de tablas y campos de Felman
- ✅ Respeta las relaciones PK/FK correctas
- ✅ Traduce términos de negocio a campos técnicos
- ✅ Elimina caracteres problemáticos (\n, \r, \t)
- ✅ Aplica instrucciones personalizadas si se proporcionan

### ❌ Lo que NO hace el endpoint:
- ❌ No incluye explicaciones ni comentarios
- ❌ No genera texto adicional antes/después del SQL
- ❌ No usa tablas que no existen en el schema
- ❌ No genera SQL con errores de sintaxis

---

## 🔧 Troubleshooting

### Error: "El texto de la consulta es requerido"
- **Causa:** Falta el campo `textoUsuario` en el body
- **Solución:** Incluir `textoUsuario` con la consulta

### Error: "Error generando SQL"
- **Causa:** Problema con la API de AI21 o instrucciones
- **Solución:** Verificar que el servidor esté corriendo y la API key configurada

### SQL generado incorrecto
- **Causa:** Consulta ambigua o instrucciones conflictivas
- **Solución:** Reformular la consulta o ajustar instrucciones personalizadas
