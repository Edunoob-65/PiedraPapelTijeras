const socket = io();
let miNombre = null;
let eleccionActual = null; // Guardamos la elección actual

function pedirNombre() {
  miNombre = prompt("Ingresa tu nombre:");
  if (!miNombre) {
    alert("Debes ingresar un nombre.");
    pedirNombre();
  } else {
    socket.emit('nuevoJugador', miNombre);
  }
}

pedirNombre();

// Mostrar mensajes generales
socket.on('mensaje', msg => {
  document.getElementById('mensaje').textContent = msg;
});

// Mostrar la elección del rival (posible mentira) antes del resultado
socket.on('eleccionRival', eleccionFalsa => {
  document.getElementById('resultado').textContent = `El otro jugador seleccionó: ${eleccionFalsa}`;
});

// Mostrar resultado real después
socket.on('resultado', data => {
  const { mensaje } = data;
  document.getElementById('resultado').textContent = mensaje;
});

// Actualizar estadísticas
socket.on('actualizarEstadisticas', (estadisticas) => {
  const tabla = document.getElementById('tabla-estadisticas');
  tabla.innerHTML = '';
  estadisticas.forEach(j => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${j.nombre}</td>
      <td>${j.ganadas}</td>
      <td>${j.perdidas}</td>
      <td>${j.empatadas}</td>`;
    tabla.appendChild(fila);
  });
});

// Mostrar mensajes de chat con burbujas estilo WhatsApp
socket.on('chat', ({ nombre, mensaje }) => {
  const chatBox = document.getElementById('chat-mensajes');
  const burbuja = document.createElement('div');
  const esPropio = nombre === miNombre;

  burbuja.classList.add('mensaje', esPropio ? 'propio' : 'otro');
  burbuja.textContent = mensaje;
  chatBox.appendChild(burbuja);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// Enviar elección del juego y actualizar UI
function enviarEleccion(eleccion) {
  // Guardar la elección actual
  eleccionActual = eleccion;

  // Emitir la elección al servidor
  socket.emit('eleccion', eleccion);

  // Mostrar mensaje personalizado
  document.getElementById('mensaje').textContent = `Has seleccionado: ${eleccion.charAt(0).toUpperCase() + eleccion.slice(1)}`;

  // Iluminar el botón seleccionado y desactivar otros
  const botones = document.querySelectorAll('.btn');
  botones.forEach(btn => {
    // Obtener el texto del botón en minúsculas para comparar
    const texto = btn.textContent.trim().toLowerCase();
    if (texto.includes(eleccion)) {
      btn.classList.add('activo');
    } else {
      btn.classList.remove('activo');
    }
  });
}

// Enviar mensaje de chat
function enviarChat() {
  const input = document.getElementById('chat-input');
  const texto = input.value.trim();
  if (texto !== '') {
    socket.emit('chat', texto);
    input.value = '';
  }
}
