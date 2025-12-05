import express from "express";
const router = express.Router();

let accounts = [];
let trades = {};

router.get("/sync", (req, res) => {
  res.json(accounts);
});

router.post("/", (req, res) => {
  const acc = { ...req.body, id: Date.now().toString() };
  accounts.push(acc);
  trades[acc.id] = [];
  res.json(acc);
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  accounts = accounts.filter(a => a.id !== id);
  delete trades[id];
  res.json({ success: true });
});

router.post("/:id/trades", (req, res) => {
  const { id } = req.params;
  const trade = { ...req.body, ticket: Date.now() };
  if (!trades[id]) trades[id] = [];
  trades[id].push(trade);
  res.json({ success: true, trade });
});

router.delete("/:id/trades/:ticket", (req, res) => {
  const { id, ticket } = req.params;
  trades[id] = trades[id]?.filter(t => t.ticket != ticket) || [];
  res.json({ success: true });
});

export default router;
