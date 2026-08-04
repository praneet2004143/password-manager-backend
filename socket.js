const socketIO = require("socket.io");

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    // Join personal room
socket.on("joinUser", (userId) => {
  const room = `user_${userId}`;

  socket.join(room);

  console.log(`User ${userId} joined room ${room}`);
});

    // Join folder room
    socket.on("joinFolder", (folderId) => {
      socket.join(folderId);
      console.log(`Joined folder ${folderId}`);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected");
    });
  });
};

const getIO = () => io;

module.exports = {
  initSocket,
  getIO,
};