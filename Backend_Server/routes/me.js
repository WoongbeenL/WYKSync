/*
* Filename     : me.js
* Project      : PROG3221 - Capstone Project
* Programmers  : Will Lee
* Date         : 2/17/2026
* Description  : This is a js file to handle /me route.
*/

const express = require('express');
const router = express.Router;

const supabase = require('../lib/supabase');
const requireUser = require('../middleware/requireUser');

