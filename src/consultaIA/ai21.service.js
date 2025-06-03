const axios = require('axios');

/**
 * Servicio para integrar AI21 Studio API
 * Proporciona funcionalidades para generar texto usando J2-Ultra
 */
class AI21Service {
  constructor() {
    this.apiKey = process.env.FELMAN_AI21API_KEY;
    this.baseURL = 'https://api.ai21.com/studio/v1';
    
    if (!this.apiKey) {
      throw new Error('FELMAN_AI21API_KEY no está configurado en el archivo .env');
    }
    
    console.log('🤖 AI21 Service inicializado correctamente');
  }

  /**
   * Generar texto usando AI21 Jamba (nuevo formato Chat)
   * @param {string} prompt - El texto de entrada
   * @param {object} options - Opciones de configuración
   * @returns {Promise<string>} - Texto generado
   */
  async generarTexto(prompt, options = {}) {
    const defaultOptions = {
      model: 'jamba-mini', // Usar jamba-mini por defecto (más rápido)
      max_tokens: 200,
      temperature: 0.7,
      top_p: 1.0
    };

    const config = { ...defaultOptions, ...options };

    try {
      console.log('🤖 Enviando prompt a AI21 Jamba...');
      console.log(`📝 Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: config.model,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: config.max_tokens,
          temperature: config.temperature,
          top_p: config.top_p
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos de timeout
        }
      );

      const textoGenerado = response.data.choices[0].message.content;
      console.log('✅ Texto generado exitosamente');
      console.log(`📤 Respuesta: "${textoGenerado.substring(0, 100)}${textoGenerado.length > 100 ? '...' : ''}"`);
      
      return textoGenerado;
    } catch (error) {
      console.error('❌ Error en AI21 Service:', error.response?.data || error.message);
      throw new Error(`Error de AI21: ${error.response?.data?.detail || error.message}`);
    }
  }
  /**
   * Generar análisis de negocio usando AI21
   * @param {string} contexto - Contexto del negocio
   * @param {string} pregunta - Pregunta específica
   * @returns {Promise<string>} - Análisis generado
   */
  async generarAnalisisNegocio(contexto, pregunta) {
    try {
      console.log('📊 Generando análisis de negocio con AI21...');
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'jamba-mini',
          messages: [
            {
              role: "system",
              content: "Eres un consultor de negocios experto. Proporciona análisis detallados y profesionales con recomendaciones estratégicas prácticas."
            },
            {
              role: "user",
              content: `Contexto del negocio: ${contexto}\n\nPregunta: ${pregunta}\n\nProporciona un análisis considerando:\n- Datos disponibles\n- Tendencias del mercado\n- Recomendaciones estratégicas\n- Conclusiones prácticas`
            }
          ],
          max_tokens: 400,
          temperature: 0.6,
          top_p: 1.0
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('❌ Error en análisis de negocio:', error.response?.data || error.message);
      throw new Error(`Error generando análisis: ${error.response?.data?.detail || error.message}`);
    }
  }
  /**
   * Generar respuesta inteligente para consultas SQL
   * @param {string} consultaUsuario - La consulta del usuario
   * @param {string} resultadoSQL - Resultado de la consulta SQL
   * @returns {Promise<string>} - Explicación inteligente
   */
  async explicarResultadoSQL(consultaUsuario, resultadoSQL) {
    try {
      console.log('🔍 Explicando resultado SQL con AI21...');
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'jamba-mini',
          messages: [
            {
              role: "system",
              content: "Eres un analista de datos experto. Explica resultados de bases de datos de manera clara y profesional para usuarios de negocio."
            },
            {
              role: "user",
              content: `Consulta del usuario: "${consultaUsuario}"\n\nResultado de la base de datos:\n${typeof resultadoSQL === 'object' ? JSON.stringify(resultadoSQL, null, 2) : resultadoSQL}\n\nExplica estos resultados incluyendo:\n- Resumen de los datos encontrados\n- Insights importantes\n- Recomendaciones si aplican`
            }
          ],
          max_tokens: 300,
          temperature: 0.5,
          top_p: 1.0
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('❌ Error explicando SQL:', error.response?.data || error.message);
      throw new Error(`Error explicando resultado: ${error.response?.data?.detail || error.message}`);
    }
  }
  /**
   * Generar sugerencias de consultas relacionadas
   * @param {string} consultaOriginal - La consulta original del usuario
   * @returns {Promise<Array>} - Lista de sugerencias
   */
  async generarSugerenciasConsultas(consultaOriginal) {
    try {
      console.log('💡 Generando sugerencias con AI21...');
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'jamba-mini',
          messages: [
            {
              role: "system",
              content: "Genera 3 consultas relacionadas útiles para análisis de negocio. Una consulta por línea, sin numeración."
            },
            {
              role: "user",
              content: `Consulta original: "${consultaOriginal}"\n\nGenera 3 consultas relacionadas que podrían interesar al usuario:`
            }
          ],
          max_tokens: 150,
          temperature: 0.8,
          top_p: 1.0
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Procesar respuesta para extraer las sugerencias
      const respuesta = response.data.choices[0].message.content;
      const sugerencias = respuesta
        .split('\n')
        .filter(linea => linea.trim().length > 0)
        .slice(0, 3)
        .map(sugerencia => sugerencia.replace(/^\d+\.\s*/, '').trim());

      return sugerencias;
    } catch (error) {
      console.error('Error generando sugerencias:', error);
      return ['Ver más datos similares', 'Analizar tendencias', 'Comparar con períodos anteriores'];
    }
  }
  /**
   * Validar la salud del servicio AI21
   * @returns {Promise<boolean>} - Estado del servicio
   */
  async validarConexion() {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'jamba-mini',
          messages: [
            {
              role: "user",
              content: "Test de conexión. Responde solo 'OK'."
            }
          ],
          max_tokens: 10,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('✅ Conexión con AI21 validada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error validando conexión con AI21:', error.message);
      return false;
    }
  }
}

module.exports = AI21Service;
