/**
 * Helper to emit socket events globally or to specific rooms.
 * This will be initialized in server.js and used in controllers.
 */
let io;

const initSocket = (socketIoInstance) => {
    io = socketIoInstance;
};

const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(userId.toString()).emit(event, data);
    }
};

const emitToChannel = (channelId, event, data) => {
    if (io) {
        io.to(channelId.toString()).emit(event, data);
    }
};

const emitToCompany = (companyId, event, data) => {
    if (io) {
        io.to(companyId.toString()).emit(event, data);
    }
};

module.exports = {
    initSocket,
    emitToUser,
    emitToChannel,
    emitToCompany
};
