import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ShippingAddressService } from './shippingAddress.service';

const createShippingAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await ShippingAddressService.createShippingAddressIntoDB({
    ...req.body,
    userId: req.user!.userId,
  });
  return sendResponse(
    res,
    httpStatus.CREATED,
    'Shipping address created successfully',
    result,
  );
});

const getShippingAddresses = catchAsync(async (req: Request, res: Response) => {
  const result = await ShippingAddressService.getShippingAddressesByUserFromDB(
    req.user!.userId,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Shipping addresses retrieved successfully',
    result,
  );
});

const getShippingAddressById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ShippingAddressService.getShippingAddressByIdFromDB(
    req.user!.userId,
    id,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Shipping address retrieved successfully',
    result,
  );
});

const updateShippingAddress = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ShippingAddressService.updateShippingAddressInDB(
    req.user!.userId,
    id,
    req.body,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Shipping address updated successfully',
    result,
  );
});

const deleteShippingAddress = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ShippingAddressService.deleteShippingAddressFromDB(
    req.user!.userId,
    id,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Shipping address deleted successfully',
    result,
  );
});

export const ShippingAddressController = {
  createShippingAddress,
  getShippingAddresses,
  getShippingAddressById,
  updateShippingAddress,
  deleteShippingAddress,
};
