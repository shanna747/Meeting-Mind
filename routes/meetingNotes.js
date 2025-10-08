const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const MeetingNote = require('../models/MeetingNote');

// Create a new meeting session
router.post('/start', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { title } = req.body;

    const meetingNote = new MeetingNote({
      userId: user.id,
      title: title || `Meeting - ${new Date().toLocaleString()}`,
      startTime: new Date(),
      status: 'active'
    });

    await meetingNote.save();

    res.json({
      success: true,
      meetingId: meetingNote._id,
      meeting: meetingNote
    });
  } catch (error) {
    console.error('Error starting meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a question to an active meeting
router.post('/:meetingId/questions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { meetingId } = req.params;
    const { question, answered, answer, sourceDocument, needsDocumentation } = req.body;

    const meetingNote = await MeetingNote.findOne({
      _id: meetingId,
      userId: user.id
    });

    if (!meetingNote) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    meetingNote.addQuestion({
      question,
      answered: answered || false,
      answer: answer || '',
      sourceDocument: sourceDocument || '',
      needsDocumentation: needsDocumentation || !answered,
      timestamp: new Date()
    });

    await meetingNote.save();

    res.json({
      success: true,
      meeting: meetingNote
    });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: error.message });
  }
});

// End a meeting session
router.post('/:meetingId/end', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { meetingId } = req.params;
    const { transcript } = req.body;

    const meetingNote = await MeetingNote.findOne({
      _id: meetingId,
      userId: user.id
    });

    if (!meetingNote) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    meetingNote.completeMeeting();
    if (transcript) {
      meetingNote.transcript = transcript;
    }

    await meetingNote.save();

    res.json({
      success: true,
      meeting: meetingNote
    });
  } catch (error) {
    console.error('Error ending meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all meeting notes for a user
router.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { status } = req.query;

    const query = { userId: user.id };
    if (status) {
      query.status = status;
    }

    const meetings = await MeetingNote.find(query)
      .sort({ startTime: -1 })
      .limit(50);

    res.json({
      meetings,
      total: meetings.length
    });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific meeting note
router.get('/:meetingId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { meetingId } = req.params;

    const meeting = await MeetingNote.findOne({
      _id: meetingId,
      userId: user.id
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({ meeting });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update meeting title
router.put('/:meetingId/title', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { meetingId } = req.params;
    const { title } = req.body;

    const meeting = await MeetingNote.findOne({
      _id: meetingId,
      userId: user.id
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    meeting.title = title;
    await meeting.save();

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Error updating meeting title:', error);
    res.status(500).json({ error: error.message });
  }
});

// Archive a meeting
router.post('/:meetingId/archive', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { meetingId } = req.params;

    const meeting = await MeetingNote.findOne({
      _id: meetingId,
      userId: user.id
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    meeting.status = 'archived';
    await meeting.save();

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Error archiving meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a meeting
router.delete('/:meetingId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { meetingId } = req.params;

    const result = await MeetingNote.deleteOne({
      _id: meetingId,
      userId: user.id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
