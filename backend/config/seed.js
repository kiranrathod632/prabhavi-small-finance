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
      console.log('ℹ️ Super Admin already exists:', superAdmin.email);
    }

    // ── Admin Users (Prabhavi Small Finance — महाराष्ट्र पाचोरा, स्थापना ४ जुलै २०१९) ──
    const adminUsers = [
      {
        name: 'विठ्ठल दारासिंग राठोड',
        designation: 'अध्यक्ष',
        email: 'vitthal.rathod@financeloan.com',
        mobile: '8407912252',
        password: 'Vitthal@123',
      },
      {
        name: 'रमेश रामलाल राठोड',
        designation: 'उपाध्यक्ष',
        email: 'ramesh.rathod@financeloan.com',
        mobile: '8459050109',
        password: 'Ramesh@123',
      },
      {
        name: 'भाईदास दगडू चव्हाण',
        designation: 'सदस्य',
        email: 'bhaidas.chavan@financeloan.com',
        mobile: '7498502572',
        password: 'Bhaidas@123',
      },
      {
        name: 'युवराज दिलीप राठोड',
        designation: 'सदस्य',
        email: 'yuvaraj.rathod@financeloan.com',
        mobile: '8080178939',
        password: 'Yuvaraj@123',
      },
      {
        name: 'विलास शिवदास जाधव',
        designation: 'सदस्य',
        email: 'vilas.jadhav@financeloan.com',
        mobile: '9322361650',
        password: 'Vilas@123',
      },
      {
        name: 'राजेंद्र रतिलाल राठोड',
        designation: 'सदस्य',
        email: 'rajendra.rathod@financeloan.com',
        mobile: '9529817258',
        password: 'Rajendra@123',
      },
      {
        name: 'भागवत धनसिंग चव्हाण',
        designation: 'सदस्य',
        email: 'bhagwat.chavan@financeloan.com',
        mobile: '7875048923',
        password: 'Bhagwat@123',
      },
      {
        name: 'भारत भंगलाल जाधव',
        designation: 'सदस्य',
        email: 'bharat.jadhav@financeloan.com',
        mobile: '7822026084',
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
        console.log(`✅ Admin created: ${adminData.name} (${adminData.designation}) — ${adminData.email} / ${adminData.password} — Mobile: ${adminData.mobile}`);
      } else {
        // Update mobile number if it changed
        if (existingAdmin.mobile !== adminData.mobile) {
          existingAdmin.mobile = adminData.mobile;
          await existingAdmin.save();
          console.log(`🔄 Admin mobile updated: ${adminData.email} → ${adminData.mobile}`);
        } else {
          console.log(`ℹ️ Admin already exists: ${adminData.email}`);
        }
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
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  प्रभावी स्मॉल फायनान्स — Prabhavi Small Finance');
    console.log('  📍 महाराष्ट्र पाचोरा · स्थापना ४ जुलै २०१९');
    console.log('══════════════════════════════════════════════');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

seedDatabase();
