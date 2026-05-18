import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PredefinedMessageService } from './predefinedMessage.service';

const createPredefinedMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await PredefinedMessageService.createPredefinedMessageIntoDB(
    req.user!.userId,
    req.body.text,
  );
  return sendResponse(
    res,
    httpStatus.CREATED,
    'Predefined message created successfully',
    result,
  );
});

const getAllPredefinedMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await PredefinedMessageService.getAllPredefinedMessagesFromDB(
    req.user!.userId,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Predefined messages retrieved successfully',
    result,
  );
});

const updatePredefinedMessage = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await PredefinedMessageService.updatePredefinedMessageInDB(
    req.user!.userId,
    id,
    req.body.text,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Predefined message updated successfully',
    result,
  );
});

const deletePredefinedMessage = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await PredefinedMessageService.deletePredefinedMessageFromDB(
    req.user!.userId,
    id,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Predefined message deleted successfully',
    result,
  );
});

export const PredefinedMessageController = {
  createPredefinedMessage,
  getAllPredefinedMessages,
  updatePredefinedMessage,
  deletePredefinedMessage,
};
