import express from "express";
import passport from "passport";
import  { signUpUser, logOutUser, loginPage, loginUser } from "../controllers/User.js";

const frontendUrl = "https://findbuddy-lsdc.onrender.com";
const router = express.Router();

router.route("/login")
.post(saveUrl, passport.authenticate("local", {
    failureRedirect: `${frontendUrl}/login`,
    failureFlash: true,
  }),
  loginUser
);

router.route("/signup")
.post(signUpUser);

router.get("/logout", logOutUser);