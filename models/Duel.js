const mongoose = require("mongoose");

const duelSchema = new mongoose.Schema({
    player1: { type: String, required: true },
    player2: { type: String, required: true },
    problemUrl: { type: String, required: true },
    winner: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Duel", duelSchema);