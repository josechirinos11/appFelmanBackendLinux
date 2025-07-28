const express = require('express');
const pool = require('../config/databaseTerminales');

const router = express.Router();

router.get('/inicio', async (req, res, next) => {
  try {
    const [result] = await pool.execute(`
      SHOW TABLES
    `);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;