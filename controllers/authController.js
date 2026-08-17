// console.log("🔥 authController.js has been loaded!");
// const supabase = require("../config/supabase");

// const signup = async (req, res) => {
//     console.log("✅ authController reached!");
//     console.log(req.body);

//     try {
//         const { email, password } = req.body;

//         if (!email || !password) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Email and password are required."
//             });
//         }

//         const { data, error } = await supabase.auth.signUp({
//             email,
//             password
//         });

//         if (error) {
//             return res.status(400).json({
//                 success: false,
//                 message: error.message
//             });
//         }

//         res.status(201).json({
//             success: true,
//             message: "User created successfully!",
//             user: data.user
//         });

//     } catch (err) {
//         console.error(err);

//         res.status(500).json({
//             success: false,
//             message: err.message
//         });
//     }
// };

// module.exports = {
//     signup,
//     login
// };




console.log("🔥 authController.js has been loaded!");

const supabase = require("../config/supabase");

const { createClient } = require("@supabase/supabase-js");

const adminSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const signup = async (req, res) => {
    console.log("✅ authController reached!");
    console.log(req.body);

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(201).json({
            success: true,
            message: "User created successfully!",
            user: data.user
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// LOGIN CONTROLLER
const login = async (req, res) => {
    console.log("✅ login controller reached!");
    console.log(req.body);

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(200).json({
            success: true,
            message: "Login successful!",
            session: data.session,
            user: data.user
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// CHANGE PASSWORD CONTROLLER
const changePassword = async (req, res) => {
    console.log("🔐 CHANGE PASSWORD ROUTE HIT");

    try {
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password is required."
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });
        }

        // req.user.id was already verified by authenticateUser
        const userId = req.user.id;

        const { data, error } =
            await adminSupabase.auth.admin.updateUserById(
                userId,
                {
                    password: newPassword
                }
            );

        if (error) {
            console.error("CHANGE PASSWORD ERROR:", error);

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.log("✅ Password changed successfully for:", userId);

        return res.json({
            success: true,
            message: "Password changed successfully."
        });

    } catch (err) {

        console.error(
            "CHANGE PASSWORD SERVER ERROR:",
            err
        );

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
};
module.exports = {
    signup,
    login,
    changePassword
};