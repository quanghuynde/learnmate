const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

connection.on('error', (error) => {
  if (error.code === 'ECONNREFUSED') {
    console.warn('⚠️ Redis is not running. Background tasks (document processing, reminders) will be disabled.');
  } else {
    console.error('❌ Redis connection error:', error);
  }
});

const documentQueue = new Queue('document-processing', { connection });

const addDocumentToQueue = async (docId, filePath, type) => {
  await documentQueue.add('process-document', {
    docId,
    filePath,
    type,
  });
};

module.exports = { documentQueue, addDocumentToQueue, connection };
