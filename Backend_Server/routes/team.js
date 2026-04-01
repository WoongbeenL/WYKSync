/*
 * File Name    : team.js
 * Project      : PROG3221 - Capstone Project
 * Programmers  : Will Lee
 * Date         : 3/4/2026
 * Description  : This is a js file to handle /team route.
 */

const express = require("express");
const router = express.Router();

const supabase = require("../lib/supabase");
const cloudinary = require("../lib/cloudinary");
const requireUser = require("../middleware/requireUser");
const upload = require("../middleware/upload");

router.use(requireUser);

// -----------------------------------------------------------------
// Helper functions

/*
   Function Name   : generateJoinCode
   Parameter    : N/A
   Return       : String: Random 6 characters
   Purpose      : This function creates a random join code.
*/
const generateJoinCode = async () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  while (true) {
    const join_code = Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join("");

    const { data: existing } = await supabase
      .from("teams")
      .select("join_code")
      .eq("join_code", join_code)
      .maybeSingle();

    if (!existing) return join_code;
  }
};

/*
   Function Name   : isTeamCoach
   Parameter    : userId: UUID. Id of the user to check for
                  teamId: INT. Id of the team to check for
   Return       : Boolean. Return true if data exists and error is false. Else, return false.
   Purpose      : This function checks if the user is a coach of the team.
*/
const isTeamCoach = async (userId, teamId) => {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_member_id")
    .eq("id", userId)
    .eq("team_id", teamId)
    .eq("role", "coach")
    .maybeSingle();

  return Boolean(data) && !error;
};

/*
   Function Name   : uploadToCloudinary
   Parameter    : fileBuffer: Buffer. Image file buffer from multer.
                  folder: String. Cloudinary folder to upload to.
   Return       : Object: { url, public_id }
   Purpose      : Uploads an image buffer to Cloudinary and returns
                  the secure URL and public_id.
*/
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 256, height: 256, crop: "fill" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      },
    );

    stream.end(fileBuffer);
  });
};

/*
   Function Name   : deleteFromCloudinary
   Parameter    : logoUrl: String. Cloudinary URL of the image to delete.
   Return       : void
   Purpose      : Deletes an image from Cloudinary by extracting its public_id
                  from the URL. Logs but does not throw on failure.
*/
const deleteFromCloudinary = async (logoUrl) => {
  try {
    const parts = logoUrl.split("/");
    const fileWithExt = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    const publicId = `${folder}/${fileWithExt.split(".")[0]}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // Log but don't throw — a failed delete shouldn't block the operation
    console.error("Cloudinary delete error: ", err);
  }
};

// -----------------------------------------------------------------
// Routes

/*
   Route Name   : GET /team
   Parameter    : Request object with a join code
   Return       : Json response
                  team: Object. Returns team data.
   Purpose      : Returns a team by the join code.
*/
router.get("/", async (req, res) => {
  try {
    const { join_code } = req.query;

    if (!join_code) {
      return res
        .status(400)
        .json({ error: "join_code query parameter is required" });
    }

    const { data: team, error } = await supabase
      .from("teams")
      .select("*")
      .eq("join_code", join_code.toUpperCase())
      .single();

    if (error || !team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ team });
  } catch (err) {
    console.error("GET /team error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /team
   Parameter    : Request object with current user id
                  name: String. Team name.
                  tricode: String. Team tricode. Max 5 characters.
                  logo: File. (optional) Team logo image.
   Return       : Json response
                  team: Object. Returns the created team.
   Purpose      : Creates a new team and assigns the creator as coach
                  in team_members. Optionally uploads a logo to Cloudinary.
*/
router.post("/", upload.single("logo"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, tricode } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }

    if (!tricode || !tricode.trim()) {
      return res.status(400).json({ error: "Tricode is required" });
    }

    const trimmedTricode = tricode.trim().toUpperCase();

    if (trimmedTricode.length > 5) {
      return res
        .status(400)
        .json({ error: "Tricode must be 5 characters or fewer" });
    }

    // Check if the user is onboarded
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_onboarded")
      .eq("id", userId)
      .single();

    if (!profile?.is_onboarded) {
      return res.status(403).json({
        error: "You must complete your profile before creating a team",
      });
    }

    // Check user is not already on a team
    const { data: currentMember } = await supabase
      .from("team_members")
      .select("team_member_id")
      .eq("id", userId)
      .maybeSingle();

    if (currentMember) {
      return res
        .status(409)
        .json({ error: "You are already a member of a team" });
    }

    const join_code = await generateJoinCode();

    // Upload logo to Cloudinary if provided
    let logo_url = null;
    let logo_public_id = null;

    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "team_logos");
      logo_url = uploaded.url;
      logo_public_id = uploaded.public_id;
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        tricode: trimmedTricode,
        join_code,
        ...(logo_url && { logo_url }),
      })
      .select()
      .single();

    if (teamError) {
      // Delete uploaded logo if team creation fails
      if (logo_public_id) {
        await cloudinary.uploader.destroy(logo_public_id);
      }
      if (teamError.code === "23505") {
        return res
          .status(409)
          .json({ error: "A team with this name already exists" });
      }
      throw teamError;
    }

    const { error: memberError } = await supabase.from("team_members").insert({
      id: userId,
      team_id: team.team_id,
      role: "coach",
    });

    if (memberError) {
      // Delete the team and logo if coach assignment fails
      await supabase.from("teams").delete().eq("team_id", team.team_id);
      if (logo_public_id) {
        await cloudinary.uploader.destroy(logo_public_id);
      }
      throw memberError;
    }

    res.status(201).json({ team });
  } catch (err) {
    console.error("POST /team error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /team/join
   Parameter    : Request object with current user id
                  join_code: String. Team join code.
   Return       : Json response
                  member: Object. Returns the created team_member row.
   Purpose      : Allows onboarded users to join a team using the join code.
*/
router.post("/join", async (req, res) => {
  try {
    const userId = req.user.id;
    const { join_code } = req.body;

    if (!join_code || !join_code.trim()) {
      return res.status(400).json({ error: "join_code is required" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_onboarded")
      .eq("id", userId)
      .single();

    if (!profile?.is_onboarded) {
      return res.status(403).json({
        error: "You must complete your profile before joining a team",
      });
    }

    // Look up the team by join code
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("team_id")
      .eq("join_code", join_code.toUpperCase())
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Insert user into team_members as a player
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .insert({
        id: userId,
        team_id: team.team_id,
        role: "player",
      })
      .select()
      .single();

    if (memberError) {
      // User is already on a team (unique constraint on id)
      if (memberError.code === "23505") {
        return res
          .status(409)
          .json({ error: "You are already a member of a team" });
      }
      throw memberError;
    }

    res.status(201).json({ member });
  } catch (err) {
    console.error("POST /team/join error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : PATCH /team/:team_id
   Parameter    : Request object with current user id
                  team_id: Int. Team ID.
                  name: String. (optional) New team name.
                  tricode: String. (optional) New tricode.
                  logo: File. (optional) New team logo image.
   Return       : Json response
                  team: Object. Returns the updated team.
   Purpose      : Updates a team's details. If a new logo is uploaded,
                  the old one is deleted from Cloudinary. Coach only.
*/
router.patch("/:team_id", upload.single("logo"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { team_id } = req.params;
    const { name, tricode } = req.body;

    const isCoach = await isTeamCoach(userId, team_id);
    if (!isCoach) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!name && !tricode && !req.file) {
      return res.status(400).json({
        error: "At least one field (name, tricode, logo) is required",
      });
    }

    if (tricode !== undefined) {
      const trimmedTricode = tricode.trim().toUpperCase();
      if (!trimmedTricode) {
        return res.status(400).json({ error: "Tricode cannot be empty" });
      }
      if (trimmedTricode.length > 5) {
        return res
          .status(400)
          .json({ error: "Tricode must be 5 characters or fewer" });
      }
    }

    // Fetch current team to get existing logo_url
    const { data: currentTeam, error: fetchError } = await supabase
      .from("teams")
      .select("logo_url")
      .eq("team_id", team_id)
      .single();

    if (fetchError || !currentTeam) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Upload new logo if provided
    let logo_public_id = null;
    const updates = {};

    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "team_logos");
      updates.logo_url = uploaded.url;
      logo_public_id = uploaded.public_id;
    }

    if (name) updates.name = name.trim();
    if (tricode) updates.tricode = tricode.trim().toUpperCase();

    const { data: team, error } = await supabase
      .from("teams")
      .update(updates)
      .eq("team_id", team_id)
      .select()
      .single();

    if (error) {
      // Delete newly uploaded logo if DB update fails
      if (logo_public_id) {
        await cloudinary.uploader.destroy(logo_public_id);
      }
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Team not found" });
      }
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "A team with this name already exists" });
      }
      throw error;
    }

    // Delete old logo from Cloudinary after successful DB update
    if (req.file && currentTeam.logo_url) {
      await deleteFromCloudinary(currentTeam.logo_url);
    }

    res.json({ team });
  } catch (err) {
    console.error("PATCH /team/:team_id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : DELETE /team/:team_id
   Parameter    : Request object with current user id
                  team_id: Int. Team ID.
   Return       : Json response
                  message: String. Success message.
   Purpose      : Deletes a team and its logo from Cloudinary. Coach only.
*/
router.delete("/:team_id", async (req, res) => {
  try {
    const userId = req.user.id;
    const team_id = parseInt(req.params.team_id);

    if (isNaN(team_id)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }

    const isCoach = await isTeamCoach(userId, team_id);
    if (!isCoach) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Fetch logo_url before deleting
    const { data: team, error: fetchError } = await supabase
      .from("teams")
      .select("logo_url")
      .eq("team_id", team_id)
      .single();

    if (fetchError || !team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("team_id", team_id);

    if (error) throw error;

    // Delete logo from Cloudinary if it exists
    if (team.logo_url) {
      await deleteFromCloudinary(team.logo_url);
    }

    res.json({ message: "Team deleted successfully" });
  } catch (err) {
    console.error("DELETE /team/:team_id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
