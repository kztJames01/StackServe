import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../models/user.models.js";

export const signUp = async (req, res, next) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const { firstName, lastName, email, password: plainPassword, confirmPassword: plainPassword2 } = req.body;
        const existingUser = await UserModel.findOne({ email });

        if(plainPassword !== plainPassword2){
            const error = new Error("Passwords do not match");
            error.status = 400;
            throw error;
        }

        if(existingUser){
            const error = new Error("User already exists");
            error.status = 409;
            throw error;
        }

        //Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        const newUser = await UserModel.create([{
            firstName,
            lastName,
            email,
            password: hashedPassword
        }], { session });

        const token = jwt.sign(
            { userId: newUser[0]._id, role: newUser[0].role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE_TIME }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict'
        });

        await session.commitTransaction();

        // Remove password from response
        const userResponse = newUser[0].toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: {
                user: userResponse,
                token
            }
        });
        session.endSession();
    } catch (error) {
        console.log("Error in signUp: ", error);
        if (session) {
            await session.abortTransaction();
        }
        next(error);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

export const signIn = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new Error('Please provide email and password');
        }

        // Check if user exists
        const user = await UserModel.findOne({ email });
        if (!user) {
            const error = new Error("User not found");
            error.status = 401;
            throw error;
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = new Error("Invalid credentials");
            error.status = 401;
            throw error;
        }

        // Create token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE_TIME }
        );
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict'
        });
        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

export const signOut = async (req, res) => {
    res.status(200).json({
        success: true,
        message: "User logged out successfully"
    });
};

export const adminSignIn = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new Error('Please provide email and password');
        }

        // Check if user exists and is admin
        const user = await UserModel.findOne({ email });
        if (!user || user.role !== 'admin') {
            const error = new Error("Not authorized as admin");
            error.status = 401;
            throw error;
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = new Error("Invalid credentials");
            error.status = 401;
            throw error;
        }

        // Create token with admin role
        const token = jwt.sign(
            { 
                userId: user._id,
                role: user.role  // Include role in token
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE_TIME }
        );

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({
            success: true,
            message: "Admin logged in successfully",
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

