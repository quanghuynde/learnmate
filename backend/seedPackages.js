require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./src/models/Package');

async function seedPackages() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const packages = [
    { name: 'Basic', credits: 1000, price: 0, description: 'Gói cơ bản miễn phí', isActive: true },
    { name: 'Pro', credits: 2500, price: 49000, description: 'Gói ôn thi chuyên sâu', isActive: true },
    { name: 'Premium', credits: 5000, price: 69000, description: 'Trải nghiệm không giới hạn', isActive: true },
  ];

  for (const pkg of packages) {
    const result = await Package.findOneAndUpdate({ name: pkg.name }, pkg, { upsert: true, new: true });
    console.log(`- Package: ${result.name}, Price: ${result.price}, Active: ${result.isActive}`);
  }

  console.log('✅ Packages seeded successfully');
  process.exit();
}

seedPackages();
