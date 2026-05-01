// Uso: roles('directora') o roles('directora','secretaria')
module.exports = function roles(...permitidos) {
  return (req, res, next) => {
    if (!req.user || !permitidos.includes(req.user.rol))
      return res.status(403).json({ error: 'Sin permisos para esta acción' });
    next();
  };
};
