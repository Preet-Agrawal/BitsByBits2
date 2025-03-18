const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/User");

// Login Page
router.get("/login", (req, res) => {
    res.render("login", { message: req.flash("error") });
});

// Register Page
router.get("/register", (req, res) => {
    res.render("register", { message: req.flash("error") });
});

// Register User
router.post("/register", async (req, res) => {
    const { username, password, cfHandle } = req.body;
    try {
        let user = await User.findOne({ username });
        if (user) {
            req.flash("error", "Username already exists");
            return res.redirect("/register");
        }

        user = new User({ username, password, cfHandle });
        await user.save();
        res.redirect("/login");
    } catch (err) {
        console.error("❌ Registration Error:", err);
        req.flash("error", "Registration failed");
        res.redirect("/register");
    }
});

// Login User
router.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
}));

// Logout
router.get("/logout", (req, res) => {
    req.logout(() => {
        res.redirect("/");
    });
});

module.exports = router;