const buildMissingMessage = () => [
  'MongoDB connection string is missing.',
  'Set either MONGO_URI or MONGODB_URI in your environment.',
  'Example: MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/careerpath360'
].join(' ');

const getMongoUri = () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri || typeof uri !== 'string') {
    throw new Error(buildMissingMessage());
  }

  return uri;
};

module.exports = getMongoUri;

