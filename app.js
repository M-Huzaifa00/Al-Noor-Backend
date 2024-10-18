import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

import stripeRoutes from "./src/controllers/stripe/routes.js";
app.use("/v1/api", stripeRoutes);

export default app;
