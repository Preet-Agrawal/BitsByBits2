require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const flash = require("connect-flash");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const LocalStrategy = require("passport-local").Strategy;
const path = require("path");
const socketio = require("socket.io");
const http = require("http");
const axios = require("axios");

// Import models
const User = require("./models/User");
const Duel = require("./models/Duel");

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Middleware for parsing request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || "your-secret-key",
        resave: false,
        saveUninitialized: false,
    })
);

// Flash middleware
app.use(flash());

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const user = await User.findOne({ username });
            if (!user) {
                return done(null, false, { message: "Incorrect username." });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return done(null, false, { message: "Incorrect password." });
            }

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    })
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/coding-duel", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ==================================================
// Registration and Login Routes
// ==================================================

// Home Route
app.get("/", (req, res) => {
    res.render("index", { user: req.user });
});

// Login Route
app.get("/login", (req, res) => {
    res.render("login", { message: req.flash("error") });
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
}));

// Register Route
app.get("/register", (req, res) => {
    res.render("register", { message: req.flash("error") });
});

app.post("/register", async (req, res) => {
    const { username, password, cfHandle } = req.body;
    try {
        let user = await User.findOne({ username });
        if (user) {
            req.flash("error", "Username already exists");
            return res.redirect("/register");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ username, password: hashedPassword, cfHandle });
        await user.save();
        res.redirect("/login");
    } catch (err) {
        console.error("❌ Registration Error:", err);
        req.flash("error", "Registration failed");
        res.redirect("/register");
    }
});

// Logout Route
app.get("/logout", (req, res) => {
    req.logout(() => {
        res.redirect("/");
    });
});

// ==================================================
// Other Routes (Leaderboard, Matchmaking, etc.)
// ==================================================

app.get("/leaderboard", async (req, res) => {
    try {
        const duels = await Duel.find().sort({ timestamp: -1 });
        res.render("leaderboard", { duels, user: req.user });
    } catch (error) {
        console.error("❌ Error fetching leaderboard:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/matchmaking", (req, res) => {
    const { player1, player2, problemUrl } = req.query;
    res.render("matchmaking", { player1, player2, problemUrl });
});

// ==================================================
// Socket.io Logic
// ==================================================

let waitingQueue = [];
const inviteCodes = new Map();

io.on("connection", (socket) => {
    console.log(`⚡ New user connected: ${socket.id}`);

    // Random Matchmaking
    socket.on("joinDuel", async (username) => {
        if (waitingQueue.length > 0) {
            const opponent = waitingQueue.shift();
            const duelId = `${socket.id}-${opponent.socketId}`;

            // Find an unsolved problem for both users
            const problemUrl = await findUnsolvedProblem(username, opponent.username);
            if (problemUrl) {
                // Save the duel to MongoDB
                const duel = new Duel({
                    player1: username,
                    player2: opponent.username,
                    problemUrl,
                });
                await duel.save();

                io.to(socket.id).emit("startDuel", { duelId, opponent: opponent.username, problemUrl });
                io.to(opponent.socketId).emit("startDuel", { duelId, opponent: username, problemUrl });
            } else {
                io.to(socket.id).emit("noProblemFound", "No unsolved problems found.");
                io.to(opponent.socketId).emit("noProblemFound", "No unsolved problems found.");
            }
        } else {
            waitingQueue.push({ socketId: socket.id, username });
        }
    });

    // Generate Invite Code
    socket.on("generateInviteCode", () => {
        const inviteCode = Math.random().toString(36).substring(7);
        inviteCodes.set(inviteCode, socket.id);
        socket.emit("inviteCodeGenerated", inviteCode);
    });

    // Join by Invite Code
    socket.on("joinByInviteCode", async (inviteCode, username) => {
        const inviterSocketId = inviteCodes.get(inviteCode);
        if (inviterSocketId) {
            const duelId = `${socket.id}-${inviterSocketId}`;

            // Find an unsolved problem for both users
            const problemUrl = await findUnsolvedProblem(username, "Friend");
            if (problemUrl) {
                // Save the duel to MongoDB
                const duel = new Duel({
                    player1: username,
                    player2: "Friend",
                    problemUrl,
                });
                await duel.save();

                io.to(socket.id).emit("startDuel", { duelId, opponent: "Friend", problemUrl });
                io.to(inviterSocketId).emit("startDuel", { duelId, opponent: username, problemUrl });
                inviteCodes.delete(inviteCode);
            } else {
                io.to(socket.id).emit("noProblemFound", "No unsolved problems found.");
                io.to(inviterSocketId).emit("noProblemFound", "No unsolved problems found.");
            }
        } else {
            socket.emit("invalidInviteCode", "Invalid or expired invite code.");
        }
    });

    // Handle Duel Completion
    socket.on("duelCompleted", async ({ duelId, winner }) => {
        await Duel.findOneAndUpdate(
            { _id: duelId },
            { winner },
            { new: true }
        );
    });

    socket.on("disconnect", () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        waitingQueue = waitingQueue.filter((user) => user.socketId !== socket.id);
        for (const [code, socketId] of inviteCodes.entries()) {
            if (socketId === socket.id) {
                inviteCodes.delete(code);
            }
        }
    });
});

// Function to find an unsolved problem
async function findUnsolvedProblem(handle1, handle2) {
    const [solved1, solved2] = await Promise.all([
        getSolvedProblems(handle1),
        getSolvedProblems(handle2),
    ]);

    try {
        const response = await axios.get("https://codeforces.com/api/problemset.problems");
        const problems = response.data.result.problems;

        const unsolvedProblems = problems.filter((problem) => {
            const problemId = `${problem.contestId}-${problem.index}`;
            return !solved1.has(problemId) && !solved2.has(problemId);
        });

        if (unsolvedProblems.length > 0) {
            const randomProblem = unsolvedProblems[Math.floor(Math.random() * unsolvedProblems.length)];
            return `https://codeforces.com/problemset/problem/${randomProblem.contestId}/${randomProblem.index}`;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching problems from Codeforces:", error);
        return null;
    }
}

// Function to fetch solved problems
async function getSolvedProblems(handle) {
    try {
        const response = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}`);
        const submissions = response.data.result;
        const solvedProblems = new Set();

        submissions.forEach((submission) => {
            if (submission.verdict === "OK") {
                const problemId = `${submission.problem.contestId}-${submission.problem.index}`;
                solvedProblems.add(problemId);
            }
        });

        return solvedProblems;
    } catch (error) {
        console.error(`Error fetching solved problems for ${handle}:`, error);
        return new Set();
    }
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});