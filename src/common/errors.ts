import { HttpStatus } from '@nestjs/common';

export const ERRORS = {
  // Discount / Pricing
  INVALID_DISCOUNT_INDEX: 'INVALID_DISCOUNT_INDEX',
  PERCENTAGE_DISCOUNT_EXCEEDS: 'PERCENTAGE_DISCOUNT_EXCEEDS',
  BULK_DISCOUNT_MIN_QTY_REQUIRED: 'BULK_DISCOUNT_MIN_QTY_REQUIRED',
  PRODUCT_BASE_PRICE_MISSING: 'PRODUCT_BASE_PRICE_MISSING',
  // Products
  PRODUCT_ALREADY_EXISTS: 'PRODUCT_ALREADY_EXISTS',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_DECOND_NOT_FOUND: 'PRODUCT_DECOND_NOT_FOUND',
  DETAIL_PRODUCT_NOT_FOUND: 'DETAIL_PRODUCT_NOT_FOUND',
  SEARCH_KEYWORD_REQUIRED: 'SEARCH_KEYWORD_REQUIRED',
  PRODUCT_CREATION_FAILED: 'PRODUCT_CREATION_FAILED',
  PRODUCT_UPDATE_FAILED: 'PRODUCT_UPDATE_FAILED',
  PRODUCT_FETCH_FAILED: 'PRODUCT_FETCH_FAILED',
  // Cart
  CART_NOT_FOUND: 'CART_NOT_FOUND',
  CART_PRODUCT_NOT_FOUND: 'CART_PRODUCT_NOT_FOUND',
  CART_EMPTY: 'CART_EMPTY',
  CART_SESSION_REQUIRED: 'CART_SESSION_REQUIRED',
  SESSION_ID_MISSING: 'SESSION_ID_MISSING',
  PRODUCT_ID_MISSING: 'PRODUCT_ID_MISSING',
  // Addresses
  ADDRESS_NOT_FOUND: 'ADDRESS_NOT_FOUND',
  // Images
  IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
  INVALID_BUFFER: 'INVALID_BUFFER',
  INVALID_IMAGE_TYPE: 'INVALID_IMAGE_TYPE',
  UNSUPPORTED_IMAGE_TYPE: 'UNSUPPORTED_IMAGE_TYPE',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  ONLY_IMAGE_FILES_ARE_ALLOWED: 'ONLY_IMAGE_FILES_ARE_ALLOWED',
  // Users
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_CREATION_FAILED: 'USER_CREATION_FAILED',
  FORBIDDEN_USER_ACCESS: 'FORBIDDEN_USER_ACCESS',
  FORBIDDEN_USER_UPDATE: 'FORBIDDEN_USER_UPDATE',
  USER_PAYLOAD_MISSING: 'USER_PAYLOAD_MISSING',
  // Auth
  INVALID_OBJECT_ID: 'INVALID_OBJECT_ID',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  RESET_ALREADY_IN_PROGRESS: 'RESET_ALREADY_IN_PROGRESS',
  RESET_NOT_REQUESTED: 'RESET_NOT_REQUESTED',
  LOCALE_INVALID: 'LOCALE_INVALID',
  LOCALE_UPDATE_FAILED: 'LOCALE_UPDATE_FAILED',
  GOOGLE_FETCH_FAILED: 'GOOGLE_FETCH_FAILED',
  GOOGLE_AUTH_FAILED: 'GOOGLE_AUTH_FAILED',
  INVALID_FACEBOOK_PROFILE: 'INVALID_FACEBOOK_PROFILE',
  SCRIPT_USER_NOT_FOUND: 'SCRIPT_USER_NOT_FOUND',
  PASSWORDS_NOT_MATCH: 'PASSWORDS_NOT_MATCH',
  PASSWORD_UPDATE_FAILED: 'PASSWORD_UPDATE_FAILED',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  // Categories
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  SUBCATEGORY_NOT_FOUND: 'SUBCATEGORY_NOT_FOUND',
  CATEGORY_SUBCATEGORY_MISMATCH: 'CATEGORY_SUBCATEGORY_MISMATCH',
  // Team params
  TEAM_PARAM_ALREADY_EXISTS: 'TEAM_PARAM_ALREADY_EXISTS',
  TEAM_PARAM_NOT_FOUND: 'TEAM_PARAM_NOT_FOUND',
  // AWS
  AWS_INVALID_ACCESS_KEY: 'AWS_INVALID_ACCESS_KEY',
  AWS_INVALID_SECRET: 'AWS_INVALID_SECRET',
  AWS_INVALID_REGION: 'AWS_INVALID_REGION',
  AWS_S3_BUCKET_NOT_CONFIGURED: 'AWS_S3_BUCKET_NOT_CONFIGURED',
  // Reviews
  USER_ID_MISMATCH: 'USER_ID_MISMATCH',
  FORBIDDEN_REVIEW_APPROVAL: 'FORBIDDEN_REVIEW_APPROVAL',
  FORBIDDEN_REVIEW_REJECTION: 'FORBIDDEN_REVIEW_REJECTION',
  FORBIDDEN_REVIEW_DELETION: 'FORBIDDEN_REVIEW_DELETION',
  // Invoices
  FORBIDDEN_ALL_INVOICES: 'FORBIDDEN_ALL_INVOICES',
  FORBIDDEN_TEAM_INVOICES: 'FORBIDDEN_TEAM_INVOICES',
  FORBIDDEN_INVOICE_ACCESS: 'FORBIDDEN_INVOICE_ACCESS',
  FORBIDDEN_INVOICE_UPDATE: 'FORBIDDEN_INVOICE_UPDATE',
  FORBIDDEN_INVOICE_DELETE: 'FORBIDDEN_INVOICE_DELETE',
  // Payments
  INVALID_AMOUNT: 'Invalid amount',
  PAYMENT_ALREADY_IN_PROGRESS: 'A payment is already in progress for this cart',
  PAYMENT_DUPLICATE: 'Duplicate payment',
  PAYMENT_NOT_FOUND: 'Payment not found',
  FORBIDDEN_PAYMENT_ACCESS: 'FORBIDDEN_PAYMENT_ACCESS',
  FORBIDDEN_IN_PRODUCTION: 'FORBIDDEN_IN_PRODUCTION',
  // Inventory
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  STOCK_NOT_TRACKED: 'STOCK_NOT_TRACKED',
  INVENTORY_TRANSACTION_FAILED: 'INVENTORY_TRANSACTION_FAILED',
  // FAQs
  FAQ_NOT_FOUND: 'FAQ_NOT_FOUND',
  // Contact
  CAPTCHA_VALIDATION_FAILED: 'CAPTCHA_VALIDATION_FAILED',
  // Generic
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
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
  [ERRORS.CART_EMPTY]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Cart is empty',
  },
  [ERRORS.CART_SESSION_REQUIRED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Une session panier ou un identifiant utilisateur est requis.',
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
  [ERRORS.CATEGORY_SUBCATEGORY_MISMATCH]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Subcategory must belong to the specified category',
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
  [ERRORS.INSUFFICIENT_STOCK]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Insufficient stock available',
  },
  [ERRORS.STOCK_NOT_TRACKED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Stock tracking is not enabled for this product',
  },
  [ERRORS.INVENTORY_TRANSACTION_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Inventory transaction failed',
  },
  [ERRORS.AWS_S3_BUCKET_NOT_CONFIGURED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'AWS S3 bucket name is not configured',
  },
  [ERRORS.FAQ_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'FAQ not found',
  },
  [ERRORS.USER_CREATION_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'User creation failed',
  },
  [ERRORS.REGISTRATION_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Registration failed',
  },
  [ERRORS.INTERNAL_SERVER_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  },
  [ERRORS.USER_ALREADY_EXISTS]: {
    status: HttpStatus.CONFLICT,
    message: 'User already exists',
  },
  // Auth
  [ERRORS.INVALID_OBJECT_ID]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid ObjectId format',
  },
  [ERRORS.INVALID_BUFFER]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid buffer data',
  },
  [ERRORS.INVALID_IMAGE_TYPE]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid image type',
  },
  [ERRORS.INVALID_CREDENTIALS]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid credentials',
  },
  [ERRORS.EMAIL_ALREADY_EXISTS]: {
    status: HttpStatus.CONFLICT,
    message: 'Email already exists',
  },
  [ERRORS.RESET_ALREADY_IN_PROGRESS]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Password reset already in progress',
  },
  [ERRORS.RESET_NOT_REQUESTED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'No password reset was requested',
  },
  [ERRORS.LOCALE_UPDATE_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Failed to update locale',
  },
  [ERRORS.GOOGLE_AUTH_FAILED]: {
    status: HttpStatus.CONFLICT,
    message: 'Google authentication failed',
  },
  // Images
  [ERRORS.ONLY_IMAGE_FILES_ARE_ALLOWED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Only image files are allowed',
  },
  // Products
  [ERRORS.SEARCH_KEYWORD_REQUIRED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Search keyword is required',
  },
  [ERRORS.PRODUCT_CREATION_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Failed to create product',
  },
  [ERRORS.PRODUCT_UPDATE_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Failed to update product',
  },
  [ERRORS.PRODUCT_FETCH_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Failed to fetch products',
  },
  // Reviews
  [ERRORS.USER_ID_MISMATCH]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'User ID does not match',
  },
  [ERRORS.FORBIDDEN_REVIEW_APPROVAL]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Not authorized to approve reviews',
  },
  [ERRORS.FORBIDDEN_REVIEW_REJECTION]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Not authorized to reject reviews',
  },
  [ERRORS.FORBIDDEN_REVIEW_DELETION]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Not authorized to delete reviews',
  },
  // Users
  [ERRORS.FORBIDDEN_USER_ACCESS]: {
    status: HttpStatus.FORBIDDEN,
    message: 'You can only access your own user information',
  },
  [ERRORS.FORBIDDEN_USER_UPDATE]: {
    status: HttpStatus.FORBIDDEN,
    message: 'You can only update your own information',
  },
  [ERRORS.USER_PAYLOAD_MISSING]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'User authentication payload is missing',
  },
  // Invoices
  [ERRORS.FORBIDDEN_ALL_INVOICES]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Not authorized to view all invoices',
  },
  [ERRORS.FORBIDDEN_TEAM_INVOICES]: {
    status: HttpStatus.FORBIDDEN,
    message: "Not authorized to view this team's invoices",
  },
  [ERRORS.FORBIDDEN_INVOICE_ACCESS]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Unauthorized access to this invoice',
  },
  [ERRORS.FORBIDDEN_INVOICE_UPDATE]: {
    status: HttpStatus.FORBIDDEN,
    message: 'You cannot modify this invoice',
  },
  [ERRORS.FORBIDDEN_INVOICE_DELETE]: {
    status: HttpStatus.FORBIDDEN,
    message: 'You cannot delete this invoice',
  },
  // Payments
  [ERRORS.FORBIDDEN_PAYMENT_ACCESS]: {
    status: HttpStatus.FORBIDDEN,
    message: 'You cannot view this payment',
  },
  [ERRORS.FORBIDDEN_IN_PRODUCTION]: {
    status: HttpStatus.FORBIDDEN,
    message: 'This route is not available in production',
  },
  // Contact
  [ERRORS.CAPTCHA_VALIDATION_FAILED]: {
    status: HttpStatus.FORBIDDEN,
    message: 'CAPTCHA validation failed',
  },
};
