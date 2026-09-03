const configuredPublicUrl = process.env.PUBLIC_URL || 'https://ajeerqiwasa.org';

module.exports = {
  publicUrl: configuredPublicUrl.replace(/\/+$/, '')
};
