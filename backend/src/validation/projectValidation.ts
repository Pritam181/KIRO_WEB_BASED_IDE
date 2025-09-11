import Joi from 'joi';

export const createProjectSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Project name is required',
      'string.min': 'Project name must be at least 1 character long',
      'string.max': 'Project name must be less than 100 characters',
      'any.required': 'Project name is required'
    }),
  
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be less than 500 characters'
    })
});

export const updateProjectSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Project name cannot be empty',
      'string.min': 'Project name must be at least 1 character long',
      'string.max': 'Project name must be less than 100 characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be less than 500 characters'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const shareProjectSchema = Joi.object({
  collaboratorId: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Collaborator ID is required',
      'any.required': 'Collaborator ID is required'
    }),
  
  permissions: Joi.object({
    canRead: Joi.boolean().default(true),
    canWrite: Joi.boolean().default(true),
    canDelete: Joi.boolean().default(false),
    canShare: Joi.boolean().default(false)
  }).default({
    canRead: true,
    canWrite: true,
    canDelete: false,
    canShare: false
  })
});