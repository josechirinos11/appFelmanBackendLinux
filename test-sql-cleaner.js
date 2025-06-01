/**
 * Test específico para verificar la función limpiarSQLQuery
 * que previene errores de sintaxis causados por caracteres \n literales
 */

const { limpiarSQLQuery } = require('./src/config/openai-instructions');

console.log('🧪 Iniciando tests para limpiarSQLQuery...\n');

// Test cases con diferentes tipos de caracteres problemáticos
const testCases = [
  {
    nombre: 'SQL con \\n literales',
    input: 'SELECT Serie,\\nNumero\\nFROM fpresupuestos\\nWHERE Estado = 1',
    expected: 'SELECT Serie, Numero FROM fpresupuestos WHERE Estado = 1'
  },
  {
    nombre: 'SQL con saltos de línea reales',
    input: `SELECT Serie,
    Numero
FROM fpresupuestos
WHERE Estado = 1`,
    expected: 'SELECT Serie, Numero FROM fpresupuestos WHERE Estado = 1'
  },
  {
    nombre: 'SQL con múltiples caracteres de escape',
    input: 'SELECT\\tSerie,\\nNumero\\rFROM\\fpresupuestos\\vWHERE Estado = 1',
    expected: 'SELECT Serie, Numero FROM fpresupuestos WHERE Estado = 1'
  },
  {
    nombre: 'SQL con tabs y espacios múltiples',
    input: 'SELECT   Serie,\t\tNumero    FROM  fpresupuestos   WHERE  Estado = 1',
    expected: 'SELECT Serie, Numero FROM fpresupuestos WHERE Estado = 1'
  },
  {
    nombre: 'SQL con JOIN complejo',
    input: 'SELECT p.Serie,\\np.Numero,\\nl.Serie1Desc\\nFROM fpresupuestos p\\nJOIN fpresupuestoslineas l\\nON p.Serie = l.CodigoSerie\\nAND p.Numero = l.CodigoNumero',
    expected: 'SELECT p.Serie, p.Numero, l.Serie1Desc FROM fpresupuestos p JOIN fpresupuestoslineas l ON p.Serie = l.CodigoSerie AND p.Numero = l.CodigoNumero'
  },
  {
    nombre: 'SQL ya limpio (no debe cambiar)',
    input: 'SELECT Serie, Numero FROM fpresupuestos WHERE Estado = 1',
    expected: 'SELECT Serie, Numero FROM fpresupuestos WHERE Estado = 1'
  },
  {
    nombre: 'String vacío',
    input: '',
    expected: ''
  },
  {
    nombre: 'Solo espacios y caracteres de escape',
    input: '\\n\\r\\t   \\f\\v  ',
    expected: ''
  },
  {
    nombre: 'SQL con caracteres Unicode de control',
    input: 'SELECT\u0001Serie,\u0002Numero\u0003FROM\u0004fpresupuestos',
    expected: 'SELECT Serie, Numero FROM fpresupuestos'
  },
  {
    nombre: 'SQL con backslashes dobles',
    input: 'SELECT Serie,\\\\nNumero FROM fpresupuestos WHERE nombre = \\\\"test\\\\"',
    expected: 'SELECT Serie, Numero FROM fpresupuestos WHERE nombre = "test"'
  }
];

let passed = 0;
let failed = 0;

// Ejecutar todos los tests
testCases.forEach((testCase, index) => {
  console.log(`📝 Test ${index + 1}: ${testCase.nombre}`);
  console.log(`   Input: "${testCase.input}"`);
  
  const result = limpiarSQLQuery(testCase.input);
  console.log(`   Output: "${result}"`);
  console.log(`   Expected: "${testCase.expected}"`);
  
  if (result === testCase.expected) {
    console.log(`   ✅ PASS\n`);
    passed++;
  } else {
    console.log(`   ❌ FAIL\n`);
    failed++;
  }
});

// Resumen
console.log('📊 RESUMEN DE TESTS:');
console.log(`✅ Pasaron: ${passed}`);
console.log(`❌ Fallaron: ${failed}`);
console.log(`📈 Total: ${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 ¡Todos los tests pasaron! La función limpiarSQLQuery está funcionando correctamente.');
  console.log('🔒 Los caracteres \\n literales ya no causarán errores de sintaxis en MySQL.');
} else {
  console.log('\n⚠️ Algunos tests fallaron. Revisa la función limpiarSQLQuery.');
}

// Test adicional: Verificar que no afecta SQL válido complejo
console.log('\n🔍 Test adicional: SQL complejo válido...');
const sqlComplejo = 'SELECT p.Serie, p.Numero, p.ClienteNombre, l.Serie1Desc, l.Cantidad, l.Precio FROM fpresupuestos p JOIN fpresupuestoslineas l ON p.Serie = l.CodigoSerie AND p.Numero = l.CodigoNumero WHERE p.Estado = 1 AND l.PenFabricar > 0 ORDER BY p.FechaCreacion DESC LIMIT 10';

const resultadoComplejo = limpiarSQLQuery(sqlComplejo);
if (resultadoComplejo === sqlComplejo) {
  console.log('✅ SQL complejo válido se mantiene intacto');
} else {
  console.log('❌ SQL complejo válido fue modificado incorrectamente');
  console.log(`   Original: ${sqlComplejo}`);
  console.log(`   Resultado: ${resultadoComplejo}`);
}
