import Joi from 'joi';

export const deleteBookmarkParamsSchema = Joi.object<{ id: string }>({
  id: Joi.string().hex().length(24).required()
});
