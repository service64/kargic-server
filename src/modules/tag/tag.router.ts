import express from "express";
import { USER_ROLES } from "../../constants";
import { auth } from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest";
import { TagController } from "./tag.controller";
import { createTagZodSchema, tagIdParamZodSchema, updateTagZodSchema } from "./tag.validation";

const router = express.Router();

router.post(
  "/create",
  auth(USER_ROLES.ADMIN, USER_ROLES.IMPORTER, USER_ROLES.EXPORTER),
  validateRequest(createTagZodSchema),
  TagController.createTag,
);

router.get(
  "/all",
  auth(USER_ROLES.ADMIN, USER_ROLES.IMPORTER, USER_ROLES.EXPORTER),
  TagController.getAllTags,
);
router.delete(
  "/delete/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.IMPORTER, USER_ROLES.EXPORTER),
  validateRequest(tagIdParamZodSchema),
  TagController.deleteTag,
);
router.put(
  "/update/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.IMPORTER, USER_ROLES.EXPORTER),
  validateRequest(updateTagZodSchema),
  TagController.updateTag,
);
export const TagRoutes = router;
