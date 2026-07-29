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

    // ── Roles ──
    const roles = Object.entries(ROLE_PERMISSIONS).map(([name, permissions]) => ({
      name,
      description: `${name.replace(/_/g, ' ')} role`,
      permissions: permissions.includes('*') ? ['all'] : permissions,
    }));

    for (const role of roles) {
      await Role.findOneAndUpdate({ name: role.name }, role, { upsert: true, new: true });
    }
    console.log(`${roles.length} roles seeded`);

    // ── Single Super Admin only ──
    let superAdmin = await User.findOne({ email: 'superadmin@financeloan.com', isDeleted: { $ne: true } });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Super Admin',
        email: 'vitthal@gmail.com',
        mobile: '9999999999',
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
      console.log('ℹ️ Super Admin already exists: vitthal@gmail.com');
    }

    // ── Admin Users ──
    const adminUsers = [
      {
        name: 'विठ्ठल दारासिंग राठोड',
        email: 'vitthal.rathod@financeloan.com',
        mobile: '8888888801',
        password: 'Vitthal@123',
      },
      {
        name: 'रमेश रामलाल राठोड',
        email: 'ramesh.rathod@financeloan.com',
        mobile: '8888888802',
        password: 'Ramesh@123',
      },
      {
        name: 'भाईदास दगडू चव्हाण',
        email: 'bhaidas.chavan@financeloan.com',
        mobile: '8888888803',
        password: 'Bhaidas@123',
      },
      {
        name: 'युवराज दिलीप राठोड',
        email: 'yuvaraj.rathod@financeloan.com',
        mobile: '8888888804',
        password: 'Yuvaraj@123',
      },
      {
        name: 'विलास शिवदास जाधव',
        email: 'vilas.jadhav@financeloan.com',
        mobile: '8888888805',
        password: 'Vilas@123',
      },
      {
        name: 'राजेंद्र रतिलाल राठोड',
        email: 'rajendra.rathod@financeloan.com',
        mobile: '8888888806',
        password: 'Rajendra@123',
      },
      {
        name: 'भागवत धनसिंग चव्हाण',
        email: 'bhagwat.chavan@financeloan.com',
        mobile: '8888888807',
        password: 'Bhagwat@123',
      },
      {
        name: 'भारत भंगलाल जाधव',
        email: 'bharat.jadhav@financeloan.com',
        mobile: '8888888808',
        password: 'Bharat@123',
      },
    ];

    let adminCount = 0;
    for (const adminData of adminUsers) {
      // Check if admin already exists
      const existingAdmin = await User.findOne({ 
        email: adminData.email, 
        isDeleted: { $ne: true } 
      });
      
      if (!existingAdmin) {
        // Create admin user
        const admin = await User.create({
          name: adminData.name,
          email: adminData.email,
          mobile: adminData.mobile,
          password: adminData.password,
          role: ROLES.ADMIN,
          isActive: true,
          isEmailVerified: true,
          isMobileVerified: true,
          kycCompleted: true,
          commissionRate: 2,
          registrationMethod: 'email',
        });

        // Create profile for admin
        await Profile.create({
          user: admin._id,
          phone: adminData.mobile,
          kycStatus: 'verified',
        });

        adminCount++;
        console.log(`✅ Admin created: ${adminData.email} / ${adminData.password}`);
      } else {
        console.log(`ℹ️ Admin already exists: ${adminData.email}`);
      }
    }

    if (adminCount > 0) {
      console.log(`✅ ${adminCount} new admin users created successfully`);
    } else {
      console.log('ℹ️ No new admin users created (all already exist)');
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
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

seedDatabase();