const express = require("express");
const router = express.Router();
const Duel = require("../models/Duel");

router.get("/", async (req, res) => {
    try {
        const duels = await Duel.find().sort({ timestamp: -1 });
        res.render("leaderboard", { duels, user: req.user });
    } catch (error) {
        console.error("❌ Error fetching leaderboard:", error);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;