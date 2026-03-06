const express = require("express")
const app = express()
const { addUser, getUser, removeUser, getUsersInRoom, updateUserMacIds } = require("./utils/user")

const http = require("http")
const { Server } = require("socket.io")
const { default: axios } = require("axios")
const { io: ioClient } = require("socket.io-client")

// Connect to external Disploy socket server
const disploySocket = ioClient("https://disploysocket.disploy.com", {
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 20000,
})

disploySocket.on("connect", () => {
    console.log("✅ Connected to Disploy socket server")
})

disploySocket.on("connect_error", (err) => {
    console.log("❌ Disploy socket connection error:", err.message)
})

//creating http server for our app
const server = http.createServer(app)


//creating server instance for socket
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "https://disploy-whiteboard-react.vercel.app", "http://192.168.29.119:5173"],
        methods: ["GET", "POST"]
    }
})

let imgURLGlobal, roomIdGlobal;

io.on("connection", (socket) => {
    socket.on('user-joined', (userData) => {
        const { name, id, userId, host, presenter } = userData
        roomIdGlobal = id
        socket.join(id)
        const users = addUser({ name, id, userId, host, presenter, socketId: socket.id })

        // Check if there's a host in the room
        const roomUsers = getUsersInRoom(id);
        const hasHost = roomUsers.some(user => user.host === true);
        if (!hasHost) {
            socket.broadcast.to(id).emit("no-host-available", {
                message: 'Room has no host. Connection terminated.'
            });
            // Disconnect all users in this room
            roomUsers.forEach(user => {
                io.sockets.sockets.get(user.socketId)?.disconnect(true);
                removeUser(user.socketId);
            });
            return;
        }

        socket.emit('room-joined', { success: true, users: users.filter((user) => user.id === id) })
        socket.broadcast.to(id).emit("userJoinedMessageBroadcasted", name)
        socket.broadcast.to(id).emit("allUsers", users.filter((user) => user.id === id))
    })

    socket.on("colorChange", (data) => {
        const { color } = data;
        socket.broadcast.to(roomIdGlobal).emit("colorChange", { color });
    });

    socket.on("WhiteboardElements", (data) => {
        socket.broadcast.to(roomIdGlobal).emit("WhiteboardElements", { elements: data });
    });

    socket.on('message', (data) => {
        const { message } = data
        const user = getUser(socket.id)
        if (user) {
            socket.broadcast.to(roomIdGlobal).emit("messageResponse", { message, name: user.name })
        }
    })

    socket.on('store-macids', (data) => {
        const { roomId, macIds } = data
        updateUserMacIds(socket.id, macIds)
    })

    // socket.on("disconnect", () => {
    //     const user = getUser(socket.id);
    //     if (user) {
    //         const users = removeUser(socket.id)
    //     }
    //     socket.broadcast.to(roomIdGlobal).emit("userLeftMessageBroadcasted", user)

    // })
    socket.on("disconnect", () => {
        const user = getUser(socket.id);
        socket.broadcast.to(roomIdGlobal).emit("userLeftMessageBroadcasted", user)

        if (user && user?.host) {
            const UserCode = user?.id || roomIdGlobal
            const userMacIds = user?.macIds?.split(",") || []

            // Remove whiteboard screen code
            axios.post('https://back.disploy.com/api/WhiteBoardMaster/RemoveWhiteBoardScreenCode', {
                code: UserCode
            }).then((res) => {
                console.log("🚀 ~ remove code res:", res?.data)
            }).catch(error => {
                console.error('Error removing whiteboard screen code:', error);
            });

            // Notify external Disploy socket server for each macId
            if (userMacIds.length > 0) {
                userMacIds.forEach((macId) => {
                    const Params = {
                        id: roomIdGlobal,
                        connection: true,
                        macId: macId,
                    };
                    disploySocket.emit("ScreenConnected", Params);
                });
            } else {
                console.log("⚠️ No macIds found for host, skipping ScreenConnected emit")
            }
        }
        if (user) {
            const users = removeUser(socket.id)
        }

    })
})



//Routes
app.get('/', (req, res) => {
    res.send("this is the server for my whiteboard app")

})

const port = process.env.port || 5000
const host = "localhost"

server.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
