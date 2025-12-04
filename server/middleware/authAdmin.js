
import jwt from "jsonwebtoken";

export default function(req,res,next){
  const token = req.headers.authorization?.split(" ")[1];
  if(!token) return res.status(401).json({message:"Missing token"});
  const decoded = jwt.verify(token,process.env.JWT_SECRET);
  if(decoded.role !== "admin") return res.status(403).json({message:"Admin only"});
  req.user = decoded;
  next();
}
