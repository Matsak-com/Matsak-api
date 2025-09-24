import { HttpStatus } from '@nestjs/common';

export const ERRORS = {
  INVALID_DISCOUNT_INDEX: 'INVALID_DISCOUNT_INDEX',
  PRODUCT_ALREADY_EXISTS: 'PRODUCT_ALREADY_EXISTS',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PERCENTAGE_DISCOUNT_EXCEEDS: 'PERCENTAGE_DISCOUNT_EXCEEDS',
  BULK_DISCOUNT_MIN_QTY_REQUIRED: 'BULK_DISCOUNT_MIN_QTY_REQUIRED',
  PRODUCT_BASE_PRICE_MISSING: 'PRODUCT_BASE_PRICE_MISSING',
  CART_NOT_FOUND: 'CART_NOT_FOUND',
  CART_PRODUCT_NOT_FOUND: 'CART_PRODUCT_NOT_FOUND',
  ADDRESS_NOT_FOUND: 'ADDRESS_NOT_FOUND',
  IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  SESSION_ID_MISSING: 'SESSION_ID_MISSING',
  PRODUCT_ID_MISSING: 'PRODUCT_ID_MISSING',
  INVALID_OBJECT_ID: 'INVALID_OBJECT_ID',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  INVALID_BUFFER: 'INVALID_BUFFER',
  INVALID_IMAGE_TYPE: 'INVALID_IMAGE_TYPE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  RESET_ALREADY_IN_PROGRESS: 'RESET_ALREADY_IN_PROGRESS',
  RESET_NOT_REQUESTED: 'RESET_NOT_REQUESTED',
  DETAIL_PRODUCT_NOT_FOUND: 'DETAIL_PRODUCT_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  PRODUCT_DECOND_NOT_FOUND: 'PRODUCT_DECOND_NOT_FOUND',
  AWS_INVALID_ACCESS_KEY: 'AWS_INVALID_ACCESS_KEY',
  AWS_INVALID_SECRET: 'AWS_INVALID_SECRET',
  AWS_INVALID_REGION: 'AWS_INVALID_REGION',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  SUBCATEGORY_NOT_FOUND: 'SUBCATEGORY_NOT_FOUND',
  TEAM_PARAM_ALREADY_EXISTS: 'TEAM_PARAM_ALREADY_EXISTS',
  TEAM_PARAM_NOT_FOUND: 'TEAM_PARAM_NOT_FOUND',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  UNSUPPORTED_IMAGE_TYPE: 'UNSUPPORTED_IMAGE_TYPE',
  INVALID_FACEBOOK_PROFILE: 'INVALID_FACEBOOK_PROFILE',
  GOOGLE_FETCH_FAILED: 'GOOGLE_FETCH_FAILED',
  SCRIPT_USER_NOT_FOUND: 'SCRIPT_USER_NOT_FOUND',
  PASSWORDS_NOT_MATCH: 'PASSWORDS_NOT_MATCH',
  PASSWORD_UPDATE_FAILED: 'PASSWORD_UPDATE_FAILED',
  LOCALE_INVALID: 'LOCALE_INVALID',
};

export const TOKEN_MAP: Record<string, { status: number; message: string }> = {
  [ERRORS.INVALID_DISCOUNT_INDEX]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid discount index',
  },
  [ERRORS.PRODUCT_ALREADY_EXISTS]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Product already exists',
  },
  [ERRORS.PRODUCT_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Product not found',
  },
  [ERRORS.PERCENTAGE_DISCOUNT_EXCEEDS]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Percentage discount cannot exceed 100%',
  },
  [ERRORS.BULK_DISCOUNT_MIN_QTY_REQUIRED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Bulk discount requires minimum quantity',
  },
  [ERRORS.PRODUCT_BASE_PRICE_MISSING]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Product has no base price set',
  },
  [ERRORS.CART_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Cart not found',
  },
  [ERRORS.CART_PRODUCT_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Product not found in cart',
  },
  [ERRORS.ADDRESS_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Address not found',
  },
  [ERRORS.IMAGE_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Image not found',
  },
  [ERRORS.USER_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'User not found',
  },
  [ERRORS.SESSION_ID_MISSING]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Session ID missing',
  },
  [ERRORS.PRODUCT_ID_MISSING]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'productId missing',
  },
  [ERRORS.INVALID_QUANTITY]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid quantity',
  },
  [ERRORS.DETAIL_PRODUCT_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Detail product not found',
  },
  [ERRORS.CATEGORY_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Category not found',
  },
  [ERRORS.PRODUCT_DECOND_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Product decond not found',
  },
  [ERRORS.AWS_INVALID_ACCESS_KEY]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Invalid AWS access key',
  },
  [ERRORS.AWS_INVALID_SECRET]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Invalid AWS secret',
  },
  [ERRORS.AWS_INVALID_REGION]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Invalid AWS region',
  },
  [ERRORS.VALIDATION_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Validation failed',
  },
  [ERRORS.SUBCATEGORY_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'SubCategory not found',
  },
  [ERRORS.TEAM_PARAM_ALREADY_EXISTS]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Team parameter already exists',
  },
  [ERRORS.TEAM_PARAM_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Team parameter not found',
  },
  [ERRORS.FILE_NOT_FOUND]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'File not found',
  },
  [ERRORS.UNSUPPORTED_IMAGE_TYPE]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Unsupported image type',
  },
  [ERRORS.INVALID_FACEBOOK_PROFILE]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid Facebook profile data',
  },
  [ERRORS.GOOGLE_FETCH_FAILED]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Failed to fetch Google user info',
  },
  [ERRORS.SCRIPT_USER_NOT_FOUND]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'User not found in script',
  },
  [ERRORS.PASSWORDS_NOT_MATCH]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Passwords do not match',
  },
  [ERRORS.PASSWORD_UPDATE_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Password update failed',
  },
  [ERRORS.LOCALE_INVALID]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Locale should be a string',
  },
};
