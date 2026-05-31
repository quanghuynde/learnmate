const { isRedisAvailable } = require('../config/redis');

let documentWorker = null;

// Only start worker if Redis is available
const startWorker = async () => {
  if (!isRedisAvailable()) {
    console.warn('⚠️  Redis not running. Document processing worker is disabled.');
    return;
  }

  try {
    const { Worker } = require('bullmq');
    const { connection } = require('../config/redis');
    const Document = require('../models/Document');
    const { generateSummaryFromText } = require('../controllers/aiController');

    documentWorker = new Worker(
      'document-processing',
      async (job) => {
        const { documentId } = job.data;
        console.log(`Processing document: ${documentId}`);

        const doc = await Document.findById(documentId);
        if (!doc) throw new Error('Document not found');

        doc.status = 'processing';
        await doc.save();

        if (doc.content && doc.content.length > 20) {
          const result = await generateSummaryFromText(doc.name, doc.content);
          doc.summary = result.content;
        }

        doc.status = 'completed';
        await doc.save();
      },
      { connection }
    );

    documentWorker.on('completed', (job) => {
      console.log(`✅ Document job ${job.id} completed`);
    });

    documentWorker.on('failed', (job, err) => {
      console.error(`❌ Document job ${job?.id} failed:`, err.message);
    });

    console.log('✅ Document processing worker started.');
  } catch (err) {
    console.warn('⚠️  Could not start document worker:', err.message);
  }
};

// Delay start to let Redis connection attempt resolve first
setTimeout(startWorker, 3000);

module.exports = documentWorker;
