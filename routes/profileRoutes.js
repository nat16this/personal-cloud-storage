const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// GET PROFILE
// GET /api/profile
// =====================================================

router.get(
    "/",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("👤 GET PROFILE ROUTE HIT");
            console.log("👤 USER ID:", req.user.id);

            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const {
                data: profile,
                error
            } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", req.user.id)
                .maybeSingle();

            if (error) {

                console.error("GET PROFILE ERROR:", error);

                return res.status(400).json({
                    success: false,
                    message: error.message
                });

            }

            return res.json({
                success: true,
                profile
            });

        } catch (err) {

            console.error("GET PROFILE SERVER ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);


// =====================================================
// UPDATE PROFILE
// PATCH /api/profile
// =====================================================

router.patch(
    "/",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("✏️ UPDATE PROFILE ROUTE HIT");

            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const {
                display_name
            } = req.body;

            const {
                data: profile,
                error
            } = await supabase
                .from("profiles")
                .update({
                    display_name: display_name || null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", req.user.id)
                .select()
                .maybeSingle();

            if (error) {

                console.error("UPDATE PROFILE ERROR:", error);

                return res.status(400).json({
                    success: false,
                    message: error.message
                });

            }

            return res.json({
                success: true,
                message: "Profile updated successfully.",
                profile
            });

        } catch (err) {

            console.error("UPDATE PROFILE SERVER ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);


module.exports = router;