const errorMiddleware = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    console.log(error);

    // Mongoose bad objectID
    if (err.name === "CastError") {
        error.message = "Resource not found";
        error.status = 404;
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        error.message = "Duplicate field value entered";
        error.status = 400;
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
        error.message = Object.values(err.errors).map((el) => el.message);
        error.status = 400;
    }

    res.status(error.status || 500).json({ 
        success: false, 
        error: error.message || "Server Error" 
    });
}

export default errorMiddleware;