import dotenv from 'dotenv';
import connectDB from './db.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Profile from '../models/Profile.js';
import Fund from '../models/Fund.js';
import { ROLE_PERMISSIONS, ROLES } from '../config/permissions.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    // ── Roles (only names allowed by Role model enum) ──
    const roleEnum = ['super_admin', 'admin', 'user'];
    const roles = Object.entries(ROLE_PERMISSIONS)
      .filter(([name]) => roleEnum.includes(name))
      .map(([name, permissions]) => ({
        name,
        description: `${name.replace(/_/g, ' ')} role`,
        permissions: permissions.includes('*') ? ['all'] : permissions,
      }));

    for (const role of roles) {
      await Role.findOneAndUpdate({ name: role.name }, role, { upsert: true, new: true });
    }
    console.log(`${roles.length} roles seeded`);

    // ── Base Super Admin only ──
    let superAdmin = await User.findOne({
      $or: [
        { email: 'vitthal@gmail.com' },
        { email: 'superadmin@financeloan.com' },
      ],
      role: ROLES.SUPER_ADMIN,
      isDeleted: { $ne: true },
    });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Super Admin',
        email: 'vitthal@gmail.com',
        mobile_number: '9999999999',
        password: 'Vitthal@123',
        role: ROLES.SUPER_ADMIN,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        kycCompleted: true,
      });
      await Profile.create({
        user: superAdmin._id,
        phone: '9999999999',
        kycStatus: 'verified',
      });
      console.log('✅ Super Admin created: vitthal@gmail.com / Vitthal@123');
    } else {
      console.log('ℹ️ Super Admin already exists:', superAdmin.email);
    }

    // ── Company Fund ──
    const fundExists = await Fund.findOne();
    if (!fundExists) {
      const initial = parseFloat(process.env.COMPANY_INITIAL_FUND) || 1000000;
      await Fund.create({
        companyFund: initial,
        openingBalance: initial,
        availableFund: initial,
        bankBalance: initial,
        cashInHand: 0,
      });
      console.log(`✅ Company fund initialized: ₹${initial}`);
    } else {
      console.log('ℹ️ Company fund already exists');
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  Super Admin: vitthal@gmail.com / Vitthal@123');
    console.log('══════════════════════════════════════════════');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

seedDatabase();
