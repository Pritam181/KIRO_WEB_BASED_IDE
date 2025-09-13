import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Schema for creating a repository
const createRepositorySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Repository name can only contain letters, numbers, dots, hyphens, and underscores',
      'string.min': 'Repository name must be at least 1 character long',
      'string.max': 'Repository name cannot exceed 100 characters'
    }),
  description: Joi.string()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  private: Joi.boolean()
    .default(false)
    .optional(),
  autoInit: Joi.boolean()
    .default(true)
    .optional()
});

// Schema for pushing files to GitHub
const githubPushSchema = Joi.object({
  owner: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Owner name is required',
      'string.max': 'Owner name cannot exceed 100 characters'
    }),
  repo: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Repository name is required',
      'string.max': 'Repository name cannot exceed 100 characters'
    }),
  files: Joi.array()
    .items(
      Joi.object({
        path: Joi.string()
          .min(1)
          .max(500)
          .required()
          .messages({
            'string.min': 'File path is required',
            'string.max': 'File path cannot exceed 500 characters'
          }),
        content: Joi.string()
          .required()
          .messages({
            'string.base': 'File content must be a string'
          })
      })
    )
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one file is required',
      'array.max': 'Cannot push more than 100 files at once'
    }),
  message: Joi.string()
    .min(1)
    .max(500)
    .when('autoGenerateMessage', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.min': 'Commit message is required when not auto-generating',
      'string.max': 'Commit message cannot exceed 500 characters'
    }),
  branch: Joi.string()
    .min(1)
    .max(100)
    .default('main')
    .optional()
    .messages({
      'string.min': 'Branch name cannot be empty',
      'string.max': 'Branch name cannot exceed 100 characters'
    }),
  autoGenerateMessage: Joi.boolean()
    .default(false)
    .optional()
});

// Middleware to validate create repository request
export const validateCreateRepository = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = createRepositorySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_001',
      details: errors
    });
  }

  req.body = value;
  return next();
};

// Middleware to validate GitHub push request
export const validateGitHubPush = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = githubPushSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_002',
      details: errors
    });
  }

  // Additional validation for file paths
  const invalidPaths = value.files.filter((file: any) => {
    // Check for dangerous paths
    const path = file.path;
    return (
      path.includes('..') || // No parent directory traversal
      path.startsWith('/') || // No absolute paths
      path.includes('\\') || // No Windows-style paths
      path.length === 0 // No empty paths
    );
  });

  if (invalidPaths.length > 0) {
    return res.status(400).json({
      error: 'Invalid file paths detected',
      code: 'VALIDATION_003',
      details: invalidPaths.map((file: any) => ({
        field: 'files.path',
        message: `Invalid file path: ${file.path}`
      }))
    });
  }

  // Check for duplicate file paths
  const paths = value.files.map((file: any) => file.path);
  const duplicates = paths.filter((path: string, index: number) => paths.indexOf(path) !== index);
  
  if (duplicates.length > 0) {
    return res.status(400).json({
      error: 'Duplicate file paths detected',
      code: 'VALIDATION_004',
      details: duplicates.map((path: string) => ({
        field: 'files.path',
        message: `Duplicate file path: ${path}`
      }))
    });
  }

  req.body = value;
  return next();
};