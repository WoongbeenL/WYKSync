/*
* Filename     : supabase.js
* Project      : PROG3221 - Capstone Project
* Programmers  : Will Lee
* Date         : 2/17/2026
* Description  : This is a js file that creates a supabase module to be used by middleware and routes.
*/

const { createClient } = require("@supabase/supabase-js")

// Using createClient function from Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Export to be used in other files
module.exports = supabase;