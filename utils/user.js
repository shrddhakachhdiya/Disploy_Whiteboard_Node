const users = []

const addUser = ({ name, id, userId, host, presenter, socketId }) => {
    const user = { name, id, userId, host, presenter, socketId, macIds: [] }

    users.push(user);
    return users;
}

const removeUser = (id) => {
    const index = users.findIndex(user => user.socketId === id)
    if (index !== -1) {
        console.log("user removed")
        return users.splice(index, 1)[0]
    }
    return users
}

//get user from list
const getUser = (id) => {

    return users.find((user) => user.socketId === id)
}

//get all users from room

const getUsersInRoom = (roomId) => {
    return users.filter(user => user.id === roomId)
}

// update macIds for a user
const updateUserMacIds = (socketId, macIds) => {
    const user = users.find(user => user.socketId === socketId)
    if (user) {
        user.macIds = macIds
        console.log("✅ Updated macIds for user:", user.name, "macIds:", macIds)
    }
    return user
}

module.exports = {
    addUser, removeUser, getUser, getUsersInRoom, updateUserMacIds
}