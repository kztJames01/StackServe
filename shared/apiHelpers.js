// small api helpers shared by web + mobile
const DEFAULT_API_BASE = 'http://localhost:4000';

function parseErrorMessage(text, status) {
  try {
    const body = JSON.parse(text);
    if (body && body.message) return body.message;
  } catch {
    // not json
  }
  return text || `Request failed with status ${status}`;
}

// paths the mobile app also hits
const API_PATHS = {
  health: '/api/health',
  feed: '/api/feed',
  profile: '/api/profile',
  me: '/api/users/me',
};

module.exports = { DEFAULT_API_BASE, parseErrorMessage, API_PATHS };
