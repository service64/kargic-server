import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ContactService } from './contact.service';

const submitContactMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactService.submitContactMessageIntoDB(req.body);
  return sendResponse(
    res,
    httpStatus.CREATED,
    'Contact message submitted successfully',
    result,
  );
});

const getAdminContactList = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactService.getAdminContactListFromDB(req.query);
  return sendResponse(
    res,
    httpStatus.OK,
    'Contact list retrieved successfully',
    result,
  );
});

const getAdminContactMessages = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const result = await ContactService.getAdminContactMessagesFromDB(
      id,
      req.query,
    );
    return sendResponse(
      res,
      httpStatus.OK,
      'Contact messages retrieved successfully',
      result,
    );
  },
);

const markContactMessagesRead = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { messageIds } = req.body as { messageIds: string[] };
    const result = await ContactService.markContactMessagesReadInDB(
      id,
      messageIds,
    );
    return sendResponse(
      res,
      httpStatus.OK,
      'Contact messages marked as read',
      result,
    );
  },
);

export const ContactController = {
  submitContactMessage,
  getAdminContactList,
  getAdminContactMessages,
  markContactMessagesRead,
};
