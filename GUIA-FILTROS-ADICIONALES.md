# 🎯 GUÍA DE FILTROS ADICIONALES - CONTROL TIEMPO REAL

## 📋 Introducción

El backend optimizado de `control-tiempo-real.tsx` ya está preparado para recibir filtros opcionales:
- `operador` - Filtra por nombre de operario
- `tarea` - Filtra por código de tarea (1, 2, 3, 4, 6, 7, 9, 10, 11, 12)
- `pedido` - Filtra por NumeroManual del pedido

Este documento muestra **cómo implementar la UI** para estos filtros.

---

## 🔧 IMPLEMENTACIÓN PASO A PASO

### PASO 1: Agregar Estados para los Filtros

Agregar después de los estados existentes (~línea 120):

```typescript
// ==================== FILTROS ADICIONALES ====================
// Estados para filtrado en backend
const [filtroOperador, setFiltroOperador] = useState('');
const [filtroTarea, setFiltroTarea] = useState('');
const [filtroPedido, setFiltroPedido] = useState('');

// Lista de operarios disponibles (se carga dinámicamente)
const [operariosDisponibles, setOperariosDisponibles] = useState<string[]>([]);

// Indicador de si hay filtros activos
const filtrosActivos = filtroOperador || filtroTarea || filtroPedido;
```

---

### PASO 2: Modificar fetchTiempoReal() para Usar Filtros

Reemplazar la construcción de `params` en `fetchTiempoReal()` (~línea 340):

```typescript
async function fetchTiempoReal() {
  try {
    setLoadingTiempo(true);
    
    // ✅ Construir query params con filtros activos
    const params = new URLSearchParams();
    
    if (filtroOperador) {
      params.append('operador', filtroOperador);
    }
    if (filtroTarea) {
      params.append('tarea', filtroTarea);
    }
    if (filtroPedido) {
      params.append('pedido', filtroPedido);
    }
    
    const url = `${API_URL}/control-terminales/tiempo-real-nueva${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url);
    
    // ... resto del código sin cambios
  } catch (err) {
    console.error('[tiempo-real] error', err);
    setTiempoRecords([]);
  } finally {
    setLoadingTiempo(false);
  }
}
```

---

### PASO 3: Modificar tick() para Usar Filtros

Reemplazar la construcción de `params` en `tick()` (~línea 530):

```typescript
async function tick() {
  try {
    fetchCountRef.current += 1;
    setFetchCount(fetchCountRef.current);
    console.log(`[tiempo-real] consulta #${fetchCountRef.current} iniciada`);

    // ✅ Construir query params con filtros activos
    const params = new URLSearchParams();
    
    if (filtroOperador) {
      params.append('operador', filtroOperador);
    }
    if (filtroTarea) {
      params.append('tarea', filtroTarea);
    }
    if (filtroPedido) {
      params.append('pedido', filtroPedido);
    }
    
    const url = `${API_URL}/control-terminales/tiempo-real-nueva${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url);
    
    // ... resto del código sin cambios
  } catch (err) {
    console.error('[tiempo-real] tick error', err);
  }
}
```

---

### PASO 4: Modificar Carga Inicial para Usar Filtros

Reemplazar la construcción de `params` en el `useEffect` inicial (~línea 620):

```typescript
// initial fetch to populate cache
(async () => {
  try {
    setLoadingTiempo(true);
    
    // ✅ Construir query params con filtros activos
    const params = new URLSearchParams();
    
    if (filtroOperador) {
      params.append('operador', filtroOperador);
    }
    if (filtroTarea) {
      params.append('tarea', filtroTarea);
    }
    if (filtroPedido) {
      params.append('pedido', filtroPedido);
    }
    
    const url = `${API_URL}/control-terminales/tiempo-real-nueva${params.toString() ? '?' + params.toString() : ''}`;
    
    const res = await fetch(url);
    // ... resto del código sin cambios
  } catch (err) {
    console.error('[tiempo-real] error inicial', err);
  } finally {
    setLoadingTiempo(false);
  }
  // ...
})();
```

---

### PASO 5: Recargar Datos Cuando Cambian los Filtros

Agregar un `useEffect` después de los existentes (~línea 660):

```typescript
// Recargar datos cuando cambian los filtros
useEffect(() => {
  // Limpiar cache y recargar desde cero
  cacheRef.current.clear();
  setTiempoRecords([]);
  setGroupedList([]);
  
  // Realizar fetch inicial con los nuevos filtros
  (async () => {
    try {
      setLoadingTiempo(true);
      
      const params = new URLSearchParams();
      if (filtroOperador) params.append('operador', filtroOperador);
      if (filtroTarea) params.append('tarea', filtroTarea);
      if (filtroPedido) params.append('pedido', filtroPedido);
      
      const url = `${API_URL}/control-terminales/tiempo-real-nueva${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const json = await res.json();
        const rows = json.data || (Array.isArray(json) ? json : []);
        const stats = json.stats || null;
        
        if (Array.isArray(rows)) {
          const m = new Map<string, TiempoRealRecord>();
          for (const r of rows) m.set(keyForRecord(r), r);
          cacheRef.current = m;
          setTiempoRecords(Array.from(m.values()));
          setGroupedList(computeGroupsFromMap(m, filterModeRef.current));
          
          if (stats) {
            console.log(`[tiempo-real] stats con filtros: total=${stats.total}, abiertas=${stats.abiertas}`);
          }
        }
      }
    } catch (err) {
      console.error('[tiempo-real] error al aplicar filtros', err);
    } finally {
      setLoadingTiempo(false);
    }
  })();
}, [filtroOperador, filtroTarea, filtroPedido]);
```

---

### PASO 6: Extraer Lista de Operarios de los Datos

Agregar después de los `useEffect` existentes:

```typescript
// Extraer lista única de operarios de los datos actuales
useEffect(() => {
  const operarios = new Set<string>();
  
  tiempoRecords.forEach(record => {
    if (record.OperarioNombre) {
      operarios.add(record.OperarioNombre);
    }
  });
  
  setOperariosDisponibles(Array.from(operarios).sort());
}, [tiempoRecords]);
```

---

### PASO 7: Agregar UI de Filtros

Agregar después del header existente en el `return` (~línea 730):

```tsx
{/* ==================== PANEL DE FILTROS ==================== */}
<View style={styles.filtrosContainer}>
  <Text style={styles.filtrosTitle}>
    🔍 Filtros {filtrosActivos && '(activos)'}
  </Text>
  
  {/* Fila 1: Operador y Tarea */}
  <View style={styles.filtrosRow}>
    {/* Filtro por Operador */}
    <View style={styles.filtroItem}>
      <Text style={styles.filtroLabel}>Operario:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={filtroOperador}
          style={styles.picker}
          onValueChange={(itemValue) => setFiltroOperador(itemValue)}
        >
          <Picker.Item label="Todos" value="" />
          {operariosDisponibles.map(op => (
            <Picker.Item key={op} label={op} value={op} />
          ))}
        </Picker>
      </View>
    </View>
    
    {/* Filtro por Tarea */}
    <View style={styles.filtroItem}>
      <Text style={styles.filtroLabel}>Tarea:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={filtroTarea}
          style={styles.picker}
          onValueChange={(itemValue) => setFiltroTarea(itemValue)}
        >
          <Picker.Item label="Todas" value="" />
          <Picker.Item label="CORTE" value="1" />
          <Picker.Item label="PRE-ARMADO" value="2" />
          <Picker.Item label="ARMADO" value="3" />
          <Picker.Item label="HERRAJE" value="4" />
          <Picker.Item label="MATRIMONIO" value="6" />
          <Picker.Item label="COMPACTO" value="7" />
          <Picker.Item label="ACRISTALADO" value="9" />
          <Picker.Item label="EMBALAJE" value="10" />
          <Picker.Item label="OPTIMIZACION" value="11" />
          <Picker.Item label="REBARBA" value="12" />
        </Picker>
      </View>
    </View>
  </View>
  
  {/* Fila 2: Pedido y Botón Limpiar */}
  <View style={styles.filtrosRow}>
    {/* Filtro por Pedido */}
    <View style={styles.filtroItem}>
      <Text style={styles.filtroLabel}>Pedido:</Text>
      <TextInput
        style={styles.filtroInput}
        placeholder="Núm. Manual"
        value={filtroPedido}
        onChangeText={setFiltroPedido}
        placeholderTextColor="#999"
      />
    </View>
    
    {/* Botón Limpiar Filtros */}
    {filtrosActivos && (
      <TouchableOpacity
        style={styles.limpiarFiltrosButton}
        onPress={() => {
          setFiltroOperador('');
          setFiltroTarea('');
          setFiltroPedido('');
        }}
      >
        <Ionicons name="close-circle" size={20} color="#fff" />
        <Text style={styles.limpiarFiltrosText}>Limpiar</Text>
      </TouchableOpacity>
    )}
  </View>
  
  {/* Indicador de registros filtrados */}
  {filtrosActivos && (
    <View style={styles.filtrosInfo}>
      <Ionicons name="information-circle" size={16} color={COLORS.primary} />
      <Text style={styles.filtrosInfoText}>
        Mostrando {tiempoRecords.length} registro(s) filtrado(s)
      </Text>
    </View>
  )}
</View>
```

**IMPORTANTE:** Necesitas importar `Picker`:

```typescript
import { Picker } from '@react-native-picker/picker';
```

Y en `package.json`:

```bash
npm install @react-native-picker/picker
```

---

### PASO 8: Agregar Estilos para los Filtros

Agregar al final del `StyleSheet.create({...})`:

```typescript
// ==================== ESTILOS DE FILTROS ====================
filtrosContainer: {
  backgroundColor: '#f8f9fa',
  padding: 12,
  borderRadius: 8,
  marginHorizontal: 8,
  marginVertical: 8,
  borderWidth: 1,
  borderColor: '#e0e0e0',
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
filtrosTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: COLORS.primary,
  marginBottom: 8,
},
filtrosRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
  gap: 8,
},
filtroItem: {
  flex: 1,
},
filtroLabel: {
  fontSize: 12,
  fontWeight: '600',
  color: '#555',
  marginBottom: 4,
},
pickerContainer: {
  backgroundColor: '#fff',
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#ddd',
  overflow: 'hidden',
},
picker: {
  height: 40,
  width: '100%',
},
filtroInput: {
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 6,
  paddingHorizontal: 10,
  paddingVertical: 8,
  fontSize: 14,
  color: '#333',
},
limpiarFiltrosButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: COLORS.error || '#ef4444',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 6,
  gap: 4,
  elevation: 2,
},
limpiarFiltrosText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '700',
},
filtrosInfo: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#e8f4f8',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 6,
  gap: 6,
  marginTop: 4,
},
filtrosInfoText: {
  fontSize: 12,
  color: '#333',
  fontWeight: '600',
},
```

---

## 🎨 VARIANTE SIMPLIFICADA (Solo Botones Rápidos)

Si prefieres una UI más simple con botones de acceso rápido:

```tsx
{/* ==================== FILTROS RÁPIDOS ==================== */}
<View style={styles.filtrosRapidosContainer}>
  <Text style={styles.filtrosTitle}>🔍 Filtros Rápidos</Text>
  
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {/* Botón: Todas las Tareas */}
    <TouchableOpacity
      style={[
        styles.filtroRapidoButton,
        !filtroTarea && styles.filtroRapidoButtonActive
      ]}
      onPress={() => setFiltroTarea('')}
    >
      <Text style={styles.filtroRapidoText}>Todas</Text>
    </TouchableOpacity>
    
    {/* Botón: CORTE */}
    <TouchableOpacity
      style={[
        styles.filtroRapidoButton,
        filtroTarea === '1' && styles.filtroRapidoButtonActive
      ]}
      onPress={() => setFiltroTarea(filtroTarea === '1' ? '' : '1')}
    >
      <Text style={styles.filtroRapidoText}>CORTE</Text>
    </TouchableOpacity>
    
    {/* Botón: ARMADO */}
    <TouchableOpacity
      style={[
        styles.filtroRapidoButton,
        filtroTarea === '3' && styles.filtroRapidoButtonActive
      ]}
      onPress={() => setFiltroTarea(filtroTarea === '3' ? '' : '3')}
    >
      <Text style={styles.filtroRapidoText}>ARMADO</Text>
    </TouchableOpacity>
    
    {/* Botón: HERRAJE */}
    <TouchableOpacity
      style={[
        styles.filtroRapidoButton,
        filtroTarea === '4' && styles.filtroRapidoButtonActive
      ]}
      onPress={() => setFiltroTarea(filtroTarea === '4' ? '' : '4')}
    >
      <Text style={styles.filtroRapidoText}>HERRAJE</Text>
    </TouchableOpacity>
    
    {/* ... agregar más botones según necesidad ... */}
  </ScrollView>
  
  {/* Campo de búsqueda por pedido */}
  <View style={styles.searchContainer}>
    <Ionicons name="search-outline" size={20} color="#757575" />
    <TextInput
      style={styles.searchInput}
      placeholder="Buscar por pedido..."
      value={filtroPedido}
      onChangeText={setFiltroPedido}
      placeholderTextColor="#999"
    />
    {filtroPedido && (
      <TouchableOpacity onPress={() => setFiltroPedido('')}>
        <Ionicons name="close-circle" size={20} color="#757575" />
      </TouchableOpacity>
    )}
  </View>
</View>
```

**Estilos para variante simplificada:**

```typescript
filtrosRapidosContainer: {
  backgroundColor: '#fff',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
filtroRapidoButton: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  backgroundColor: '#f0f0f0',
  marginHorizontal: 4,
  borderWidth: 1,
  borderColor: '#ddd',
},
filtroRapidoButtonActive: {
  backgroundColor: COLORS.primary,
  borderColor: COLORS.primary,
},
filtroRapidoText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#333',
},
```

---

## 📊 RESPUESTA DEL BACKEND CON FILTROS

Cuando usas filtros, el backend retorna:

```json
{
  "data": [
    {
      "Serie": "A",
      "Numero": 123,
      "Fecha": "2025-01-15",
      "CodigoOperario": "OP001",
      "OperarioNombre": "Juan Pérez",
      "CodigoTarea": "3",
      "NumeroManual": "PED-2025-001",
      "Modulo": "MOD-01",
      "TiempoDedicado": 3600,
      "Abierta": 0
    }
    // ... más registros filtrados
  ],
  "stats": {
    "total": 15,              // Total de registros filtrados
    "abiertas": 3,            // Tareas abiertas
    "porOperador": {
      "Juan Pérez": 5,
      "María García": 10
    },
    "porTarea": {
      "3": 15                 // Solo tarea ARMADO (si filtraste por tarea=3)
    },
    "porPedido": {
      "PED-2025-001": 15      // Solo este pedido (si filtraste por pedido)
    }
  }
}
```

---

## 🎯 CASOS DE USO

### Caso 1: Ver Solo Tareas de CORTE
```typescript
setFiltroTarea('1');
// El backend retorna solo registros con CodigoTarea = '1'
```

### Caso 2: Ver Tareas de un Operario Específico
```typescript
setFiltroOperador('Juan Pérez');
// El backend retorna solo registros de ese operario
```

### Caso 3: Ver Tareas de un Pedido Específico
```typescript
setFiltroPedido('PED-2025-001');
// El backend retorna solo registros de ese pedido
```

### Caso 4: Combinación de Filtros
```typescript
setFiltroOperador('Juan Pérez');
setFiltroTarea('3');
// El backend retorna solo tareas de ARMADO de Juan Pérez
```

---

## 🚀 VENTAJAS DE FILTRAR EN EL BACKEND

| Aspecto | Sin Filtros Backend | Con Filtros Backend |
|---------|---------------------|---------------------|
| **Datos transferidos** | 5000 registros | 50-100 registros |
| **Tamaño transferencia** | ~2 MB | ~20 KB |
| **Tiempo de respuesta** | 3-6 segundos | 150-400 ms |
| **Carga en frontend** | Alta (filtrado JS) | Mínima (solo renderizado) |
| **Escalabilidad** | ❌ Problemas con más datos | ✅ Maneja millones de registros |

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Paso 1: Agregar estados para filtros
- [ ] Paso 2: Modificar `fetchTiempoReal()` para usar filtros
- [ ] Paso 3: Modificar `tick()` para usar filtros
- [ ] Paso 4: Modificar carga inicial para usar filtros
- [ ] Paso 5: Agregar `useEffect` para recargar al cambiar filtros
- [ ] Paso 6: Extraer lista de operarios disponibles
- [ ] Paso 7: Agregar UI de filtros (Pickers o botones rápidos)
- [ ] Paso 8: Agregar estilos
- [ ] Instalar `@react-native-picker/picker` si usas Pickers
- [ ] Probar cada filtro individualmente
- [ ] Probar combinaciones de filtros
- [ ] Verificar en Network tab que los query params se envían correctamente
- [ ] Confirmar que el backend responde con `{ data, stats }`

---

## 🐛 TROUBLESHOOTING

### Problema: Los filtros no funcionan
**Solución:**
1. Verificar que el backend `controlTerminalesModificado.router.js` esté activo
2. Revisar la consola del navegador para ver los query params
3. Confirmar que los query params llegan al backend con `console.log(req.query)`

### Problema: La lista de operarios está vacía
**Solución:**
- El `useEffect` que extrae operarios depende de `tiempoRecords`
- Asegúrate de que se ejecute después de cargar los datos iniciales

### Problema: Los Pickers no se ven en Android
**Solución:**
- Usar `style={{ height: 50 }}` en el Picker
- O usar `<Picker mode="dropdown">`

---

## 📚 DOCUMENTACIÓN RELACIONADA

- **controlTerminalesModificado.router.js** - Backend optimizado con filtros
- **MODIFICACIONES-FRONTEND-APLICADAS.md** - Modificaciones ya aplicadas
- **README-OPTIMIZACION.md** - Guía completa de optimización

---

✅ **Implementando estos filtros, tendrás un control total sobre qué datos se traen del backend, reduciendo drásticamente la carga de red y mejorando la experiencia del usuario.**
