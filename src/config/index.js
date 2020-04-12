require('dotenv').config();

/** Default config will remain same in all environments and can be over-ridded */
let config = {
  ddosConfig: {
    burst: 100,
    limit: 100,
  },
  emails: {
    'api-key': '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',
    from: {
      email: 'info@express.com',
      name: 'Express Boilerplate Platform',
    },
    templates: {
      'invite-email': '',
      'reset-password': '',
      verification: '',
    },
  },
  env: process.env.NODE_ENV,
  website: 'http://localhost:3000',
  whitelist: null,
};

module.exports = config;
