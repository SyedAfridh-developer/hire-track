import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import companiesRouter from "./companies";
import jobsRouter from "./jobs";
import applicationsRouter from "./applications";
import dashboardRouter from "./dashboard";
import notificationsRouter from "./notifications";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/companies", companiesRouter);
router.use("/jobs", jobsRouter);
router.use("/", applicationsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/notifications", notificationsRouter);
router.use("/messages", messagesRouter);

export default router;
