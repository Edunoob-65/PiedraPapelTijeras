const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let jugadores = [];

io.on('connection', (socket) => {
  console.log('Jugador conectado:', socket.id);

  socket.on('nuevoJugador', (nombre) => {
    if (jugadores.length < 2) {
      jugadores.push({ 
        id: socket.id, 
        nombre, 
        eleccion: null, 
        ganadas: 0, 
        perdidas: 0, 
        empatadas: 0 
      });
      socket.emit('mensaje', 'Esperando otro jugador...');
      if (jugadores.length === 2) {
        io.emit('mensaje', '¡Comienza el juego! Hagan sus elecciones.');
        io.emit('actualizarEstadisticas', jugadores.map(j => ({
          nombre: j.nombre,
          ganadas: j.ganadas,
          perdidas: j.perdidas,
          empatadas: j.empatadas
        })));
      }
    } else {
      socket.emit('mensaje', 'La sala está llena.');
      socket.disconnect();
    }
  });

  socket.on('eleccion', (eleccion) => {
    const jugador = jugadores.find(j => j.id === socket.id);
    if (jugador) jugador.eleccion = eleccion;

    if (jugadores.length === 2 && jugadores[0].eleccion && jugadores[1].eleccion) {
      const resultado = calcularResultado(jugadores[0], jugadores[1]);

      // Actualizar estadísticas
      if (resultado.ganador === null) {
        jugadores.forEach(j => j.empatadas++);
      } else {
        jugadores.forEach(j => {
          if (j.id === resultado.ganador.id) j.ganadas++;
          else j.perdidas++;
        });
      }

      // Decidir qué mostrar sobre la elección rival con 50% de mentir
      const respuestas = jugadores.map(j => {
        const rival = jugadores.find(r => r.id !== j.id);
        let mostrarEleccionRival = rival.eleccion;
        if (Math.random() < 0.5) {
          // Mentir: elegir otra opción al azar diferente de la real
          const opciones = ['piedra', 'papel', 'tijeras'].filter(op => op !== rival.eleccion);
          mostrarEleccionRival = opciones[Math.floor(Math.random() * opciones.length)];
        }
        return {
          jugadorId: j.id,
          eleccionRival: mostrarEleccionRival
        };
      });

      // Primero enviamos la elección del rival (posible mentira)
      jugadores.forEach(j => {
        const eleccionFalsa = respuestas.find(r => r.jugadorId === j.id).eleccionRival;
        io.to(j.id).emit('eleccionRival', eleccionFalsa);
      });

      // Después, tras 1 segundo, enviamos el resultado real
      setTimeout(() => {
        jugadores.forEach(j => {
          io.to(j.id).emit('resultado', {
            mensaje: resultado.mensaje
          });
        });

        io.emit('actualizarEstadisticas', jugadores.map(j => ({
          nombre: j.nombre,
          ganadas: j.ganadas,
          perdidas: j.perdidas,
          empatadas: j.empatadas
        })));

        jugadores.forEach(j => j.eleccion = null);
      }, 1000);
    }
  });

  socket.on('chat', (msg) => {
    const jugador = jugadores.find(j => j.id === socket.id);
    if (jugador) {
      io.emit('chat', { nombre: jugador.nombre, mensaje: msg });
    }
  });

  socket.on('disconnect', () => {
    console.log('Jugador desconectado:', socket.id);
    jugadores = jugadores.filter(j => j.id !== socket.id);
    io.emit('mensaje', 'Un jugador se desconectó. Esperando nuevo jugador...');
    io.emit('actualizarEstadisticas', jugadores.map(j => ({
      nombre: j.nombre,
      ganadas: j.ganadas,
      perdidas: j.perdidas,
      empatadas: j.empatadas
    })));
  });
});

function calcularResultado(j1, j2) {
  const e1 = j1.eleccion;
  const e2 = j2.eleccion;

  if (e1 === e2) return { ganador: null, mensaje: `Empate. Ambos eligieron ${e1}` };

  const gana = {
    piedra: "tijeras",
    papel: "piedra",
    tijeras: "papel"
  };

  if (gana[e1] === e2) {
    return { ganador: j1, mensaje: `${j1.nombre} (${e1}) gana a ${j2.nombre} (${e2})` };
  } else {
    return { ganador: j2, mensaje: `${j2.nombre} (${e2}) gana a ${j1.nombre} (${e1})` };
  }
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
