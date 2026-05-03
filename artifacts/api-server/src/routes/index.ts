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
import alertsRouter from "./alerts";
import analyticsRouter from "./analytics";
import interviewsRouter from "./interviews";
import digestRouter from "./digest";
import embedRouter from "./embed";
import referralsRouter from "./referrals";
import assessmentsRouter from "./assessments";

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
router.use("/alerts", alertsRouter);
router.use("/analytics", analyticsRouter);
router.use("/recruiter", interviewsRouter);
router.use("/recruiter", digestRouter);
router.use("/embed", embedRouter);
router.use("/referral", referralsRouter);
router.use("/assessments", assessmentsRouter);

export default router;
