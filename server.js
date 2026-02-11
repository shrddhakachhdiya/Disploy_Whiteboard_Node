const express = require("express")
const app = express()
const { addUser, getUser, removeUser } = require("./utils/user")

const http = require("http")
const { Server } = require("socket.io")
const { default: axios } = require("axios")

//creating http server for our app
const server = http.createServer(app)

//creating server instance for socket
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174","https://disploy-whiteboard-react.vercel.app"],
        methods: ["GET", "POST"]
    }
})

let imgURLGlobal, roomIdGlobal;
console.log("🚀 ~ roomIdGlobal:", roomIdGlobal)

io.on("connection", (socket) => {
    socket.on('user-joined', (userData) => {
        const { name, id, userId, host, presenter } = userData
        roomIdGlobal = id
        socket.join(id)
        const users = addUser({ name, id, userId, host, presenter, socketId: socket.id })
        // console.log("All Users", users)
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
            axios.post('https://back.disploy.com/api/WhiteBoardMaster/RemoveWhiteBoardScreenCode', {
                code: UserCode
            }).then((res) => {
                console.log("🚀 ~ remove code res:", res?.data)

            }).catch(error => {
                console.error('Error removing whiteboard screen code:', error);
            });

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

server.listen(port, host, () => {
    console.log("server is listening")
})
