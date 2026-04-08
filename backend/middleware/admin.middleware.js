const adminOnly = async (req, res, next) => {
    try {
        console.log('Admin only middleware triggered, req.user:', req.user);
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }
        next();
    } catch (error) {
        next(error);
    }
};

export default adminOnly;