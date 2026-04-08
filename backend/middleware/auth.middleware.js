import jwt from 'jsonwebtoken'

import { JWT_SECRET } from '../config/env.js';
import User from '../models/user.models.js';

const authorize = async (req, res, next) => {
    try {
        console.log('Authorization middleware triggered');
        
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            console.log('Token received from header:', token ? `${token.slice(0, 10)}...` : 'none');
        } else if (req.cookies.token) {
            token = req.cookies.token;
            console.log('Token received from cookie:', token ? `${token.slice(0, 10)}...` : 'none');
        } else {
            return res.status(401).json({ message: 'Not authorized, token missing' });
        }

        console.log('Verifying token with secret:', process.env.JWT_SECRET ? 'exists' : 'missing');
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded token:', decoded);

        const user = await User.findById(decoded.userId);
        console.log('Database user found:', user ? {
            _id: user._id,
            email: user.email,
            role: user.role
        } : 'none');

        if(!user) {
            console.log('User not found in database');
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }

        // Add role from token to the request
        req.user = {
            ...user.toObject(),
            role: decoded.role || user.role // Use role from token or fallback to database role
        };
        console.log('Final user object:', req.user);

        next();
    } catch (error) {
        console.error('Authorization error:', error.message);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};


export default authorize;
