/*
* Filename     : supabase.js
* Project      : PROG3221 - Capstone Project
* Programmers  : Will Lee
* Date         : 2/17/2026
* Description  : This is a js file that creates a supabase module to be used by middleware and routes.
*/

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Ensure Supabase URL and Supabase Anon Key exists as env variables
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase Environment Variables');
}

// Using createClient function from Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Export to be used in other files
module.exports = supabase;