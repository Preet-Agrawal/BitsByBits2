const express = require("express");
const router = express.Router();
const Duel = require("../models/Duel");
const { getSolvedProblems, findUnsolvedProblem } = require("../utils/cfApi");

// Duel Page
router.get("/", (req, res) => {
    res.render("duel", { user: req.user });
});

// Fetch Codeforces Submissions
router.get("/submissions/:username", async (req, res) => {
    const { username } = req.params;
    try {
        const solvedProblems = await getSolvedProblems(username);
        res.json({ solvedProblems: Array.from(solvedProblems) });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch submissions" });
    }
});

module.exports = router;