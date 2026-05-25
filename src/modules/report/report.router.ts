import express from 'express';
import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { ReportController } from './report.controller';
import {
  adminReportSummaryQueryZodSchema,
  createReportZodSchema,
  updateReportResolutionZodSchema,
  reportUserIdParamZodSchema,
} from './report.validation';

const router = express.Router();

router.post(
  '/',
  auth(),
  validateRequest(createReportZodSchema),
  ReportController.createReport,
);

router.get('/my', auth(), ReportController.getMyReports);
router.get('/against-me', auth(), ReportController.getReportsAgainstMe);

router.get(
  '/admin/summary',
  auth(USER_ROLES.ADMIN),
  validateRequest(adminReportSummaryQueryZodSchema),
  ReportController.getAdminReportSummary,
);

router.get(
  '/admin/:userId',
  auth(USER_ROLES.ADMIN),
  validateRequest(reportUserIdParamZodSchema),
  ReportController.getAdminReportsByUserId,
);

router.patch(
  '/admin/:reportId/resolve',
  auth(USER_ROLES.ADMIN),
  validateRequest(updateReportResolutionZodSchema),
  ReportController.updateReportResolution,
);

export const ReportRoutes = router;
