//error handling 4xx for client, 5xx fo server
function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.url} —`, err);
  // Malformed JSON in request body.
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  const status = typeof err.status === 'number' ? err.status
    : typeof err.statusCode === 'number' ? err.statusCode
    : 500;
  if (status >= 400 && status < 500) {
    // Client errors — it is safe to surface the error message.
    return res.status(status).json({ message: err.message || 'Bad request' });
  }
  // Server errors — never leak internal details to the client.
  return res.status(status >= 500 ? status : 500).json({
    message: 'Internal server error',
  });
}

module.exports = errorHandler;
