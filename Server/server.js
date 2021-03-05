const express = require('express')
const path = require('path')
const socket = require('socket.io')
const http = require('http')
const users = require('./users')()

const publicPath = path.join(__dirname, '../Public')
const port = process.env.PORT || 433;

const app = express()
const server = http.createServer(app)
const soketIO = socket(server)

const  message = (name, text, id) => ({name, text, id})
app.use(express.static(publicPath))

soketIO.on('connection', socket => {
    socket.on('join', (user, callback) => {
        if (!user.name || !user.room) {
            return callback('Enter valid user data')
        }
        callback({userId: socket.id})
        socket.join(user.room)
        users.remove(socket.id)
        users.add(socket.id, user.name, user.room)

        soketIO.to(user.room).emit('users:update', users.getByRoom(user.room))
        socket.emit('message:new', message('Admin', `Welcome, ${user.name}!`))
        socket.broadcast.to(user.room).emit('message:new', message('Admin', `${user.name} joined room!`))
    })

    socket.on('message:create', (data, callback) => {
        if (!data.text) {
            callback(`Message can't be empty`)
        } else {
            const user = users.get(socket.id)
            if (user) {
                soketIO.to(user.room).emit('message:new', message(data.name, data.text, data.id))
            }
            callback()
        }
    })

    socket.on('disconnect', () => {
        const user = users.remove(socket.id)
        if (user) {
            soketIO.to(user.room).emit('message:new', message('Admin', `${user.name}, left the room`))
            soketIO.to(user.room).emit('users:update', users.getByRoom(user.room))
        }
    })
})

server.listen(port, () => {
    console.log(`Server has been started on port: ${port}`);
} )