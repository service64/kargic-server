import express from "express";
import { ImporterProfileController } from "./importerProfile.controller";
import {
  adminGetImportersQueryZodSchema,
  createImporterProfileZodSchema,
  importerProfileIdParamZodSchema,
  importerUserIdParamZodSchema,
  updateImporterProfileZodSchema,
} from "./importerProfile.zod";
import validateRequest from "../../../middlewares/validateRequest";
import { auth } from "../../../middlewares/auth.middleware";
import { ActiveRole, USER_ACTIVE_ROLES } from "../user/user.interface";
import { USER_ROLES } from "../../../constants";

const router = express.Router();
 
router.post(
  "/create",
  auth(USER_ROLES.IMPORTER),
  validateRequest(createImporterProfileZodSchema),
  ImporterProfileController.createImporterProfile,
);

/** Admin: paginated importer list — filter by company, license, type, country. */
router.get(
  "/admin",
  auth(USER_ROLES.ADMIN),
  validateRequest(adminGetImportersQueryZodSchema),
  ImporterProfileController.getImportersForAdmin,
);

router.get(
  "/",
  auth(USER_ROLES.ADMIN),
  ImporterProfileController.getAllImporterProfiles,
);
router.get(
  "/profile",
  auth(USER_ROLES.IMPORTER,USER_ROLES.ADMIN),
  ImporterProfileController.getImporterProfileById,
);

router.get(
  "/user/:userId",
  validateRequest(importerUserIdParamZodSchema),
  ImporterProfileController.getPublicImporterDetailByUserId,
);

router.patch(
  "/:id",
  auth(USER_ROLES.IMPORTER),
  validateRequest(updateImporterProfileZodSchema),
  ImporterProfileController.updateImporterProfile,
);
// router.delete(
//   "/:id",
//   auth(USER_ROLES.IMPORTER, USER_ROLES.ADMIN),
//   validateRequest(importerProfileIdParamZodSchema),
//   ImporterProfileController.deleteImporterProfile,
// );

export const ImporterProfileRoutes = router;
