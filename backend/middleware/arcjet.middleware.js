import aj from "../config/arcjet.js"

const arcjetMiddleware = async (req, res, next) => {
    try{
        const decision = await aj.protect(req, { requested: 1 }); // Deduct 5 tokens from the bucket
        console.log("Arcjet decision", decision);

        if (decision.isDenied()) { 
            if (decision.reason.isRateLimit()) {
                return res.status(429).json({ message: "Too Many Requests" });
            }else if (decision.reason.isBot()) {
                return res.status(403).json({ message: "No bots allowed" });
            }else{
                return res.status(403).json({ message: "Forbidden" });
            }
        }
        next();
    }catch(error){
        next(error);
    }
}

export default arcjetMiddleware;