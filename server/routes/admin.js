
import express from "express";
import User from "../models/User.js";
import authAdmin from "../middleware/authAdmin.js";

const router = express.Router();
router.get("/users", authAdmin, async (req,res)=>{
  const users = await User.find().select("-password");
  res.json(users);
});

export default router;
