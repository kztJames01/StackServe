// auth form validation shared by web + mobile
const { z } = require('zod');

function authFormSchema(type) {
  return z.object({
    firstName: type === 'sign-in' ? z.string().optional() : z.string().min(2),
    lastName: type === 'sign-in' ? z.string().optional() : z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: type === 'sign-in' ? z.string().optional() : z.string().min(6),
  });
}

module.exports = { authFormSchema };
