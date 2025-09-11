import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { createError } from './errorHandler'

export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body)
    if (error) {
      return next(createError(error.details[0].message, 400))
    }
    next()
  }
}

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query)
    if (error) {
      return next(createError(error.details[0].message, 400))
    }
    next()
  }
}

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params)
    if (error) {
      return next(createError(error.details[0].message, 400))
    }
    next()
  }
}

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return validateBody(schema)
}