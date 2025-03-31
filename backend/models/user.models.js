import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First Name is required'],
        trim: true,
        minlength: [3, 'First Name must be at least 3 characters long'],
        maxlength: [50, 'First Name must be at most 50 characters long']
    },
    lastName: {
        type: String,
        required: [true, 'Last Name is required'],
        trim: true,
        minlength: [3, 'Last Name must be at least 3 characters long'],
        maxlength: [50, 'Last Name must be at most 50 characters long']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, { timestamps: true }
);

const UserModel = mongoose.model("User", userSchema);
export default UserModel;