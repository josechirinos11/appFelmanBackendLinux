# 📱 Guía de Actualización del Frontend

## 🎯 Objetivo

Actualizar los archivos del frontend para aprovechar las optimizaciones del backend:
- Enviar filtros al backend en lugar de filtrar localmente
- Usar datos pre-calculados del backend
- Eliminar lógica innecesaria en JavaScript

---

## 📁 Archivos a Modificar

1. **control-terminales.tsx** - Control de lotes y módulos
2. **control-tiempo-real.tsx** - Visualización en tiempo real

---

## 📝 ARCHIVO 1: control-terminales.tsx

### Cambio #1: Función refreshLotes() - Enviar filtros al backend

**UBICACIÓN:** Línea ~250

**ANTES:**
```typescript
const refreshLotes = () => {
  log('Actualizando lotes manualmente...');
  setLoadingLotes(true);
  fetch(`${API_URL}/control-terminales/lotes`)
    .then(res => {
      log('Respuesta de lotes:', res.status, res.ok);
      return res.json();
    })
    .then((json: any) => {
      log('Datos recibidos de lotes:', json);
      const data = Array.isArray(json) ? json as Lote[] : [];
      setLotes(data);
      log('Lotes actualizados:', data.length);
    })
    .catch(error => {
      log('Error al cargar lotes:', error);
      console.error(error);
    })
    .finally(() => setLoadingLotes(false));
};
```

**DESPUÉS:**
```typescript
const refreshLotes = () => {
  log('Actualizando lotes con filtros...');
  setLoadingLotes(true);
  
  // Construir query params
  const params = new URLSearchParams();
  if (statusFilter !== 'Todo') {
    params.append('status', statusFilter);
  }
  if (searchQuery.trim()) {
    params.append('search', searchQuery.trim());
  }
  params.append('limit', '100');
  params.append('offset', '0');
  
  const url = `${API_URL}/control-terminales/lotes?${params.toString()}`;
  log('URL con filtros:', url);
  
  fetch(url)
    .then(res => {
      log('Respuesta de lotes:', res.status, res.ok);
      return res.json();
    })
    .then((json: any) => {
      log('Datos recibidos de lotes:', json);
      // El backend ahora devuelve { data: [...], pagination: {...} }
      const data = Array.isArray(json.data) ? json.data as Lote[] : 
                   Array.isArray(json) ? json as Lote[] : []; // Compatibilidad
      setLotes(data);
      
      // Opcional: Guardar info de paginación
      if (json.pagination) {
        log('Paginación:', json.pagination);
        // Aquí puedes guardar total, hasMore, etc. si implementas paginación infinita
      }
      
      log('Lotes actualizados:', data.length);
    })
    .catch(error => {
      log('Error al cargar lotes:', error);
      console.error(error);
    })
    .finally(() => setLoadingLotes(false));
};
```

**EXPLICACIÓN:**
- ✅ Envía `status` y `search` como query params
- ✅ El backend filtra en SQL
- ✅ Se recibe respuesta con estructura `{ data, pagination }`
- ✅ Compatibilidad con respuesta anterior (por si acaso)

---

### Cambio #2: Eliminar filtrado local en useEffect

**UBICACIÓN:** Línea ~275-315

**ANTES (ELIMINAR COMPLETAMENTE):**
```typescript
// Filtra lotes según búsqueda y estado
useEffect(() => {
  if (!Array.isArray(lotes)) {
    setFilteredLotes([]);
    return;
  }
  
  let filtered = lotes;
  
  // Filtrar por estado
  if (statusFilter !== 'Todo') {
    filtered = filtered.filter(item => {
      if (statusFilter === 'Fabricado') {
        return item.Fabricado !== 0;
      } else if (statusFilter === 'En Fabricacion') {
        return item.Fabricado === 0 && item.FechaRealInicio;
      } else if (statusFilter === 'En Cola') {
        return item.Fabricado === 0 && !item.FechaRealInicio;
      }
      return true;
    });
  }
  
  // Filtrar por búsqueda
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(item => {
      // Buscar por número manual
      if (item.NumeroManual.toLowerCase().includes(q)) return true;
      // Buscar en descripción
      if (item.Descripcion?.toLowerCase().includes(q)) return true;
      // Filtrar por Fabricado con operadores >,< o exacto
      if (/^[<>]?\d+$/.test(q)) {
        const num = parseInt(q.replace(/[<>]/g, ''), 10);
        if (q.startsWith('>') && (item.Fabricado ?? 0) > num) return true;
        if (q.startsWith('<') && (item.Fabricado ?? 0) < num) return true;
        if (!q.startsWith('>') && !q.startsWith('<') && (item.Fabricado ?? 0) === num) return true;
      }
      return false;
    });
  }
  
  setFilteredLotes(filtered);
  log('Lotes filtrados:', filtered.length);
}, [lotes, searchQuery, statusFilter]);
```

**DESPUÉS (REEMPLAZAR CON):**
```typescript
// Recargar lotes cuando cambien los filtros
useEffect(() => {
  log('Filtros cambiados, recargando lotes...');
  refreshLotes();
}, [searchQuery, statusFilter]); // Solo observar cambios en filtros

// NOTA: Ya NO es necesario filtrar localmente porque el backend filtra
```

**EXPLICACIÓN:**
- ❌ Elimina toda la lógica de filtrado local
- ✅ Llama a `refreshLotes()` cuando cambian los filtros
- ✅ El backend hace todo el trabajo

---

### Cambio #3: Eliminar estado filteredLotes

**UBICACIÓN:** Línea ~129 (declaración) y múltiples lugares de uso

**ANTES:**
```typescript
const [lotes, setLotes] = useState<Lote[]>([]);
const [filteredLotes, setFilteredLotes] = useState<Lote[]>([]); // ❌ ELIMINAR ESTA LÍNEA
```

**DESPUÉS:**
```typescript
const [lotes, setLotes] = useState<Lote[]>([]);
// Ya NO necesitamos filteredLotes porque el backend filtra
```

---

### Cambio #4: Usar 'lotes' directamente en FlatList

**UBICACIÓN:** Múltiples lugares donde se usa `filteredLotes`

**ANTES:**
```typescript
<FlatList
  data={filteredLotes}  // ❌
  renderItem={renderLoteCard}
  keyExtractor={(item) => item.NumeroManual}
  ...
/>
```

**DESPUÉS:**
```typescript
<FlatList
  data={lotes}  // ✅ Usar directamente 'lotes'
  renderItem={renderLoteCard}
  keyExtractor={(item) => item.NumeroManual}
  ...
/>
```

**BUSCAR Y REEMPLAZAR:**
- Buscar: `filteredLotes`
- Reemplazar: `lotes`

---

### Cambio #5: Actualizar fetch de loteslineas (con estadoTiempos)

**UBICACIÓN:** Línea ~320-380 (dentro de openModal)

**ANTES:**
```typescript
fetch(`${API_URL}/control-terminales/loteslineas?num_manual=${encodeURIComponent(num)}`)
  .then(res => res.json())
  .then(async (rows: Linea[]) => {
    // Calcular estadoTiempos para cada módulo
    const modulesWithStatus = await Promise.all(rows.map(async (module) => {
      try {
        const tiemposRes = await fetch(`${API_URL}/control-terminales/tiempos-acumulados-modulo?num_manual=${encodeURIComponent(num)}&modulo=${encodeURIComponent(module.Módulo)}`);
        const tiemposData = await tiemposRes.json();
        
        const tareasConTiempo = tiemposData.filter(t => (t.TiempoAcumulado ?? 0) > 0).length;
        let estado: 'completo' | 'parcial' | 'sin_tiempo';
        if (tareasConTiempo === 0) {
          estado = 'sin_tiempo';
        } else if (tareasConTiempo === 9) {
          estado = 'completo';
        } else {
          estado = 'parcial';
        }
        
        return { ...module, estadoTiempos: estado };
      } catch (error) {
        return { ...module, estadoTiempos: 'sin_tiempo' as const };
      }
    }));
    
    setModules(modulesWithStatus);
  });
```

**DESPUÉS:**
```typescript
fetch(`${API_URL}/control-terminales/loteslineas?num_manual=${encodeURIComponent(num)}`)
  .then(res => res.json())
  .then((rows: Linea[]) => {
    // ✅ El backend ya incluye estadoTiempos calculado
    log('Módulos con estadoTiempos:', rows);
    setModules(rows);
    // Ya NO necesitamos hacer N llamadas a tiempos-acumulados-modulo
  })
  .catch(error => {
    console.error('Error al cargar módulos:', error);
  })
  .finally(() => setLoadingModules(false));
```

**EXPLICACIÓN:**
- ❌ Elimina N llamadas a `/tiempos-acumulados-modulo`
- ✅ El backend devuelve `estadoTiempos` directamente
- ✅ Mucho más rápido (N*500ms → 200ms)

---

## 📝 ARCHIVO 2: control-tiempo-real.tsx

### Cambio #1: Función de fetch con filtros

**UBICACIÓN:** Donde se hace fetch a `/tiempo-real-nueva`

**ANTES:**
```typescript
const fetchTiempoReal = () => {
  fetch(`${API_URL}/control-terminales/tiempo-real-nueva`)
    .then(res => res.json())
    .then((data: TiempoRealRecord[]) => {
      setTiempoRecords(data);
      // Agrupar/filtrar localmente
      const grouped = computeGroupsFromMap(data);
      setGroups(grouped);
    });
};
```

**DESPUÉS:**
```typescript
const fetchTiempoReal = () => {
  // Construir query params según filtros
  const params = new URLSearchParams();
  
  if (filterMode === 'operador' && selectedOperador) {
    params.append('operador', selectedOperador);
  } else if (filterMode === 'tarea' && selectedTarea) {
    params.append('tarea', selectedTarea.toString());
  } else if (filterMode === 'pedido' && selectedPedido) {
    params.append('pedido', selectedPedido);
  }
  
  const url = `${API_URL}/control-terminales/tiempo-real-nueva?${params.toString()}`;
  
  fetch(url)
    .then(res => res.json())
    .then((json: any) => {
      // El backend ahora devuelve { data, stats }
      const data = json.data || json; // Compatibilidad
      setTiempoRecords(data);
      
      // ✅ Usar estadísticas pre-calculadas del backend
      if (json.stats) {
        console.log('Estadísticas del backend:', json.stats);
        setCounts({
          operador: Object.keys(json.stats.porOperador).length,
          tarea: Object.keys(json.stats.porTarea).length,
          pedido: Object.keys(json.stats.porPedido).length
        });
        
        // Opcional: Guardar los mapas de agrupación
        setOperadorMap(json.stats.porOperador);
        setTareaMap(json.stats.porTarea);
        setPedidoMap(json.stats.porPedido);
      }
    })
    .catch(error => {
      console.error('Error al cargar tiempo real:', error);
    });
};
```

**EXPLICACIÓN:**
- ✅ Envía filtros al backend
- ✅ Recibe estadísticas pre-calculadas
- ✅ Menos procesamiento en frontend

---

### Cambio #2: Eliminar computeGroupsFromMap (si existe)

**BUSCAR:**
```typescript
const computeGroupsFromMap = (data: TiempoRealRecord[]) => {
  // Lógica de agrupación local
  ...
};
```

**ACCIÓN:**
- ❌ Eliminar esta función completa
- ✅ Ya no es necesaria porque el backend agrupa

---

### Cambio #3: Actualizar useEffect de polling

**ANTES:**
```typescript
useEffect(() => {
  fetchTiempoReal();
  
  const interval = setInterval(() => {
    fetchTiempoReal();
  }, 30000); // Cada 30 segundos
  
  return () => clearInterval(interval);
}, []); // Sin dependencias
```

**DESPUÉS:**
```typescript
useEffect(() => {
  fetchTiempoReal();
  
  const interval = setInterval(() => {
    fetchTiempoReal();
  }, 30000); // Cada 30 segundos
  
  return () => clearInterval(interval);
}, [filterMode, selectedOperador, selectedTarea, selectedPedido]); // ✅ Incluir filtros
```

**EXPLICACIÓN:**
- ✅ Se refresca cuando cambian los filtros
- ✅ Mantiene el polling automático

---

## ✅ Checklist de Cambios

### control-terminales.tsx
- [ ] Modificar `refreshLotes()` para enviar query params
- [ ] Eliminar useEffect de filtrado local (línea ~275-315)
- [ ] Eliminar declaración de `filteredLotes`
- [ ] Reemplazar `filteredLotes` con `lotes` en todos los usos
- [ ] Actualizar fetch de `loteslineas` para usar `estadoTiempos` del backend
- [ ] Probar que los filtros funcionan correctamente

### control-tiempo-real.tsx
- [ ] Modificar fetch para enviar filtros como query params
- [ ] Usar estadísticas pre-calculadas del backend
- [ ] Eliminar `computeGroupsFromMap()` si existe
- [ ] Actualizar useEffect para incluir filtros como dependencias
- [ ] Probar que los filtros funcionan correctamente

---

## 🧪 Testing

### Pruebas en control-terminales.tsx

1. **Filtro "Todo":**
   - Debería mostrar todos los lotes (primeros 100)
   - Verificar que la URL incluye `?limit=100&offset=0`

2. **Filtro "Fabricado":**
   - Solo muestra lotes con Fabricado != 0
   - Verificar URL: `?status=Fabricado&limit=100&offset=0`

3. **Filtro "En Fabricacion":**
   - Solo muestra lotes con Fabricado = 0 y FechaRealInicio
   - Verificar URL: `?status=En%20Fabricacion&limit=100&offset=0`

4. **Búsqueda:**
   - Buscar por número manual: "ABC123"
   - Verificar URL: `?search=ABC123&limit=100&offset=0`

5. **Combinado:**
   - Filtro + búsqueda
   - Verificar URL: `?status=Fabricado&search=ABC&limit=100&offset=0`

6. **Módulos:**
   - Click en un lote
   - Verificar que muestra módulos con colores según `estadoTiempos`
   - Verde = completo, Amarillo = parcial, Rojo = sin_tiempo

### Pruebas en control-tiempo-real.tsx

1. **Sin filtros:**
   - Debería mostrar todos los registros de hoy
   - Verificar estadísticas correctas

2. **Filtro por operador:**
   - Seleccionar un operador
   - Verificar URL: `?operador=JUAN`
   - Solo muestra registros de ese operador

3. **Filtro por tarea:**
   - Seleccionar una tarea
   - Verificar URL: `?tarea=1`
   - Solo muestra registros de esa tarea

4. **Filtro por pedido:**
   - Seleccionar un pedido
   - Verificar URL: `?pedido=ABC123`
   - Solo muestra registros de ese pedido

---

## 📊 Verificación de Rendimiento

### Antes de los cambios
```javascript
console.time('fetch-lotes');
// ... fetch
console.timeEnd('fetch-lotes');
// Esperado: 2-5 segundos
```

### Después de los cambios
```javascript
console.time('fetch-lotes');
// ... fetch
console.timeEnd('fetch-lotes');
// Esperado: 100-300ms ✅
```

**Reducción:** **90-95%** 🚀

---

## 🐛 Troubleshooting

### Problema: "No se muestran datos"

**Causa:** El backend devuelve `{ data: [...] }` pero el frontend espera `[...]`

**Solución:**
```typescript
const data = Array.isArray(json.data) ? json.data : 
             Array.isArray(json) ? json : [];
```

---

### Problema: "Los filtros no funcionan"

**Verificar:**
1. URL en Network tab (F12): ¿Incluye los query params?
2. Backend recibe los params: Ver logs del servidor
3. SQL está filtrando: Agregar console.log en router

---

### Problema: "estadoTiempos undefined"

**Causa:** Backend antiguo sin optimización

**Solución temporal:**
```typescript
const estadoTiempos = module.estadoTiempos || 'sin_tiempo';
```

---

## 🎉 Resultado Final

Después de estos cambios:

✅ **Frontend más simple** (menos código)  
✅ **Más rápido** (sin filtrado local)  
✅ **Menos memoria** (menos datos en memoria)  
✅ **Mejor experiencia** (respuesta instantánea)  

**Tiempo estimado de implementación:** 15-20 minutos

---

## 📞 Soporte

Si tienes dudas:
- Revisa `README-OPTIMIZACION.md` Fase 3
- Revisa `ANALISIS-OPTIMIZACION.md` para detalles técnicos
- Verifica logs del navegador (F12 → Console)
- Verifica Network tab para ver requests/responses

---

**¡Listo para actualizar el frontend! 🚀**
