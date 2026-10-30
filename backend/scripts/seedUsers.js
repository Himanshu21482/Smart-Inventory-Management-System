/**
 * Node script to seed/re-hash initial system users with fresh bcrypt hashes.
 * Run with: npm run seed:users
 */
const bcrypt = require('bcryptjs');
const pool = require('../db');

async function seedUsers() {
  console.log('Seeding users with bcrypt hashes...');
  try {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const userPasswordHash = await bcrypt.hash('user123', 10);

    // Update or insert admin
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, role)
       VALUES (1, 'admin', 'admin@inventorysystem.local', ?, 'ADMIN')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)`,
      [adminPasswordHash]
    );

    // Update or insert staff user
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, role)
       VALUES (3, 'staff_john', 'john.doe@inventory.local', ?, 'USER')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)`,
      [userPasswordHash]
    );

    console.log('Successfully updated seed user credentials:');
    console.log(' - Admin: username="admin", password="admin123", role="ADMIN"');
    console.log(' - Staff: username="staff_john", password="user123", role="USER"');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
