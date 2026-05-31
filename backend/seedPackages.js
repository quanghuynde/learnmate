require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./src/models/Package');

async function seedPackages() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const packages = [
    { name: 'Basic', credits: 100, price: 0, description: 'Gói cơ bản miễn phí' },
    { name: 'Pro', credits: 1000, price: 49000, description: 'Gói ôn thi chuyên sâu' },
    { name: 'Premium', credits: 5000, price: 69000, description: 'Trải nghiệm không giới hạn' },
  ];

  for (const pkg of packages) {
    await Package.findOneAndUpdate({ name: pkg.name }, pkg, { upsert: true });
  }

  console.log('✅ Packages seeded successfully');
  process.exit();
}

seedPackages();
