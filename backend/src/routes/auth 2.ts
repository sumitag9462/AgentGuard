import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Organization } from '../models/Organization';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

router.post('/register', async (req, res) => {
  try {
    const { email, password, orgName } = req.body;
    
    if (!email || !password || !orgName) {
      return res.status(400).json({ error: 'Missing required fields: email, password, orgName' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    let org = await Organization.findOne({ name: orgName });
    if (!org) {
      org = new Organization({ name: orgName });
      await org.save();
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      email,
      passwordHash,
      organizationId: org._id,
      role: 'OWNER' // First user in org is OWNER
    });

    await user.save();
    
    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, organizationId: user.organizationId, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { email: user.email, role: user.role, organizationId: user.organizationId } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
