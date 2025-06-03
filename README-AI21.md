# 🤖 AI21 Studio Integration

Integración completa con AI21 Studio para generar respuestas inteligentes y análisis de negocio en el sistema Felman.

## 📋 Características

- ✅ **Generación de texto libre** usando J2-Ultra
- ✅ **Análisis de negocio inteligente** 
- ✅ **Explicación de resultados SQL** en lenguaje natural
- ✅ **Sugerencias de consultas relacionadas**
- ✅ **Consultas avanzadas** que combinan datos + IA
- ✅ **Validación automática** del estado del servicio

## 🚀 Configuración

### 1. Variables de Entorno

Asegúrate de que tienes configurado en tu archivo `.env`:

```env
FELMAN_AI21API_KEY=tu_api_key_de_ai21_aqui
```

### 2. Dependencias

```bash
npm install axios
```

## 📡 Endpoints Disponibles

### Base URL: `/ai21`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/estado` | Verificar estado del servicio |
| `GET` | `/info` | Información sobre capacidades |
| `POST` | `/generar-texto` | Generar texto libre |
| `POST` | `/analizar-negocio` | Análisis de negocio |
| `POST` | `/explicar-sql` | Explicar resultados SQL |
| `POST` | `/sugerencias` | Generar sugerencias |
| `POST` | `/consulta-avanzada` | Consulta avanzada con IA |

## 🧪 Ejemplos de Uso

### 1. Generar Texto Simple

```bash
curl -X POST http://localhost:3000/ai21/generar-texto \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explica qué es la inteligencia artificial",
    "opciones": {
      "maxTokens": 150,
      "temperature": 0.7
    }
  }'
```

### 2. Análisis de Negocio

```bash
curl -X POST http://localhost:3000/ai21/analizar-negocio \
  -H "Content-Type: application/json" \
  -d '{
    "contexto": "Empresa que manufactura productos industriales",
    "pregunta": "¿Cómo optimizar el proceso de presupuestos?"
  }'
```

### 3. Explicar Resultado SQL

```bash
curl -X POST http://localhost:3000/ai21/explicar-sql \
  -H "Content-Type: application/json" \
  -d '{
    "consultaUsuario": "Cuántos clientes tenemos",
    "resultadoSQL": {"total": 150, "activos": 120}
  }'
```

### 4. Consulta Avanzada

```bash
curl -X POST http://localhost:3000/ai21/consulta-avanzada \
  -H "Content-Type: application/json" \
  -d '{
    "textoUsuario": "Analizar el rendimiento de ventas del trimestre"
  }'
```

## 🔧 Uso Programático

### Servicio Directo

```javascript
const { AI21Service } = require('./src/consultaIA');

const ai21 = new AI21Service();

// Generar texto
const respuesta = await ai21.generarTexto('Tu prompt aquí');

// Análisis de negocio
const analisis = await ai21.generarAnalisisNegocio(contexto, pregunta);

// Explicar SQL
const explicacion = await ai21.explicarResultadoSQL(consulta, resultado);
```

### A través del API

```javascript
const axios = require('axios');

const response = await axios.post('http://localhost:3000/ai21/generar-texto', {
  prompt: 'Tu prompt aquí',
  opciones: {
    maxTokens: 200,
    temperature: 0.7
  }
});

console.log(response.data);
```

## 🧪 Pruebas

### Ejecutar demo básico:
```bash
node demo-ai21-basico.js
```

### Ejecutar tests completos:
```bash
node test-ai21-integration.js
```

### Verificar estado del servicio:
```bash
curl http://localhost:3000/ai21/estado
```

## 📊 Configuración Avanzada

### Parámetros de AI21

- **maxTokens**: Máximo de tokens en respuesta (default: 200)
- **temperature**: Creatividad 0.0-1.0 (default: 0.7)
- **topP**: P-sampling (default: 1.0)
- **topKReturn**: Top-k sampling (default: 0)

### Ejemplo con configuración personalizada:

```javascript
const opciones = {
  maxTokens: 400,
  temperature: 0.5,  // Más conservador
  topP: 0.9
};

const respuesta = await ai21.generarTexto(prompt, opciones);
```

## 🔍 Estructura del Proyecto

```
src/consultaIA/
├── ai21.service.js    # Servicio principal de AI21
├── ai21.controller.js # Controlador de rutas
├── ai21.routes.js     # Definición de rutas
└── index.js          # Exportaciones del módulo
```

## ⚡ Performance

- **Timeout**: 30 segundos por defecto
- **Rate Limiting**: Según límites de AI21 Studio
- **Caching**: No implementado (puede agregarse)

## 🛡️ Manejo de Errores

El sistema maneja automáticamente:
- Errores de conexión a AI21
- API Key inválida o faltante
- Timeouts de red
- Formatos de respuesta incorrectos

## 🚀 Integración con Sistema Existente

Este módulo se integra perfectamente con:
- Sistema de OpenAI existente
- Rutas de consulta SQL
- Sistema de autenticación
- Middleware de debugging

## 📈 Próximas Mejoras

- [ ] Sistema de caching de respuestas
- [ ] Rate limiting inteligente
- [ ] Integración con base de datos para contexto
- [ ] Análisis de sentimientos
- [ ] Generación de reportes automáticos

---

**🎯 AI21 Studio Integration v1.0.0**  
*Desarrollado para el sistema Felman Backend*
