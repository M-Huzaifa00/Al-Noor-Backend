import express from "express";
import { exportTransactionsToCSV, transactions } from "./controller.js";
const router = express.Router();

router.get("/transactions", transactions);
router.get("/exportTransactionsToCSV", exportTransactionsToCSV);

export default router;
