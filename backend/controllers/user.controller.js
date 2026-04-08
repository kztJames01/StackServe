import UserModel from "../models/user.models.js";
import bcrypt from "bcryptjs";

export const getUsers = async (req, res, next) => {
    try {
        const users = await UserModel.find();
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
}

export const getUser = async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.params.id).select('-password');

        if(!user){
            const error = new Error("User not found");
            error.status = 404;
            throw error;
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
}

export const updateUser = async (req, res, next) => {
    try {
        const {firstName, lastName, email, password: plainPassword} = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        const user = await UserModel.findByIdAndUpdate(req.params.id, {
            name,
            email,
            password: hashedPassword
        }, {
            new: true,
            runValidators: true
        })

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: "User updated successfully",
            data: {
                user: userResponse
            }
        });
    } catch (error) {
        next(error);
    }
}

export const deleteUser = async (req, res, next) => {
    try {
        const user = await UserModel.findByIdAndDelete(req.params.id);
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
}