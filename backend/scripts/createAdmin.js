import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import mongoose from 'mongoose';
import UserModel from '../models/user.models.js';

// Load env vars
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

const createAdmin = async () => {
    try {
        // Connect to DB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected...');

        const adminData = {
            name: 'Admin User' ,
            email: 'shit@admin.com',
            password: 'kztjames01@Ssw',
            role: 'admin'
        };

        // Hash password
        const salt = await bcrypt.genSalt(10);
        adminData.password = await bcrypt.hash(adminData.password, salt);

        // Check if admin exists
        const existingAdmin = await UserModel.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Create admin
        const admin = await UserModel.create(adminData);
        console.log('Admin user created:', admin);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createAdmin();
