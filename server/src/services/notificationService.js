// Feature: trello-task-manager, Notification Service
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Invitation from '../models/Invitation.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Board from '../models/Board.js';

// ─── NodeMailer transporter (lazy — reads env vars at call time) ──────────────
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,          // use STARTTLS (required for Gmail port 587)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,  // allow self-signed certs in dev
    },
  });
}

/**
 * Creates an Invitation record and sends an invitation email to the given address.
 *
 * @param {string|ObjectId} boardId   - The board the user is being invited to
 * @param {string|ObjectId} adminId   - The admin sending the invitation
 * @param {string}          email     - The recipient's email address
 * @returns {Promise<void>}
 */
async function sendInvitation(boardId, adminId, email) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now

  const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;

  // ── Try to send email first ───────────────────────────────────────────────
  let emailSent = false;
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "You've been invited to join a board",
      html: `
        <p>You have been invited to join a board on TaskFlow.</p>
        <p>Click the link below to accept the invitation:</p>
        <p><a href="${inviteLink}">${inviteLink}</a></p>
        <p>This invitation expires in 72 hours.</p>
      `,
      text: `You have been invited to join a board. Accept here: ${inviteLink} (expires in 72 hours)`,
    });
    emailSent = true;
  } catch (emailErr) {
    console.error('Invitation email failed:', emailErr.message);
    // Continue — save the invitation anyway so the admin can share the link manually
  }

  // ── Save invitation record ────────────────────────────────────────────────
  await Invitation.create({
    boardId,
    invitedBy: adminId,
    email: email.toLowerCase(),
    token,
    expiresAt,
    used: false,
  });

  // Return the invite link so the frontend can show it if email failed
  return { inviteLink, emailSent };
}

/**
 * Sends a due-date reminder email to all users assigned to the task.
 * Deduplicates by checking task.reminderSent — if already true, returns early.
 *
 * @param {import('mongoose').Document} task - A Mongoose Task document
 * @returns {Promise<void>}
 */
async function sendDueReminder(task) {
  if (task.reminderSent === true) {
    return;
  }

  if (!task.assignees || task.assignees.length === 0) {
    task.reminderSent = true;
    await task.save();
    return;
  }

  // Fetch all assigned users to get their email addresses
  const users = await User.find({ _id: { $in: task.assignees } }).lean();

  const emailPromises = users.map((user) =>
    getTransporter().sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: `Reminder: Task "${task.title}" is due soon`,
      html: `
        <p>This is a reminder that the task <strong>${task.title}</strong> is due within 24 hours.</p>
        ${task.dueDate ? `<p>Due date: ${task.dueDate.toISOString()}</p>` : ''}
      `,
      text: `Reminder: Task "${task.title}" is due within 24 hours.${task.dueDate ? ` Due: ${task.dueDate.toISOString()}` : ''}`,
    })
  );

  await Promise.allSettled(emailPromises);

  task.reminderSent = true;
  await task.save();
}

/**
 * Cron job handler: marks incomplete tasks with past due dates as overdue,
 * and sends due-date reminders for tasks due within the next 24 hours.
 *
 * @returns {Promise<void>}
 */
async function processOverdueTasks() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // ── Mark overdue tasks ────────────────────────────────────────────────────
  const overdueTasks = await Task.find({
    isComplete: false,
    dueDate: { $lt: now },
    isOverdue: false,
  });

  for (const task of overdueTasks) {
    task.isOverdue = true;
    await task.save();
  }

  // ── Send reminders for tasks due within the next 24 hours ─────────────────
  const upcomingTasks = await Task.find({
    isComplete: false,
    dueDate: { $gte: now, $lte: in24Hours },
    reminderSent: false,
  });

  for (const task of upcomingTasks) {
    await sendDueReminder(task);
  }
}

export default { sendInvitation, sendDueReminder, processOverdueTasks };
