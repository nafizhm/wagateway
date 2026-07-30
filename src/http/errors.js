export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(error, req, res, next) {
  const status = error.status || 400;
  res.status(status).json({
    ok: false,
    error: error.message || 'Terjadi kesalahan'
  });
}
