/*
* File Name    : me.js
* Project      : PROG3221 - Capstone Project
* Programmers  : Will Lee
* Date         : 2/17/2026
* Description  : This is a js file to handle /me route.
*/

const express = require('express');
const router = express.Router;

const supabase = require('../lib/supabase');
const requireUser = require('../middleware/requireUser');

router.use(requireUser);

/*
   Route Name   : GET /me
   Parameter    : Request object with current user id
   Return       : Json response
                  id: UUID. User ID
                  display name: CITEXT. Display Name
                  is_onboarded: Boolean. Has user been onboarded?
                  created_at: Timestampz. When profile was created
                  updated_at: Timestampz. When profile was updated
*/
router.get('/', async (req, res) => {
    const { data, error } = await supabase
    .from('profile')
    .select('id, display_name, is_onboarded, created_at,updated_at')
    .eq('id',req.user.id)
    .single();

    if (error) {
        console.error(error);
        return res.status(500).send('Failed to fetch profile');
    }

    res.json(data);
});

module.exports = router;