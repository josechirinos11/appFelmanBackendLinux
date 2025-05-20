const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'No autorizado'
    });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      status: 'error',
      message: 'Recurso no encontrado'
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor'
  });
};

module.exports = errorHandler; 