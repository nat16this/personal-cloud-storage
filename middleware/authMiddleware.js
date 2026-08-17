const supabase = require("../config/supabase");

const authenticateUser = async (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header is missing."
            });
        }

        const [scheme, token] = authHeader.split(" ");

        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({
                success: false,
                message: "Invalid Authorization header format."
            });
        }

        const {
            data: { user },
            error
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.log("Authentication error:", error);

            return res.status(401).json({
                success: false,
                message: "Invalid or expired access token."
            });
        }

        req.user = user;

        next();

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Authentication failed."
        });

    }
};

module.exports = authenticateUser;