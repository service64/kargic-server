import express from "express";
import { ExporterProfileController } from "./exporterProfile.controller";
import {
  createExporterProfileZodSchema,
  exporterProfileIdParamZodSchema,
  updateExporterProfileZodSchema,
} from "./exporterProfile.zod";
import validateRequest from "../../../middlewares/validateRequest";
import { auth } from "../../../middlewares/auth.middleware";
import { USER_ROLES } from "../../../constants";

const router = express.Router();

router.post(
  "/create",
  auth(USER_ROLES.EXPORTER),
  validateRequest(createExporterProfileZodSchema),
  ExporterProfileController.createExporterProfile,
);

router.get("/", ExporterProfileController.getAllExporterProfiles);

router.get(
  "/:id",
  validateRequest(exporterProfileIdParamZodSchema),
  ExporterProfileController.getExporterProfileById,
);

router.patch(
  "/:id",
  auth(USER_ROLES.EXPORTER),
  validateRequest(updateExporterProfileZodSchema),
  ExporterProfileController.updateExporterProfile,
);

router.delete(
  "/:id",
  auth(USER_ROLES.EXPORTER, USER_ROLES.ADMIN),
  validateRequest(exporterProfileIdParamZodSchema),
  ExporterProfileController.deleteExporterProfile,
);

export const ExporterProfileRoutes = router;
